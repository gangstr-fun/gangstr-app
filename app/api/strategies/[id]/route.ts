import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/strategies/[id] - Get a specific strategy by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    const strategy = await prisma.strategy.findUnique({
      where: { id },
      include: {
        agents: true
      }
    });
    
    if (!strategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ strategy });
  } catch (error) {
    console.error('Error fetching strategy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch strategy' },
      { status: 500 }
    );
  }
}

// PATCH /api/strategies/[id] - Update a strategy
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    const { name, description, riskLevel, isActive } = body;
    
    const strategy = await prisma.strategy.update({
      where: { id },
      data: {
        name,
        description,
        riskLevel,
        isActive,
        updatedAt: new Date()
      }
    });
    
    return NextResponse.json({ strategy });
  } catch (error) {
    console.error('Error updating strategy:', error);
    return NextResponse.json(
      { error: 'Failed to update strategy' },
      { status: 500 }
    );
  }
}

// DELETE /api/strategies/[id] - Delete a strategy
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    await prisma.strategy.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting strategy:', error);
    return NextResponse.json(
      { error: 'Failed to delete strategy' },
      { status: 500 }
    );
  }
}
