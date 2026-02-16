import { NextRequest, NextResponse } from 'next/server';
import { prisma, withLedgerTransaction } from '@/lib/accounting';
import { validate, recordReconciliationEntrySchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-utils';

// POST /api/reconciliation/[id]/record-entry - Record a payment or expense and auto-match
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = validate(recordReconciliationEntrySchema, body);

    const { type, lineId, amount, description, entryDate, leaseId, accountCode, vendorId, newVendor } = validated;

    // Type-specific validation
    if (type === 'payment' && !leaseId) {
      return NextResponse.json(
        { error: 'leaseId is required for payment entries' },
        { status: 400 }
      );
    }
    if (type === 'expense' && !accountCode) {
      return NextResponse.json(
        { error: 'accountCode is required for expense entries' },
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

    // Verify line belongs to this reconciliation and is UNMATCHED
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

    if (line.status !== 'UNMATCHED') {
      return NextResponse.json(
        { error: 'Line is not in UNMATCHED status' },
        { status: 400 }
      );
    }

    const parsedDate = new Date(entryDate);

    // Use withLedgerTransaction for atomic ledger + reconciliation update
    const result = await withLedgerTransaction(async (tx, postEntry) => {
      // Create vendor if requested (inside same transaction)
      let resolvedVendorId = vendorId || null;
      let createdVendor = null;

      if (newVendor) {
        createdVendor = await tx.vendor.create({
          data: {
            name: newVendor.name,
            company: newVendor.company || null,
            email: newVendor.email || null,
            phone: newVendor.phone || null,
            specialties: newVendor.specialties || [],
            paymentTerms: newVendor.paymentTerms || null,
            active: true,
          },
        });
        resolvedVendorId = createdVendor.id;
      }

      let cashEntry;

      if (type === 'payment') {
        // DR 1000 (Cash) / CR 1200 (A/R) — same as POST /api/payments
        cashEntry = await postEntry({
          accountCode: '1000',
          amount,
          debitCredit: 'DR',
          description,
          entryDate: parsedDate,
          leaseId,
          postedBy: 'user',
        });
        await postEntry({
          accountCode: '1200',
          amount,
          debitCredit: 'CR',
          description,
          entryDate: parsedDate,
          leaseId,
          postedBy: 'user',
        });
      } else {
        // DR 5xxx (Expense) / CR 1000 (Cash) — same as POST /api/expenses
        await postEntry({
          accountCode: accountCode!,
          amount,
          debitCredit: 'DR',
          description,
          entryDate: parsedDate,
          postedBy: 'user',
        });
        cashEntry = await postEntry({
          accountCode: '1000',
          amount,
          debitCredit: 'CR',
          description,
          entryDate: parsedDate,
          postedBy: 'user',
        });
      }

      // Update reconciliation line to MATCHED, linking to the Cash (1000) entry
      const updatedLine = await tx.reconciliationLine.update({
        where: { id: lineId },
        data: {
          status: 'MATCHED',
          ledgerEntryId: cashEntry.id,
          matchedAt: new Date(),
          matchConfidence: 'manual',
        },
      });

      return { cashEntry, updatedLine, createdVendor };
    });

    return NextResponse.json({
      success: true,
      message: type === 'payment' ? 'Payment recorded and matched' : 'Expense recorded and matched',
      line: result.updatedLine,
      vendor: result.createdVendor,
    }, { status: 201 });

  } catch (error) {
    return handleApiError(error, 'POST /api/reconciliation/[id]/record-entry');
  }
}
