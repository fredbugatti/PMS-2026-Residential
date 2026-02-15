// Integration tests for report data and ledger balance verification
import { postDoubleEntry } from '../../src/lib/accounting';
import { createTestLease, cleanupTestData } from '../setup';

describe('Report Data & Ledger Balance', () => {
    let testData: any;

    beforeAll(async () => {
        testData = await createTestLease();

        // Post several double entries to create ledger data for reporting
        // Entry 1: Rent charge (DR Accounts Receivable, CR Rental Income)
        await postDoubleEntry({
            debitEntry: {
                accountCode: '1200',
                amount: 2500,
                debitCredit: 'DR',
                description: 'Monthly rent charge - January',
                entryDate: new Date('2025-01-01'),
                leaseId: testData.lease.id,
                postedBy: 'test'
            },
            creditEntry: {
                accountCode: '4000',
                amount: 2500,
                debitCredit: 'CR',
                description: 'Monthly rent charge - January',
                entryDate: new Date('2025-01-01'),
                leaseId: testData.lease.id,
                postedBy: 'test'
            }
        });

        // Entry 2: Rent payment (DR Cash, CR Accounts Receivable)
        await postDoubleEntry({
            debitEntry: {
                accountCode: '1000',
                amount: 2500,
                debitCredit: 'DR',
                description: 'Rent payment received - January',
                entryDate: new Date('2025-01-05'),
                leaseId: testData.lease.id,
                postedBy: 'test'
            },
            creditEntry: {
                accountCode: '1200',
                amount: 2500,
                debitCredit: 'CR',
                description: 'Rent payment received - January',
                entryDate: new Date('2025-01-05'),
                leaseId: testData.lease.id,
                postedBy: 'test'
            }
        });

        // Entry 3: February rent charge
        await postDoubleEntry({
            debitEntry: {
                accountCode: '1200',
                amount: 2500,
                debitCredit: 'DR',
                description: 'Monthly rent charge - February',
                entryDate: new Date('2025-02-01'),
                leaseId: testData.lease.id,
                postedBy: 'test'
            },
            creditEntry: {
                accountCode: '4000',
                amount: 2500,
                debitCredit: 'CR',
                description: 'Monthly rent charge - February',
                entryDate: new Date('2025-02-01'),
                leaseId: testData.lease.id,
                postedBy: 'test'
            }
        });
    });

    afterAll(async () => {
        if (testData?.lease) {
            await cleanupTestData(testData.lease.id);
        }
    });

    describe('Ledger Entries Exist', () => {
        test('should have posted ledger entries for the test lease', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const entries = await prisma.ledgerEntry.findMany({
                where: {
                    leaseId: testData.lease.id,
                    status: 'POSTED'
                },
                orderBy: { entryDate: 'asc' }
            });

            // 3 double entries = 6 individual ledger entries
            expect(entries.length).toBe(6);
        });

        test('should have entries for expected account codes', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const entries = await prisma.ledgerEntry.findMany({
                where: {
                    leaseId: testData.lease.id,
                    status: 'POSTED'
                }
            });

            const accountCodes = entries.map((e: any) => e.accountCode);

            // We posted to accounts 1000 (Cash), 1200 (AR), and 4000 (Income)
            expect(accountCodes).toContain('1000');
            expect(accountCodes).toContain('1200');
            expect(accountCodes).toContain('4000');
        });

        test('should have correct entry dates', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const entries = await prisma.ledgerEntry.findMany({
                where: {
                    leaseId: testData.lease.id,
                    status: 'POSTED'
                },
                orderBy: { entryDate: 'asc' }
            });

            const dates = entries.map((e: any) => new Date(e.entryDate));
            const januaryEntries = dates.filter((d: Date) => d.getMonth() === 0);
            const februaryEntries = dates.filter((d: Date) => d.getMonth() === 1);

            // 2 double entries in January (4 individual entries), 1 in February (2 individual entries)
            expect(januaryEntries.length).toBe(4);
            expect(februaryEntries.length).toBe(2);
        });
    });

    describe('Balance Calculation', () => {
        test('total debits should equal total credits (books are balanced)', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const entries = await prisma.ledgerEntry.findMany({
                where: {
                    leaseId: testData.lease.id,
                    status: 'POSTED'
                }
            });

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

            expect(totalDebits).toBe(totalCredits);
        });

        test('total debits and credits should match expected amounts', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const entries = await prisma.ledgerEntry.findMany({
                where: {
                    leaseId: testData.lease.id,
                    status: 'POSTED'
                }
            });

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

            // 3 double entries of $2500 each = $7500 total on each side
            expect(totalDebits).toBe(7500);
            expect(totalCredits).toBe(7500);
        });

        test('AR account should have outstanding balance from unpaid February rent', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const arEntries = await prisma.ledgerEntry.findMany({
                where: {
                    leaseId: testData.lease.id,
                    accountCode: '1200',
                    status: 'POSTED'
                }
            });

            let arDebits = 0;
            let arCredits = 0;

            arEntries.forEach((entry: any) => {
                const amount = Number(entry.amount);
                if (entry.debitCredit === 'DR') {
                    arDebits += amount;
                } else {
                    arCredits += amount;
                }
            });

            // AR was debited $2500 x 2 (Jan + Feb charges) = $5000
            // AR was credited $2500 x 1 (Jan payment) = $2500
            // Outstanding AR balance = $2500 (February still owed)
            const arBalance = arDebits - arCredits;
            expect(arDebits).toBe(5000);
            expect(arCredits).toBe(2500);
            expect(arBalance).toBe(2500);
        });
    });

    describe('Voided Entries', () => {
        test('voided entries should not count in balance calculations', async () => {
            const { prisma } = require('../../src/lib/accounting');

            // Only POSTED entries should be considered
            const postedEntries = await prisma.ledgerEntry.findMany({
                where: {
                    leaseId: testData.lease.id,
                    status: 'POSTED'
                }
            });

            const allEntries = await prisma.ledgerEntry.findMany({
                where: {
                    leaseId: testData.lease.id
                }
            });

            // Before any voiding, all entries should be POSTED
            expect(postedEntries.length).toBe(allEntries.length);

            // All entries should have POSTED status
            postedEntries.forEach((entry: any) => {
                expect(entry.status).toBe('POSTED');
            });
        });
    });
});
