import { PrismaClient } from '@prisma/client';
import { VaultDataFetcherService } from './VaultDataFetcherService';
import { RebalancingSchedulerService } from './RebalancingSchedulerService';
import { InvestmentAutomationService } from './InvestmentAutomationService';
import { MorphoAPIService } from './MorphoAPIService';
import { VaultManagementService } from './VaultManagementService';
import * as cron from 'node-cron';

interface DailyRebalanceResult {
  success: boolean;
  timestamp: Date;
  usersProcessed: number;
  totalRebalances: number;
  errors: string[];
  performanceMetrics: {
    executionTimeMs: number;
    vaultDataFetchTimeMs: number;
    rebalanceTimeMs: number;
  };
}

export class DailyRebalancingService {
  private prisma: PrismaClient;
  private vaultDataFetcher: VaultDataFetcherService;
  private rebalancingScheduler: RebalancingSchedulerService;
  private investmentAutomation: InvestmentAutomationService;
  private morphoAPI: MorphoAPIService;
  private vaultManagementService: VaultManagementService;
  private isRunning: boolean = false;
  private cronJob: cron.ScheduledTask | null = null;

  constructor() {
    this.prisma = new PrismaClient();
    this.vaultDataFetcher = new VaultDataFetcherService();
    this.vaultManagementService = new VaultManagementService();
    this.investmentAutomation = new InvestmentAutomationService();
    this.rebalancingScheduler = new RebalancingSchedulerService(
      this.prisma,
      this.vaultManagementService,
      this.investmentAutomation
    );
    this.morphoAPI = new MorphoAPIService();
  }

  /**
   * Start the daily rebalancing cron job
   * Runs every day at 2 AM UTC
   */
  public startDailyRebalancing(): void {
    if (this.cronJob) {
      console.log('Daily rebalancing is already scheduled');
      return;
    }

    // Schedule for 2 AM UTC daily
    this.cronJob = cron.schedule('0 2 * * *', async () => {
      console.log('Starting daily rebalancing process...');
      await this.executeDailyRebalancing();
    });

    console.log('Daily rebalancing scheduled for 2 AM UTC');
  }

