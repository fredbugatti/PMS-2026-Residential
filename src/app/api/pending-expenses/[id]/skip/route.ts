import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// POST /api/pending-expenses/[id]/skip - Skip this expense (service not performed)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the pending expense
    const pendingExpense = await prisma.pendingExpense.findUnique({
      where: { id }
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

    // Update the pending expense status to skipped
    await prisma.pendingExpense.update({
      where: { id },
      data: {
        status: 'SKIPPED',
        confirmedAt: new Date(),
        confirmedBy: 'user',
        notes: pendingExpense.notes
          ? `${pendingExpense.notes}\nSkipped by user`
          : 'Skipped by user'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Expense skipped - no ledger entry created'
    });

  } catch (error: any) {
    console.error('POST /api/pending-expenses/[id]/skip error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to skip expense' },
      { status: 500 }
    );
  }
}
