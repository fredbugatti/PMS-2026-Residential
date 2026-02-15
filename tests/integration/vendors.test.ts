// Integration tests for vendor CRUD operations
import { createTestLease, cleanupTestData } from '../setup';

describe('Vendor CRUD', () => {
    let createdVendorIds: string[] = [];

    afterAll(async () => {
        const { prisma } = require('../../src/lib/accounting');
        // Clean up all vendors created by these tests
        for (const id of createdVendorIds) {
            try {
                await prisma.vendor.delete({ where: { id } });
            } catch (e) {
                // Already deleted or does not exist
            }
        }
    });

    describe('Create Vendor', () => {
        test('should create a vendor with all fields', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const vendor = await prisma.vendor.create({
                data: {
                    name: 'John Smith',
                    company: 'Smith Dock Repair Co.',
                    email: 'john@smithdockrepair.com',
                    phone: '555-0200',
                    address: '100 Repair Lane',
                    city: 'Los Angeles',
                    state: 'CA',
                    zipCode: '90001',
                    specialties: ['DOCK_DOOR', 'STRUCTURAL'],
                    notes: 'Specializes in industrial dock door and loading bay repairs.',
                    active: true
                }
            });

            createdVendorIds.push(vendor.id);

            expect(vendor.id).toBeDefined();
            expect(vendor.name).toBe('John Smith');
            expect(vendor.company).toBe('Smith Dock Repair Co.');
            expect(vendor.email).toBe('john@smithdockrepair.com');
            expect(vendor.phone).toBe('555-0200');
            expect(vendor.specialties).toContain('DOCK_DOOR');
            expect(vendor.specialties).toContain('STRUCTURAL');
            expect(vendor.active).toBe(true);
        });
    });

    describe('Read Vendor', () => {
        test('should read a vendor back and verify all fields', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const vendor = await prisma.vendor.create({
                data: {
                    name: 'Maria Garcia',
                    company: 'Garcia Fire Safety Inc.',
                    email: 'maria@garciafire.com',
                    phone: '555-0300',
                    specialties: ['FIRE_SAFETY', 'HVAC'],
                    notes: 'Licensed fire safety inspection and sprinkler system maintenance.'
                }
            });

            createdVendorIds.push(vendor.id);

            // Read it back
            const fetched = await prisma.vendor.findUnique({
                where: { id: vendor.id }
            });

            expect(fetched).toBeDefined();
            expect(fetched.name).toBe('Maria Garcia');
            expect(fetched.company).toBe('Garcia Fire Safety Inc.');
            expect(fetched.email).toBe('maria@garciafire.com');
            expect(fetched.phone).toBe('555-0300');
            expect(fetched.specialties).toEqual(['FIRE_SAFETY', 'HVAC']);
            expect(fetched.notes).toContain('Licensed fire safety');
            expect(fetched.active).toBe(true);
        });
    });

    describe('Update Vendor', () => {
        test('should update vendor fields', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const vendor = await prisma.vendor.create({
                data: {
                    name: 'Robert Chen',
                    company: 'Chen Electrical Services',
                    email: 'robert@chenelectric.com',
                    phone: '555-0400',
                    specialties: ['ELECTRICAL']
                }
            });

            createdVendorIds.push(vendor.id);

            // Update multiple fields
            const updated = await prisma.vendor.update({
                where: { id: vendor.id },
                data: {
                    company: 'Chen Electrical & HVAC Services',
                    phone: '555-0401',
                    specialties: ['ELECTRICAL', 'HVAC'],
                    notes: 'Expanded to include HVAC services in 2026.',
                    paymentTerms: 'NET_30'
                }
            });

            expect(updated.company).toBe('Chen Electrical & HVAC Services');
            expect(updated.phone).toBe('555-0401');
            expect(updated.specialties).toEqual(['ELECTRICAL', 'HVAC']);
            expect(updated.notes).toContain('Expanded to include HVAC');
            expect(updated.paymentTerms).toBe('NET_30');
        });
    });

    describe('Soft Delete Vendor', () => {
        test('should soft delete a vendor by setting active=false', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const vendor = await prisma.vendor.create({
                data: {
                    name: 'Lisa Wong',
                    company: 'Wong Plumbing Co.',
                    email: 'lisa@wongplumbing.com',
                    phone: '555-0500',
                    specialties: ['PLUMBING'],
                    active: true
                }
            });

            createdVendorIds.push(vendor.id);

            expect(vendor.active).toBe(true);

            // Soft delete
            const deactivated = await prisma.vendor.update({
                where: { id: vendor.id },
                data: { active: false }
            });

            expect(deactivated.active).toBe(false);

            // Verify it still exists in DB but is inactive
            const fetched = await prisma.vendor.findUnique({
                where: { id: vendor.id }
            });

            expect(fetched).toBeDefined();
            expect(fetched.active).toBe(false);

            // Verify it is excluded from active-only queries
            const activeVendors = await prisma.vendor.findMany({
                where: { active: true, id: vendor.id }
            });

            expect(activeVendors.length).toBe(0);
        });
    });

    describe('Vendor Listing', () => {
        test('should list only active vendors', async () => {
            const { prisma } = require('../../src/lib/accounting');

            // Get the IDs of vendors we created (excluding the soft-deleted one)
            const activeVendors = await prisma.vendor.findMany({
                where: {
                    id: { in: createdVendorIds },
                    active: true
                }
            });

            // All returned vendors should be active
            activeVendors.forEach((vendor: any) => {
                expect(vendor.active).toBe(true);
            });

            // At least 3 should be active (John Smith, Maria Garcia, Robert Chen)
            expect(activeVendors.length).toBeGreaterThanOrEqual(3);
        });
    });
});
