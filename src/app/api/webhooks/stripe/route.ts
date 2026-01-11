import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma, postEntry } from '@/lib/accounting';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// POST /api/webhooks/stripe - Handle Stripe webhook events
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('[Webhook] Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature (skip in development if no secret configured)
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // In development without webhook secret, parse directly (NOT SECURE FOR PRODUCTION)
      console.warn('[Webhook] No STRIPE_WEBHOOK_SECRET configured - skipping signature verification');
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
    console.log(`[Webhook] Event ${event.id} already processed, skipping`);
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

  console.log(`[Webhook] Processing event: ${event.type} (${event.id})`);

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
        console.log(`[Webhook] Ignoring event type: ${event.type}`);
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

  console.log(`[Webhook] Payment succeeded: ${paymentIntent.id}, amount: $${amount}, leaseId: ${leaseId}`);

  if (!leaseId) {
    console.log('[Webhook] No leaseId in metadata, skipping ledger update');
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

  // Note: Ledger entries should already be posted when payment was initiated
  // This webhook confirms the ACH completed successfully
  // If we need to post entries here (e.g., payment was pending), we would do it here

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

  console.log(`[Webhook] Payment ${paymentIntent.id} confirmed successful for lease ${leaseId}`);
}

// Handle failed payment (ACH rejected by bank)
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent, webhookEventId: string) {
  const leaseId = paymentIntent.metadata?.leaseId;
  const amount = paymentIntent.amount / 100;
  const failureMessage = paymentIntent.last_payment_error?.message || 'Payment failed';

  console.log(`[Webhook] Payment failed: ${paymentIntent.id}, amount: $${amount}, reason: ${failureMessage}`);

  if (!leaseId) {
    console.log('[Webhook] No leaseId in metadata, skipping');
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
  // We need to find the original entries and post reversing entries
  const entryDate = new Date();
  const reversalDesc = `REVERSED: Payment failed - ${failureMessage} [${paymentIntent.id}]`;

  try {
    // Debit AR back (increase what tenant owes again)
    await postEntry({
      entryDate,
      accountCode: '1200',
      amount,
      debitCredit: 'DR',
      description: reversalDesc,
      leaseId,
      postedBy: 'webhook_reversal'
    });

    // Credit Cash back (decrease cash)
    await postEntry({
      entryDate,
      accountCode: '1000',
      amount,
      debitCredit: 'CR',
      description: reversalDesc,
      leaseId,
      postedBy: 'webhook_reversal'
    });

    console.log(`[Webhook] Posted reversal entries for failed payment ${paymentIntent.id}`);
  } catch (err: any) {
    console.error('[Webhook] Failed to post reversal entries:', err.message);
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

  console.log(`[Webhook] Payment ${paymentIntent.id} failed for lease ${leaseId}, ledger reversed`);

  // TODO: Send email notification to admin about failed payment
}

// Handle payment processing (ACH submitted to bank)
async function handlePaymentProcessing(paymentIntent: Stripe.PaymentIntent, webhookEventId: string) {
  const leaseId = paymentIntent.metadata?.leaseId;
  const amount = paymentIntent.amount / 100;

  console.log(`[Webhook] Payment processing: ${paymentIntent.id}, amount: $${amount}`);

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

  console.log(`[Webhook] Setup succeeded for customer ${customerId}, payment method: ${paymentMethodId}`);

  // Find lease by customer ID and update payment method if needed
  if (customerId) {
    const lease = await prisma.lease.findUnique({
      where: { stripeCustomerId: customerId }
    });

    if (lease && paymentMethodId) {
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

        console.log(`[Webhook] Updated payment method for lease ${lease.id}`);
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
