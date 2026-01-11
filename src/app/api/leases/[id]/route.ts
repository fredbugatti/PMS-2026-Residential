import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';
import { syncUnitStatus } from '@/lib/unitStatus';

// GET /api/leases/[id] - Get single lease with entries
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lease = await prisma.lease.findUnique({
      where: { id },
      include: {
        ledgerEntries: {
          where: { status: 'POSTED' },
          include: {
            account: true
          },
          orderBy: [
            { entryDate: 'desc' },
            { createdAt: 'desc' }
          ]
        },
        scheduledCharges: {
          orderBy: [
            { active: 'desc' },
            { chargeDay: 'asc' }
          ]
        }
      }
    });

    if (!lease) {
      return NextResponse.json(
        { error: 'Lease not found' },
        { status: 404 }
      );
    }

    // Calculate balance (AR entries only)
    let balance = 0;
    for (const entry of lease.ledgerEntries) {
      if (entry.accountCode === '1200') { // AR account
        const amount = Number(entry.amount);
        balance += entry.debitCredit === 'DR' ? amount : -amount;
      }
    }

    // Calculate monthly rent from active rent scheduled charge (account code 4000)
    const rentCharge = lease.scheduledCharges.find(
      c => c.accountCode === '4000' && c.active
    );
    const monthlyRentAmount = rentCharge ? Number(rentCharge.amount) : null;

    return NextResponse.json({
      ...lease,
      balance,
      monthlyRentAmount // Computed from scheduled charge
    });

  } catch (error: any) {
    console.error('GET /api/leases/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch lease' },
      { status: 500 }
    );
  }
}

// PATCH /api/leases/[id] - Update lease
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Get the old lease to check if status changed
    const oldLease = await prisma.lease.findUnique({
      where: { id },
      select: { status: true, unitId: true }
    });

    const lease = await prisma.lease.update({
      where: { id },
      data: {
        ...(body.tenantName && { tenantName: body.tenantName }),
        ...(body.tenantEmail !== undefined && { tenantEmail: body.tenantEmail || null }),
        ...(body.tenantPhone !== undefined && { tenantPhone: body.tenantPhone || null }),
        ...(body.unitName && { unitName: body.unitName }),
        ...(body.propertyName !== undefined && { propertyName: body.propertyName || null }),
        ...(body.startDate && { startDate: new Date(body.startDate) }),
        ...(body.endDate && { endDate: new Date(body.endDate) }),
        ...(body.securityDepositAmount !== undefined && {
          securityDepositAmount: body.securityDepositAmount ? parseFloat(body.securityDepositAmount) : null
        }),
        ...(body.status && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes || null })
      }
    });

    // Automatically sync unit status if status changed and unitId exists
    if (oldLease?.unitId && body.status && body.status !== oldLease.status) {
      try {
        await syncUnitStatus(oldLease.unitId);
      } catch (error) {
        console.error('Failed to sync unit status:', error);
        // Don't fail the lease update if unit sync fails
      }
    }

    return NextResponse.json(lease);

  } catch (error: any) {
    console.error('PATCH /api/leases/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update lease' },
      { status: 400 }
    );
  }
}
