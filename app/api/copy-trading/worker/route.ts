import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchErc20Transfers, SupportedNetwork } from "@/lib/indexers/blockscout";
import { prepareAgentkitAndWalletProvider } from "@/app/api/agent/prepare-agentkit";
import { getAddress, formatUnits } from "viem";
import type { EvmWalletProvider } from "@coinbase/agentkit";
import { uniswapActionProvider } from "@/lib/customActions/uniswap";

// Simple protection: require a header to run the worker
const WORKER_AUTH_HEADER = process.env.WORKER_AUTH_HEADER ?? "x-worker-secret";
const WORKER_SECRET = process.env.WORKER_SECRET ?? "dev-secret"; // set in env for production

function getUserWalletAddress(req: NextRequest): string | null {
  const addr = req.headers.get("x-user-wallet-address");
  if (!addr) return null;
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) return null;
  return addr;
}

function assertNetworkId(networkId: string | undefined): SupportedNetwork {
  const id = (networkId || "base-sepolia") as SupportedNetwork;
  if (id !== "base-sepolia" && id !== "base-mainnet") return "base-sepolia";
  return id;
}

export async function POST(req: NextRequest) {
  try {
    // Basic auth for worker trigger
    const secret = req.headers.get(WORKER_AUTH_HEADER);
    if (secret !== WORKER_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userWalletAddress = getUserWalletAddress(req);
    if (!userWalletAddress) {
      return NextResponse.json({ error: "Missing or invalid x-user-wallet-address header" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sinceSecParam = searchParams.get("sinceSec");
    const sinceUnixSec = sinceSecParam ? parseInt(sinceSecParam, 10) : undefined;

    // Load active rules for this user
    const rules = await prisma.copyTradeRule.findMany({
      where: { userWalletAddress, status: "active" },
      orderBy: { createdAt: "asc" },
    }).catch((e: any) => { throw new Error(`DB error loading rules: ${e?.message || e}`); });

    if (!rules.length) {
      return NextResponse.json({ ok: true, message: "No active rules" });
    }

    // Prepare wallet provider (we will execute sells from the agent's smart wallet)
    const { walletProvider } = await prepareAgentkitAndWalletProvider(userWalletAddress);
    const networkId = assertNetworkId(walletProvider.getNetwork().networkId);
    const agentAddress = walletProvider.getAddress().toLowerCase() as `0x${string}`;
    const evmWallet = walletProvider as unknown as EvmWalletProvider;

    const uni = uniswapActionProvider();

    // Preload positions for rules (so we know what we can sell)
    const ruleIds = rules.map((r: any) => r.id);
    const positions = await prisma.mirroredPosition.findMany({
      where: { ruleId: { in: ruleIds } },
    }).catch(() => []);
    const positionsByRule = new Map<string, Set<string>>();
    for (const p of positions || []) {
      const key = (p as any).ruleId as string;
      const set = positionsByRule.get(key) ?? new Set<string>();
      set.add(((p as any).tokenAddress as string).toLowerCase());
      positionsByRule.set(key, set);
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const results: Array<{ ruleId: string; executed: boolean; reason?: string; txHash?: string }> = [];

    for (const rule of rules) {
      const src = rule.sources as any;
      const cond = rule.condition as any;
      const sellSpec = (rule.sellSpec as any) || { followSeller: true };
      const timeWindowSec = cond?.timeWindowSec || 600;
      const since = sinceUnixSec ?? nowSec - timeWindowSec;

      let sourceWallets: string[] = [];
      if (src?.type === "USER" && Array.isArray(src.wallets)) {
        sourceWallets = src.wallets.filter((w: any) => typeof w === "string");
      }
      // NOTE: GROUP type can be resolved here if you add a groups table
      if (!sourceWallets.length) {
        results.push({ ruleId: rule.id, executed: false, reason: "No source wallets" });
        continue;
      }

      // Fetch ERC20 transfers for each source wallet
      const walletToEvents: Record<string, Awaited<ReturnType<typeof fetchErc20Transfers>>> = {};
      for (const w of sourceWallets) {
        try {
          walletToEvents[w.toLowerCase()] = await fetchErc20Transfers(networkId, w.toLowerCase() as `0x${string}`, {
            sinceUnixSec: since,
            maxPages: 2,
            itemsPerPage: 50,
          });
        } catch (e) {
          walletToEvents[w.toLowerCase()] = [];
        }
      }

      // Detect SELL events (transfer OUT) from followed wallets
      const sellEventsByWallet: Record<string, typeof walletToEvents[string]> = {};
      for (const w of Object.keys(walletToEvents)) {
        sellEventsByWallet[w] = (walletToEvents[w] || []).filter((ev) => ev.from === w);
      }

      // Apply ANY/ALL logic
      const mode = (cond?.mode || "ANY").toUpperCase();
      const count = cond?.count ?? 1;
      const walletsWithSells = Object.keys(sellEventsByWallet).filter((w) => sellEventsByWallet[w]?.length);

      let conditionMet = false;
      if (mode === "ANY") conditionMet = walletsWithSells.length >= 1;
      else if (mode === "ALL") conditionMet = walletsWithSells.length >= Math.max(1, count);

      if (!conditionMet) {
        results.push({ ruleId: rule.id, executed: false, reason: "Condition not met" });
        continue;
      }

      if (!sellSpec?.followSeller) {
        results.push({ ruleId: rule.id, executed: false, reason: "followSeller disabled" });
        continue;
      }

      // Determine tokens we can sell based on our positions intersecting tokens sold by followed wallets
      const tokensForRule = positionsByRule.get(rule.id) ?? new Set<string>();
      const candidateTokens = new Set<string>();
      for (const w of walletsWithSells) {
        for (const ev of sellEventsByWallet[w] || []) {
          if (tokensForRule.has(ev.tokenAddress.toLowerCase())) {
            candidateTokens.add(ev.tokenAddress.toLowerCase());
          }
        }
      }

      if (!candidateTokens.size) {
        results.push({ ruleId: rule.id, executed: false, reason: "No intersecting positions" });
        continue;
      }

      // Execute sell for each candidate token (sell 100% of current balance)
      let anyTx = false;
      for (const tAddr of candidateTokens) {
        try {
          const [decimals, bal] = await Promise.all([
            evmWallet.readContract({
              address: getAddress(tAddr) as `0x${string}`,
              abi: [
                { inputs: [], name: "decimals", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
              ],
              functionName: "decimals",
              args: [],
            }) as Promise<number>,
            evmWallet.readContract({
              address: getAddress(tAddr) as `0x${string}`,
              abi: [
                { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
              ],
              functionName: "balanceOf",
              args: [agentAddress],
            }) as Promise<bigint>,
          ]);

          if (bal <= 0n) continue;
          const amountHuman = formatUnits(bal, Number(decimals));

          const res = await uni.swap(evmWallet as any, {
            tokenIn: getAddress(tAddr),
            tokenOut: "USDC",
            amount: amountHuman,
            slippageTolerance: 0.5,
            fee: 3000,
          } as any);

          if (typeof res === "string" && res.toLowerCase().startsWith("error")) {
            throw new Error(res);
          }

          // Log RuleEvent
          await prisma.ruleEvent.create({
            data: {
              ruleId: rule.id,
              type: "EXECUTED",
              details: {
                tokenIn: tAddr,
                amountHuman,
                result: res,
              } as any,
            },
          }).catch(() => {});

          anyTx = true;
        } catch (e: any) {
          await prisma.ruleEvent.create({
            data: {
              ruleId: rule.id,
              type: "FAILED",
              details: { error: e?.message || String(e) } as any,
            },
          }).catch(() => {});
        }
      }

      results.push({ ruleId: rule.id, executed: anyTx, reason: anyTx ? undefined : "No balances to sell" });
    }

    return NextResponse.json({ ok: true, networkId, results });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