  /**
   * Stop the daily rebalancing cron job
   */
  public stopDailyRebalancing(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('Daily rebalancing stopped');
    }
  }

  /**
   * Execute manual rebalancing (for testing or immediate execution)
   */
  public async executeManualRebalancing(): Promise<DailyRebalanceResult> {
    console.log('Starting manual rebalancing process...');
    return await this.executeDailyRebalancing();
  }

  /**
   * Main daily rebalancing execution logic
   */
  private async executeDailyRebalancing(): Promise<DailyRebalanceResult> {
    if (this.isRunning) {
      console.log('Rebalancing is already in progress, skipping...');
      return {
        success: false,
        timestamp: new Date(),
        usersProcessed: 0,
        totalRebalances: 0,
        errors: ['Rebalancing already in progress'],
        performanceMetrics: {
          executionTimeMs: 0,
          vaultDataFetchTimeMs: 0,
          rebalanceTimeMs: 0
        }
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const result: DailyRebalanceResult = {
      success: true,
      timestamp: new Date(),
      usersProcessed: 0,
      totalRebalances: 0,
      errors: [],
      performanceMetrics: {
        executionTimeMs: 0,
        vaultDataFetchTimeMs: 0,
        rebalanceTimeMs: 0
      }
    };

    try {
      console.log('=== Daily Rebalancing Process Started ===');
      
      // Step 1: Fetch and cache latest vault data
      console.log('Step 1: Fetching latest vault data...');
      const vaultDataStart = Date.now();
      await this.fetchAndCacheVaultData();
      result.performanceMetrics.vaultDataFetchTimeMs = Date.now() - vaultDataStart;
      console.log(`Vault data fetched in ${result.performanceMetrics.vaultDataFetchTimeMs}ms`);

      // Step 2: Get all active users with investments
      console.log('Step 2: Getting active users...');
      const activeUsers = await this.getActiveUsers();
      console.log(`Found ${activeUsers.length} active users`);

      // Step 3: Process each user for rebalancing
      console.log('Step 3: Processing user rebalancing...');
      const rebalanceStart = Date.now();
      
      for (const user of activeUsers) {
        try {
          await this.processUserRebalancing(user.walletAddress, user.riskProfile as 'conservative' | 'moderate' | 'aggressive');
          result.usersProcessed++;
          result.totalRebalances++;
          console.log(`Processed user ${user.walletAddress}`);
        } catch (error) {
          const errorMsg = `Failed to process user ${user.walletAddress}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }
      
      result.performanceMetrics.rebalanceTimeMs = Date.now() - rebalanceStart;
      console.log(`User rebalancing completed in ${result.performanceMetrics.rebalanceTimeMs}ms`);

      // Step 4: Update performance metrics in database
      await this.updatePerformanceMetrics(result);

      console.log('=== Daily Rebalancing Process Completed ===');
      console.log(`Processed ${result.usersProcessed} users with ${result.errors.length} errors`);
      
    } catch (error) {
      result.success = false;
      const errorMsg = `Daily rebalancing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
    } finally {
      result.performanceMetrics.executionTimeMs = Date.now() - startTime;
      this.isRunning = false;
    }

    return result;
  }

  /**
   * Fetch and cache latest vault data from Morpho API
   */
  private async fetchAndCacheVaultData(): Promise<void> {
    try {
      // Fetch data for both supported chains
      const chains = [1, 8453]; // Ethereum and Base
      const tokens = ['USDC', 'WETH'];

      for (const chainId of chains) {
        for (const tokenSymbol of tokens) {
          console.log(`Fetching ${tokenSymbol} vaults on chain ${chainId}...`);
          await this.vaultDataFetcher.fetchAllEnhancedVaultData();
        }
      }

      console.log('All vault data fetched and cached successfully');
    } catch (error) {
      console.error('Failed to fetch vault data:', error);
      throw error;
    }
  }

  /**
   * Get all active users with investments
   */
  private async getActiveUsers(): Promise<Array<{ walletAddress: string; riskProfile: string }>> {
    try {
      const users = await this.prisma.userInvestment.findMany({
        where: {
          // Remove isActive as it doesn't exist in the schema
          // Add other valid filters if needed
        },
        select: {
          userWalletAddress: true,
          // Assuming we have risk profile stored somewhere, defaulting to 'moderate'
        },
        distinct: ['userWalletAddress']
      });

      return users.map((user: any) => ({
        walletAddress: user.userWalletAddress,
        riskProfile: 'moderate' as const // Default risk profile, can be enhanced later
      }));
    } catch (error) {
      console.error('Failed to get active users:', error);
      throw error;
    }
  }

  /**
   * Process rebalancing for a specific user
   */
  private async processUserRebalancing(
    userWalletAddress: string, 
    riskProfile: 'conservative' | 'moderate' | 'aggressive'
  ): Promise<void> {
    try {
      // For now, always perform rebalancing (can be enhanced with drift analysis)
      const needsRebalancing = true;
      
      if (needsRebalancing) {
        console.log(`User ${userWalletAddress} needs rebalancing`);
        await this.investmentAutomation.executeRebalancing(userWalletAddress, riskProfile);
        console.log(`Rebalancing completed for user ${userWalletAddress}`);
      } else {
        console.log(`User ${userWalletAddress} does not need rebalancing`);
      }
    } catch (error) {
      console.error(`Failed to process rebalancing for user ${userWalletAddress}:`, error);
      throw error;
    }
  }

  /**
   * Update performance metrics in database
   */
  private async updatePerformanceMetrics(result: DailyRebalanceResult): Promise<void> {
    try {
      // Store daily rebalancing results for monitoring (commented out until schema is updated)
      /*
      await this.prisma.dailyRebalanceLog.create({
        data: {
          timestamp: result.timestamp,
          success: result.success,
          usersProcessed: result.usersProcessed,
          totalRebalances: result.totalRebalances,
          errors: result.errors,
          executionTimeMs: result.performanceMetrics.executionTimeMs,
          vaultDataFetchTimeMs: result.performanceMetrics.vaultDataFetchTimeMs,
          rebalanceTimeMs: result.performanceMetrics.rebalanceTimeMs
        }
      });
      */
      console.log('Performance metrics logged:', result.performanceMetrics);
    } catch (error) {
      console.error('Failed to update performance metrics:', error);
      // Don't throw here as this is not critical for the main process
    }
  }

  /**
   * Get rebalancing status and metrics
   */
  public async getRebalancingStatus(): Promise<{
    isRunning: boolean;
    lastRun?: Date;
    nextRun?: Date;
    recentResults: DailyRebalanceResult[];
  }> {
    try {
      // const recentLogs = await this.prisma.dailyRebalanceLog.findMany({
      const recentLogs: any[] = []; // Temporary until schema is updated
      /*
        orderBy: { timestamp: 'desc' },
        take: 5
      });

      */
      const recentResults: DailyRebalanceResult[] = recentLogs.map((log: any) => ({
        success: log.success,
        timestamp: log.timestamp,
        usersProcessed: log.usersProcessed,
        totalRebalances: log.totalRebalances,
        errors: log.errors as string[],
        performanceMetrics: {
          executionTimeMs: log.executionTimeMs,
          vaultDataFetchTimeMs: log.vaultDataFetchTimeMs,
          rebalanceTimeMs: log.rebalanceTimeMs
        }
      }));

      return {
        isRunning: this.isRunning,
        lastRun: recentLogs[0]?.timestamp,
        nextRun: this.cronJob ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined, // Approximate next run
        recentResults
      };
    } catch (error) {
      console.error('Failed to get rebalancing status:', error);
      return {
        isRunning: this.isRunning,
        recentResults: []
      };
    }
  }

  /**
   * Cleanup resources
   */
  public async disconnect(): Promise<void> {
    this.stopDailyRebalancing();
    await this.prisma.$disconnect();
    await this.investmentAutomation.disconnect();
  }
}

export default DailyRebalancingService;