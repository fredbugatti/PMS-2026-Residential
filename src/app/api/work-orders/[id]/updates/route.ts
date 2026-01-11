import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// POST /api/work-orders/[id]/updates - Add update/note to work order
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    if (!body.note?.trim()) {
      return NextResponse.json(
        { error: 'Note is required' },
        { status: 400 }
      );
    }

    // Verify work order exists
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: params.id },
      select: { id: true, status: true }
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      );
    }

    // Create the update
    const update = await prisma.workOrderUpdate.create({
      data: {
        workOrderId: params.id,
        status: body.status || workOrder.status,
        note: body.note.trim(),
        updatedBy: body.updatedBy || 'Property Manager'
      }
    });

    return NextResponse.json(update, { status: 201 });

  } catch (error: any) {
    console.error(`POST /api/work-orders/${params.id}/updates error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to add update' },
      { status: 500 }
    );
  }
}

// GET /api/work-orders/[id]/updates - Get all updates for a work order
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await prisma.workOrderUpdate.findMany({
      where: { workOrderId: params.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(updates);

  } catch (error: any) {
    console.error(`GET /api/work-orders/${params.id}/updates error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch updates' },
      { status: 500 }
    );
  }
}
