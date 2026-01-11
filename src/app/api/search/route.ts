import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

interface SearchResult {
  type: 'tenant' | 'property' | 'transaction' | 'workorder';
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase().trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results: SearchResult[] = [];

    // Search leases (tenants)
    const leases = await prisma.lease.findMany({
      where: {
        OR: [
          { tenantName: { contains: query, mode: 'insensitive' } },
          { tenantEmail: { contains: query, mode: 'insensitive' } },
          { tenantPhone: { contains: query, mode: 'insensitive' } },
          { companyName: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
      },
      take: 5,
    });

    for (const lease of leases) {
      const unitInfo = lease.unit
        ? `${lease.unit.property?.name || 'Unknown'} - ${lease.unit.unitNumber}`
        : lease.propertyName || 'No unit assigned';
      results.push({
        type: 'tenant',
        id: lease.id,
        title: lease.tenantName,
        subtitle: unitInfo,
        href: `/leases/${lease.id}`,
        icon: '👤',
      });
    }

    // Search properties
    const properties = await prisma.property.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { address: { contains: query, mode: 'insensitive' } },
          { city: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 5,
    });

    for (const property of properties) {
      results.push({
        type: 'property',
        id: property.id,
        title: property.name,
        subtitle: property.address ? `${property.address}, ${property.city || ''}` : 'No address',
        href: `/properties/${property.id}`,
        icon: '🏢',
      });
    }

    // Search ledger entries (transactions)
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        description: { contains: query, mode: 'insensitive' },
      },
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
          },
        },
      },
      orderBy: {
        entryDate: 'desc',
      },
      take: 5,
    });

    for (const entry of ledgerEntries) {
      const amount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(Number(entry.amount));

      results.push({
        type: 'transaction',
        id: entry.id,
        title: entry.description,
        subtitle: `${amount} - ${entry.lease?.tenantName || 'Unknown tenant'}`,
        href: `/accounting?search=${entry.id}`,
        icon: entry.debitCredit === 'CR' ? '💵' : '📝',
      });
    }

    // Search work orders
    const workOrders = await prisma.workOrder.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { reportedBy: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        property: true,
        unit: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    for (const wo of workOrders) {
      results.push({
        type: 'workorder',
        id: wo.id,
        title: wo.title,
        subtitle: `${wo.property.name}${wo.unit ? ` - ${wo.unit.unitNumber}` : ''} (${wo.status})`,
        href: `/maintenance?workorder=${wo.id}`,
        icon: '🔧',
      });
    }

    // Sort results by relevance (exact matches first)
    results.sort((a, b) => {
      const aExact = a.title.toLowerCase().startsWith(query) ? 0 : 1;
      const bExact = b.title.toLowerCase().startsWith(query) ? 0 : 1;
      return aExact - bExact;
    });

    return NextResponse.json({ results: results.slice(0, 15) });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
