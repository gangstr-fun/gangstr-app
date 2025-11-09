# Trading Guide (Swaps, Wrap/Unwrap, Balances, Copy-Trading)

This is the complete trading reference for our app (`gangstr-app/`). It covers balance discovery, WETH wrap/unwrap, swaps (buy/sell), and copy-trading automation. Each section links to the implementation files and shows how to test.

---

## Components

- **[AgentKit wiring]** `app/api/agent/prepare-agentkit.ts`
  - Registers action providers: WETH (native + custom), ERC20, Uniswap V3, balance providers, CDP, Morpho, Compound, DefiLlama, Moonwell.
- **[Agent orchestration]** `app/api/chat-with-agent/route.ts`
  - Routes user messages to tools using Vercel AI SDK. Includes intent normalization for swaps and WETH operations.
- **[Uniswap provider]** `lib/customActions/uniswap/uniswapV3ActionProvider.ts`
  - Actions: `get_quote`, `swap`. Handles ERC20 approvals, fee-tier fallback, symbol resolution.
- **[Symbols/tokens]** `lib/customActions/uniswap/constants.ts`
  - `UNISWAP_ADDRESSES` for Base networks. `TOKENS.base-sepolia.{WETH, USDC}` to resolve symbols.
- **[Balance tools]** `lib/customActions/balanceProvider`, `lib/customActions/comprehensiveBalanceProvider`
  - Used for wallet discovery and token balances.

---

## Balances

- The agent detects “balance” intents and calls the comprehensive balance tool.
- Path: `app/api/chat-with-agent/route.ts` (intent normalization).

Example:
```text
show my wallet balances
```

---

## WETH: Wrap / Unwrap

- Provider: `customWETHProvider()` registered in `prepare-agentkit.ts`.
- Agent intent normalization recognizes wrap/unwrap commands.

Examples:
```text
wrap 0.01 eth to weth
```
```text
unwrap 0.01 weth to eth
```

---

## Swaps (Buy/Sell Tokens)

- Provider: `uniswapV3ActionProvider()` via `lib/customActions/uniswap/index.ts`.
- Actions:
  - `uniswap.get_quote`: quote expected output for a given input.
  - `uniswap.swap`: execute swap with approval + fee-tier fallback.
- Symbols: pass addresses or symbols (e.g., `WETH`, `USDC`). Resolved via `TOKENS` for current network.

Agent examples:
```text
quote 0.01 weth to usdc on base sepolia
```
```text
swap 0.0005 weth to usdc on base sepolia
```

Implementation:
- Reads ERC20 `decimals`/`symbol`, computes `amountIn`.
- Quoter tries `[requestedFee, 500, 3000, 10000]` until a non-zero quote is found.
- Ensures ERC20 approval to the router; sends transaction with `value: 0`.

Files:
- `lib/customActions/uniswap/uniswapV3ActionProvider.ts`
- `lib/customActions/uniswap/schemas.ts`
- `lib/customActions/uniswap/constants.ts`

---

## Copy-Trading (Phase 2)

“Sell when they sell” automation using Blockscout + Uniswap.

- **Models & CRUD**
  - `CopyTradeRule`, `RuleEvent`, `MirroredPosition` in `prisma/schema.prisma`.
  - `POST/GET /api/copy-trading/rules` → `app/api/copy-trading/rules/route.ts`.
  - `GET/PATCH/DELETE /api/copy-trading/rules/[id]` → `app/api/copy-trading/rules/[id]/route.ts`.
  - Zod: `lib/copyTrading/schemas.ts`.

- **Indexer (Blockscout)**
  - `lib/indexers/blockscout.ts` with `fetchErc20Transfers()` for `base-mainnet`/`base-sepolia`.

- **Worker**
  - `POST /api/copy-trading/worker` → `app/api/copy-trading/worker/route.ts`.
  - Secured with `${WORKER_AUTH_HEADER}: ${WORKER_SECRET}`.
  - Steps per rule:
    1) Fetch ERC20 transfers for followed wallets since window start.
    2) Detect sells: transfers where `from == wallet`.
    3) ANY/ALL evaluation over the time window.
    4) Intersect with our `MirroredPosition` tokens.
    5) For non-zero balances, `uniswap.swap` token → `USDC` (0.5% slippage, fee 3000 default; fallback tiers applied).
    6) Emit `RuleEvent` (`EXECUTED`/`FAILED`).

---

## How to Test (HTTP)

- **Prereqs**
  - Env: `NETWORK_ID`, `CDP_API_KEY_*`, `OPENAI_API_KEY`.
  - Prisma:
    ```bash
    npx prisma migrate dev
    npx prisma generate
    ```

