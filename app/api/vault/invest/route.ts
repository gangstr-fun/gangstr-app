import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  fetchMorphoVaults, 
  filterVaultsByRiskProfile, 
  morphoVaultsToProtocols,
  computeRawMetrics,
  normalizeMetrics,
  createRiskProfile
} from '@/lib/risk';
import { MorphoActionProvider } from '@/lib/customActions/Morpho/morphoActionProvider';
import { AgentWalletService } from '@/lib/services/agent-wallet-service';

/**
 * POST /api/vault/invest
 * Automatically invests user funds into the best performing Morpho vault
 */
export async function POST(request: NextRequest) {
  try {
    const { amount, token, userWalletAddress } = await request.json();

    if (!userWalletAddress) {
      return NextResponse.json(
        { error: 'User wallet address is required' },
        { status: 400 }
      );
    }

    if (!amount || !token) {
      return NextResponse.json(
        { error: 'Amount and token are required' },
        { status: 400 }
      );
    }

    // Validate amount
    const investmentAmount = parseFloat(amount);
    if (isNaN(investmentAmount) || investmentAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid investment amount' },
        { status: 400 }
      );
    }

    // Get pro agent wallet (smart wallet) - basic mode removed
    const walletMapping = await prisma.agentWalletMap.findUnique({
      where: { userWalletAddress }
    });

    if (!walletMapping) {
      return NextResponse.json(
        { error: 'Pro agent wallet not found. Please create wallet first.' },
        { status: 404 }
      );
    }

    const userWallet = await prisma.agentWallet.findUnique({
      where: { agent_id: walletMapping.agent_id }
    });

    if (!userWallet) {
      return NextResponse.json(
        { error: 'Pro agent wallet not found.' },
        { status: 404 }
      );
    }

    // Use smart wallet address if available, otherwise use signer address
    const agentWalletAddress = userWallet.smartWalletAddress || userWallet.walletPublicKey;

    // Fetch current best Morpho vaults
    const vaults = await fetchMorphoVaults();
    if (!vaults || vaults.length === 0) {
      return NextResponse.json(
        { error: 'No Morpho vaults available' },
        { status: 500 }
      );
    }

    // Select best vault based on APY and safety criteria using risk profiling
    const bestVault = selectBestVault(vaults, token);
    if (!bestVault) {
      return NextResponse.json(
        { error: `No suitable vault found for token ${token}` },
        { status: 404 }
      );
    }

    // For now, simulate the investment (will be replaced with actual blockchain calls)
    const investmentResult = {
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      success: true
    };

    // For now, store investment data in UserProfile metadata
    // This will be moved to a proper VaultInvestment table later
    const investmentData = {
      vaultAddress: bestVault.address,
      vaultName: bestVault.name,
      amount: investmentAmount,
      token: token,
      apy: bestVault.apy,
      transactionHash: investmentResult.transactionHash,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };

    // Update user profile with investment data
    await prisma.userProfile.upsert({
      where: { userWalletAddress },
      update: {
        other_user_info: JSON.stringify({ latestInvestment: investmentData })
      },
      create: {
        userWalletAddress,
        risk_profile: '',
        other_user_info: JSON.stringify({ latestInvestment: investmentData })
      }
    });

    return NextResponse.json({
      success: true,
      investment: {
        vaultName: bestVault.name,
        vaultAddress: bestVault.address,
        amount: investmentAmount,
        token: token,
        apy: bestVault.apy,
        transactionHash: investmentResult.transactionHash,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Investment error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process investment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/vault/invest
 * Get user's current investments and available vaults
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userWalletAddress = searchParams.get('userWalletAddress');

    if (!userWalletAddress) {
      return NextResponse.json(
        { error: 'User wallet address is required' },
        { status: 400 }
      );
    }

    // Get user's investment data from profile
    const userProfile = await prisma.userProfile.findUnique({
      where: { userWalletAddress }
    });

    let investmentData = null;
    if (userProfile?.other_user_info) {
      try {
        const profileData = JSON.parse(userProfile.other_user_info);
        investmentData = profileData.latestInvestment;
      } catch (e) {
        console.error('Error parsing user profile data:', e);
      }
    }

    // Get available vaults
    const vaults = await fetchMorphoVaults();
    const processedVaults = vaults?.map((vault: any) => ({
      address: vault.address,
      name: vault.name,
      apy: vault.apy,
      tvl: vault.tvl,
      riskScore: vault.riskScore || 'low',
      supportedTokens: vault.supportedTokens || ['USDC', 'WETH']
    })) || [];

    return NextResponse.json({
      portfolio: {
        totalInvested: investmentData?.amount || 0,
        currentVault: investmentData ? {
          name: investmentData.vaultName,
          address: investmentData.vaultAddress,
          amount: investmentData.amount,
          token: investmentData.token,
          apy: investmentData.apy,
          investedAt: investmentData.timestamp
        } : null,
        investments: investmentData ? [investmentData] : []
      },
      availableVaults: processedVaults
    });

  } catch (error) {
    console.error('Get investments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch investments' },
      { status: 500 }
    );
  }
}

/**
 * Select the best vault using risk profiling and advanced analysis
 */
function selectBestVault(vaults: any[], preferredToken: string, userRiskProfile?: any): any {
  // Filter vaults that support the preferred token
  const compatibleVaults = vaults.filter(vault => {
    const supportedTokens = vault.supportedTokens || ['USDC', 'WETH'];
    return supportedTokens.includes(preferredToken.toUpperCase());
  });

  if (compatibleVaults.length === 0) {
    return null;
  }

  // Create a default moderate risk profile if none provided
  const defaultRiskProfile = userRiskProfile || createRiskProfile({
    aggressiveness: 1.0,
    category: 'Moderate',
    description: 'Balanced approach to risk and reward'
  });
  
  // Filter vaults by risk profile
  const filteredVaults = filterVaultsByRiskProfile(compatibleVaults, defaultRiskProfile);
  
  if (filteredVaults.length === 0) {
    // Fallback to basic filtering if risk filtering is too restrictive
    const basicFiltered = compatibleVaults.filter((vault: any) => {
      const allocations = vault.state?.allocation || [];
      const tvlUsd = allocations.reduce(
        (total: number, alloc: any) => total + (alloc.supplyAssetsUsd || 0),
        0
      );
      const apy = vault.state?.apy || vault.apy || 0;
      return tvlUsd > 50000 && apy > 0 && apy < 100 && vault.whitelisted;
    });
    
    if (basicFiltered.length === 0) {
      // Final fallback to simple APY sorting
      return compatibleVaults.sort((a, b) => {
        const apyA = a.state?.apy || a.apy || 0;
        const apyB = b.state?.apy || b.apy || 0;
        return apyB - apyA;
      })[0];
    }
    
    // Sort by APY and return the best
    return basicFiltered.sort((a: any, b: any) => {
      const apyA = a.state?.apy || a.apy || 0;
      const apyB = b.state?.apy || b.apy || 0;
      return apyB - apyA;
    })[0];
  }
  
  // Convert to protocols format for analysis
  const protocols = morphoVaultsToProtocols(filteredVaults);
  const rawMetrics = computeRawMetrics(protocols);
  const normalizedMetrics = normalizeMetrics(rawMetrics);
  
  // Select the vault with the best normalized score
  const bestProtocol = normalizedMetrics.sort((a: any, b: any) => {
    // Weighted score: APY (40%), TVL (30%), Security (20%), Momentum (10%)
    const scoreA = (a.apy * 0.4) + (a.tvl * 0.3) + (a.security * 0.2) + (a.momentum * 0.1);
    const scoreB = (b.apy * 0.4) + (b.tvl * 0.3) + (b.security * 0.2) + (b.momentum * 0.1);
    return scoreB - scoreA;
  })[0];
  
  // Find the original vault that corresponds to the best protocol
   const selectedVault = filteredVaults.find((vault: any) => vault.address === bestProtocol.protocolData?.vaultAddress) || filteredVaults[0];
  
  // Log selection for debugging
  console.log(`Selected vault: ${selectedVault.name || selectedVault.address} with score-based analysis`);
  
  return selectedVault;
}