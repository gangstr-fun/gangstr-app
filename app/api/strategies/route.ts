import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/strategies - Get all strategies or filter by portfolio
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const where: { userId: string; portfolioId?: string } = { userId };
    


    const strategies = await prisma.strategy.findMany({
      where,
      include: {
        agents: true
      }
    });

    return NextResponse.json({ strategies });
  } catch (error) {
    console.error('Error fetching strategies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch strategies' },
      { status: 500 }
    );
  }
}

// POST /api/strategies - Create a new strategy
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, description, type, riskLevel, timeHorizon, expectedReturn } = body;
    
    if (!userId || !name || !type || !riskLevel) {
      return NextResponse.json(
        { error: 'User ID, name, type, and risk level are required' },
        { status: 400 }
      );
    }
    
    const strategy = await prisma.strategy.create({
      data: {
        userId,
        name,
        description,
        type,
        riskLevel,
        timeHorizon,
        expectedReturn
      }
    });
    
    return NextResponse.json({ strategy }, { status: 201 });
  } catch (error) {
    console.error('Error creating strategy:', error);
    return NextResponse.json(
      { error: 'Failed to create strategy' },
      { status: 500 }
    );
  }
}
