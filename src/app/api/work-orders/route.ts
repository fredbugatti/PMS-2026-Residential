import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/work-orders - List all work orders with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const unitId = searchParams.get('unitId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    const workOrders = await prisma.workOrder.findMany({
      where: {
        ...(propertyId && { propertyId }),
        ...(unitId && { unitId }),
        ...(status && { status: status as any }),
        ...(priority && { priority: priority as any })
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
        },
        vendor: {
          select: {
            id: true,
            name: true,
            company: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' }, // EMERGENCY first
        { status: 'asc' },    // OPEN first
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json(workOrders);
  } catch (error: any) {
    console.error('GET /api/work-orders error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch work orders' },
      { status: 500 }
    );
  }
}

// Generate next invoice number: WO-YYYY-NNNN
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `WO-${year}-`;

  // Find the highest existing invoice number for this year
  const lastWorkOrder = await prisma.workOrder.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix
      }
    },
    orderBy: {
      invoiceNumber: 'desc'
    },
    select: {
      invoiceNumber: true
    }
  });

  let nextNumber = 1;
  if (lastWorkOrder?.invoiceNumber) {
    const lastNumber = parseInt(lastWorkOrder.invoiceNumber.replace(prefix, ''), 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

// POST /api/work-orders - Create new work order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Auto-generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    const workOrder = await prisma.workOrder.create({
      data: {
        propertyId: body.propertyId,
        unitId: body.unitId,
        leaseId: body.leaseId || null,
        title: body.title,
        description: body.description,
        category: body.category,
        priority: body.priority || 'MEDIUM',
        status: body.status || 'OPEN',
        reportedBy: body.reportedBy,
        reportedEmail: body.reportedEmail || null,
        vendorId: body.vendorId || null,
        assignedTo: body.assignedTo || null,
        estimatedCost: body.estimatedCost ? parseFloat(body.estimatedCost) : null,
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
        photos: body.photos || [],
        internalNotes: body.internalNotes || null,
        invoiceNumber
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

    return NextResponse.json(workOrder, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/work-orders error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create work order' },
      { status: 400 }
    );
  }
}
