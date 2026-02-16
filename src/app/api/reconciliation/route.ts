import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';
import { Decimal } from '@prisma/client/runtime/library';
import { parseCSV, parseDateString } from '@/lib/csv-parser';

// GET /api/reconciliation - List reconciliations
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bankAccountId = searchParams.get('bankAccountId');
    const status = searchParams.get('status');

    const where: any = {};
    if (bankAccountId) where.bankAccountId = bankAccountId;
    if (status) where.status = status;

    const reconciliations = await prisma.reconciliation.findMany({
      where,
      include: {
        bankAccount: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reconciliations);
  } catch (error: any) {
    console.error('GET /api/reconciliation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reconciliations' },
      { status: 500 }
    );
  }
}

// POST /api/reconciliation - Create new reconciliation with CSV upload
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bankAccountId = formData.get('bankAccountId') as string;
    const startDateStr = formData.get('startDate') as string;
    const endDateStr = formData.get('endDate') as string;
    const statementBalanceStr = formData.get('statementBalance') as string;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: 'CSV file is required' },
        { status: 400 }
      );
    }

    if (!bankAccountId) {
      return NextResponse.json(
        { error: 'bankAccountId is required' },
        { status: 400 }
      );
    }

    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    if (!statementBalanceStr) {
      return NextResponse.json(
        { error: 'statementBalance is required' },
        { status: 400 }
      );
    }

    // Validate bank account exists
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      );
    }

    // Parse dates
    const startDate = parseDateString(startDateStr);
    const endDate = parseDateString(endDateStr);

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Invalid date format for startDate or endDate' },
        { status: 400 }
      );
    }

    const statementBalance = parseFloat(statementBalanceStr);
    if (isNaN(statementBalance)) {
      return NextResponse.json(
        { error: 'statementBalance must be a valid number' },
        { status: 400 }
      );
    }

    // Parse CSV file
    const csvText = await file.text();
    const parsedLines = parseCSV(csvText);

    // Create reconciliation and lines in a transaction
    const reconciliation = await prisma.$transaction(async (tx) => {
      // Create the reconciliation record
      const recon = await tx.reconciliation.create({
        data: {
          bankAccountId,
          startDate,
          endDate,
          statementBalance: new Decimal(statementBalance),
          csvFileName: file.name,
          status: 'IN_PROGRESS',
        },
      });

      // Create reconciliation lines from CSV rows
      for (const line of parsedLines) {
        const lineDate = parseDateString(line.date);
        if (!lineDate) continue;

        await tx.reconciliationLine.create({
          data: {
            reconciliationId: recon.id,
            lineDate,
            description: line.description,
            amount: new Decimal(line.amount),
            reference: line.reference || null,
            status: 'UNMATCHED',
          },
        });
      }

      // Run auto-matching algorithm
      // Step 1: Fetch all POSTED ledger entries for the bank account's accountCode within date range
      const ledgerEntries = await tx.ledgerEntry.findMany({
        where: {
          accountCode: bankAccount.accountCode,
          status: 'POSTED',
          entryDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Step 2: Convert to signed amounts (DR = positive, CR = negative for asset account 1000)
      const ledgerWithSigned = ledgerEntries.map((entry) => ({
        ...entry,
        signedAmount: entry.debitCredit === 'DR'
          ? Number(entry.amount)
          : -Number(entry.amount),
      }));

      // Track which ledger entries have been matched (one-to-one matching)
      const usedLedgerIds = new Set<string>();

      // Fetch the created lines
      const reconLines = await tx.reconciliationLine.findMany({
        where: { reconciliationId: recon.id },
        orderBy: { lineDate: 'asc' },
      });

      // Pass 1: Exact amount match within +/- 3 days
      for (const line of reconLines) {
        if (line.status === 'MATCHED') continue;

        const lineAmount = Number(line.amount);
        const lineDate = new Date(line.lineDate);
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

        const match = ledgerWithSigned.find((entry) => {
          if (usedLedgerIds.has(entry.id)) return false;
          if (Math.abs(entry.signedAmount - lineAmount) > 0.005) return false;
          const entryDate = new Date(entry.entryDate);
          return Math.abs(entryDate.getTime() - lineDate.getTime()) <= threeDaysMs;
        });

        if (match) {
          usedLedgerIds.add(match.id);
          await tx.reconciliationLine.update({
            where: { id: line.id },
            data: {
              status: 'MATCHED',
              ledgerEntryId: match.id,
              matchedAt: new Date(),
              matchConfidence: 'auto',
            },
          });
        }
      }

      // Pass 2: Exact amount match anywhere in the period (for remaining unmatched)
      const remainingLines = await tx.reconciliationLine.findMany({
        where: {
          reconciliationId: recon.id,
          status: 'UNMATCHED',
        },
      });

      for (const line of remainingLines) {
        const lineAmount = Number(line.amount);

        const match = ledgerWithSigned.find((entry) => {
          if (usedLedgerIds.has(entry.id)) return false;
          return Math.abs(entry.signedAmount - lineAmount) <= 0.005;
        });

        if (match) {
          usedLedgerIds.add(match.id);
          await tx.reconciliationLine.update({
            where: { id: line.id },
            data: {
              status: 'MATCHED',
              ledgerEntryId: match.id,
              matchedAt: new Date(),
              matchConfidence: 'auto',
            },
          });
        }
      }

      // Fetch final state of lines for summary
      const finalLines = await tx.reconciliationLine.findMany({
        where: { reconciliationId: recon.id },
      });

      const summary = {
        totalLines: finalLines.length,
        matched: finalLines.filter((l) => l.status === 'MATCHED').length,
        unmatched: finalLines.filter((l) => l.status === 'UNMATCHED').length,
        excluded: finalLines.filter((l) => l.status === 'EXCLUDED').length,
      };

      // Return reconciliation with bankAccount included
      const reconWithRelations = await tx.reconciliation.findUnique({
        where: { id: recon.id },
        include: { bankAccount: true },
      });

      return { reconciliation: reconWithRelations, summary };
    });

    return NextResponse.json(reconciliation, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/reconciliation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create reconciliation' },
      { status: 500 }
    );
  }
}
