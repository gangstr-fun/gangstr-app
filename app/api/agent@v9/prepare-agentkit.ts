import {
  ActionProvider,
  AgentKit,
  cdpApiActionProvider,
  erc20ActionProvider,
  PrivyEvmWalletConfig,
  PrivyWalletProvider,
  pythActionProvider,
  walletActionProvider,
  WalletProvider,
  wethActionProvider,
  morphoActionProvider,
  compoundActionProvider,
  defillamaActionProvider,
} from "@coinbase/agentkit";
import fs from "fs";

/**
 * AgentKit Integration Route
 *
 * This file is your gateway to integrating AgentKit with your product.
 * It defines the core capabilities of your agent through WalletProvider
 * and ActionProvider configuration.
 *
 * Key Components:
 * 1. WalletProvider Setup:
 *    - Configures the blockchain wallet integration
 *    - Learn more: https://github.com/coinbase/agentkit/tree/main/typescript/agentkit#evm-wallet-providers
 *
 * 2. ActionProviders Setup:
 *    - Defines the specific actions your agent can perform
 *    - Choose from built-in providers or create custom ones:
 *      - Built-in: https://github.com/coinbase/agentkit/tree/main/typescript/agentkit#action-providers
 *      - Custom: https://github.com/coinbase/agentkit/tree/main/typescript/agentkit#creating-an-action-provider
 *
 * # Next Steps:
 * - Explore the AgentKit README: https://github.com/coinbase/agentkit
 * - Experiment with different LLM configurations
 * - Fine-tune agent parameters for your use case
 *
 * ## Want to contribute?
 * Join us in shaping AgentKit! Check out the contribution guide:
 * - https://github.com/coinbase/agentkit/blob/main/CONTRIBUTING.md
 * - https://discord.gg/CDP
 */

// Configure a file to persist the agent's Privy Wallet Data
const WALLET_DATA_FILE = "wallet_data.txt";

/**
 * Prepares the AgentKit and WalletProvider.
 *
 * @function prepareAgentkitAndWalletProvider
 * @returns {Promise<{ agentkit: AgentKit, walletProvider: WalletProvider }>} The initialized AI agent.
 *
 * @description Handles agent setup
 *
 * @throws {Error} If the agent initialization fails.
 */
export async function prepareAgentkitAndWalletProvider(): Promise<{
  agentkit: AgentKit;
  walletProvider: WalletProvider;
}> {
  console.log("[AGENT INIT] Preparing AgentKit and WalletProvider...");
  
  if (!process.env.PRIVY_APP_ID || !process.env.PRIVY_APP_SECRET) {
    console.error("[AGENT ERROR] Missing Privy credentials");
    throw new Error(
      "I need both PRIVY_APP_ID and PRIVY_APP_SECRET in your .env file to set up your wallet.",
    );
  }

  try {
    // Initialize WalletProvider: https://docs.cdp.coinbase.com/agentkit/docs/wallet-management
    const config: PrivyEvmWalletConfig = {
      appId: process.env.PRIVY_APP_ID as string,
      appSecret: process.env.PRIVY_APP_SECRET as string,
      walletId: process.env.PRIVY_WALLET_ID as string,
      chainId: process.env.CHAIN_ID,
      authorizationPrivateKey: process.env.PRIVY_WALLET_AUTHORIZATION_PRIVATE_KEY,
      authorizationKeyId: process.env.PRIVY_WALLET_AUTHORIZATION_KEY_ID,
    };
    // Try to load saved wallet data
    if (fs.existsSync(WALLET_DATA_FILE)) {
      const savedWallet = JSON.parse(fs.readFileSync(WALLET_DATA_FILE, "utf8"));
      config.walletId = savedWallet.walletId;
      config.authorizationPrivateKey = savedWallet.authorizationPrivateKey;

      if (savedWallet.chainId) {
        console.log("[AGENT WALLET] Found chainId in wallet_data.txt:", savedWallet.chainId);
        config.chainId = savedWallet.chainId;
      }
    }
    if (!config.chainId) {
      console.log("[AGENT NETWORK] Warning: CHAIN_ID not set, defaulting to 84532 (base-sepolia)");
      config.chainId = "84532";
    }
    
    console.log(`[AGENT NETWORK] Using network chain ID: ${config.chainId}`);
    const walletProvider = await PrivyWalletProvider.configureWithWallet(config);
    console.log(`[AGENT WALLET] Wallet provider initialized`);

    // Initialize AgentKit: https://docs.cdp.coinbase.com/agentkit/docs/agent-actions
    console.log("[AGENT INIT] Setting up action providers...");
    
    const actionProviders: ActionProvider[] = [
      wethActionProvider(),
      pythActionProvider(),
      walletActionProvider(),
      erc20ActionProvider(),
      morphoActionProvider(),
      compoundActionProvider(),
      defillamaActionProvider(),
    ];
    
    // Log Morpho provider initialization
    console.log("[AGENT INIT] Morpho action provider initialized");
    
    const canUseCdpApi = process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET;
    if (canUseCdpApi) {
      console.log("[AGENT INIT] CDP API credentials found, adding CDP API provider");
      actionProviders.push(
        cdpApiActionProvider(),
      );
    } else {
      console.log("[AGENT INIT] CDP API credentials not found, skipping CDP API provider");
    }
    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders,
    });
    
    console.log("[AGENT INIT] AgentKit initialized successfully with action providers.");

    // Save wallet data
    const exportedWallet = walletProvider.exportWallet();
    fs.writeFileSync(WALLET_DATA_FILE, JSON.stringify(exportedWallet));
    console.log(`[AGENT WALLET] Wallet data saved to ${WALLET_DATA_FILE}`);

    return { agentkit, walletProvider };
  } catch (error) {
    console.error("[AGENT ERROR] Initialization error:", error);
    throw new Error(`Failed to initialize agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
