import { NextRequest, NextResponse } from 'next/server';
import { isAddress, formatEther } from 'viem';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userWalletAddress = searchParams.get('userWalletAddress');
    const chainId = searchParams.get('chainId');

    // Validate input
    if (!userWalletAddress || !isAddress(userWalletAddress)) {
      return NextResponse.json(
        { error: 'Valid userWalletAddress is required' },
        { status: 400 }
      );
    }

    const chainIdNum = chainId ? parseInt(chainId) : 1;

    // Check database connection
    try {
      await prisma.$connect();
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Pro-only: lookup smart wallet via mapping and return placeholder balance for now
    const agentWalletMap = await prisma.agentWalletMap.findUnique({
      where: { userWalletAddress }
    });

    if (!agentWalletMap) {
      return NextResponse.json(
        { error: 'Agent wallet mapping not found' },
        { status: 404 }
      );
    }

    const agentWallet = await prisma.agentWallet.findUnique({
      where: { agent_id: agentWalletMap.agent_id }
    });

    if (!agentWallet || !agentWallet.smartWalletAddress) {
      return NextResponse.json(
        { error: 'Smart wallet not found' },
        { status: 404 }
      );
    }

    // TODO: implement onchain balance fetch for smart wallet
    const balance: bigint = BigInt(0);

    return NextResponse.json({
      success: true,
      data: {
        balance: balance.toString(),
        balanceFormatted: formatEther(balance),
        chainId: chainIdNum,
        walletMode: 'pro'
      }
    });
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get wallet balance' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}