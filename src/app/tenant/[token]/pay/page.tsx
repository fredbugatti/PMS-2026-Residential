'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

interface PaymentData {
  currentBalance: number;
  stripeConfigured: boolean;
  hasPaymentMethod: boolean;
  autopayEnabled: boolean;
  savedPaymentMethod: {
    type: string;
    last4: string;
    bankName: string | null;
  } | null;
}

// Payment Form Component (for new payment method)
function NewPaymentForm({
  token,
  amount,
  onSuccess,
  onCancel
}: {
  token: string;
  amount: number;
  onSuccess: (message: string) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !ready) {
      setError('Payment form is still loading. Please wait.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Failed to submit form');
        setSubmitting(false);
        return;
      }

      // Use confirmPayment with redirect handling for ACH
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/tenant/${token}/pay?success=true`,
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        // Handle specific ACH errors
        if (stripeError.type === 'validation_error') {
          setError(stripeError.message || 'Please check your bank account details');
        } else {
          setError(stripeError.message || 'Payment failed');
        }
        setSubmitting(false);
        return;
      }

      if (paymentIntent) {
        // ACH payments typically go to 'processing' status, not 'succeeded' immediately
        if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing' || paymentIntent.status === 'requires_action') {
          // Confirm with our API
          const res = await fetch(`/api/tenant/${token}/pay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'confirm-payment',
              paymentIntentId: paymentIntent.id
            })
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || 'Failed to confirm payment');
          }

          onSuccess(data.message);
        } else {
          setError(`Payment status: ${paymentIntent.status}. Please try again.`);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Bank Account Details
        </label>
        <div className="border border-slate-300 rounded-lg p-4 bg-white">
          <PaymentElement
            onReady={() => setReady(true)}
            onLoadError={(e) => setError(`Failed to load: ${e.error.message}`)}
            options={{ layout: 'tabs' }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || !ready || submitting}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-lg disabled:opacity-50"
        >
          {submitting ? 'Processing...' : `Pay ${formatCurrency(amount)}`}
        </button>
      </div>
    </form>
  );
}

