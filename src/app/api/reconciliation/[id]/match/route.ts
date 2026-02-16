import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// POST /api/reconciliation/[id]/match - Match or unmatch a reconciliation line
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { lineId, ledgerEntryId, action } = body;

    if (!lineId) {
      return NextResponse.json(
        { error: 'lineId is required' },
        { status: 400 }
      );
    }

    if (!action || (action !== 'match' && action !== 'unmatch')) {
      return NextResponse.json(
        { error: 'action must be "match" or "unmatch"' },
        { status: 400 }
      );
    }

    if (action === 'match' && !ledgerEntryId) {
      return NextResponse.json(
        { error: 'ledgerEntryId is required for match action' },
        { status: 400 }
      );
    }

    // Verify reconciliation exists and is IN_PROGRESS
    const reconciliation = await prisma.reconciliation.findUnique({
      where: { id },
    });

    if (!reconciliation) {
      return NextResponse.json(
        { error: 'Reconciliation not found' },
        { status: 404 }
      );
    }

    if (reconciliation.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Cannot modify a finalized reconciliation' },
        { status: 400 }
      );
    }

    // Verify the line belongs to this reconciliation
    const line = await prisma.reconciliationLine.findUnique({
      where: { id: lineId },
    });

    if (!line) {
      return NextResponse.json(
        { error: 'Reconciliation line not found' },
        { status: 404 }
      );
    }

    if (line.reconciliationId !== id) {
      return NextResponse.json(
        { error: 'Line does not belong to this reconciliation' },
        { status: 400 }
      );
    }

    let updatedLine;

    if (action === 'match') {
      updatedLine = await prisma.reconciliationLine.update({
        where: { id: lineId },
        data: {
          status: 'MATCHED',
          ledgerEntryId,
          matchedAt: new Date(),
          matchConfidence: 'manual',
        },
      });
    } else {
      // unmatch
      updatedLine = await prisma.reconciliationLine.update({
        where: { id: lineId },
        data: {
          status: 'UNMATCHED',
          ledgerEntryId: null,
          matchedAt: null,
          matchConfidence: null,
        },
      });
    }

    return NextResponse.json(updatedLine);
  } catch (error: any) {
    console.error('POST /api/reconciliation/[id]/match error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update match' },
      { status: 500 }
    );
  }
}
