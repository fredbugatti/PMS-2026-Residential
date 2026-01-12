import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/scheduled-charges - List all scheduled charges (optionally filter by leaseId)
// Use ?summary=true to get monthly total for active leases
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leaseId = searchParams.get('leaseId');
    const summary = searchParams.get('summary');

    // If summary mode, return total monthly recurring charges for active leases
    if (summary === 'true') {
      const activeCharges = await prisma.scheduledCharge.findMany({
        where: {
          active: true,
          lease: {
            status: 'ACTIVE'
          }
        },
        select: {
          amount: true,
          description: true,
          accountCode: true
        }
      });

      const totalMonthly = activeCharges.reduce((sum, charge) => sum + Number(charge.amount), 0);

      // Group by account code for breakdown
      const byAccount: { [key: string]: number } = {};
      activeCharges.forEach(charge => {
        const code = charge.accountCode;
        byAccount[code] = (byAccount[code] || 0) + Number(charge.amount);
      });

      return NextResponse.json({
        totalMonthly,
        chargeCount: activeCharges.length,
        byAccount
      });
    }

    const scheduledCharges = await prisma.scheduledCharge.findMany({
      where: leaseId ? { leaseId } : undefined,
      include: {
        lease: {
          select: {
            tenantName: true,
            unitName: true,
            propertyName: true
          }
        }
      },
      orderBy: [
        { active: 'desc' },
        { chargeDay: 'asc' }
      ]
    });

    return NextResponse.json(scheduledCharges);
  } catch (error: any) {
    console.error('GET /api/scheduled-charges error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch scheduled charges' },
      { status: 500 }
    );
  }
}

// POST /api/scheduled-charges - Create new scheduled charge(s)
// Supports single charge or array of charges (bulk creation)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if bulk creation (array of charges)
    if (Array.isArray(body.charges)) {
      const { leaseId, charges } = body;

      if (!leaseId) {
        return NextResponse.json(
          { error: 'Lease ID is required' },
          { status: 400 }
        );
      }

      if (charges.length === 0) {
        return NextResponse.json(
          { error: 'At least one charge is required' },
          { status: 400 }
        );
      }

      // Get existing account codes for this lease
      const existingCharges = await prisma.scheduledCharge.findMany({
        where: { leaseId, active: true },
        select: { accountCode: true, description: true }
      });
      const existingAccountCodes = new Set(existingCharges.map(c => c.accountCode));

      // Track account codes in this batch to detect duplicates within the batch
      const batchAccountCodes = new Set<string>();

      // Validate all charges
      for (let i = 0; i < charges.length; i++) {
        const charge = charges[i];
        const accountCode = charge.accountCode || '4000';

        if (!charge.description || !charge.description.trim()) {
          return NextResponse.json(
            { error: `Charge ${i + 1}: Description is required` },
            { status: 400 }
          );
        }
        if (!charge.amount || parseFloat(charge.amount) <= 0) {
          return NextResponse.json(
            { error: `Charge ${i + 1}: Amount must be greater than zero` },
            { status: 400 }
          );
        }
        if (!charge.chargeDay || charge.chargeDay < 1 || charge.chargeDay > 28) {
          return NextResponse.json(
            { error: `Charge ${i + 1}: Charge day must be between 1 and 28` },
            { status: 400 }
          );
        }

        // Check for duplicate account code in existing charges
        if (existingAccountCodes.has(accountCode)) {
          const existing = existingCharges.find(c => c.accountCode === accountCode);
          return NextResponse.json(
            { error: `Account ${accountCode} is already scheduled for this lease (${existing?.description}). Each account can only be charged once per month.` },
            { status: 400 }
          );
        }

        // Check for duplicate account code within this batch
        if (batchAccountCodes.has(accountCode)) {
          return NextResponse.json(
            { error: `Charge ${i + 1}: Account ${accountCode} is duplicated in this batch. Each account can only be charged once per month.` },
            { status: 400 }
          );
        }
        batchAccountCodes.add(accountCode);
      }

      // Create all charges in a transaction
      const createdCharges = await prisma.$transaction(
        charges.map((charge: any) =>
          prisma.scheduledCharge.create({
            data: {
              leaseId,
              description: charge.description.trim(),
              amount: parseFloat(charge.amount),
              chargeDay: parseInt(charge.chargeDay),
              accountCode: charge.accountCode || '4000',
              active: charge.active !== false
            }
          })
        )
      );

      return NextResponse.json({
        success: true,
        count: createdCharges.length,
        charges: createdCharges
      }, { status: 201 });
    }

    // Single charge creation (backwards compatible)
    // Validate required fields
    if (!body.leaseId) {
      return NextResponse.json(
        { error: 'Lease ID is required' },
        { status: 400 }
      );
    }

    if (!body.description || !body.description.trim()) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    if (!body.amount || parseFloat(body.amount) <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than zero' },
        { status: 400 }
      );
    }

    if (!body.chargeDay || body.chargeDay < 1 || body.chargeDay > 28) {
      return NextResponse.json(
        { error: 'Charge day must be between 1 and 28' },
        { status: 400 }
      );
    }

    // Check for duplicate account code on this lease
    const accountCode = body.accountCode || '4000';
    const existingCharge = await prisma.scheduledCharge.findFirst({
      where: {
        leaseId: body.leaseId,
        accountCode: accountCode,
        active: true
      },
      select: { description: true }
    });

    if (existingCharge) {
      return NextResponse.json(
        { error: `Account ${accountCode} is already scheduled for this lease (${existingCharge.description}). Each account can only be charged once per month.` },
        { status: 400 }
      );
    }

    const scheduledCharge = await prisma.scheduledCharge.create({
      data: {
        leaseId: body.leaseId,
        description: body.description.trim(),
        amount: parseFloat(body.amount),
        chargeDay: parseInt(body.chargeDay),
        accountCode: accountCode,
        active: body.active !== false
      }
    });

    return NextResponse.json(scheduledCharge, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/scheduled-charges error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create scheduled charge' },
      { status: 400 }
    );
  }
}
