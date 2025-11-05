import { PrismaClient } from '@prisma/client';
import { VaultConfigLoader } from '../config/vault-config';
import { VaultDataFetcherService, EnhancedVaultData } from './VaultDataFetcherService';

interface MorphoVaultData {
  address: string;
  symbol: string;
  name: string;
  whitelisted: boolean;
  asset: {
    id: string;
    address: string;
    decimals: number;
    symbol?: string;
  };
  chain: {
    id: number;
    network: string;
  };
  state: {
    apy: number;
    netApy: number;
    netApyWithoutRewards?: number;
    dailyApy?: number;
    weeklyApy?: number;
    monthlyApy?: number;
    totalAssets: string;
    totalAssetsUsd: number;
    totalSupply: string;
    sharePrice: number;
    sharePriceUsd: number;
    allocation?: Array<{
      supplyAssets: string;
      supplyAssetsUsd: number;
      market: {
        uniqueKey: string;
      };
    }>;
  };
  metadata?: {
    description?: string;
    forumLink?: string;
    image?: string;
    curators?: Array<{
      image?: string;
      name?: string;
      url?: string;
    }>;
  };
}

interface VaultSelectionCriteria {
  minTvlUsd: number;
  minApy: number;
  maxRiskScore: number;
  whitelistedOnly: boolean;
  supportedTokens: string[];
  maxVaultsPerToken: number;
  diversificationLimit: number; // Max percentage per vault
}

export class VaultManagementService {
  private prisma: PrismaClient;
  private configLoader: VaultConfigLoader;
  private vaultDataFetcher: VaultDataFetcherService;
  private readonly MORPHO_API_URL = 'https://api.morpho.org/graphql';

  constructor() {
    this.prisma = new PrismaClient();
    this.configLoader = VaultConfigLoader.getInstance();
    this.vaultDataFetcher = new VaultDataFetcherService();
  }

