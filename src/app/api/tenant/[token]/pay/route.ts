import { NextRequest, NextResponse } from 'next/server';
import { prisma, postEntry, postDoubleEntry } from '@/lib/accounting';
import {
  stripe,
  isStripeConfigured,
  getOrCreateCustomer,
  chargeCustomer
} from '@/lib/stripe';

// GET /api/tenant/[token]/pay - Get payment info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const lease = await prisma.lease.findUnique({
      where: { portalToken: token },
      select: {
        id: true,
        status: true,
        tenantName: true,
        propertyName: true,
        unitName: true,
        stripeCustomerId: true,
        stripePaymentMethodId: true,
        autopayEnabled: true,
        autopayMethod: true,
        autopayLast4: true,
        autopayBankName: true,
        ledgerEntries: {
          where: { accountCode: '1200' },
          select: { amount: true, debitCredit: true }
        }
      }
    });

    if (!lease) {
      return NextResponse.json(
        { error: 'Invalid or expired portal link' },
        { status: 404 }
      );
    }

    if (lease.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'This lease is no longer active' },
        { status: 403 }
      );
    }

    // Calculate current balance
    const currentBalance = lease.ledgerEntries.reduce((balance, entry) => {
      const amount = Number(entry.amount) || 0;
      return balance + (entry.debitCredit === 'DR' ? amount : -amount);
    }, 0);

    return NextResponse.json({
      currentBalance,
      stripeConfigured: isStripeConfigured(),
      hasPaymentMethod: !!lease.stripePaymentMethodId,
      autopayEnabled: lease.autopayEnabled,
      savedPaymentMethod: lease.stripePaymentMethodId ? {
        type: lease.autopayMethod,
        last4: lease.autopayLast4,
        bankName: lease.autopayBankName
      } : null
    });

  } catch (error: any) {
    console.error('GET /api/tenant/[token]/pay error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get payment info' },
      { status: 500 }
    );
  }
}

