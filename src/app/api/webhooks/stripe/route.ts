import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma, postDoubleEntry } from '@/lib/accounting';
import { stripe } from '@/lib/stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// POST /api/webhooks/stripe - Handle Stripe webhook events
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('[Webhook] Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  if (!stripe) {
    console.error('[Webhook] Stripe not configured');
    return NextResponse.json({ error: 'Payment processing not configured' }, { status: 503 });
  }

  let event: Stripe.Event;

  try {
    // SECURITY: Always verify webhook signature in production
    if (process.env.NODE_ENV === 'production' && !webhookSecret) {
      console.error('[Webhook] CRITICAL: STRIPE_WEBHOOK_SECRET must be set in production');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    if (webhookSecret) {
      // Verify signature - this is the secure path
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // Development only - allow unverified webhooks for local testing
      console.warn('[Webhook] WARNING: Skipping signature verification (dev mode only)');
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Check if we've already processed this event (idempotency)
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { stripeEventId: event.id }
  });

  if (existingEvent?.processed) {
    return NextResponse.json({ received: true, status: 'already_processed' });
  }

  // Log the event as received
  const webhookEvent = await prisma.webhookEvent.upsert({
    where: { stripeEventId: event.id },
    create: {
      stripeEventId: event.id,
      eventType: event.type,
      status: 'received',
      rawEvent: event as any
    },
    update: {
      status: 'received'
    }
  });

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent, webhookEvent.id);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, webhookEvent.id);
        break;

      case 'payment_intent.processing':
        await handlePaymentProcessing(event.data.object as Stripe.PaymentIntent, webhookEvent.id);
        break;

      case 'setup_intent.succeeded':
        await handleSetupSucceeded(event.data.object as Stripe.SetupIntent, webhookEvent.id);
        break;

      default:
        // Log but don't process other events
        await prisma.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: { status: 'ignored', processed: true, processedAt: new Date() }
        });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`[Webhook] Error processing ${event.type}:`, error);

    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        status: 'failed',
        errorMessage: error.message,
        processedAt: new Date()
      }
    });

    // Return 200 to prevent Stripe from retrying (we've logged the error)
    return NextResponse.json({ received: true, error: error.message });
  }
}

// Handle successful payment (ACH confirmed by bank)
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent, webhookEventId: string) {
  const leaseId = paymentIntent.metadata?.leaseId;
  const amount = paymentIntent.amount / 100; // Convert from cents

  if (!leaseId) {
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: 'processed',
        processed: true,
        processedAt: new Date(),
        paymentIntentId: paymentIntent.id,
        amount
      }
    });
    return;
  }

  // Update lease payment status
  await prisma.lease.update({
    where: { id: leaseId },
    data: {
      stripeLastPaymentStatus: 'succeeded',
      stripeLastPaymentDate: new Date()
    }
  });

  // Transfer from Cash in Transit to Operating Cash (ACH confirmed)
  // Payment was initiated by autopay → debited to Transit (1001)
  // Now confirmed by bank → move to Operating Cash (1000)
  try {
    await postDoubleEntry({
      debitEntry: {
        entryDate: new Date(),
        accountCode: '1000', // Operating Cash
        amount,
        debitCredit: 'DR',
        description: `ACH Settlement Confirmed: ${paymentIntent.id}`,
        leaseId,
        postedBy: 'stripe_webhook'
      },
      creditEntry: {
        entryDate: new Date(),
        accountCode: '1001', // Cash in Transit
        amount,
        debitCredit: 'CR',
        description: `ACH Settlement Confirmed: ${paymentIntent.id}`,
        leaseId,
        postedBy: 'stripe_webhook'
      }
    });
  } catch (err: any) {
    console.error('[Webhook] Failed to post Transit → Cash transfer:', err.message);
    // Mark webhook as failed so it can be retried
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: 'failed', errorMessage: err.message }
    });
    throw err;
  }

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: {
      status: 'processed',
      processed: true,
      processedAt: new Date(),
      leaseId,
      paymentIntentId: paymentIntent.id,
      amount
    }
  });
}

