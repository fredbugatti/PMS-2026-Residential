import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/scheduled-charges/[id] - Get single scheduled charge
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const scheduledCharge = await prisma.scheduledCharge.findUnique({
      where: { id },
      include: {
        lease: {
          select: {
            tenantName: true,
            unitName: true,
            propertyName: true
          }
        }
      }
    });

    if (!scheduledCharge) {
      return NextResponse.json(
        { error: 'Scheduled charge not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(scheduledCharge);

  } catch (error: any) {
    console.error('GET /api/scheduled-charges/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch scheduled charge' },
      { status: 500 }
    );
  }
}

// PATCH /api/scheduled-charges/[id] - Update scheduled charge
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate chargeDay if provided
    if (body.chargeDay !== undefined && (body.chargeDay < 1 || body.chargeDay > 28)) {
      return NextResponse.json(
        { error: 'Charge day must be between 1 and 28' },
        { status: 400 }
      );
    }

    // Validate amount if provided
    if (body.amount !== undefined && parseFloat(body.amount) <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than zero' },
        { status: 400 }
      );
    }

    const scheduledCharge = await prisma.scheduledCharge.update({
      where: { id },
      data: {
        ...(body.description !== undefined && { description: body.description.trim() }),
        ...(body.amount !== undefined && { amount: parseFloat(body.amount) }),
        ...(body.chargeDay !== undefined && { chargeDay: parseInt(body.chargeDay) }),
        ...(body.accountCode !== undefined && { accountCode: body.accountCode }),
        ...(body.active !== undefined && { active: body.active }),
        ...('lastChargedDate' in body && { lastChargedDate: body.lastChargedDate })
      }
    });

    return NextResponse.json(scheduledCharge);

  } catch (error: any) {
    console.error('PATCH /api/scheduled-charges/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update scheduled charge' },
      { status: 400 }
    );
  }
}

// DELETE /api/scheduled-charges/[id] - Delete scheduled charge
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.scheduledCharge.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Scheduled charge deleted' });

  } catch (error: any) {
    console.error('DELETE /api/scheduled-charges/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete scheduled charge' },
      { status: 400 }
    );
  }
}
