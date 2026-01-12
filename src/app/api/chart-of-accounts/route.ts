import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/chart-of-accounts - Get all accounts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');

    // Use raw SQL to get accounts with transaction counts
    // Note: Using status != 'VOIDED' to filter out voided entries (compatible with both schema versions)
    let accounts;
    if (active !== null) {
      accounts = await prisma.$queryRaw`
        SELECT
          c.code,
          c.name,
          c.description,
          c.type,
          c.normal_balance as "normalBalance",
          c.active,
          COUNT(l.id)::int as "transactionCount",
          COALESCE(SUM(CASE WHEN l.debit_credit = 'DR' THEN l.amount ELSE 0 END), 0) as "totalDebits",
          COALESCE(SUM(CASE WHEN l.debit_credit = 'CR' THEN l.amount ELSE 0 END), 0) as "totalCredits"
        FROM chart_of_accounts c
        LEFT JOIN ledger_entries l ON c.code = l.account_code AND (l.status IS NULL OR l.status != 'VOID')
        WHERE c.active = ${active === 'true'}
        GROUP BY c.code, c.name, c.description, c.type, c.normal_balance, c.active
        ORDER BY c.code ASC
      `;
    } else {
      accounts = await prisma.$queryRaw`
        SELECT
          c.code,
          c.name,
          c.description,
          c.type,
          c.normal_balance as "normalBalance",
          c.active,
          COUNT(l.id)::int as "transactionCount",
          COALESCE(SUM(CASE WHEN l.debit_credit = 'DR' THEN l.amount ELSE 0 END), 0) as "totalDebits",
          COALESCE(SUM(CASE WHEN l.debit_credit = 'CR' THEN l.amount ELSE 0 END), 0) as "totalCredits"
        FROM chart_of_accounts c
        LEFT JOIN ledger_entries l ON c.code = l.account_code AND (l.status IS NULL OR l.status != 'VOID')
        GROUP BY c.code, c.name, c.description, c.type, c.normal_balance, c.active
        ORDER BY c.code ASC
      `;
    }

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
    const { code, name, description, type, normalBalance, active = true } = body;

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
        description: description || null,
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
