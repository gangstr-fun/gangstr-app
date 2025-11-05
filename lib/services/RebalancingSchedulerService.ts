import { PrismaClient } from '@prisma/client';
import { VaultManagementService } from './VaultManagementService';
import { InvestmentAutomationService } from './InvestmentAutomationService';
import { BasicAgentWalletService } from './BasicAgentWalletService';
import { VaultDataFetcherService } from './VaultDataFetcherService';
import cron from 'node-cron';

export interface RebalanceConfig {
  driftThreshold: number; // Percentage drift threshold (e.g., 5 for 5%)
  minRebalanceAmount: number; // Minimum USD amount to trigger rebalance
  maxRebalanceFrequency: number; // Hours between rebalances
  enabled: boolean;
}

export interface PortfolioDrift {
  userId: string;
  totalDrift: number;
  assetDrifts: Array<{
    asset: string;
    currentAllocation: number;
    targetAllocation: number;
    drift: number;
    rebalanceAmount: number;
  }>;
  requiresRebalance: boolean;
}

export interface RebalanceJob {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduledAt: Date;
  executedAt?: Date;
  totalDrift: number;
  rebalanceActions: Array<{
    fromVault: string;
    toVault: string;
    amount: number;
  }>;
  error?: string;
}

export class RebalancingSchedulerService {
  private prisma: PrismaClient;
  private vaultService: VaultManagementService;
  private investmentService: InvestmentAutomationService;
  private walletService: BasicAgentWalletService;
  private vaultDataFetcher: VaultDataFetcherService;
  private schedulerRunning: boolean = false;
  private jobs: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    prisma: PrismaClient,
    vaultService: VaultManagementService,
    investmentService: InvestmentAutomationService,
    walletService: BasicAgentWalletService
  ) {
    this.prisma = prisma;
    this.vaultService = vaultService;
    this.investmentService = investmentService;
    this.walletService = walletService;
    this.vaultDataFetcher = new VaultDataFetcherService();
  }

  /**
   * Start the daily rebalancing scheduler
   */
  public startScheduler(): void {
    if (this.schedulerRunning) {
      console.log('Rebalancing scheduler is already running');
      return;
    }

    // Run daily at 2 AM UTC
    cron.schedule('0 2 * * *', async () => {
      console.log('Starting daily rebalancing job...');
      await this.runDailyRebalancing();
    });

    // Run drift check every 4 hours
    cron.schedule('0 */4 * * *', async () => {
      console.log('Running drift analysis...');
      await this.checkPortfolioDrifts();
    });

    this.schedulerRunning = true;
    console.log('Rebalancing scheduler started successfully');
  }

  /**
   * Stop the rebalancing scheduler
   */
  public stopScheduler(): void {
    this.jobs.forEach((timeout) => clearTimeout(timeout));
    this.jobs.clear();
    this.schedulerRunning = false;
    console.log('Rebalancing scheduler stopped');
  }

  /**
   * Run daily rebalancing for all eligible users
   */
  public async runDailyRebalancing(): Promise<void> {
    try {
      // Get all users with active investments
      const usersWithInvestments = await this.prisma.userInvestment.findMany({
        where: { status: 'active' },
        select: { userWalletAddress: true },
        distinct: ['userWalletAddress']
      });

      console.log(`Processing rebalancing for ${usersWithInvestments.length} users`);

      for (const user of usersWithInvestments) {
        try {
          await this.processUserRebalancing(user.userWalletAddress);
        } catch (error) {
          console.error(`Failed to rebalance user ${user.userWalletAddress}:`, error);
        }
      }

      console.log('Daily rebalancing completed');
    } catch (error) {
      console.error('Daily rebalancing failed:', error);
      throw error;
    }
  }

  /**
   * Process rebalancing for a specific user
   */
  public async processUserRebalancing(userId: string): Promise<RebalanceJob | null> {
    try {
      // Get user's rebalance configuration
      const config = await this.getUserRebalanceConfig(userId);
      if (!config.enabled) {
        return null;
      }

      // Check if user had a recent rebalance
      const recentRebalance = await this.prisma.rebalanceJob.findFirst({
        where: {
          userWalletAddress: userId,
          executedAt: {
            gte: new Date(Date.now() - config.maxRebalanceFrequency * 60 * 60 * 1000)
          }
        },
        orderBy: { executedAt: 'desc' }
      });

      if (recentRebalance) {
        console.log(`User ${userId} had recent rebalance, skipping`);
        return null;
      }

      // Analyze portfolio drift
      const drift = await this.analyzePortfolioDrift(userId, config);
      if (!drift.requiresRebalance) {
        console.log(`User ${userId} portfolio within acceptable drift`);
        return null;
      }

      // Create rebalance job
      const job = await this.createRebalanceJob(userId, drift);
      
      // Execute rebalancing
      await this.executeRebalanceJob(job.id);
      
      return job;
    } catch (error) {
      console.error(`Error processing rebalancing for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Analyze portfolio drift for a user using real-time vault data
   */
  public async analyzePortfolioDrift(userId: string, config: RebalanceConfig): Promise<PortfolioDrift> {
    try {
      // Get user's current investments
      const investments = await this.vaultService.getUserInvestments(userId);
      
      if (investments.length === 0) {
        return {
          userId,
          totalDrift: 0,
          assetDrifts: [],
          requiresRebalance: false
        };
      }

      // Get enhanced vault data for better allocation decisions
      const enhancedVaults = await this.vaultDataFetcher.fetchAllEnhancedVaultData();
      const vaultMetricsMap = new Map(enhancedVaults.map(v => [`${v.address}-${v.chainId}`, v]));
      
      // Calculate current allocation
      const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
      
      // Calculate optimal allocation based on vault performance
      const optimalAllocations = await this.calculateOptimalAllocation(investments, enhancedVaults, totalValue);
      
      const assetDrifts = [];
      let totalDrift = 0;
      let maxRebalanceAmount = 0;

      for (const investment of investments) {
        const vaultKey = `${investment.vault.address}-${investment.vault.chainId}`;
        const currentAllocation = (investment.currentValue / totalValue) * 100;
        const optimalAllocation = (optimalAllocations.get(vaultKey) || (1 / investments.length)) * 100;
        const drift = Math.abs(currentAllocation - optimalAllocation);
        
        const rebalanceAmount = Math.abs((drift / 100) * totalValue);
        
        assetDrifts.push({
          asset: investment.vault.tokenAddress || investment.vault.address,
          currentAllocation,
          targetAllocation: optimalAllocation,
          drift,
          rebalanceAmount
        });
        
        totalDrift += drift;
        maxRebalanceAmount = Math.max(maxRebalanceAmount, rebalanceAmount);
      }

      const requiresRebalance = 
        totalDrift > config.driftThreshold && 
        maxRebalanceAmount > config.minRebalanceAmount;

      return {
        userId,
        totalDrift,
        assetDrifts,
        requiresRebalance
      };
    } catch (error) {
      console.error(`Error analyzing drift for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create a rebalance job
   */
  private async createRebalanceJob(userId: string, drift: PortfolioDrift): Promise<RebalanceJob> {
    try {
      // Calculate optimal rebalance actions
      const rebalanceActions = await this.calculateRebalanceActions(userId, drift);
      
      const job = await this.prisma.rebalanceJob.create({
        data: {
          userWalletAddress: userId,
          status: 'pending',
          scheduledAt: new Date(),
          totalAmount: drift.totalDrift,
          fromVaults: [],
          toVaults: rebalanceActions
        }
      });

      return {
        id: job.id,
        userId: job.userWalletAddress,
        status: job.status as 'pending',
        scheduledAt: job.scheduledAt,
        executedAt: job.executedAt || undefined,
        totalDrift: job.totalAmount,
        rebalanceActions,
        error: job.errorMessage || undefined
      };
    } catch (error) {
      console.error(`Error creating rebalance job for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Execute a rebalance job
   */
  public async executeRebalanceJob(jobId: string): Promise<void> {
    try {
      // Update job status to processing
      await this.prisma.rebalanceJob.update({
        where: { id: jobId },
        data: { status: 'processing', executedAt: new Date() }
      });

      const job = await this.prisma.rebalanceJob.findUnique({
        where: { id: jobId }
      });

      if (!job) {
        throw new Error(`Rebalance job ${jobId} not found`);
      }

      const rebalanceActions = Array.isArray(job.toVaults) ? job.toVaults : JSON.parse(job.toVaults as string);
      
      // Execute each rebalance action
      for (const action of rebalanceActions) {
        await this.executeRebalanceAction(job.userWalletAddress, action);
      }

      // Update job status to completed
      await this.prisma.rebalanceJob.update({
        where: { id: jobId },
        data: { status: 'completed' }
      });

      console.log(`Rebalance job ${jobId} completed successfully`);
    } catch (error) {
      console.error(`Error executing rebalance job ${jobId}:`, error);
      
      // Update job status to failed
      await this.prisma.rebalanceJob.update({
        where: { id: jobId },
        data: { 
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      throw error;
    }
  }

  /**
   * Check portfolio drifts for all users
   */
  private async checkPortfolioDrifts(): Promise<void> {
    try {
      const usersWithInvestments = await this.prisma.userInvestment.findMany({
        where: { status: 'active' },
        select: { userWalletAddress: true },
        distinct: ['userWalletAddress']
      });

      for (const user of usersWithInvestments) {
        try {
          const config = await this.getUserRebalanceConfig(user.userWalletAddress);
          if (!config.enabled) continue;

          const drift = await this.analyzePortfolioDrift(user.userWalletAddress, config);
          
          if (drift.requiresRebalance && drift.totalDrift > config.driftThreshold * 2) {
            console.log(`High drift detected for user ${user.userWalletAddress}: ${drift.totalDrift.toFixed(2)}%`);
            // Could trigger immediate rebalancing or send notification
          }
        } catch (error) {
          console.error(`Error checking drift for user ${user.userWalletAddress}:`, error);
        }
      }
    } catch (error) {
      console.error('Error checking portfolio drifts:', error);
    }
  }

  /**
   * Calculate optimal allocation based on real-time vault performance
   */
  private async calculateOptimalAllocation(
    currentInvestments: any[],
    enhancedVaults: any[],
    totalValue: number
  ): Promise<Map<string, number>> {
    const allocations = new Map<string, number>();
    
    // Group investments by token type
    const investmentsByToken = new Map<string, any[]>();
    for (const investment of currentInvestments) {
      // Get token symbol from vault configuration or default to USDC
      const tokenSymbol = this.getTokenSymbolFromVault(investment.vault) || 'USDC';
      if (!investmentsByToken.has(tokenSymbol)) {
        investmentsByToken.set(tokenSymbol, []);
      }
      investmentsByToken.get(tokenSymbol)!.push(investment);
    }

    // Calculate allocation for each token type
    const tokenEntries = Array.from(investmentsByToken.entries());
    for (const [tokenSymbol, investments] of tokenEntries) {
      const relevantVaults = enhancedVaults.filter((v: any) => 
        this.getTokenSymbolFromVault(v) === tokenSymbol && 
        v.recommendationScore > 0 &&
        v.tvlUsd > 100000 // Minimum TVL threshold
      );

      if (relevantVaults.length === 0) {
        // Fallback to equal allocation
        const equalWeight = 1 / investments.length;
        investments.forEach((inv: any) => {
          const key = `${inv.vault.address}-${inv.vault.chainId}`;
          allocations.set(key, equalWeight);
        });
        continue;
      }

      // Sort by recommendation score and allocate based on performance
      relevantVaults.sort((a: any, b: any) => b.recommendationScore - a.recommendationScore);
      
      const totalScore = relevantVaults.reduce((sum: number, v: any) => sum + v.recommendationScore, 0);
      
      for (const investment of investments) {
        const vaultKey = `${investment.vault.address}-${investment.vault.chainId}`;
        const vaultData = relevantVaults.find((v: any) => v.address === investment.vault.address);
        
        if (vaultData) {
          // Allocate based on performance score
          const allocation = vaultData.recommendationScore / totalScore;
          allocations.set(vaultKey, allocation);
        } else {
          // Vault not in enhanced data, give minimal allocation
          allocations.set(vaultKey, 0.1);
        }
      }
    }

    return allocations;
  }

  /**
   * Check if there are significantly better vaults available
   */
  private async checkForBetterVaults(userId: string): Promise<boolean> {
    const investments = await this.vaultService.getUserInvestments(userId);

    if (investments.length === 0) return false;

    const enhancedVaults = await this.vaultDataFetcher.fetchAllEnhancedVaultData();
    
    for (const investment of investments) {
      const currentVault = enhancedVaults.find((v: any) => 
        v.address === investment.vault.address && 
        v.chainId === investment.vault.chainId
      );
      
      if (!currentVault) continue;

      const currentTokenSymbol = this.getTokenSymbolFromVault(currentVault);
      
      // Find better alternatives for the same token
      const betterVaults = enhancedVaults.filter((v: any) => 
        this.getTokenSymbolFromVault(v) === currentTokenSymbol &&
        v.chainId === currentVault.chainId &&
        v.address !== currentVault.address &&
        v.netApy > currentVault.netApy + 2.0 && // At least 2% better APY
        v.tvlUsd > 100000 // Minimum liquidity
      );

      if (betterVaults.length > 0) {
        console.log(`Found better vault for ${currentTokenSymbol}: ${betterVaults[0].netApy}% vs ${currentVault.netApy}%`);
        return true;
      }
    }

    return false;
  }

  /**
   * Helper method to get token symbol from vault data
   */
  private getTokenSymbolFromVault(vault: any): string {
    // Try different possible properties for token symbol
    return vault.tokenSymbol || vault.symbol || vault.asset?.symbol || 'USDC';
  }

  /**
   * Get user's rebalance configuration
   */
  private async getUserRebalanceConfig(userId: string): Promise<RebalanceConfig> {
    // Default configuration - in production, this would come from user settings
    return {
      driftThreshold: 5, // 5% drift threshold
      minRebalanceAmount: 100, // $100 minimum
      maxRebalanceFrequency: 24, // 24 hours
      enabled: true
    };
  }

  /**
   * Get user's target allocation
   */
  private async getUserTargetAllocation(userId: string): Promise<Record<string, number>> {
    // Default equal allocation - in production, this would come from user's investment strategy
    const investments = await this.vaultService.getUserInvestments(userId);
    const numAssets = investments.length;
    const equalAllocation = 100 / numAssets;
    
    const allocation: Record<string, number> = {};
    investments.forEach(inv => {
      allocation[inv.vault.tokenAddress || inv.vault.address] = equalAllocation;
    });
    
    return allocation;
  }

  /**
   * Calculate optimal rebalance actions
   */
  private async calculateRebalanceActions(userId: string, drift: PortfolioDrift): Promise<Array<{
    fromVault: string;
    toVault: string;
    amount: number;
  }>> {
    const actions = [];
    
    // Simple rebalancing logic - move from over-allocated to under-allocated assets
    const overAllocated = drift.assetDrifts.filter(d => d.drift > 0 && d.currentAllocation > d.targetAllocation);
    const underAllocated = drift.assetDrifts.filter(d => d.drift > 0 && d.currentAllocation < d.targetAllocation);
    
    for (const over of overAllocated) {
      for (const under of underAllocated) {
        const rebalanceAmount = Math.min(over.rebalanceAmount, under.rebalanceAmount);
        if (rebalanceAmount > 10) { // Minimum $10 rebalance
          actions.push({
            fromVault: over.asset,
            toVault: under.asset,
            amount: rebalanceAmount
          });
        }
      }
    }
    
    return actions;
  }

  /**
   * Execute a single rebalance action
   */
  private async executeRebalanceAction(userId: string, action: {
    fromVault: string;
    toVault: string;
    amount: number;
  }): Promise<void> {
    try {
      // This would integrate with the actual DeFi protocols to move funds
      console.log(`Executing rebalance: ${action.amount} from ${action.fromVault} to ${action.toVault} for user ${userId}`);
      
      // In a real implementation, this would:
      // 1. Withdraw from the source vault
      // 2. Swap tokens if needed
      // 3. Deposit to the target vault
      // 4. Update database records
      
      // For now, we'll just log the action
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate execution time
    } catch (error) {
      console.error(`Error executing rebalance action:`, error);
      throw error;
    }
  }

  /**
   * Get rebalance job status
   */
  public async getRebalanceJob(jobId: string): Promise<RebalanceJob | null> {
    try {
      const job = await this.prisma.rebalanceJob.findUnique({
        where: { id: jobId }
      });

      if (!job) {
        return null;
      }

      return {
        id: job.id,
        userId: job.userWalletAddress,
        status: job.status as any,
        scheduledAt: job.scheduledAt,
        executedAt: job.executedAt || undefined,
        totalDrift: job.totalAmount,
        rebalanceActions: Array.isArray(job.toVaults) ? job.toVaults : JSON.parse(job.toVaults as string),
        error: job.errorMessage || undefined
      };
    } catch (error) {
      console.error(`Error getting rebalance job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's rebalance history
   */
  public async getUserRebalanceHistory(userId: string, limit: number = 10): Promise<RebalanceJob[]> {
    try {
      const jobs = await this.prisma.rebalanceJob.findMany({
        where: { userWalletAddress: userId },
        orderBy: { scheduledAt: 'desc' },
        take: limit
      });

      return jobs.map(job => ({
        id: job.id,
        userId: job.userWalletAddress,
        status: job.status as any,
        scheduledAt: job.scheduledAt,
        executedAt: job.executedAt || undefined,
        totalDrift: job.totalAmount,
        rebalanceActions: Array.isArray(job.toVaults) ? job.toVaults : JSON.parse(job.toVaults as string),
        error: job.errorMessage || undefined
      }));
    } catch (error) {
      console.error(`Error getting rebalance history for user ${userId}:`, error);
      throw error;
    }
  }
}