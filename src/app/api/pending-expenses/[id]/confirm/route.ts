import { NextRequest, NextResponse } from 'next/server';
import { prisma, withLedgerTransaction } from '@/lib/accounting';

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

    const expenseAmount = Number(pendingExpense.amount);
    const entryDate = new Date();

    // Post all entries and updates in a single transaction
    const entries = await withLedgerTransaction(async (tx, postEntry) => {
      // Post the expense entry: DR Expense Account
      const expenseEntry = await postEntry({
        accountCode: pendingExpense.accountCode,
        amount: expenseAmount,
        debitCredit: 'DR',
        description: pendingExpense.description,
        entryDate,
        postedBy: 'user-confirmed'
      });

      // Post the credit side: CR Cash
      const cashEntry = await postEntry({
        accountCode: '1000',
        amount: expenseAmount,
        debitCredit: 'CR',
        description: pendingExpense.description,
        entryDate,
        postedBy: 'user-confirmed'
      });

      // Update the pending expense status
      await tx.pendingExpense.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: entryDate,
          confirmedBy: 'user'
        }
      });

      // Update the scheduled expense's last posted date
      if (pendingExpense.scheduledExpenseId) {
        await tx.scheduledExpense.update({
          where: { id: pendingExpense.scheduledExpenseId },
          data: {
            lastPostedDate: entryDate
          }
        });
      }

      return { expense: expenseEntry, cash: cashEntry };
    });

    return NextResponse.json({
      success: true,
      message: 'Expense confirmed and posted to ledger',
      entries
    });

  } catch (error: any) {
    console.error('POST /api/pending-expenses/[id]/confirm error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm expense' },
      { status: 500 }
    );
  }
}
