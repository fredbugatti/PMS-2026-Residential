import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// PATCH /api/rent-increases/[id] - Update rent increase (e.g., cancel or apply)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    const rentIncrease = await prisma.rentIncrease.findUnique({
      where: { id },
      include: {
        lease: true
      }
    });

    if (!rentIncrease) {
      return NextResponse.json(
        { error: 'Rent increase not found' },
        { status: 404 }
      );
    }

    // If applying the rent increase, update the scheduled charge amount
    if (status === 'APPLIED' && rentIncrease.status === 'SCHEDULED') {
      // Find the rent scheduled charge for this lease (account code 4000 = Rental Income)
      const rentScheduledCharge = await prisma.scheduledCharge.findFirst({
        where: {
          leaseId: rentIncrease.leaseId,
          accountCode: '4000',
          active: true
        }
      });

      if (!rentScheduledCharge) {
        return NextResponse.json(
          { error: 'No active rent scheduled charge found for this lease' },
          { status: 400 }
        );
      }

      await prisma.$transaction([
        // Mark rent increase as applied
        prisma.rentIncrease.update({
          where: { id },
          data: {
            status: 'APPLIED',
            appliedAt: new Date(),
            appliedBy: 'user',
            notes: notes || rentIncrease.notes
          }
        }),
        // Update scheduled rent charge amount
        prisma.scheduledCharge.update({
          where: { id: rentScheduledCharge.id },
          data: {
            amount: rentIncrease.newAmount
          }
        })
      ]);

      return NextResponse.json({
        success: true,
        message: `Rent increase applied. New rent: $${rentIncrease.newAmount}`
      });
    }

    // Otherwise, just update the status/notes
    const updated = await prisma.rentIncrease.update({
      where: { id },
      data: {
        status: status || rentIncrease.status,
        notes: notes !== undefined ? notes : rentIncrease.notes
      }
    });

    return NextResponse.json(updated);

  } catch (error: any) {
    console.error('PATCH /api/rent-increases/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update rent increase' },
      { status: 500 }
    );
  }
}

// DELETE /api/rent-increases/[id] - Cancel a scheduled rent increase
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rentIncrease = await prisma.rentIncrease.findUnique({
      where: { id }
    });

    if (!rentIncrease) {
      return NextResponse.json(
        { error: 'Rent increase not found' },
        { status: 404 }
      );
    }

    if (rentIncrease.status === 'APPLIED') {
      return NextResponse.json(
        { error: 'Cannot delete an applied rent increase' },
        { status: 400 }
      );
    }

    await prisma.rentIncrease.update({
      where: { id },
      data: {
        status: 'CANCELLED'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Rent increase cancelled'
    });

  } catch (error: any) {
    console.error('DELETE /api/rent-increases/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel rent increase' },
      { status: 500 }
    );
  }
}
