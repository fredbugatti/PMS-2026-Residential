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

// Initialize Stripe with publishable key
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

const stripePromise = publishableKey
  ? loadStripe(publishableKey)
  : null;

interface AutopayData {
  autopayEnabled: boolean;
  autopayDay: number | null;
  autopayMethod: string | null;
  autopayLast4: string | null;
  autopaySetupDate: string | null;
  autopayBankName: string | null;
  monthlyRent: number | null;
  currentBalance: number | null;
  chargeDay: number | null;
  stripeConfigured: boolean;
  hasPaymentMethod: boolean;
  lastPaymentDate: string | null;
  lastPaymentStatus: string | null;
}

// Payment Form Component (inside Elements provider)
function PaymentForm({
  token,
  autopayDay,
  onSuccess,
  onCancel
}: {
  token: string;
  autopayDay: number;
  onSuccess: (message: string) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !ready) {
      setError('Payment form is still loading. Please wait a moment and try again.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Submit the form first
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Failed to submit form');
        setSubmitting(false);
        return;
      }

      // Confirm the SetupIntent with the payment element
      const { error: stripeError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/tenant/${token}/autopay?success=true`,
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        setError(stripeError.message || 'Failed to set up payment method');
        setSubmitting(false);
        return;
      }

      if (setupIntent && (setupIntent.status === 'succeeded' || setupIntent.status === 'processing')) {
        // For ACH, status may be 'processing' initially
        // Confirm with our API and charge balance if any
        const res = await fetch(`/api/tenant/${token}/autopay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'confirm-setup',
            paymentMethodId: setupIntent.payment_method,
            autopayDay
          })
        });

        const responseData = await res.json();

        if (!res.ok) {
          throw new Error(responseData.error || 'Failed to save payment method');
        }

        onSuccess(responseData.message || 'Autopay has been set up successfully!');
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
            onLoadError={(e) => setError(`Failed to load payment form: ${e.error.message}`)}
            options={{
              layout: 'tabs',
            }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Connect your bank account securely via Stripe. ACH transfers typically have lower fees than card payments.
        </p>
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
          className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Processing...' : 'Enable Autopay'}
        </button>
      </div>
    </form>
  );
}