// Handle failed payment (ACH rejected by bank)
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent, webhookEventId: string) {
  const leaseId = paymentIntent.metadata?.leaseId;
  const amount = paymentIntent.amount / 100;
  const failureMessage = paymentIntent.last_payment_error?.message || 'Payment failed';

  if (!leaseId) {
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: 'processed',
        processed: true,
        processedAt: new Date(),
        paymentIntentId: paymentIntent.id,
        amount,
        errorMessage: failureMessage
      }
    });
    return;
  }

  // Update lease payment status
  await prisma.lease.update({
    where: { id: leaseId },
    data: {
      stripeLastPaymentStatus: 'failed'
    }
  });

  // IMPORTANT: Reverse the ledger entries since payment was rejected
  // Autopay posted: DR Transit (1001), CR AR (1200)
  // Now reverse: DR AR (1200), CR Transit (1001)
  // Operating Cash (1000) is never touched for failed payments
  const entryDate = new Date();
  const reversalDesc = `REVERSED: Payment failed - ${failureMessage} [${paymentIntent.id}]`;

  try {
    await postDoubleEntry({
      debitEntry: {
        entryDate,
        accountCode: '1200', // Accounts Receivable (restore what tenant owes)
        amount,
        debitCredit: 'DR',
        description: reversalDesc,
        leaseId,
        postedBy: 'webhook_reversal'
      },
      creditEntry: {
        entryDate,
        accountCode: '1001', // Cash in Transit (reverse the initiated payment)
        amount,
        debitCredit: 'CR',
        description: reversalDesc,
        leaseId,
        postedBy: 'webhook_reversal'
      }
    });
  } catch (err: any) {
    console.error('[Webhook] Failed to post reversal entries:', err.message);
    // CRITICAL: Mark webhook as failed so it can be retried
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: 'failed',
        errorMessage: `Reversal failed: ${err.message}`
      }
    });
    // Throw error to return 500 to Stripe, triggering automatic retry
    throw err;
  }

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: {
      status: 'processed',
      processed: true,
      processedAt: new Date(),
      leaseId,
      paymentIntentId: paymentIntent.id,
      amount,
      errorMessage: failureMessage
    }
  });

  // TODO: Send email notification to admin about failed payment
}

// Handle payment processing (ACH submitted to bank)
async function handlePaymentProcessing(paymentIntent: Stripe.PaymentIntent, webhookEventId: string) {
  const leaseId = paymentIntent.metadata?.leaseId;
  const amount = paymentIntent.amount / 100;

  if (leaseId) {
    await prisma.lease.update({
      where: { id: leaseId },
      data: {
        stripeLastPaymentStatus: 'processing'
      }
    });
  }

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: {
      status: 'processed',
      processed: true,
      processedAt: new Date(),
      leaseId,
      paymentIntentId: paymentIntent.id,
      amount
    }
  });
}

// Handle setup intent succeeded (autopay bank account connected)
async function handleSetupSucceeded(setupIntent: Stripe.SetupIntent, webhookEventId: string) {
  const customerId = setupIntent.customer as string;
  const paymentMethodId = setupIntent.payment_method as string;

  // Find lease by customer ID and update payment method if needed
  if (customerId) {
    const lease = await prisma.lease.findUnique({
      where: { stripeCustomerId: customerId }
    });

    if (lease && paymentMethodId && stripe) {
      // Get payment method details
      try {
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

        await prisma.lease.update({
          where: { id: lease.id },
          data: {
            stripePaymentMethodId: paymentMethodId,
            autopayMethod: paymentMethod.type === 'us_bank_account' ? 'ACH' : 'CARD',
            autopayLast4: paymentMethod.us_bank_account?.last4 || paymentMethod.card?.last4,
            autopayBankName: paymentMethod.us_bank_account?.bank_name,
            autopaySetupDate: new Date()
          }
        });
      } catch (err: any) {
        console.error('[Webhook] Failed to get payment method details:', err.message);
      }
    }
  }

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: {
      status: 'processed',
      processed: true,
      processedAt: new Date()
    }
  });
}
