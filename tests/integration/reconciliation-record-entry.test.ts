// Integration tests for reconciliation record-entry feature
// Tests the full flow: record payment/expense from unmatched bank statement lines,
// including vendor creation, ledger entry posting, and line matching.

import { prisma, withLedgerTransaction } from '../../src/lib/accounting';
import { createTestLease, cleanupTestData } from '../setup';

// Unique suffix to avoid idempotency key collisions across test suites
const uid = Math.random().toString(36).substring(2, 8);

// Test data references
let testLease: any;
let bankAccount: any;
let reconciliation: any;

// Helper: create a bank account for reconciliation tests
async function createTestBankAccount() {
  return prisma.bankAccount.create({
    data: {
      name: 'Test Operating Account',
      last4: '9999',
      accountCode: '1000',
      active: true,
    },
  });
}

// Helper: create an IN_PROGRESS reconciliation with lines
async function createTestReconciliation(bankAccountId: string, lines: Array<{
  description: string;
  amount: number;
  lineDate?: Date;
  reference?: string;
}>) {
  const recon = await prisma.reconciliation.create({
    data: {
      bankAccountId,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-31'),
      statementBalance: 10000,
      status: 'IN_PROGRESS',
    },
  });

  const createdLines = [];
  for (const line of lines) {
    const created = await prisma.reconciliationLine.create({
      data: {
        reconciliationId: recon.id,
        lineDate: line.lineDate || new Date('2025-01-15'),
        description: line.description,
        amount: line.amount,
        reference: line.reference || null,
        status: 'UNMATCHED',
      },
    });
    createdLines.push(created);
  }

  return { reconciliation: recon, lines: createdLines };
}

// Helper: clean up reconciliation test data
async function cleanupReconciliationData(reconId: string, bankAccountId: string) {
  await prisma.reconciliationLine.deleteMany({ where: { reconciliationId: reconId } });
  await prisma.reconciliation.delete({ where: { id: reconId } });
  await prisma.bankAccount.delete({ where: { id: bankAccountId } });
}

// Helper: simulate the record-entry API logic directly (unit-level integration test)
async function recordEntry(params: {
  reconciliationId: string;
  type: 'payment' | 'expense';
  lineId: string;
  amount: number;
  description: string;
  entryDate: string;
  leaseId?: string;
  accountCode?: string;
  vendorId?: string;
  newVendor?: {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    specialties?: string[];
    paymentTerms?: 'DUE_ON_RECEIPT' | 'NET_15' | 'NET_30' | 'NET_60';
  };
}) {
  const { reconciliationId, type, lineId, amount, description, entryDate, leaseId, accountCode, vendorId, newVendor } = params;

  // Validate type-specific requirements
  if (type === 'payment' && !leaseId) {
    throw new Error('leaseId is required for payment entries');
  }
  if (type === 'expense' && !accountCode) {
    throw new Error('accountCode is required for expense entries');
  }

  // Verify reconciliation exists and is IN_PROGRESS
  const recon = await prisma.reconciliation.findUnique({ where: { id: reconciliationId } });
  if (!recon) throw new Error('Reconciliation not found');
  if (recon.status !== 'IN_PROGRESS') throw new Error('Cannot modify a finalized reconciliation');

  // Verify line
  const line = await prisma.reconciliationLine.findUnique({ where: { id: lineId } });
  if (!line) throw new Error('Reconciliation line not found');
  if (line.reconciliationId !== reconciliationId) throw new Error('Line does not belong to this reconciliation');
  if (line.status !== 'UNMATCHED') throw new Error('Line is not in UNMATCHED status');

  const parsedDate = new Date(entryDate);

  return withLedgerTransaction(async (tx, postEntry) => {
    let resolvedVendorId = vendorId || null;
    let createdVendor = null;

    if (newVendor) {
      createdVendor = await tx.vendor.create({
        data: {
          name: newVendor.name,
          company: newVendor.company || null,
          email: newVendor.email || null,
          phone: newVendor.phone || null,
          specialties: newVendor.specialties || [],
          paymentTerms: newVendor.paymentTerms || null,
          active: true,
        },
      });
      resolvedVendorId = createdVendor.id;
    }

    let cashEntry;

    if (type === 'payment') {
      // DR 1000 (Cash) / CR 1200 (A/R)
      cashEntry = await postEntry({
        accountCode: '1000',
        amount,
        debitCredit: 'DR',
        description,
        entryDate: parsedDate,
        leaseId,
        postedBy: 'test',
      });
      await postEntry({
        accountCode: '1200',
        amount,
        debitCredit: 'CR',
        description,
        entryDate: parsedDate,
        leaseId,
        postedBy: 'test',
      });
    } else {
      // DR {accountCode} (Expense) / CR 1000 (Cash)
      await postEntry({
        accountCode: accountCode!,
        amount,
        debitCredit: 'DR',
        description,
        entryDate: parsedDate,
        postedBy: 'test',
      });
      cashEntry = await postEntry({
        accountCode: '1000',
        amount,
        debitCredit: 'CR',
        description,
        entryDate: parsedDate,
        postedBy: 'test',
      });
    }

    // Update reconciliation line to MATCHED
    const updatedLine = await tx.reconciliationLine.update({
      where: { id: lineId },
      data: {
        status: 'MATCHED',
        ledgerEntryId: cashEntry.id,
        matchedAt: new Date(),
        matchConfidence: 'manual',
      },
    });

    return { cashEntry, updatedLine, createdVendor };
  });
}

