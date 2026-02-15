import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/properties - Get all properties with unit counts and occupancy
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeUnits = searchParams.get('includeUnits') === 'true';

    const properties = await prisma.property.findMany({
      where: {
        active: true
      },
      include: {
        units: includeUnits,
        leases: {
          where: {
            status: 'ACTIVE'
          },
          select: {
            id: true,
            tenantName: true,
            unitId: true,
            scheduledCharges: {
              where: { accountCode: '4000', active: true },
              select: { amount: true }
            }
          }
        },
        _count: {
          select: {
            units: true,
            leases: {
              where: {
                status: 'ACTIVE'
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Calculate occupancy and revenue for each property
    const propertiesWithStats = properties.map(property => {
      const totalUnits = property.totalUnits || property._count.units;
      const occupiedUnits = property._count.leases;
      const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

      const monthlyRevenue = property.leases.reduce((sum, lease) => {
        const rentCharge = lease.scheduledCharges[0];
        return sum + (rentCharge ? Number(rentCharge.amount) : 0);
      }, 0);

      return {
        ...property,
        totalUnits,
        occupiedUnits,
        vacantUnits: totalUnits - occupiedUnits,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        monthlyRevenue
      };
    });

    return NextResponse.json(propertiesWithStats);

  } catch (error: any) {
    console.error('GET /api/properties error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}

// POST /api/properties - Create a new property
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, address, city, state, zipCode, totalUnits, totalSquareFeet, propertyType, notes } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Property name is required' },
        { status: 400 }
      );
    }

    const property = await prisma.property.create({
      data: {
        name,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        totalUnits: totalUnits ? parseInt(totalUnits) : null,
        totalSquareFeet: totalSquareFeet ? parseInt(totalSquareFeet) : null,
        propertyType: propertyType || 'RESIDENTIAL',
        notes: notes || null,
        active: true
      }
    });

    return NextResponse.json({
      success: true,
      message: `Property "${name}" created successfully`,
      property
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/properties error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create property' },
      { status: 500 }
    );
  }
}
