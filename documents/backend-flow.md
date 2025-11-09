# Gangstr Pro Backend Flow (Updated)

This document explains the current backend architecture and runtime flow for the Pro experience, including AgentKit integration, Uniswap actions, the Blockscout indexer, and the copy-trading worker.

## Overview
- **Single wallet tier (Pro).**
- **Smart Wallet Primary.** Each `userWalletAddress` maps 1:1 to an agent record and uses a Coinbase Smart Wallet to execute onchain actions.
- **AgentKit** powers tools like WETH, ERC20, Uniswap, Morpho, balance providers, and CDP APIs.

## Key Data Models (Prisma)
- `AgentWalletMap`: maps `userWalletAddress -> agent_id`.
- `AgentWallet`: stores `walletPrivateKey` (signer), `walletPublicKey`, and optional `smartWalletAddress`.
- `AgentSession`: per-user scratchpad for chat state.
- `UserProfile`: risk profile and misc metadata for the user.
- `CopyTradeRule`, `RuleEvent`, `MirroredPosition`: copy-trading rules, audit events, and positions.

## Core Services and APIs

### 1) AgentWalletService (`lib/services/agent-wallet-service.ts`)
- Entry point for wallet lifecycle.
- `getOrCreateAgentWallet(userWalletAddress)`
  - If a mapping exists, returns the existing agent wallet record (validates/re-generates broken signer key).
  - Else creates a new `agent_id`, generates a signer private key, stores wallet, and creates mapping.
- `getOrCreateSmartWallet(userWalletAddress)`
  - Preferred path (Smart Wallet Primary). Returns `{ smartWalletAddress?, signerPrivateKey, agentId, isNewWallet }`.
  - If wallet exists, returns existing records. Otherwise generates signer key and mapping; the actual smart wallet address is created/linked by the SmartWalletProvider and persisted via `updateSmartWalletAddress`.
- `updateSmartWalletAddress(agentId, smartWalletAddress)` persists the created smart wallet address to DB.

### 2) Agent Wallet API (`app/api/agent-wallet/route.ts`)
- `GET ?userWalletAddress=...`:
  - Checks DB mapping and existing smart wallet record.
  - Responds with `hasAgentWallet`, `agentWalletAddress` (smart wallet when present), and debug info.
- `POST` with `{ userWalletAddress }`:
  - Ensures a mapping exists by calling `AgentWalletService.getOrCreateSmartWallet()`.
  - Returns the agent wallet context (signer present, smart wallet may be created by provider if not yet stored).
- `DELETE` (dev only): clears mappings and wallets.

### 3) AgentKit Preparation (`app/api/agent/prepare-agentkit.ts`)
- Given a `userWalletAddress`, calls `AgentWalletService.getOrCreateSmartWallet()`.
- Creates a signer from the returned private key.
- Configures `SmartWalletProvider` with signer and an optional existing smart wallet address.
- Persists the smart wallet address via `AgentWalletService.updateSmartWalletAddress()` if it is new.
- Initializes AgentKit with action providers (WETH, Morpho, ERC20, CDP, custom balance providers, etc.).
- Returns `{ agentkit, walletProvider, smartWalletAddress, signerAddress }` for downstream use.

 **Prepare AgentKit** (`app/api/agent/prepare-agentkit.ts`)
  - Creates the signer, configures `SmartWalletProvider` with `networkId` (default `base-sepolia`).
  - Initializes AgentKit with action providers: `wethActionProvider`, `erc20ActionProvider`, custom WETH/balance providers, `uniswapActionProvider`, `pythActionProvider`, `cdpApiActionProvider`, `morphoActionProvider`, `compoundActionProvider`, `defillamaActionProvider`, `moonwellActionProvider`.
  - Returns `{ agentkit, walletProvider, smartWalletAddress, signerAddress }`.

- **Create Agent** (`app/api/agent/create-agent.ts`)
  - Builds the LLM agent (OpenAI model) and wraps AgentKit tools via `getVercelAITools(agentkit)`.
  - Logs the tool names available for debugging.

### 4) Chat With Agent (`app/api/chat-with-agent/route.ts`)
- Validates request (agent_id, session_id, userWalletAddress).
- Ensures an agent wallet exists for the user (creates mapping if necessary).
- Retrieves or creates an `agentSession` for scratchpad state.
- Loads/creates `userProfile`.
- Calls `prepareAgentkitAndWalletProvider()` to get AgentKit + wallet provider to run actions.
- Runs a hybrid flow:
  - Risk assessment workflow (questionnaire and final profile).
  - General agent workflow (balance, swaps, deposits) using Vercel AI SDK + AgentKit tools.