  /**
   * Fetch vault data from Morpho GraphQL API
   */
  async fetchVaultsFromAPI(chainIds: number[] = [1, 8453]): Promise<MorphoVaultData[]> {
    const query = `
      query GetVaults($chainIds: [Int!]!) {
        vaults(first: 1000, where: { chainId_in: $chainIds }) {
          items {
            address
            symbol
            name
            whitelisted
            asset {
              id
              address
              decimals
            }
            chain {
              id
              network
            }
            state {
              apy
              netApy
              netApyWithoutRewards
              dailyApy
              weeklyApy
              monthlyApy
              totalAssets
              totalAssetsUsd
              totalSupply
              sharePrice
              sharePriceUsd
              allocation {
                supplyAssets
                supplyAssetsUsd
                market {
                  uniqueKey
                }
              }
            }
            metadata {
              description
              forumLink
              image
              curators {
                image
                name
                url
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(this.MORPHO_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { chainIds },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      return data.data.vaults.items;
    } catch (error) {
      console.error('Error fetching vaults from Morpho API:', error);
      throw error;
    }
  }

  /**
   * Sync vault data from API to database
   */
  async syncVaultData(): Promise<void> {
    try {
      const vaultsData = await this.fetchVaultsFromAPI();
      const config = await this.configLoader.loadConfig();
      
      for (const vaultData of vaultsData) {
        // Check if this vault is in our configuration
        const configVault = await this.findVaultInConfig(vaultData.address, vaultData.chain.id);
        
        if (!configVault) {
          continue; // Skip vaults not in our configuration
        }

        // Upsert vault
        await this.prisma.morphoVault.upsert({
          where: {
            address_chainId: {
              address: vaultData.address,
              chainId: vaultData.chain.id,
            },
          },
          update: {
            name: vaultData.name,
            symbol: vaultData.symbol,
            isWhitelisted: vaultData.whitelisted,
            riskScore: configVault.riskScore,
            description: vaultData.metadata?.description,
            curatorName: vaultData.metadata?.curators?.[0]?.name,
            curatorImage: vaultData.metadata?.curators?.[0]?.image,
            forumLink: vaultData.metadata?.forumLink,
            lastSyncAt: new Date(),
          },
          create: {
            address: vaultData.address,
            chainId: vaultData.chain.id,
            name: vaultData.name,
            symbol: vaultData.symbol,
            tokenAddress: vaultData.asset.address,
            tokenSymbol: configVault.token,
            tokenDecimals: vaultData.asset.decimals,
            isWhitelisted: vaultData.whitelisted,
            riskScore: configVault.riskScore,
            description: vaultData.metadata?.description,
            curatorName: vaultData.metadata?.curators?.[0]?.name,
            curatorImage: vaultData.metadata?.curators?.[0]?.image,
            forumLink: vaultData.metadata?.forumLink,
          },
        });

        // Create/update vault metrics
        await this.prisma.vaultMetric.upsert({
          where: {
            vaultId_date: {
              vaultId: (await this.prisma.morphoVault.findUnique({
                where: {
                  address_chainId: {
                    address: vaultData.address,
                    chainId: vaultData.chain.id,
                  },
                },
                select: { id: true },
              }))!.id,
              date: new Date(new Date().toDateString()), // Today's date without time
            },
          },
          update: {
            apy: vaultData.state.apy,
            netApy: vaultData.state.netApy,
            netApyWithoutRewards: vaultData.state.netApyWithoutRewards,
            dailyApy: vaultData.state.dailyApy,
            weeklyApy: vaultData.state.weeklyApy,
            monthlyApy: vaultData.state.monthlyApy,
            totalAssets: vaultData.state.totalAssets,
            totalAssetsUsd: vaultData.state.totalAssetsUsd,
            totalSupply: vaultData.state.totalSupply,
            sharePrice: vaultData.state.sharePrice,
            sharePriceUsd: vaultData.state.sharePriceUsd,
            tvlUsd: vaultData.state.totalAssetsUsd,
            utilizationRate: this.calculateUtilizationRate(vaultData.state.allocation),
          },
          create: {
            vaultId: (await this.prisma.morphoVault.findUnique({
              where: {
                address_chainId: {
                  address: vaultData.address,
                  chainId: vaultData.chain.id,
                },
              },
              select: { id: true },
            }))!.id,
            apy: vaultData.state.apy,
            netApy: vaultData.state.netApy,
            netApyWithoutRewards: vaultData.state.netApyWithoutRewards,
            dailyApy: vaultData.state.dailyApy,
            weeklyApy: vaultData.state.weeklyApy,
            monthlyApy: vaultData.state.monthlyApy,
            totalAssets: vaultData.state.totalAssets,
            totalAssetsUsd: vaultData.state.totalAssetsUsd,
            totalSupply: vaultData.state.totalSupply,
            sharePrice: vaultData.state.sharePrice,
            sharePriceUsd: vaultData.state.sharePriceUsd,
            tvlUsd: vaultData.state.totalAssetsUsd,
            utilizationRate: this.calculateUtilizationRate(vaultData.state.allocation),
          },
        });
      }

      console.log(`Synced ${vaultsData.length} vaults to database`);
    } catch (error) {
      console.error('Error syncing vault data:', error);
      throw error;
    }
  }

  /**
   * Get best vaults for a specific token based on criteria
   */
  async getBestVaultsForToken(
    tokenSymbol: string,
    chainId: number,
    riskProfile: 'conservative' | 'moderate' | 'aggressive' = 'moderate',
    limit: number = 5
  ) {
    try {
      // Get enhanced vault data with real-time metrics
      const enhancedVaults = await this.vaultDataFetcher.fetchAllEnhancedVaultData();
      
      // Filter by token and chain
      const relevantVaults = [];
      for (const vault of enhancedVaults) {
        const vaultTokenSymbol = await this.getTokenSymbolFromVault(vault);
        if (vaultTokenSymbol === tokenSymbol && vault.chainId === chainId) {
          relevantVaults.push(vault);
        }
      }
      
      console.log(`Found ${relevantVaults.length} ${tokenSymbol} vaults on chain ${chainId}`);

      // Filter and rank based on risk profile
      const filteredVaults = relevantVaults.filter((vault: EnhancedVaultData) => {
        let passes = false;
        switch (riskProfile) {
          case 'conservative':
            passes = vault.riskScore <= 15 && vault.tvlUsd >= 10000000 && vault.dataQuality !== 'poor';
            break;
          case 'moderate':
            passes = vault.riskScore <= 25 && vault.tvlUsd >= 5000000 && vault.dataQuality !== 'poor';
            break;
          case 'aggressive':
            passes = vault.riskScore <= 35 && vault.tvlUsd >= 1000000;
            break;
          default:
            passes = true;
        }
        
        if (!passes) {
          console.log(`Vault ${vault.address} filtered out: riskScore=${vault.riskScore}, tvlUsd=${vault.tvlUsd}, dataQuality=${vault.dataQuality}`);
        }
        
        return passes;
      });
      
      console.log(`After risk filtering: ${filteredVaults.length} vaults remaining`);

      // Sort by recommendation score and return top results
      return filteredVaults
        .sort((a: EnhancedVaultData, b: EnhancedVaultData) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Error getting best vaults for token:', error);
      // Fallback to database query if enhanced data fails
      return this.getBestVaultsFromDatabase(tokenSymbol, chainId, riskProfile, limit);
    }
  }

  /**
   * Get user's current investments
   */
  async getUserInvestments(userWalletAddress: string) {
    return await this.prisma.userInvestment.findMany({
      where: {
        userWalletAddress,
        status: 'active',
      },
      include: {
        vault: {
          include: {
            metrics: {
              orderBy: { date: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
  }

  /**
   * Calculate optimal vault allocation for a given amount
   */
  async calculateOptimalAllocation(
    tokenSymbol: string,
    chainId: number,
    totalAmount: number,
    riskProfile: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
  ) {
    try {
      const bestVaults = await this.getBestVaultsForToken(tokenSymbol, chainId, riskProfile) as EnhancedVaultData[];
      
      if (bestVaults.length === 0) {
        throw new Error(`No suitable vaults found for ${tokenSymbol} on chain ${chainId}`);
      }

      // Calculate allocation based on enhanced vault metrics
      const allocations = [];
      const maxVaultAllocation = 0.4; // Max 40% per vault for diversification
      
      // Calculate weights based on recommendation score and risk-adjusted returns
      const totalWeight = bestVaults.reduce((sum: number, vault: EnhancedVaultData) => {
        return sum + (vault.recommendationScore || 0);
      }, 0);

      let remainingAmount = totalAmount;
      
      for (const vault of bestVaults) {
        if (remainingAmount <= 0) continue;
        
        const weight = (vault.recommendationScore || 0) / totalWeight;
        const idealAllocation = totalAmount * weight;
        const maxAllocation = totalAmount * maxVaultAllocation;
        
        const allocation = Math.min(idealAllocation, maxAllocation, remainingAmount);
        
        if (allocation > 0) {
          allocations.push({
            vaultAddress: vault.address,
            chainId: vault.chainId,
            amount: allocation,
            percentage: (allocation / totalAmount) * 100,
            expectedApy: vault.netApy,
            riskScore: vault.riskScore,
            recommendationScore: vault.recommendationScore || 0,
            dataQuality: vault.dataQuality || 'fair'
          });
          
          remainingAmount -= allocation;
        }
      }

      // Redistribute any remaining amount
      if (remainingAmount > 0 && allocations.length > 0) {
        const redistributePerVault = remainingAmount / allocations.length;
        allocations.forEach(allocation => {
          allocation.amount += redistributePerVault;
          allocation.percentage = (allocation.amount / totalAmount) * 100;
        });
      }

      return allocations;
      
    } catch (error) {
      console.error('Error calculating optimal allocation:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private async findVaultInConfig(address: string, chainId: number) {
    const config = await this.configLoader.loadConfig();
    
    for (const [chainKey, chain] of Object.entries(config.chains)) {
      // Convert chain key to chainId (assuming format like 'ethereum-1' or 'base-8453')
      const configChainId = parseInt(chainKey.split('-').pop() || '0');
      if (configChainId === chainId) {
        for (const [tokenKey, token] of Object.entries(chain.tokens)) {
          const vault = token.vaults.find((v: any) => v.address.toLowerCase() === address.toLowerCase());
          if (vault) {
            return { ...vault, token: token.symbol };
          }
        }
      }
    }
    
    return null;
  }

  private async getTokenSymbolFromVault(vault: EnhancedVaultData): Promise<string> {
    try {
      // Get the configuration for this chain
      const config = await this.configLoader.loadConfig();
      // Find the correct chain config by matching chainId
      let chainConfig: any = undefined;
      for (const [chainKey, chain] of Object.entries(config.chains)) {
        const configChainId = parseInt(chainKey.split('-').pop() || '0');
        if (configChainId === vault.chainId) {
          chainConfig = chain;
          break;
        }
      }
      
      if (chainConfig && chainConfig.tokens) {
        // Search through all tokens to find the one that has this vault
        for (const [tokenSymbol, tokenConfig] of Object.entries(chainConfig.tokens)) {
          const vaultExists = (tokenConfig as any).vaults.some((v: any) => 
            v.address.toLowerCase() === vault.address.toLowerCase()
          );
          if (vaultExists) {
            return tokenSymbol;
          }
        }
      }
      
      // Fallback: try to infer from common vault addresses
      const address = vault.address.toLowerCase();
      if (address.includes('usdc') || this.isKnownUSDCVault(address)) {
        return 'USDC';
      }
      if (address.includes('weth') || address.includes('eth') || this.isKnownWETHVault(address)) {
        return 'WETH';
      }
      if (address.includes('wbtc') || address.includes('btc') || this.isKnownWBTCVault(address)) {
        return 'WBTC';
      }
      
      return 'UNKNOWN';
    } catch (error) {
      console.warn(`Failed to get token symbol for vault ${vault.address}:`, error);
      return 'UNKNOWN';
    }
  }
  
  private isKnownUSDCVault(address: string): boolean {
    const knownUSDCVaults = [
      '0x23479229e52ab6aad312d0b03df9f33b46753b5e', // ExtraFi XLend USDC Vault
      '0xc1256ae5ff1cf2719d4937adb3bbccab2e00a2ca', // Moonwell Flagship USDC Vault
      '0x616a4e1db48e22028f6bbf20444cd3b8e3273738', // Seamless USDC Vault
      '0xeef4ec5672f09119b96ab6fb59c27e1b7e44b61', // Gauntlet USDC Prime Vault
      '0xbeef010f9cb27031ad51e3333f9af9c6b1228183'  // Steakhouse USDC Vault
    ];
    return knownUSDCVaults.includes(address);
  }
  
  private isKnownWETHVault(address: string): boolean {
    // Add known WETH vault addresses here
    return false;
  }
  
  private isKnownWBTCVault(address: string): boolean {
    // Add known WBTC vault addresses here
    return false;
  }

  private async getBestVaultsFromDatabase(
    tokenSymbol: string,
    chainId: number,
    riskProfile: 'conservative' | 'moderate' | 'aggressive',
    limit: number
  ) {
    const criteria = await this.configLoader.getSelectionCriteria(riskProfile);
    
    const vaults = await this.prisma.morphoVault.findMany({
      where: {
        chainId,
        tokenSymbol: tokenSymbol.toUpperCase(),
        isWhitelisted: criteria.requireWhitelisted,
        riskScore: {
          lte: criteria.maxRiskScore,
        },
      },
      include: {
        metrics: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    });

    return vaults
      .filter((vault: any) => {
        const latestMetric = vault.metrics[0];
        if (!latestMetric) return false;
        
        return (
          latestMetric.tvlUsd >= criteria.minTvlUsd &&
          latestMetric.netApy >= criteria.minApyPercent
        );
      })
      .sort((a: any, b: any) => {
        const aMetric = a.metrics[0];
        const bMetric = b.metrics[0];
        
        return bMetric.netApy - aMetric.netApy;
      })
      .slice(0, limit);
  }

  private calculateUtilizationRate(allocation?: Array<{ supplyAssets: string; supplyAssetsUsd: number }>): number {
    if (!allocation || allocation.length === 0) return 0;
    
    const totalSupplied = allocation.reduce((sum, alloc) => sum + alloc.supplyAssetsUsd, 0);
    const totalCapacity = totalSupplied * 1.2; // Assume 20% buffer for capacity
    
    return totalSupplied / totalCapacity;
  }

  /**
   * Cleanup method
   */
  async disconnect() {
    await this.prisma.$disconnect();
  }
}

export default VaultManagementService;