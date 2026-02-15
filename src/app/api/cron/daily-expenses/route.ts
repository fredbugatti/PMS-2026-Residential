import { NextRequest, NextResponse } from 'next/server';
import { prisma, withLedgerTransaction } from '@/lib/accounting';
import { withQStashVerification } from '@/lib/qstash';

// Force dynamic rendering since we use request.headers
export const dynamic = 'force-dynamic';

// Core handler logic (wrapped with QStash verification)
async function handleDailyExpenses(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Format month name for descriptions (e.g., "January 2025")
    const monthName = today.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // Get active scheduled expenses that are due today or earlier this month
    const scheduledExpenses = await prisma.scheduledExpense.findMany({
      where: {
        active: true,
        chargeDay: { lte: currentDay }
      },
      include: {
        property: {
          select: {
            id: true,
            name: true
          }
        },
        vendor: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const results: Array<{
      expenseId: string;
      propertyId: string;
      propertyName: string;
      description: string;
      amount: number;
      status: 'posted' | 'pending_confirmation' | 'skipped' | 'error';
      message: string;
    }> = [];

    let totalAmountPosted = 0;
    let totalPendingConfirmation = 0;

    for (const expense of scheduledExpenses) {
      // Check if already processed this month
      if (expense.lastPostedDate) {
        const lastPosted = new Date(expense.lastPostedDate);
        if (
          lastPosted.getMonth() === currentMonth &&
          lastPosted.getFullYear() === currentYear
        ) {
          results.push({
            expenseId: expense.id,
            propertyId: expense.propertyId,
            propertyName: expense.property.name,
            description: expense.description,
            amount: Number(expense.amount),
            status: 'skipped',
            message: 'Already processed this month'
          });
          continue;
        }
      }

      // Check if there's already a pending expense for this month
      const existingPending = await prisma.pendingExpense.findFirst({
        where: {
          scheduledExpenseId: expense.id,
          dueDate: {
            gte: new Date(currentYear, currentMonth, 1),
            lt: new Date(currentYear, currentMonth + 1, 1)
          },
          status: 'PENDING'
        }
      });

      if (existingPending) {
        results.push({
          expenseId: expense.id,
          propertyId: expense.propertyId,
          propertyName: expense.property.name,
          description: expense.description,
          amount: Number(expense.amount),
          status: 'skipped',
          message: 'Already has pending confirmation'
        });
        continue;
      }

      try {
        // Create description with month (e.g., "Landscaping - January 2025")
        const entryDescription = `${expense.description} - ${monthName}`;

        if (expense.requiresConfirmation) {
          // Create a pending expense record for manual confirmation
          await prisma.pendingExpense.create({
            data: {
              scheduledExpenseId: expense.id,
              propertyId: expense.propertyId,
              description: entryDescription,
              amount: expense.amount,
              accountCode: expense.accountCode,
              vendorId: expense.vendorId,
              dueDate: today,
              status: 'PENDING'
            }
          });

          totalPendingConfirmation += Number(expense.amount);

          results.push({
            expenseId: expense.id,
            propertyId: expense.propertyId,
            propertyName: expense.property.name,
            description: expense.description,
            amount: Number(expense.amount),
            status: 'pending_confirmation',
            message: 'Created pending expense - awaiting confirmation'
          });
        } else {
          // Auto-post the expense directly to ledger using transaction
          const expenseAmount = Number(expense.amount);

          await withLedgerTransaction(async (tx, postEntry) => {
            // Post entry 1: DR Expense Account (increase expense)
            await postEntry({
              accountCode: expense.accountCode,
              amount: expenseAmount,
              debitCredit: 'DR',
              description: entryDescription,
              entryDate: today,
              postedBy: 'cron-expense'
            });

            // Post entry 2: CR Cash (decrease cash)
            await postEntry({
              accountCode: '1000',
              amount: expenseAmount,
              debitCredit: 'CR',
              description: entryDescription,
              entryDate: today,
              postedBy: 'cron-expense'
            });

            // Update last posted date (within same transaction)
            await tx.scheduledExpense.update({
              where: { id: expense.id },
              data: { lastPostedDate: today }
            });
          });

          totalAmountPosted += expenseAmount;

          results.push({
            expenseId: expense.id,
            propertyId: expense.propertyId,
            propertyName: expense.property.name,
            description: expense.description,
            amount: expenseAmount,
            status: 'posted',
            message: `Posted ${expense.description} of $${expenseAmount.toFixed(2)}`
          });
        }

      } catch (error: any) {
        // Check if it's a duplicate (idempotency key conflict)
        if (error.code === 'P2002') {
          results.push({
            expenseId: expense.id,
            propertyId: expense.propertyId,
            propertyName: expense.property.name,
            description: expense.description,
            amount: Number(expense.amount),
            status: 'skipped',
            message: 'Already posted (duplicate prevented)'
          });
        } else {
          results.push({
            expenseId: expense.id,
            propertyId: expense.propertyId,
            propertyName: expense.property.name,
            description: expense.description,
            amount: Number(expense.amount),
            status: 'error',
            message: error.message || 'Failed to process expense'
          });
        }
      }
    }

    const posted = results.filter(r => r.status === 'posted').length;
    const pendingConfirmation = results.filter(r => r.status === 'pending_confirmation').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;
    const duration = Date.now() - startTime;

    // Determine overall status
    let status = 'SUCCESS';
    if (errors > 0 && posted === 0 && pendingConfirmation === 0) {
      status = 'FAILED';
    } else if (errors > 0) {
      status = 'PARTIAL';
    }

    // Log the execution
    await prisma.cronLog.create({
      data: {
        jobName: 'daily-expenses',
        status,
        chargesPosted: posted,
        chargesSkipped: skipped + pendingConfirmation, // Count pending as not fully posted
        chargesErrored: errors,
        totalAmount: totalAmountPosted,
        duration,
        errorMessage: errors > 0 ? results.filter(r => r.status === 'error').map(r => r.message).join('; ') : null,
        details: results as any
      }
    });

    return NextResponse.json({
      success: true,
      status,
      summary: {
        total: results.length,
        posted,
        pendingConfirmation,
        skipped,
        errors,
        totalAmountPosted,
        totalPendingConfirmation,
        duration
      },
      results
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Log the failure
    try {
      await prisma.cronLog.create({
        data: {
          jobName: 'daily-expenses',
          status: 'FAILED',
          duration,
          errorMessage: error.message || 'Unknown error'
        }
      });
    } catch (logError) {
      console.error('[CRON] Failed to log error:', logError);
    }

    console.error('[CRON] daily-expenses failed:', error);
    return NextResponse.json(
      { error: error.message || 'Cron job failed' },
      { status: 500 }
    );
  }
}

// GET /api/cron/daily-expenses - Called by QStash or internally from daily-charges
export const GET = withQStashVerification(handleDailyExpenses);
