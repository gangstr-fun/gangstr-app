import { GraphQLClient } from 'graphql-request';
import { PrismaClient } from '@prisma/client';

// Types for Morpho API responses
export interface MorphoVaultData {
  address: string;
  chainId: number;
  apy: number;
  netApy: number;
  netApyWithoutRewards: number;
  dailyApy: number;
  dailyNetApy: number;
  weeklyApy: number;
  weeklyNetApy: number;
  monthlyApy: number;
  monthlyNetApy: number;
  tvlUsd: number;
  rewards: MorphoReward[];
  allocation: MorphoAllocation[];
  lastUpdated: Date;
}

export interface MorphoReward {
  assetAddress: string;
  chainId: number;
  supplyApr: number;
  yearlySupplyTokens: string;
}

export interface MorphoAllocation {
  supplyAssets: string;
  supplyAssetsUsd: number;
  marketUniqueKey: string;
  marketRewards: MorphoReward[];
}

// GraphQL response types
interface MorphoAPIVaultResponse {
  vaultByAddress: {
    address: string;
    asset: {
      yield: {
        apr: number;
      };
    };
    state: {
      apy: number;
      netApy: number;
      netApyWithoutRewards: number;
      dailyApy: number;
      dailyNetApy: number;
      weeklyApy: number;
      weeklyNetApy: number;
      monthlyApy: number;
      monthlyNetApy: number;
      rewards: Array<{
        asset: {
          address: string;
          chain: {
            id: number;
          };
        };
        supplyApr: number;
        yearlySupplyTokens: string;
      }>;
      allocation: Array<{
        supplyAssets: string;
        supplyAssetsUsd: number;
        market: {
          uniqueKey: string;
          state: {
            rewards: Array<{
              asset: {
                address: string;
                chain: {
                  id: number;
                };
              };
              supplyApr: number;
              borrowApr: number;
            }>;
          };
        };
      }>;
    };
  };
}

interface BatchVaultResponse {
  vaults: MorphoAPIVaultResponse['vaultByAddress'][];
}

// Rate limiting interface
interface RateLimitState {
  requests: number;
  resetTime: number;
}

export class MorphoAPIService {
  private client: GraphQLClient;
  private prisma: PrismaClient;
  private rateLimitState: RateLimitState;
  private readonly maxRequestsPerMinute: number;
  private readonly baseUrl: string;
  private readonly retryAttempts: number;
  private readonly retryDelay: number;

