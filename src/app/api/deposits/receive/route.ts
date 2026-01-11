import { NextRequest, NextResponse } from 'next/server';
import { prisma, postEntry } from '@/lib/accounting';

// POST /api/deposits/receive - Record deposit received (DR Cash / CR Deposits Held)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, leaseId, description, receiptDate } = body;

    // Validate required fields
    if (!amount || !leaseId) {
      return NextResponse.json(
        { error: 'Amount and leaseId are required' },
        { status: 400 }
      );
    }

    // Parse and validate receipt date
    const entryDate = receiptDate ? new Date(receiptDate) : new Date();

    // Get lease info for description
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      select: { tenantName: true, unitName: true }
    });

    if (!lease) {
      return NextResponse.json(
        { error: 'Lease not found' },
        { status: 404 }
      );
    }

    const finalDescription = description || `Security deposit received - ${lease.tenantName} (${lease.unitName})`;

    // Post DR Cash entry (1000)
    const cashEntry = await postEntry({
      accountCode: '1000',
      amount: parseFloat(amount),
      debitCredit: 'DR',
      description: finalDescription,
      entryDate: entryDate,
      leaseId: leaseId,
      postedBy: 'user'
    });

    // Post CR Deposits Held entry (2100)
    const depositEntry = await postEntry({
      accountCode: '2100',
      amount: parseFloat(amount),
      debitCredit: 'CR',
      description: finalDescription,
      entryDate: entryDate,
      leaseId: leaseId,
      postedBy: 'user'
    });

    return NextResponse.json({
      success: true,
      message: `Deposit of ${amount} received and recorded`,
      entries: [cashEntry, depositEntry]
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/deposits/receive error:', error);

    // Handle idempotency errors
    if (error.message?.includes('Unique constraint') || error.message?.includes('Duplicate')) {
      return NextResponse.json(
        { error: 'This deposit has already been recorded' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to record deposit receipt' },
      { status: 500 }
    );
  }
}
