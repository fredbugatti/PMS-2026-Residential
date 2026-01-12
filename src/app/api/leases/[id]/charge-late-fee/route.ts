import { NextRequest, NextResponse } from 'next/server';
import { prisma, postDoubleEntry } from '@/lib/accounting';
import { Decimal } from '@prisma/client/runtime/library';

// POST /api/leases/[id]/charge-late-fee - Charge late fee
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { manual = false, feeDate } = body;

    // Get lease details with rent scheduled charge
    const lease = await prisma.lease.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        tenantName: true,
        gracePeriodDays: true,
        lateFeeAmount: true,
        lateFeeType: true,
        lastChargedDate: true,
        status: true,
        scheduledCharges: {
          where: { accountCode: '4000', active: true }
        }
      }
    });

    if (!lease) {
      return NextResponse.json(
        { error: 'Lease not found' },
        { status: 404 }
      );
    }

    if (lease.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Lease is not active' },
        { status: 400 }
      );
    }

    if (!lease.lateFeeAmount || Number(lease.lateFeeAmount) <= 0) {
      return NextResponse.json(
        { error: 'Lease does not have a late fee configured' },
        { status: 400 }
      );
    }

    if (!lease.lateFeeType) {
      return NextResponse.json(
        { error: 'Lease does not have a late fee type configured' },
        { status: 400 }
      );
    }

    // Calculate late fee amount
    let lateFeeAmount: Decimal;
    if (lease.lateFeeType === 'FLAT') {
      lateFeeAmount = lease.lateFeeAmount;
    } else if (lease.lateFeeType === 'PERCENTAGE') {
      // Get rent from scheduled charge
      const rentCharge = lease.scheduledCharges[0];
      if (!rentCharge) {
        return NextResponse.json(
          { error: 'Cannot calculate percentage late fee without monthly rent scheduled charge' },
          { status: 400 }
        );
      }
      // Calculate percentage of monthly rent
      const percentage = Number(lease.lateFeeAmount);
      const rentAmount = Number(rentCharge.amount);
      lateFeeAmount = new Decimal((rentAmount * percentage) / 100);
    } else {
      return NextResponse.json(
        { error: 'Invalid late fee type' },
        { status: 400 }
      );
    }

    // Determine the fee date
    const today = new Date();
    const targetDate = feeDate ? new Date(feeDate) : today;
    const feeMonth = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Generate idempotency key
    const idempotencyKey = `late-fee-${lease.id}-${targetDate.getFullYear()}-${targetDate.getMonth() + 1}`;

    // Check if this late fee already exists
    const existingEntry = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey }
    });

    if (existingEntry && existingEntry.status !== 'VOID') {
      return NextResponse.json(
        { error: `Late fee for ${feeMonth} already exists` },
        { status: 400 }
      );
    }

    // Check if there's an outstanding balance (rent has been charged but not paid)
    const rentCharges = await prisma.ledgerEntry.findMany({
      where: {
        leaseId: lease.id,
        accountCode: '1200', // Accounts Receivable
        debitCredit: 'DR',
        status: 'POSTED'
      },
      select: {
        amount: true
      }
    });

    const rentPayments = await prisma.ledgerEntry.findMany({
      where: {
        leaseId: lease.id,
        accountCode: '1200', // Accounts Receivable
        debitCredit: 'CR',
        status: 'POSTED'
      },
      select: {
        amount: true
      }
    });

    const totalCharges = rentCharges.reduce((sum, entry) => sum + Number(entry.amount), 0);
    const totalPayments = rentPayments.reduce((sum, entry) => sum + Number(entry.amount), 0);
    const outstandingBalance = totalCharges - totalPayments;

    if (outstandingBalance <= 0 && !manual) {
      return NextResponse.json(
        { error: 'No outstanding balance to charge late fee' },
        { status: 400 }
      );
    }

    // Create the late fee ledger entries (atomic double-entry)
    const description = `Late fee for ${feeMonth} - ${lease.tenantName}`;

    await postDoubleEntry({
      debitEntry: {
        entryDate: targetDate,
        accountCode: '1200', // AR
        amount: Number(lateFeeAmount),
        debitCredit: 'DR',
        description,
        postedBy: manual ? 'manual' : 'system',
        leaseId: lease.id
      },
      creditEntry: {
        entryDate: targetDate,
        accountCode: '4100', // Late Fee Income
        amount: Number(lateFeeAmount),
        debitCredit: 'CR',
        description,
        postedBy: manual ? 'manual' : 'system',
        leaseId: lease.id
      }
    });

    return NextResponse.json({
      success: true,
      message: `Late fee charged successfully for ${feeMonth}`,
      amount: lateFeeAmount,
      feeDate: targetDate,
      idempotencyKey,
      outstandingBalance
    });

  } catch (error: any) {
    console.error(`POST /api/leases/${params.id}/charge-late-fee error:`, error);

    // Check for duplicate key error
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Late fee already exists for this period' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to charge late fee' },
      { status: 500 }
    );
  }
}
