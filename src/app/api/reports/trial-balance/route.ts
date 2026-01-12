import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/reports/trial-balance - Get Trial Balance as of a specific date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get('asOfDate');
    const includeZeroBalances = searchParams.get('includeZero') === 'true';

    // Default to today if no date provided
    const asOf = asOfDate ? new Date(asOfDate) : new Date();
    asOf.setHours(23, 59, 59, 999);

    // Get all accounts
    const allAccounts = await prisma.chartOfAccounts.findMany({
      orderBy: { code: 'asc' }
    });

    // Get all ledger entries up to the as-of date
    const allEntries = await prisma.ledgerEntry.findMany({
      where: {
        entryDate: { lte: asOf },
        status: 'POSTED'
      },
      select: {
        accountCode: true,
        amount: true,
        debitCredit: true
      }
    });

    // Calculate totals for each account
    const accountBalances: Array<{
      code: string;
      name: string;
      type: string;
      normalBalance: string;
      debitTotal: number;
      creditTotal: number;
      balance: number;
      balanceSide: 'DR' | 'CR' | 'ZERO';
    }> = [];

    for (const account of allAccounts) {
      const entries = allEntries.filter(e => e.accountCode === account.code);

      let debitTotal = 0;
      let creditTotal = 0;

      for (const entry of entries) {
        const amount = Number(entry.amount);
        if (entry.debitCredit === 'DR') {
          debitTotal += amount;
        } else {
          creditTotal += amount;
        }
      }

      // Calculate balance based on normal balance
      let balance: number;
      let balanceSide: 'DR' | 'CR' | 'ZERO';

      if (account.normalBalance === 'DR') {
        balance = debitTotal - creditTotal;
      } else {
        balance = creditTotal - debitTotal;
      }

      if (Math.abs(balance) < 0.01) {
        balanceSide = 'ZERO';
        balance = 0;
      } else if (balance > 0) {
        balanceSide = account.normalBalance as 'DR' | 'CR';
      } else {
        balanceSide = account.normalBalance === 'DR' ? 'CR' : 'DR';
        balance = Math.abs(balance);
      }

      // Only include if has activity or includeZeroBalances is true
      if (debitTotal > 0 || creditTotal > 0 || includeZeroBalances) {
        accountBalances.push({
          code: account.code,
          name: account.name,
          type: account.type,
          normalBalance: account.normalBalance,
          debitTotal: Math.round(debitTotal * 100) / 100,
          creditTotal: Math.round(creditTotal * 100) / 100,
          balance: Math.round(balance * 100) / 100,
          balanceSide
        });
      }
    }

    // Calculate total debits and credits
    let totalDebits = 0;
    let totalCredits = 0;

    for (const account of accountBalances) {
      if (account.balanceSide === 'DR') {
        totalDebits += account.balance;
      } else if (account.balanceSide === 'CR') {
        totalCredits += account.balance;
      }
    }

    // Check if trial balance is in balance (debits = credits)
    const difference = Math.abs(totalDebits - totalCredits);
    const isBalanced = difference < 0.01;

    // Group by account type
    const byType = {
      ASSET: accountBalances.filter(a => a.type === 'ASSET'),
      LIABILITY: accountBalances.filter(a => a.type === 'LIABILITY'),
      EQUITY: accountBalances.filter(a => a.type === 'EQUITY'),
      INCOME: accountBalances.filter(a => a.type === 'INCOME'),
      EXPENSE: accountBalances.filter(a => a.type === 'EXPENSE')
    };

    // Calculate type totals
    const typeTotals = {
      ASSET: byType.ASSET.reduce((sum, a) => sum + (a.balanceSide === 'DR' ? a.balance : -a.balance), 0),
      LIABILITY: byType.LIABILITY.reduce((sum, a) => sum + (a.balanceSide === 'CR' ? a.balance : -a.balance), 0),
      EQUITY: byType.EQUITY.reduce((sum, a) => sum + (a.balanceSide === 'CR' ? a.balance : -a.balance), 0),
      INCOME: byType.INCOME.reduce((sum, a) => sum + (a.balanceSide === 'CR' ? a.balance : -a.balance), 0),
      EXPENSE: byType.EXPENSE.reduce((sum, a) => sum + (a.balanceSide === 'DR' ? a.balance : -a.balance), 0)
    };

    // Entry counts for verification
    const totalEntryCount = allEntries.length;
    const debitEntryCount = allEntries.filter(e => e.debitCredit === 'DR').length;
    const creditEntryCount = allEntries.filter(e => e.debitCredit === 'CR').length;

    return NextResponse.json({
      asOfDate: asOf.toISOString().split('T')[0],
      summary: {
        totalDebits: Math.round(totalDebits * 100) / 100,
        totalCredits: Math.round(totalCredits * 100) / 100,
        difference: Math.round(difference * 100) / 100,
        isBalanced,
        accountCount: accountBalances.length,
        accountsWithActivity: accountBalances.filter(a => a.debitTotal > 0 || a.creditTotal > 0).length
      },
      verification: {
        totalEntries: totalEntryCount,
        debitEntries: debitEntryCount,
        creditEntries: creditEntryCount,
        entryBalance: debitEntryCount === creditEntryCount ? 'MATCHED' : 'UNMATCHED'
      },
      typeTotals: {
        assets: Math.round(typeTotals.ASSET * 100) / 100,
        liabilities: Math.round(typeTotals.LIABILITY * 100) / 100,
        equity: Math.round(typeTotals.EQUITY * 100) / 100,
        income: Math.round(typeTotals.INCOME * 100) / 100,
        expenses: Math.round(typeTotals.EXPENSE * 100) / 100,
        // Accounting equation check: Assets = Liabilities + Equity + (Income - Expenses)
        netIncome: Math.round((typeTotals.INCOME - typeTotals.EXPENSE) * 100) / 100,
        equationCheck: Math.abs(
          typeTotals.ASSET - (typeTotals.LIABILITY + typeTotals.EQUITY + typeTotals.INCOME - typeTotals.EXPENSE)
        ) < 0.01
      },
      accounts: accountBalances,
      byType: {
        assets: byType.ASSET,
        liabilities: byType.LIABILITY,
        equity: byType.EQUITY,
        income: byType.INCOME,
        expenses: byType.EXPENSE
      }
    });

  } catch (error: any) {
    console.error('GET /api/reports/trial-balance error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate Trial Balance' },
      { status: 500 }
    );
  }
}