describe('Reconciliation Record Entry', () => {
  // Track created vendors for cleanup
  const createdVendorIds: string[] = [];

  beforeAll(async () => {
    const data = await createTestLease();
    testLease = data.lease;
    bankAccount = await createTestBankAccount();
  });

  afterAll(async () => {
    // Clean up vendors created during tests
    for (const vendorId of createdVendorIds) {
      try {
        await prisma.vendor.delete({ where: { id: vendorId } });
      } catch {
        // Vendor may already be cleaned up
      }
    }

    if (testLease) {
      await cleanupTestData(testLease.id);
    }
    if (bankAccount) {
      // Clean up any remaining reconciliations
      const recons = await prisma.reconciliation.findMany({
        where: { bankAccountId: bankAccount.id },
      });
      for (const r of recons) {
        await prisma.reconciliationLine.deleteMany({ where: { reconciliationId: r.id } });
        await prisma.reconciliation.delete({ where: { id: r.id } });
      }
      await prisma.bankAccount.delete({ where: { id: bankAccount.id } });
    }
  });

  describe('Record Payment', () => {
    let recon: any;
    let lines: any[];

    beforeAll(async () => {
      const data = await createTestReconciliation(bankAccount.id, [
        { description: 'DEPOSIT - Tenant Rent', amount: 2500, reference: 'DEP001' },
        { description: 'DEPOSIT - Tenant Payment', amount: 1500, reference: 'DEP002' },
      ]);
      recon = data.reconciliation;
      lines = data.lines;
    });

    afterAll(async () => {
      if (recon) {
        // Void ledger entries linked to lines
        for (const line of lines) {
          if (line.ledgerEntryId) {
            await prisma.ledgerEntry.updateMany({
              where: { id: line.ledgerEntryId },
              data: { status: 'VOID' },
            });
          }
        }
        await prisma.reconciliationLine.deleteMany({ where: { reconciliationId: recon.id } });
        await prisma.reconciliation.delete({ where: { id: recon.id } });
      }
    });

    test('should record payment and match line with correct ledger entries', async () => {
      const result = await recordEntry({
        reconciliationId: recon.id,
        type: 'payment',
        lineId: lines[0].id,
        amount: 2500,
        description: `Rent payment from tenant ${uid}`,
        entryDate: '2025-01-15',
        leaseId: testLease.id,
      });

      // Line should be MATCHED
      expect(result.updatedLine.status).toBe('MATCHED');
      expect(result.updatedLine.ledgerEntryId).toBe(result.cashEntry.id);
      expect(result.updatedLine.matchConfidence).toBe('manual');
      expect(result.updatedLine.matchedAt).toBeTruthy();

      // Verify ledger entries: DR 1000, CR 1200
      const entries = await prisma.ledgerEntry.findMany({
        where: {
          leaseId: testLease.id,
          description: `Rent payment from tenant ${uid}`,
          status: 'POSTED',
        },
      });

      expect(entries.length).toBe(2);

      const debit = entries.find((e: any) => e.debitCredit === 'DR');
      const credit = entries.find((e: any) => e.debitCredit === 'CR');

      expect(debit).toBeDefined();
      expect(credit).toBeDefined();
      expect(debit!.accountCode).toBe('1000'); // Cash
      expect(credit!.accountCode).toBe('1200'); // A/R
      expect(Number(debit!.amount)).toBe(2500);
      expect(Number(credit!.amount)).toBe(2500);

      // Update line reference for cleanup
      lines[0] = result.updatedLine;
    });

    test('should reject payment without leaseId', async () => {
      await expect(
        recordEntry({
          reconciliationId: recon.id,
          type: 'payment',
          lineId: lines[1].id,
          amount: 1500,
          description: `Payment without lease ${uid}`,
          entryDate: '2025-01-15',
        })
      ).rejects.toThrow('leaseId is required for payment entries');
    });

    test('should reject recording on already matched line', async () => {
      await expect(
        recordEntry({
          reconciliationId: recon.id,
          type: 'payment',
          lineId: lines[0].id, // Already matched in first test
          amount: 2500,
          description: `Double match attempt ${uid}`,
          entryDate: '2025-01-15',
          leaseId: testLease.id,
        })
      ).rejects.toThrow('Line is not in UNMATCHED status');
    });
  });

  describe('Record Expense', () => {
    let recon: any;
    let lines: any[];

    beforeAll(async () => {
      const data = await createTestReconciliation(bankAccount.id, [
        { description: 'CHECK 1234 - Plumber', amount: -850, reference: 'CHK1234' },
        { description: 'ACH - Electric Bill', amount: -320, reference: 'ACH001' },
        { description: 'CHECK 1235 - HVAC Service', amount: -1200, reference: 'CHK1235' },
        { description: 'CHECK 1236 - Landscaping', amount: -500, reference: 'CHK1236' },
      ]);
      recon = data.reconciliation;
      lines = data.lines;
    });

    afterAll(async () => {
      if (recon) {
        await prisma.reconciliationLine.deleteMany({ where: { reconciliationId: recon.id } });
        await prisma.reconciliation.delete({ where: { id: recon.id } });
      }
    });

    test('should record expense with correct ledger entries (DR expense / CR cash)', async () => {
      const result = await recordEntry({
        reconciliationId: recon.id,
        type: 'expense',
        lineId: lines[0].id,
        amount: 850,
        description: `Plumbing repair ${uid}`,
        entryDate: '2025-01-10',
        accountCode: '5000', // Repairs & Maintenance
      });

      // Line should be MATCHED
      expect(result.updatedLine.status).toBe('MATCHED');
      expect(result.updatedLine.ledgerEntryId).toBe(result.cashEntry.id);
      expect(result.updatedLine.matchConfidence).toBe('manual');

      // Cash entry should be CR (money going out)
      expect(result.cashEntry.debitCredit).toBe('CR');
      expect(result.cashEntry.accountCode).toBe('1000');
      expect(Number(result.cashEntry.amount)).toBe(850);

      // Verify the expense debit entry
      const entries = await prisma.ledgerEntry.findMany({
        where: {
          description: `Plumbing repair ${uid}`,
          status: 'POSTED',
        },
      });

      const debit = entries.find((e: any) => e.debitCredit === 'DR');
      expect(debit).toBeDefined();
      expect(debit!.accountCode).toBe('5000');
      expect(Number(debit!.amount)).toBe(850);

      lines[0] = result.updatedLine;
    });

    test('should reject expense without accountCode', async () => {
      await expect(
        recordEntry({
          reconciliationId: recon.id,
          type: 'expense',
          lineId: lines[1].id,
          amount: 320,
          description: `Expense without account ${uid}`,
          entryDate: '2025-01-12',
        })
      ).rejects.toThrow('accountCode is required for expense entries');
    });

    test('should record expense with new vendor creation', async () => {
      const result = await recordEntry({
        reconciliationId: recon.id,
        type: 'expense',
        lineId: lines[2].id,
        amount: 1200,
        description: `HVAC annual service ${uid}`,
        entryDate: '2025-01-20',
        accountCode: '5000',
        newVendor: {
          name: 'Cool Air HVAC',
          company: 'Cool Air Services LLC',
          email: 'service@coolair.test',
          phone: '555-0200',
          specialties: ['HVAC'],
          paymentTerms: 'NET_30',
        },
      });

      // Vendor should be created
      expect(result.createdVendor).toBeTruthy();
      expect(result.createdVendor.name).toBe('Cool Air HVAC');
      expect(result.createdVendor.company).toBe('Cool Air Services LLC');
      expect(result.createdVendor.email).toBe('service@coolair.test');
      expect(result.createdVendor.specialties).toEqual(['HVAC']);
      expect(result.createdVendor.paymentTerms).toBe('NET_30');
      expect(result.createdVendor.active).toBe(true);

      // Track for cleanup
      createdVendorIds.push(result.createdVendor.id);

      // Verify vendor exists in DB
      const vendor = await prisma.vendor.findUnique({ where: { id: result.createdVendor.id } });
      expect(vendor).toBeTruthy();
      expect(vendor!.name).toBe('Cool Air HVAC');

      // Line should be matched
      expect(result.updatedLine.status).toBe('MATCHED');

      lines[2] = result.updatedLine;
    });

    test('should record expense without vendor (optional)', async () => {
      const result = await recordEntry({
        reconciliationId: recon.id,
        type: 'expense',
        lineId: lines[3].id,
        amount: 500,
        description: `Landscaping service ${uid}`,
        entryDate: '2025-01-25',
        accountCode: '5000',
        // No vendor — intentionally omitted
      });

      expect(result.updatedLine.status).toBe('MATCHED');
      expect(result.createdVendor).toBeNull();

      lines[3] = result.updatedLine;
    });
  });

  describe('Validation & Error Cases', () => {
    let recon: any;
    let lines: any[];

    beforeAll(async () => {
      const data = await createTestReconciliation(bankAccount.id, [
        { description: 'Test line for errors', amount: 100 },
      ]);
      recon = data.reconciliation;
      lines = data.lines;
    });

    afterAll(async () => {
      if (recon) {
        await prisma.reconciliationLine.deleteMany({ where: { reconciliationId: recon.id } });
        await prisma.reconciliation.delete({ where: { id: recon.id } });
      }
    });

    test('should reject when reconciliation does not exist', async () => {
      await expect(
        recordEntry({
          reconciliationId: '00000000-0000-0000-0000-000000000000',
          type: 'payment',
          lineId: lines[0].id,
          amount: 100,
          description: 'Test',
          entryDate: '2025-01-15',
          leaseId: testLease.id,
        })
      ).rejects.toThrow('Reconciliation not found');
    });

    test('should reject when line does not belong to reconciliation', async () => {
      // Create a second reconciliation
      const otherRecon = await prisma.reconciliation.create({
        data: {
          bankAccountId: bankAccount.id,
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-02-28'),
          statementBalance: 5000,
          status: 'IN_PROGRESS',
        },
      });

      try {
        await expect(
          recordEntry({
            reconciliationId: otherRecon.id,
            type: 'payment',
            lineId: lines[0].id, // Belongs to 'recon', not 'otherRecon'
            amount: 100,
            description: `Wrong recon test ${uid}`,
            entryDate: '2025-02-15',
            leaseId: testLease.id,
          })
        ).rejects.toThrow('Line does not belong to this reconciliation');
      } finally {
        await prisma.reconciliation.delete({ where: { id: otherRecon.id } });
      }
    });

    test('should reject when reconciliation is FINALIZED', async () => {
      // Create a finalized reconciliation
      const finalizedRecon = await prisma.reconciliation.create({
        data: {
          bankAccountId: bankAccount.id,
          startDate: new Date('2025-03-01'),
          endDate: new Date('2025-03-31'),
          statementBalance: 3000,
          status: 'FINALIZED',
          finalizedAt: new Date(),
          finalizedBy: 'test',
        },
      });
      const finalizedLine = await prisma.reconciliationLine.create({
        data: {
          reconciliationId: finalizedRecon.id,
          lineDate: new Date('2025-03-15'),
          description: 'Finalized line',
          amount: 100,
          status: 'UNMATCHED',
        },
      });

      try {
        await expect(
          recordEntry({
            reconciliationId: finalizedRecon.id,
            type: 'payment',
            lineId: finalizedLine.id,
            amount: 100,
            description: `Should fail ${uid}`,
            entryDate: '2025-03-15',
            leaseId: testLease.id,
          })
        ).rejects.toThrow('Cannot modify a finalized reconciliation');
      } finally {
        await prisma.reconciliationLine.deleteMany({ where: { reconciliationId: finalizedRecon.id } });
        await prisma.reconciliation.delete({ where: { id: finalizedRecon.id } });
      }
    });
  });

  describe('Balanced Books Verification', () => {
    let recon: any;
    let lines: any[];

    beforeAll(async () => {
      const data = await createTestReconciliation(bankAccount.id, [
        { description: 'Deposit 1', amount: 3000 },
        { description: 'Withdrawal 1', amount: -750 },
        { description: 'Deposit 2', amount: 1000 },
      ]);
      recon = data.reconciliation;
      lines = data.lines;
    });

    afterAll(async () => {
      if (recon) {
        await prisma.reconciliationLine.deleteMany({ where: { reconciliationId: recon.id } });
        await prisma.reconciliation.delete({ where: { id: recon.id } });
      }
    });

    test('books remain balanced after multiple record-entry operations', async () => {
      // Record a payment (deposit)
      await recordEntry({
        reconciliationId: recon.id,
        type: 'payment',
        lineId: lines[0].id,
        amount: 3000,
        description: `Balance test payment 1 ${uid}`,
        entryDate: '2025-01-05',
        leaseId: testLease.id,
      });

      // Record an expense (withdrawal)
      await recordEntry({
        reconciliationId: recon.id,
        type: 'expense',
        lineId: lines[1].id,
        amount: 750,
        description: `Balance test expense 1 ${uid}`,
        entryDate: '2025-01-10',
        accountCode: '5000',
      });

      // Record another payment
      await recordEntry({
        reconciliationId: recon.id,
        type: 'payment',
        lineId: lines[2].id,
        amount: 1000,
        description: `Balance test payment 2 ${uid}`,
        entryDate: '2025-01-15',
        leaseId: testLease.id,
      });

      // Verify all lines are now MATCHED
      const updatedLines = await prisma.reconciliationLine.findMany({
        where: { reconciliationId: recon.id },
      });
      expect(updatedLines.every((l: any) => l.status === 'MATCHED')).toBe(true);

      // Verify balanced books: total debits === total credits
      // Get all ledger entries from our test descriptions
      const allEntries = await prisma.ledgerEntry.findMany({
        where: {
          description: { endsWith: uid, startsWith: 'Balance test' },
          status: 'POSTED',
        },
      });

      let totalDebits = 0;
      let totalCredits = 0;
      for (const entry of allEntries) {
        const amt = Number(entry.amount);
        if (entry.debitCredit === 'DR') {
          totalDebits += amt;
        } else {
          totalCredits += amt;
        }
      }

      // 2 payments (3000+1000=4000) each create DR 1000 + CR 1200 = 4000 DR, 4000 CR
      // 1 expense (750) creates DR 5000 + CR 1000 = 750 DR, 750 CR
      // Total: 4750 DR, 4750 CR
      expect(totalDebits).toBe(4750);
      expect(totalCredits).toBe(4750);
      expect(totalDebits).toBe(totalCredits);
    });
  });

  describe('Atomicity', () => {
    let recon: any;
    let lines: any[];

    beforeAll(async () => {
      const data = await createTestReconciliation(bankAccount.id, [
        { description: 'Atomicity test line', amount: 500 },
      ]);
      recon = data.reconciliation;
      lines = data.lines;
    });

    afterAll(async () => {
      if (recon) {
        await prisma.reconciliationLine.deleteMany({ where: { reconciliationId: recon.id } });
        await prisma.reconciliation.delete({ where: { id: recon.id } });
      }
    });

    test('should not create partial data if expense account is invalid', async () => {
      // Use an invalid account code that doesn't exist in chart of accounts
      await expect(
        recordEntry({
          reconciliationId: recon.id,
          type: 'expense',
          lineId: lines[0].id,
          amount: 500,
          description: `Atomicity test - should rollback ${uid}`,
          entryDate: '2025-01-15',
          accountCode: '9999', // Non-existent account
        })
      ).rejects.toThrow();

      // Line should still be UNMATCHED (rolled back)
      const line = await prisma.reconciliationLine.findUnique({
        where: { id: lines[0].id },
      });
      expect(line!.status).toBe('UNMATCHED');
      expect(line!.ledgerEntryId).toBeNull();

      // No ledger entries should have been created
      const entries = await prisma.ledgerEntry.findMany({
        where: {
          description: `Atomicity test - should rollback ${uid}`,
          status: 'POSTED',
        },
      });
      expect(entries.length).toBe(0);
    });
  });
});
