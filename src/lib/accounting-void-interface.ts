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

// ... rest of the file remains the same ...
