import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled.');
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
    apiVersion: '2025-12-15.clover',
    typescript: true,
  })
  : null;

// Check if Stripe is configured
export const isStripeConfigured = () => !!stripe;

// Create a Stripe customer for a tenant
export async function createCustomer(
  email: string,
  name: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer | null> {
  if (!stripe) return null;

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      ...metadata,
      source: 'pms_tenant_portal'
    }
  });

  return customer;
}

// Get or create a customer
export async function getOrCreateCustomer(
  customerId: string | null,
  email: string,
  name: string,
  leaseId: string
): Promise<Stripe.Customer | null> {
  if (!stripe) return null;

  // If we have a customer ID, try to retrieve it
  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted) {
        return customer as Stripe.Customer;
      }
    } catch (error) {
      // Customer not found, create new one
    }
  }

  // Create new customer
  return createCustomer(email, name, { leaseId });
}

// Create a SetupIntent for saving payment method (ACH only)
export async function createSetupIntent(
  customerId: string
): Promise<Stripe.SetupIntent | null> {
  if (!stripe) return null;

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['us_bank_account'],
    payment_method_options: {
      us_bank_account: {
        verification_method: 'automatic',
      },
    },
    usage: 'off_session', // Allow charging when customer is not present
  });

  return setupIntent;
}

// Attach a payment method to a customer and set as default
export async function attachPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.PaymentMethod | null> {
  if (!stripe) return null;

  // Attach the payment method to the customer
  const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });

  // Set as default payment method
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  return paymentMethod;
}

// Get payment method details
export async function getPaymentMethod(
  paymentMethodId: string
): Promise<Stripe.PaymentMethod | null> {
  if (!stripe) return null;

  try {
    return await stripe.paymentMethods.retrieve(paymentMethodId);
  } catch (error) {
    return null;
  }
}

// Detach a payment method from customer
export async function detachPaymentMethod(
  paymentMethodId: string
): Promise<boolean> {
  if (!stripe) return false;

  try {
    await stripe.paymentMethods.detach(paymentMethodId);
    return true;
  } catch (error) {
    return false;
  }
}

// Create a PaymentIntent and charge the customer (ACH bank account)
// idempotencyKey prevents duplicate charges if the request is retried
export async function chargeCustomer(
  customerId: string,
  paymentMethodId: string,
  amount: number, // Amount in dollars
  description: string,
  metadata?: Record<string, string>,
  idempotencyKey?: string
): Promise<{ success: boolean; paymentIntent?: Stripe.PaymentIntent; error?: string }> {
  if (!stripe) {
    return { success: false, error: 'Stripe is not configured' };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        payment_method_types: ['us_bank_account'], // ACH only
        off_session: true,
        confirm: true,
        description,
        metadata: {
          ...metadata,
          source: 'pms_autopay'
        }
      },
      // Use idempotency key to prevent duplicate charges on retry
      idempotencyKey ? { idempotencyKey } : undefined
    );

    // ACH payments typically go to 'processing' first, then 'succeeded' after bank confirms
    if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') {
      return { success: true, paymentIntent };
    } else if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_confirmation') {
      return {
        success: false,
        paymentIntent,
        error: 'Payment requires additional action'
      };
    } else {
      return {
        success: false,
        paymentIntent,
        error: `Payment status: ${paymentIntent.status}`
      };
    }
  } catch (error: any) {
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return { success: false, error: error.message };
    }
    return { success: false, error: error.message || 'Payment failed' };
  }
}

// Get payment method display info
export function getPaymentMethodDisplay(paymentMethod: Stripe.PaymentMethod): {
  type: 'ACH' | 'CARD';
  last4: string;
  bankName?: string;
  brand?: string;
} {
  if (paymentMethod.type === 'us_bank_account' && paymentMethod.us_bank_account) {
    return {
      type: 'ACH',
      last4: paymentMethod.us_bank_account.last4 || '',
      bankName: paymentMethod.us_bank_account.bank_name || undefined,
    };
  } else if (paymentMethod.type === 'card' && paymentMethod.card) {
    return {
      type: 'CARD',
      last4: paymentMethod.card.last4 || '',
      brand: paymentMethod.card.brand || undefined,
    };
  }

  return { type: 'CARD', last4: '****' };
}

// List customer's payment methods
export async function listPaymentMethods(
  customerId: string,
  type?: 'card' | 'us_bank_account'
): Promise<Stripe.PaymentMethod[]> {
  if (!stripe) return [];

  const methods: Stripe.PaymentMethod[] = [];

  if (!type || type === 'card') {
    const cards = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    methods.push(...cards.data);
  }

  if (!type || type === 'us_bank_account') {
    const bankAccounts = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'us_bank_account',
    });
    methods.push(...bankAccounts.data);
  }

  return methods;
}
