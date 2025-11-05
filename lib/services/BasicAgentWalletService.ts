import { PrismaClient } from '@prisma/client';
import { privateKeyToAccount, generatePrivateKey as viemGeneratePrivateKey } from 'viem/accounts';
import { createWalletClient, http, type PrivateKeyAccount } from 'viem';
import { mainnet, base, arbitrum, polygon } from 'viem/chains';
import {
  encryptPrivateKey,
  decryptPrivateKey,
  generateSalt,
  createMasterPassword,
  isValidPrivateKey
} from '../crypto/encryption';


const prisma = new PrismaClient();

// Supported chains for basic wallets
const SUPPORTED_CHAINS = {
  mainnet,
  base,
  arbitrum,
  polygon
};

export interface BasicWalletInfo {
  id: string;
  userWalletAddress: string;
  agentWalletAddress: string;
  walletType: string;
  status: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface CreateBasicWalletParams {
  userWalletAddress: string;
  chainId?: number;
}

export interface BasicWalletWithAccount {
  walletInfo: BasicWalletInfo;
  account: PrivateKeyAccount;
  walletClient: any;
}

export class BasicAgentWalletService {
  private static instance: BasicAgentWalletService;

  private constructor() {}

  public static getInstance(): BasicAgentWalletService {
    if (!BasicAgentWalletService.instance) {
      BasicAgentWalletService.instance = new BasicAgentWalletService();
    }
    return BasicAgentWalletService.instance;
  }

