import { PrismaClient } from '@prisma/client';
import { morphoAPIService, MorphoVaultData } from './MorphoAPIService';

// Enhanced vault data with calculated metrics
export interface EnhancedVaultData extends MorphoVaultData {
  // Performance metrics
  performanceRank: number;
  riskAdjustedReturn: number;
  volatility: number;
  liquidityScore: number;
  
  // Risk assessment
  riskScore: number;
  concentrationRisk: number;
  rewardDependencyRisk: number;
  
  // Derived metrics
  apyTrend: 'increasing' | 'decreasing' | 'stable';
  recommendationScore: number;
  
  // Data quality indicators
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
  dataCompleteness: number; // 0-100%
}

// Vault comparison and ranking data
export interface VaultRanking {
  address: string;
  chainId: number;
  rank: number;
  score: number;
  category: 'top_performer' | 'stable' | 'underperformer';
  reasons: string[];
}

// Portfolio optimization suggestions
export interface VaultRecommendation {
  currentVault: string;
  recommendedVault: string;
  expectedApyImprovement: number;
  riskChange: number;
  confidence: number;
  reasoning: string;
}

export class VaultDataFetcherService {
  private prisma: PrismaClient;
  private readonly minTvlThreshold: number;
  private readonly maxVolatilityThreshold: number;
  private readonly dataFreshnessHours: number;

  constructor() {
    this.prisma = new PrismaClient();
    this.minTvlThreshold = parseFloat(process.env.MIN_VAULT_TVL_USD || '1000000'); // $1M
    this.maxVolatilityThreshold = parseFloat(process.env.MAX_VAULT_VOLATILITY || '0.1'); // 10%
    this.dataFreshnessHours = parseInt(process.env.MIN_DATA_FRESHNESS_HOURS || '6');
  }

  /**
   * Fetch and enhance all vault data with comprehensive metrics
   */
  async fetchAllEnhancedVaultData(): Promise<EnhancedVaultData[]> {
    try {
      console.log('Starting comprehensive vault data fetch...');
      
      // Fetch raw data from Morpho API
      const rawVaultData = await morphoAPIService.fetchAllConfiguredVaults();
      console.log(`Fetched ${rawVaultData.length} vaults from Morpho API`);
      
      // Get historical data for trend analysis
      const historicalData = await this.getHistoricalVaultData();
      
      // Enhance each vault with calculated metrics
      const enhancedData = await Promise.all(
        rawVaultData.map(vault => this.enhanceVaultData(vault, historicalData))
      );
      
      // Calculate relative rankings
      const rankedData = this.calculateVaultRankings(enhancedData);
      
      console.log(`Enhanced ${rankedData.length} vaults with comprehensive metrics`);
      return rankedData;
    } catch (error: any) {
      console.error('Error in fetchAllEnhancedVaultData:', error.message);
      throw error;
    }
  }

  /**
   * Enhance individual vault data with calculated metrics
   */
  private async enhanceVaultData(
    vault: MorphoVaultData, 
    historicalData: Map<string, any[]>
  ): Promise<EnhancedVaultData> {
    const vaultKey = `${vault.address}-${vault.chainId}`;
    const history = historicalData.get(vaultKey) || [];
    
    // Calculate performance metrics
    const volatility = this.calculateVolatility(history);
    const riskAdjustedReturn = this.calculateRiskAdjustedReturn(vault.netApy, volatility);
    const liquidityScore = this.calculateLiquidityScore(vault.tvlUsd, vault.allocation);
    
    // Calculate risk metrics
    const riskScore = this.calculateRiskScore(vault, volatility);
    const concentrationRisk = this.calculateConcentrationRisk(vault.allocation);
    const rewardDependencyRisk = this.calculateRewardDependencyRisk(vault.rewards);
    
    // Calculate trends and recommendations
    const apyTrend = this.calculateApyTrend(history);
    const recommendationScore = this.calculateRecommendationScore(vault, riskScore, liquidityScore);
    
    // Assess data quality
    const dataQuality = this.assessDataQuality(vault);
    const dataCompleteness = this.calculateDataCompleteness(vault);
    
    return {
      ...vault,
      performanceRank: 0, // Will be set in calculateVaultRankings
      riskAdjustedReturn,
      volatility,
      liquidityScore,
      riskScore,
      concentrationRisk,
      rewardDependencyRisk,
      apyTrend,
      recommendationScore,
      dataQuality,
      dataCompleteness
    };
  }

