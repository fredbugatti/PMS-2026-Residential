import { NextRequest } from 'next/server';
import { prisma, withLedgerTransaction } from '@/lib/accounting';
import { validate, returnDepositSchema } from '@/lib/validation';
import { handleApiError, apiCreated, checkRateLimit, rateLimitResponse, getClientIdentifier } from '@/lib/api-utils';

// POST /api/deposits/return - Return deposit (DR Deposits Held / CR Cash)
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 30 deposits per minute per client
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit('deposits-return', clientId, { windowMs: 60000, maxRequests: 30 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetIn);
    }

    const body = await request.json();

    // Validate input
    const { amount, leaseId, description, returnDate, deductions } = validate(returnDepositSchema, body);

    // Parse and validate return date
    const entryDate = returnDate ? new Date(returnDate) : new Date();

    // Get lease info
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      select: { tenantName: true, unitName: true }
    });

    if (!lease) {
      throw new Error('Lease not found');
    }

    const finalDescription = description || `Security deposit returned - ${lease.tenantName} (${lease.unitName})`;

    // Post all entries atomically - if any fails, all roll back
    const entries = await withLedgerTransaction(async (tx, postEntry) => {
      const allEntries = [];

      // Post DR Deposits Held entry (2100) - Release liability
      const depositEntry = await postEntry({
        accountCode: '2100',
        amount,
        debitCredit: 'DR',
        description: finalDescription,
        entryDate,
        leaseId,
        postedBy: 'user'
      });
      allEntries.push(depositEntry);

      // Post CR Cash entry (1000) - Cash out
      const cashEntry = await postEntry({
        accountCode: '1000',
        amount,
        debitCredit: 'CR',
        description: finalDescription,
        entryDate,
        leaseId,
        postedBy: 'user'
      });
      allEntries.push(cashEntry);

      // If there are deductions, post them as expenses
      if (deductions && deductions.length > 0) {
        for (const deduction of deductions) {
          const deductionDesc = `Deposit deduction: ${deduction.description || 'Expense'}`;

          // DR Expense (5000)
          const expenseEntry = await postEntry({
            accountCode: '5000',
            amount: deduction.amount,
            debitCredit: 'DR',
            description: deductionDesc,
            entryDate,
            leaseId,
            postedBy: 'user'
          });
          allEntries.push(expenseEntry);

          // CR Deposits Held (2100) - Offset from deposit
          const depositDeductionEntry = await postEntry({
            accountCode: '2100',
            amount: deduction.amount,
            debitCredit: 'CR',
            description: deductionDesc,
            entryDate,
            leaseId,
            postedBy: 'user'
          });
          allEntries.push(depositDeductionEntry);
        }
      }

      return allEntries;
    });

    return apiCreated(
      { entries },
      `Deposit of $${amount} returned${deductions?.length ? ` with ${deductions.length} deductions` : ''}`
    );

  } catch (error) {
    return handleApiError(error, 'POST /api/deposits/return');
  }
}
