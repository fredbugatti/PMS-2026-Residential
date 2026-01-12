import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/units - Get units (optionally filtered by property)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const propertyId = searchParams.get('propertyId');

    const where: any = {};
    if (propertyId) where.propertyId = propertyId;

    const units = await prisma.unit.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            name: true
          }
        },
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
      orderBy: [
        { property: { name: 'asc' } },
        { unitNumber: 'asc' }
      ]
    });

    return NextResponse.json(units);

  } catch (error: any) {
    console.error('GET /api/units error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch units' },
      { status: 500 }
    );
  }
}

// POST /api/units - Create a new unit/space
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      propertyId, unitNumber, bedrooms, bathrooms, squareFeet, status, notes,
      // Warehouse space-specific fields
      loadingDocks, driveInDoors, officeSquareFeet, clearHeight
    } = body;

    // Validate required fields
    if (!propertyId || !unitNumber) {
      return NextResponse.json(
        { error: 'Property ID and space name are required' },
        { status: 400 }
      );
    }

    const unit = await prisma.unit.create({
      data: {
        propertyId,
        unitNumber,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseFloat(bathrooms) : null,
        squareFeet: squareFeet ? parseInt(squareFeet) : null,
        status: status || 'VACANT',
        notes: notes || null,
        // Warehouse space-specific fields
        loadingDocks: loadingDocks ? parseInt(loadingDocks) : null,
        driveInDoors: driveInDoors ? parseInt(driveInDoors) : null,
        officeSquareFeet: officeSquareFeet ? parseInt(officeSquareFeet) : null,
        clearHeight: clearHeight ? parseFloat(clearHeight) : null
      },
      include: {
        property: {
          select: {
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Space ${unitNumber} created successfully`,
      unit
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/units error:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Space name already exists for this property' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create space' },
      { status: 500 }
    );
  }
}
