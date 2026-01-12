import { NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/admin/integrity - Check data integrity
// Note: Protected by middleware (same-origin browser requests allowed)
export async function GET() {
  const checks: {
    name: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
    details?: any;
  }[] = [];

  // 1. Units with invalid property references
  try {
    const allUnits = await prisma.unit.findMany({
      select: { id: true, unitNumber: true, propertyId: true }
    });
    const allPropertyIds = (await prisma.property.findMany({ select: { id: true } })).map(p => p.id);
    const orphanedUnits = allUnits.filter(u => !allPropertyIds.includes(u.propertyId));

    checks.push({
      name: 'Units with Valid Properties',
      status: orphanedUnits.length === 0 ? 'ok' : 'error',
      message: orphanedUnits.length === 0
        ? 'All units belong to valid properties'
        : `${orphanedUnits.length} units have invalid property references`,
      details: orphanedUnits.length > 0 ? orphanedUnits : undefined
    });
  } catch (e: any) {
    checks.push({ name: 'Units with Valid Properties', status: 'error', message: e.message });
  }

  // 2. Leases with tenant information
  try {
    const allLeases = await prisma.lease.findMany({
      select: { id: true, unitName: true, tenantName: true }
    });
    const leasesWithoutTenantName = allLeases.filter(l => !l.tenantName || l.tenantName.trim() === '');
    checks.push({
      name: 'Leases with Tenant Names',
      status: leasesWithoutTenantName.length === 0 ? 'ok' : 'warning',
      message: leasesWithoutTenantName.length === 0
        ? 'All leases have tenant names'
        : `${leasesWithoutTenantName.length} leases missing tenant name`,
      details: leasesWithoutTenantName.length > 0 ? leasesWithoutTenantName : undefined
    });
  } catch (e: any) {
    checks.push({ name: 'Leases with Tenant Names', status: 'error', message: e.message });
  }

  // 3. Active leases with past end dates
  try {
    const expiredActiveLeases = await prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lt: new Date() }
      },
      select: {
        id: true,
        tenantName: true,
        unitName: true,
        endDate: true
      }
    });
    checks.push({
      name: 'Expired Active Leases',
      status: expiredActiveLeases.length === 0 ? 'ok' : 'warning',
      message: expiredActiveLeases.length === 0
        ? 'No active leases are past their end date'
        : `${expiredActiveLeases.length} active leases are past end date`,
      details: expiredActiveLeases.length > 0 ? expiredActiveLeases.map(l => ({
        id: l.id,
        tenant: l.tenantName,
        unit: l.unitName,
        endDate: l.endDate
      })) : undefined
    });
  } catch (e: any) {
    checks.push({ name: 'Expired Active Leases', status: 'error', message: e.message });
  }

  // 4. Scheduled charges with valid lease references
  try {
    const allCharges = await prisma.scheduledCharge.findMany({
      select: { id: true, leaseId: true, description: true }
    });
    const allLeaseIds = (await prisma.lease.findMany({ select: { id: true } })).map(l => l.id);
    const orphanedCharges = allCharges.filter(c => !allLeaseIds.includes(c.leaseId));

    checks.push({
      name: 'Scheduled Charges with Valid Leases',
      status: orphanedCharges.length === 0 ? 'ok' : 'error',
      message: orphanedCharges.length === 0
        ? 'All scheduled charges belong to valid leases'
        : `${orphanedCharges.length} scheduled charges have invalid lease references`,
      details: orphanedCharges.length > 0 ? orphanedCharges : undefined
    });
  } catch (e: any) {
    checks.push({ name: 'Scheduled Charges with Valid Leases', status: 'error', message: e.message });
  }

  // 5. Active charges on inactive leases
  try {
    const chargesOnInactiveLeases = await prisma.scheduledCharge.findMany({
      where: {
        active: true,
        lease: { status: { not: 'ACTIVE' } }
      },
      select: {
        id: true,
        description: true,
        lease: { select: { status: true, tenantName: true } }
      }
    });
    checks.push({
      name: 'Active Charges on Inactive Leases',
      status: chargesOnInactiveLeases.length === 0 ? 'ok' : 'warning',
      message: chargesOnInactiveLeases.length === 0
        ? 'No active charges on inactive leases'
        : `${chargesOnInactiveLeases.length} active charges on inactive leases`,
      details: chargesOnInactiveLeases.length > 0 ? chargesOnInactiveLeases.map(c => ({
        chargeId: c.id,
        description: c.description,
        leaseStatus: c.lease?.status,
        tenant: c.lease?.tenantName
      })) : undefined
    });
  } catch (e: any) {
    checks.push({ name: 'Active Charges on Inactive Leases', status: 'error', message: e.message });
  }

  // 6. Ledger entries with valid account codes
  try {
    const validAccounts = await prisma.chartOfAccounts.findMany({ select: { code: true } });
    const validCodes = validAccounts.map(a => a.code);

    const ledgerEntries = await prisma.ledgerEntry.findMany({ select: { id: true, accountCode: true } });
    const invalidEntries = ledgerEntries.filter(e => !validCodes.includes(e.accountCode));

    checks.push({
      name: 'Valid Account Codes in Ledger',
      status: invalidEntries.length === 0 ? 'ok' : 'error',
      message: invalidEntries.length === 0
        ? 'All ledger entries have valid account codes'
        : `${invalidEntries.length} entries have invalid account codes`,
      details: invalidEntries.length > 0 ? invalidEntries.slice(0, 10) : undefined
    });
  } catch (e: any) {
    checks.push({ name: 'Valid Account Codes in Ledger', status: 'error', message: e.message });
  }

  // 7. Ledger balance check (debits should equal credits)
  try {
    const debits = await prisma.ledgerEntry.aggregate({
      where: { debitCredit: 'DR' },
      _sum: { amount: true }
    });
    const credits = await prisma.ledgerEntry.aggregate({
      where: { debitCredit: 'CR' },
      _sum: { amount: true }
    });

    const debitTotal = Number(debits._sum.amount || 0);
    const creditTotal = Number(credits._sum.amount || 0);
    const difference = Math.abs(debitTotal - creditTotal);

    checks.push({
      name: 'Ledger Balance (Debits = Credits)',
      status: difference < 0.01 ? 'ok' : 'error',
      message: difference < 0.01
        ? `Balanced: Debits $${debitTotal.toFixed(2)} = Credits $${creditTotal.toFixed(2)}`
        : `UNBALANCED: Debits $${debitTotal.toFixed(2)} ≠ Credits $${creditTotal.toFixed(2)} (diff: $${difference.toFixed(2)})`,
      details: { debits: debitTotal, credits: creditTotal, difference }
    });
  } catch (e: any) {
    checks.push({ name: 'Ledger Balance', status: 'error', message: e.message });
  }

  // 8. Multiple active leases on same unit
  try {
    const unitsWithLeases = await prisma.unit.findMany({
      include: {
        leases: {
          where: { status: 'ACTIVE' },
          select: { id: true }
        }
      }
    });

    const problemUnits = unitsWithLeases.filter(u => u.leases.length > 1);

    checks.push({
      name: 'Multiple Active Leases per Unit',
      status: problemUnits.length === 0 ? 'ok' : 'error',
      message: problemUnits.length === 0
        ? 'Each unit has at most one active lease'
        : `${problemUnits.length} units have multiple active leases`,
      details: problemUnits.length > 0 ? problemUnits.map(u => ({
        unitId: u.id,
        unitNumber: u.unitNumber,
        activeLeaseCount: u.leases.length
      })) : undefined
    });
  } catch (e: any) {
    checks.push({ name: 'Multiple Active Leases per Unit', status: 'error', message: e.message });
  }

  // 9. Work orders with valid unit references
  try {
    const allWorkOrders = await prisma.workOrder.findMany({
      select: { id: true, title: true, unitId: true }
    });
    const allUnitIds = (await prisma.unit.findMany({ select: { id: true } })).map(u => u.id);
    const orphanedWorkOrders = allWorkOrders.filter(w => w.unitId && !allUnitIds.includes(w.unitId));

    checks.push({
      name: 'Work Orders with Valid Units',
      status: orphanedWorkOrders.length === 0 ? 'ok' : 'warning',
      message: orphanedWorkOrders.length === 0
        ? 'All work orders have valid unit references'
        : `${orphanedWorkOrders.length} work orders have invalid unit references`,
      details: orphanedWorkOrders.length > 0 ? orphanedWorkOrders : undefined
    });
  } catch (e: any) {
    checks.push({ name: 'Work Orders with Valid Units', status: 'error', message: e.message });
  }

  // 10. Required chart of accounts exist
  try {
    const requiredAccounts = [
      { code: '1000', name: 'Operating Cash' },
      { code: '1200', name: 'Accounts Receivable' },
      { code: '4000', name: 'Rental Income' },
      { code: '4100', name: 'Other Income' },
      { code: '5000', name: 'Maintenance Expense' }
    ];
    const existingAccounts = await prisma.chartOfAccounts.findMany({
      where: { code: { in: requiredAccounts.map(a => a.code) } },
      select: { code: true }
    });
    const existingCodes = existingAccounts.map(a => a.code);
    const missingAccounts = requiredAccounts.filter(a => !existingCodes.includes(a.code));

    checks.push({
      name: 'Required Chart of Accounts',
      status: missingAccounts.length === 0 ? 'ok' : 'warning',
      message: missingAccounts.length === 0
        ? 'All recommended accounts exist'
        : `Missing accounts: ${missingAccounts.map(a => `${a.code} (${a.name})`).join(', ')}`,
      details: missingAccounts.length > 0 ? { required: requiredAccounts, missing: missingAccounts } : undefined
    });
  } catch (e: any) {
    checks.push({ name: 'Required Chart of Accounts', status: 'error', message: e.message });
  }

  // 11. Leases have valid unit references
  try {
    const leasesWithUnits = await prisma.lease.findMany({
      where: { unitId: { not: null } },
      select: { id: true, unitId: true, tenantName: true }
    });
    const allUnitIds = (await prisma.unit.findMany({ select: { id: true } })).map(u => u.id);
    const invalidLeases = leasesWithUnits.filter(l => l.unitId && !allUnitIds.includes(l.unitId));

    checks.push({
      name: 'Leases with Valid Units',
      status: invalidLeases.length === 0 ? 'ok' : 'error',
      message: invalidLeases.length === 0
        ? 'All leases with units have valid references'
        : `${invalidLeases.length} leases have invalid unit references`,
      details: invalidLeases.length > 0 ? invalidLeases : undefined
    });
  } catch (e: any) {
    checks.push({ name: 'Leases with Valid Units', status: 'error', message: e.message });
  }

  // Summary
  const errors = checks.filter(c => c.status === 'error').length;
  const warnings = checks.filter(c => c.status === 'warning').length;
  const passed = checks.filter(c => c.status === 'ok').length;

  return NextResponse.json({
    summary: {
      total: checks.length,
      passed,
      warnings,
      errors,
      status: errors > 0 ? 'error' : warnings > 0 ? 'warning' : 'ok'
    },
    checks
  });
}
