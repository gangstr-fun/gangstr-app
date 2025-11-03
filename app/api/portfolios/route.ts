import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/portfolios/[id] - Get a specific portfolio by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    const portfolio = await prisma.portfolio.findUnique({
      where: { id },
      include: {
        assets: {
          include: {
            transactions: true
          }
        },
      }
    });
    
    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ portfolio });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}

// PATCH /api/portfolios/[id] - Update a portfolio
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    const { name, description } = body;
    
    const portfolio = await prisma.portfolio.update({
      where: { id },
      data: {
        name,
        description,
        updatedAt: new Date()
      }
    });
    
    return NextResponse.json({ portfolio });
  } catch (error) {
    console.error('Error updating portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to update portfolio' },
      { status: 500 }
    );
  }
}

// DELETE /api/portfolios/[id] - Delete a portfolio
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    await prisma.portfolio.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to delete portfolio' },
      { status: 500 }
    );
  }
}
