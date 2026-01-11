import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/reports/profit-loss - Get Profit & Loss statement
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const propertyId = searchParams.get('propertyId');

    // Default to current month if no dates provided
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;
    end.setHours(23, 59, 59, 999); // Include full end day

    // Build base where clause for date range
    const dateFilter = {
      entryDate: {
        gte: start,
        lte: end
      },
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
        leaseId: {
          in: propertyLeases.map(l => l.id)
        }
      };
    }

    // Get all accounts
    const allAccounts = await prisma.chartOfAccounts.findMany({
      where: { active: true },
      orderBy: { code: 'asc' }
    });

    const incomeAccounts = allAccounts.filter(a => a.type === 'INCOME');
    const expenseAccounts = allAccounts.filter(a => a.type === 'EXPENSE');

    // Get income entries (credits to income accounts)
    const incomeEntries = await prisma.ledgerEntry.findMany({
      where: {
        ...dateFilter,
        ...leaseFilter,
        accountCode: {
          in: incomeAccounts.map(a => a.code)
        },
        debitCredit: 'CR' // Income is credited
      },
      select: {
        accountCode: true,
        amount: true
      }
    });

    // Get expense entries (debits to expense accounts)
    const expenseEntries = await prisma.ledgerEntry.findMany({
      where: {
        ...dateFilter,
        ...leaseFilter,
        accountCode: {
          in: expenseAccounts.map(a => a.code)
        },
        debitCredit: 'DR' // Expenses are debited
      },
      select: {
        accountCode: true,
        amount: true
      }
    });

    // Aggregate income by account
    const incomeByAccount: { [key: string]: number } = {};
    for (const entry of incomeEntries) {
      if (!incomeByAccount[entry.accountCode]) {
        incomeByAccount[entry.accountCode] = 0;
      }
      incomeByAccount[entry.accountCode] += Number(entry.amount);
    }

    // Aggregate expenses by account
    const expenseByAccount: { [key: string]: number } = {};
    for (const entry of expenseEntries) {
      if (!expenseByAccount[entry.accountCode]) {
        expenseByAccount[entry.accountCode] = 0;
      }
      expenseByAccount[entry.accountCode] += Number(entry.amount);
    }

    // Build income breakdown
    const incomeBreakdown = incomeAccounts
      .map(account => ({
        code: account.code,
        name: account.name,
        amount: incomeByAccount[account.code] || 0
      }))
      .filter(item => item.amount > 0);

    // Build expense breakdown
    const expenseBreakdown = expenseAccounts
      .map(account => ({
        code: account.code,
        name: account.name,
        amount: expenseByAccount[account.code] || 0
      }))
      .filter(item => item.amount > 0);

    // Calculate totals
    const totalIncome = incomeBreakdown.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenseBreakdown.reduce((sum, item) => sum + item.amount, 0);
    const netOperatingIncome = totalIncome - totalExpenses;

    // Get previous period data for comparison
    const periodLength = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodLength - 86400000); // -1 day buffer
    const prevEnd = new Date(start.getTime() - 1);

    const prevDateFilter = {
      entryDate: {
        gte: prevStart,
        lte: prevEnd
      },
      status: 'POSTED'
    };

    // Previous period income
    const prevIncomeEntries = await prisma.ledgerEntry.findMany({
      where: {
        ...prevDateFilter,
        ...leaseFilter,
        accountCode: {
          in: incomeAccounts.map(a => a.code)
        },
        debitCredit: 'CR'
      },
      select: { amount: true }
    });

    // Previous period expenses
    const prevExpenseEntries = await prisma.ledgerEntry.findMany({
      where: {
        ...prevDateFilter,
        ...leaseFilter,
        accountCode: {
          in: expenseAccounts.map(a => a.code)
        },
        debitCredit: 'DR'
      },
      select: { amount: true }
    });

    const prevTotalIncome = prevIncomeEntries.reduce((sum, e) => sum + Number(e.amount), 0);
    const prevTotalExpenses = prevExpenseEntries.reduce((sum, e) => sum + Number(e.amount), 0);
    const prevNetOperatingIncome = prevTotalIncome - prevTotalExpenses;

    // Calculate changes
    const incomeChange = prevTotalIncome > 0
      ? ((totalIncome - prevTotalIncome) / prevTotalIncome) * 100
      : 0;

    const expenseChange = prevTotalExpenses > 0
      ? ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100
      : 0;

    const noiChange = prevNetOperatingIncome !== 0
      ? ((netOperatingIncome - prevNetOperatingIncome) / Math.abs(prevNetOperatingIncome)) * 100
      : 0;

    // Calculate expense ratio (expenses as % of income)
    const expenseRatio = totalIncome > 0
      ? (totalExpenses / totalIncome) * 100
      : 0;

    return NextResponse.json({
      period: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      },
      income: {
        breakdown: incomeBreakdown,
        total: totalIncome,
        previousPeriod: prevTotalIncome,
        changePercent: Math.round(incomeChange * 10) / 10
      },
      expenses: {
        breakdown: expenseBreakdown,
        total: totalExpenses,
        previousPeriod: prevTotalExpenses,
        changePercent: Math.round(expenseChange * 10) / 10
      },
      summary: {
        netOperatingIncome,
        previousNOI: prevNetOperatingIncome,
        noiChangePercent: Math.round(noiChange * 10) / 10,
        expenseRatio: Math.round(expenseRatio * 10) / 10,
        profitMargin: totalIncome > 0
          ? Math.round((netOperatingIncome / totalIncome) * 1000) / 10
          : 0
      }
    });

  } catch (error: any) {
    console.error('GET /api/reports/profit-loss error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate P&L report' },
      { status: 500 }
    );
  }
}
