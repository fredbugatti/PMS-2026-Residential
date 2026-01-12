import { NextRequest } from 'next/server';
import { z } from 'zod';
import { postDoubleEntry } from '@/lib/accounting';
import { validate, idSchema, positiveAmountSchema } from '@/lib/validation';
import { handleApiError, apiCreated, checkRateLimit, rateLimitResponse, getClientIdentifier } from '@/lib/api-utils';

// Charge-specific schema with charge type
const chargeRequestSchema = z.object({
  amount: positiveAmountSchema,
  leaseId: idSchema,
  description: z.string().max(500).optional(),
  chargeDate: z.string().optional(),
  chargeType: z.enum(['rent', 'late_fee', 'utility', 'other']).optional()
});

// POST /api/charges - Record a charge (posts 2 entries: DR AR, CR Income)
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 60 charges per minute per client
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit('charges', clientId, { windowMs: 60000, maxRequests: 60 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetIn);
    }

    const body = await request.json();

    // Validate input
    const { amount, leaseId, description, chargeDate, chargeType } = validate(chargeRequestSchema, body);

    const entryDate = chargeDate ? new Date(chargeDate) : new Date();

    // Build description based on charge type
    let finalDescription = description;
    if (!finalDescription) {
      switch (chargeType) {
        case 'rent':
          finalDescription = 'Monthly rent charge';
          break;
        case 'late_fee':
          finalDescription = 'Late fee';
          break;
        case 'utility':
          finalDescription = 'Utility charge';
          break;
        default:
          finalDescription = 'Charge';
      }
    }

    // Post both entries atomically - if either fails, both roll back
    const { debit: arEntry, credit: incomeEntry } = await postDoubleEntry({
      debitEntry: {
        accountCode: '1200',
        amount,
        debitCredit: 'DR',
        description: finalDescription,
        entryDate,
        leaseId,
        postedBy: 'user'
      },
      creditEntry: {
        accountCode: '4000',
        amount,
        debitCredit: 'CR',
        description: finalDescription,
        entryDate,
        leaseId,
        postedBy: 'user'
      }
    });

    return apiCreated(
      { entries: [arEntry, incomeEntry] },
      `Charge of $${amount} posted successfully`
    );

  } catch (error) {
    return handleApiError(error, 'POST /api/charges');
  }
}
