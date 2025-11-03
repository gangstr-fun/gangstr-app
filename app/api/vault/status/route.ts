import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandling } from '@/lib/error-handler';
import { isAddress } from 'ethers';

/**
 * GET /api/vault/status
 * Returns vault status and metrics for dashboard display
 * Supports filtering by user wallet address for personalized data
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const userWalletAddress = searchParams.get('userWalletAddress');
  const limit = parseInt(searchParams.get('limit') || '10');
  const riskLevel = searchParams.get('riskLevel'); // low, medium, high
  const tokenSymbol = searchParams.get('tokenSymbol'); // USDC, WETH, etc.

  console.log('[VAULT STATUS] Fetching vault status data', {
    userWalletAddress,
    limit,
    riskLevel,
    tokenSymbol
  });

  // Validate user wallet address if provided
  if (userWalletAddress && !isAddress(userWalletAddress)) {
    return NextResponse.json(
      { error: 'Invalid wallet address format' },
      { status: 400 }
    );
  }

  try {
    // Build where clause for filtering
    const whereClause: any = {
      isWhitelisted: true,
    };

    if (riskLevel) {
      const riskScoreRanges = {
        low: { gte: 0, lte: 30 },
        medium: { gte: 31, lte: 70 },
        high: { gte: 71, lte: 100 }
      };
      whereClause.riskScore = riskScoreRanges[riskLevel as keyof typeof riskScoreRanges];
    }

    if (tokenSymbol) {
      whereClause.tokenSymbol = tokenSymbol;
    }

    // Fetch vaults with latest metrics
    const vaults = await prisma.morphoVault.findMany({
      where: whereClause,
      include: {
        metrics: {
          orderBy: { date: 'desc' },
          take: 1, // Get only the latest metric
        },
        investments: userWalletAddress ? {
          where: {
            userWalletAddress,
            status: 'active'
          }
        } : false
      },
      orderBy: [
        { metrics: { _count: 'desc' } }, // Prioritize vaults with metrics
        { lastSyncAt: 'desc' }
      ],
      take: limit
    });

    // Transform data for dashboard consumption
    const vaultStatus = vaults.map(vault => {
      const latestMetric = vault.metrics[0];
      const userInvestment = userWalletAddress && vault.investments ? vault.investments[0] : null;

      return {
        id: vault.id,
        address: vault.address,
        name: vault.name,
        symbol: vault.symbol,
        tokenSymbol: vault.tokenSymbol,
        chainId: vault.chainId,
        riskScore: vault.riskScore,
        description: vault.description,
        curatorName: vault.curatorName,
        curatorImage: vault.curatorImage,
        
        // Latest metrics
        metrics: latestMetric ? {
          apy: latestMetric.apy,
          netApy: latestMetric.netApy,
          dailyApy: latestMetric.dailyApy,
          weeklyApy: latestMetric.weeklyApy,
          monthlyApy: latestMetric.monthlyApy,
          tvlUsd: latestMetric.tvlUsd,
          totalAssetsUsd: latestMetric.totalAssetsUsd,
          utilizationRate: latestMetric.utilizationRate,
          lastUpdated: latestMetric.date
        } : null,
        
        // User investment data (if user wallet provided)
        userInvestment: userInvestment ? {
          amountInvested: userInvestment.amountInvested,
          currentValue: userInvestment.currentValue,
          currentShares: userInvestment.currentShares,
          unrealizedPnl: userInvestment.unrealizedPnl,
          realizedPnl: userInvestment.realizedPnl,
          totalDeposits: userInvestment.totalDeposits,
          totalWithdrawals: userInvestment.totalWithdrawals,
          firstInvestmentAt: userInvestment.firstInvestmentAt,
          lastTransactionAt: userInvestment.lastTransactionAt
        } : null,
        
        // Status indicators
        status: {
          isActive: vault.isWhitelisted,
          hasMetrics: !!latestMetric,
          lastSyncAt: vault.lastSyncAt,
          dataFreshness: latestMetric ? 
            Math.floor((Date.now() - new Date(latestMetric.date).getTime()) / (1000 * 60 * 60)) : null // hours since last update
        }
      };
    });

    // Calculate summary statistics
    const summary = {
      totalVaults: vaults.length,
      activeVaults: vaults.filter(v => v.isWhitelisted).length,
      vaultsWithMetrics: vaults.filter(v => v.metrics.length > 0).length,
      averageApy: vaults.reduce((sum, v) => {
        const metric = v.metrics[0];
        return sum + (metric?.apy || 0);
      }, 0) / Math.max(vaults.length, 1),
      totalTvlUsd: vaults.reduce((sum, v) => {
        const metric = v.metrics[0];
        return sum + (metric?.tvlUsd || 0);
      }, 0),
      userTotalInvested: userWalletAddress ? vaults.reduce((sum, v) => {
        const investment = v.investments?.[0];
        return sum + Number(investment?.amountInvested ?? 0);
      }, 0) : null,
      userTotalValue: userWalletAddress ? vaults.reduce((sum, v) => {
        const investment = v.investments?.[0];
        return sum + Number(investment?.currentValue ?? 0);
      }, 0) : null
    };

    console.log('[VAULT STATUS] Successfully fetched vault status', {
      vaultCount: vaults.length,
      userWalletAddress,
      summary
    });

    return NextResponse.json({
      success: true,
      data: {
        vaults: vaultStatus,
        summary,
        filters: {
          riskLevel,
          tokenSymbol,
          limit
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[VAULT STATUS] Error fetching vault status:', error);
    throw error; // Let withErrorHandling handle it
  }
});

/**
 * POST /api/vault/status
 * Updates vault status for specific vaults (admin/cron use)
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { vaultAddresses, forceSync } = await request.json();

  if (!vaultAddresses || !Array.isArray(vaultAddresses)) {
    return NextResponse.json(
      { error: 'vaultAddresses array is required' },
      { status: 400 }
    );
  }

  console.log('[VAULT STATUS] Updating vault status', {
    vaultCount: vaultAddresses.length,
    forceSync
  });

  try {
    // Update lastSyncAt for specified vaults
    const updateResult = await prisma.morphoVault.updateMany({
      where: {
        address: {
          in: vaultAddresses
        }
      },
      data: {
        lastSyncAt: new Date()
      }
    });

    console.log('[VAULT STATUS] Updated vault sync timestamps', {
      updatedCount: updateResult.count
    });

    return NextResponse.json({
      success: true,
      data: {
        updatedVaults: updateResult.count,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[VAULT STATUS] Error updating vault status:', error);
    throw error;
  }
});