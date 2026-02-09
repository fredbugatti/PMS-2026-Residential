import { NextRequest, NextResponse } from 'next/server';
import { prisma, postDoubleEntry } from '@/lib/accounting';
import { validate, paymentSchema } from '@/lib/validation';
import { handleApiError, apiCreated, checkRateLimit, rateLimitResponse, getClientIdentifier } from '@/lib/api-utils';

// GET /api/payments - Get all payments with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const leaseId = searchParams.get('leaseId');
    const invoiceId = searchParams.get('invoiceId');

    const where: any = {};

    if (leaseId) {
      where.leaseId = leaseId;
    }

    if (invoiceId) {
      where.invoiceId = invoiceId;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        lease: {
          include: {
            property: true,
            unit: true
          }
        },
        invoice: true
      },
      orderBy: {
        paymentDate: 'desc'
      }
    });

    return NextResponse.json(payments);
  } catch (error: any) {
    console.error('GET /api/payments error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

// POST /api/payments - Record a payment with optional invoice linking
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 30 payments per minute per client
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit('payments', clientId, { windowMs: 60000, maxRequests: 30 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetIn);
    }

    const body = await request.json();

    // Validate input (basic fields)
    const { amount, leaseId, description, paymentDate } = validate(paymentSchema, body);

    // Additional optional fields for enhanced payment tracking
    const { invoiceId, paymentMethod, referenceNumber, accountCode, notes } = body;

    const entryDate = paymentDate ? new Date(paymentDate) : new Date();
    const finalDescription = description || 'Payment received';

    // Verify lease exists
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId }
    });

    if (!lease) {
      return NextResponse.json(
        { error: 'Lease not found' },
        { status: 404 }
      );
    }

    // If invoiceId provided, verify invoice exists
    let invoice = null;
    if (invoiceId) {
      invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true }
      });

      if (!invoice) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }
    }

    // Create payment and ledger entries in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Post double-entry ledger entries
      const { debit: cashEntry, credit: arEntry } = await postDoubleEntry({
        debitEntry: {
          accountCode: accountCode || '1000',
          amount,
          debitCredit: 'DR',
          description: finalDescription,
          entryDate,
          leaseId,
          postedBy: 'user'
        },
        creditEntry: {
          accountCode: '1200',
          amount,
          debitCredit: 'CR',
          description: finalDescription,
          entryDate,
          leaseId,
          postedBy: 'user'
        }
      });

      // Create payment tracking record
      const payment = await tx.payment.create({
        data: {
          leaseId,
          invoiceId: invoiceId || null,
          paymentDate: entryDate,
          amount: parseFloat(amount),
          paymentMethod: paymentMethod || 'OTHER',
          referenceNumber,
          accountCode: accountCode || '1000',
          notes: notes || finalDescription,
          recordedBy: 'user',
          ledgerEntryId: cashEntry.id
        },
        include: {
          lease: true,
          invoice: true
        }
      });

      // If linked to an invoice, update the invoice's payments/credits and status
      if (invoiceId && invoice) {
        // Calculate total payments for this invoice
        const totalPayments = invoice.payments.reduce(
          (sum, p) => sum + Number(p.amount),
          0
        ) + parseFloat(amount);

        const newTotalDue = Number(invoice.subtotal) - totalPayments;

        // Update invoice
        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            paymentsCredits: totalPayments,
            totalDue: Math.max(0, newTotalDue),
            status: newTotalDue <= 0 ? 'PAID' : invoice.status,
            paidAt: newTotalDue <= 0 && !invoice.paidAt ? new Date() : invoice.paidAt
          }
        });
      }

      return { payment, cashEntry, arEntry };
    });

    return apiCreated(
      {
        payment: result.payment,
        entries: [result.cashEntry, result.arEntry]
      },
      `Payment of $${amount} recorded successfully`
    );

  } catch (error) {
    return handleApiError(error, 'POST /api/payments');
  }
}
