import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/scheduled-expenses - Get all scheduled expenses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where: any = {};
    if (propertyId) where.propertyId = propertyId;
    if (activeOnly) where.active = true;

    const scheduledExpenses = await prisma.scheduledExpense.findMany({
      where,
      include: {
        property: {
          select: { id: true, name: true, address: true }
        },
        vendor: {
          select: { id: true, name: true, company: true }
        }
      },
      orderBy: [
        { property: { name: 'asc' } },
        { chargeDay: 'asc' }
      ]
    });

    // Get expense accounts for dropdown
    const expenseAccounts = await prisma.chartOfAccounts.findMany({
      where: { type: 'EXPENSE', active: true },
      orderBy: { code: 'asc' }
    });

    // Calculate monthly total
    const monthlyTotal = scheduledExpenses
      .filter(e => e.active)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return NextResponse.json({
      scheduledExpenses: scheduledExpenses.map(e => ({
        id: e.id,
        propertyId: e.propertyId,
        propertyName: e.property.name,
        propertyAddress: e.property.address,
        description: e.description,
        amount: Number(e.amount),
        chargeDay: e.chargeDay,
        accountCode: e.accountCode,
        vendorId: e.vendorId,
        vendorName: e.vendor?.name || e.vendor?.company || null,
        requiresConfirmation: e.requiresConfirmation,
        active: e.active,
        lastPostedDate: e.lastPostedDate,
        notes: e.notes,
        createdAt: e.createdAt
      })),
      expenseAccounts,
      summary: {
        total: scheduledExpenses.length,
        active: scheduledExpenses.filter(e => e.active).length,
        monthlyTotal
      }
    });
  } catch (error: any) {
    console.error('GET /api/scheduled-expenses error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch scheduled expenses' },
      { status: 500 }
    );
  }
}

// POST /api/scheduled-expenses - Create a new scheduled expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      propertyId,
      description,
      amount,
      chargeDay,
      accountCode,
      vendorId,
      requiresConfirmation,
      notes
    } = body;

    // Validate required fields
    if (!propertyId || !description || !amount || !chargeDay) {
      return NextResponse.json(
        { error: 'propertyId, description, amount, and chargeDay are required' },
        { status: 400 }
      );
    }

    // Validate chargeDay
    if (chargeDay < 1 || chargeDay > 28) {
      return NextResponse.json(
        { error: 'chargeDay must be between 1 and 28' },
        { status: 400 }
      );
    }

    // Validate property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Validate account exists and is expense type
    if (accountCode) {
      const account = await prisma.chartOfAccounts.findUnique({
        where: { code: accountCode }
      });

      if (!account || account.type !== 'EXPENSE') {
        return NextResponse.json(
          { error: 'Invalid expense account code' },
          { status: 400 }
        );
      }
    }

    const scheduledExpense = await prisma.scheduledExpense.create({
      data: {
        propertyId,
        description,
        amount: parseFloat(amount),
        chargeDay: parseInt(chargeDay),
        accountCode: accountCode || '5000',
        vendorId: vendorId || null,
        requiresConfirmation: requiresConfirmation || false,
        notes: notes || null
      },
      include: {
        property: { select: { name: true } },
        vendor: { select: { name: true } }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Scheduled expense created',
      scheduledExpense
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/scheduled-expenses error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create scheduled expense' },
      { status: 500 }
    );
  }
}
