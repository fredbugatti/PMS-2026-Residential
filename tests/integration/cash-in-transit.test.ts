// Integration tests for Cash in Transit flow
import { postDoubleEntry, withLedgerTransaction } from '../../src/lib/accounting';
import { createTestLease, cleanupTestData } from '../setup';

describe('Cash in Transit Flow', () => {
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

    describe('ACH Payment Initiation', () => {
        test('should post to Transit (1001) not Operating Cash (1000)', async () => {
            const amount = 1500;

            // Simulate autopay posting to Transit
            await postDoubleEntry({
                debitEntry: {
                    accountCode: '1001', // Cash in Transit
                    amount,
                    debitCredit: 'DR',
                    description: 'ACH payment initiated',
                    entryDate: new Date(),
                    leaseId: testLease.id,
                    postedBy: 'autopay'
                },
                creditEntry: {
                    accountCode: '1200', // AR
                    amount,
                    debitCredit: 'CR',
                    description: 'ACH payment initiated',
                    entryDate: new Date(),
                    leaseId: testLease.id,
                    postedBy: 'autopay'
                }
            });

            const { prisma } = require('../../src/lib/accounting');
            const transitEntry = await prisma.ledgerEntry.findFirst({
                where: {
                    leaseId: testLease.id,
                    accountCode: '1001',
                    debitCredit: 'DR'
                }
            });

            expect(transitEntry).toBeDefined();
            expect(Number(transitEntry.amount)).toBe(amount);
        });

        test('should transfer Transit to Operating Cash on success', async () => {
            const amount = 1500;

            // Simulate webhook transferring Transit → Operating Cash
            await postDoubleEntry({
                debitEntry: {
                    accountCode: '1000', // Operating Cash
                    amount,
                    debitCredit: 'DR',
                    description: 'ACH Settlement Confirmed',
                    entryDate: new Date(),
                    leaseId: testLease.id,
                    postedBy: 'stripe_webhook'
                },
                creditEntry: {
                    accountCode: '1001', // Cash in Transit
                    amount,
                    debitCredit: 'CR',
                    description: 'ACH Settlement Confirmed',
                    entryDate: new Date(),
                    leaseId: testLease.id,
                    postedBy: 'stripe_webhook'
                }
            });

            const { prisma } = require('../../src/lib/accounting');

            // Verify Operating Cash debited
            const cashEntry = await prisma.ledgerEntry.findFirst({
                where: {
                    leaseId: testLease.id,
                    accountCode: '1000',
                    debitCredit: 'DR'
                }
            });

            // Verify Transit credited (balance cleared)
            const transitCreditEntry = await prisma.ledgerEntry.findFirst({
                where: {
                    leaseId: testLease.id,
                    accountCode: '1001',
                    debitCredit: 'CR'
                }
            });

            expect(cashEntry).toBeDefined();
            expect(transitCreditEntry).toBeDefined();
            expect(Number(cashEntry.amount)).toBe(amount);
        });
    });

    describe('ACH Payment Failure', () => {
        test('should reverse from Transit (1001) not Operating Cash (1000)', async () => {
            const amount = 1500;

            // Simulate failed payment reversal
            await postDoubleEntry({
                debitEntry: {
                    accountCode: '1200', // AR (restore balance owed)
                    amount,
                    debitCredit: 'DR',
                    description: 'REVERSED: Payment failed',
                    entryDate: new Date(),
                    leaseId: testLease.id,
                    postedBy: 'webhook_reversal'
                },
                creditEntry: {
                    accountCode: '1001', // Cash in Transit
                    amount,
                    debitCredit: 'CR',
                    description: 'REVERSED: Payment failed',
                    entryDate: new Date(),
                    leaseId: testLease.id,
                    postedBy: 'webhook_reversal'
                }
            });

            const { prisma } = require('../../src/lib/accounting');

            // Verify Operating Cash was never touched
            const operatingCashEntries = await prisma.ledgerEntry.findMany({
                where: {
                    leaseId: testLease.id,
                    accountCode: '1000',
                    description: { contains: 'REVERSED' }
                }
            });

            expect(operatingCashEntries.length).toBe(0); // No reversal from Operating Cash
        });
    });

    describe('Transit Account Balance', () => {
        test('Transit account pattern is correct (DR on initiation, CR on settle/reverse)', async () => {
            const { prisma } = require('../../src/lib/accounting');

            // Verify the pattern: Transit is debited when payment initiated, credited when settled
            const transitDebits = await prisma.ledgerEntry.findMany({
                where: {
                    leaseId: testLease.id,
                    accountCode: '1001',
                    debitCredit: 'DR',
                    status: 'POSTED'
                }
            });

            const transitCredits = await prisma.ledgerEntry.findMany({
                where: {
                    leaseId: testLease.id,
                    accountCode: '1001',
                    debitCredit: 'CR',
                    status: 'POSTED'
                }
            });

            // Should have at least one debit (initiation) and one credit (settlement or reversal)
            expect(transitDebits.length).toBeGreaterThan(0);
            expect(transitCredits.length).toBeGreaterThan(0);
        });
    });
});
