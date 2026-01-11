import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';
import { createWorkOrderLedgerEntries, ensureMaintenanceExpenseAccount, ensureMaintenanceRecoveryAccount } from '@/lib/workOrderAccounting';

// GET /api/work-orders/[id] - Get single work order with updates
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: params.id },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true
          }
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
            bedrooms: true,
            bathrooms: true
          }
        },
        lease: {
          select: {
            id: true,
            tenantName: true,
            tenantEmail: true,
            tenantPhone: true
          }
        },
        vendor: {
          select: {
            id: true,
            name: true,
            company: true,
            phone: true,
            email: true
          }
        },
        updates: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(workOrder);

  } catch (error: any) {
    console.error(`GET /api/work-orders/${params.id} error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch work order' },
      { status: 500 }
    );
  }
}

// PATCH /api/work-orders/[id] - Update work order
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Get old work order to track status changes
    const oldWorkOrder = await prisma.workOrder.findUnique({
      where: { id: params.id },
      select: {
        status: true,
        paymentStatus: true
      }
    });

    const workOrder = await prisma.workOrder.update({
      where: { id: params.id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description && { description: body.description }),
        ...(body.category && { category: body.category }),
        ...(body.priority && { priority: body.priority }),
        ...(body.status && { status: body.status }),
        ...(body.assignedTo !== undefined && { assignedTo: body.assignedTo || null }),
        ...(body.estimatedCost !== undefined && {
          estimatedCost: body.estimatedCost ? parseFloat(body.estimatedCost) : null
        }),
        ...(body.actualCost !== undefined && {
          actualCost: body.actualCost ? parseFloat(body.actualCost) : null
        }),
        ...(body.paidBy !== undefined && { paidBy: body.paidBy || null }),
        ...(body.paymentStatus !== undefined && { paymentStatus: body.paymentStatus }),
        ...(body.invoiceNumber !== undefined && { invoiceNumber: body.invoiceNumber || null }),
        ...(body.scheduledDate !== undefined && {
          scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null
        }),
        ...(body.completedDate !== undefined && {
          completedDate: body.completedDate ? new Date(body.completedDate) : null
        }),
        ...(body.photos !== undefined && { photos: body.photos }),
        ...(body.internalNotes !== undefined && { internalNotes: body.internalNotes || null })
      },
      include: {
        property: {
          select: {
            id: true,
            name: true
          }
        },
        unit: {
          select: {
            id: true,
            unitNumber: true
          }
        },
        lease: {
          select: {
            id: true,
            tenantName: true
          }
        }
      }
    });

    // Create update record if status changed
    if (body.status && oldWorkOrder && body.status !== oldWorkOrder.status) {
      await prisma.workOrderUpdate.create({
        data: {
          workOrderId: params.id,
          status: body.status,
          note: body.updateNote || `Status changed to ${body.status}`,
          updatedBy: body.updatedBy || 'Property Manager'
        }
      });
    }

    // If marked as completed, set completed date if not already set
    if (body.status === 'COMPLETED' && !workOrder.completedDate) {
      await prisma.workOrder.update({
        where: { id: params.id },
        data: { completedDate: new Date() }
      });
    }

    // If payment status changed to PAID and we have all required info, create ledger entries
    if (
      body.paymentStatus === 'PAID' &&
      oldWorkOrder?.paymentStatus !== 'PAID' &&
      workOrder.actualCost &&
      workOrder.paidBy
    ) {
      try {
        // Ensure accounts exist
        await ensureMaintenanceExpenseAccount();
        await ensureMaintenanceRecoveryAccount();

        // Create ledger entries
        await createWorkOrderLedgerEntries(
          workOrder.id,
          Number(workOrder.actualCost),
          workOrder.paidBy as 'OWNER' | 'TENANT',
          workOrder.leaseId,
          workOrder.title
        );

        // Update paid date
        await prisma.workOrder.update({
          where: { id: params.id },
          data: { paidDate: new Date() }
        });
      } catch (error) {
        console.error('Failed to create ledger entries for work order:', error);
        // Don't fail the work order update if accounting fails
      }
    }

    return NextResponse.json(workOrder);

  } catch (error: any) {
    console.error(`PATCH /api/work-orders/${params.id} error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to update work order' },
      { status: 400 }
    );
  }
}

// DELETE /api/work-orders/[id] - Delete work order (soft delete by marking as CANCELLED)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workOrder = await prisma.workOrder.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' }
    });

    return NextResponse.json({ success: true, workOrder });

  } catch (error: any) {
    console.error(`DELETE /api/work-orders/${params.id} error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete work order' },
      { status: 400 }
    );
  }
}
