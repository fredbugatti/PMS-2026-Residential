import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/reports/income-breakdown - Get income breakdown by account
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

    // Get all income accounts (4xxx)
    const incomeAccounts = await prisma.chartOfAccounts.findMany({
      where: {
        type: 'INCOME',
        active: true
      },
      orderBy: { code: 'asc' }
    });

    // Build where clause for ledger entries
    const whereClause: any = {
      status: 'POSTED',
      debitCredit: 'CR', // Income is credited
      accountCode: {
        startsWith: '4'
      },
      entryDate: {
        gte: start,
        lte: end
      }
    };

    // If propertyId filter, get leases for that property
    if (propertyId) {
      const propertyLeases = await prisma.lease.findMany({
        where: { propertyId },
        select: { id: true }
      });
      whereClause.leaseId = {
        in: propertyLeases.map(l => l.id)
      };
    }

    // Get ledger entries grouped by account
    const entries = await prisma.ledgerEntry.findMany({
      where: whereClause,
      select: {
        accountCode: true,
        amount: true
      }
    });

    // Aggregate by account
    const accountTotals: { [key: string]: number } = {};
    for (const entry of entries) {
      if (!accountTotals[entry.accountCode]) {
        accountTotals[entry.accountCode] = 0;
      }
      accountTotals[entry.accountCode] += Number(entry.amount);
    }

    // Build response with account details
    const breakdown = incomeAccounts.map(account => ({
      code: account.code,
      name: account.name,
      amount: accountTotals[account.code] || 0
    })).filter(item => item.amount > 0);

    // Calculate totals
    const totalIncome = breakdown.reduce((sum, item) => sum + item.amount, 0);

    // Get comparison to previous period
    const periodLength = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodLength);
    const prevEnd = new Date(start.getTime() - 1);

    const prevWhereClause = { ...whereClause };
    prevWhereClause.entryDate = {
      gte: prevStart,
      lte: prevEnd
    };

    const prevEntries = await prisma.ledgerEntry.findMany({
      where: prevWhereClause,
      select: {
        amount: true
      }
    });

    const previousPeriodTotal = prevEntries.reduce((sum, e) => sum + Number(e.amount), 0);
    const changePercent = previousPeriodTotal > 0
      ? ((totalIncome - previousPeriodTotal) / previousPeriodTotal) * 100
      : 0;

    return NextResponse.json({
      period: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      },
      breakdown,
      totalIncome,
      previousPeriodTotal,
      changePercent: Math.round(changePercent * 10) / 10
    });

  } catch (error: any) {
    console.error('GET /api/reports/income-breakdown error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch income breakdown' },
      { status: 500 }
    );
  }
}
