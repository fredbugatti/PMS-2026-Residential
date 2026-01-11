import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// PATCH /api/units/[id] - Update unit
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const unit = await prisma.unit.update({
      where: { id: params.id },
      data: {
        ...(body.unitNumber !== undefined && { unitNumber: body.unitNumber }),
        ...(body.bedrooms !== undefined && { bedrooms: body.bedrooms }),
        ...(body.bathrooms !== undefined && { bathrooms: body.bathrooms }),
        ...(body.squareFeet !== undefined && { squareFeet: body.squareFeet }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes || null })
      }
    });

    return NextResponse.json(unit);

  } catch (error: any) {
    console.error(`PATCH /api/units/${params.id} error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to update unit' },
      { status: 400 }
    );
  }
}

// DELETE /api/units/[id] - Delete unit
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if unit has active leases
    const activeLeases = await prisma.lease.count({
      where: {
        unitId: params.id,
        status: 'ACTIVE'
      }
    });

    if (activeLeases > 0) {
      return NextResponse.json(
        { error: `Cannot delete unit with ${activeLeases} active lease(s)` },
        { status: 400 }
      );
    }

    await prisma.unit.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Unit deleted successfully'
    });

  } catch (error: any) {
    console.error(`DELETE /api/units/${params.id} error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete unit' },
      { status: 500 }
    );
  }
}
