import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/invoices/[id] - Get a specific invoice
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: {
        id: params.id
      },
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
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(invoice);
  } catch (error: any) {
    console.error(`GET /api/invoices/${params.id} error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

// PATCH /api/invoices/[id] - Update an invoice
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      status,
      invoiceDate,
      dueDate,
      terms,
      poNumber,
      project,
      notes,
      paymentsCredits,
      lineItems
    } = body;

    // Get existing invoice
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        lineItems: true
      }
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (status) updateData.status = status;
    if (invoiceDate) updateData.invoiceDate = new Date(invoiceDate);
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (terms !== undefined) updateData.terms = terms;
    if (poNumber !== undefined) updateData.poNumber = poNumber;
    if (project !== undefined) updateData.project = project;
    if (notes !== undefined) updateData.notes = notes;
    if (paymentsCredits !== undefined) updateData.paymentsCredits = paymentsCredits;

    // Update line items if provided
    if (lineItems) {
      // Delete existing line items
      await prisma.invoiceLineItem.deleteMany({
        where: { invoiceId: params.id }
      });

      // Calculate new subtotal
      const subtotal = lineItems.reduce((sum: number, item: any) => {
        return sum + parseFloat(item.amount || 0);
      }, 0);

      updateData.subtotal = subtotal;
      updateData.totalDue = subtotal - (paymentsCredits || existingInvoice.paymentsCredits);

      // Create new line items
      updateData.lineItems = {
        create: lineItems.map((item: any, index: number) => ({
          quantity: item.quantity || 1,
          itemCode: item.itemCode,
          description: item.description,
          priceEach: parseFloat(item.priceEach || 0),
          amount: parseFloat(item.amount || 0),
          sortOrder: index
        }))
      };
    } else if (paymentsCredits !== undefined) {
      // Recalculate total due if payments/credits changed
      updateData.totalDue = existingInvoice.subtotal - paymentsCredits;
    }

    // Update sent/paid timestamps
    if (status === 'SENT' && !existingInvoice.sentAt) {
      updateData.sentAt = new Date();
    }
    if (status === 'PAID' && !existingInvoice.paidAt) {
      updateData.paidAt = new Date();
    }

    const invoice = await prisma.invoice.update({
      where: { id: params.id },
      data: updateData,
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
      message: 'Invoice updated successfully',
      invoice
    });

  } catch (error: any) {
    console.error(`PATCH /api/invoices/${params.id} error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

// DELETE /api/invoices/[id] - Delete an invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if invoice exists
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Delete invoice (line items will be cascade deleted)
    await prisma.invoice.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice deleted successfully'
    });

  } catch (error: any) {
    console.error(`DELETE /api/invoices/${params.id} error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
