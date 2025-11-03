import { NextRequest, NextResponse } from 'next/server';
import { BasicAgentWalletService } from '@/lib/services/BasicAgentWalletService';
import { prisma } from '@/lib/prisma';
import { isAddress } from 'viem';

/**
 * Check database connection
 */
async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    return true;
  } catch (error) {
    console.error('[WALLET BASIC API] Database connection failed:', error);
    return false;
  }
}

/**
 * GET endpoint to retrieve basic wallet information
 * 
 * @param request - The HTTP request containing the user wallet address
 * @returns Basic wallet information
 */
export async function GET(req: NextRequest) {
  try {
    // Validate database connection first
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userWalletAddress = searchParams.get("userWalletAddress");

    console.log(`[WALLET BASIC API] GET checking wallet for address: ${userWalletAddress}`);

    if (!userWalletAddress || !isAddress(userWalletAddress)) {
      return NextResponse.json(
        { error: "Valid user wallet address is required" },
        { status: 400 }
      );
    }

    // Get basic wallet
    const basicWalletService = BasicAgentWalletService.getInstance();
    const basicWallet = await basicWalletService.getBasicWallet(userWalletAddress);
    
    if (basicWallet) {
      console.log(`[WALLET BASIC API] Found basic wallet: ${basicWallet.agentWalletAddress}`);
      
      return NextResponse.json({
        success: true,
        data: {
          id: basicWallet.id,
          userWalletAddress: basicWallet.userWalletAddress,
          agentWalletAddress: basicWallet.agentWalletAddress,
          walletType: basicWallet.walletType,
          status: basicWallet.status,
          createdAt: basicWallet.createdAt,
          lastUsedAt: basicWallet.lastUsedAt
        }
      });
    } else {
      console.log(`[WALLET BASIC API] No basic wallet found for: ${userWalletAddress}`);
      
      return NextResponse.json({
        success: false,
        error: "Basic wallet not found"
      }, { status: 404 });
    }
  } catch (error) {
    console.error('[WALLET BASIC API] GET error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to create a new basic wallet
 * 
 * @param request - The HTTP request containing the user wallet address
 * @returns Created basic wallet information
 */
export async function POST(req: NextRequest) {
  try {
    // Validate database connection first
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { userWalletAddress } = body;

    console.log(`[WALLET BASIC API] POST creating wallet for address: ${userWalletAddress}`);

    if (!userWalletAddress || !isAddress(userWalletAddress)) {
      return NextResponse.json(
        { error: "Valid user wallet address is required" },
        { status: 400 }
      );
    }

    // Create basic wallet
    const basicWalletService = BasicAgentWalletService.getInstance();
    const basicWallet = await basicWalletService.createBasicWallet({ userWalletAddress });
    
    console.log(`[WALLET BASIC API] Created basic wallet: ${basicWallet.agentWalletAddress}`);
    
    return NextResponse.json({
      success: true,
      data: {
        id: basicWallet.id,
        userWalletAddress: basicWallet.userWalletAddress,
        agentWalletAddress: basicWallet.agentWalletAddress,
        walletType: basicWallet.walletType,
        status: basicWallet.status,
        createdAt: basicWallet.createdAt,
        lastUsedAt: basicWallet.lastUsedAt
      }
    });
  } catch (error: any) {
    console.error('[WALLET BASIC API] POST error:', error);
    
    if (error.message?.includes('already exists')) {
      return NextResponse.json(
        { error: "Basic wallet already exists for this user" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create basic wallet" },
      { status: 500 }
    );
  }
}