import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';
import { handleApiError, checkRateLimit, rateLimitResponse, getClientIdentifier } from '@/lib/api-utils';
import { parsePaginationParams, createPaginatedResponse, getPrismaPageArgs } from '@/lib/pagination';

export const dynamic = 'force-dynamic';

// GET /api/ledger - Get all ledger entries with filters and optional pagination
export async function GET(request: NextRequest) {
  try {
    // Rate limit: 120 reads per minute per client
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit('ledger-get', clientId, { windowMs: 60000, maxRequests: 120 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetIn);
    }

    const { searchParams } = new URL(request.url);
    const accountCode = searchParams.get('accountCode');
    const leaseId = searchParams.get('leaseId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const debitCredit = searchParams.get('debitCredit');

    // Build where clause
    const where: any = {
      status: 'POSTED',
      ...(accountCode && { accountCode }),
      ...(leaseId && { leaseId }),
      ...(debitCredit && { debitCredit: debitCredit as any })
    };

    // Handle date range
    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) where.entryDate.gte = new Date(startDate);
      if (endDate) where.entryDate.lte = new Date(endDate);
    }

    const include = {
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
    };

    const orderBy = [
      { entryDate: 'desc' as const },
      { createdAt: 'desc' as const }
    ];

    // Check if pagination is requested
    const usePagination = searchParams.has('page') || searchParams.has('limit');

    if (usePagination) {
      const paginationParams = parsePaginationParams(searchParams);

      const [total, entries] = await Promise.all([
        prisma.ledgerEntry.count({ where }),
        prisma.ledgerEntry.findMany({
          where,
          include,
          orderBy,
          ...getPrismaPageArgs(paginationParams)
        })
      ]);

      return NextResponse.json(createPaginatedResponse(entries, total, paginationParams));
    }

    // No pagination - return all (backwards compatible)
    const entries = await prisma.ledgerEntry.findMany({
      where,
      include,
      orderBy
    });

    return NextResponse.json(entries);
  } catch (error) {
    return handleApiError(error, 'GET /api/ledger');
  }
}