  /**
   * Create a new basic agent wallet for a user
   */
  async createBasicWallet(params: CreateBasicWalletParams): Promise<BasicWalletInfo> {
    const { userWalletAddress } = params;

    try {
      // Check if wallet already exists
      const existingWallet = await this.getBasicWallet(userWalletAddress);
      if (existingWallet) {
        throw new Error('Basic wallet already exists for this user');
      }

      // Generate new private key
      const privateKey = viemGeneratePrivateKey();
      const account = privateKeyToAccount(privateKey);
      const agentWalletAddress = account.address;

      // Generate encryption salt and master password
      const salt = generateSalt();
      const masterPassword = createMasterPassword(userWalletAddress);

      // Encrypt the private key
      const encryptedPrivateKey = encryptPrivateKey(
        privateKey.slice(2), // Remove 0x prefix
        masterPassword,
        salt
      );

      // Store in database
      const basicWallet = await prisma.basicAgentWallet.create({
        data: {
          userWalletAddress,
          agentWalletAddress,
          encryptedPrivateKey,
          encryptionSalt: salt,
          walletType: 'basic',
          status: 'active'
        }
      });

      // Update user profile
      await prisma.userProfile.upsert({
        where: { userWalletAddress },
        update: {
          basicWalletId: basicWallet.id,
          basicWalletAddress: basicWallet.agentWalletAddress
        },
        create: {
          userWalletAddress,
          basicWalletId: basicWallet.id,
          basicWalletAddress: basicWallet.agentWalletAddress
        }
      });

      // Initialize usage stats
      await prisma.walletUsageStats.create({
        data: {
          walletId: basicWallet.id,
          walletType: 'basic'
        }
      });

      return {
        id: basicWallet.id,
        userWalletAddress: basicWallet.userWalletAddress,
        agentWalletAddress: basicWallet.agentWalletAddress,
        walletType: basicWallet.walletType,
        status: basicWallet.status,
        createdAt: basicWallet.createdAt,
        lastUsedAt: basicWallet.lastUsedAt
      };
    } catch (error) {
      throw new Error(`Failed to create basic wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get basic wallet info for a user
   */
  async getBasicWallet(userWalletAddress: string): Promise<BasicWalletInfo | null> {
    try {
      const basicWallet = await prisma.basicAgentWallet.findUnique({
        where: { userWalletAddress }
      });

      if (!basicWallet) {
        return null;
      }

      return {
        id: basicWallet.id,
        userWalletAddress: basicWallet.userWalletAddress,
        agentWalletAddress: basicWallet.agentWalletAddress,
        walletType: basicWallet.walletType,
        status: basicWallet.status,
        createdAt: basicWallet.createdAt,
        lastUsedAt: basicWallet.lastUsedAt
      };
    } catch (error) {
      throw new Error(`Failed to get basic wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get or create a basic wallet for a user
   */
  async getOrCreateBasicWallet(userWalletAddress: string): Promise<BasicWalletInfo> {
    const existingWallet = await this.getBasicWallet(userWalletAddress);
    if (existingWallet) {
      return existingWallet;
    }

    return await this.createBasicWallet({ userWalletAddress });
  }

  /**
   * Get wallet with decrypted account for transactions
   */
  async getWalletWithAccount(userWalletAddress: string, chainId: number = 1): Promise<BasicWalletWithAccount> {
    try {
      const basicWallet = await prisma.basicAgentWallet.findUnique({
        where: { userWalletAddress }
      });

      if (!basicWallet) {
        throw new Error('Basic wallet not found');
      }

      if (basicWallet.status !== 'active') {
        throw new Error('Wallet is not active');
      }

      // Decrypt private key
      const masterPassword = createMasterPassword(userWalletAddress);
      const decryptedPrivateKey = decryptPrivateKey(
        basicWallet.encryptedPrivateKey,
        masterPassword,
        basicWallet.encryptionSalt
      );

      // Create account from private key
      const privateKeyWithPrefix = `0x${decryptedPrivateKey}` as `0x${string}`;
      const account = privateKeyToAccount(privateKeyWithPrefix);

      // Get chain configuration
      const chain = this.getChainById(chainId);
      if (!chain) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      // Create wallet client
      const walletClient = createWalletClient({
        account,
        chain,
        transport: http()
      });

      // Update last used timestamp
      await prisma.basicAgentWallet.update({
        where: { id: basicWallet.id },
        data: { lastUsedAt: new Date() }
      });

      return {
        walletInfo: {
          id: basicWallet.id,
          userWalletAddress: basicWallet.userWalletAddress,
          agentWalletAddress: basicWallet.agentWalletAddress,
          walletType: basicWallet.walletType,
          status: basicWallet.status,
          createdAt: basicWallet.createdAt,
          lastUsedAt: basicWallet.lastUsedAt
        },
        account,
        walletClient
      };
    } catch (error) {
      throw new Error(`Failed to get wallet with account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update wallet usage statistics
   */
  async updateUsageStats(walletId: string, gasUsed: bigint, volumeUsd: number): Promise<void> {
    try {
      // Find existing stats record
      const existingStats = await prisma.walletUsageStats.findFirst({
        where: { walletId }
      });

      if (existingStats) {
        // Update existing record
        await prisma.walletUsageStats.update({
          where: { id: existingStats.id },
          data: {
            transactionCount: { increment: 1 },
            totalGasUsed: { increment: gasUsed.toString() },
            totalVolumeUsd: { increment: volumeUsd },
            lastTransactionAt: new Date()
          }
        });
      } else {
        // Create new record
        await prisma.walletUsageStats.create({
          data: {
            walletId,
            walletType: 'basic',
            transactionCount: 1,
            totalGasUsed: gasUsed.toString(),
            totalVolumeUsd: volumeUsd,
            lastTransactionAt: new Date()
          }
        });
      }
    } catch (error) {
      console.error('Failed to update usage stats:', error);
      // Don't throw error to avoid breaking main transaction flow
    }
  }

  /**
   * Deactivate a basic wallet
   */
  async deactivateWallet(userWalletAddress: string): Promise<void> {
    try {
      await prisma.basicAgentWallet.update({
        where: { userWalletAddress },
        data: { status: 'inactive' }
      });
    } catch (error) {
      throw new Error(`Failed to deactivate wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get supported chain by ID
   */
  private getChainById(chainId: number) {
    switch (chainId) {
      case 1:
        return SUPPORTED_CHAINS.mainnet;
      case 8453:
        return SUPPORTED_CHAINS.base;
      case 42161:
        return SUPPORTED_CHAINS.arbitrum;
      case 137:
        return SUPPORTED_CHAINS.polygon;
      default:
        return null;
    }
  }

  /**
   * Validate wallet ownership
   */
  async validateWalletOwnership(userWalletAddress: string, agentWalletAddress: string): Promise<boolean> {
    try {
      const wallet = await prisma.basicAgentWallet.findFirst({
        where: {
          userWalletAddress,
          agentWalletAddress,
          status: 'active'
        }
      });
      return !!wallet;
    } catch (error) {
      console.log(error)
      return false;
    }
  }

  /**
   * Get wallet balance for a specific chain
   */
  async getWalletBalance(userWalletAddress: string, chainId: number = 1): Promise<bigint> {
    try {
      const { walletClient } = await this.getWalletWithAccount(userWalletAddress, chainId);
      const balance = await walletClient.getBalance({
        address: walletClient.account.address
      });
      return balance;
    } catch (error) {
      throw new Error(`Failed to get wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get token balance for a specific ERC20 token
   */
  async getTokenBalance(
    userWalletAddress: string,
    tokenAddress: string,
    chainId: number = 8453
  ): Promise<bigint> {
    try {
      const { walletClient } = await this.getWalletWithAccount(userWalletAddress, chainId);
      
      // ERC20 balanceOf ABI
      const erc20Abi = [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
        },
      ];

      const balance = await walletClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [walletClient.account.address],
      });

      return balance as bigint;
    } catch (error) {
      throw new Error(`Failed to get token balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Monitor balance changes and trigger auto-investment
   */
  async monitorBalanceAndAutoInvest(
    userWalletAddress: string,
    tokenAddress: string,
    tokenSymbol: string,
    chainId: number = 8453,
    riskProfile: 'conservative' | 'moderate' | 'aggressive' = 'moderate',
    minInvestmentThreshold: bigint = BigInt('1000000') // 1 USDC in wei (6 decimals)
  ): Promise<{ shouldInvest: boolean; balance: bigint; threshold: bigint }> {
    try {
      const balance = await this.getTokenBalance(userWalletAddress, tokenAddress, chainId);
      
      console.log(`Balance check for ${userWalletAddress}:`, {
        tokenSymbol,
        balance: balance.toString(),
        threshold: minInvestmentThreshold.toString(),
        shouldInvest: balance >= minInvestmentThreshold
      });

      return {
        shouldInvest: balance >= minInvestmentThreshold,
        balance,
        threshold: minInvestmentThreshold
      };
    } catch (error) {
      console.error('Balance monitoring error:', error);
      throw error;
    }
  }

  /**
   * Trigger auto-investment when balance threshold is met
   */
  async triggerAutoInvestment(
    userWalletAddress: string,
    tokenAddress: string,
    tokenSymbol: string,
    chainId: number = 8453,
    riskProfile: 'conservative' | 'moderate' | 'aggressive' = 'moderate',
    investmentPercentage: number = 0.95 // Invest 95% of balance, keep 5% for gas
  ): Promise<{ triggered: boolean; amount?: string; error?: string }> {
    try {
      const monitorResult = await this.monitorBalanceAndAutoInvest(
        userWalletAddress,
        tokenAddress,
        tokenSymbol,
        chainId,
        riskProfile
      );

      if (!monitorResult.shouldInvest) {
        return {
          triggered: false,
          error: `Balance ${monitorResult.balance.toString()} below threshold ${monitorResult.threshold.toString()}`
        };
      }

      // Calculate investment amount (leave some for gas fees)
      const investmentAmount = (monitorResult.balance * BigInt(Math.floor(investmentPercentage * 100))) / BigInt(100);
      
      if (investmentAmount <= 0) {
        return {
          triggered: false,
          error: 'Investment amount too small after gas reserve'
        };
      }

      console.log(`Triggering auto-investment:`, {
        userWalletAddress,
        tokenSymbol,
        amount: investmentAmount.toString(),
        chainId,
        riskProfile
      });

      // Call the auto-investment API endpoint
      const response = await fetch('/api/invest/auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userWalletAddress,
          tokenSymbol,
          amount: investmentAmount.toString(),
          chainId,
          riskProfile
        }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Auto-investment API call failed');
      }

      return {
        triggered: true,
        amount: investmentAmount.toString()
      };
    } catch (error) {
      console.error('Auto-investment trigger error:', error);
      return {
        triggered: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Set up periodic balance monitoring for a user
   */
  async setupPeriodicMonitoring(
    userWalletAddress: string,
    tokens: Array<{
      address: string;
      symbol: string;
      chainId?: number;
      threshold?: bigint;
    }>,
    intervalMinutes: number = 5
  ): Promise<{ monitoringId: string }> {
    const monitoringId = `monitor_${userWalletAddress}_${Date.now()}`;
    
    console.log(`Setting up periodic monitoring for ${userWalletAddress}:`, {
      monitoringId,
      tokens,
      intervalMinutes
    });

    // In a production environment, this would set up a proper job queue
    // For now, we'll just log the setup
    // TODO: Integrate with a job queue system like Bull or Agenda
    
    return { monitoringId };
  }
}

export const basicAgentWalletService = BasicAgentWalletService.getInstance();