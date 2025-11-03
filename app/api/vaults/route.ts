import { NextRequest, NextResponse } from 'next/server';
import VaultManagementService from '@/lib/services/VaultManagementService';

const vaultService = new VaultManagementService();

/**
 * GET /api/vaults
 * Fetch available Morpho vaults with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenSymbol = searchParams.get('token');
    const chainId = searchParams.get('chainId') ? parseInt(searchParams.get('chainId')!) : undefined;
    const riskProfile = searchParams.get('riskProfile') as 'conservative' | 'moderate' | 'aggressive' | undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;

    // Sync latest vault data from Morpho API
    await vaultService.syncVaultData();

    let vaults;
    
    if (tokenSymbol && chainId && riskProfile) {
      // Get best vaults for specific criteria
      vaults = await vaultService.getBestVaultsForToken(tokenSymbol, chainId, riskProfile, limit);
    } else {
      // For now, get best vaults for USDC on Base as default
      const defaultToken = tokenSymbol || 'USDC';
      const defaultChain = chainId || 8453;
      const defaultRisk = riskProfile || 'moderate';
      
      vaults = await vaultService.getBestVaultsForToken(defaultToken, defaultChain, defaultRisk, limit);
    }

    return NextResponse.json({
      success: true,
      data: vaults,
      count: vaults.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching vaults:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch vaults',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vaults/sync
 * Manually trigger vault data synchronization
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { force = false } = body;

    console.log('Manual vault sync triggered', { force });
    
    const syncResult = await vaultService.syncVaultData();
    
    return NextResponse.json({
      success: true,
      message: 'Vault data synchronized successfully',
      data: syncResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error syncing vault data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync vault data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}