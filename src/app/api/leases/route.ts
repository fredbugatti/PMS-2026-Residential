import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';
import { syncUnitStatus } from '@/lib/unitStatus';
import crypto from 'crypto';

// GET /api/leases - List all leases
export async function GET() {
  try {
    const leases = await prisma.lease.findMany({
      include: {
        scheduledCharges: {
          where: { active: true }
        }
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Add computed amounts from scheduled charges
    const leasesWithCharges = leases.map(lease => {
      const rentCharge = lease.scheduledCharges.find(c => c.accountCode === '4000');
      const totalScheduledCharges = lease.scheduledCharges.reduce(
        (sum, c) => sum + Number(c.amount), 0
      );
      return {
        ...lease,
        monthlyRentAmount: rentCharge ? Number(rentCharge.amount) : null,
        totalScheduledCharges: totalScheduledCharges > 0 ? totalScheduledCharges : null
      };
    });

    return NextResponse.json(leasesWithCharges);
  } catch (error: any) {
    console.error('GET /api/leases error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leases' },
      { status: 500 }
    );
  }
}

// POST /api/leases - Create new lease
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Generate portal token for all new leases
    const portalToken = crypto.randomBytes(32).toString('hex');

    const monthlyRent = body.monthlyRentAmount ? parseFloat(body.monthlyRentAmount) : null;

    const lease = await prisma.lease.create({
      data: {
        tenantName: body.tenantName,
        tenantEmail: body.tenantEmail || null,
        tenantPhone: body.tenantPhone || null,
        unitName: body.unitName,
        propertyName: body.propertyName || null,
        propertyId: body.propertyId || null,
        unitId: body.unitId || null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        securityDepositAmount: body.securityDepositAmount ? parseFloat(body.securityDepositAmount) : null,
        status: body.status || 'ACTIVE',
        notes: body.notes || null,
        portalToken: portalToken
      }
    });

    // Create a scheduled charge for monthly rent if amount is provided
    if (monthlyRent && monthlyRent > 0) {
      try {
        await prisma.scheduledCharge.create({
          data: {
            leaseId: lease.id,
            description: 'Monthly Rent',
            amount: monthlyRent,
            accountCode: '4000', // Rental Income
            chargeDay: 1, // First of the month
            active: true
          }
        });
      } catch (error) {
        console.error('Failed to create scheduled rent charge:', error);
      }
    }

    // Automatically sync unit status if unitId is provided
    if (lease.unitId) {
      try {
        await syncUnitStatus(lease.unitId);
      } catch (error) {
        console.error('Failed to sync unit status:', error);
        // Don't fail the lease creation if unit sync fails
      }
    }

    return NextResponse.json(lease, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/leases error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create lease' },
      { status: 400 }
    );
  }
}