- Updates session and profile as needed and returns the agent response.

### 5) Balance API (`app/api/agent-wallet/balance/route.ts`)
- Pro-only balance endpoint.
- Looks up the mapping, ensures smart wallet exists.
- Returns a placeholder balance (0) for now, with `walletMode: 'pro'`.
  - TODO: Implement onchain reads (via public client or provider) to return the actual smart wallet balances.

## Removed/Deprecated (Basic Mode)
- All Basic wallet APIs return `410 Gone`:
  - `app/api/basic-wallet/route.ts`
  - `app/api/basic-wallet/create/route.ts`
  - `app/api/basic-wallet/get-or-create/route.ts`
  - `app/api/basic-wallet/balance/route.ts`
  - `app/api/wallet/basic/route.ts`
- Auto invest API removed (was Basic-tied):
  - `app/api/invest/auto/route.ts` returns `410 Gone`.
- UI components referencing Basic are removed/unused:
  - `WalletDashboard` is Pro-only.
  - `Sidebar` shows only Pro links.
  - `Header` is mode-less.
  - Basic pages (`/dashboard`, `/portfolio`, `/settings`) redirect to `/pro/dashboard`.
 **Chat With Agent** (`app/api/chat-with-agent/route.ts`)
  - Validates `userWalletAddress`, `agent_id`, `session_id`.
  - Ensures wallet mapping and loads `AgentSession` and `UserProfile`.
  - Prepares AgentKit and routes the message through either risk-assessment flow or general agent flow.
  - General flow uses intent normalization to call specific tools (e.g., `uniswap.swap`, custom WETH wrap/unwrap, balances).

- **Copy-Trading Rules CRUD**
  - `POST/GET /api/copy-trading/rules` → `app/api/copy-trading/rules/route.ts`.
  - `GET/PATCH/DELETE /api/copy-trading/rules/[id]` → `app/api/copy-trading/rules/[id]/route.ts`.
  - Validated with `lib/copyTrading/schemas.ts`.

- **Copy-Trading Worker (cron-safe)**
  - `POST /api/copy-trading/worker` → `app/api/copy-trading/worker/route.ts`.
  - Secured by header `${WORKER_AUTH_HEADER}: ${WORKER_SECRET}`.
  - Loads active `CopyTradeRule`s for `x-user-wallet-address`, fetches recent ERC20 transfers of followed wallets via Blockscout, evaluates ANY/ALL window conditions, intersects with positions, and executes mirrored sells through `uniswap.swap`.

- **Indexer (Blockscout)**
  - `lib/indexers/blockscout.ts` → `fetchErc20Transfers()` against Blockscout v2 REST API for `base-mainnet` and `base-sepolia`.


## Request Flows

- **First-time wallet mapping**
  1) Frontend calls `GET /api/agent-wallet?userWalletAddress=...`.
  2) If missing, backend calls `AgentWalletService.getOrCreateSmartWallet()`.
  3) Returns signer and (optionally) smart wallet address context.

- **Chat/Actions**
  1) Frontend calls `POST /api/chat-with-agent` with `userWalletAddress`, `agent_id`, `session_id`, and `messageHistory`.
  2) Backend prepares AgentKit, the agent runs tools; all transactions use the smart wallet.
  3) Returns AI response and relevant tx details.

- **Copy-Trading Worker**
  1) External cron triggers `POST /api/copy-trading/worker` with headers.
  2) Backend evaluates rules and executes mirrored sells as needed.

## Environment
- `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`: Coinbase Developer Platform.
- `OPENAI_API_KEY`: LLM.
- `NETWORK_ID`: defaults to `base-sepolia`.
- `WORKER_AUTH_HEADER`, `WORKER_SECRET`: worker protection.
- `BLOCKSCOUT_BASE_MAINNET_URL`, `BLOCKSCOUT_BASE_SEPOLIA_URL`: optional overrides.

## Logging & Debugging
- Extensive logs in `prepare-agentkit.ts` for wallet creation and provider setup.
- `create-agent.ts` logs tool names available to the agent.
- `chat-with-agent/route.ts` logs message routing and generated text.
- Worker logs per-rule execution and `RuleEvent` entries for audit.

## Security Notes
- Signer private keys are server-side only (Prisma `AgentWallet`). Consider KMS for production.
- Do not expose CDP/OpenAI keys to the client.
- SmartWalletProvider ensures smart wallet creation/connection; persist address post-creation.

## TODOs / Future Improvements
- Real balance reads API for the smart wallet.
- Idempotency for the worker (track last processed tx per wallet/rule).
- Position quantity updates and PnL for mirrored executions.
- Additional providers and advanced risk-based automation.
