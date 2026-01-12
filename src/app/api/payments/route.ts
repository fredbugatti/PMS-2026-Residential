import { NextRequest } from 'next/server';
import { postDoubleEntry } from '@/lib/accounting';
import { validate, paymentSchema } from '@/lib/validation';
import { handleApiError, apiCreated, checkRateLimit, rateLimitResponse, getClientIdentifier } from '@/lib/api-utils';

// POST /api/payments - Record a payment (posts 2 entries: DR Cash, CR AR)
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 30 payments per minute per client
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit('payments', clientId, { windowMs: 60000, maxRequests: 30 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetIn);
    }

    const body = await request.json();

    // Validate input
    const { amount, leaseId, description, paymentDate } = validate(paymentSchema, body);

    const entryDate = paymentDate ? new Date(paymentDate) : new Date();
    const finalDescription = description || 'Payment received';

    // Post both entries atomically - if either fails, both roll back
    const { debit: cashEntry, credit: arEntry } = await postDoubleEntry({
      debitEntry: {
        accountCode: '1000',
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

    return apiCreated(
      { entries: [cashEntry, arEntry] },
      `Payment of $${amount} recorded successfully`
    );

  } catch (error) {
    return handleApiError(error, 'POST /api/payments');
  }
}
