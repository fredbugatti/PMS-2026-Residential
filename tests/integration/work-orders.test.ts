// Integration tests for work order operations
import { createTestLease, cleanupTestData } from '../setup';

describe('Work Orders', () => {
    let testData: any;
    let createdWorkOrderIds: string[] = [];

    beforeAll(async () => {
        testData = await createTestLease();
    });

    afterAll(async () => {
        const { prisma } = require('../../src/lib/accounting');

        // Clean up work orders first
        for (const id of createdWorkOrderIds) {
            try {
                await prisma.workOrderUpdate.deleteMany({ where: { workOrderId: id } });
                await prisma.workOrder.delete({ where: { id } });
            } catch (e) {
                // Already deleted or does not exist
            }
        }

        // Clean up test lease data
        if (testData?.lease) {
            await cleanupTestData(testData.lease.id);
        }
    });

    describe('Create Work Orders with Warehouse Categories', () => {
        test('should create a work order with DOCK_DOOR category', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const workOrder = await prisma.workOrder.create({
                data: {
                    propertyId: testData.property.id,
                    unitId: testData.unit.id,
                    leaseId: testData.lease.id,
                    title: 'Dock door #3 not closing properly',
                    description: 'The hydraulic dock door on bay 3 is stuck halfway. Needs immediate repair for loading operations.',
                    category: 'DOCK_DOOR',
                    priority: 'HIGH',
                    status: 'OPEN',
                    reportedBy: 'Test Tenant'
                }
            });

            createdWorkOrderIds.push(workOrder.id);

            expect(workOrder.id).toBeDefined();
            expect(workOrder.category).toBe('DOCK_DOOR');
            expect(workOrder.priority).toBe('HIGH');
            expect(workOrder.status).toBe('OPEN');
            expect(workOrder.title).toBe('Dock door #3 not closing properly');
            expect(workOrder.propertyId).toBe(testData.property.id);
            expect(workOrder.unitId).toBe(testData.unit.id);
            expect(workOrder.leaseId).toBe(testData.lease.id);
        });

        test('should create a work order with FIRE_SAFETY category', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const workOrder = await prisma.workOrder.create({
                data: {
                    propertyId: testData.property.id,
                    unitId: testData.unit.id,
                    leaseId: testData.lease.id,
                    title: 'Sprinkler head leaking in section B',
                    description: 'Fire sprinkler head in section B of warehouse is dripping. Needs inspection and possible replacement.',
                    category: 'FIRE_SAFETY',
                    priority: 'EMERGENCY',
                    status: 'OPEN',
                    reportedBy: 'Test Tenant'
                }
            });

            createdWorkOrderIds.push(workOrder.id);

            expect(workOrder.id).toBeDefined();
            expect(workOrder.category).toBe('FIRE_SAFETY');
            expect(workOrder.priority).toBe('EMERGENCY');
            expect(workOrder.status).toBe('OPEN');
        });

        test('should create a work order with STRUCTURAL category', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const workOrder = await prisma.workOrder.create({
                data: {
                    propertyId: testData.property.id,
                    unitId: testData.unit.id,
                    leaseId: testData.lease.id,
                    title: 'Crack in warehouse floor slab',
                    description: 'Noticed a growing crack in the concrete slab near column C-4. May affect forklift operations.',
                    category: 'STRUCTURAL',
                    priority: 'MEDIUM',
                    status: 'OPEN',
                    reportedBy: 'Test Tenant'
                }
            });

            createdWorkOrderIds.push(workOrder.id);

            expect(workOrder.id).toBeDefined();
            expect(workOrder.category).toBe('STRUCTURAL');
            expect(workOrder.priority).toBe('MEDIUM');
        });
    });

    describe('Priority Ordering', () => {
        test('should verify work orders can be queried by priority', async () => {
            const { prisma } = require('../../src/lib/accounting');

            // Create a LOW priority work order
            const lowPriority = await prisma.workOrder.create({
                data: {
                    propertyId: testData.property.id,
                    unitId: testData.unit.id,
                    title: 'Repaint unit number on door',
                    description: 'Unit number signage is faded and needs repainting.',
                    category: 'GENERAL',
                    priority: 'LOW',
                    status: 'OPEN',
                    reportedBy: 'Property Manager'
                }
            });

            createdWorkOrderIds.push(lowPriority.id);

            // Query all work orders for this property, filtered by lease
            const workOrders = await prisma.workOrder.findMany({
                where: {
                    propertyId: testData.property.id
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });

            expect(workOrders.length).toBeGreaterThanOrEqual(4);

            // Verify we have all priority levels present
            const priorities = workOrders.map((wo: any) => wo.priority);
            expect(priorities).toContain('EMERGENCY');
            expect(priorities).toContain('HIGH');
            expect(priorities).toContain('MEDIUM');
            expect(priorities).toContain('LOW');
        });

        test('should filter emergency work orders', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const emergencies = await prisma.workOrder.findMany({
                where: {
                    propertyId: testData.property.id,
                    priority: 'EMERGENCY'
                }
            });

            expect(emergencies.length).toBeGreaterThanOrEqual(1);

            emergencies.forEach((wo: any) => {
                expect(wo.priority).toBe('EMERGENCY');
            });
        });
    });

    describe('Work Order Status Transitions', () => {
        test('should transition work order from OPEN to IN_PROGRESS to COMPLETED', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const workOrder = await prisma.workOrder.create({
                data: {
                    propertyId: testData.property.id,
                    unitId: testData.unit.id,
                    title: 'Replace overhead light fixture',
                    description: 'Fluorescent light in bay 2 is flickering.',
                    category: 'ELECTRICAL',
                    priority: 'LOW',
                    status: 'OPEN',
                    reportedBy: 'Test Tenant'
                }
            });

            createdWorkOrderIds.push(workOrder.id);

            expect(workOrder.status).toBe('OPEN');

            // Transition to IN_PROGRESS
            const inProgress = await prisma.workOrder.update({
                where: { id: workOrder.id },
                data: {
                    status: 'IN_PROGRESS',
                    assignedTo: 'Maintenance Team'
                }
            });

            expect(inProgress.status).toBe('IN_PROGRESS');
            expect(inProgress.assignedTo).toBe('Maintenance Team');

            // Transition to COMPLETED
            const completed = await prisma.workOrder.update({
                where: { id: workOrder.id },
                data: {
                    status: 'COMPLETED',
                    completedDate: new Date()
                }
            });

            expect(completed.status).toBe('COMPLETED');
            expect(completed.completedDate).toBeDefined();
        });
    });

    describe('Work Order Invoice Fields', () => {
        test('should store invoice information on a work order', async () => {
            const { prisma } = require('../../src/lib/accounting');

            const workOrder = await prisma.workOrder.create({
                data: {
                    propertyId: testData.property.id,
                    unitId: testData.unit.id,
                    title: 'HVAC compressor replacement',
                    description: 'Warehouse HVAC unit compressor failed. Needs full replacement.',
                    category: 'HVAC',
                    priority: 'HIGH',
                    status: 'COMPLETED',
                    reportedBy: 'Property Manager',
                    invoiceNumber: 'INV-2026-0042',
                    estimatedCost: 3500.00,
                    actualCost: 3200.00,
                    completedDate: new Date()
                }
            });

            createdWorkOrderIds.push(workOrder.id);

            expect(workOrder.invoiceNumber).toBe('INV-2026-0042');
            expect(Number(workOrder.estimatedCost)).toBe(3500.00);
            expect(Number(workOrder.actualCost)).toBe(3200.00);
        });
    });
});