- **Agent chat**
  - `POST /api/chat-with-agent` with `{ userWalletAddress, agent_id, session_id, messageHistory }`.
  - Try: “swap 0.0005 weth to usdc on base sepolia”.

- **Rules**
  - Create rule:
    ```bash
    curl -X POST http://localhost:3000/api/copy-trading/rules \
      -H 'content-type: application/json' \
      -H 'x-user-wallet-address: 0xYourWallet' \
      -d '{
        "sources": { "type": "USER", "wallets": ["0xFollowedWallet1", "0xFollowedWallet2"] },
        "condition": { "mode": "ANY", "timeWindowSec": 900 },
        "buySpec": { "maxSlippagePct": 0.5 }
      }'
    ```

- **Worker**
  - Trigger:
    ```bash
    curl -X POST "http://localhost:3000/api/copy-trading/worker?sinceSec=$(($(date +%s)-900))" \
      -H 'content-type: application/json' \
      -H 'x-user-wallet-address: 0xYourWallet' \
      -H 'x-worker-secret: dev-secret'
    ```

---

## Troubleshooting

- **Prisma type errors** → run `npx prisma migrate dev && npx prisma generate`.
- **Zero quotes** → verify `TOKENS` mapping and that a V3 pool exists (fee tiers 500/3000/10000).
- **Unauthorized worker** → set `${WORKER_AUTH_HEADER}` and `${WORKER_SECRET}`.
- **Symbols not recognized** → use full addresses or add to `TOKENS`.

---

## Defaults

- Network: `base-sepolia` by default.
- Slippage: 0.5%.
- Fee-tier fallback: 500 → 3000 → 10000.
- ERC20 approvals handled automatically.

---

## Roadmap (Trading)

- **Pool-aware swaps** (infer tokens from pool, cache viable pools).
- **Partial sells / laddering** via extended `sellSpec`.
- **PnL tracking** by updating `MirroredPosition` post-trade.
- **Worker idempotency** (track last processed tx per wallet/rule).
- **Buy mirroring** via Uniswap path.
- **Alerts/Webhooks** for rule executions/failures.

This document describes the end-to-end flow we implemented in the app at `gangstr-app/` for Phase 2:

- **[Indexer]** Pull ERC-20 token transfers for followed wallets using Blockscout REST API.
- **[Trigger Worker]** Evaluate ANY/ALL rules within a time window.
- **[Execution]** Mirror “sell when they sell” using the Uniswap action provider.

---

## Architecture Overview

- **[Rules & Events]**
  - Prisma models: `CopyTradeRule`, `RuleEvent`, `MirroredPosition` in `prisma/schema.prisma`.
  - CRUD API: 
    - `POST /api/copy-trading/rules` and `GET /api/copy-trading/rules` at `app/api/copy-trading/rules/route.ts`.
    - `GET|PATCH|DELETE /api/copy-trading/rules/[id]` at `app/api/copy-trading/rules/[id]/route.ts`.
  - Validation: `lib/copyTrading/schemas.ts`.

- **[Indexer (Blockscout)]**
  - File: `lib/indexers/blockscout.ts`.
  - Function: `fetchErc20Transfers(networkId, address, { sinceUnixSec, maxPages, itemsPerPage })`.
  - Supports `base-mainnet` and `base-sepolia` using Blockscout v2 REST API.
  - Normalizes into `Erc20Transfer[]` with `txHash`, `from`, `to`, `tokenAddress`, `value`, and `timestampSec`.

- **[Trigger Worker]**
  - Endpoint: `POST /api/copy-trading/worker` in `app/api/copy-trading/worker/route.ts`.
  - Secured by header: `${WORKER_AUTH_HEADER}: ${WORKER_SECRET}` (defaults: `x-worker-secret: dev-secret`).
  - Loads all active rules for `x-user-wallet-address`.
  - Runs the evaluation engine, then executes mirrored sells with Uniswap.

- **[Uniswap Integration]**
  - Provider: `lib/customActions/uniswap/uniswapV3ActionProvider.ts` and barrel `lib/customActions/uniswap/index.ts`.
  - Symbol resolution via `TOKENS` in `lib/customActions/uniswap/constants.ts` (supports `WETH`, `USDC` on Base Sepolia; add more as needed).
  - Wired in `app/api/agent/prepare-agentkit.ts` under `actionProviders`.
  - Intent normalization in `app/api/chat-with-agent/route.ts` routes "swap ..." phrases to `uniswap.swap`.

---

## End-to-End Flow

1. **Create copy-trading rules**
   - Use `/api/copy-trading/rules` to define:
     - `sources`: followed wallets (USER mode) or future GROUPS.
     - `condition`: ANY/ALL, `count` (for ALL), and `timeWindowSec`.
     - `buySpec`/`sellSpec` to refine execution behavior.

