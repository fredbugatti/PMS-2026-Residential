import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/move-out/[leaseId] - Get move-out inspection for a lease
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const { leaseId } = await params;

    const inspection = await prisma.moveOutInspection.findUnique({
      where: { leaseId },
      include: {
        items: {
          orderBy: { area: 'asc' }
        },
        deductions: {
          orderBy: { createdAt: 'asc' }
        },
        lease: {
          select: {
            tenantName: true,
            tenantEmail: true,
            propertyName: true,
            unitName: true,
            startDate: true,
            endDate: true,
            securityDepositAmount: true
          }
        }
      }
    });

    if (!inspection) {
      return NextResponse.json(
        { error: 'Move-out inspection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(inspection);
  } catch (error: any) {
    console.error('GET /api/move-out/[leaseId] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get move-out inspection' },
      { status: 500 }
    );
  }
}

// POST /api/move-out/[leaseId] - Create or start move-out inspection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const { leaseId } = await params;
    const body = await request.json();

    // Get lease details
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      select: {
        id: true,
        tenantName: true,
        securityDepositAmount: true,
        moveOutInspection: true
      }
    });

    if (!lease) {
      return NextResponse.json(
        { error: 'Lease not found' },
        { status: 404 }
      );
    }

    // Check if inspection already exists
    if (lease.moveOutInspection) {
      return NextResponse.json(
        { error: 'Move-out inspection already exists for this lease' },
        { status: 400 }
      );
    }

    // Get deposit held from ledger (account 2100 - Security Deposits)
    const depositEntries = await prisma.ledgerEntry.findMany({
      where: {
        leaseId,
        accountCode: '2100',
        status: 'POSTED' as const
      }
    });

    const depositHeld = depositEntries.reduce((sum, e) => {
      const amt = Number(e.amount);
      // Credits increase liability (deposit received), debits decrease (deposit returned)
      return e.debitCredit === 'CR' ? sum + amt : sum - amt;
    }, 0);

    // Create inspection
    const inspection = await prisma.moveOutInspection.create({
      data: {
        leaseId,
        inspectionDate: body.inspectionDate ? new Date(body.inspectionDate) : new Date(),
        inspectedBy: body.inspectedBy || 'Property Manager',
        tenantPresent: body.tenantPresent || false,
        overallCondition: body.overallCondition || 'GOOD',
        forwardingAddress: body.forwardingAddress,
        depositHeld: depositHeld > 0 ? depositHeld : Number(lease.securityDepositAmount || 0),
        totalDeductions: 0,
        amountToReturn: depositHeld > 0 ? depositHeld : Number(lease.securityDepositAmount || 0),
        status: 'IN_PROGRESS'
      },
      include: {
        items: true,
        deductions: true
      }
    });

    return NextResponse.json(inspection, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/move-out/[leaseId] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create move-out inspection' },
      { status: 500 }
    );
  }
}

// PATCH /api/move-out/[leaseId] - Update move-out inspection
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const { leaseId } = await params;
    const body = await request.json();

    const existing = await prisma.moveOutInspection.findUnique({
      where: { leaseId }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Move-out inspection not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};

    if (body.inspectionDate !== undefined) {
      updateData.inspectionDate = new Date(body.inspectionDate);
    }
    if (body.inspectedBy !== undefined) {
      updateData.inspectedBy = body.inspectedBy;
    }
    if (body.tenantPresent !== undefined) {
      updateData.tenantPresent = body.tenantPresent;
    }
    if (body.overallCondition !== undefined) {
      updateData.overallCondition = body.overallCondition;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }
    if (body.forwardingAddress !== undefined) {
      updateData.forwardingAddress = body.forwardingAddress;
    }
    if (body.status !== undefined) {
      updateData.status = body.status;

      // Track approval
      if (body.status === 'APPROVED' && existing.status !== 'APPROVED') {
        updateData.approvedAt = new Date();
        updateData.approvedBy = body.approvedBy || 'user';
      }

      // Track letter sent
      if (body.status === 'LETTER_SENT' && existing.status !== 'LETTER_SENT') {
        updateData.letterSentAt = new Date();
        updateData.letterSentMethod = body.letterSentMethod || 'EMAIL';
      }

      // Track completion
      if (body.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
        updateData.completedAt = new Date();
      }
    }

    const inspection = await prisma.moveOutInspection.update({
      where: { leaseId },
      data: updateData,
      include: {
        items: true,
        deductions: true,
        lease: {
          select: {
            tenantName: true,
            propertyName: true,
            unitName: true
          }
        }
      }
    });

    return NextResponse.json(inspection);
  } catch (error: any) {
    console.error('PATCH /api/move-out/[leaseId] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update move-out inspection' },
      { status: 500 }
    );
  }
}

// DELETE /api/move-out/[leaseId] - Delete move-out inspection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const { leaseId } = await params;

    const existing = await prisma.moveOutInspection.findUnique({
      where: { leaseId }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Move-out inspection not found' },
        { status: 404 }
      );
    }

    // Only allow deletion if not completed
    if (existing.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot delete a completed move-out inspection' },
        { status: 400 }
      );
    }

    await prisma.moveOutInspection.delete({
      where: { leaseId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/move-out/[leaseId] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete move-out inspection' },
      { status: 500 }
    );
  }
}
