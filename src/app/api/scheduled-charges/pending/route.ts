import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/scheduled-charges/pending - Get count and total of pending charges
export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Get active scheduled charges that are due today or earlier
    const scheduledCharges = await prisma.scheduledCharge.findMany({
      where: {
        active: true,
        chargeDay: { lte: currentDay },
        lease: {
          status: 'ACTIVE'
        }
      }
    });

    // Filter out charges already posted this month
    const pendingCharges = scheduledCharges.filter(charge => {
      if (!charge.lastChargedDate) return true;
      const lastCharged = new Date(charge.lastChargedDate);
      return !(
        lastCharged.getMonth() === currentMonth &&
        lastCharged.getFullYear() === currentYear
      );
    });

    const count = pendingCharges.length;
    const totalAmount = pendingCharges.reduce((sum, charge) => sum + Number(charge.amount), 0);

    return NextResponse.json({
      count,
      totalAmount
    });

  } catch (error: any) {
    console.error('GET /api/scheduled-charges/pending error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending charges' },
      { status: 500 }
    );
  }
}