  constructor() {
    this.baseUrl = process.env.MORPHO_GRAPHQL_ENDPOINT || 'https://blue-api.morpho.org/graphql';
    this.maxRequestsPerMinute = parseInt(process.env.MORPHO_RATE_LIMIT || '100');
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    
    this.client = new GraphQLClient(this.baseUrl, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Stratifi-Protocol/1.0',
        ...(process.env.MORPHO_API_KEY && {
          'Authorization': `Bearer ${process.env.MORPHO_API_KEY}`
        })
      },
      // Note: timeout should be handled at the request level or via fetch options
    });
    
    this.prisma = new PrismaClient();
    this.rateLimitState = {
      requests: 0,
      resetTime: Date.now() + 60000 // Reset every minute
    };
  }

  /**
   * Check and enforce rate limiting
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset counter if minute has passed
    if (now >= this.rateLimitState.resetTime) {
      this.rateLimitState.requests = 0;
      this.rateLimitState.resetTime = now + 60000;
    }
    
    // Only apply delay if we've actually exceeded the rate limit
    if (this.rateLimitState.requests >= this.maxRequestsPerMinute) {
      const waitTime = this.rateLimitState.resetTime - now;
      if (waitTime > 0) {
        console.log(`Rate limit exceeded. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Reset after waiting
        this.rateLimitState.requests = 0;
        this.rateLimitState.resetTime = Date.now() + 60000;
      }
    }
    
    this.rateLimitState.requests++;
  }

  /**
   * Execute GraphQL query with retry logic
   */
  private async executeQuery<T>(
    query: string, 
    variables: Record<string, any>,
    attempt: number = 1
  ): Promise<T> {
    try {
      await this.checkRateLimit();
      
      const result = await this.client.request<T>(query, variables);
      return result;
    } catch (error: any) {
      console.error(`GraphQL query attempt ${attempt} failed:`, error.message);
      
      // Retry logic
      if (attempt < this.retryAttempts) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeQuery<T>(query, variables, attempt + 1);
      }
      
      throw new Error(`Failed to execute GraphQL query after ${this.retryAttempts} attempts: ${error.message}`);
    }
  }

  /**
   * Fetch single vault data from Morpho API
   */
  async fetchVaultData(address: string, chainId: number): Promise<MorphoVaultData | null> {
    const query = `
      query GetVaultData($address: String!, $chainId: Int!) {
        vaultByAddress(address: $address, chainId: $chainId) {
          address
          asset {
            yield {
              apr
            }
          }
          state {
            apy
            netApy
            netApyWithoutRewards
            dailyApy
            dailyNetApy
            weeklyApy
            weeklyNetApy
            monthlyApy
            monthlyNetApy
            rewards {
              asset {
                address
                chain {
                  id
                }
              }
              supplyApr
              yearlySupplyTokens
            }
            allocation {
              supplyAssets
              supplyAssetsUsd
              market {
                uniqueKey
                state {
                  rewards {
                    asset {
                      address
                      chain {
                        id
                      }
                    }
                    supplyApr
                    borrowApr
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await this.executeQuery<MorphoAPIVaultResponse>(
        query, 
        { address, chainId }
      );

      if (!response.vaultByAddress) {
        console.warn(`No vault data found for address ${address} on chain ${chainId}`);
        return null;
      }

      return this.transformVaultData(response.vaultByAddress, chainId);
    } catch (error: any) {
      console.error(`Error fetching vault data for ${address}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch multiple vaults data in batch
   */
  async fetchMultipleVaults(
    vaults: Array<{ address: string; chainId: number }>
  ): Promise<MorphoVaultData[]> {
    const results: MorphoVaultData[] = [];
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < vaults.length; i += batchSize) {
      const batch = vaults.slice(i, i + batchSize);
      
      const batchPromises = batch.map(vault => 
        this.fetchVaultData(vault.address, vault.chainId)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        } else {
          console.error(`Failed to fetch data for vault ${batch[index].address}:`, 
            result.status === 'rejected' ? result.reason : 'No data returned');
        }
      });
      
      // Small delay between batches
      if (i + batchSize < vaults.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  }

  /**
   * Transform API response to internal data structure
   */
  private transformVaultData(
    apiData: MorphoAPIVaultResponse['vaultByAddress'], 
    chainId: number
  ): MorphoVaultData {
    const state = apiData.state;
    
    return {
      address: apiData.address,
      chainId,
      apy: state.apy || 0,
      netApy: state.netApy || 0,
      netApyWithoutRewards: state.netApyWithoutRewards || 0,
      dailyApy: state.dailyApy || 0,
      dailyNetApy: state.dailyNetApy || 0,
      weeklyApy: state.weeklyApy || 0,
      weeklyNetApy: state.weeklyNetApy || 0,
      monthlyApy: state.monthlyApy || 0,
      monthlyNetApy: state.monthlyNetApy || 0,
      tvlUsd: this.calculateTotalTVL(state.allocation),
      rewards: state.rewards.map(reward => ({
        assetAddress: reward.asset.address,
        chainId: reward.asset.chain.id,
        supplyApr: reward.supplyApr,
        yearlySupplyTokens: reward.yearlySupplyTokens
      })),
      allocation: state.allocation.map(alloc => ({
        supplyAssets: alloc.supplyAssets,
        supplyAssetsUsd: alloc.supplyAssetsUsd,
        marketUniqueKey: alloc.market.uniqueKey,
        marketRewards: alloc.market.state.rewards.map(reward => ({
          assetAddress: reward.asset.address,
          chainId: reward.asset.chain.id,
          supplyApr: reward.supplyApr,
          yearlySupplyTokens: '0' // Not available in market rewards
        }))
      })),
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate total TVL from allocation data
   */
  private calculateTotalTVL(allocations: any[]): number {
    return allocations.reduce((total, alloc) => {
      return total + (alloc.supplyAssetsUsd || 0);
    }, 0);
  }

  /**
   * Fetch all configured vaults from the config file
   */
  async fetchAllConfiguredVaults(): Promise<MorphoVaultData[]> {
    try {
      // Load vault configuration
      const vaultConfig = await import('../../config/morpho-vaults.json');
      const vaults: Array<{ address: string; chainId: number }> = [];
      
      // Extract all vault addresses from config
      Object.entries(vaultConfig.chains).forEach(([chainId, chainData]: [string, any]) => {
        Object.values(chainData.tokens).forEach((tokenData: any) => {
          tokenData.vaults.forEach((vault: any) => {
            vaults.push({
              address: vault.address,
              chainId: parseInt(chainId)
            });
          });
        });
      });
      
      console.log(`Fetching data for ${vaults.length} configured vaults...`);
      return await this.fetchMultipleVaults(vaults);
    } catch (error: any) {
      console.error('Error fetching all configured vaults:', error.message);
      throw error;
    }
  }

  /**
   * Validate vault data quality
   */
  validateVaultData(data: MorphoVaultData): boolean {
    // Basic validation checks
    if (!data.address || !data.chainId) {
      console.warn('Invalid vault data: missing address or chainId');
      return false;
    }
    
    if (data.apy < 0 || data.apy > 1000) { // APY should be between 0% and 1000%
      console.warn(`Invalid APY for vault ${data.address}: ${data.apy}%`);
      return false;
    }
    
    if (data.tvlUsd < 0) {
      console.warn(`Invalid TVL for vault ${data.address}: $${data.tvlUsd}`);
      return false;
    }
    
    // Check data freshness (should be recent)
    const dataAge = Date.now() - data.lastUpdated.getTime();
    if (dataAge > 24 * 60 * 60 * 1000) { // Older than 24 hours
      console.warn(`Stale data for vault ${data.address}: ${dataAge / (60 * 60 * 1000)} hours old`);
      return false;
    }
    
    return true;
  }

  /**
   * Get API health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    rateLimitRemaining: number;
    lastError?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Simple health check query
      const healthQuery = `
        query HealthCheck {
          __typename
        }
      `;
      
      await this.executeQuery(healthQuery, {});
      
      const responseTime = Date.now() - startTime;
      const rateLimitRemaining = this.maxRequestsPerMinute - this.rateLimitState.requests;
      
      return {
        status: responseTime < 5000 ? 'healthy' : 'degraded',
        responseTime,
        rateLimitRemaining
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        rateLimitRemaining: this.maxRequestsPerMinute - this.rateLimitState.requests,
        lastError: error.message
      };
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
export const morphoAPIService = new MorphoAPIService();