import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { prisma, postEntry } from '@/lib/accounting';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook not configured' },
      { status: 503 }
    );
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      case 'setup_intent.succeeded': {
        const setupIntent = event.data.object as Stripe.SetupIntent;
        console.log('SetupIntent succeeded:', setupIntent.id);
        // Payment method was successfully saved
        break;
      }

      case 'charge.succeeded': {
        // ACH payments may come through as charge events
        const charge = event.data.object as Stripe.Charge;
        if (charge.payment_method_details?.type === 'us_bank_account') {
          console.log('ACH charge succeeded:', charge.id);
        }
        break;
      }

      case 'charge.failed': {
        const charge = event.data.object as Stripe.Charge;
        console.log('Charge failed:', charge.id, charge.failure_message);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const leaseId = paymentIntent.metadata?.leaseId;

  if (!leaseId) {
    console.log('No leaseId in payment metadata, skipping');
    return;
  }

  // Check if this payment was already recorded
  const existingEntry = await prisma.ledgerEntry.findFirst({
    where: {
      idempotencyKey: {
        contains: paymentIntent.id
      }
    }
  });

  if (existingEntry) {
    console.log('Payment already recorded:', paymentIntent.id);
    return;
  }

  const lease = await prisma.lease.findUnique({
    where: { id: leaseId }
  });

  if (!lease) {
    console.log('Lease not found:', leaseId);
    return;
  }

  const amount = paymentIntent.amount / 100; // Convert from cents
  const entryDate = new Date().toISOString().split('T')[0];
  const description = paymentIntent.description || `Payment from ${lease.tenantName}`;

  // Post payment to ledger
  await postEntry({
    entryDate,
    accountCode: '1200', // Accounts Receivable
    amount,
    debitCredit: 'CR',
    description: `Stripe Payment: ${description}`,
    leaseId,
    postedBy: 'stripe-webhook',
    idempotencyKey: `stripe-${paymentIntent.id}-ar`
  });

  await postEntry({
    entryDate,
    accountCode: '1000', // Operating Cash
    amount,
    debitCredit: 'DR',
    description: `Stripe Payment: ${description}`,
    leaseId,
    postedBy: 'stripe-webhook',
    idempotencyKey: `stripe-${paymentIntent.id}-cash`
  });

  // Update lease payment status
  await prisma.lease.update({
    where: { id: leaseId },
    data: {
      stripeLastPaymentDate: new Date(),
      stripeLastPaymentStatus: 'succeeded'
    }
  });

  console.log('Payment recorded for lease:', leaseId, 'Amount:', amount);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const leaseId = paymentIntent.metadata?.leaseId;

  if (!leaseId) {
    console.log('No leaseId in payment metadata, skipping');
    return;
  }

  const lease = await prisma.lease.findUnique({
    where: { id: leaseId }
  });

  if (!lease) {
    console.log('Lease not found:', leaseId);
    return;
  }

  // Update lease with failed status
  await prisma.lease.update({
    where: { id: leaseId },
    data: {
      stripeLastPaymentDate: new Date(),
      stripeLastPaymentStatus: 'failed'
    }
  });

  console.log('Payment failed for lease:', leaseId);

  // TODO: Send notification email to tenant and property manager
}
