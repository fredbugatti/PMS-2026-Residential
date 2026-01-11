import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/leases/[id]/automation - Get automation settings
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lease = await prisma.lease.findUnique({
      where: { id: params.id },
      select: {
        autoChargeEnabled: true,
        chargeDay: true,
        gracePeriodDays: true,
        lateFeeAmount: true,
        lateFeeType: true,
        reminderEmails: true,
        lastChargedDate: true
      }
    });

    if (!lease) {
      return NextResponse.json(
        { error: 'Lease not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(lease);

  } catch (error: any) {
    console.error(`GET /api/leases/${params.id}/automation error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch automation settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/leases/[id]/automation - Update automation settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Validate chargeDay if provided
    if (body.chargeDay !== undefined && body.chargeDay !== null) {
      const day = parseInt(body.chargeDay);
      if (isNaN(day) || day < 1 || day > 31) {
        return NextResponse.json(
          { error: 'chargeDay must be between 1 and 31' },
          { status: 400 }
        );
      }
    }

    // Validate gracePeriodDays if provided
    if (body.gracePeriodDays !== undefined && body.gracePeriodDays !== null) {
      const days = parseInt(body.gracePeriodDays);
      if (isNaN(days) || days < 0) {
        return NextResponse.json(
          { error: 'gracePeriodDays must be 0 or greater' },
          { status: 400 }
        );
      }
    }

    // Validate lateFeeType if provided
    if (body.lateFeeType && !['FLAT', 'PERCENTAGE'].includes(body.lateFeeType)) {
      return NextResponse.json(
        { error: 'lateFeeType must be FLAT or PERCENTAGE' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};

    if (body.autoChargeEnabled !== undefined) {
      updateData.autoChargeEnabled = body.autoChargeEnabled;
    }
    if (body.chargeDay !== undefined) {
      updateData.chargeDay = body.chargeDay ? parseInt(body.chargeDay) : null;
    }
    if (body.gracePeriodDays !== undefined) {
      updateData.gracePeriodDays = body.gracePeriodDays ? parseInt(body.gracePeriodDays) : null;
    }
    if (body.lateFeeAmount !== undefined) {
      updateData.lateFeeAmount = body.lateFeeAmount;
    }
    if (body.lateFeeType !== undefined) {
      updateData.lateFeeType = body.lateFeeType;
    }
    if (body.reminderEmails !== undefined) {
      updateData.reminderEmails = body.reminderEmails;
    }

    const lease = await prisma.lease.update({
      where: { id: params.id },
      data: updateData,
      select: {
        autoChargeEnabled: true,
        chargeDay: true,
        gracePeriodDays: true,
        lateFeeAmount: true,
        lateFeeType: true,
        reminderEmails: true,
        lastChargedDate: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Automation settings updated successfully',
      automation: lease
    });

  } catch (error: any) {
    console.error(`PATCH /api/leases/${params.id}/automation error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to update automation settings' },
      { status: 500 }
    );
  }
}
