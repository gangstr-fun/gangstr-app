import { NextRequest, NextResponse } from 'next/server';
import InvestmentAutomationService from '@/lib/services/InvestmentAutomationService';
import { basicAgentWalletService } from '@/lib/services/BasicAgentWalletService';

const investmentService = new InvestmentAutomationService();

/**
 * POST /api/invest/rebalance
 * Execute rebalancing for a user's investments
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userWalletAddress,
      riskProfile = 'moderate',
      force = false
    } = body;

    // Validate required parameters
    if (!userWalletAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: userWalletAddress',
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

    // Check if user has a basic agent wallet
    const walletInfo = await basicAgentWalletService.getBasicWallet(userWalletAddress);
    if (!walletInfo) {
      return NextResponse.json(
        {
          success: false,
          error: 'No agent wallet found for user. Please create a wallet first.',
        },
        { status: 404 }
      );
    }

    console.log(`Rebalancing request:`, {
      userWalletAddress,
      riskProfile,
      force
    });

    // Execute rebalancing
    await investmentService.executeRebalancing(
      userWalletAddress,
      riskProfile as 'conservative' | 'moderate' | 'aggressive'
    );

    return NextResponse.json({
      success: true,
      message: 'Rebalancing completed successfully',
      data: {
        userWalletAddress,
        riskProfile,
        executedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Rebalancing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Rebalancing failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/invest/rebalance/jobs
 * Get rebalancing job history for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userWalletAddress = searchParams.get('userWalletAddress');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
    const status = searchParams.get('status'); // 'pending', 'in_progress', 'completed', 'failed'

    if (!userWalletAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing userWalletAddress parameter',
        },
        { status: 400 }
      );
    }

    // Get rebalancing job history from database
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const whereClause: any = { userWalletAddress };
      if (status) {
        whereClause.status = status;
      }

      const jobs = await (prisma as any).rebalanceJob.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      // Calculate summary statistics
      const totalJobs = jobs.length;
      const completedJobs = jobs.filter((job: any) => job.status === 'completed').length;
      const failedJobs = jobs.filter((job: any) => job.status === 'failed').length;
      const pendingJobs = jobs.filter((job: any) => job.status === 'pending').length;
      const inProgressJobs = jobs.filter((job: any) => job.status === 'in_progress').length;

      const lastRebalanceAt = jobs.length > 0 
        ? jobs.find((job: any) => job.status === 'completed')?.executedAt
        : null;

      return NextResponse.json({
        success: true,
        data: {
          jobs,
          summary: {
            totalJobs,
            completedJobs,
            failedJobs,
            pendingJobs,
            inProgressJobs,
            lastRebalanceAt,
            successRate: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Error fetching rebalancing jobs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch rebalancing jobs',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/invest/rebalance/jobs
 * Cancel pending rebalancing jobs for a user
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userWalletAddress = searchParams.get('userWalletAddress');
    const jobId = searchParams.get('jobId');

    if (!userWalletAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing userWalletAddress parameter',
        },
        { status: 400 }
      );
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      let cancelledJobs;
      
      if (jobId) {
        // Cancel specific job
        cancelledJobs = await (prisma as any).rebalanceJob.updateMany({
          where: {
            id: jobId,
            userWalletAddress,
            status: { in: ['pending', 'in_progress'] },
          },
          data: {
            status: 'cancelled',
            errorMessage: 'Cancelled by user request',
          },
        });
      } else {
        // Cancel all pending jobs for user
        cancelledJobs = await (prisma as any).rebalanceJob.updateMany({
          where: {
            userWalletAddress,
            status: { in: ['pending', 'in_progress'] },
          },
          data: {
            status: 'cancelled',
            errorMessage: 'Cancelled by user request',
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Cancelled ${cancelledJobs.count} rebalancing job(s)`,
        data: {
          cancelledCount: cancelledJobs.count,
          userWalletAddress,
          jobId,
        },
        timestamp: new Date().toISOString(),
      });
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Error cancelling rebalancing jobs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel rebalancing jobs',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}