import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/ledger - Get all ledger entries with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountCode = searchParams.get('accountCode');
    const leaseId = searchParams.get('leaseId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const debitCredit = searchParams.get('debitCredit');

    const entries = await prisma.ledgerEntry.findMany({
      where: {
        status: 'POSTED',
        ...(accountCode && { accountCode }),
        ...(leaseId && { leaseId }),
        ...(debitCredit && { debitCredit: debitCredit as any }),
        ...(startDate && {
          entryDate: {
            gte: new Date(startDate)
          }
        }),
        ...(endDate && {
          entryDate: {
            lte: new Date(endDate)
          }
        })
      },
      include: {
        account: {
          select: {
            code: true,
            name: true,
            type: true,
            normalBalance: true
          }
        },
        lease: {
          select: {
            id: true,
            tenantName: true
          }
        }
      },
      orderBy: [
        { entryDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json(entries);
  } catch (error: any) {
    console.error('GET /api/ledger error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ledger entries' },
      { status: 500 }
    );
  }
}
