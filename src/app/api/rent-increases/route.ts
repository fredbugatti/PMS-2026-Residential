import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/rent-increases - Get all rent increases (optionally filtered by status)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const leaseId = searchParams.get('leaseId');

    const where: any = {};
    if (status) where.status = status;
    if (leaseId) where.leaseId = leaseId;

    const rentIncreases = await prisma.rentIncrease.findMany({
      where,
      include: {
        lease: {
          select: {
            id: true,
            tenantName: true,
            unitName: true,
            propertyName: true,
            status: true
          }
        }
      },
      orderBy: {
        effectiveDate: 'asc'
      }
    });

    return NextResponse.json(rentIncreases);

  } catch (error: any) {
    console.error('GET /api/rent-increases error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch rent increases' },
      { status: 500 }
    );
  }
}

// POST /api/rent-increases - Schedule a new rent increase
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leaseId, newAmount, effectiveDate, noticeDate, notes } = body;

    // Validate required fields
    if (!leaseId || !newAmount || !effectiveDate) {
      return NextResponse.json(
        { error: 'leaseId, newAmount, and effectiveDate are required' },
        { status: 400 }
      );
    }

    // Get current lease information
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      select: {
        tenantName: true,
        status: true,
        scheduledCharges: {
          where: { accountCode: '4000', active: true }
        }
      }
    });

    if (!lease) {
      return NextResponse.json(
        { error: 'Lease not found' },
        { status: 404 }
      );
    }

    // Get current rent from scheduled charge (account code 4000 = Rental Income)
    const rentCharge = lease.scheduledCharges[0];
    if (!rentCharge) {
      return NextResponse.json(
        { error: 'Lease must have an active rent scheduled charge' },
        { status: 400 }
      );
    }

    // Validate that new amount is greater than current
    const currentAmount = Number(rentCharge.amount);
    const newAmountNum = parseFloat(newAmount);

    if (newAmountNum <= currentAmount) {
      return NextResponse.json(
        { error: 'New rent amount must be greater than current amount' },
        { status: 400 }
      );
    }

    // Parse dates
    const effectiveDateParsed = new Date(effectiveDate);
    const noticeDateParsed = noticeDate ? new Date(noticeDate) : new Date();

    // Validate effective date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (effectiveDateParsed < today) {
      return NextResponse.json(
        { error: 'Effective date must be in the future' },
        { status: 400 }
      );
    }

    // Create rent increase
    const rentIncrease = await prisma.rentIncrease.create({
      data: {
        leaseId: leaseId,
        previousAmount: currentAmount,
        newAmount: newAmountNum,
        effectiveDate: effectiveDateParsed,
        noticeDate: noticeDateParsed,
        status: 'SCHEDULED',
        notes: notes || null
      },
      include: {
        lease: {
          select: {
            tenantName: true,
            unitName: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Rent increase scheduled for ${lease.tenantName}`,
      rentIncrease: rentIncrease
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/rent-increases error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to schedule rent increase' },
      { status: 500 }
    );
  }
}