export default function TenantPay() {
  const params = useParams();
  const token = Array.isArray(params.token) ? params.token[0] : params.token as string;

  const [data, setData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPaymentData();

    // Check for success redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setSuccess('Payment processed successfully!');
      window.history.replaceState({}, '', `/tenant/${token}/pay`);
    }
  }, [token]);

  const fetchPaymentData = async () => {
    try {
      const res = await fetch(`/api/tenant/${token}/pay`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to load payment data');
      }
      const payData = await res.json();
      setData(payData);
      setPaymentAmount(payData.currentBalance);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithSaved = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/tenant/${token}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pay-with-saved',
          amount: paymentAmount
        })
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Payment failed');
      }

      setSuccess(result.message);
      fetchPaymentData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayWithNew = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/tenant/${token}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-payment-intent',
          amount: paymentAmount
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to initialize payment');
      }

      const { clientSecret: secret, amount } = await res.json();
      setClientSecret(secret);
      setPaymentAmount(amount);
      setShowPaymentForm(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = (message: string) => {
    setSuccess(message);
    setShowPaymentForm(false);
    setClientSecret(null);
    fetchPaymentData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-slate-600 font-medium">Loading...</div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl shadow-xl p-12 max-w-md">
          <div className="mb-4"><svg className="h-14 w-14 text-red-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  const stripeAvailable = stripePromise && data?.stripeConfigured;
  const hasBalance = (data?.currentBalance || 0) > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/tenant/${token}`}
              className="text-white/80 hover:text-white transition-colors"
            >
              ← Back to Portal
            </Link>
          </div>
          <h1 className="text-2xl font-bold mt-4">Pay Balance</h1>
          <p className="text-green-100 mt-1">Make a one-time payment</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {success}
              </div>
              <Link
                href={`/tenant/${token}`}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
              >
                Return to Portal
              </Link>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && data && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Balance Card */}
        {!showPaymentForm && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-8 mb-6">
            <div className="text-center mb-8">
              <div className="text-sm text-slate-600 mb-2">Current Balance Due</div>
              <div className={`text-3xl sm:text-5xl font-bold ${hasBalance ? 'text-slate-900' : 'text-green-600'}`}>
                {formatCurrency(data?.currentBalance || 0)}
              </div>
              {!hasBalance && (
                <div className="mt-2 text-green-600 font-medium">No balance due</div>
              )}
            </div>

            {hasBalance && stripeAvailable && (
              <>
                {/* Pay with saved method */}
                {data?.hasPaymentMethod && data.savedPaymentMethod && (
                  <div className="mb-6">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-slate-600">Saved Bank Account</div>
                          <div className="font-medium text-slate-900">
                            Account ending in {data.savedPaymentMethod.last4}
                          </div>
                          {data.savedPaymentMethod.bankName && (
                            <div className="text-sm text-slate-500">{data.savedPaymentMethod.bankName}</div>
                          )}
                        </div>
                        <button
                          onClick={handlePayWithSaved}
                          disabled={submitting}
                          className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-lg disabled:opacity-50"
                        >
                          {submitting ? 'Processing...' : `Pay ${formatCurrency(data.currentBalance)}`}
                        </button>
                      </div>
                    </div>

                    <div className="text-center text-slate-500 text-sm mb-4">— or —</div>
                  </div>
                )}

                {/* Pay with new/different bank account */}
                <button
                  onClick={handlePayWithNew}
                  disabled={submitting}
                  className={`w-full px-6 py-4 rounded-xl font-medium transition-all ${
                    data?.hasPaymentMethod
                      ? 'border border-green-600 text-green-600 hover:bg-green-50'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg'
                  } disabled:opacity-50`}
                >
                  {submitting ? 'Loading...' : data?.hasPaymentMethod ? 'Use Different Bank Account' : 'Pay with Bank Account'}
                </button>

                <p className="text-center text-sm text-slate-500 mt-4">
                  Securely connect your bank account via ACH transfer
                </p>
              </>
            )}

            {hasBalance && !stripeAvailable && (
              <div className="text-center text-slate-500">
                Online payments are not currently available. Please contact your property manager.
              </div>
            )}

            {!hasBalance && (
              <div className="text-center">
                <Link
                  href={`/tenant/${token}`}
                  className="inline-block px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                >
                  Return to Portal
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Payment Form */}
        {showPaymentForm && clientSecret && stripePromise && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Pay {formatCurrency(paymentAmount)}</h2>
              <button
                onClick={() => {
                  setShowPaymentForm(false);
                  setClientSecret(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#059669',
                    colorBackground: '#ffffff',
                    colorText: '#1f2937',
                    colorDanger: '#ef4444',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    borderRadius: '8px',
                  },
                },
              }}
            >
              <NewPaymentForm
                token={token}
                amount={paymentAmount}
                onSuccess={handlePaymentSuccess}
                onCancel={() => {
                  setShowPaymentForm(false);
                  setClientSecret(null);
                }}
              />
            </Elements>

            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-slate-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-slate-600">
                  <strong>ACH Payments</strong>
                  <p className="mt-1">Bank transfers typically take 3-5 business days to complete. Your payment will be marked as processing until confirmed.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Autopay Promotion */}
        {!showPaymentForm && hasBalance && !data?.autopayEnabled && stripeAvailable && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-blue-900">Set Up Autopay</h3>
                <p className="text-blue-800 text-sm mt-1">
                  Never miss a payment. Set up automatic monthly payments and save time.
                </p>
                <Link
                  href={`/tenant/${token}/autopay`}
                  className="inline-block mt-3 text-blue-600 font-medium hover:text-blue-700"
                >
                  Set up autopay →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
