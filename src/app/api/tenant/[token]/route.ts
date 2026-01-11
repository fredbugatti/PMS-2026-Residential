import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/tenant/[token] - Get tenant portal data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find lease by portal token
    const lease = await prisma.lease.findUnique({
      where: { portalToken: token },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            zipCode: true
          }
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
            bedrooms: true,
            bathrooms: true
          }
        },
        scheduledCharges: {
          where: { accountCode: '4000', active: true }
        },
        workOrders: {
          where: {
            status: {
              in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED']
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            priority: true,
            status: true,
            createdAt: true,
            scheduledDate: true,
            completedDate: true,
            photos: true
          }
        },
        ledgerEntries: {
          where: { status: 'POSTED' },
          include: {
            account: {
              select: {
                code: true,
                name: true,
                type: true
              }
            }
          },
          orderBy: [
            { entryDate: 'desc' },
            { createdAt: 'desc' }
          ]
        },
        documents: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!lease) {
      return NextResponse.json(
        { error: 'Invalid or expired portal link' },
        { status: 404 }
      );
    }

    // Check if lease is active
    if (lease.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'This lease is no longer active' },
        { status: 403 }
      );
    }

    // Update last access time
    await prisma.lease.update({
      where: { id: lease.id },
      data: { portalLastAccess: new Date() }
    });

    // Calculate balance from AR account (1200)
    let balance = 0;
    for (const entry of lease.ledgerEntries) {
      if (entry.accountCode === '1200') { // AR account
        const amount = Number(entry.amount);
        balance += entry.debitCredit === 'DR' ? amount : -amount;
      }
    }

    // Get rent from scheduled charge
    const rentCharge = lease.scheduledCharges[0];
    const monthlyRentAmount = rentCharge ? Number(rentCharge.amount) : null;

    // Return tenant portal data
    return NextResponse.json({
      lease: {
        id: lease.id,
        tenantName: lease.tenantName,
        tenantEmail: lease.tenantEmail,
        tenantPhone: lease.tenantPhone,
        startDate: lease.startDate,
        endDate: lease.endDate,
        monthlyRentAmount,
        securityDepositAmount: lease.securityDepositAmount,
        status: lease.status,
        chargeDay: lease.chargeDay
      },
      property: lease.property,
      unit: lease.unit,
      workOrders: lease.workOrders,
      balance: balance,
      ledgerEntries: lease.ledgerEntries,
      documents: lease.documents,
      autopay: {
        enabled: lease.autopayEnabled,
        day: lease.autopayDay,
        method: lease.autopayMethod,
        last4: lease.autopayLast4
      }
    });

  } catch (error: any) {
    console.error('GET /api/tenant/[token] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load portal data' },
      { status: 500 }
    );
  }
}
