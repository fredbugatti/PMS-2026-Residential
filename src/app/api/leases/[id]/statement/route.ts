import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/leases/[id]/statement - Get statement data for a lease
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lease = await prisma.lease.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            address: true,
            city: true,
            state: true,
            zipCode: true
          }
        },
        ledgerEntries: {
          where: { status: 'POSTED' },
          orderBy: [
            { entryDate: 'asc' },
            { createdAt: 'asc' }
          ],
          select: {
            id: true,
            entryDate: true,
            accountCode: true,
            amount: true,
            debitCredit: true,
            description: true,
            status: true
          }
        }
      }
    });

    if (!lease) {
      return NextResponse.json(
        { error: 'Lease not found' },
        { status: 404 }
      );
    }

    // Calculate totals from AR account (1200)
    let totalCharges = 0;
    let totalPayments = 0;

    for (const entry of lease.ledgerEntries) {
      if (entry.accountCode === '1200') {
        const amount = Number(entry.amount);
        if (entry.debitCredit === 'DR') {
          totalCharges += amount;
        } else {
          totalPayments += amount;
        }
      }
    }

    const balance = totalCharges - totalPayments;

    return NextResponse.json({
      lease: {
        id: lease.id,
        tenantName: lease.tenantName,
        tenantEmail: lease.tenantEmail,
        tenantPhone: lease.tenantPhone,
        unitName: lease.unitName,
        propertyName: lease.propertyName,
        startDate: lease.startDate,
        endDate: lease.endDate,
        status: lease.status
      },
      property: lease.property,
      entries: lease.ledgerEntries,
      balance,
      totalCharges,
      totalPayments
    });

  } catch (error: any) {
    console.error('GET /api/leases/[id]/statement error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate statement' },
      { status: 500 }
    );
  }
}
