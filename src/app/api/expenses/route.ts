import { NextRequest, NextResponse } from 'next/server';
import { prisma, postEntry } from '@/lib/accounting';
import { parsePaginationParams, createPaginatedResponse, getPrismaPageArgs } from '@/lib/pagination';

// GET /api/expenses - Get expense entries with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const propertyId = searchParams.get('propertyId');
    const accountCode = searchParams.get('accountCode');

    // Default to current month if no dates provided
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;
    end.setHours(23, 59, 59, 999);

    // Build where clause
    const whereClause: any = {
      status: 'POSTED',
      debitCredit: 'DR',
      accountCode: {
        startsWith: '5' // Expense accounts
      },
      entryDate: {
        gte: start,
        lte: end
      }
    };

    if (accountCode) {
      whereClause.accountCode = accountCode;
    }

    // If propertyId filter, get leases for that property
    if (propertyId) {
      const propertyLeases = await prisma.lease.findMany({
        where: { propertyId },
        select: { id: true }
      });
      whereClause.leaseId = {
        in: propertyLeases.map(l => l.id)
      };
    }

    const include = {
      account: {
        select: {
          name: true
        }
      },
      lease: {
        select: {
          tenantName: true,
          unitName: true,
          propertyName: true
        }
      }
    };

    const orderBy = [
      { entryDate: 'desc' as const },
      { createdAt: 'desc' as const }
    ];

    // Helper to map expense entries to response shape
    const mapExpense = (e: any) => ({
      id: e.id,
      date: e.entryDate,
      accountCode: e.accountCode,
      accountName: e.account.name,
      description: e.description,
      amount: Number(e.amount),
      propertyName: e.lease?.propertyName || null,
      unitName: e.lease?.unitName || null,
      postedBy: e.postedBy,
      createdAt: e.createdAt
    });

    // Get expense accounts for dropdown
    const expenseAccounts = await prisma.chartOfAccounts.findMany({
      where: {
        type: 'EXPENSE',
        active: true
      },
      orderBy: { code: 'asc' }
    });

    // Check if pagination is requested
    const usePagination = searchParams.has('page') || searchParams.has('limit');

    if (usePagination) {
      const paginationParams = parsePaginationParams(searchParams);
      const [total, expenses] = await Promise.all([
        prisma.ledgerEntry.count({ where: whereClause }),
        prisma.ledgerEntry.findMany({ where: whereClause, include, orderBy, ...getPrismaPageArgs(paginationParams) })
      ]);

      const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

      return NextResponse.json({
        ...createPaginatedResponse(expenses.map(mapExpense), total, paginationParams),
        expenseAccounts,
        summary: {
          totalExpenses,
          count: total,
          period: {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
          }
        }
      });
    }

    // No pagination - return all (backwards compatible)
    const expenses = await prisma.ledgerEntry.findMany({
      where: whereClause,
      include,
      orderBy
    });

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return NextResponse.json({
      expenses: expenses.map(mapExpense),
      expenseAccounts,
      summary: {
        totalExpenses,
        count: expenses.length,
        period: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        }
      }
    });

  } catch (error: any) {
    console.error('GET /api/expenses error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

// POST /api/expenses - Record a new expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountCode, amount, description, entryDate, propertyId, vendorId, workOrderId } = body;

    // Validate required fields
    if (!accountCode || !amount || !description) {
      return NextResponse.json(
        { error: 'accountCode, amount, and description are required' },
        { status: 400 }
      );
    }

    // Validate account exists and is expense type
    const account = await prisma.chartOfAccounts.findUnique({
      where: { code: accountCode }
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    if (account.type !== 'EXPENSE') {
      return NextResponse.json(
        { error: 'Account must be an expense account (5xxx)' },
        { status: 400 }
      );
    }

    const expenseDate = entryDate ? new Date(entryDate) : new Date();

    // For property-level expenses, we can optionally link to a lease
    // But most expenses are property-wide, not lease-specific
    let leaseId: string | undefined;

    if (propertyId) {
      // For property expenses, we could link to the first active lease
      // but it's better to leave it unlinked for property-level expenses
      // leaseId stays undefined
    }

    // Post the expense entry: DR Expense Account
    const expenseEntry = await postEntry({
      accountCode,
      amount: parseFloat(amount),
      debitCredit: 'DR',
      description,
      entryDate: expenseDate,
      leaseId,
      postedBy: 'user'
    });

    // Post the credit side: CR Cash (or Accounts Payable)
    // For simplicity, we'll credit Operating Cash (1000)
    const cashEntry = await postEntry({
      accountCode: '1000',
      amount: parseFloat(amount),
      debitCredit: 'CR',
      description,
      entryDate: expenseDate,
      leaseId,
      postedBy: 'user'
    });

    // If this expense is linked to a work order, update the work order
    if (workOrderId) {
      await prisma.workOrder.update({
        where: { id: workOrderId },
        data: {
          actualCost: parseFloat(amount),
          paymentStatus: 'PAID'
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Expense recorded',
      entries: {
        expense: expenseEntry,
        cash: cashEntry
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/expenses error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record expense' },
      { status: 500 }
    );
  }
}
