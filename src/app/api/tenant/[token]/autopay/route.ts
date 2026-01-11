import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';
import {
  isStripeConfigured,
  getOrCreateCustomer,
  createSetupIntent,
  getPaymentMethod,
  getPaymentMethodDisplay,
  detachPaymentMethod
} from '@/lib/stripe';

// GET /api/tenant/[token]/autopay - Get autopay status
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
        autopayEnabled: true,
        autopayDay: true,
        autopayMethod: true,
        autopayLast4: true,
        autopaySetupDate: true,
        autopayBankName: true,
        stripeCustomerId: true,
        stripePaymentMethodId: true,
        stripeLastPaymentDate: true,
        stripeLastPaymentStatus: true,
        scheduledCharges: {
          where: { accountCode: '4000', active: true },
          select: { amount: true, chargeDay: true }
        },
        ledgerEntries: {
          where: {
            accountCode: '1200' // Only Accounts Receivable entries for tenant balance
          },
          select: {
            amount: true,
            debitCredit: true
          }
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

    const rentCharge = lease.scheduledCharges[0];

    // Calculate current balance from ledger entries
    // Positive balance = tenant owes money (debits > credits)
    const currentBalance = lease.ledgerEntries.reduce((balance, entry) => {
      const amount = Number(entry.amount) || 0;
      return balance + (entry.debitCredit === 'DR' ? amount : -amount);
    }, 0);

    return NextResponse.json({
      autopayEnabled: lease.autopayEnabled,
      autopayDay: lease.autopayDay,
      autopayMethod: lease.autopayMethod,
      autopayLast4: lease.autopayLast4,
      autopaySetupDate: lease.autopaySetupDate,
      autopayBankName: lease.autopayBankName,
      monthlyRent: rentCharge ? Number(rentCharge.amount) : null,
      currentBalance: currentBalance,
      chargeDay: rentCharge?.chargeDay || null,
      stripeConfigured: isStripeConfigured(),
      hasPaymentMethod: !!lease.stripePaymentMethodId,
      lastPaymentDate: lease.stripeLastPaymentDate,
      lastPaymentStatus: lease.stripeLastPaymentStatus
    });

  } catch (error: any) {
    console.error('GET /api/tenant/[token]/autopay error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get autopay status' },
      { status: 500 }
    );
  }
}

// POST /api/tenant/[token]/autopay/setup-intent - Create Stripe SetupIntent
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { action } = body;

    const lease = await prisma.lease.findUnique({
      where: { portalToken: token },
      select: {
        id: true,
        status: true,
        tenantName: true,
        tenantEmail: true,
        stripeCustomerId: true,
        stripePaymentMethodId: true,
        scheduledCharges: {
          where: { accountCode: '4000', active: true },
          select: { chargeDay: true }
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

    // Action: Create SetupIntent for adding payment method
    if (action === 'create-setup-intent') {
      if (!isStripeConfigured()) {
        return NextResponse.json(
          { error: 'Payment processing is not configured' },
          { status: 503 }
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

      // Create SetupIntent
      const setupIntent = await createSetupIntent(customer.id);

      if (!setupIntent) {
        return NextResponse.json(
          { error: 'Failed to create setup intent' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        clientSecret: setupIntent.client_secret,
        customerId: customer.id
      });
    }

    // Action: Confirm payment method and enable autopay
    if (action === 'confirm-setup') {
      const { paymentMethodId, autopayDay } = body;

      if (!paymentMethodId) {
        return NextResponse.json(
          { error: 'Payment method ID is required' },
          { status: 400 }
        );
      }

      // Get payment method details from Stripe
      const paymentMethod = await getPaymentMethod(paymentMethodId);

      if (!paymentMethod) {
        return NextResponse.json(
          { error: 'Invalid payment method' },
          { status: 400 }
        );
      }

      const displayInfo = getPaymentMethodDisplay(paymentMethod);
      const payDay = autopayDay || lease.scheduledCharges[0]?.chargeDay || 1;

      // Update lease with autopay settings
      // Note: ACH bank payments require verification before charging,
      // so we just enable autopay here. The cron job will charge on the scheduled day.
      const updatedLease = await prisma.lease.update({
        where: { id: lease.id },
        data: {
          autopayEnabled: true,
          autopayDay: payDay,
          autopayMethod: displayInfo.type,
          autopayLast4: displayInfo.last4,
          autopaySetupDate: new Date(),
          autopayBankName: displayInfo.bankName || displayInfo.brand || null,
          stripePaymentMethodId: paymentMethodId
        },
        select: {
          autopayEnabled: true,
          autopayDay: true,
          autopayMethod: true,
          autopayLast4: true,
          autopaySetupDate: true,
          autopayBankName: true
        }
      });

      return NextResponse.json({
        success: true,
        message: `Autopay enabled! Your balance will be charged on the ${payDay}${getOrdinalSuffix(payDay)} of each month.`,
        ...updatedLease
      });
    }

    function getOrdinalSuffix(day: number): string {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('POST /api/tenant/[token]/autopay error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

// DELETE /api/tenant/[token]/autopay - Cancel autopay
export async function DELETE(
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
        stripePaymentMethodId: true
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

    // Detach payment method from Stripe if exists
    if (lease.stripePaymentMethodId) {
      await detachPaymentMethod(lease.stripePaymentMethodId);
    }

    // Cancel autopay
    await prisma.lease.update({
      where: { id: lease.id },
      data: {
        autopayEnabled: false,
        autopayDay: null,
        autopayMethod: null,
        autopayLast4: null,
        autopaySetupDate: null,
        autopayBankName: null,
        stripePaymentMethodId: null
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Autopay has been cancelled'
    });

  } catch (error: any) {
    console.error('DELETE /api/tenant/[token]/autopay error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel autopay' },
      { status: 500 }
    );
  }
}
