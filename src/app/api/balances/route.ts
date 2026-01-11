import { NextResponse } from 'next/server';
import { getAccountBalance, prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const accounts = await prisma.chartOfAccounts.findMany({
      where: { active: true },
      orderBy: { code: 'asc' }
    });

    const balances = await Promise.all(
      accounts.map(async (account) => ({
        code: account.code,
        name: account.name,
        balance: await getAccountBalance(account.code)
      }))
    );

    return NextResponse.json(balances);
  } catch (error: any) {
    console.error('GET /api/balances error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch balances' },
      { status: 500 }
    );
  }
}