2. **Indexer fetch**
   - Worker queries Blockscout for each followed wallet and filters for sells (`from == wallet`).

3. **Condition evaluation**
   - ANY: at least one followed wallet sold within the window.
   - ALL: at least `count` followed wallets sold within the window.

4. **Position intersection**
   - Intersect sold token addresses with `MirroredPosition` for the user (or balances in the agent smart wallet if you choose to skip positions).

5. **Execution (mirror sell)**
   - For each intersecting token with non-zero balance, call `uniswap.swap` to sell token → `USDC`.
   - Uses fee-tier fallback (500/3000/10000) and symbol resolution.
   - Emits `RuleEvent` entries (`EXECUTED` / `FAILED`).

---

## Configuration

- **Environment variables**
  - `WORKER_AUTH_HEADER` (default: `x-worker-secret`)
  - `WORKER_SECRET` (default: `dev-secret`)
  - `BLOCKSCOUT_BASE_MAINNET_URL` (default: `https://base.blockscout.com`)
  - `BLOCKSCOUT_BASE_SEPOLIA_URL` (default: `https://base-sepolia.blockscout.com`)
  - `NETWORK_ID` (default: `base-sepolia` for AgentKit)

- **Token mapping**
  - `lib/customActions/uniswap/constants.ts` → `TOKENS.base-sepolia.{WETH, USDC}` used for symbol resolution.
  - Update `USDC` to match your chosen test token if different from the default.

- **Prisma**
  - Ensure schema is migrated and types generated:
    - `npx prisma migrate dev`
    - `npx prisma generate`

---

## How to Test

- **1) Create a rule**
  - POST `/api/copy-trading/rules`
  - Headers: `x-user-wallet-address: 0xYourWallet`
  - Body:
    ```json
    {
      "sources": { "type": "USER", "wallets": ["0xFollowedWallet1", "0xFollowedWallet2"] },
      "condition": { "mode": "ANY", "timeWindowSec": 900 },
      "buySpec": { "maxSlippagePct": 0.5 }
    }
    ```

- **2) Seed a position**
  - Ensure you hold the token(s) that your followed wallet is likely to sell, or create `MirroredPosition` entries.

- **3) Trigger the worker**
  - POST `/api/copy-trading/worker?sinceSec=$(($(date +%s)-900))`
  - Headers:
    - `x-user-wallet-address: 0xYourWallet`
    - `${WORKER_AUTH_HEADER}: ${WORKER_SECRET}`
  - Example:
    ```bash
    curl -X POST \
      -H "Content-Type: application/json" \
      -H "x-user-wallet-address: 0xYourWallet" \
      -H "x-worker-secret: dev-secret" \
      "http://localhost:3000/api/copy-trading/worker?sinceSec=$(($(date +%s)-900))"
    ```

- **4) Verify**
  - Response includes rule execution results and network.
  - Check `RuleEvent` table for `EXECUTED`/`FAILED` entries with details.

---

## Operational Notes

- **[Amounts]** Current implementation sells 100% of the agent’s token balance per intersecting token.
- **[Fees & Slippage]** Defaults are `fee=3000` and `slippageTolerance=0.5%`. Provider falls back across `500/3000/10000`.
- **[Idempotency]** Minimal. Consider storing last processed tx hash per wallet/rule to avoid duplicates when on tight crons.

---

## Future Work

- **[Deduplicate by tx hash]** Persist last-processed `txHash` per (rule, wallet) to avoid re-triggers.
- **[Position updates]** Update `MirroredPosition` quantities post-trade and maintain PnL.
- **[Partial sells / ladders]** Extend `sellSpec` to support percentage sells, ladders, stop-loss/TP.
- **[Mirror buys]** Add buy mirroring using the same provider path.
- **[GROUP sources]** Implement a group directory to resolve `sources.type=GROUP` to wallet lists.
- **[Alerting]** Webhooks or notifications on rule execution/failures.
- **[Pool-aware routing]** Optionally infer token addresses directly from a specific pool or cache viable pools.

---

## Appendix: Previous Notes
Phase 2 (Implement indexer integration (Alchemy/Blockscout) to pull trades for followed wallets.
Build trigger worker for ANY/ALL conditions over time windows.
Add “sell when they sell” using the Uniswap provider path.)


{{ ... }}
.
Supports base-mainnet and base-sepolia via v2 REST API.
Normalizes output into 
Erc20Transfer[]
 with tx hash, token address, value, and timestamp.
