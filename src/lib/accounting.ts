// Sanprinon Lite - Core Accounting Functions
// Safe, simple ledger posting with transaction support

import './env'; // Validate environment variables early
import { PrismaClient, DebitCredit, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Prevent multiple PrismaClient instances in development (hot-reload issue)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Type for Prisma transaction client
type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export interface PostEntryParams {
  accountCode: string;
  amount: number;
  debitCredit: DebitCredit;
  description: string;
  entryDate: Date;
  leaseId?: string;
  postedBy?: string;
}

export interface VoidEntryParams {
  entryId: string;
  reason: string;
  voidedBy: string;
  originalEntryId?: string; // ID of the entry being voided (for reversal tracking)
}

export interface LedgerEntryResult {
  id: string;
  createdAt: Date;
  entryDate: Date;
  accountCode: string;
  amount: string;
  debitCredit: DebitCredit;
  description: string;
  status: string;
}

/**
 * Post a double-entry transaction (debit and credit) atomically
 * This ensures both entries succeed or both fail - books stay balanced
 */
export async function postDoubleEntry(params: {
  debitEntry: PostEntryParams;
  creditEntry: PostEntryParams;
}): Promise<{ debit: LedgerEntryResult; credit: LedgerEntryResult }> {
  const { debitEntry, creditEntry } = params;

  // Validate amounts match for balanced entry
  if (debitEntry.amount !== creditEntry.amount) {
    throw new Error('Debit and credit amounts must match for balanced entry');
  }

  // Validate debit/credit sides
  if (debitEntry.debitCredit !== 'DR') {
    throw new Error('Debit entry must have debitCredit = DR');
  }
  if (creditEntry.debitCredit !== 'CR') {
    throw new Error('Credit entry must have debitCredit = CR');
  }

  return prisma.$transaction(async (tx) => {
    const debit = await postEntryWithTx(tx, debitEntry);
    const credit = await postEntryWithTx(tx, creditEntry);
    return { debit, credit };
  });
}

/**
 * Post multiple balanced entries atomically
 * Total debits must equal total credits
 */
export async function postBalancedEntries(entries: PostEntryParams[]): Promise<LedgerEntryResult[]> {
  // Validate balance
  let totalDebits = 0;
  let totalCredits = 0;
  for (const entry of entries) {
    if (entry.debitCredit === 'DR') {
      totalDebits += entry.amount;
    } else {
      totalCredits += entry.amount;
    }
  }

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error(`Entries are unbalanced: Debits $${totalDebits.toFixed(2)} != Credits $${totalCredits.toFixed(2)}`);
  }

  return prisma.$transaction(async (tx) => {
    const results: LedgerEntryResult[] = [];
    for (const entry of entries) {
      const result = await postEntryWithTx(tx, entry);
      results.push(result);
    }
    return results;
  });
}

/**
 * Execute a function within a transaction, with access to postEntry
 * Use this for complex operations that need both ledger entries and other updates
 */
export async function withLedgerTransaction<T>(
  fn: (tx: TransactionClient, postEntry: (params: PostEntryParams) => Promise<LedgerEntryResult>) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const boundPostEntry = (params: PostEntryParams) => postEntryWithTx(tx, params);
    return fn(tx, boundPostEntry);
  });
}

/**
 * Internal function to post entry within a transaction
 */
