import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/reports/trial-balance - Trial Balance as of a given date
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

    // Get all posted entries up to date
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

    // Aggregate debits and credits per account
    const accountTotals: Record<string, { totalDR: number; totalCR: number }> = {};
    for (const entry of entries) {
      if (!accountTotals[entry.accountCode]) {
        accountTotals[entry.accountCode] = { totalDR: 0, totalCR: 0 };
      }
      if (entry.debitCredit === 'DR') {
        accountTotals[entry.accountCode].totalDR += Number(entry.amount);
      } else {
        accountTotals[entry.accountCode].totalCR += Number(entry.amount);
      }
    }

    // Build trial balance rows - include accounts with activity
    const rows = allAccounts
      .map(account => {
        const totals = accountTotals[account.code] || { totalDR: 0, totalCR: 0 };
        const netDR = totals.totalDR - totals.totalCR;
        return {
          code: account.code,
          name: account.name,
          type: account.type,
          normalBalance: account.normalBalance,
          totalDebits: Math.round(totals.totalDR * 100) / 100,
          totalCredits: Math.round(totals.totalCR * 100) / 100,
          // Show net balance in the appropriate column
          debitBalance: netDR > 0 ? Math.round(netDR * 100) / 100 : 0,
          creditBalance: netDR < 0 ? Math.round(Math.abs(netDR) * 100) / 100 : 0
        };
      })
      .filter(row => row.totalDebits > 0 || row.totalCredits > 0);

    // Group by account type
    const grouped = {
      ASSET: rows.filter(r => r.type === 'ASSET'),
      LIABILITY: rows.filter(r => r.type === 'LIABILITY'),
      EQUITY: rows.filter(r => r.type === 'EQUITY'),
      INCOME: rows.filter(r => r.type === 'INCOME'),
      EXPENSE: rows.filter(r => r.type === 'EXPENSE')
    };

    // Compute totals
    const totalDebits = rows.reduce((s, r) => s + r.debitBalance, 0);
    const totalCredits = rows.reduce((s, r) => s + r.creditBalance, 0);

    return NextResponse.json({
      asOfDate: endDate.toISOString().split('T')[0],
      accounts: rows,
      grouped,
      totals: {
        totalDebits: Math.round(totalDebits * 100) / 100,
        totalCredits: Math.round(totalCredits * 100) / 100,
        difference: Math.round((totalDebits - totalCredits) * 100) / 100,
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
      }
    });

  } catch (error: any) {
    console.error('GET /api/reports/trial-balance error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate trial balance' },
      { status: 500 }
    );
  }
}
