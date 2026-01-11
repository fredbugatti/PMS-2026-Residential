import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/rent-increases/pending - Get count of pending rent increases that are due
export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all scheduled rent increases where effective date is today or earlier
    const pendingIncreases = await prisma.rentIncrease.findMany({
      where: {
        status: 'SCHEDULED',
        effectiveDate: {
          lte: today
        }
      },
      include: {
        lease: {
          select: {
            tenantName: true,
            unitName: true,
            status: true
          }
        }
      }
    });

    // Filter to only active leases
    const validIncreases = pendingIncreases.filter(inc => inc.lease.status === 'ACTIVE');

    const count = validIncreases.length;
    const totalIncrease = validIncreases.reduce((sum, inc) => {
      return sum + (Number(inc.newAmount) - Number(inc.previousAmount));
    }, 0);

    return NextResponse.json({
      count,
      totalIncrease,
      increases: validIncreases.map(inc => ({
        id: inc.id,
        tenantName: inc.lease.tenantName,
        unitName: inc.lease.unitName,
        previousAmount: Number(inc.previousAmount),
        newAmount: Number(inc.newAmount),
        effectiveDate: inc.effectiveDate
      }))
    });

  } catch (error: any) {
    console.error('GET /api/rent-increases/pending error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending rent increases' },
      { status: 500 }
    );
  }
}
