import { NextRequest, NextResponse } from 'next/server';
import { postEntry } from '@/lib/accounting';

// POST /api/charges - Record a charge (posts 2 entries: DR AR, CR Income)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, leaseId, description, chargeDate, chargeType } = body;

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

    const entryDate = chargeDate ? new Date(chargeDate) : new Date();

    // Build description based on charge type
    let finalDescription = description;
    if (!finalDescription) {
      switch (chargeType) {
        case 'rent':
          finalDescription = 'Monthly rent charge';
          break;
        case 'late_fee':
          finalDescription = 'Late fee';
          break;
        case 'utility':
          finalDescription = 'Utility charge';
          break;
        case 'other':
          finalDescription = 'Charge';
          break;
        default:
          finalDescription = 'Charge';
      }
    }

    // Post entry 1: DR Accounts Receivable (increase what tenant owes)
    const arEntry = await postEntry({
      accountCode: '1200',
      amount: parseFloat(amount),
      debitCredit: 'DR',
      description: finalDescription,
      entryDate,
      leaseId,
      postedBy: 'user'
    });

    // Post entry 2: CR Rental Income (record revenue)
    const incomeEntry = await postEntry({
      accountCode: '4000',
      amount: parseFloat(amount),
      debitCredit: 'CR',
      description: finalDescription,
      entryDate,
      leaseId,
      postedBy: 'user'
    });

    return NextResponse.json({
      success: true,
      message: `Charge of $${amount} posted successfully`,
      entries: [arEntry, incomeEntry]
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/charges error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to post charge' },
      { status: 400 }
    );
  }
}
