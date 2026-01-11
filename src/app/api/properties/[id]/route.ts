import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/properties/[id] - Get single property with units, leases, and documents
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        units: {
          include: {
            leases: {
              where: {
                status: 'ACTIVE'
              },
              select: {
                id: true,
                tenantName: true,
                scheduledCharges: {
                  where: { accountCode: '4000', active: true },
                  select: { amount: true }
                }
              }
            }
          },
          orderBy: {
            unitNumber: 'asc'
          }
        },
        leases: {
          where: {
            status: {
              in: ['ACTIVE', 'DRAFT']
            }
          },
          include: {
            scheduledCharges: {
              where: { accountCode: '4000', active: true },
              select: { amount: true }
            }
          },
          orderBy: {
            tenantName: 'asc'
          }
        },
        libraryDocuments: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(property);

  } catch (error: any) {
    console.error(`GET /api/properties/[id] error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch property' },
      { status: 500 }
    );
  }
}

// PATCH /api/properties/[id] - Update property
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const property = await prisma.property.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.address !== undefined && { address: body.address || null }),
        ...(body.city !== undefined && { city: body.city || null }),
        ...(body.state !== undefined && { state: body.state || null }),
        ...(body.zipCode !== undefined && { zipCode: body.zipCode || null }),
        ...(body.totalUnits !== undefined && { totalUnits: body.totalUnits ? parseInt(body.totalUnits) : null }),
        ...(body.propertyType !== undefined && { propertyType: body.propertyType || null }),
        ...(body.notes !== undefined && { notes: body.notes || null }),
        ...(body.active !== undefined && { active: body.active })
      }
    });

    return NextResponse.json(property);

  } catch (error: any) {
    console.error('PATCH /api/properties/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update property' },
      { status: 400 }
    );
  }
}

// DELETE /api/properties/[id] - Delete or deactivate property
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if property has active leases
    const activeLeases = await prisma.lease.count({
      where: {
        propertyId: id,
        status: 'ACTIVE'
      }
    });

    if (activeLeases > 0) {
      return NextResponse.json(
        { error: `Cannot delete property with ${activeLeases} active lease(s)` },
        { status: 400 }
      );
    }

    // Soft delete by marking as inactive
    await prisma.property.update({
      where: { id },
      data: {
        active: false
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Property deactivated successfully'
    });

  } catch (error: any) {
    console.error('DELETE /api/properties/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete property' },
      { status: 500 }
    );
  }
}
