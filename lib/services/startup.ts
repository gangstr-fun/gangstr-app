import { RebalancingSchedulerService } from './RebalancingSchedulerService';
import { VaultManagementService } from './VaultManagementService';
import { InvestmentAutomationService } from './InvestmentAutomationService';
import { BasicAgentWalletService } from './BasicAgentWalletService';
import { VaultDataSyncService } from './VaultDataSyncService';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../prisma';

/**
 * Application startup service to initialize background services
 */
class StartupService {
  private static instance: StartupService;
  private rebalancingScheduler: RebalancingSchedulerService;
  private vaultDataSync: VaultDataSyncService;
  private initialized = false;

  private constructor() {
    // Initialize required services
    const vaultService = new VaultManagementService();
    const investmentService = new InvestmentAutomationService();
    const walletService = BasicAgentWalletService.getInstance();
    
    this.rebalancingScheduler = new RebalancingSchedulerService(
      prisma,
      vaultService,
      investmentService,
      walletService
    );
    
    this.vaultDataSync = new VaultDataSyncService();
  }

  public static getInstance(): StartupService {
    if (!StartupService.instance) {
      StartupService.instance = new StartupService();
    }
    return StartupService.instance;
  }

  /**
   * Initialize all background services
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Startup services already initialized');
      return;
    }

    try {
      console.log('Initializing startup services...');
      
      // Initialize and start vault data sync service
      await this.vaultDataSync.initialize();
      this.vaultDataSync.start();
      console.log('✅ Vault data sync service started');
      
      // Start the rebalancing scheduler
      this.rebalancingScheduler.startScheduler();
      console.log('✅ Rebalancing scheduler started');
      
      this.initialized = true;
      console.log('✅ All startup services initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize startup services:', error);
      throw error;
    }
  }

  /**
   * Shutdown all background services
   */
  public async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      console.log('Shutting down startup services...');
      
      // Stop the vault data sync service
      await this.vaultDataSync.cleanup();
      console.log('✅ Vault data sync service stopped');
      
      // Stop the rebalancing scheduler
      this.rebalancingScheduler.stopScheduler();
      console.log('✅ Rebalancing scheduler stopped');
      
      this.initialized = false;
      console.log('✅ All startup services shut down successfully');
    } catch (error) {
      console.error('❌ Failed to shutdown startup services:', error);
      throw error;
    }
  }

  /**
   * Get the rebalancing scheduler instance
   */
  public getRebalancingScheduler(): RebalancingSchedulerService {
    return this.rebalancingScheduler;
  }

  /**
   * Get the vault data sync service instance
   */
  public getVaultDataSync(): VaultDataSyncService {
    return this.vaultDataSync;
  }
}

// Export singleton instance
export const startupService = StartupService.getInstance();

// Auto-initialize in production environment
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULER === 'true') {
  startupService.initialize().catch(console.error);
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await startupService.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await startupService.shutdown();
  process.exit(0);
});