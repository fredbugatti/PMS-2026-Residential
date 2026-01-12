import { NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const propertyId = searchParams.get('propertyId');

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    // Get all ledger entries
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        entryDate: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        ...(propertyId ? {
          lease: { unit: { propertyId } }
        } : {})
      },
      include: {
        account: true,
        lease: {
          include: {
            unit: {
              include: {
                property: true
              }
            }
          }
        }
      },
      orderBy: {
        entryDate: 'desc'
      }
    });

    // Transform to response format
    const transactions = entries.map(entry => {
      const amount = Number(entry.amount);
      return {
        id: entry.id,
        date: entry.entryDate.toISOString().split('T')[0],
        accountCode: entry.account.code,
        accountName: entry.account.name,
        description: entry.description,
        debit: entry.debitCredit === 'DR' ? amount : 0,
        credit: entry.debitCredit === 'CR' ? amount : 0,
        tenantName: entry.lease?.tenantName || null,
        propertyName: entry.lease?.unit?.property?.name || null,
        unitName: entry.lease?.unit?.unitNumber || entry.lease?.unitName || null,
        leaseId: entry.leaseId
      };
    });

    // Calculate totals
    const totalDebits = transactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredits = transactions.reduce((sum, t) => sum + t.credit, 0);

    return NextResponse.json({
      transactions,
      summary: {
        count: transactions.length,
        totalDebits,
        totalCredits
      }
    });
  } catch (error) {
    console.error('Failed to fetch all transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
