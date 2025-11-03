import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchMorphoVaults, morphoVaultsToProtocols, computeRawMetrics } from '@/lib/risk';

/**
 * Daily vault data update endpoint
 * Updates vault information including APY, TVL, and risk metrics
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is an internal request (you might want to add authentication)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'default-secret';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[VAULT UPDATE] Starting daily vault data update...');
    
    // Fetch latest vault data from Morpho
    const vaults = await fetchMorphoVaults();
    
    if (!vaults || vaults.length === 0) {
      console.warn('[VAULT UPDATE] No vaults fetched from Morpho API');
      return NextResponse.json(
        { error: 'No vault data available' },
        { status: 404 }
      );
    }

    console.log(`[VAULT UPDATE] Fetched ${vaults.length} vaults from Morpho`);
    
    // Process and analyze vault data
    const protocols = morphoVaultsToProtocols(vaults);
    const rawMetrics = computeRawMetrics(protocols);
    
    // Store or update vault data in database
    const updatePromises = vaults.map(async (vault: any) => {
      const allocations = vault.state?.allocation || [];
      const tvlUsd = allocations.reduce(
        (total: number, alloc: any) => total + (alloc.supplyAssetsUsd || 0),
        0
      );
      
      const vaultData = {
        address: vault.address,
        name: vault.name || `Morpho ${vault.symbol} Vault`,
        symbol: vault.symbol || 'UNKNOWN',
        apy: vault.state?.apy || 0,
        netApy: vault.state?.netApy || 0,
        tvl: tvlUsd,
        whitelisted: vault.whitelisted || false,
        chainId: vault.chain?.id || 'unknown',
        chainNetwork: vault.chain?.network || 'unknown',
        assetAddress: vault.asset?.address || null,
        assetDecimals: vault.asset?.decimals || 18,
        lastUpdated: new Date(),
      };
      
      // Store vault data in other_user_info field as JSON
      const vaultId = `vault-${vault.address}`;
      return prisma.userProfile.upsert({
        where: {
          userWalletAddress: vaultId
        },
        update: {
          other_user_info: JSON.stringify({
            ...vaultData,
            type: 'vault_data'
          })
        },
        create: {
          userWalletAddress: vaultId,
          risk_profile: 'system',
          other_user_info: JSON.stringify({
            ...vaultData,
            type: 'vault_data'
          })
        }
      });
    });
    
    // Execute all updates
    await Promise.all(updatePromises);
    
    console.log(`[VAULT UPDATE] Successfully updated ${vaults.length} vault records`);
    
    // Calculate and store summary statistics
    const summaryStats = {
      totalVaults: vaults.length,
      whitelistedVaults: vaults.filter((v: any) => v.whitelisted).length,
      averageApy: vaults.reduce((sum: number, v: any) => sum + (v.state?.apy || 0), 0) / vaults.length,
      totalTvl: vaults.reduce((sum: number, v: any) => {
        const allocations = v.state?.allocation || [];
        return sum + allocations.reduce(
          (total: number, alloc: any) => total + (alloc.supplyAssetsUsd || 0),
          0
        );
      }, 0),
      lastUpdated: new Date(),
    };
    
    // Store summary in a special record
    await prisma.userProfile.upsert({
      where: {
        userWalletAddress: 'vault-summary-stats'
      },
      update: {
        other_user_info: JSON.stringify({
          ...summaryStats,
          type: 'vault_summary'
        })
      },
      create: {
        userWalletAddress: 'vault-summary-stats',
        risk_profile: 'system',
        other_user_info: JSON.stringify({
          ...summaryStats,
          type: 'vault_summary'
        })
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Vault data updated successfully',
      stats: summaryStats
    });
    
  } catch (error: any) {
    console.error('[VAULT UPDATE] Error updating vault data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update vault data',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Get the latest vault update status and summary
 */
export async function GET() {
  try {
    // Fetch the summary stats
    const summaryRecord = await prisma.userProfile.findUnique({
      where: {
        userWalletAddress: 'vault-summary-stats'
      }
    });
    
    if (!summaryRecord || !summaryRecord.other_user_info) {
      return NextResponse.json(
        { error: 'No vault summary data available' },
        { status: 404 }
      );
    }
    
    const summary = JSON.parse(summaryRecord.other_user_info);
    
    // Check if data is stale (older than 25 hours)
    const lastUpdated = new Date(summary.lastUpdated);
    const hoursOld = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
    const isStale = hoursOld > 25;
    
    return NextResponse.json({
      summary,
      isStale,
      hoursOld: Math.round(hoursOld * 100) / 100,
      nextUpdateDue: new Date(lastUpdated.getTime() + 24 * 60 * 60 * 1000)
    });
    
  } catch (error: any) {
    console.error('[VAULT UPDATE] Error fetching vault summary:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch vault summary',
        details: error.message 
      },
      { status: 500 }
    );
  }
}