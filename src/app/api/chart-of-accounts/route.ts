import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/chart-of-accounts - Get all accounts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');

    const accounts = await prisma.chartOfAccounts.findMany({
      where: {
        ...(active !== null && { active: active === 'true' })
      },
      orderBy: [
        { code: 'asc' }
      ]
    });

    return NextResponse.json(accounts);
  } catch (error: any) {
    console.error('GET /api/chart-of-accounts error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}
