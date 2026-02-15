import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/accounting';
import { validate, idSchema } from '@/lib/validation';
import { handleApiError, checkRateLimit, rateLimitResponse, getClientIdentifier } from '@/lib/api-utils';
import { parsePaginationParams, createPaginatedResponse, getPrismaPageArgs } from '@/lib/pagination';

// Work order creation schema - matches Prisma required fields
const createWorkOrderSchema = z.object({
  propertyId: idSchema,
  unitId: idSchema, // Required in schema
  leaseId: idSchema.optional(),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(5000),
  category: z.enum(['PLUMBING', 'ELECTRICAL', 'HVAC', 'DOCK_DOOR', 'FIRE_SAFETY', 'STRUCTURAL', 'GENERAL', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']).default('MEDIUM'),
  status: z.enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  reportedBy: z.string().min(1, 'Reporter name is required').max(200),
  reportedEmail: z.string().email().optional().or(z.literal('')),
  vendorId: idSchema.optional(),
  assignedTo: z.string().max(200).optional(),
  estimatedCost: z.number().nonnegative().optional(),
  scheduledDate: z.string().optional(),
  photos: z.array(z.string()).optional(),
  internalNotes: z.string().max(5000).optional()
});

// GET /api/work-orders - List all work orders with filters
export async function GET(request: NextRequest) {
  try {
    // Rate limit: 120 reads per minute per client
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit('work-orders-get', clientId, { windowMs: 60000, maxRequests: 120 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetIn);
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const unitId = searchParams.get('unitId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    const where: any = {
      ...(propertyId && { propertyId }),
      ...(unitId && { unitId }),
      ...(status && { status: status as any }),
      ...(priority && { priority: priority as any })
    };

    const include = {
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
    };

    const orderBy = [
      { priority: 'desc' as const }, // EMERGENCY first
      { status: 'asc' as const },    // OPEN first
      { createdAt: 'desc' as const }
    ];

    // Check if pagination is requested
    const usePagination = searchParams.has('page') || searchParams.has('limit');

    if (usePagination) {
      const paginationParams = parsePaginationParams(searchParams);
      const [total, workOrders] = await Promise.all([
        prisma.workOrder.count({ where }),
        prisma.workOrder.findMany({ where, include, orderBy, ...getPrismaPageArgs(paginationParams) })
      ]);
      return NextResponse.json(createPaginatedResponse(workOrders, total, paginationParams));
    }

    // No pagination - return all (backwards compatible)
    const workOrders = await prisma.workOrder.findMany({ where, include, orderBy });

    return NextResponse.json(workOrders);
  } catch (error) {
    return handleApiError(error, 'GET /api/work-orders');
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
    // Rate limit: 60 work orders per minute per client
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit('work-orders-post', clientId, { windowMs: 60000, maxRequests: 60 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetIn);
    }

    const body = await request.json();

    // Validate input
    const validated = validate(createWorkOrderSchema, body);

    // Auto-generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    const workOrder = await prisma.workOrder.create({
      data: {
        propertyId: validated.propertyId,
        unitId: validated.unitId,
        leaseId: validated.leaseId,
        title: validated.title,
        description: validated.description,
        category: validated.category,
        priority: validated.priority,
        status: validated.status || 'OPEN',
        reportedBy: validated.reportedBy,
        reportedEmail: validated.reportedEmail || undefined,
        vendorId: validated.vendorId,
        assignedTo: validated.assignedTo,
        estimatedCost: validated.estimatedCost,
        scheduledDate: validated.scheduledDate ? new Date(validated.scheduledDate) : undefined,
        photos: validated.photos || [],
        internalNotes: validated.internalNotes,
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

  } catch (error) {
    return handleApiError(error, 'POST /api/work-orders');
  }
}
