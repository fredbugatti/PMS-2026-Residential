import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/reconciliation/bank-accounts - List all bank accounts
export async function GET(request: NextRequest) {
  try {
    const bankAccounts = await prisma.bankAccount.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(bankAccounts);
  } catch (error: any) {
    console.error('GET /api/reconciliation/bank-accounts error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bank accounts' },
      { status: 500 }
    );
  }
}

// POST /api/reconciliation/bank-accounts - Create a new bank account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, last4, accountCode } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    if (!last4 || !/^\d{4}$/.test(last4)) {
      return NextResponse.json(
        { error: 'last4 must be exactly 4 digits' },
        { status: 400 }
      );
    }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        name: name.trim(),
        last4,
        accountCode: accountCode || '1000',
      },
    });

    return NextResponse.json(bankAccount, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/reconciliation/bank-accounts error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create bank account' },
      { status: 500 }
    );
  }
}
