import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET - Fetch transactions for a specific account within a date range
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountCode = searchParams.get('accountCode');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const propertyId = searchParams.get('propertyId');
    const type = searchParams.get('type'); // 'income' or 'expense'

    if (!accountCode) {
      return NextResponse.json({ error: 'Account code is required' }, { status: 400 });
    }

    // Find the account
    const account = await prisma.chartOfAccounts.findFirst({
      where: { code: accountCode }
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Build the query for ledger entries
    const whereClause: any = {
      accountCode: accountCode
    };

    // Date range filter
    if (startDate && endDate) {
      whereClause.entryDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // For income accounts (4xxx), we want CR entries
    // For expense accounts (5xxx), we want DR entries
    if (type === 'income') {
      whereClause.debitCredit = 'CR';
    } else if (type === 'expense') {
      whereClause.debitCredit = 'DR';
    }

    // Fetch the ledger entries with related data
    const entries = await prisma.ledgerEntry.findMany({
      where: whereClause,
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

    // For maintenance expenses (6100), also fetch work order data
    let workOrderMap: Map<string, any> = new Map();
    let workOrderByTitle: Map<string, any> = new Map();
    if (accountCode === '6100') {
      // Extract work order IDs from idempotency keys (format: wo-{workOrderId}-{timestamp}-expense-dr)
      const workOrderIds: string[] = [];
      const workOrderTitles: string[] = [];

      entries.forEach(entry => {
        const match = entry.idempotencyKey.match(/^wo-([a-f0-9-]+)-/);
        if (match) {
          workOrderIds.push(match[1]);
        } else {
          // Fallback: extract title from description "Maintenance: {title}" or "Maintenance (tenant damage): {title}"
          const titleMatch = entry.description.match(/^Maintenance(?:\s*\([^)]+\))?:\s*(.+)$/);
          if (titleMatch) {
            workOrderTitles.push(titleMatch[1]);
          }
        }
      });

      // Fetch work orders by ID
      if (workOrderIds.length > 0) {
        const workOrders = await prisma.workOrder.findMany({
          where: { id: { in: workOrderIds } },
          include: {
            property: { select: { id: true, name: true } },
            unit: { select: { id: true, unitNumber: true } },
            vendor: { select: { id: true, name: true, company: true } }
          }
        });

        workOrders.forEach(wo => {
          workOrderMap.set(wo.id, wo);
        });
      }

      // Fetch work orders by title for entries without wo- prefix in idempotency key
      if (workOrderTitles.length > 0) {
        const workOrdersByTitle = await prisma.workOrder.findMany({
          where: { title: { in: workOrderTitles } },
          include: {
            property: { select: { id: true, name: true } },
            unit: { select: { id: true, unitNumber: true } },
            vendor: { select: { id: true, name: true, company: true } }
          }
        });

        workOrdersByTitle.forEach(wo => {
          workOrderByTitle.set(wo.title, wo);
        });
      }
    }

    // Helper to find work order for an entry
    const findWorkOrder = (entry: any) => {
      // Try by ID first
      const idMatch = entry.idempotencyKey.match(/^wo-([a-f0-9-]+)-/);
      if (idMatch) {
        return workOrderMap.get(idMatch[1]);
      }
      // Fallback to title match
      const titleMatch = entry.description.match(/^Maintenance(?:\s*\([^)]+\))?:\s*(.+)$/);
      if (titleMatch) {
        return workOrderByTitle.get(titleMatch[1]);
      }
      return null;
    };

    // Filter by property if specified
    let filteredEntries = entries;
    if (propertyId) {
      filteredEntries = entries.filter(entry => {
        // Check lease property
        if (entry.lease?.unit?.property?.id === propertyId) return true;

        // Check work order property for maintenance expenses
        if (accountCode === '6100') {
          const wo = findWorkOrder(entry);
          if (wo?.property?.id === propertyId) return true;
        }

        return false;
      });
    }

    // Format the response
    const transactions = filteredEntries.map(entry => {
      let tenantName = entry.lease?.tenantName || null;
      let unitName = entry.lease?.unitName || null;
      let propertyName = entry.lease?.propertyName || entry.lease?.unit?.property?.name || null;
      let vendorName: string | null = null;
      let workOrderId: string | null = null;

      // For maintenance expenses, get property/unit/vendor from work order
      if (accountCode === '6100') {
        const wo = findWorkOrder(entry);
        if (wo) {
          workOrderId = wo.id;
          propertyName = wo.property?.name || propertyName;
          unitName = wo.unit ? `Unit ${wo.unit.unitNumber}` : unitName;
          vendorName = wo.vendor?.name || (wo.vendor?.company ? wo.vendor.company : null);
        }
      }

      return {
        id: entry.id,
        date: entry.entryDate.toISOString().split('T')[0],
        description: entry.description,
        amount: Number(entry.amount),
        type: entry.debitCredit,
        tenantName,
        unitName,
        propertyName,
        vendorName,
        workOrderId,
        leaseId: entry.leaseId || null,
        postedBy: entry.postedBy,
        createdAt: entry.createdAt.toISOString()
      };
    });

    // Calculate total
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);

    return NextResponse.json({
      account: {
        code: account.code,
        name: account.name,
        type: account.type
      },
      transactions,
      total,
      count: transactions.length
    });

  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
