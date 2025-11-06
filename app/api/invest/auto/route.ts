import { NextRequest, NextResponse } from 'next/server';
import InvestmentAutomationService from '@/lib/services/InvestmentAutomationService';
import { AgentWalletService } from '@/lib/services/agent-wallet-service';

const investmentService = new InvestmentAutomationService();

/**
 * POST /api/invest/auto
 * Automatically invest deposited funds into optimal Morpho vaults
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userWalletAddress,
      tokenSymbol,
      amount,
      chainId = 8453,
      riskProfile = 'moderate'
    } = body;

    // Validate required parameters
    if (!userWalletAddress || !tokenSymbol || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: userWalletAddress, tokenSymbol, amount',
        },
        { status: 400 }
      );
    }

    // Validate amount
    const amountBigInt = BigInt(amount);
    if (amountBigInt <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Amount must be greater than 0',
        },
        { status: 400 }
      );
    }

    // Validate risk profile
    const validRiskProfiles = ['conservative', 'moderate', 'aggressive'];
    if (!validRiskProfiles.includes(riskProfile)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid risk profile. Must be: conservative, moderate, or aggressive',
        },
        { status: 400 }
      );
    }

    // Check if user has a pro agent wallet
    const hasProWallet = await AgentWalletService.hasAgentWallet(userWalletAddress);
    if (!hasProWallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'No pro wallet found for user. Please create a wallet first.',
        },
        { status: 404 }
      );
    }

    console.log(`Auto-investment request:`, {
      userWalletAddress,
      tokenSymbol,
      amount: amount.toString(),
      chainId,
      riskProfile
    });

    // Execute auto-investment
    const results = await investmentService.autoInvest(
      userWalletAddress,
      tokenSymbol,
      amount.toString(),
      chainId,
      riskProfile as 'conservative' | 'moderate' | 'aggressive'
    );

    // Calculate success metrics
    const successfulInvestments = results.filter(r => r.success);
    const failedInvestments = results.filter(r => !r.success);
    const totalGasUsed = successfulInvestments.reduce((sum, r) => sum + BigInt(r.gasUsed || '0'), BigInt(0));

    return NextResponse.json({
      success: successfulInvestments.length > 0,
      data: {
        results,
        summary: {
          totalInvestments: results.length,
          successfulInvestments: successfulInvestments.length,
          failedInvestments: failedInvestments.length,
          totalGasUsed: totalGasUsed.toString(),
          transactionHashes: successfulInvestments.map(r => r.transactionHash).filter(Boolean),
        },
      },
      message: `Auto-investment completed: ${successfulInvestments.length}/${results.length} investments successful`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Auto-investment error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Auto-investment failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/invest/auto/status
 * Get auto-investment status for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userWalletAddress = searchParams.get('userWalletAddress');

    if (!userWalletAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing userWalletAddress parameter',
        },
        { status: 400 }
      );
    }

    // Get user's current investments
    const vaultService = new (await import('@/lib/services/VaultManagementService')).default();
    const investments = await vaultService.getUserInvestments(userWalletAddress);

    // Calculate total investment value
    const totalInvested = investments.reduce((sum: number, inv: any) => sum + inv.currentValue, 0);
    const totalDeposits = investments.reduce((sum: number, inv: any) => sum + inv.totalDeposits, 0);
    const totalGains = totalInvested - totalDeposits;
    const gainPercentage = totalDeposits > 0 ? (totalGains / totalDeposits) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        userWalletAddress,
        investments,
        summary: {
          totalInvestments: investments.length,
          totalInvested,
          totalDeposits,
          totalGains,
          gainPercentage,
          lastInvestmentAt: investments.length > 0 
            ? Math.max(...investments.map((inv: any) => new Date(inv.lastTransactionAt || inv.createdAt).getTime()))
            : null,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching investment status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch investment status',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}