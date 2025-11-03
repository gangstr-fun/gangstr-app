import { NextRequest, NextResponse } from 'next/server';
import { startupService } from '@/lib/services/startup';

/**
 * GET /api/vault-sync - Get vault sync status and statistics
 */
export async function GET() {
  try {
    const vaultDataSync = startupService.getVaultDataSync();
    const status = vaultDataSync.getSyncStatus();
    
    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    console.error('Error getting vault sync status:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get vault sync status',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vault-sync - Manually trigger vault data synchronization
 */
export async function POST(request: NextRequest) {
  try {
    // Check for authorization header or API key if needed
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Simple auth check for manual sync triggers
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    const vaultDataSync = startupService.getVaultDataSync();
    
    // Check if sync is already running
    const currentStatus = vaultDataSync.getSyncStatus();
    if (currentStatus.isRunning) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sync already in progress',
          data: currentStatus
        },
        { status: 409 }
      );
    }

    // Trigger manual sync
    console.log('🔧 Manual vault sync triggered via API');
    const result = await vaultDataSync.triggerManualSync();
    
    return NextResponse.json({
      success: true,
      message: 'Vault sync completed',
      data: result
    });
  } catch (error: any) {
    console.error('Error triggering vault sync:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger vault sync',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/vault-sync - Update vault sync configuration (future enhancement)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // This could be used to update sync schedules, enable/disable sync, etc.
    // For now, return not implemented
    return NextResponse.json(
      {
        success: false,
        error: 'Configuration updates not yet implemented'
      },
      { status: 501 }
    );
  } catch (error: any) {
    console.error('Error updating vault sync config:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update vault sync configuration',
        details: error.message
      },
      { status: 500 }
    );
  }
}