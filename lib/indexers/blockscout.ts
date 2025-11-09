import { z } from "zod";

export type SupportedNetwork = "base-mainnet" | "base-sepolia";

const DEFAULT_ENDPOINTS: Record<SupportedNetwork, string> = {
  "base-mainnet": process.env.BLOCKSCOUT_BASE_MAINNET_URL || "https://base.blockscout.com",
  "base-sepolia": process.env.BLOCKSCOUT_BASE_SEPOLIA_URL || "https://base-sepolia.blockscout.com",
};

const TokenTransferSchema = z.object({
  transaction_hash: z.string().or(z.string().nullable()), // v2 sometimes uses tx_hash
  tx_hash: z.string().optional(),
  from: z.string(),
  to: z.string(),
  value: z.string(), // in raw units
  token: z
    .object({
      address: z.string(),
      symbol: z.string().optional(),
      decimals: z.number().optional(),
    })
    .or(z.any()),
  timestamp: z.string().or(z.number()).optional(), // v2 returns "timestamp" nested sometimes
  block: z
    .object({
      timestamp: z.string().optional(),
    })
    .optional(),
});

export interface Erc20Transfer {
  txHash: string;
  from: `0x${string}`;
  to: `0x${string}`;
  value: string; // raw units string
  tokenAddress: `0x${string}`;
  tokenSymbol?: string;
  tokenDecimals?: number;
  timestampSec?: number;
}

function getBaseUrl(networkId: SupportedNetwork): string {
  const url = DEFAULT_ENDPOINTS[networkId];
  if (!url) throw new Error(`No Blockscout URL configured for ${networkId}`);
  return url.replace(/\/$/, "");
}

/**
 * Fetch recent ERC-20 transfers for an address from Blockscout v2 API
 * We fetch a couple of pages and filter client-side by timestamp if provided.
 */
export async function fetchErc20Transfers(
  networkId: SupportedNetwork,
  address: `0x${string}`,
  opts?: { sinceUnixSec?: number; maxPages?: number; itemsPerPage?: number }
): Promise<Erc20Transfer[]> {
  const baseUrl = getBaseUrl(networkId);
  const maxPages = opts?.maxPages ?? 2;
  const items = opts?.itemsPerPage ?? 50;
  const out: Erc20Transfer[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const url = `${baseUrl}/api/v2/addresses/${address}/token-transfers?type=ERC-20&page=${page}&items_count=${items}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) break;
    const data = await res.json().catch(() => null);
    if (!data || !Array.isArray(data.items)) break;

    for (const item of data.items) {
      const parsed = TokenTransferSchema.safeParse(item);
      if (!parsed.success) continue;
      const t = parsed.data as any;
      const tokenAddr = (t.token?.address || t.token_address || "").toLowerCase();
      const tsStr = t.timestamp || t.block?.timestamp;
      const ts = typeof tsStr === "string" ? Date.parse(tsStr) / 1000 : typeof tsStr === "number" ? tsStr : undefined;
      const txHash = (t.tx_hash || t.transaction_hash || "").toLowerCase();
      if (!tokenAddr || !txHash) continue;

      out.push({
        txHash: txHash as `0x${string}`,
        from: (t.from || "").toLowerCase() as `0x${string}`,
        to: (t.to || "").toLowerCase() as `0x${string}`,
        value: String(t.value || "0"),
        tokenAddress: tokenAddr as `0x${string}`,
        tokenSymbol: t.token?.symbol,
        tokenDecimals: t.token?.decimals,
        timestampSec: ts,
      });
    }

    if (!data.next_page_params) break; // no more pages
  }

  const since = opts?.sinceUnixSec;
  return since ? out.filter((e) => !e.timestampSec || e.timestampSec >= since) : out;
}
