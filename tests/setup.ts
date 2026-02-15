// Test setup and utilities
import { prisma } from '../src/lib/accounting';

// Clean up database before all tests
beforeAll(async () => {
    // Note: In real production, use a separate test database
    console.log('Test setup: Using database for tests');
});

// Clean up after all tests
afterAll(async () => {
    await prisma.$disconnect();
});

// Helper to generate test tokens
export function generateTestToken(): string {
    return 'test-token-' + Math.random().toString(36).substring(7);
}

// Helper to create test lease
export async function createTestLease() {
    const property = await prisma.property.create({
        data: {
            name: 'Test Property',
            address: '123 Test St',
            city: 'Test City',
            state: 'CA',
            zipCode: '12345'
        }
    });

    const unit = await prisma.unit.create({
        data: {
            propertyId: property.id,
            unitNumber: 'TEST-1',
            dockDoors: 2,
            clearHeight: 24,
            squareFeet: 1000,
            status: 'OCCUPIED'
        }
    });

    const lease = await prisma.lease.create({
        data: {
            propertyId: property.id,
            unitId: unit.id,
            tenantName: 'Test Tenant',
            tenantEmail: 'test@example.com',
            tenantPhone: '555-0100',
            startDate: new Date('2025-01-01'),
            endDate: new Date('2025-12-31'),
            securityDepositAmount: 2000,
            unitName: 'TEST-1',
            status: 'ACTIVE',
            portalToken: generateTestToken(),
            portalTokenExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        }
    });

    return { property, unit, lease };
}

// Helper to clean up test data
// Note: Ledger entries cannot be deleted (DB trigger), so we void them instead
export async function cleanupTestData(leaseId: string) {
    // Void ledger entries instead of deleting (financial audit trail requirement)
    await prisma.ledgerEntry.updateMany({
        where: { leaseId },
        data: { status: 'VOID' }
    });
    await prisma.scheduledCharge.deleteMany({ where: { leaseId } });
    const lease = await prisma.lease.findUnique({ where: { id: leaseId } });
    if (lease) {
        await prisma.lease.delete({ where: { id: leaseId } });
        if (lease.unitId) {
            await prisma.unit.delete({ where: { id: lease.unitId } });
        }
        if (lease.propertyId) {
            await prisma.property.delete({ where: { id: lease.propertyId } });
        }
    }
}
