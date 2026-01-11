import { NextRequest, NextResponse } from 'next/server';
import { prisma, postEntry } from '@/lib/accounting';

// POST /api/charges/bulk - Generate monthly rent charges for all active leases
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chargeDate, preview } = body;

    // Parse and validate charge date
    const entryDate = chargeDate ? new Date(chargeDate) : new Date();

    // Find all active leases with rent scheduled charges
    const leases = await prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        scheduledCharges: {
          some: {
            accountCode: '4000',
            active: true
          }
        }
      },
      include: {
        scheduledCharges: {
          where: { accountCode: '4000', active: true }
        }
      },
      orderBy: {
        tenantName: 'asc'
      }
    });

    // If preview mode, just return the list of charges that would be posted
    if (preview) {
      const previewCharges = leases.map(lease => {
        const rentCharge = lease.scheduledCharges[0];
        return {
          leaseId: lease.id,
          tenantName: lease.tenantName,
          unitName: lease.unitName,
          propertyName: lease.propertyName,
          amount: rentCharge ? Number(rentCharge.amount) : 0
        };
      }).filter(c => c.amount > 0);

      return NextResponse.json({
        preview: true,
        charges: previewCharges,
        totalAmount: previewCharges.reduce((sum, c) => sum + c.amount, 0),
        count: previewCharges.length
      });
    }

    // Actually post the charges
    const results = [];
    const errors = [];

    for (const lease of leases) {
      try {
        const rentCharge = lease.scheduledCharges[0];
        if (!rentCharge) continue;

        const amount = Number(rentCharge.amount);
        const description = `Monthly rent - ${entryDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

        // Post DR AR entry
        const arEntry = await postEntry({
          accountCode: '1200',
          amount: amount,
          debitCredit: 'DR',
          description: description,
          entryDate: entryDate,
          leaseId: lease.id,
          postedBy: 'system'
        });

        // Post CR Income entry
        const incomeEntry = await postEntry({
          accountCode: '4000',
          amount: amount,
          debitCredit: 'CR',
          description: description,
          entryDate: entryDate,
          leaseId: lease.id,
          postedBy: 'system'
        });

        results.push({
          leaseId: lease.id,
          tenantName: lease.tenantName,
          unitName: lease.unitName,
          amount: amount,
          success: true,
          entries: [arEntry.id, incomeEntry.id]
        });

      } catch (error: any) {
        // Handle idempotency errors gracefully
        if (error.message?.includes('Duplicate entry')) {
          errors.push({
            leaseId: lease.id,
            tenantName: lease.tenantName,
            error: 'Charge already posted for this period'
          });
        } else {
          errors.push({
            leaseId: lease.id,
            tenantName: lease.tenantName,
            error: error.message || 'Failed to post charge'
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Posted ${results.length} rent charges`,
      results: results,
      errors: errors,
      totalAmount: results.reduce((sum, r) => sum + r.amount, 0),
      successCount: results.length,
      errorCount: errors.length
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/charges/bulk error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate bulk charges' },
      { status: 500 }
    );
  }
}
