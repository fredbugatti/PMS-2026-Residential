import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';
import { Prisma } from '@prisma/client';

// GET /api/invoices - Get all invoices with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const leaseId = searchParams.get('leaseId');
    const status = searchParams.get('status');
    const propertyId = searchParams.get('propertyId');

    const where: any = {};

    if (leaseId) {
      where.leaseId = leaseId;
    }

    if (status) {
      where.status = status;
    }

    if (propertyId) {
      where.lease = {
        propertyId: propertyId
      };
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        lease: {
          include: {
            property: true,
            unit: true
          }
        },
        lineItems: {
          orderBy: {
            sortOrder: 'asc'
          }
        }
      },
      orderBy: {
        invoiceDate: 'desc'
      }
    });

    return NextResponse.json(invoices);
  } catch (error: any) {
    console.error('GET /api/invoices error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

// POST /api/invoices - Create a new invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      leaseId,
      invoiceDate,
      dueDate,
      terms,
      poNumber,
      project,
      notes,
      lineItems
    } = body;

    // Validate required fields
    if (!leaseId) {
      return NextResponse.json(
        { error: 'Lease ID is required' },
        { status: 400 }
      );
    }

    if (!lineItems || lineItems.length === 0) {
      return NextResponse.json(
        { error: 'At least one line item is required' },
        { status: 400 }
      );
    }

    // Get lease details
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        property: true,
        unit: true
      }
    });

    if (!lease) {
      return NextResponse.json(
        { error: 'Lease not found' },
        { status: 404 }
      );
    }

    // Generate invoice number atomically (prevents race conditions)
    // Use a transaction to atomically increment and retrieve the next invoice number
    const nextNumber = await prisma.$transaction(async (tx) => {
      // Ensure the sequence row exists
      await tx.$executeRaw`
        INSERT INTO invoice_sequence (id, last_number, updated_at)
        VALUES ('singleton', 5526, NOW())
        ON CONFLICT (id) DO NOTHING
      `;

      // Atomically increment and return the new number
      const result = await tx.$queryRaw<[{ last_number: number }]>`
        UPDATE invoice_sequence
        SET last_number = last_number + 1,
            updated_at = NOW()
        WHERE id = 'singleton'
        RETURNING last_number
      `;

      return result[0].last_number;
    });

    const invoiceNumber = nextNumber.toString();

    // Calculate totals
    const subtotal = lineItems.reduce((sum: number, item: any) => {
      return sum + parseFloat(item.amount || 0);
    }, 0);

    const totalDue = subtotal;

    // Prepare invoice data
    const invoiceData: Prisma.InvoiceUncheckedCreateInput = {
      invoiceNumber,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : new Date(),
      leaseId,
      companyName: lease.companyName || lease.tenantName,
      contactName: lease.tenantName,
      billToAddress: lease.property
        ? `${lease.property.address || ''}\n${lease.property.city || ''}, ${lease.property.state || ''} ${lease.property.zipCode || ''}`.trim()
        : null,
      terms: terms || 'Due on receipt',
      poNumber,
      project,
      subtotal,
      paymentsCredits: 0,
      totalDue,
      status: 'DRAFT',
      notes,
      createdBy: 'System',
      lineItems: {
        create: lineItems.map((item: any, index: number) => ({
          quantity: item.quantity || 1,
          itemCode: item.itemCode,
          description: item.description,
          priceEach: parseFloat(item.priceEach || 0),
          amount: parseFloat(item.amount || 0),
          sortOrder: index
        }))
      }
    };

    // Create invoice with line items
    const invoice = await prisma.invoice.create({
      data: invoiceData,
      include: {
        lineItems: {
          orderBy: {
            sortOrder: 'asc'
          }
        },
        lease: {
          include: {
            property: true,
            unit: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Invoice #${invoiceNumber} created successfully`,
      invoice
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/invoices error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