// POST /api/tenant/[token]/pay - Process payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { action, amount } = body;

    const lease = await prisma.lease.findUnique({
      where: { portalToken: token },
      select: {
        id: true,
        status: true,
        tenantName: true,
        tenantEmail: true,
        propertyName: true,
        unitName: true,
        stripeCustomerId: true,
        stripePaymentMethodId: true,
        ledgerEntries: {
          where: { accountCode: '1200' },
          select: { amount: true, debitCredit: true }
        }
      }
    });

    if (!lease) {
      return NextResponse.json(
        { error: 'Invalid or expired portal link' },
        { status: 404 }
      );
    }

    if (lease.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'This lease is no longer active' },
        { status: 403 }
      );
    }

    // Action: Create PaymentIntent for one-time payment
    if (action === 'create-payment-intent') {
      if (!isStripeConfigured()) {
        return NextResponse.json(
          { error: 'Payment processing is not configured' },
          { status: 503 }
        );
      }

      // Calculate current balance
      const currentBalance = lease.ledgerEntries.reduce((balance, entry) => {
        const amt = Number(entry.amount) || 0;
        return balance + (entry.debitCredit === 'DR' ? amt : -amt);
      }, 0);

      if (currentBalance <= 0) {
        return NextResponse.json(
          { error: 'No balance due' },
          { status: 400 }
        );
      }

      // Use provided amount or full balance
      const paymentAmount = amount ? Math.min(amount, currentBalance) : currentBalance;

      if (paymentAmount <= 0) {
        return NextResponse.json(
          { error: 'Invalid payment amount' },
          { status: 400 }
        );
      }

      // Get or create Stripe customer
      const customer = await getOrCreateCustomer(
        lease.stripeCustomerId,
        lease.tenantEmail || `tenant-${lease.id}@placeholder.com`,
        lease.tenantName,
        lease.id
      );

      if (!customer) {
        return NextResponse.json(
          { error: 'Failed to create customer' },
          { status: 500 }
        );
      }

      // Save customer ID if new
      if (!lease.stripeCustomerId) {
        await prisma.lease.update({
          where: { id: lease.id },
          data: { stripeCustomerId: customer.id }
        });
      }

      // Create PaymentIntent for ACH only
      if (!stripe) {
        return NextResponse.json(
          { error: 'Payment processing is not configured' },
          { status: 503 }
        );
      }
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(paymentAmount * 100), // Convert to cents
        currency: 'usd',
        customer: customer.id,
        payment_method_types: ['us_bank_account'],
        payment_method_options: {
          us_bank_account: {
            financial_connections: {
              permissions: ['payment_method'],
            },
          },
        },
        metadata: {
          leaseId: lease.id,
          tenantName: lease.tenantName,
          type: 'one_time_payment'
        },
        description: `Payment for ${lease.tenantName} - ${lease.propertyName || ''} ${lease.unitName}`
      });

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        amount: paymentAmount
      });
    }

    // Action: Pay with saved payment method
    if (action === 'pay-with-saved') {
      if (!lease.stripeCustomerId || !lease.stripePaymentMethodId) {
        return NextResponse.json(
          { error: 'No saved payment method found' },
          { status: 400 }
        );
      }

      // Calculate current balance
      const currentBalance = lease.ledgerEntries.reduce((balance, entry) => {
        const amt = Number(entry.amount) || 0;
        return balance + (entry.debitCredit === 'DR' ? amt : -amt);
      }, 0);

      if (currentBalance <= 0) {
        return NextResponse.json(
          { error: 'No balance due' },
          { status: 400 }
        );
      }

      const paymentAmount = amount ? Math.min(amount, currentBalance) : currentBalance;
      const chargeAmount = Math.round(paymentAmount * 100) / 100;
      const description = `Payment for ${lease.tenantName} - ${lease.propertyName || ''} ${lease.unitName}`;

      // Generate idempotency key to prevent duplicate charges
      // Format: tenant-pay-{leaseId}-{amount}-{timestamp}
      // Uses timestamp rounded to minute to allow retries within same request window
      const idempotencyKey = `tenant-pay-${lease.id}-${chargeAmount}-${Math.floor(Date.now() / 60000)}`;

      const result = await chargeCustomer(
        lease.stripeCustomerId,
        lease.stripePaymentMethodId,
        chargeAmount,
        description,
        {
          leaseId: lease.id,
          tenantName: lease.tenantName,
          type: 'one_time_payment'
        },
        idempotencyKey
      );

      if (result.success && result.paymentIntent) {
        const paymentStatus = result.paymentIntent.status;

        // Post payment to ledger
        const entryDate = new Date();

        try {
          // Include timestamp in description to ensure unique idempotency key
          const paymentDesc = `Payment: ${description} [${Date.now()}]`;

          // Determine account code based on payment status
          // ACH processing → Cash in Transit (like autopay)
          // Card or settled ACH → Operating Cash
          const cashAccountCode = result.paymentIntent.status === 'processing' ? '1001' : '1000';

          // Post atomic double-entry (both entries succeed or both fail)
          await postDoubleEntry({
            debitEntry: {
              entryDate,
              accountCode: cashAccountCode, // 1001 for ACH processing, 1000 for settled
              amount: chargeAmount,
              debitCredit: 'DR',
              description: paymentDesc,
              leaseId: lease.id,
              postedBy: 'tenant_portal'
            },
            creditEntry: {
              entryDate,
              accountCode: '1200',
              amount: chargeAmount,
              debitCredit: 'CR',
              description: paymentDesc,
              leaseId: lease.id,
              postedBy: 'tenant_portal'
            }
          });
        } catch (ledgerError: any) {
          console.error('Failed to post ledger entries:', ledgerError);
          // Still return success since payment went through, but log the error
        }

        // Update last payment info
        await prisma.lease.update({
          where: { id: lease.id },
          data: {
            stripeLastPaymentDate: new Date(),
            stripeLastPaymentStatus: paymentStatus === 'succeeded' ? 'succeeded' : 'processing'
          }
        });

        // Different message for processing vs succeeded
        const message = paymentStatus === 'processing'
          ? `Payment of $${chargeAmount.toFixed(2)} is processing. ACH payments typically take 3-5 business days to complete.`
          : `Payment of $${chargeAmount.toFixed(2)} processed successfully!`;

        return NextResponse.json({
          success: true,
          message,
          amountPaid: chargeAmount,
          status: paymentStatus
        });
      } else {
        return NextResponse.json(
          { error: result.error || 'Payment failed' },
          { status: 400 }
        );
      }
    }

    // Action: Confirm payment (called after Stripe Elements confirmation)
    if (action === 'confirm-payment') {
      const { paymentIntentId } = body;

      if (!paymentIntentId) {
        return NextResponse.json(
          { error: 'Payment intent ID is required' },
          { status: 400 }
        );
      }

      // Retrieve payment intent to verify status
      if (!stripe) {
        return NextResponse.json(
          { error: 'Payment processing is not configured' },
          { status: 503 }
        );
      }
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') {
        const chargeAmount = paymentIntent.amount / 100; // Convert from cents
        const baseDescription = paymentIntent.description || `Payment for ${lease.tenantName}`;
        // Include paymentIntentId to ensure unique idempotency key
        const paymentDesc = `Payment: ${baseDescription} [${paymentIntentId}]`;

        // Post payment to ledger (atomic double-entry)
        const entryDate = new Date();

        // Determine account code based on payment status
        // ACH processing → Cash in Transit (like autopay)
        // Card or settled ACH → Operating Cash
        const cashAccountCode = paymentIntent.status === 'processing' ? '1001' : '1000';

        await postDoubleEntry({
          debitEntry: {
            entryDate,
            accountCode: cashAccountCode, // 1001 for ACH processing, 1000 for settled
            amount: chargeAmount,
            debitCredit: 'DR',
            description: paymentDesc,
            leaseId: lease.id,
            postedBy: 'tenant_portal'
          },
          creditEntry: {
            entryDate,
            accountCode: '1200',
            amount: chargeAmount,
            debitCredit: 'CR',
            description: paymentDesc,
            leaseId: lease.id,
            postedBy: 'tenant_portal'
          }
        });

        // Update last payment info
        await prisma.lease.update({
          where: { id: lease.id },
          data: {
            stripeLastPaymentDate: new Date(),
            stripeLastPaymentStatus: paymentIntent.status === 'succeeded' ? 'succeeded' : 'processing'
          }
        });

        const message = paymentIntent.status === 'processing'
          ? `Payment of $${chargeAmount.toFixed(2)} is processing. ACH payments typically take 3-5 business days.`
          : `Payment of $${chargeAmount.toFixed(2)} processed successfully!`;

        return NextResponse.json({
          success: true,
          message,
          amountPaid: chargeAmount,
          status: paymentIntent.status
        });
      } else {
        return NextResponse.json(
          { error: `Payment failed with status: ${paymentIntent.status}` },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('POST /api/tenant/[token]/pay error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process payment' },
      { status: 500 }
    );
  }
}
