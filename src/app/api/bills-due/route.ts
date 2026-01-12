import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/bills-due - Get unpaid work orders with vendor invoice info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'unpaid'; // unpaid, all, overdue
    const vendorId = searchParams.get('vendorId');
    const propertyId = searchParams.get('propertyId');
    const sortBy = searchParams.get('sortBy') || 'dueDate'; // dueDate, amount, vendor
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build where clause
    const where: any = {};

    if (status === 'unpaid') {
      where.paymentStatus = { in: ['UNPAID', 'PENDING'] };
    } else if (status === 'overdue') {
      where.paymentStatus = { in: ['UNPAID', 'PENDING'] };
      where.dueDate = { lt: new Date() };
    }
    // 'all' shows everything

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (propertyId) {
      where.propertyId = propertyId;
    }

    // Must have an actual cost to be a bill
    where.actualCost = { not: null };

    // Build orderBy
    let orderBy: any = {};
    switch (sortBy) {
      case 'amount':
        orderBy = { actualCost: sortOrder };
        break;
      case 'vendor':
        orderBy = { vendor: { name: sortOrder } };
        break;
      case 'dueDate':
      default:
        orderBy = [
          { dueDate: sortOrder === 'asc' ? 'asc' : 'desc' },
          { createdAt: 'desc' }
        ];
    }

    const bills = await prisma.workOrder.findMany({
      where,
      orderBy,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            company: true,
            paymentTerms: true,
          }
        },
        property: {
          select: {
            id: true,
            name: true,
          }
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
          }
        }
      }
    });

    // Calculate summary stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalUnpaid = 0;
    let totalOverdue = 0;
    let overdueCount = 0;
    let dueSoonCount = 0; // Due within 7 days

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    for (const bill of bills) {
      const amount = Number(bill.actualCost) || 0;

      if (bill.paymentStatus !== 'PAID') {
        totalUnpaid += amount;

        if (bill.dueDate) {
          const dueDate = new Date(bill.dueDate);
          dueDate.setHours(0, 0, 0, 0);

          if (dueDate < today) {
            totalOverdue += amount;
            overdueCount++;
          } else if (dueDate <= sevenDaysFromNow) {
            dueSoonCount++;
          }
        }
      }
    }

    return NextResponse.json({
      bills: bills.map(bill => ({
        ...bill,
        actualCost: bill.actualCost ? Number(bill.actualCost) : null,
        estimatedCost: bill.estimatedCost ? Number(bill.estimatedCost) : null,
      })),
      summary: {
        totalUnpaid,
        totalOverdue,
        overdueCount,
        dueSoonCount,
        totalCount: bills.length,
      }
    });
  } catch (error: any) {
    console.error('GET /api/bills-due error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bills' },
      { status: 500 }
    );
  }
}

// PATCH /api/bills-due - Mark a work order as paid
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      workOrderId,
      paymentMethod,
      checkNumber,
      paidDate,
      notes
    } = body;

    if (!workOrderId) {
      return NextResponse.json(
        { error: 'Work order ID is required' },
        { status: 400 }
      );
    }

    const workOrder = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        paymentStatus: 'PAID',
        paymentMethod: paymentMethod || null,
        checkNumber: checkNumber || null,
        paidDate: paidDate ? new Date(paidDate) : new Date(),
        internalNotes: notes
          ? (notes + (notes ? '\n' : '') + `Marked as paid on ${new Date().toLocaleDateString()}`)
          : `Marked as paid on ${new Date().toLocaleDateString()}`,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      workOrder: {
        ...workOrder,
        actualCost: workOrder.actualCost ? Number(workOrder.actualCost) : null,
      }
    });
  } catch (error: any) {
    console.error('PATCH /api/bills-due error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update payment status' },
      { status: 500 }
    );
  }
}
