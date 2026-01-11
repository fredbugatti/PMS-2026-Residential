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

// POST /api/chart-of-accounts - Create a new account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, type, normalBalance, active = true } = body;

    if (!code || !name || !type || !normalBalance) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name, type, normalBalance' },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await prisma.chartOfAccounts.findUnique({
      where: { code }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Account code already exists' },
        { status: 400 }
      );
    }

    const account = await prisma.chartOfAccounts.create({
      data: {
        code,
        name,
        type,
        normalBalance,
        active,
      }
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/chart-of-accounts error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 500 }
    );
  }
}
