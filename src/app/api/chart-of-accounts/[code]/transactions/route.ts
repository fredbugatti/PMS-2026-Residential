import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/chart-of-accounts/[code]/transactions - Get transactions for an account
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get transactions using raw SQL
    // Note: Using status column instead of voided for compatibility
    const transactions = await prisma.$queryRaw`
      SELECT
        l.id,
        l.entry_date as "entryDate",
        l.amount,
        l.debit_credit as "debitCredit",
        l.description,
        l.posted_by as "postedBy",
        l.created_at as "createdAt",
        CASE WHEN l.status = 'VOID' THEN true ELSE false END as "voided",
        l.lease_id as "leaseId",
        le.unit_id as "unitId",
        u.unit_number as "unitNumber",
        p.name as "propertyName"
      FROM ledger_entries l
      LEFT JOIN leases le ON l.lease_id = le.id
      LEFT JOIN units u ON le.unit_id = u.id
      LEFT JOIN properties p ON u.property_id = p.id
      WHERE l.account_code = ${params.code}
      ORDER BY l.entry_date DESC, l.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Get total count
    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM ledger_entries
      WHERE account_code = ${params.code}
    `;
    const total = Number(countResult[0].count);

    // Get account summary (excluding voided entries)
    const summaryResult = await prisma.$queryRaw<[{
      totalDebits: string;
      totalCredits: string;
    }]>`
      SELECT
        COALESCE(SUM(CASE WHEN debit_credit = 'DR' THEN amount ELSE 0 END), 0) as "totalDebits",
        COALESCE(SUM(CASE WHEN debit_credit = 'CR' THEN amount ELSE 0 END), 0) as "totalCredits"
      FROM ledger_entries
      WHERE account_code = ${params.code} AND (status IS NULL OR status != 'VOID')
    `;

    return NextResponse.json({
      transactions,
      total,
      limit,
      offset,
      summary: {
        totalDebits: parseFloat(summaryResult[0].totalDebits) || 0,
        totalCredits: parseFloat(summaryResult[0].totalCredits) || 0,
      }
    });
  } catch (error: any) {
    console.error('GET /api/chart-of-accounts/[code]/transactions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
