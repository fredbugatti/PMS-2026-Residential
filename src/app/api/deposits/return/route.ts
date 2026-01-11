import { NextRequest, NextResponse } from 'next/server';
import { prisma, postEntry } from '@/lib/accounting';

// POST /api/deposits/return - Return deposit (DR Deposits Held / CR Cash)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, leaseId, description, returnDate, deductions } = body;

    // Validate required fields
    if (!amount || !leaseId) {
      return NextResponse.json(
        { error: 'Amount and leaseId are required' },
        { status: 400 }
      );
    }

    // Parse and validate return date
    const entryDate = returnDate ? new Date(returnDate) : new Date();

    // Get lease info
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

    const finalDescription = description || `Security deposit returned - ${lease.tenantName} (${lease.unitName})`;

    // Post DR Deposits Held entry (2100) - Release liability
    const depositEntry = await postEntry({
      accountCode: '2100',
      amount: parseFloat(amount),
      debitCredit: 'DR',
      description: finalDescription,
      entryDate: entryDate,
      leaseId: leaseId,
      postedBy: 'user'
    });

    // Post CR Cash entry (1000) - Cash out
    const cashEntry = await postEntry({
      accountCode: '1000',
      amount: parseFloat(amount),
      debitCredit: 'CR',
      description: finalDescription,
      entryDate: entryDate,
      leaseId: leaseId,
      postedBy: 'user'
    });

    // If there are deductions, post them as expenses
    const deductionEntries = [];
    if (deductions && Array.isArray(deductions) && deductions.length > 0) {
      for (const deduction of deductions) {
        if (deduction.amount && deduction.amount > 0) {
          // DR Expense (5000)
          const expenseEntry = await postEntry({
            accountCode: '5000',
            amount: parseFloat(deduction.amount),
            debitCredit: 'DR',
            description: `Deposit deduction: ${deduction.description || 'Expense'}`,
            entryDate: entryDate,
            leaseId: leaseId,
            postedBy: 'user'
          });

          // DR Deposits Held (2100) - Reduce liability
          const depositDeductionEntry = await postEntry({
            accountCode: '2100',
            amount: parseFloat(deduction.amount),
            debitCredit: 'DR',
            description: `Deposit deduction: ${deduction.description || 'Expense'}`,
            entryDate: entryDate,
            leaseId: leaseId,
            postedBy: 'user'
          });

          deductionEntries.push(expenseEntry, depositDeductionEntry);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Deposit of ${amount} returned${deductions?.length ? ` with ${deductions.length} deductions` : ''}`,
      entries: [depositEntry, cashEntry, ...deductionEntries]
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/deposits/return error:', error);

    // Handle idempotency errors
    if (error.message?.includes('Unique constraint') || error.message?.includes('Duplicate')) {
      return NextResponse.json(
        { error: 'This deposit return has already been recorded' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to record deposit return' },
      { status: 500 }
    );
  }
}
