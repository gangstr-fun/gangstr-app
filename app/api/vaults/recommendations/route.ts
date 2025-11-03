import { NextRequest, NextResponse } from 'next/server';
import { VaultDataFetcherService } from '../../../../lib/services/VaultDataFetcherService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const riskProfile = searchParams.get('riskProfile') || 'moderate';
    const amount = searchParams.get('amount');

    // Initialize vault data fetcher service
    const vaultDataFetcher = new VaultDataFetcherService();
    
    // Fetch vault rankings based on risk profile
    const recommendations = await vaultDataFetcher.getVaultRankings(
      undefined, // chainId - get all chains
      undefined  // tokenSymbol - get all tokens
    );

    return NextResponse.json({
      success: true,
      recommendations,
      riskProfile,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching vault recommendations:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch vault recommendations',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userWalletAddress, riskProfile, investmentAmount } = body;

    if (!userWalletAddress || !riskProfile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: userWalletAddress and riskProfile'
        },
        { status: 400 }
      );
    }

    // Initialize vault data fetcher service
    const vaultDataFetcher = new VaultDataFetcherService();
    
    // Get vault rankings for personalized recommendations
    const recommendations = await vaultDataFetcher.getVaultRankings(
      undefined, // chainId - get all chains
      undefined  // tokenSymbol - get all tokens
    );

    return NextResponse.json({
      success: true,
      recommendations,
      userWalletAddress,
      riskProfile,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating personalized recommendations:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create personalized recommendations',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}