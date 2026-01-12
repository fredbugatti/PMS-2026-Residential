import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/chart-of-accounts/[code] - Get a single account
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const account = await prisma.chartOfAccounts.findUnique({
      where: { code: params.code }
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(account);
  } catch (error: any) {
    console.error('GET /api/chart-of-accounts/[code] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch account' },
      { status: 500 }
    );
  }
}

// PUT /api/chart-of-accounts/[code] - Update an account
export async function PUT(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const body = await request.json();
    const { name, description, type, normalBalance, active } = body;

    // Check if account exists
    const existing = await prisma.chartOfAccounts.findUnique({
      where: { code: params.code }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    const account = await prisma.chartOfAccounts.update({
      where: { code: params.code },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(normalBalance !== undefined && { normalBalance }),
        ...(active !== undefined && { active }),
      }
    });

    return NextResponse.json(account);
  } catch (error: any) {
    console.error('PUT /api/chart-of-accounts/[code] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update account' },
      { status: 500 }
    );
  }
}

// DELETE /api/chart-of-accounts/[code] - Delete an account (only if no ledger entries)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    // Check if account has any ledger entries
    const entryCount = await prisma.ledgerEntry.count({
      where: { accountCode: params.code }
    });

    if (entryCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete account with ${entryCount} ledger entries. Deactivate instead.` },
        { status: 400 }
      );
    }

    await prisma.chartOfAccounts.delete({
      where: { code: params.code }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/chart-of-accounts/[code] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    );
  }
}
