import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// POST /api/reconciliation/[id]/exclude - Exclude or include a reconciliation line
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { lineId, action } = body;

    if (!lineId) {
      return NextResponse.json(
        { error: 'lineId is required' },
        { status: 400 }
      );
    }

    if (!action || (action !== 'exclude' && action !== 'include')) {
      return NextResponse.json(
        { error: 'action must be "exclude" or "include"' },
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

    const updatedLine = await prisma.reconciliationLine.update({
      where: { id: lineId },
      data: {
        status: action === 'exclude' ? 'EXCLUDED' : 'UNMATCHED',
      },
    });

    return NextResponse.json(updatedLine);
  } catch (error: any) {
    console.error('POST /api/reconciliation/[id]/exclude error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update line exclusion' },
      { status: 500 }
    );
  }
}