export default function TenantAutopay() {
  const params = useParams();
  const token = Array.isArray(params.token) ? params.token[0] : params.token as string;

  const [data, setData] = useState<AutopayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [autopayDay, setAutopayDay] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAutopayData();

    // Check for success redirect from Stripe
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setSuccess('Autopay has been set up successfully!');
      // Clean URL
      window.history.replaceState({}, '', `/tenant/${token}/autopay`);
    }
  }, [token]);

  const fetchAutopayData = async () => {
    try {
      const res = await fetch(`/api/tenant/${token}/autopay`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to load autopay data');
      }
      const autopayData = await res.json();
      setData(autopayData);
      if (autopayData.chargeDay) {
        setAutopayDay(autopayData.chargeDay);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSetup = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/tenant/${token}/autopay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-setup-intent' })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to initialize payment setup');
      }

      const { clientSecret: secret } = await res.json();
      setClientSecret(secret);
      setShowSetupForm(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetupSuccess = (message: string) => {
    setSuccess(message);
    setShowSetupForm(false);
    setClientSecret(null);
    fetchAutopayData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
          <p className="text-sm text-slate-500">Please contact your property manager for assistance.</p>
        </div>
      </div>
    );
  }

  // Check if Stripe is configured
  const stripeAvailable = stripePromise && data?.stripeConfigured;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/tenant/${token}`}
              className="text-white/80 hover:text-white transition-colors"
            >
              ← Back to Portal
            </Link>
          </div>
          <h1 className="text-2xl font-bold mt-4">Autopay Settings</h1>
          <p className="text-blue-100 mt-1">
            Set up automatic rent payments
          </p>
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

        {/* Stripe Not Configured Warning */}
        {!stripeAvailable && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <strong>Payment Processing Not Available</strong>
                <p className="mt-1 text-sm">Online payments are not yet configured. Please contact your property manager for payment options.</p>
              </div>
            </div>
          </div>
        )}

        {/* Current Autopay Status */}
        {!showSetupForm && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-8 mb-6">
            {data?.autopayEnabled ? (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Autopay is Active</h2>
                    <p className="text-slate-600">Your rent will be paid automatically each month</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-6 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-slate-600 mb-1">Payment Method</div>
                      <div className="font-medium text-slate-900">
                        {data.autopayMethod === 'ACH' ? 'Bank Account (ACH)' : 'Credit/Debit Card'}
                        {data.autopayLast4 && ` ending in ${data.autopayLast4}`}
                      </div>
                      {data.autopayBankName && (
                        <div className="text-sm text-slate-500">{data.autopayBankName}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm text-slate-600 mb-1">Payment Day</div>
                      <div className="font-medium text-slate-900">
                        {data.autopayDay}{getOrdinalSuffix(data.autopayDay || 1)} of each month
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600 mb-1">Monthly Rent</div>
                      <div className="font-medium text-slate-900">
                        {data.monthlyRent ? formatCurrency(data.monthlyRent) : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600 mb-1">Setup Date</div>
                      <div className="font-medium text-slate-900">
                        {data.autopaySetupDate
                          ? new Date(data.autopaySetupDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {data.lastPaymentDate && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="text-sm text-blue-800">
                      <strong>Last Payment:</strong>{' '}
                      {new Date(data.lastPaymentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      {data.lastPaymentStatus && (
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                          data.lastPaymentStatus === 'succeeded' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {data.lastPaymentStatus}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {stripeAvailable && (
                  <div className="flex gap-4">
                    <button
                      onClick={handleStartSetup}
                      disabled={submitting}
                      className="flex-1 px-6 py-3 border border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors font-medium disabled:opacity-50"
                    >
                      Update Bank Account
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Set Up Autopay</h2>
                  <p className="text-slate-600 mb-6 max-w-md mx-auto">
                    Connect your bank account for automatic rent payments via ACH transfer.
                  </p>
                  {(data?.currentBalance !== null && data?.currentBalance !== undefined) && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 inline-block">
                      <div className="text-sm text-blue-600 mb-1">Current Balance Due</div>
                      <div className={`text-2xl font-bold ${data.currentBalance > 0 ? 'text-blue-900' : 'text-green-600'}`}>
                        {data.currentBalance > 0 ? formatCurrency(data.currentBalance) : '$0.00'}
                      </div>
                      {data.monthlyRent && (
                        <div className="text-xs text-slate-500 mt-1">
                          Monthly rent: {formatCurrency(data.monthlyRent)}
                        </div>
                      )}
                    </div>
                  )}
                  {stripeAvailable ? (
                    <div>
                      <button
                        onClick={handleStartSetup}
                        disabled={submitting}
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium text-lg shadow-lg hover:shadow-xl disabled:opacity-50"
                      >
                        {submitting ? 'Loading...' : 'Connect Bank Account'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">
                      Online autopay setup is not currently available.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Stripe Payment Setup Form */}
        {showSetupForm && clientSecret && stripePromise && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {data?.autopayEnabled ? 'Update Bank Account' : 'Connect Bank Account'}
              </h2>
              <button
                onClick={() => {
                  setShowSetupForm(false);
                  setClientSecret(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Payment Day Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Payment Day
              </label>
              <select
                value={autopayDay}
                onChange={(e) => setAutopayDay(parseInt(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>
                    {day}{getOrdinalSuffix(day)} of each month
                    {day === data?.chargeDay && ' (recommended - same as rent due date)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Balance Info */}
            {(data?.currentBalance !== null && data?.currentBalance !== undefined) && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-800">Current balance due:</span>
                  <span className={`text-xl font-bold ${data.currentBalance > 0 ? 'text-blue-900' : 'text-green-600'}`}>
                    {data.currentBalance > 0 ? formatCurrency(data.currentBalance) : '$0.00'}
                  </span>
                </div>
                {data.monthlyRent && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Monthly rent:</span>
                    <span className="text-slate-800">{formatCurrency(data.monthlyRent)}</span>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  Your balance will be automatically charged on the selected day each month.
                </p>
              </div>
            )}

            {/* Stripe Elements */}
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#4f46e5',
                    colorBackground: '#ffffff',
                    colorText: '#1f2937',
                    colorDanger: '#ef4444',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    borderRadius: '8px',
                  },
                },
              }}
            >
              <PaymentForm
                token={token}
                autopayDay={autopayDay}
                onSuccess={handleSetupSuccess}
                onCancel={() => {
                  setShowSetupForm(false);
                  setClientSecret(null);
                }}
              />
            </Elements>

            {/* Security Note */}
            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-slate-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div className="text-sm text-slate-600">
                  <strong>Secure Bank Connection</strong>
                  <p className="mt-1">Your bank account is connected securely via Stripe Financial Connections. We never store your bank login credentials.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Benefits Section */}
        {!showSetupForm && !data?.autopayEnabled && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Why Set Up Autopay?</h3>
            <div className="grid gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-slate-900">Never Miss a Payment</div>
                  <div className="text-sm text-slate-600">Your rent is paid automatically on time, every month</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-slate-900">Save Time</div>
                  <div className="text-sm text-slate-600">No need to remember payment dates or write checks</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-slate-900">Avoid Late Fees</div>
                  <div className="text-sm text-slate-600">Automatic payments help you avoid late payment penalties</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-slate-900">Secure Payments</div>
                  <div className="text-sm text-slate-600">Bank-level encryption protects your payment information</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