pi/copy-trading/worker/route.ts
.
Protects with a shared secret header.
Loads all active CopyTradeRule for x-user-wallet-address, fetches recent sells for the followed wallets, evaluates ANY/ALL with a time window, and executes mirrored sells.
[“Sell when they sell” with Uniswap]
Engine finds tokens sold by followed wallets and intersects with your MirroredPositions.
uniswapV3ActionProvider().swap
 with symbol resolution and fee-tier fallback.
How it works
[Indexer] 
lib/indexers/blockscout.ts
Uses GET /api/v2/addresses/{address}/token-transfers?type=ERC-20&page=&items_count=.
Maps fields for tx hash, token address/symbol/decimals, and timestamps (Blockscout v2 responses are slightly inconsistent; handled with Zod).
[Worker] 
app/api/copy-trading/worker/route.ts
Auth:
Requires header ${WORKER_AUTH_HEADER}: ${WORKER_SECRET}.
Defaults: header x-worker-secret, secret dev-secret (set real values in production).
Inputs:
x-user-wallet-address: 0x... (the owner whose rules we evaluate).
Optional ?sinceSec=UNIX_TIMESTAMP to override the time window baseline.
Rule evaluation:
Loads active rules for the user: CopyTradeRule.status = "active".
For each rule:
Resolves sources → wallets (USER type; GROUP stub left for expansion).
Fetches ERC-20 transfers per wallet from Blockscout since the window start.
Treats “sell” as ERC-20 transfers where from == wallet (token sent out).
Applies ANY/ALL:
ANY: ≥1 followed wallet sold.
ALL: ≥count wallets sold (default count = 1).
Intersects sold token addresses with our MirroredPosition tokens.
For each intersecting token:
Reads agent wallet token balance.
If > 0, calls 
uniswap.swap
 selling full balance to USDC with 0.5% slippage, fee 3000.
Emits RuleEvent as EXECUTED/FAILED with details.
Network:
Uses agent’s configured network (defaults to base-sepolia) via 
prepareAgentkitAndWalletProvider()
.
Configuration
[Environment]
WORKER_AUTH_HEADER (default: x-worker-secret)
WORKER_SECRET (default: dev-secret)
Optional:
BLOCKSCOUT_BASE_MAINNET_URL (default: https://base.blockscout.com)
BLOCKSCOUT_BASE_SEPOLIA_URL (default: https://base-sepolia.blockscout.com)
[Prisma generate]
Run Prisma after schema changes to ensure CopyTradeRule, RuleEvent, MirroredPosition types are available:
npx prisma generate
npx prisma migrate dev (if you haven’t migrated these models yet)
Testing
[1) Create a rule] POST /api/copy-trading/rules
Header: x-user-wallet-address: 0xYourWallet
Body example:
json
{
  "sources": { "type": "USER", "wallets": ["0xFollowedWallet1", "0xFollowedWallet2"] },
  "condition": { "mode": "ANY", "timeWindowSec": 900 },
  "buySpec": { "maxSlippagePct": 0.5 }
}
[2) Seed a position]
Ensure MirroredPosition exists for tokens you expect to sell, or just hold tokens in the agent smart wallet address.
[3) Trigger the worker]
Curl example:
bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-user-wallet-address: 0xYourWallet" \
  -H "x-worker-secret: dev-secret" \
  "http://localhost:3000/api/copy-trading/worker?sinceSec=$(($(date +%s)-900))"
Response includes rule execution statuses and the network used.
Notes and tunables
[Token mapping] 
lib/customActions/uniswap/constants.ts
TOKENS.base-sepolia.WETH and USDC are mapped for symbol resolution. If your USDC differs, share the address and I’ll update the map.
[Sell amount]
Currently sells 100% of the agent’s balance in that token. We can add partial percentage or laddered exits next.
[Fee + slippage]
Defaults: fee = 3000, slippageTolerance = 0.5. The Uniswap provider falls back over 500/3000/10000 if a pool quotes zero.
[Dedup/Idempotency]
Basic version; if you will run on a tight cron, we can store last-processed txHash per rule to avoid repeated actions.
[GROUP sources]
Stubbed; ready to plug into a groups table/service if you want to resolve groups → wallets.
Recommended next enhancements
[Deduplicate by tx hash] Persist last processed hash per wallet per rule.
[Position management] Update MirroredPosition quantities after sells.
[Partial sell / take-profit / stop-loss] Extend sellSpec and execution logic.
[Buy mirroring] Mirror buys using the same provider path.
Status
Blockscout indexer: added.
Worker endpoint: added.
ANY/ALL window evaluation: implemented.
“Sell when they sell”: implemented via Uniswap provider path.
If you want me to tune sell behavior (partial %, target USDC address, fee tier preference) or add tx deduplication, say the word and I’ll patch those next.