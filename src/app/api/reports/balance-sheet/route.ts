import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/reports/balance-sheet - Get Balance Sheet as of a specific date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get('asOfDate');
    const propertyId = searchParams.get('propertyId');

    // Default to today if no date provided
    const asOf = asOfDate ? new Date(asOfDate) : new Date();
    asOf.setHours(23, 59, 59, 999); // End of day

    // Build filter for entries up to the as-of date
    const dateFilter = {
      entryDate: { lte: asOf },
      status: 'POSTED'
    };

    // If propertyId filter, get leases for that property
    let leaseFilter: any = {};
    if (propertyId) {
      const propertyLeases = await prisma.lease.findMany({
        where: { propertyId },
        select: { id: true }
      });
      leaseFilter = {
        leaseId: { in: propertyLeases.map(l => l.id) }
      };
    }

    // Get all active accounts
    const allAccounts = await prisma.chartOfAccounts.findMany({
      where: { active: true },
      orderBy: { code: 'asc' }
    });

    // Categorize accounts
    const assetAccounts = allAccounts.filter(a => a.type === 'ASSET');
    const liabilityAccounts = allAccounts.filter(a => a.type === 'LIABILITY');
    const equityAccounts = allAccounts.filter(a => a.type === 'EQUITY');
    const incomeAccounts = allAccounts.filter(a => a.type === 'INCOME');
    const expenseAccounts = allAccounts.filter(a => a.type === 'EXPENSE');

    // Get all ledger entries up to the as-of date
    const allEntries = await prisma.ledgerEntry.findMany({
      where: {
        ...dateFilter,
        ...(propertyId ? leaseFilter : {})
      },
      select: {
        accountCode: true,
        amount: true,
        debitCredit: true
      }
    });

    // Calculate balances for each account based on normal balance
    function calculateAccountBalance(accountCode: string, normalBalance: string): number {
      const entries = allEntries.filter(e => e.accountCode === accountCode);
      let balance = 0;
      for (const entry of entries) {
        const amount = Number(entry.amount);
        if (entry.debitCredit === normalBalance) {
          balance += amount;
        } else {
          balance -= amount;
        }
      }
      return balance;
    }

    // Build asset breakdown
    const assets = assetAccounts.map(account => ({
      code: account.code,
      name: account.name,
      balance: calculateAccountBalance(account.code, account.normalBalance)
    })).filter(a => a.balance !== 0);

    // Build liability breakdown
    const liabilities = liabilityAccounts.map(account => ({
      code: account.code,
      name: account.name,
      balance: calculateAccountBalance(account.code, account.normalBalance)
    })).filter(a => a.balance !== 0);

    // Build equity breakdown (including retained earnings calculation)
    const equityItems = equityAccounts.map(account => ({
      code: account.code,
      name: account.name,
      balance: calculateAccountBalance(account.code, account.normalBalance)
    })).filter(a => a.balance !== 0);

    // Calculate retained earnings (cumulative net income)
    // Net Income = Income (CR) - Expenses (DR)
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const account of incomeAccounts) {
      totalIncome += calculateAccountBalance(account.code, account.normalBalance);
    }

    for (const account of expenseAccounts) {
      totalExpenses += calculateAccountBalance(account.code, account.normalBalance);
    }

    const retainedEarnings = totalIncome - totalExpenses;

    // Add retained earnings to equity if it's not already tracked in an account
    const hasRetainedEarningsAccount = equityItems.some(e => e.code === '3200');
    if (!hasRetainedEarningsAccount && retainedEarnings !== 0) {
      equityItems.push({
        code: '3200',
        name: 'Retained Earnings (Current Period)',
        balance: retainedEarnings
      });
    }

    // Calculate totals
    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
    const totalEquity = equityItems.reduce((sum, e) => sum + e.balance, 0);

    // Balance check: Assets = Liabilities + Equity
    const balanceCheck = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

    // Categorize assets into current and fixed
    const currentAssets = assets.filter(a =>
      a.code.startsWith('10') || a.code.startsWith('11') || a.code.startsWith('12') || a.code.startsWith('13')
    );
    const fixedAssets = assets.filter(a =>
      !a.code.startsWith('10') && !a.code.startsWith('11') && !a.code.startsWith('12') && !a.code.startsWith('13')
    );

    // Categorize liabilities into current and long-term
    const currentLiabilities = liabilities.filter(l =>
      l.code.startsWith('21') || l.code.startsWith('22') || l.code.startsWith('23')
    );
    const longTermLiabilities = liabilities.filter(l =>
      l.code.startsWith('24') || l.code.startsWith('25') || l.code.startsWith('26')
    );

    return NextResponse.json({
      asOfDate: asOf.toISOString().split('T')[0],
      assets: {
        current: {
          items: currentAssets,
          total: currentAssets.reduce((sum, a) => sum + a.balance, 0)
        },
        fixed: {
          items: fixedAssets,
          total: fixedAssets.reduce((sum, a) => sum + a.balance, 0)
        },
        total: totalAssets
      },
      liabilities: {
        current: {
          items: currentLiabilities,
          total: currentLiabilities.reduce((sum, l) => sum + l.balance, 0)
        },
        longTerm: {
          items: longTermLiabilities,
          total: longTermLiabilities.reduce((sum, l) => sum + l.balance, 0)
        },
        total: totalLiabilities
      },
      equity: {
        items: equityItems,
        total: totalEquity
      },
      summary: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        liabilitiesPlusEquity: totalLiabilities + totalEquity,
        balanceCheck,
        workingCapital: currentAssets.reduce((sum, a) => sum + a.balance, 0) -
                        currentLiabilities.reduce((sum, l) => sum + l.balance, 0),
        debtToEquityRatio: totalEquity !== 0
          ? Math.round((totalLiabilities / totalEquity) * 100) / 100
          : null
      }
    });

  } catch (error: any) {
    console.error('GET /api/reports/balance-sheet error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate Balance Sheet' },
      { status: 500 }
    );
  }
}
