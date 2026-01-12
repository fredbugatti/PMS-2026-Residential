import { NextRequest } from 'next/server';
import { prisma, postDoubleEntry } from '@/lib/accounting';
import { validate, receiveDepositSchema } from '@/lib/validation';
import { handleApiError, apiCreated, checkRateLimit, rateLimitResponse, getClientIdentifier } from '@/lib/api-utils';

// POST /api/deposits/receive - Record deposit received (DR Cash / CR Deposits Held)
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 30 deposits per minute per client
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit('deposits-receive', clientId, { windowMs: 60000, maxRequests: 30 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetIn);
    }

    const body = await request.json();

    // Validate input
    const { amount, leaseId, description, depositDate } = validate(receiveDepositSchema, body);

    // Parse and validate receipt date
    const entryDate = depositDate ? new Date(depositDate) : new Date();

    // Get lease info for description
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      select: { tenantName: true, unitName: true }
    });

    if (!lease) {
      throw new Error('Lease not found');
    }

    const finalDescription = description || `Security deposit received - ${lease.tenantName} (${lease.unitName})`;

    // Post both entries atomically - if either fails, both roll back
    const { debit: cashEntry, credit: depositEntry } = await postDoubleEntry({
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
        accountCode: '2100',
        amount,
        debitCredit: 'CR',
        description: finalDescription,
        entryDate,
        leaseId,
        postedBy: 'user'
      }
    });

    return apiCreated(
      { entries: [cashEntry, depositEntry] },
      `Deposit of $${amount} received and recorded`
    );

  } catch (error) {
    return handleApiError(error, 'POST /api/deposits/receive');
  }
}
