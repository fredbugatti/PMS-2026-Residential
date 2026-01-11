import { prisma } from './accounting';

/**
 * Create ledger entries when a work order is completed and paid
 *
 * Scenarios:
 * 1. Owner pays, no tenant recovery: DR Maintenance Expense, CR Cash
 * 2. Tenant pays (damage): DR Maintenance Expense, CR Cash, then DR AR, CR Recovery Income
 */
export async function createWorkOrderLedgerEntries(
  workOrderId: string,
  actualCost: number,
  paidBy: 'OWNER' | 'TENANT',
  leaseId: string | null,
  description: string
) {
  const entryDate = new Date().toISOString().split('T')[0];
  const idempotencyBase = `wo-${workOrderId}-${Date.now()}`;

  try {
    if (paidBy === 'OWNER') {
      // Owner pays: Record as maintenance expense
      // DR: Maintenance Expense (6100)
      await prisma.ledgerEntry.create({
        data: {
          entryDate: new Date(entryDate),
          accountCode: '6100',
          amount: actualCost,
          debitCredit: 'DR',
          description: `Maintenance: ${description}`,
          idempotencyKey: `${idempotencyBase}-expense-dr`,
          postedBy: 'System - Work Order',
          leaseId: leaseId
        }
      });

      // CR: Cash (1000)
      await prisma.ledgerEntry.create({
        data: {
          entryDate: new Date(entryDate),
          accountCode: '1000',
          amount: actualCost,
          debitCredit: 'CR',
          description: `Maintenance payment: ${description}`,
          idempotencyKey: `${idempotencyBase}-cash-cr`,
          postedBy: 'System - Work Order'
        }
      });
    } else if (paidBy === 'TENANT') {
      // Tenant pays (tenant-caused damage)
      // First, record the expense (owner paid vendor)
      // DR: Maintenance Expense (6100)
      await prisma.ledgerEntry.create({
        data: {
          entryDate: new Date(entryDate),
          accountCode: '6100',
          amount: actualCost,
          debitCredit: 'DR',
          description: `Maintenance (tenant damage): ${description}`,
          idempotencyKey: `${idempotencyBase}-expense-dr`,
          postedBy: 'System - Work Order',
          leaseId: leaseId
        }
      });

      // CR: Cash (1000)
      await prisma.ledgerEntry.create({
        data: {
          entryDate: new Date(entryDate),
          accountCode: '1000',
          amount: actualCost,
          debitCredit: 'CR',
          description: `Maintenance payment: ${description}`,
          idempotencyKey: `${idempotencyBase}-cash-cr`,
          postedBy: 'System - Work Order'
        }
      });

      // Then, charge the tenant (recovery)
      // DR: Accounts Receivable (1200)
      await prisma.ledgerEntry.create({
        data: {
          entryDate: new Date(entryDate),
          accountCode: '1200',
          amount: actualCost,
          debitCredit: 'DR',
          description: `Tenant damage charge: ${description}`,
          idempotencyKey: `${idempotencyBase}-ar-dr`,
          postedBy: 'System - Work Order',
          leaseId: leaseId
        }
      });

      // CR: Maintenance Recovery Income (4200)
      await prisma.ledgerEntry.create({
        data: {
          entryDate: new Date(entryDate),
          accountCode: '4200',
          amount: actualCost,
          debitCredit: 'CR',
          description: `Maintenance recovery: ${description}`,
          idempotencyKey: `${idempotencyBase}-recovery-cr`,
          postedBy: 'System - Work Order',
          leaseId: leaseId
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating work order ledger entries:', error);
    throw error;
  }
}

/**
 * Check if a 4200 account (Maintenance Recovery Income) exists, create if not
 */
export async function ensureMaintenanceRecoveryAccount() {
  const exists = await prisma.chartOfAccounts.findUnique({
    where: { code: '4200' }
  });

  if (!exists) {
    await prisma.chartOfAccounts.create({
      data: {
        code: '4200',
        name: 'Maintenance Recovery Income',
        type: 'INCOME',
        normalBalance: 'CR',
        active: true
      }
    });
  }
}

/**
 * Check if a 6100 account (Maintenance Expense) exists, create if not
 */
export async function ensureMaintenanceExpenseAccount() {
  const exists = await prisma.chartOfAccounts.findUnique({
    where: { code: '6100' }
  });

  if (!exists) {
    await prisma.chartOfAccounts.create({
      data: {
        code: '6100',
        name: 'Maintenance Expense',
        type: 'EXPENSE',
        normalBalance: 'DR',
        active: true
      }
    });
  }
}
