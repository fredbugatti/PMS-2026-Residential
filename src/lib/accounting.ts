// Sanprinon Lite - Core Accounting Functions
// Safe, simple ledger posting

import { PrismaClient, DebitCredit } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Prevent multiple PrismaClient instances in development (hot-reload issue)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export interface PostEntryParams {
  accountCode: string;
  amount: number;
  debitCredit: DebitCredit;
  description: string;
  entryDate: Date;
  leaseId?: string;
  postedBy?: string;
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
 * Post a single entry to the ledger
 * This is the ONLY function that writes to the ledger
 *
 * Safety guarantees:
 * 1. Validates account exists
 * 2. Validates amount > 0
 * 3. Idempotency via unique key (safe to retry)
 * 4. Returns existing entry if already posted
 */
export async function postEntry(params: PostEntryParams): Promise<LedgerEntryResult> {
  const { accountCode, amount, debitCredit, description, entryDate, leaseId, postedBy = 'system' } = params;

  // Validation 1: Amount must be positive
  if (amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  // Validation 2: Account must exist
  const account = await prisma.chartOfAccounts.findUnique({
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
    const entry = await prisma.ledgerEntry.create({
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

      const existingEntry = await prisma.ledgerEntry.findUnique({
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

export { prisma };
