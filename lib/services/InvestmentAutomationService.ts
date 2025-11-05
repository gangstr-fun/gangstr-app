import { PrismaClient } from '@prisma/client';
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { base, mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import VaultManagementService from './VaultManagementService';
import { BasicAgentWalletService, basicAgentWalletService } from './BasicAgentWalletService';
import { morphoActionProvider } from '../customActions/Morpho/morphoActionProvider';
import { VaultDataFetcherService } from './VaultDataFetcherService';

interface InvestmentAllocation {
  vaultAddress: string;
  chainId: number;
  amount: number;
  percentage: number;
  expectedApy: number;
  riskScore: number;
  recommendationScore: number;
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

interface InvestmentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  gasUsed?: string;
}

interface RebalanceOperation {
  type: 'withdraw' | 'deposit';
  vaultAddress: string;
  amount: string;
  priority: number;
}

export class InvestmentAutomationService {
  private prisma: PrismaClient;
  private vaultService: VaultManagementService;
  private walletService: BasicAgentWalletService;
  private vaultDataFetcher: VaultDataFetcherService;
  private readonly SUPPORTED_CHAINS = {
    1: mainnet,
    8453: base,
  };

  constructor() {
    this.prisma = new PrismaClient();
    this.vaultService = new VaultManagementService();
    this.walletService = basicAgentWalletService;
    this.vaultDataFetcher = new VaultDataFetcherService();
  }

  /**
   * Auto-invest deposited funds into optimal Morpho vaults
   */
  async autoInvest(
    userWalletAddress: string,
    tokenSymbol: string,
    amount: string,
    chainId: number = 8453,
    riskProfile: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
  ): Promise<InvestmentResult[]> {
    try {
      console.log(`Starting auto-investment for ${userWalletAddress}: ${amount} ${tokenSymbol} on chain ${chainId}`);

      // Get user's basic agent wallet with account
      const walletWithAccount = await this.walletService.getWalletWithAccount(userWalletAddress, chainId);
      if (!walletWithAccount) {
        throw new Error('Agent wallet not found for user');
      }
      
      const { account, walletClient } = walletWithAccount;

      // Calculate optimal allocation
      const amountNumber = parseFloat(formatUnits(BigInt(amount), 18)); // Assuming 18 decimals for now
      const allocations = await this.vaultService.calculateOptimalAllocation(
        tokenSymbol,
        chainId,
        amountNumber,
        riskProfile
      );

      if (allocations.length === 0) {
        throw new Error(`No suitable vaults found for ${tokenSymbol} on chain ${chainId}`);
      }

      // Execute investments
      const results: InvestmentResult[] = [];
      const chain = this.SUPPORTED_CHAINS[chainId as keyof typeof this.SUPPORTED_CHAINS];
      
      if (!chain) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      // Wallet client and account are already available from getWalletWithAccount

      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });

      // Execute each allocation
      for (const allocation of allocations) {
        try {
          const vaultAddress = allocation.vaultAddress as `0x${string}`;
          const investmentAmount = parseUnits(allocation.amount.toString(), 18);

          console.log(`Investing ${allocation.amount} ${tokenSymbol} in vault ${vaultAddress}`);

          // Use MorphoActionProvider to execute deposit
          const morphoProvider = morphoActionProvider();
          const depositResult = await morphoProvider.deposit(walletClient, {
            assets: allocation.amount.toString()
          });

          // Check if deposit was successful
          if (depositResult.startsWith('Error')) {
            throw new Error(depositResult);
          }
          
          // Extract transaction hash from result
          const txHashMatch = depositResult.match(/transaction hash: (0x[a-fA-F0-9]{64})/);
          const txHash = txHashMatch ? txHashMatch[1] : null;
          
          if (!txHash) {
            throw new Error('Transaction hash not found in deposit result');
          }

          // Record the investment
          await this.recordInvestment({
            userWalletAddress,
            vaultId: allocation.vaultAddress,
            amountInvested: investmentAmount.toString(),
            transactionHash: txHash,
            gasUsed: '0', // Will be updated when we get receipt
          });

          results.push({
            success: true,
            transactionHash: txHash,
            gasUsed: '0',
          });

          console.log(`Successfully invested in vault ${vaultAddress}, tx: ${txHash}`);
        } catch (error) {
          console.error(`Failed to invest in vault ${allocation.vaultAddress}:`, error);
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Auto-investment failed:', error);
      throw error;
    }
  }

  /**
   * Execute daily rebalancing for a user
   */
  async executeRebalancing(
    userWalletAddress: string,
    riskProfile: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
  ): Promise<void> {
    try {
      console.log(`Starting rebalancing for user ${userWalletAddress}`);

      // Get current investments
      const currentInvestments = await this.vaultService.getUserInvestments(userWalletAddress);
      
      if (currentInvestments.length === 0) {
        console.log('No investments found for rebalancing');
        return;
      }

      // Group investments by token
      const investmentsByToken = this.groupInvestmentsByToken(currentInvestments);

      // Process each token separately
      for (const [tokenSymbol, investments] of Object.entries(investmentsByToken)) {
        await this.rebalanceToken(userWalletAddress, tokenSymbol, investments, riskProfile);
      }

      console.log(`Rebalancing completed for user ${userWalletAddress}`);
    } catch (error) {
      console.error('Rebalancing failed:', error);
      throw error;
    }
  }

  /**
   * Rebalance investments for a specific token
   */
  private async rebalanceToken(
    userWalletAddress: string,
    tokenSymbol: string,
    currentInvestments: any[],
    riskProfile: 'conservative' | 'moderate' | 'aggressive'
  ): Promise<void> {
    // Calculate total current value
    const totalValue = currentInvestments.reduce((sum, inv) => sum + inv.currentValue, 0);
    
    if (totalValue < 100) { // Skip rebalancing for small amounts
      console.log(`Skipping rebalancing for ${tokenSymbol}: total value too small (${totalValue})`);
      return;
    }

    // Get optimal allocation for current total value
    const chainId = currentInvestments[0]?.vault?.chainId || 8453;
    const optimalAllocations = await this.vaultService.calculateOptimalAllocation(
      tokenSymbol,
      chainId,
      totalValue,
      riskProfile
    );

    // Calculate rebalancing operations
    const operations = this.calculateRebalanceOperations(currentInvestments, optimalAllocations);
    
    if (operations.length === 0) {
      console.log(`No rebalancing needed for ${tokenSymbol}`);
      return;
    }

    // Create rebalance job
    const rebalanceJob = await (this.prisma as any).rebalanceJob.create({
      data: {
        userWalletAddress,
        scheduledAt: new Date(),
        status: 'in_progress',
        jobType: 'daily',
        fromVaults: JSON.stringify(
          operations
            .filter(op => op.type === 'withdraw')
            .map(op => ({ vaultAddress: op.vaultAddress, amount: op.amount }))
        ),
        toVaults: JSON.stringify(
          operations
            .filter(op => op.type === 'deposit')
            .map(op => ({ vaultAddress: op.vaultAddress, amount: op.amount }))
        ),
        totalAmount: totalValue,
      },
    });

    try {
      // Execute rebalancing operations
      await this.executeRebalanceOperations(userWalletAddress, operations);
      
      // Mark job as completed
      await (this.prisma as any).rebalanceJob.update({
        where: { id: rebalanceJob.id },
        data: {
          status: 'completed',
          executedAt: new Date(),
        },
      });
    } catch (error) {
      // Mark job as failed
      await (this.prisma as any).rebalanceJob.update({
        where: { id: rebalanceJob.id },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          retryCount: { increment: 1 },
        },
      });
      throw error;
    }
  }

  /**
   * Calculate what operations are needed for rebalancing
   */
  private calculateRebalanceOperations(
    currentInvestments: any[],
    optimalAllocations: any[]
  ): RebalanceOperation[] {
    const operations: RebalanceOperation[] = [];
    const REBALANCE_THRESHOLD = 0.05; // 5% threshold

    // Create maps for easier lookup
    const currentMap = new Map(
      currentInvestments.map(inv => [inv.vault.address, inv.currentValue])
    );
    const optimalMap = new Map(
      optimalAllocations.map(alloc => [alloc.vault.address, alloc.amount])
    );

    // Find vaults to withdraw from (over-allocated)
    for (const [vaultAddress, currentValue] of Array.from(currentMap.entries())) {
      const optimalValue = optimalMap.get(vaultAddress) || 0;
      const difference = currentValue - optimalValue;
      
      if (difference > currentValue * REBALANCE_THRESHOLD) {
        operations.push({
          type: 'withdraw',
          vaultAddress,
          amount: difference.toString(),
          priority: 1,
        });
      }
    }

    // Find vaults to deposit to (under-allocated)
    for (const [vaultAddress, optimalValue] of Array.from(optimalMap.entries())) {
      const currentValue = currentMap.get(vaultAddress) || 0;
      const difference = optimalValue - currentValue;
      
      if (difference > optimalValue * REBALANCE_THRESHOLD) {
        operations.push({
          type: 'deposit',
          vaultAddress,
          amount: difference.toString(),
          priority: 2,
        });
      }
    }

    return operations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute rebalancing operations
   */
  private async executeRebalanceOperations(
    userWalletAddress: string,
    operations: RebalanceOperation[]
  ): Promise<void> {
    // Get user's agent wallet
    const agentWallet = await this.walletService.getBasicWallet(userWalletAddress);
    if (!agentWallet) {
      throw new Error('Agent wallet not found');
    }

    // Execute withdrawals first, then deposits
    for (const operation of operations) {
      try {
        if (operation.type === 'withdraw') {
          await this.executeWithdrawal(agentWallet, operation);
        } else {
          await this.executeDeposit(agentWallet, operation);
        }
      } catch (error) {
        console.error(`Failed to execute ${operation.type} operation:`, error);
        throw error;
      }
    }
  }

  /**
   * Helper methods
   */
  private groupInvestmentsByToken(investments: any[]): Record<string, any[]> {
    return investments.reduce((groups, investment) => {
      const token = investment.vault.tokenSymbol;
      if (!groups[token]) {
        groups[token] = [];
      }
      groups[token].push(investment);
      return groups;
    }, {});
  }

  private async recordInvestment(data: {
    userWalletAddress: string;
    vaultId: string;
    amountInvested: string;
    transactionHash: string;
    gasUsed: string;
  }): Promise<void> {
    // Calculate shares received (simplified - in reality, you'd get this from the transaction receipt)
    const sharesReceived = data.amountInvested; // 1:1 for simplicity
    
    await (this.prisma as any).userInvestment.upsert({
      where: {
        userWalletAddress_vaultId: {
          userWalletAddress: data.userWalletAddress,
          vaultId: data.vaultId,
        },
      },
      update: {
        amountInvested: {
          increment: parseFloat(data.amountInvested),
        },
        sharesReceived: {
          increment: parseFloat(sharesReceived),
        },
        currentShares: {
          increment: parseFloat(sharesReceived),
        },
        totalDeposits: {
          increment: parseFloat(data.amountInvested),
        },
        lastTransactionAt: new Date(),
      },
      create: {
        userWalletAddress: data.userWalletAddress,
        vaultId: data.vaultId,
        amountInvested: data.amountInvested,
        sharesReceived: sharesReceived,
        currentValue: parseFloat(data.amountInvested),
        currentShares: sharesReceived,
        averageEntryPrice: 1.0, // Simplified
        totalDeposits: parseFloat(data.amountInvested),
      },
    });
  }

  private async updateInvestmentAfterWithdrawal(data: {
    userWalletAddress: string;
    vaultAddress: string;
    amountWithdrawn: string;
    transactionHash: string;
  }): Promise<void> {
    try {
      // Find the existing investment record
      const existingInvestment = await (this.prisma as any).userInvestment.findUnique({
        where: {
          userWalletAddress_vaultId: {
            userWalletAddress: data.userWalletAddress,
            vaultId: data.vaultAddress,
          },
        },
      });

      if (!existingInvestment) {
        console.warn(`No investment record found for user ${data.userWalletAddress} in vault ${data.vaultAddress}`);
        return;
      }

      const withdrawnAmount = parseFloat(data.amountWithdrawn);
      const sharesWithdrawn = data.amountWithdrawn; // 1:1 for simplicity

      // Update the investment record
      await (this.prisma as any).userInvestment.update({
        where: {
          userWalletAddress_vaultId: {
            userWalletAddress: data.userWalletAddress,
            vaultId: data.vaultAddress,
          },
        },
        data: {
          currentShares: {
            decrement: parseFloat(sharesWithdrawn),
          },
          currentValue: {
            decrement: withdrawnAmount,
          },
          totalWithdrawals: {
            increment: withdrawnAmount,
          },
          lastTransactionAt: new Date(),
        },
      });

      console.log(`Updated investment record after withdrawal: ${withdrawnAmount} from vault ${data.vaultAddress}`);
    } catch (error) {
      console.error('Failed to update investment after withdrawal:', error);
      throw error;
    }
  }

  private async executeWithdrawal(agentWallet: any, operation: RebalanceOperation): Promise<void> {
    try {
      console.log(`Executing withdrawal: ${operation.amount} from ${operation.vaultAddress}`);
      
      // Get wallet client for the agent wallet
      const walletWithAccount = await this.walletService.getWalletWithAccount(
        agentWallet.userWalletAddress, 
        agentWallet.chainId || 8453
      );
      
      if (!walletWithAccount) {
        throw new Error('Agent wallet client not found');
      }
      
      const { walletClient } = walletWithAccount;
      
      // Use MorphoActionProvider to execute withdrawal
      const morphoProvider = morphoActionProvider();
      const withdrawResult = await morphoProvider.withdraw(walletClient, {
        vaultAddress: operation.vaultAddress,
        assets: operation.amount,
        receiver: agentWallet.agentWalletAddress
      });
      
      // Check if withdrawal was successful
      if (withdrawResult.startsWith('Error')) {
        throw new Error(withdrawResult);
      }
      
      // Extract transaction hash from result
      const txHashMatch = withdrawResult.match(/transaction hash: (0x[a-fA-F0-9]{64})/);
      const txHash = txHashMatch ? txHashMatch[1] : null;
      
      if (!txHash) {
        console.warn('Transaction hash not found in withdrawal result, but operation may have succeeded');
      }
      
      // Update user investment record to reflect withdrawal
      await this.updateInvestmentAfterWithdrawal({
        userWalletAddress: agentWallet.userWalletAddress,
        vaultAddress: operation.vaultAddress,
        amountWithdrawn: operation.amount,
        transactionHash: txHash || 'unknown'
      });
      
      console.log(`Successfully withdrew ${operation.amount} from vault ${operation.vaultAddress}`);
      
    } catch (error) {
      console.error(`Failed to execute withdrawal from ${operation.vaultAddress}:`, error);
      throw error;
    }
  }

  private async executeDeposit(agentWallet: any, operation: RebalanceOperation): Promise<void> {
    try {
      console.log(`Executing deposit: ${operation.amount} to ${operation.vaultAddress}`);
      
      // Get wallet client for the agent wallet
      const walletWithAccount = await this.walletService.getWalletWithAccount(
        agentWallet.userWalletAddress, 
        agentWallet.chainId || 8453
      );
      
      if (!walletWithAccount) {
        throw new Error('Agent wallet client not found');
      }
      
      const { walletClient } = walletWithAccount;
      
      // Use MorphoActionProvider to execute deposit
      const morphoProvider = morphoActionProvider();
      const depositResult = await morphoProvider.deposit(walletClient, {
        assets: operation.amount
      });
      
      // Check if deposit was successful
      if (depositResult.startsWith('Error')) {
        throw new Error(depositResult);
      }
      
      // Extract transaction hash from result
      const txHashMatch = depositResult.match(/transaction hash: (0x[a-fA-F0-9]{64})/);
      const txHash = txHashMatch ? txHashMatch[1] : null;
      
      if (!txHash) {
        console.warn('Transaction hash not found in deposit result, but operation may have succeeded');
      }
      
      // Record the new investment
      await this.recordInvestment({
        userWalletAddress: agentWallet.userWalletAddress,
        vaultId: operation.vaultAddress, // Using vault address as ID for now
        amountInvested: operation.amount,
        transactionHash: txHash || 'unknown',
        gasUsed: '0' // Gas estimation would require additional logic
      });
      
      console.log(`Successfully deposited ${operation.amount} to vault ${operation.vaultAddress}`);
      
    } catch (error) {
      console.error(`Failed to execute deposit to ${operation.vaultAddress}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup method
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    await this.vaultService.disconnect();
  }
}

export default InvestmentAutomationService;