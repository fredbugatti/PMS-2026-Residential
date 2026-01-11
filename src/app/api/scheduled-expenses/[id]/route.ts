import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/scheduled-expenses/[id] - Get single scheduled expense
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scheduledExpense = await prisma.scheduledExpense.findUnique({
      where: { id: params.id },
      include: {
        property: { select: { id: true, name: true, address: true } },
        vendor: { select: { id: true, name: true, company: true } }
      }
    });

    if (!scheduledExpense) {
      return NextResponse.json(
        { error: 'Scheduled expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(scheduledExpense);
  } catch (error: any) {
    console.error('GET /api/scheduled-expenses/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch scheduled expense' },
      { status: 500 }
    );
  }
}

// PUT /api/scheduled-expenses/[id] - Update scheduled expense
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      description,
      amount,
      chargeDay,
      accountCode,
      vendorId,
      requiresConfirmation,
      active,
      notes
    } = body;

    // Check if exists
    const existing = await prisma.scheduledExpense.findUnique({
      where: { id: params.id }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Scheduled expense not found' },
        { status: 404 }
      );
    }

    // Validate chargeDay if provided
    if (chargeDay !== undefined && (chargeDay < 1 || chargeDay > 28)) {
      return NextResponse.json(
        { error: 'chargeDay must be between 1 and 28' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (chargeDay !== undefined) updateData.chargeDay = parseInt(chargeDay);
    if (accountCode !== undefined) updateData.accountCode = accountCode;
    if (vendorId !== undefined) updateData.vendorId = vendorId || null;
    if (requiresConfirmation !== undefined) updateData.requiresConfirmation = requiresConfirmation;
    if (active !== undefined) updateData.active = active;
    if (notes !== undefined) updateData.notes = notes;

    const scheduledExpense = await prisma.scheduledExpense.update({
      where: { id: params.id },
      data: updateData,
      include: {
        property: { select: { name: true } },
        vendor: { select: { name: true } }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Scheduled expense updated',
      scheduledExpense
    });
  } catch (error: any) {
    console.error('PUT /api/scheduled-expenses/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update scheduled expense' },
      { status: 500 }
    );
  }
}

// DELETE /api/scheduled-expenses/[id] - Delete scheduled expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.scheduledExpense.findUnique({
      where: { id: params.id }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Scheduled expense not found' },
        { status: 404 }
      );
    }

    await prisma.scheduledExpense.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Scheduled expense deleted'
    });
  } catch (error: any) {
    console.error('DELETE /api/scheduled-expenses/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete scheduled expense' },
      { status: 500 }
    );
  }
}
