import { PrismaClient } from '@prisma/client';
import { MorphoAPIService } from './MorphoAPIService';
import { VaultDataFetcherService } from './VaultDataFetcherService';
import * as cron from 'node-cron';

export interface VaultSyncResult {
  success: boolean;
  vaultsProcessed: number;
  vaultsUpdated: number;
  vaultsFailed: number;
  errors: string[];
  duration: number;
  timestamp: Date;
}

export interface VaultSyncStats {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  lastSyncAt?: Date;
  lastSuccessfulSyncAt?: Date;
  averageDuration: number;
}

export class VaultDataSyncService {
  private prisma: PrismaClient;
  private morphoAPI: MorphoAPIService;
  private vaultFetcher: VaultDataFetcherService;
  private isRunning: boolean = false;
  private syncStats: VaultSyncStats;
  private cronJob?: any;

  constructor() {
    this.prisma = new PrismaClient();
    this.morphoAPI = new MorphoAPIService();
    this.vaultFetcher = new VaultDataFetcherService();
    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageDuration: 0
    };
  }

  /**
   * Initialize the daily sync scheduler
   */
  public async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing Vault Data Sync Service...');
      
      // Load existing stats from database or file
      await this.loadSyncStats();
      
      // Schedule daily sync at 3:00 AM UTC (1 hour after rebalancing)
      this.cronJob = cron.schedule('0 3 * * *', async () => {
        try {
          await this.performDailySync();
        } catch (error: any) {
          console.error('❌ Error during daily Vault Data Sync:', error?.message || error);
        }
      }, {
        timezone: 'UTC'
      });
      
      console.log('✅ Vault Data Sync Service initialized successfully');
      console.log('📅 Daily sync scheduled for 3:00 AM UTC');
    } catch (error: any) {
      console.error('❌ Failed to initialize Vault Data Sync Service:', error.message);
      throw error;
    }
  }

  /**
   * Start the sync scheduler
   */
  public start(): void {
    if (this.cronJob) {
      this.cronJob.start();
      console.log('🚀 Vault Data Sync Service started');
    }
  }

  /**
   * Stop the sync scheduler
   */
  public stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('⏹️ Vault Data Sync Service stopped');
    }
  }

  /**
   * Perform daily vault data synchronization
   */
  public async performDailySync(): Promise<VaultSyncResult> {
    if (this.isRunning) {
      console.log('⚠️ Sync already in progress, skipping...');
      return {
        success: false,
        vaultsProcessed: 0,
        vaultsUpdated: 0,
        vaultsFailed: 0,
        errors: ['Sync already in progress'],
        duration: 0,
        timestamp: new Date()
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const timestamp = new Date();
    
    console.log(`🔄 Starting daily vault data sync at ${timestamp.toISOString()}`);
    
    let vaultsProcessed = 0;
    let vaultsUpdated = 0;
    let vaultsFailed = 0;
    const errors: string[] = [];

    try {
      // Get all configured vaults
      const configuredVaults = await this.morphoAPI.fetchAllConfiguredVaults();
      console.log(`📊 Found ${configuredVaults.length} configured vaults`);

      // Process vaults in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < configuredVaults.length; i += batchSize) {
        const batch = configuredVaults.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (vaultConfig: any) => {
            try {
              vaultsProcessed++;
              
              // Fetch latest data from Morpho API
              const vaultData = await this.morphoAPI.fetchVaultData(
                vaultConfig.address,
                vaultConfig.chainId
              );
              
              if (!vaultData) {
                throw new Error(`No data returned for vault ${vaultConfig.address}`);
              }

              // Update or create vault in database
              await this.updateVaultInDatabase(vaultConfig, vaultData);
              
              // Create new metric entry
              await this.createVaultMetric(vaultConfig.address, vaultConfig.chainId, vaultData);
              
              vaultsUpdated++;
              console.log(`✅ Updated vault ${vaultConfig.name} (${vaultConfig.address})`);
              
            } catch (error: any) {
              vaultsFailed++;
              const errorMsg = `Failed to sync vault ${vaultConfig.address}: ${error.message}`;
              errors.push(errorMsg);
              console.error(`❌ ${errorMsg}`);
            }
          })
        );
        
        // Add delay between batches to respect rate limits
        if (i + batchSize < configuredVaults.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const duration = Date.now() - startTime;
      const result: VaultSyncResult = {
        success: vaultsFailed === 0,
        vaultsProcessed,
        vaultsUpdated,
        vaultsFailed,
        errors,
        duration,
        timestamp
      };

      // Update sync stats
      await this.updateSyncStats(result);
      
      console.log(`✅ Daily sync completed in ${duration}ms`);
      console.log(`📊 Processed: ${vaultsProcessed}, Updated: ${vaultsUpdated}, Failed: ${vaultsFailed}`);
      
      return result;
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const result: VaultSyncResult = {
        success: false,
        vaultsProcessed,
        vaultsUpdated,
        vaultsFailed: vaultsProcessed - vaultsUpdated,
        errors: [error.message, ...errors],
        duration,
        timestamp
      };
      
      await this.updateSyncStats(result);
      console.error(`❌ Daily sync failed after ${duration}ms:`, error.message);
      
      return result;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Update vault information in database
   */
  private async updateVaultInDatabase(vaultConfig: any, vaultData: any): Promise<void> {
    try {
      await this.prisma.morphoVault.upsert({
        where: {
          address_chainId: {
            address: vaultConfig.address,
            chainId: vaultConfig.chainId
          }
        },
        update: {
          name: vaultConfig.name,
          symbol: vaultConfig.symbol,
          tokenAddress: vaultConfig.tokenAddress,
          tokenSymbol: vaultConfig.tokenSymbol,
          tokenDecimals: vaultConfig.tokenDecimals || 18,
          isWhitelisted: vaultConfig.isWhitelisted || false,
          riskScore: vaultConfig.riskScore || 50,
          description: vaultConfig.description,
          curatorName: vaultConfig.curatorName,
          curatorImage: vaultConfig.curatorImage,
          forumLink: vaultConfig.forumLink,
          lastSyncAt: new Date(),
          updatedAt: new Date()
        },
        create: {
          address: vaultConfig.address,
          chainId: vaultConfig.chainId,
          name: vaultConfig.name,
          symbol: vaultConfig.symbol,
          tokenAddress: vaultConfig.tokenAddress,
          tokenSymbol: vaultConfig.tokenSymbol,
          tokenDecimals: vaultConfig.tokenDecimals || 18,
          isWhitelisted: vaultConfig.isWhitelisted || false,
          riskScore: vaultConfig.riskScore || 50,
          description: vaultConfig.description,
          curatorName: vaultConfig.curatorName,
          curatorImage: vaultConfig.curatorImage,
          forumLink: vaultConfig.forumLink,
          lastSyncAt: new Date()
        }
      });
    } catch (error: any) {
      console.error(`Failed to update vault ${vaultConfig.address} in database:`, error.message);
      throw error;
    }
  }

  /**
   * Create new vault metric entry
   */
  private async createVaultMetric(address: string, chainId: number, vaultData: any): Promise<void> {
    try {
      // Find the vault in database
      const vault = await this.prisma.morphoVault.findUnique({
        where: {
          address_chainId: {
            address,
            chainId
          }
        }
      });

      if (!vault) {
        throw new Error(`Vault ${address} not found in database`);
      }

      // Create metric entry for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.prisma.vaultMetric.upsert({
        where: {
          vaultId_date: {
            vaultId: vault.id,
            date: today
          }
        },
        update: {
          apy: vaultData.state?.apy || 0,
          netApy: vaultData.state?.netApy || 0,
          netApyWithoutRewards: vaultData.state?.netApyWithoutRewards,
          dailyApy: vaultData.state?.dailyApy,
          weeklyApy: vaultData.state?.weeklyApy,
          monthlyApy: vaultData.state?.monthlyApy,
          totalAssets: vaultData.totalAssets?.toString() || '0',
          totalAssetsUsd: vaultData.totalAssetsUsd || 0,
          totalSupply: vaultData.totalSupply?.toString() || '0',
          sharePrice: vaultData.sharePrice || 1,
          sharePriceUsd: vaultData.sharePriceUsd || 0,
          tvlUsd: vaultData.tvlUsd || 0,
          utilizationRate: vaultData.utilizationRate
        },
        create: {
          vaultId: vault.id,
          date: today,
          apy: vaultData.state?.apy || 0,
          netApy: vaultData.state?.netApy || 0,
          netApyWithoutRewards: vaultData.state?.netApyWithoutRewards,
          dailyApy: vaultData.state?.dailyApy,
          weeklyApy: vaultData.state?.weeklyApy,
          monthlyApy: vaultData.state?.monthlyApy,
          totalAssets: vaultData.totalAssets?.toString() || '0',
          totalAssetsUsd: vaultData.totalAssetsUsd || 0,
          totalSupply: vaultData.totalSupply?.toString() || '0',
          sharePrice: vaultData.sharePrice || 1,
          sharePriceUsd: vaultData.sharePriceUsd || 0,
          tvlUsd: vaultData.tvlUsd || 0,
          utilizationRate: vaultData.utilizationRate
        }
      });
    } catch (error: any) {
      console.error(`Failed to create vault metric for ${address}:`, error.message);
      throw error;
    }
  }

  /**
   * Load sync statistics
   */
  private async loadSyncStats(): Promise<void> {
    // In a real implementation, you might load this from database
    // For now, we'll keep it in memory
    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageDuration: 0
    };
  }

  /**
   * Update sync statistics
   */
  private async updateSyncStats(result: VaultSyncResult): Promise<void> {
    this.syncStats.totalSyncs++;
    
    if (result.success) {
      this.syncStats.successfulSyncs++;
      this.syncStats.lastSuccessfulSyncAt = result.timestamp;
    } else {
      this.syncStats.failedSyncs++;
    }
    
    this.syncStats.lastSyncAt = result.timestamp;
    
    // Update average duration
    this.syncStats.averageDuration = 
      (this.syncStats.averageDuration * (this.syncStats.totalSyncs - 1) + result.duration) / 
      this.syncStats.totalSyncs;
  }

  /**
   * Get sync statistics
   */
  public getSyncStats(): VaultSyncStats {
    return { ...this.syncStats };
  }

  /**
   * Manually trigger a sync (for testing or emergency updates)
   */
  public async triggerManualSync(): Promise<VaultSyncResult> {
    console.log('🔧 Manual sync triggered');
    return await this.performDailySync();
  }

  /**
   * Get sync status
   */
  public getSyncStatus(): { isRunning: boolean; stats: VaultSyncStats } {
    return {
      isRunning: this.isRunning,
      stats: this.getSyncStats()
    };
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    this.stop();
    await this.prisma.$disconnect();
  }
}

export default VaultDataSyncService;