import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/pending-expenses - Get all pending expenses awaiting confirmation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const status = searchParams.get('status') || 'PENDING';

    const whereClause: any = {
      status
    };

    if (propertyId) {
      whereClause.propertyId = propertyId;
    }

    const pendingExpenses = await prisma.pendingExpense.findMany({
      where: whereClause,
      include: {
        property: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
        scheduledExpense: { select: { id: true, description: true } }
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    return NextResponse.json({
      pendingExpenses,
      count: pendingExpenses.length
    });

  } catch (error: any) {
    console.error('GET /api/pending-expenses error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending expenses' },
      { status: 500 }
    );
  }
}
