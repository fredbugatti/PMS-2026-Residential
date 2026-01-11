import { NextRequest, NextResponse } from 'next/server';
import { postEntry } from '@/lib/accounting';

// POST /api/payments - Record a payment (posts 2 entries: DR Cash, CR AR)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, leaseId, description, paymentDate } = body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than zero' },
        { status: 400 }
      );
    }

    if (!leaseId) {
      return NextResponse.json(
        { error: 'Lease ID is required' },
        { status: 400 }
      );
    }

    const entryDate = paymentDate ? new Date(paymentDate) : new Date();
    const finalDescription = description || 'Payment received';

    // Post entry 1: DR Cash (increase cash)
    const cashEntry = await postEntry({
      accountCode: '1000',
      amount: parseFloat(amount),
      debitCredit: 'DR',
      description: finalDescription,
      entryDate,
      leaseId,
      postedBy: 'user'
    });

    // Post entry 2: CR Accounts Receivable (reduce what tenant owes)
    const arEntry = await postEntry({
      accountCode: '1200',
      amount: parseFloat(amount),
      debitCredit: 'CR',
      description: finalDescription,
      entryDate,
      leaseId,
      postedBy: 'user'
    });

    return NextResponse.json({
      success: true,
      message: `Payment of $${amount} recorded successfully`,
      entries: [cashEntry, arEntry]
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/payments error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record payment' },
      { status: 400 }
    );
  }
}
