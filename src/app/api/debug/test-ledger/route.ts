import { NextResponse } from 'next/server';
import { prisma, postEntry } from '@/lib/accounting';

// GET /api/debug/test-ledger - Test ledger posting
export async function GET() {
  try {
    // Check if accounts exist
    const accounts = await prisma.chartOfAccounts.findMany({
      where: {
        code: { in: ['1000', '1200'] }
      }
    });

    // Get a test lease
    const testLease = await prisma.lease.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true, tenantName: true }
    });

    // Get recent ledger entries
    const recentEntries = await prisma.ledgerEntry.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        accountCode: true,
        amount: true,
        debitCredit: true,
        description: true,
        leaseId: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      accounts: accounts.map(a => ({ code: a.code, name: a.name, active: a.active })),
      testLease,
      recentEntries,
      accountsExist: {
        '1000': accounts.some(a => a.code === '1000'),
        '1200': accounts.some(a => a.code === '1200')
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/debug/test-ledger - Test posting an entry
export async function POST() {
  try {
    const testLease = await prisma.lease.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true, tenantName: true }
    });

    if (!testLease) {
      return NextResponse.json({ error: 'No active lease found' }, { status: 400 });
    }

    // Try posting a test entry
    const entry = await postEntry({
      entryDate: new Date(),
      accountCode: '1200',
      amount: 0.01, // 1 cent test
      debitCredit: 'CR',
      description: `Test payment ${Date.now()}`,
      leaseId: testLease.id,
      postedBy: 'debug_test'
    });

    return NextResponse.json({
      success: true,
      entry
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
