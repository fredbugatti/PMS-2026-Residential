import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/reconciliation/[id] - Get reconciliation detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const reconciliation = await prisma.reconciliation.findUnique({
      where: { id },
      include: {
        bankAccount: true,
        lines: {
          orderBy: { lineDate: 'asc' },
        },
      },
    });

    if (!reconciliation) {
      return NextResponse.json(
        { error: 'Reconciliation not found' },
        { status: 404 }
      );
    }

    // Fetch unmatched ledger entries: POSTED entries for the accountCode
    // within the date range that are NOT referenced by any line in this reconciliation
    const matchedLedgerEntryIds = reconciliation.lines
      .filter((line) => line.ledgerEntryId)
      .map((line) => line.ledgerEntryId as string);

    const unmatchedLedgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        accountCode: reconciliation.bankAccount.accountCode,
        status: 'POSTED',
        entryDate: {
          gte: reconciliation.startDate,
          lte: reconciliation.endDate,
        },
        ...(matchedLedgerEntryIds.length > 0
          ? { id: { notIn: matchedLedgerEntryIds } }
          : {}),
      },
      orderBy: { entryDate: 'asc' },
    });

    // Calculate summary
    const summary = {
      totalLines: reconciliation.lines.length,
      matched: reconciliation.lines.filter((l) => l.status === 'MATCHED').length,
      unmatched: reconciliation.lines.filter((l) => l.status === 'UNMATCHED').length,
      excluded: reconciliation.lines.filter((l) => l.status === 'EXCLUDED').length,
    };

    return NextResponse.json({
      reconciliation,
      unmatchedLedgerEntries,
      summary,
    });
  } catch (error: any) {
    console.error('GET /api/reconciliation/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reconciliation' },
      { status: 500 }
    );
  }
}
