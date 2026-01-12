import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';
import { syncUnitStatus } from '@/lib/unitStatus';
import { handleApiError, checkRateLimit, rateLimitResponse, getClientIdentifier } from '@/lib/api-utils';
import { parsePaginationParams, createPaginatedResponse, getPrismaPageArgs } from '@/lib/pagination';
import crypto from 'crypto';

// GET /api/leases - List all leases with optional pagination and filtering
export async function GET(request: NextRequest) {
  try {
    // Rate limit: 120 reads per minute per client
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit('leases-get', clientId, { windowMs: 60000, maxRequests: 120 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetIn);
    }

    const { searchParams } = new URL(request.url);

    // Parse filters
    const status = searchParams.get('status');
    const propertyId = searchParams.get('propertyId');
    const search = searchParams.get('search');

    // Build where clause
    const where: any = {};
    if (status) where.status = status;
    if (propertyId) where.propertyId = propertyId;
    if (search) {
      where.OR = [
        { tenantName: { contains: search, mode: 'insensitive' } },
        { tenantEmail: { contains: search, mode: 'insensitive' } },
        { unitName: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Check if pagination is requested
    const usePagination = searchParams.has('page') || searchParams.has('limit');

    if (usePagination) {
      const paginationParams = parsePaginationParams(searchParams);

      // Get total count and data in parallel
      const [total, leases] = await Promise.all([
        prisma.lease.count({ where }),
        prisma.lease.findMany({
          where,
          include: {
            scheduledCharges: { where: { active: true } }
          },
          orderBy: [
            { status: 'asc' },
            { createdAt: 'desc' }
          ],
          ...getPrismaPageArgs(paginationParams)
        })
      ]);

      // Add computed amounts
      const leasesWithCharges = leases.map(lease => {
        const rentCharge = lease.scheduledCharges.find(c => c.accountCode === '4000');
        const totalScheduledCharges = lease.scheduledCharges.reduce(
          (sum, c) => sum + Number(c.amount), 0
        );
        return {
          ...lease,
          monthlyRentAmount: rentCharge ? Number(rentCharge.amount) : null,
          totalScheduledCharges: totalScheduledCharges > 0 ? totalScheduledCharges : null
        };
      });

      return NextResponse.json(createPaginatedResponse(leasesWithCharges, total, paginationParams));
    }

    // No pagination - return all (backwards compatible)
    const leases = await prisma.lease.findMany({
      where,
      include: {
        scheduledCharges: { where: { active: true } }
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Add computed amounts
    const leasesWithCharges = leases.map(lease => {
      const rentCharge = lease.scheduledCharges.find(c => c.accountCode === '4000');
      const totalScheduledCharges = lease.scheduledCharges.reduce(
        (sum, c) => sum + Number(c.amount), 0
      );
      return {
        ...lease,
        monthlyRentAmount: rentCharge ? Number(rentCharge.amount) : null,
        totalScheduledCharges: totalScheduledCharges > 0 ? totalScheduledCharges : null
      };
    });

    return NextResponse.json(leasesWithCharges);
  } catch (error) {
    return handleApiError(error, 'GET /api/leases');
  }
}

// POST /api/leases - Create new lease
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 30 lease creations per minute per client
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit('leases-post', clientId, { windowMs: 60000, maxRequests: 30 });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetIn);
    }

    const body = await request.json();

    // Basic validation
    if (!body.tenantName || typeof body.tenantName !== 'string' || body.tenantName.trim().length === 0) {
      return NextResponse.json({ error: 'Tenant name is required' }, { status: 400 });
    }
    if (!body.unitName || typeof body.unitName !== 'string' || body.unitName.trim().length === 0) {
      return NextResponse.json({ error: 'Unit name is required' }, { status: 400 });
    }
    if (body.tenantEmail && typeof body.tenantEmail === 'string' && body.tenantEmail.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.tenantEmail)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
    }

    // Generate portal token for all new leases (expires in 90 days)
    const portalToken = crypto.randomBytes(32).toString('hex');
    const portalTokenExpiresAt = new Date();
    portalTokenExpiresAt.setDate(portalTokenExpiresAt.getDate() + 90);

    const monthlyRent = body.monthlyRentAmount ? parseFloat(body.monthlyRentAmount) : null;

    const lease = await prisma.lease.create({
      data: {
        tenantName: body.tenantName.trim(),
        companyName: body.companyName?.trim() || null,
        tenantEmail: body.tenantEmail?.trim() || null,
        tenantPhone: body.tenantPhone?.trim() || null,
        unitName: body.unitName.trim(),
        propertyName: body.propertyName?.trim() || null,
        propertyId: body.propertyId || null,
        unitId: body.unitId || null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        securityDepositAmount: body.securityDepositAmount ? parseFloat(body.securityDepositAmount) : null,
        status: body.status || 'ACTIVE',
        notes: body.notes?.trim() || null,
        portalToken,
        portalTokenExpiresAt
      }
    });

    // Create a scheduled charge for monthly rent if amount is provided
    if (monthlyRent && monthlyRent > 0) {
      try {
        await prisma.scheduledCharge.create({
          data: {
            leaseId: lease.id,
            description: 'Monthly Rent',
            amount: monthlyRent,
            accountCode: '4000', // Rental Income
            chargeDay: 1, // First of the month
            active: true
          }
        });
      } catch (error) {
        console.error('Failed to create scheduled rent charge:', error);
      }
    }

    // Automatically sync unit status if unitId is provided
    if (lease.unitId) {
      try {
        await syncUnitStatus(lease.unitId);
      } catch (error) {
        console.error('Failed to sync unit status:', error);
        // Don't fail the lease creation if unit sync fails
      }
    }

    return NextResponse.json(lease, { status: 201 });

  } catch (error) {
    return handleApiError(error, 'POST /api/leases');
  }
}
