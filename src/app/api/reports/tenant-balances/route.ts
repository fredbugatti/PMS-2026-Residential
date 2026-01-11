import { NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/reports/tenant-balances - Get all tenant balances
export async function GET() {
  try {
    // Get all active leases with their ledger entries and scheduled charges
    const leases = await prisma.lease.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'DRAFT']
        }
      },
      include: {
        ledgerEntries: {
          where: {
            accountCode: '1200', // Only AR entries
            status: 'POSTED'
          },
          select: {
            amount: true,
            debitCredit: true
          }
        },
        scheduledCharges: {
          where: { accountCode: '4000', active: true }
        }
      },
      orderBy: {
        tenantName: 'asc'
      }
    });

    // Calculate balance for each lease
    const tenantBalances = leases.map(lease => {
      let balance = 0;

      for (const entry of lease.ledgerEntries) {
        const amount = Number(entry.amount);
        balance += entry.debitCredit === 'DR' ? amount : -amount;
      }

      // Get rent from scheduled charge
      const rentCharge = lease.scheduledCharges[0];
      const monthlyRent = rentCharge ? Number(rentCharge.amount) : null;

      return {
        leaseId: lease.id,
        tenantName: lease.tenantName,
        unitName: lease.unitName,
        propertyName: lease.propertyName,
        status: lease.status,
        balance: balance,
        monthlyRent
      };
    });

    // Calculate totals
    const totalOwed = tenantBalances
      .filter(t => t.balance > 0)
      .reduce((sum, t) => sum + t.balance, 0);

    const totalCredits = tenantBalances
      .filter(t => t.balance < 0)
      .reduce((sum, t) => sum + Math.abs(t.balance), 0);

    return NextResponse.json({
      tenants: tenantBalances,
      summary: {
        totalTenants: tenantBalances.length,
        tenantsOwing: tenantBalances.filter(t => t.balance > 0).length,
        tenantsWithCredit: tenantBalances.filter(t => t.balance < 0).length,
        totalOwed: totalOwed,
        totalCredits: totalCredits,
        netBalance: totalOwed - totalCredits
      }
    });

  } catch (error: any) {
    console.error('GET /api/reports/tenant-balances error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tenant balances' },
      { status: 500 }
    );
  }
}
