import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// POST /api/invoices/generate - Generate invoice from scheduled charges for a lease
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leaseId, month, year, includeCharges } = body;

    if (!leaseId) {
      return NextResponse.json(
        { error: 'Lease ID is required' },
        { status: 400 }
      );
    }

    // Get lease with scheduled charges
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        property: true,
        unit: true,
        scheduledCharges: {
          where: {
            active: true
          }
        }
      }
    });

    if (!lease) {
      return NextResponse.json(
        { error: 'Lease not found' },
        { status: 404 }
      );
    }

    // Determine invoice date
    const now = new Date();
    const invoiceMonth = month || now.getMonth() + 1;
    const invoiceYear = year || now.getFullYear();
    const invoiceDate = new Date(invoiceYear, invoiceMonth - 1, 1);
    const dueDate = new Date(invoiceYear, invoiceMonth - 1, 1); // Due on 1st of month

    // Generate line items from scheduled charges or custom charges
    let lineItems: any[] = [];

    if (includeCharges && includeCharges.length > 0) {
      // Use provided charges
      lineItems = includeCharges.map((item: any, index: number) => ({
        quantity: item.quantity || 1,
        itemCode: item.itemCode || 'RENT',
        description: item.description,
        priceEach: parseFloat(item.priceEach || 0),
        amount: parseFloat(item.amount || 0),
        sortOrder: index
      }));
    } else {
      // Use scheduled charges
      lineItems = lease.scheduledCharges.map((charge, index) => {
        const amount = parseFloat(charge.amount.toString());
        return {
          quantity: 1,
          itemCode: charge.accountCode,
          description: charge.description,
          priceEach: amount,
          amount: amount,
          sortOrder: index
        };
      });
    }

    if (lineItems.length === 0) {
      return NextResponse.json(
        { error: 'No charges to invoice. Add scheduled charges to the lease first.' },
        { status: 400 }
      );
    }

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

    // Generate invoice number
    const latestInvoice = await prisma.invoice.findFirst({
      orderBy: {
        invoiceNumber: 'desc'
      }
    });

    let nextNumber = 5527;
    if (latestInvoice) {
      const currentNumber = parseInt(latestInvoice.invoiceNumber);
      nextNumber = isNaN(currentNumber) ? 5527 : currentNumber + 1;
    }

    const invoiceNumber = nextNumber.toString();

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        invoiceDate,
        dueDate,
        leaseId,
        companyName: lease.companyName || lease.tenantName,
        contactName: lease.tenantName,
        billToAddress: lease.property
          ? `${lease.property.address || ''}\n${lease.property.city || ''}, ${lease.property.state || ''} ${lease.property.zipCode || ''}`.trim()
          : null,
        terms: 'Due on receipt',
        subtotal,
        paymentsCredits: 0,
        totalDue: subtotal,
        status: 'DRAFT',
        createdBy: 'System',
        lineItems: {
          create: lineItems
        }
      },
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
      message: `Invoice #${invoiceNumber} generated successfully`,
      invoice
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/invoices/generate error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
