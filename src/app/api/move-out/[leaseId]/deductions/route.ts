import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/move-out/[leaseId]/deductions - Get all deductions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const { leaseId } = await params;

    const inspection = await prisma.moveOutInspection.findUnique({
      where: { leaseId },
      select: { id: true }
    });

    if (!inspection) {
      return NextResponse.json(
        { error: 'Move-out inspection not found' },
        { status: 404 }
      );
    }

    const deductions = await prisma.depositDeduction.findMany({
      where: { inspectionId: inspection.id },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(deductions);
  } catch (error: any) {
    console.error('GET /api/move-out/[leaseId]/deductions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get deductions' },
      { status: 500 }
    );
  }
}

// POST /api/move-out/[leaseId]/deductions - Add a deduction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const { leaseId } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.description || body.amount === undefined || !body.category) {
      return NextResponse.json(
        { error: 'Description, amount, and category are required' },
        { status: 400 }
      );
    }

    const inspection = await prisma.moveOutInspection.findUnique({
      where: { leaseId },
      select: { id: true, depositHeld: true, status: true }
    });

    if (!inspection) {
      return NextResponse.json(
        { error: 'Move-out inspection not found' },
        { status: 404 }
      );
    }

    if (inspection.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot modify a completed inspection' },
        { status: 400 }
      );
    }

    // Create deduction and update totals in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the deduction
      const deduction = await tx.depositDeduction.create({
        data: {
          inspectionId: inspection.id,
          description: body.description,
          amount: parseFloat(body.amount),
          category: body.category,
          photoUrls: body.photoUrls || [],
          notes: body.notes
        }
      });

      // Get all deductions to calculate total
      const allDeductions = await tx.depositDeduction.findMany({
        where: { inspectionId: inspection.id }
      });

      const totalDeductions = allDeductions.reduce(
        (sum, d) => sum + Number(d.amount),
        0
      );

      const amountToReturn = Number(inspection.depositHeld) - totalDeductions;

      // Update inspection totals
      await tx.moveOutInspection.update({
        where: { leaseId },
        data: {
          totalDeductions,
          amountToReturn
        }
      });

      return { deduction, totalDeductions, amountToReturn };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/move-out/[leaseId]/deductions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add deduction' },
      { status: 500 }
    );
  }
}

// DELETE /api/move-out/[leaseId]/deductions - Delete a deduction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const { leaseId } = await params;
    const { searchParams } = new URL(request.url);
    const deductionId = searchParams.get('id');

    if (!deductionId) {
      return NextResponse.json(
        { error: 'Deduction ID is required' },
        { status: 400 }
      );
    }

    const inspection = await prisma.moveOutInspection.findUnique({
      where: { leaseId },
      select: { id: true, depositHeld: true, status: true }
    });

    if (!inspection) {
      return NextResponse.json(
        { error: 'Move-out inspection not found' },
        { status: 404 }
      );
    }

    if (inspection.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot modify a completed inspection' },
        { status: 400 }
      );
    }

    // Delete deduction and update totals in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete the deduction
      await tx.depositDeduction.delete({
        where: { id: deductionId }
      });

      // Get remaining deductions to calculate total
      const remainingDeductions = await tx.depositDeduction.findMany({
        where: { inspectionId: inspection.id }
      });

      const totalDeductions = remainingDeductions.reduce(
        (sum, d) => sum + Number(d.amount),
        0
      );

      const amountToReturn = Number(inspection.depositHeld) - totalDeductions;

      // Update inspection totals
      await tx.moveOutInspection.update({
        where: { leaseId },
        data: {
          totalDeductions,
          amountToReturn
        }
      });

      return { totalDeductions, amountToReturn };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('DELETE /api/move-out/[leaseId]/deductions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete deduction' },
      { status: 500 }
    );
  }
}
