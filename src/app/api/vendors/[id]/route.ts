import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/vendors/[id] - Get single vendor with work orders
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: params.id },
      include: {
        workOrders: {
          include: {
            property: {
              select: {
                id: true,
                name: true
              }
            },
            unit: {
              select: {
                id: true,
                unitNumber: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 50 // Last 50 work orders
        }
      }
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Calculate totals
    const totalPaid = vendor.workOrders
      .filter(wo => wo.paymentStatus === 'PAID' && wo.actualCost)
      .reduce((sum, wo) => sum + Number(wo.actualCost), 0);

    const totalUnpaid = vendor.workOrders
      .filter(wo => wo.paymentStatus === 'UNPAID' && wo.actualCost)
      .reduce((sum, wo) => sum + Number(wo.actualCost), 0);

    return NextResponse.json({
      ...vendor,
      totalPaid,
      totalUnpaid
    });

  } catch (error: any) {
    console.error(`GET /api/vendors/${params.id} error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch vendor' },
      { status: 500 }
    );
  }
}

// PATCH /api/vendors/[id] - Update vendor
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const vendor = await prisma.vendor.update({
      where: { id: params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.company !== undefined && { company: body.company || null }),
        ...(body.email !== undefined && { email: body.email || null }),
        ...(body.phone !== undefined && { phone: body.phone || null }),
        ...(body.address !== undefined && { address: body.address || null }),
        ...(body.city !== undefined && { city: body.city || null }),
        ...(body.state !== undefined && { state: body.state || null }),
        ...(body.zipCode !== undefined && { zipCode: body.zipCode || null }),
        ...(body.specialties !== undefined && { specialties: body.specialties }),
        ...(body.paymentTerms !== undefined && { paymentTerms: body.paymentTerms || null }),
        ...(body.taxId !== undefined && { taxId: body.taxId || null }),
        ...(body.notes !== undefined && { notes: body.notes || null }),
        ...(body.active !== undefined && { active: body.active })
      }
    });

    return NextResponse.json(vendor);

  } catch (error: any) {
    console.error(`PATCH /api/vendors/${params.id} error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to update vendor' },
      { status: 400 }
    );
  }
}

// DELETE /api/vendors/[id] - Soft delete vendor (mark as inactive)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vendor = await prisma.vendor.update({
      where: { id: params.id },
      data: { active: false }
    });

    return NextResponse.json({ success: true, vendor });

  } catch (error: any) {
    console.error(`DELETE /api/vendors/${params.id} error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete vendor' },
      { status: 400 }
    );
  }
}
