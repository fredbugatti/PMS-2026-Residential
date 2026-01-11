import { NextRequest, NextResponse } from 'next/server';
import { prisma, postEntry } from '@/lib/accounting';

// POST /api/pending-expenses/[id]/confirm - Confirm and post the expense
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the pending expense
    const pendingExpense = await prisma.pendingExpense.findUnique({
      where: { id },
      include: {
        scheduledExpense: true
      }
    });

    if (!pendingExpense) {
      return NextResponse.json(
        { error: 'Pending expense not found' },
        { status: 404 }
      );
    }

    if (pendingExpense.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Expense has already been processed' },
        { status: 400 }
      );
    }

    // Post the expense entry: DR Expense Account
    const expenseEntry = await postEntry({
      accountCode: pendingExpense.accountCode,
      amount: Number(pendingExpense.amount),
      debitCredit: 'DR',
      description: pendingExpense.description,
      entryDate: new Date(),
      postedBy: 'user-confirmed'
    });

    // Post the credit side: CR Cash
    const cashEntry = await postEntry({
      accountCode: '1000',
      amount: Number(pendingExpense.amount),
      debitCredit: 'CR',
      description: pendingExpense.description,
      entryDate: new Date(),
      postedBy: 'user-confirmed'
    });

    // Update the pending expense status
    await prisma.pendingExpense.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        confirmedBy: 'user'
      }
    });

    // Update the scheduled expense's last posted date
    if (pendingExpense.scheduledExpenseId) {
      await prisma.scheduledExpense.update({
        where: { id: pendingExpense.scheduledExpenseId },
        data: {
          lastPostedDate: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Expense confirmed and posted to ledger',
      entries: {
        expense: expenseEntry,
        cash: cashEntry
      }
    });

  } catch (error: any) {
    console.error('POST /api/pending-expenses/[id]/confirm error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm expense' },
      { status: 500 }
    );
  }
}
