import { NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export async function GET() {
  try {
    // Get all properties with their units and active leases
    const properties = await prisma.property.findMany({
      include: {
        units: {
          include: {
            leases: {
              where: {
                status: 'ACTIVE'
              },
              include: {
                scheduledCharges: {
                  where: { active: true }
                }
              },
              take: 1 // Only get the active lease
            }
          },
          orderBy: {
            unitNumber: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Transform data for rent roll report
    const rentRoll = properties.map(property => {
      const units = property.units.map(unit => {
        const activeLease = unit.leases[0];
        const monthlyRent = activeLease?.scheduledCharges?.reduce(
          (sum, c) => sum + Number(c.amount), 0
        ) || 0;

        return {
          unitId: unit.id,
          unitName: unit.unitNumber,
          dockDoors: unit.dockDoors,
          clearHeight: unit.clearHeight ? Number(unit.clearHeight) : null,
          sqft: unit.squareFeet,
          isOccupied: !!activeLease,
          tenantName: activeLease?.tenantName || null,
          monthlyRent: monthlyRent > 0 ? monthlyRent : null,
          annualRent: monthlyRent > 0 ? monthlyRent * 12 : null,
          leaseStart: activeLease?.startDate?.toISOString().split('T')[0] || null,
          leaseEnd: activeLease?.endDate?.toISOString().split('T')[0] || null,
          leaseId: activeLease?.id || null
        };
      });

      const occupiedUnits = units.filter(u => u.isOccupied);
      const vacantUnits = units.filter(u => !u.isOccupied);
      const totalMonthlyRent = occupiedUnits.reduce((sum, u) => sum + (u.monthlyRent || 0), 0);
      const totalAnnualRent = totalMonthlyRent * 12;

      return {
        propertyId: property.id,
        propertyName: property.name,
        propertyAddress: property.address,
        totalUnits: units.length,
        occupiedUnits: occupiedUnits.length,
        vacantUnits: vacantUnits.length,
        occupancyRate: units.length > 0 ? Math.round((occupiedUnits.length / units.length) * 100) : 0,
        totalMonthlyRent,
        totalAnnualRent,
        units
      };
    });

    // Calculate overall summary
    const summary = {
      totalProperties: rentRoll.length,
      totalUnits: rentRoll.reduce((sum, p) => sum + p.totalUnits, 0),
      occupiedUnits: rentRoll.reduce((sum, p) => sum + p.occupiedUnits, 0),
      vacantUnits: rentRoll.reduce((sum, p) => sum + p.vacantUnits, 0),
      overallOccupancy: 0,
      totalMonthlyRent: rentRoll.reduce((sum, p) => sum + p.totalMonthlyRent, 0),
      totalAnnualRent: rentRoll.reduce((sum, p) => sum + p.totalAnnualRent, 0)
    };

    summary.overallOccupancy = summary.totalUnits > 0
      ? Math.round((summary.occupiedUnits / summary.totalUnits) * 100)
      : 0;

    return NextResponse.json({
      asOfDate: new Date().toISOString().split('T')[0],
      properties: rentRoll,
      summary
    });
  } catch (error) {
    console.error('Failed to fetch rent roll:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rent roll' },
      { status: 500 }
    );
  }
}
