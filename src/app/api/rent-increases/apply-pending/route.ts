import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// POST /api/rent-increases/apply-pending - Apply all pending rent increases that are due
export async function POST(request: NextRequest) {
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
            id: true,
            tenantName: true,
            unitName: true,
            status: true
          }
        }
      }
    });

    if (pendingIncreases.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending rent increases to apply',
        applied: []
      });
    }

    const results = [];
    const errors = [];

    for (const increase of pendingIncreases) {
      try {
        // Only apply to active leases
        if (increase.lease.status !== 'ACTIVE') {
          errors.push({
            rentIncreaseId: increase.id,
            tenantName: increase.lease.tenantName,
            error: 'Lease is not active'
          });
          continue;
        }

        // Find the rent scheduled charge for this lease (account code 4000 = Rental Income)
        const rentScheduledCharge = await prisma.scheduledCharge.findFirst({
          where: {
            leaseId: increase.leaseId,
            accountCode: '4000',
            active: true
          }
        });

        if (!rentScheduledCharge) {
          errors.push({
            rentIncreaseId: increase.id,
            tenantName: increase.lease.tenantName,
            error: 'No active rent scheduled charge found'
          });
          continue;
        }

        // Apply the increase in a transaction
        await prisma.$transaction([
          // Mark increase as applied
          prisma.rentIncrease.update({
            where: { id: increase.id },
            data: {
              status: 'APPLIED',
              appliedAt: new Date(),
              appliedBy: 'system'
            }
          }),
          // Update scheduled rent charge amount
          prisma.scheduledCharge.update({
            where: { id: rentScheduledCharge.id },
            data: {
              amount: increase.newAmount
            }
          })
        ]);

        results.push({
          rentIncreaseId: increase.id,
          leaseId: increase.leaseId,
          tenantName: increase.lease.tenantName,
          unitName: increase.lease.unitName,
          previousAmount: Number(increase.previousAmount),
          newAmount: Number(increase.newAmount),
          effectiveDate: increase.effectiveDate
        });

      } catch (error: any) {
        errors.push({
          rentIncreaseId: increase.id,
          tenantName: increase.lease.tenantName,
          error: error.message || 'Failed to apply increase'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Applied ${results.length} rent increase(s)`,
      applied: results,
      errors: errors
    });

  } catch (error: any) {
    console.error('POST /api/rent-increases/apply-pending error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to apply pending rent increases' },
      { status: 500 }
    );
  }
}
