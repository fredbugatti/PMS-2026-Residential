import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

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
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Delete the entry
    await prisma.ledgerEntry.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Ledger entry deleted',
      deletedEntry: {
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
