import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/reports/trial-balance - Get Trial Balance report
// Verifies that total debits equal total credits across all accounts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get('asOfDate');
    const propertyId = searchParams.get('propertyId');

    // Default to today if no date provided
    const asOf = asOfDate ? new Date(asOfDate) : new Date();
    asOf.setHours(23, 59, 59, 999); // Include full day

    // Build base where clause for date range (all entries up to asOfDate)
    const dateFilter = {
      entryDate: {
        lte: asOf
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

    // Get all active accounts
    const allAccounts = await prisma.chartOfAccounts.findMany({
      where: { active: true },
      orderBy: { code: 'asc' }
    });

    // Get all ledger entries up to the asOfDate
    const allEntries = await prisma.ledgerEntry.findMany({
      where: {
        ...dateFilter,
        ...leaseFilter
      },
      select: {
        accountCode: true,
        amount: true,
        debitCredit: true
      }
    });

    // Calculate balance for each account
    const accountBalances: { [key: string]: { debits: number; credits: number } } = {};

    for (const entry of allEntries) {
      if (!accountBalances[entry.accountCode]) {
        accountBalances[entry.accountCode] = { debits: 0, credits: 0 };
      }

      const amount = Number(entry.amount);
      if (entry.debitCredit === 'DR') {
        accountBalances[entry.accountCode].debits += amount;
      } else {
        accountBalances[entry.accountCode].credits += amount;
      }
    }

    // Build trial balance entries
    let totalDebits = 0;
    let totalCredits = 0;

    const trialBalanceEntries = allAccounts.map(account => {
      const balance = accountBalances[account.code] || { debits: 0, credits: 0 };

      // Calculate net balance based on account's normal balance
      // Assets (DR normal) and Expenses (DR normal): debit balance = debits - credits
      // Liabilities (CR normal), Income (CR normal), Equity (CR normal): credit balance = credits - debits
      let debitBalance = 0;
      let creditBalance = 0;

      const netAmount = balance.debits - balance.credits;

      if (account.normalBalance === 'DR') {
        // Debit-normal accounts (Assets, Expenses)
        if (netAmount >= 0) {
          debitBalance = netAmount;
        } else {
          creditBalance = Math.abs(netAmount);
        }
      } else {
        // Credit-normal accounts (Liabilities, Income, Equity)
        if (netAmount <= 0) {
          creditBalance = Math.abs(netAmount);
        } else {
          debitBalance = netAmount;
        }
      }

      totalDebits += debitBalance;
      totalCredits += creditBalance;

      return {
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
        debitBalance: Math.round(debitBalance * 100) / 100,
        creditBalance: Math.round(creditBalance * 100) / 100,
        totalDebits: Math.round(balance.debits * 100) / 100,
        totalCredits: Math.round(balance.credits * 100) / 100
      };
    }).filter(entry => entry.debitBalance > 0 || entry.creditBalance > 0);

    // Round totals
    totalDebits = Math.round(totalDebits * 100) / 100;
    totalCredits = Math.round(totalCredits * 100) / 100;

    // Calculate difference (should be 0 for a balanced trial balance)
    const difference = Math.round((totalDebits - totalCredits) * 100) / 100;
    const isBalanced = Math.abs(difference) < 0.01; // Allow for minor floating point errors

    // Group by account type for better organization
    const byType = {
      ASSET: trialBalanceEntries.filter(e => e.type === 'ASSET'),
      LIABILITY: trialBalanceEntries.filter(e => e.type === 'LIABILITY'),
      EQUITY: trialBalanceEntries.filter(e => e.type === 'EQUITY'),
      INCOME: trialBalanceEntries.filter(e => e.type === 'INCOME'),
      EXPENSE: trialBalanceEntries.filter(e => e.type === 'EXPENSE')
    };

    return NextResponse.json({
      asOfDate: asOf.toISOString().split('T')[0],
      summary: {
        totalDebits,
        totalCredits,
        difference,
        isBalanced,
        totalAccounts: trialBalanceEntries.length,
        totalTransactions: allEntries.length
      },
      entries: trialBalanceEntries,
      byType,
      metadata: {
        generatedAt: new Date().toISOString(),
        propertyFilter: propertyId || null
      }
    });

  } catch (error: any) {
    console.error('GET /api/reports/trial-balance error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate trial balance report' },
      { status: 500 }
    );
  }
}
