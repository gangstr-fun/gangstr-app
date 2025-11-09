import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Auto-invest API has been removed during Basic→Pro migration.' },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: 'Auto-invest API has been removed during Basic→Pro migration.' },
    { status: 410 }
  );
}
