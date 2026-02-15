import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/reports/balance-sheet - Balance Sheet as of a given date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get('asOfDate');
    const propertyId = searchParams.get('propertyId');

    // Default to today
    const endDate = asOfDate ? new Date(asOfDate) : new Date();
    endDate.setHours(23, 59, 59, 999);

    // If propertyId filter, get leases for that property
    let leaseFilter: any = {};
    if (propertyId) {
      const propertyLeases = await prisma.lease.findMany({
        where: { propertyId },
        select: { id: true }
      });
      leaseFilter = {
        leaseId: {
          in: [...propertyLeases.map(l => l.id), null]
        }
      };
    }

    // Get all active accounts
    const allAccounts = await prisma.chartOfAccounts.findMany({
      where: { active: true },
      orderBy: { code: 'asc' }
    });

    const assetAccounts = allAccounts.filter(a => a.type === 'ASSET');
    const liabilityAccounts = allAccounts.filter(a => a.type === 'LIABILITY');
    const equityAccounts = allAccounts.filter(a => a.type === 'EQUITY');
    const incomeAccounts = allAccounts.filter(a => a.type === 'INCOME');
    const expenseAccounts = allAccounts.filter(a => a.type === 'EXPENSE');

    // Get all posted ledger entries up to asOfDate
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        entryDate: { lte: endDate },
        status: 'POSTED',
        ...leaseFilter
      },
      select: {
        accountCode: true,
        amount: true,
        debitCredit: true
      }
    });

    // Aggregate by account: compute net balance
    const accountBalances: Record<string, { dr: number; cr: number }> = {};
    for (const entry of entries) {
      if (!accountBalances[entry.accountCode]) {
        accountBalances[entry.accountCode] = { dr: 0, cr: 0 };
      }
      if (entry.debitCredit === 'DR') {
        accountBalances[entry.accountCode].dr += Number(entry.amount);
      } else {
        accountBalances[entry.accountCode].cr += Number(entry.amount);
      }
    }

    // Helper: compute balance based on normal balance direction
    const getBalance = (code: string, normalBalance: string) => {
      const bal = accountBalances[code] || { dr: 0, cr: 0 };
      // Assets/Expenses: DR normal → balance = DR - CR
      // Liabilities/Equity/Income: CR normal → balance = CR - DR
      return normalBalance === 'DR' ? bal.dr - bal.cr : bal.cr - bal.dr;
    };

    // Build sections
    const buildSection = (accounts: typeof allAccounts) =>
      accounts
        .map(a => ({
          code: a.code,
          name: a.name,
          balance: Math.round(getBalance(a.code, a.normalBalance) * 100) / 100
        }))
        .filter(a => Math.abs(a.balance) > 0.005);

    const assets = buildSection(assetAccounts);
    const liabilities = buildSection(liabilityAccounts);
    const equity = buildSection(equityAccounts);

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
    const totalEquity = equity.reduce((s, a) => s + a.balance, 0);

    // Retained earnings = Income - Expenses (auto-closes into equity)
    const incomeSection = buildSection(incomeAccounts);
    const expenseSection = buildSection(expenseAccounts);
    const totalIncome = incomeSection.reduce((s, a) => s + a.balance, 0);
    const totalExpenses = expenseSection.reduce((s, a) => s + a.balance, 0);
    const retainedEarnings = Math.round((totalIncome - totalExpenses) * 100) / 100;

    const totalEquityWithRE = totalEquity + retainedEarnings;

    return NextResponse.json({
      asOfDate: endDate.toISOString().split('T')[0],
      assets: {
        accounts: assets,
        total: Math.round(totalAssets * 100) / 100
      },
      liabilities: {
        accounts: liabilities,
        total: Math.round(totalLiabilities * 100) / 100
      },
      equity: {
        accounts: equity,
        retainedEarnings,
        total: Math.round(totalEquityWithRE * 100) / 100
      },
      summary: {
        totalAssets: Math.round(totalAssets * 100) / 100,
        totalLiabilitiesAndEquity: Math.round((totalLiabilities + totalEquityWithRE) * 100) / 100,
        isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquityWithRE)) < 0.01
      }
    });

  } catch (error: any) {
    console.error('GET /api/reports/balance-sheet error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate balance sheet' },
      { status: 500 }
    );
  }
}
