// Integration tests for property CRUD operations
import { createTestLease, cleanupTestData } from '../setup';

describe('Property CRUD', () => {
    let createdPropertyIds: string[] = [];

    afterAll(async () => {
        const { prisma } = require('../../src/lib/accounting');
        // Clean up all properties created by these tests
        for (const id of createdPropertyIds) {
            try {
                // Delete units first (cascade may handle this, but be explicit)
                await prisma.unit.deleteMany({ where: { propertyId: id } });
                await prisma.property.delete({ where: { id } });
            } catch (e) {
                // Already deleted or does not exist
            }
        }
    });

    describe('Create Property', () => {
        test('should create a property with warehouse-specific fields', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const property = await prisma.property.create({
                data: {
                    name: 'Test Warehouse Alpha',
                    address: '100 Industrial Blvd',
                    city: 'Los Angeles',
                    state: 'CA',
                    zipCode: '90001',
                    totalUnits: 10,
                    totalSquareFeet: 50000,
                    propertyType: 'WAREHOUSE',
                    dockDoors: 8,
                    clearHeight: 32.0,
                    driveInDoors: 2,
                    loadingBays: 4,
                    powerCapacity: '2000 Amps',
                    zoning: 'M-2 Heavy Industrial',
                    columnSpacing: '50x50',
                    sprinklerSystem: true,
                    railAccess: false,
                    yardSpace: 15000,
                    active: true
                }
            });

            createdPropertyIds.push(property.id);

            expect(property.id).toBeDefined();
            expect(property.name).toBe('Test Warehouse Alpha');
            expect(property.propertyType).toBe('WAREHOUSE');
            expect(property.dockDoors).toBe(8);
            expect(Number(property.clearHeight)).toBe(32.0);
            expect(property.driveInDoors).toBe(2);
            expect(property.loadingBays).toBe(4);
            expect(property.sprinklerSystem).toBe(true);
            expect(property.railAccess).toBe(false);
            expect(property.yardSpace).toBe(15000);
            expect(property.active).toBe(true);
        });
    });

    describe('Read Property', () => {
        test('should read a property back and verify all fields', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const property = await prisma.property.create({
                data: {
                    name: 'Test Warehouse Beta',
                    address: '200 Logistics Way',
                    city: 'Houston',
                    state: 'TX',
                    zipCode: '77001',
                    totalUnits: 5,
                    totalSquareFeet: 25000,
                    propertyType: 'WAREHOUSE',
                    dockDoors: 4,
                    clearHeight: 24.0,
                    sprinklerSystem: true,
                    railAccess: true,
                    columnSpacing: '40x40'
                }
            });

            createdPropertyIds.push(property.id);

            // Read it back
            const fetched = await prisma.property.findUnique({
                where: { id: property.id }
            });

            expect(fetched).toBeDefined();
            expect(fetched.name).toBe('Test Warehouse Beta');
            expect(fetched.address).toBe('200 Logistics Way');
            expect(fetched.city).toBe('Houston');
            expect(fetched.state).toBe('TX');
            expect(fetched.zipCode).toBe('77001');
            expect(fetched.totalUnits).toBe(5);
            expect(fetched.totalSquareFeet).toBe(25000);
            expect(fetched.dockDoors).toBe(4);
            expect(Number(fetched.clearHeight)).toBe(24.0);
            expect(fetched.sprinklerSystem).toBe(true);
            expect(fetched.railAccess).toBe(true);
            expect(fetched.columnSpacing).toBe('40x40');
            expect(fetched.active).toBe(true);
        });
    });

    describe('Update Property', () => {
        test('should update property fields', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const property = await prisma.property.create({
                data: {
                    name: 'Test Warehouse Gamma',
                    address: '300 Freight Rd',
                    city: 'Dallas',
                    state: 'TX',
                    zipCode: '75001',
                    dockDoors: 6,
                    clearHeight: 28.0,
                    sprinklerSystem: false
                }
            });

            createdPropertyIds.push(property.id);

            // Update several fields
            const updated = await prisma.property.update({
                where: { id: property.id },
                data: {
                    name: 'Test Warehouse Gamma (Renovated)',
                    dockDoors: 10,
                    clearHeight: 36.0,
                    sprinklerSystem: true,
                    loadingBays: 6,
                    powerCapacity: '3000 Amps'
                }
            });

            expect(updated.name).toBe('Test Warehouse Gamma (Renovated)');
            expect(updated.dockDoors).toBe(10);
            expect(Number(updated.clearHeight)).toBe(36.0);
            expect(updated.sprinklerSystem).toBe(true);
            expect(updated.loadingBays).toBe(6);
            expect(updated.powerCapacity).toBe('3000 Amps');
        });
    });

    describe('Soft Delete Property', () => {
        test('should soft delete a property by setting active=false', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const property = await prisma.property.create({
                data: {
                    name: 'Test Warehouse Delta',
                    address: '400 Storage Ln',
                    city: 'Phoenix',
                    state: 'AZ',
                    zipCode: '85001',
                    dockDoors: 3,
                    active: true
                }
            });

            createdPropertyIds.push(property.id);

            expect(property.active).toBe(true);

            // Soft delete
            const deactivated = await prisma.property.update({
                where: { id: property.id },
                data: { active: false }
            });

            expect(deactivated.active).toBe(false);

            // Verify it still exists in DB but is inactive
            const fetched = await prisma.property.findUnique({
                where: { id: property.id }
            });

            expect(fetched).toBeDefined();
            expect(fetched.active).toBe(false);

            // Verify it is excluded from active-only queries
            const activeProperties = await prisma.property.findMany({
                where: { active: true, id: property.id }
            });

            expect(activeProperties.length).toBe(0);
        });
    });
});
