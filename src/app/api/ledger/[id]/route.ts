import { NextRequest, NextResponse } from 'next/server';
import { prisma, voidLedgerEntry } from '@/lib/accounting';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

// GET /api/ledger/[id] - Get single ledger entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const entry = await prisma.ledgerEntry.findUnique({
      where: { id },
      include: {
        account: true,
        lease: {
          select: {
            id: true,
            tenantName: true,
            unitName: true
          }
        }
      }
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Ledger entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(entry);

  } catch (error: any) {
    console.error('GET /api/ledger/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ledger entry' },
      { status: 500 }
    );
  }
}

// DELETE /api/ledger/[id] - Delete (void) a ledger entry
// Requires ADMIN_SECRET authentication in production
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Explicit auth check for this sensitive operation
    if (process.env.NODE_ENV === 'production') {
      if (!ADMIN_SECRET) {
        console.error('[Auth] CRITICAL: ADMIN_SECRET not set for ledger void');
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }

      const authHeader = request.headers.get('x-api-key') || request.headers.get('authorization');
      const providedKey = authHeader?.replace('Bearer ', '');

      if (!providedKey || providedKey !== ADMIN_SECRET) {
        console.warn(`[Auth] Unauthorized ledger void attempt`);
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const { id } = await params;

    // Get the entry first to check it exists
    const entry = await prisma.ledgerEntry.findUnique({
      where: { id }
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Ledger entry not found' },
        { status: 404 }
      );
    }

    // Void the entry (soft delete - database trigger prevents hard delete)
    await voidLedgerEntry({
      entryId: id,
      reason: 'Admin void via API',
      voidedBy: 'admin'
    });

    return NextResponse.json({
      success: true,
      message: 'Ledger entry voided',
      voidedEntry: {
        id: entry.id,
        description: entry.description,
        amount: entry.amount
      }
    });

  } catch (error: any) {
    console.error('DELETE /api/ledger/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete ledger entry' },
      { status: 500 }
    );
  }
}