  /**
   * Calculate volatility based on historical APY data
   */
  private calculateVolatility(history: any[]): number {
    if (history.length < 7) return 0; // Need at least a week of data
    
    const apyValues = history.map(h => h.apy).filter(apy => apy > 0);
    if (apyValues.length < 2) return 0;
    
    const mean = apyValues.reduce((sum, apy) => sum + apy, 0) / apyValues.length;
    const variance = apyValues.reduce((sum, apy) => sum + Math.pow(apy - mean, 2), 0) / apyValues.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Calculate risk-adjusted return (Sharpe-like ratio)
   */
  private calculateRiskAdjustedReturn(apy: number, volatility: number): number {
    if (volatility === 0) return apy;
    return apy / (volatility + 0.01); // Add small epsilon to avoid division by zero
  }

  /**
   * Calculate liquidity score based on TVL and market depth
   */
  private calculateLiquidityScore(tvlUsd: number, allocations: any[]): number {
    // Base score from TVL
    let score = Math.min(tvlUsd / 10000000, 100); // Max score at $10M TVL
    
    // Bonus for diversified allocations
    if (allocations.length > 1) {
      score *= 1.1;
    }
    
    // Penalty for very low TVL
    if (tvlUsd < this.minTvlThreshold) {
      score *= 0.5;
    }
    
    return Math.min(score, 100);
  }

  /**
   * Calculate comprehensive risk score
   */
  private calculateRiskScore(
    vault: MorphoVaultData, 
    volatility: number
  ): number {
    let riskScore = 0;
    
    // Volatility risk (0-40 points)
    riskScore += Math.min(volatility * 400, 40);
    
    // TVL risk (0-20 points) - lower TVL = higher risk
    const tvlRisk = Math.max(0, 20 - (vault.tvlUsd / 1000000));
    riskScore += Math.min(tvlRisk, 20);
    
    // Reward dependency risk (0-20 points)
    const rewardRatio = vault.rewards.reduce((sum, r) => sum + r.supplyApr, 0) / Math.max(vault.apy, 0.01);
    riskScore += Math.min(rewardRatio * 20, 20);
    
    // Concentration risk (0-20 points)
    const concentrationRisk = this.calculateConcentrationRisk(vault.allocation);
    riskScore += concentrationRisk;
    
    return Math.min(riskScore, 100);
  }

  /**
   * Calculate concentration risk from allocations
   */
  private calculateConcentrationRisk(allocations: any[]): number {
    if (allocations.length === 0) return 20; // Max risk for no allocation data
    
    const totalTvl = allocations.reduce((sum, alloc) => sum + alloc.supplyAssetsUsd, 0);
    if (totalTvl === 0) return 20;
    
    // Calculate Herfindahl-Hirschman Index (HHI)
    const hhi = allocations.reduce((sum, alloc) => {
      const share = alloc.supplyAssetsUsd / totalTvl;
      return sum + (share * share);
    }, 0);
    
    // Convert HHI to risk score (0-20)
    return hhi * 20;
  }

  /**
   * Calculate reward dependency risk
   */
  private calculateRewardDependencyRisk(rewards: any[]): number {
    if (rewards.length === 0) return 0;
    
    const totalRewardApr = rewards.reduce((sum, reward) => sum + reward.supplyApr, 0);
    
    // Higher reward dependency = higher risk
    return Math.min(totalRewardApr * 2, 20);
  }

  /**
   * Calculate APY trend from historical data
   */
  private calculateApyTrend(history: any[]): 'increasing' | 'decreasing' | 'stable' {
    if (history.length < 7) return 'stable';
    
    const recent = history.slice(-7).map(h => h.apy);
    const older = history.slice(-14, -7).map(h => h.apy);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, apy) => sum + apy, 0) / recent.length;
    const olderAvg = older.reduce((sum, apy) => sum + apy, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.05) return 'increasing'; // 5% increase
    if (change < -0.05) return 'decreasing'; // 5% decrease
    return 'stable';
  }

  /**
   * Calculate recommendation score for vault selection
   */
  private calculateRecommendationScore(
    vault: MorphoVaultData,
    riskScore: number,
    liquidityScore: number
  ): number {
    let score = 0;
    
    // APY contribution (0-40 points)
    score += Math.min(vault.netApy * 4, 40);
    
    // Risk penalty (subtract 0-30 points)
    score -= (riskScore / 100) * 30;
    
    // Liquidity bonus (0-20 points)
    score += (liquidityScore / 100) * 20;
    
    // TVL bonus (0-10 points)
    score += Math.min(vault.tvlUsd / 10000000 * 10, 10);
    
    return Math.max(0, Math.min(score, 100));
  }

  /**
   * Assess data quality
   */
  private assessDataQuality(vault: MorphoVaultData): 'excellent' | 'good' | 'fair' | 'poor' {
    let qualityScore = 0;
    
    // Check data completeness
    if (vault.apy > 0) qualityScore += 25;
    if (vault.tvlUsd > 0) qualityScore += 25;
    if (vault.allocation.length > 0) qualityScore += 25;
    if (vault.lastUpdated && (Date.now() - vault.lastUpdated.getTime()) < 6 * 60 * 60 * 1000) {
      qualityScore += 25; // Data less than 6 hours old
    }
    
    if (qualityScore >= 90) return 'excellent';
    if (qualityScore >= 70) return 'good';
    if (qualityScore >= 50) return 'fair';
    return 'poor';
  }

  /**
   * Calculate data completeness percentage
   */
  private calculateDataCompleteness(vault: MorphoVaultData): number {
    let completeness = 0;
    const totalFields = 10;
    
    if (vault.address) completeness++;
    if (vault.apy > 0) completeness++;
    if (vault.netApy > 0) completeness++;
    if (vault.tvlUsd > 0) completeness++;
    if (vault.allocation.length > 0) completeness++;
    if (vault.rewards.length >= 0) completeness++; // Rewards can be empty
    if (vault.dailyApy >= 0) completeness++;
    if (vault.weeklyApy >= 0) completeness++;
    if (vault.monthlyApy >= 0) completeness++;
    if (vault.lastUpdated) completeness++;
    
    return (completeness / totalFields) * 100;
  }

  /**
   * Calculate vault rankings based on multiple criteria
   */
  private calculateVaultRankings(vaults: EnhancedVaultData[]): EnhancedVaultData[] {
    // Sort by recommendation score (descending)
    const sortedVaults = [...vaults].sort((a, b) => b.recommendationScore - a.recommendationScore);
    
    // Assign performance ranks
    sortedVaults.forEach((vault, index) => {
      vault.performanceRank = index + 1;
    });
    
    return sortedVaults;
  }

  /**
   * Get vault rankings by category
   */
  async getVaultRankings(chainId?: number, tokenSymbol?: string): Promise<VaultRanking[]> {
    const enhancedVaults = await this.fetchAllEnhancedVaultData();
    
    let filteredVaults = enhancedVaults;
    
    // Apply filters
    if (chainId) {
      filteredVaults = filteredVaults.filter(v => v.chainId === chainId);
    }
    
    // Note: tokenSymbol filtering would require additional vault metadata
    
    return filteredVaults.map(vault => {
      let category: 'top_performer' | 'stable' | 'underperformer';
      const reasons: string[] = [];
      
      if (vault.performanceRank <= Math.ceil(filteredVaults.length * 0.2)) {
        category = 'top_performer';
        reasons.push('High APY', 'Low risk', 'Good liquidity');
      } else if (vault.performanceRank <= Math.ceil(filteredVaults.length * 0.7)) {
        category = 'stable';
        reasons.push('Moderate APY', 'Balanced risk');
      } else {
        category = 'underperformer';
        reasons.push('Lower APY', 'Higher risk');
      }
      
      return {
        address: vault.address,
        chainId: vault.chainId,
        rank: vault.performanceRank,
        score: vault.recommendationScore,
        category,
        reasons
      };
    });
  }

  /**
   * Generate vault recommendations for portfolio optimization
   */
  async generateVaultRecommendations(
    currentAllocations: Array<{ vaultAddress: string; chainId: number; amount: number }>
  ): Promise<VaultRecommendation[]> {
    const enhancedVaults = await this.fetchAllEnhancedVaultData();
    const recommendations: VaultRecommendation[] = [];
    
    for (const allocation of currentAllocations) {
      const currentVault = enhancedVaults.find(
        v => v.address === allocation.vaultAddress && v.chainId === allocation.chainId
      );
      
      if (!currentVault) continue;
      
      // Find better alternatives on the same chain
      const alternatives = enhancedVaults
        .filter(v => 
          v.chainId === allocation.chainId && 
          v.address !== allocation.vaultAddress &&
          v.recommendationScore > currentVault.recommendationScore
        )
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, 3); // Top 3 alternatives
      
      for (const alternative of alternatives) {
        const apyImprovement = alternative.netApy - currentVault.netApy;
        const riskChange = alternative.riskScore - currentVault.riskScore;
        
        if (apyImprovement > 0.5) { // At least 0.5% APY improvement
          recommendations.push({
            currentVault: allocation.vaultAddress,
            recommendedVault: alternative.address,
            expectedApyImprovement: apyImprovement,
            riskChange,
            confidence: Math.min(alternative.dataCompleteness, 100),
            reasoning: `Switch to higher APY vault (${apyImprovement.toFixed(2)}% improvement) with ${riskChange > 0 ? 'slightly higher' : 'lower'} risk`
          });
        }
      }
    }
    
    return recommendations;
  }

  /**
   * Get historical vault data from database
   */
  private async getHistoricalVaultData(): Promise<Map<string, any[]>> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const historicalMetrics = await this.prisma.vaultMetric.findMany({
        where: {
          date: {
            gte: thirtyDaysAgo
          }
        },
        include: {
          vault: true
        },
        orderBy: {
          date: 'asc'
        }
      });
      
      const historyMap = new Map<string, any[]>();
      
      historicalMetrics.forEach(metric => {
        const key = `${metric.vault.address}-${metric.vault.chainId}`;
        if (!historyMap.has(key)) {
          historyMap.set(key, []);
        }
        historyMap.get(key)!.push({
          apy: metric.apy,
          tvl: metric.tvlUsd,
          timestamp: metric.date
        });
      });
      
      return historyMap;
    } catch (error: any) {
      console.error('Error fetching historical vault data:', error.message);
      return new Map();
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Export singleton instance
export const vaultDataFetcherService = new VaultDataFetcherService();