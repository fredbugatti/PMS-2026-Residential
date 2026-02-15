import { NextRequest, NextResponse } from 'next/server';
import { prisma, postDoubleEntry } from '@/lib/accounting';

// POST /api/leases/[id]/charge-rent - Charge monthly rent
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { manual = false, chargeDate } = body;

    // Get lease details with rent scheduled charge
    const lease = await prisma.lease.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        tenantName: true,
        autoChargeEnabled: true,
        chargeDay: true,
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

    // Get rent from scheduled charge
    const rentCharge = lease.scheduledCharges[0];
    if (!rentCharge || Number(rentCharge.amount) <= 0) {
      return NextResponse.json(
        { error: 'Lease does not have an active rent scheduled charge' },
        { status: 400 }
      );
    }
    const monthlyRentAmount = Number(rentCharge.amount);

    // Determine the charge date
    const today = new Date();
    const targetDate = chargeDate ? new Date(chargeDate) : today;
    const chargeMonth = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Check if already charged for this month
    if (lease.lastChargedDate) {
      const lastCharged = new Date(lease.lastChargedDate);
      const lastChargedMonth = lastCharged.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (lastChargedMonth === chargeMonth && !manual) {
        return NextResponse.json(
          { error: `Rent already charged for ${chargeMonth}` },
          { status: 400 }
        );
      }
    }

    // Generate idempotency key
    const idempotencyKey = `rent-charge-${lease.id}-${targetDate.getFullYear()}-${targetDate.getMonth() + 1}`;

    // Check if this charge already exists
    const existingEntry = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey }
    });

    if (existingEntry && existingEntry.status !== 'VOID') {
      return NextResponse.json(
        { error: `Rent charge for ${chargeMonth} already exists` },
        { status: 400 }
      );
    }

    // Create the rent charge ledger entries (atomic double-entry)
    const description = `Rent charge for ${chargeMonth} - ${lease.tenantName}`;

    await postDoubleEntry({
      debitEntry: {
        entryDate: targetDate,
        accountCode: '1200', // AR
        amount: monthlyRentAmount,
        debitCredit: 'DR',
        description,
        postedBy: manual ? 'manual' : 'system',
        leaseId: lease.id
      },
      creditEntry: {
        entryDate: targetDate,
        accountCode: '4000', // Lease Income
        amount: monthlyRentAmount,
        debitCredit: 'CR',
        description,
        postedBy: manual ? 'manual' : 'system',
        leaseId: lease.id
      }
    });

    // Update last charged date
    await prisma.lease.update({
      where: { id: lease.id },
      data: { lastChargedDate: targetDate }
    });

    return NextResponse.json({
      success: true,
      message: `Rent charged successfully for ${chargeMonth}`,
      amount: monthlyRentAmount,
      chargeDate: targetDate,
      idempotencyKey
    });

  } catch (error: any) {
    console.error(`POST /api/leases/${params.id}/charge-rent error:`, error);

    // Check for duplicate key error
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Rent charge already exists for this period' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to charge rent' },
      { status: 500 }
    );
  }
}
