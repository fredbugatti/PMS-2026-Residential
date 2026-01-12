// Integration tests for payment flows and ledger atomicity
import { postDoubleEntry, postEntry } from '../../src/lib/accounting';
import { createTestLease, cleanupTestData } from '../setup';

describe('Payment Flows', () => {
    let testLease: any;

    beforeAll(async () => {
        const data = await createTestLease();
        testLease = data.lease;
    });

    afterAll(async () => {
        if (testLease) {
            await cleanupTestData(testLease.id);
        }
    });

    describe('Atomic Payment Posting', () => {
        test('should post both debit and credit entries atomically', async () => {
            const amount = 1000;

            // Post payment using postDoubleEntry (atomic)
            await postDoubleEntry({
                debitEntry: {
                    accountCode: '1000',
                    amount,
                    debitCredit: 'DR',
                    description: 'Test payment - cash',
                    entryDate: new Date(),
                    leaseId: testLease.id,
                    postedBy: 'test'
                },
                creditEntry: {
                    accountCode: '1200',
                    amount,
                    debitCredit: 'CR',
                    description: 'Test payment - AR',
                    entryDate: new Date(),
                    leaseId: testLease.id,
                    postedBy: 'test'
                }
            });

            // Verify both entries exist
            const { prisma } = require('../../src/lib/accounting');
            const entries = await prisma.ledgerEntry.findMany({
                where: { leaseId: testLease.id, status: 'POSTED' }
            });

            expect(entries.length).toBe(2);

            const debitEntry = entries.find((e: any) => e.debitCredit === 'DR');
            const creditEntry = entries.find((e: any) => e.debitCredit === 'CR');

            expect(debitEntry).toBeDefined();
            expect(creditEntry).toBeDefined();
            expect(Number(debitEntry.amount)).toBe(amount);
            expect(Number(creditEntry.amount)).toBe(amount);
        });

        test('should maintain balanced books after payment', async () => {
            const { prisma } = require('../../src/lib/accounting');

            // Get entries for this test's lease only
            const entries = await prisma.ledgerEntry.findMany({
                where: { leaseId: testLease.id, status: 'POSTED' }
            });

            // Calculate total debits and credits for this lease
            let totalDebits = 0;
            let totalCredits = 0;

            entries.forEach((entry: any) => {
                const amount = Number(entry.amount);
                if (entry.debitCredit === 'DR') {
                    totalDebits += amount;
                } else {
                    totalCredits += amount;
                }
            });

            // Books should balance for this lease
            expect(totalDebits).toBe(totalCredits);
        });
    });

    describe('Idempotency', () => {
        test('should prevent duplicate payments with same idempotency key', async () => {
            const amount = 500;
            const description = 'Unique test payment ' + Date.now();

            // Post same payment twice
            const entry1 = await postEntry({
                accountCode: '1000',
                amount,
                debitCredit: 'DR',
                description,
                entryDate: new Date(),
                leaseId: testLease.id,
                postedBy: 'test'
            });

            const entry2 = await postEntry({
                accountCode: '1000',
                amount,
                debitCredit: 'DR',
                description,
                entryDate: new Date(),
                leaseId: testLease.id,
                postedBy: 'test'
            });

            // Should return same entry (idempotency)
            expect(entry1.id).toBe(entry2.id);
        });
    });
});
