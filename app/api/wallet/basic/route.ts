import { NextResponse } from 'next/server';

/**
 * GET endpoint to retrieve basic wallet information
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Basic wallet API has been removed. Use /api/agent-wallet instead.' },
    { status: 410 }
  );
}

/**
 * POST endpoint to create a new basic wallet
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Basic wallet API has been removed. Use /api/agent-wallet instead.' },
    { status: 410 }
  );
}