async function postEntryWithTx(
  tx: TransactionClient,
  params: PostEntryParams
): Promise<LedgerEntryResult> {
  const { accountCode, amount, debitCredit, description, entryDate, leaseId, postedBy = 'system' } = params;

  // Validation 1: Amount must be positive
  if (amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  // Validation 2: Account must exist
  const account = await tx.chartOfAccounts.findUnique({
    where: { code: accountCode }
  });

  if (!account) {
    throw new Error(`Account ${accountCode} does not exist`);
  }

  if (!account.active) {
    throw new Error(`Account ${accountCode} is inactive`);
  }

  // Generate idempotency key (prevents double-posting)
  const idempotencyKey = generateIdempotencyKey({
    accountCode,
    amount,
    debitCredit,
    entryDate,
    leaseId,
    description
  });

  try {
    // Attempt to create entry
    const entry = await tx.ledgerEntry.create({
      data: {
        accountCode,
        amount: new Decimal(amount),
        debitCredit,
        description,
        entryDate,
        idempotencyKey,
        postedBy,
        leaseId,
        status: 'POSTED'
      }
    });

    return {
      id: entry.id,
      createdAt: entry.createdAt,
      entryDate: entry.entryDate,
      accountCode: entry.accountCode,
      amount: entry.amount.toString(),
      debitCredit: entry.debitCredit,
      description: entry.description,
      status: entry.status
    };

  } catch (error: any) {
    // If unique constraint fails, entry already exists (safe!)
    if (error.code === 'P2002' && error.meta?.target?.includes('idempotency_key')) {
      console.log('Entry already exists (idempotency), returning existing entry');

      const existingEntry = await tx.ledgerEntry.findUnique({
        where: { idempotencyKey }
      });

      if (existingEntry) {
        return {
          id: existingEntry.id,
          createdAt: existingEntry.createdAt,
          entryDate: existingEntry.entryDate,
          accountCode: existingEntry.accountCode,
          amount: existingEntry.amount.toString(),
          debitCredit: existingEntry.debitCredit,
          description: existingEntry.description,
          status: existingEntry.status
        };
      }
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Post a single entry to the ledger (standalone, not in transaction)
 * For simple cases where you only need one entry
 *
 * WARNING: For double-entry accounting, use postDoubleEntry() instead
 * to ensure both sides are posted atomically
 *
 * Safety guarantees:
 * 1. Validates account exists
 * 2. Validates amount > 0
 * 3. Idempotency via unique key (safe to retry)
 * 4. Returns existing entry if already posted
 */
export async function postEntry(params: PostEntryParams): Promise<LedgerEntryResult> {
  return postEntryWithTx(prisma, params);
}

/**
 * Generate a unique idempotency key for an entry
 * Format: {accountCode}:{DR|CR}:{date}:{amount}:{hash}
 */
function generateIdempotencyKey(params: {
  accountCode: string;
  amount: number;
  debitCredit: DebitCredit;
  entryDate: Date;
  leaseId?: string;
  description: string;
}): string {
  const { accountCode, amount, debitCredit, entryDate, leaseId, description } = params;

  const dateStr = entryDate.toISOString().split('T')[0]; // YYYY-MM-DD
  const leaseStr = leaseId || 'no-lease';
  const descHash = simpleHash(description);

  return `${accountCode}:${debitCredit}:${dateStr}:${amount}:${leaseStr}:${descHash}`;
}

/**
 * Simple hash function for description
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

/**
 * Get all entries for a lease
 */
export async function getLeaseEntries(leaseId: string) {
  return prisma.ledgerEntry.findMany({
    where: {
      leaseId,
      status: 'POSTED'
    },
    include: {
      account: true
    },
    orderBy: [
      { entryDate: 'desc' },
      { createdAt: 'desc' }
    ]
  });
}

/**
 * Get recent entries (for dashboard)
 */
export async function getRecentEntries(limit: number = 10) {
  return prisma.ledgerEntry.findMany({
    where: {
      status: 'POSTED'
    },
    include: {
      account: true
    },
    orderBy: [
      { createdAt: 'desc' }
    ],
    take: limit
  });
}

/**
 * Get account balance
 */
export async function getAccountBalance(accountCode: string): Promise<number> {
  const account = await prisma.chartOfAccounts.findUnique({
    where: { code: accountCode },
    include: {
      ledgerEntries: {
        where: { status: 'POSTED' }
      }
    }
  });

  if (!account) {
    throw new Error(`Account ${accountCode} not found`);
  }

  let balance = 0;
  for (const entry of account.ledgerEntries) {
    const amount = Number(entry.amount);

    // Normal balance logic
    if (account.normalBalance === entry.debitCredit) {
      balance += amount;
    } else {
      balance -= amount;
    }
  }

  return balance;
}

/**
 * Void a ledger entry (soft delete)
 * 
 * IMPORTANT: Ledger entries cannot be deleted (database trigger prevents this).
 * Use this function to mark an entry as VOID for audit trail compliance.
 */
export async function voidLedgerEntry(params: VoidEntryParams): Promise<void> {
  const { entryId, reason, voidedBy, originalEntryId } = params;

  await prisma.ledgerEntry.update({
    where: { id: entryId },
    data: {
      status: 'VOID',
      voidOfEntryId: originalEntryId || null,
      description: `[VOIDED: ${reason}] ${(await prisma.ledgerEntry.findUnique({ where: { id: entryId }, select: { description: true } }))?.description || ''}`
    }
  });

  console.log(`[Accounting] Voided entry ${entryId}, reason: ${reason}, voided by: ${voidedBy}`);
}

export { prisma };
