// Integration tests for unit CRUD operations
import { createTestLease, cleanupTestData } from '../setup';

describe('Unit CRUD', () => {
    let createdPropertyId: string;
    let createdUnitIds: string[] = [];

    beforeAll(async () => {
        const { prisma } = require('../../src/lib/accounting');

        // Create a parent property for units
        const property = await prisma.property.create({
            data: {
                name: 'Test Property for Units',
                address: '500 Unit Test Ave',
                city: 'San Diego',
                state: 'CA',
                zipCode: '92101',
                propertyType: 'WAREHOUSE',
                dockDoors: 12
            }
        });

        createdPropertyId = property.id;
    });

    afterAll(async () => {
        const { prisma } = require('../../src/lib/accounting');
        // Clean up units first, then property
        for (const id of createdUnitIds) {
            try {
                await prisma.unit.delete({ where: { id } });
            } catch (e) {
                // Already deleted or does not exist
            }
        }
        try {
            await prisma.property.delete({ where: { id: createdPropertyId } });
        } catch (e) {
            // Already deleted or does not exist
        }
    });

    describe('Create Unit', () => {
        test('should create a unit with warehouse-specific fields', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const unit = await prisma.unit.create({
                data: {
                    propertyId: createdPropertyId,
                    unitNumber: 'WH-101',
                    squareFeet: 5000,
                    dockDoors: 2,
                    clearHeight: 24.0,
                    floorLevel: 'Ground',
                    palletPositions: 200,
                    status: 'VACANT'
                }
            });

            createdUnitIds.push(unit.id);

            expect(unit.id).toBeDefined();
            expect(unit.propertyId).toBe(createdPropertyId);
            expect(unit.unitNumber).toBe('WH-101');
            expect(unit.squareFeet).toBe(5000);
            expect(unit.dockDoors).toBe(2);
            expect(Number(unit.clearHeight)).toBe(24.0);
            expect(unit.floorLevel).toBe('Ground');
            expect(unit.palletPositions).toBe(200);
            expect(unit.status).toBe('VACANT');
        });
    });

    describe('Read Unit', () => {
        test('should verify dockDoors, clearHeight, floorLevel, and palletPositions', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const unit = await prisma.unit.create({
                data: {
                    propertyId: createdPropertyId,
                    unitNumber: 'WH-102',
                    squareFeet: 8000,
                    dockDoors: 4,
                    clearHeight: 32.0,
                    floorLevel: 'Mezzanine',
                    palletPositions: 500,
                    status: 'VACANT'
                }
            });

            createdUnitIds.push(unit.id);

            // Read it back
            const fetched = await prisma.unit.findUnique({
                where: { id: unit.id }
            });

            expect(fetched).toBeDefined();
            expect(fetched.dockDoors).toBe(4);
            expect(Number(fetched.clearHeight)).toBe(32.0);
            expect(fetched.floorLevel).toBe('Mezzanine');
            expect(fetched.palletPositions).toBe(500);
            expect(fetched.squareFeet).toBe(8000);
        });

        test('should read unit with its parent property', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const unit = await prisma.unit.findFirst({
                where: { propertyId: createdPropertyId },
                include: { property: true }
            });

            expect(unit).toBeDefined();
            expect(unit.property).toBeDefined();
            expect(unit.property.name).toBe('Test Property for Units');
        });
    });

    describe('Update Unit Status Transitions', () => {
        test('should transition unit from VACANT to OCCUPIED', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const unit = await prisma.unit.create({
                data: {
                    propertyId: createdPropertyId,
                    unitNumber: 'WH-103',
                    squareFeet: 3000,
                    dockDoors: 1,
                    clearHeight: 20.0,
                    status: 'VACANT'
                }
            });

            createdUnitIds.push(unit.id);

            expect(unit.status).toBe('VACANT');

            const updated = await prisma.unit.update({
                where: { id: unit.id },
                data: { status: 'OCCUPIED' }
            });

            expect(updated.status).toBe('OCCUPIED');
        });

        test('should transition unit from OCCUPIED to MAINTENANCE', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const unit = await prisma.unit.create({
                data: {
                    propertyId: createdPropertyId,
                    unitNumber: 'WH-104',
                    squareFeet: 4000,
                    dockDoors: 2,
                    clearHeight: 24.0,
                    status: 'OCCUPIED'
                }
            });

            createdUnitIds.push(unit.id);

            const updated = await prisma.unit.update({
                where: { id: unit.id },
                data: { status: 'MAINTENANCE' }
            });

            expect(updated.status).toBe('MAINTENANCE');
        });

        test('should transition unit from MAINTENANCE back to VACANT', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const unit = await prisma.unit.create({
                data: {
                    propertyId: createdPropertyId,
                    unitNumber: 'WH-105',
                    squareFeet: 6000,
                    dockDoors: 3,
                    clearHeight: 28.0,
                    status: 'MAINTENANCE'
                }
            });

            createdUnitIds.push(unit.id);

            const updated = await prisma.unit.update({
                where: { id: unit.id },
                data: { status: 'VACANT' }
            });

            expect(updated.status).toBe('VACANT');
        });
    });
});
