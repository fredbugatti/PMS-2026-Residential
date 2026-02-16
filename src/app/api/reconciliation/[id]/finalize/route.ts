import { NextRequest, NextResponse } from 'next/server';
import { prisma, getAccountBalance } from '@/lib/accounting';
import { Decimal } from '@prisma/client/runtime/library';

// POST /api/reconciliation/[id]/finalize - Finalize a reconciliation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { notes } = body;

    // Fetch reconciliation with lines and bank account
    const reconciliation = await prisma.reconciliation.findUnique({
      where: { id },
      include: {
        bankAccount: true,
        lines: true,
      },
    });

    if (!reconciliation) {
      return NextResponse.json(
        { error: 'Reconciliation not found' },
        { status: 404 }
      );
    }

    if (reconciliation.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Reconciliation is already finalized' },
        { status: 400 }
      );
    }

    // Verify all lines are either MATCHED or EXCLUDED (no UNMATCHED allowed)
    const unmatchedLines = reconciliation.lines.filter(
      (line) => line.status === 'UNMATCHED'
    );

    if (unmatchedLines.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot finalize: ${unmatchedLines.length} line(s) are still unmatched. All lines must be matched or excluded.`,
        },
        { status: 400 }
      );
    }

    // Get current account balance
    const balance = await getAccountBalance(reconciliation.bankAccount.accountCode);

    // Update reconciliation to finalized
    const updated = await prisma.reconciliation.update({
      where: { id },
      data: {
        status: 'FINALIZED',
        finalizedAt: new Date(),
        finalizedBy: 'admin',
        ledgerBalance: new Decimal(balance),
        notes: notes || null,
      },
      include: {
        bankAccount: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('POST /api/reconciliation/[id]/finalize error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to finalize reconciliation' },
      { status: 500 }
    );
  }
}
