import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/reports/cash-flow - Get Cash Flow Statement for a period
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
    end.setHours(23, 59, 59, 999);

    // Build date filter
    const dateFilter = {
      entryDate: {
        gte: start,
        lte: end
      },
      status: 'POSTED'
    };

    // Property filter
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

    // Get all cash account entries (1000 = Operating Cash, 1001 = Cash in Transit)
    const cashEntries = await prisma.ledgerEntry.findMany({
      where: {
        ...dateFilter,
        accountCode: { in: ['1000', '1001', '1050'] } // Operating, Transit, Petty Cash
      },
      include: {
        account: true
      },
      orderBy: { entryDate: 'asc' }
    });

    // Calculate starting cash balance (all entries before start date)
    const startingCashEntries = await prisma.ledgerEntry.findMany({
      where: {
        entryDate: { lt: start },
        accountCode: { in: ['1000', '1001', '1050'] },
        status: 'POSTED'
      },
      select: {
        amount: true,
        debitCredit: true
      }
    });

    let startingCashBalance = 0;
    for (const entry of startingCashEntries) {
      const amount = Number(entry.amount);
      startingCashBalance += entry.debitCredit === 'DR' ? amount : -amount;
    }

    // Categorize cash flows by activity type based on description and related accounts
    const operatingActivities: Array<{ description: string; amount: number; date: string }> = [];
    const investingActivities: Array<{ description: string; amount: number; date: string }> = [];
    const financingActivities: Array<{ description: string; amount: number; date: string }> = [];

    // Get all ledger entries for the period to understand cash flow sources
    const allEntries = await prisma.ledgerEntry.findMany({
      where: {
        ...dateFilter,
        ...(propertyId ? leaseFilter : {})
      },
      include: {
        account: true
      },
      orderBy: { entryDate: 'asc' }
    });

    // Analyze cash movements
    for (const entry of cashEntries) {
      const amount = Number(entry.amount);
      const cashFlow = entry.debitCredit === 'DR' ? amount : -amount;
      const description = entry.description;
      const date = entry.entryDate.toISOString().split('T')[0];

      // Categorize based on description patterns
      const descLower = description.toLowerCase();

      if (descLower.includes('mortgage') || descLower.includes('loan') ||
          descLower.includes('owner draw') || descLower.includes('capital')) {
        // Financing activities
        financingActivities.push({ description, amount: cashFlow, date });
      } else if (descLower.includes('equipment') || descLower.includes('property') ||
                 descLower.includes('improvement') || descLower.includes('appliance')) {
        // Investing activities
        investingActivities.push({ description, amount: cashFlow, date });
      } else {
        // Operating activities (rent, repairs, utilities, etc.)
        operatingActivities.push({ description, amount: cashFlow, date });
      }
    }

    // Aggregate by category
    const operatingTotal = operatingActivities.reduce((sum, a) => sum + a.amount, 0);
    const investingTotal = investingActivities.reduce((sum, a) => sum + a.amount, 0);
    const financingTotal = financingActivities.reduce((sum, a) => sum + a.amount, 0);

    const netCashChange = operatingTotal + investingTotal + financingTotal;
    const endingCashBalance = startingCashBalance + netCashChange;

    // Get summary of operating cash flows by type
    const operatingSummary = {
      rentCollected: 0,
      depositsReceived: 0,
      depositsReturned: 0,
      maintenancePaid: 0,
      utilitiesPaid: 0,
      otherOperating: 0
    };

    for (const activity of operatingActivities) {
      const descLower = activity.description.toLowerCase();
      if (descLower.includes('rent') || descLower.includes('payment received')) {
        operatingSummary.rentCollected += activity.amount;
      } else if (descLower.includes('deposit') && activity.amount > 0) {
        operatingSummary.depositsReceived += activity.amount;
      } else if (descLower.includes('deposit') && activity.amount < 0) {
        operatingSummary.depositsReturned += Math.abs(activity.amount);
      } else if (descLower.includes('repair') || descLower.includes('maintenance')) {
        operatingSummary.maintenancePaid += Math.abs(activity.amount);
      } else if (descLower.includes('utility') || descLower.includes('electric') ||
                 descLower.includes('water') || descLower.includes('gas')) {
        operatingSummary.utilitiesPaid += Math.abs(activity.amount);
      } else {
        operatingSummary.otherOperating += activity.amount;
      }
    }

    // Get previous period for comparison
    const periodLength = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodLength - 86400000);
    const prevEnd = new Date(start.getTime() - 1);

    const prevCashEntries = await prisma.ledgerEntry.findMany({
      where: {
        entryDate: { gte: prevStart, lte: prevEnd },
        accountCode: { in: ['1000', '1001', '1050'] },
        status: 'POSTED'
      },
      select: { amount: true, debitCredit: true }
    });

    let prevNetCashChange = 0;
    for (const entry of prevCashEntries) {
      const amount = Number(entry.amount);
      prevNetCashChange += entry.debitCredit === 'DR' ? amount : -amount;
    }

    return NextResponse.json({
      period: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      },
      cashPosition: {
        beginning: startingCashBalance,
        ending: endingCashBalance,
        netChange: netCashChange,
        previousPeriodChange: prevNetCashChange
      },
      operatingActivities: {
        items: operatingActivities.slice(0, 50), // Limit to 50 most recent
        total: operatingTotal,
        summary: operatingSummary
      },
      investingActivities: {
        items: investingActivities,
        total: investingTotal
      },
      financingActivities: {
        items: financingActivities,
        total: financingTotal
      },
      summary: {
        operatingCashFlow: operatingTotal,
        investingCashFlow: investingTotal,
        financingCashFlow: financingTotal,
        netCashFlow: netCashChange,
        freeCashFlow: operatingTotal + investingTotal, // Operating minus CapEx
        cashFlowMargin: operatingSummary.rentCollected > 0
          ? Math.round((operatingTotal / operatingSummary.rentCollected) * 1000) / 10
          : 0
      }
    });

  } catch (error: any) {
    console.error('GET /api/reports/cash-flow error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate Cash Flow Statement' },
      { status: 500 }
    );
  }
}
