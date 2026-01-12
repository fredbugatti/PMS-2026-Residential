import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// POST /api/admin/reset-test-data - Reset database with fresh test data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { confirm, mode } = body;

    if (confirm !== 'RESET' && confirm !== 'CLEAR') {
      return NextResponse.json(
        { error: 'Must confirm with { "confirm": "RESET" } or { "confirm": "CLEAR" }' },
        { status: 400 }
      );
    }

    // Delete all data in correct order (respecting foreign keys)
    await prisma.$transaction(async (tx) => {
      // Delete dependent records first
      await tx.cronLog.deleteMany({});
      await tx.workOrder.deleteMany({});
      await tx.document.deleteMany({});
      await tx.ledgerEntry.deleteMany({});
      await tx.scheduledCharge.deleteMany({});
      await tx.lease.deleteMany({});
      await tx.unit.deleteMany({});
      await tx.property.deleteMany({});
      await tx.vendor.deleteMany({});
      // Keep chart of accounts - it's configuration
    });

    // If clear only, return now
    if (confirm === 'CLEAR') {
      return NextResponse.json({
        success: true,
        message: 'All data has been cleared',
        created: null
      });
    }

    // Create test data based on mode
    const testData = mode === 'simple' ? await createSimpleTestData() : await createFullTestData();

    return NextResponse.json({
      success: true,
      message: 'Test data has been reset',
      created: testData
    });

  } catch (error: any) {
    console.error('POST /api/admin/reset-test-data error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset test data' },
      { status: 500 }
    );
  }
}

// Simple test data - 1 of each category
async function createSimpleTestData() {
  const created = {
    properties: 0,
    units: 0,
    leases: 0,
    scheduledCharges: 0,
    vendors: 0,
    workOrders: 0
  };

  // Create 1 Property with 1 Unit
  const property = await prisma.property.create({
    data: {
      name: 'Test Property',
      address: '123 Test Street',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      propertyType: 'MULTI_FAMILY',
      units: {
        create: [
          { unitNumber: '101', bedrooms: 2, bathrooms: 1, squareFeet: 850 }
        ]
      }
    },
    include: { units: true }
  });
  created.properties = 1;
  created.units = 1;

  const unit = property.units[0];
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfYear = new Date(today.getFullYear(), 11, 31);

  // Create 1 Lease with tenant
  const lease = await prisma.lease.create({
    data: {
      property: { connect: { id: property.id } },
      unit: { connect: { id: unit.id } },
      unitName: unit.unitNumber,
      propertyName: property.name,
      tenantName: 'John Test',
      tenantEmail: 'john.test@email.com',
      tenantPhone: '310-555-0001',
      startDate: startOfMonth,
      endDate: endOfYear,
      securityDepositAmount: 3000,
      status: 'ACTIVE',
      portalToken: `portal-test-${Date.now()}`
    }
  });
  created.leases = 1;

  // Update unit status to OCCUPIED
  await prisma.unit.update({
    where: { id: unit.id },
    data: { status: 'OCCUPIED' }
  });

  // Create 1 Scheduled Charge (rent)
  await prisma.scheduledCharge.create({
    data: {
      leaseId: lease.id,
      description: 'Monthly Rent',
      amount: 1500,
      accountCode: '4000',
      chargeDay: 1,
      active: true
    }
  });
  created.scheduledCharges = 1;

  // Create 1 Vendor
  const vendor = await prisma.vendor.create({
    data: {
      name: 'Bob Test',
      company: 'Test Plumbing',
      email: 'bob@testplumbing.com',
      phone: '310-555-1001',
      specialties: ['PLUMBING'],
      active: true
    }
  });
  created.vendors = 1;

  // Create 1 Work Order
  await prisma.workOrder.create({
    data: {
      title: 'Test Work Order',
      description: 'Test description for work order',
      property: { connect: { id: property.id } },
      unit: { connect: { id: unit.id } },
      vendor: { connect: { id: vendor.id } },
      category: 'PLUMBING',
      priority: 'MEDIUM',
      status: 'OPEN',
      reportedBy: 'System Test'
    }
  });
  created.workOrders = 1;

  return created;
}

// Full test data - more comprehensive
async function createFullTestData() {
  const created = {
    properties: 0,
    units: 0,
    leases: 0,
    scheduledCharges: 0,
    vendors: 0,
    workOrders: 0
  };

  // Create Properties with Units
  const property1 = await prisma.property.create({
    data: {
      name: 'Sunset Apartments',
      address: '123 Main Street',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      propertyType: 'MULTI_FAMILY',
      units: {
        create: [
          { unitNumber: '101', bedrooms: 1, bathrooms: 1, squareFeet: 650 },
          { unitNumber: '102', bedrooms: 2, bathrooms: 1, squareFeet: 850 },
          { unitNumber: '103', bedrooms: 2, bathrooms: 2, squareFeet: 950 },
          { unitNumber: '201', bedrooms: 1, bathrooms: 1, squareFeet: 650 },
          { unitNumber: '202', bedrooms: 2, bathrooms: 1, squareFeet: 850 },
          { unitNumber: '203', bedrooms: 3, bathrooms: 2, squareFeet: 1200 },
        ]
      }
    },
    include: { units: true }
  });
  created.properties++;
  created.units += property1.units.length;

  const property2 = await prisma.property.create({
    data: {
      name: 'Ocean View Condos',
      address: '456 Beach Boulevard',
      city: 'Santa Monica',
      state: 'CA',
      zipCode: '90401',
      propertyType: 'MULTI_FAMILY',
      units: {
        create: [
          { unitNumber: 'A1', bedrooms: 2, bathrooms: 2, squareFeet: 1100 },
          { unitNumber: 'A2', bedrooms: 2, bathrooms: 2, squareFeet: 1100 },
          { unitNumber: 'B1', bedrooms: 3, bathrooms: 2, squareFeet: 1400 },
          { unitNumber: 'B2', bedrooms: 3, bathrooms: 2, squareFeet: 1400 },
        ]
      }
    },
    include: { units: true }
  });
  created.properties++;
  created.units += property2.units.length;

  const property3 = await prisma.property.create({
    data: {
      name: '789 Oak Street',
      address: '789 Oak Street',
      city: 'Pasadena',
      state: 'CA',
      zipCode: '91101',
      propertyType: 'SINGLE_FAMILY',
      units: {
        create: [
          { unitNumber: 'MAIN', bedrooms: 4, bathrooms: 3, squareFeet: 2200 },
        ]
      }
    },
    include: { units: true }
  });
  created.properties++;
  created.units += property3.units.length;

  // Get all units for lease creation with their property info
  const allUnitsWithProperty = [
    ...property1.units.map(u => ({ ...u, propertyId: property1.id, propertyName: property1.name })),
    ...property2.units.map(u => ({ ...u, propertyId: property2.id, propertyName: property2.name })),
    ...property3.units.map(u => ({ ...u, propertyId: property3.id, propertyName: property3.name }))
  ];

  // Tenant data (embedded in leases) with rent amounts
  const tenantData = [
    { name: 'John Smith', email: 'john.smith@email.com', phone: '310-555-0101', rent: 1500 },
    { name: 'Sarah Johnson', email: 'sarah.j@email.com', phone: '310-555-0102', rent: 1900 },
    { name: 'Michael Williams', email: 'mwilliams@email.com', phone: '310-555-0103', rent: 2100 },
    { name: 'Emily Brown', email: 'emily.brown@email.com', phone: '310-555-0104', rent: 1550 },
    { name: 'David Garcia', email: 'dgarcia@email.com', phone: '310-555-0105', rent: 1950 },
    { name: 'Jennifer Martinez', email: 'jen.martinez@email.com', phone: '310-555-0106', rent: 2600 },
    { name: 'Robert Anderson', email: 'randerson@email.com', phone: '310-555-0107', rent: 2800 },
    { name: 'Lisa Taylor', email: 'lisa.t@email.com', phone: '310-555-0108', rent: 2800 },
  ];

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfYear = new Date(today.getFullYear(), 11, 31);

  for (let i = 0; i < Math.min(tenantData.length, allUnitsWithProperty.length); i++) {
    const tenant = tenantData[i];
    const unit = allUnitsWithProperty[i];
    const rentAmount = tenant.rent;

    // Create lease with embedded tenant info
    const lease = await prisma.lease.create({
      data: {
        property: { connect: { id: unit.propertyId } },
        unit: { connect: { id: unit.id } },
        unitName: `${unit.unitNumber}`,
        propertyName: unit.propertyName,
        tenantName: tenant.name,
        tenantEmail: tenant.email,
        tenantPhone: tenant.phone,
        startDate: startOfMonth,
        endDate: endOfYear,
        securityDepositAmount: rentAmount * 2,
        status: 'ACTIVE',
        portalToken: `portal-${unit.id.slice(0, 8)}-${Date.now()}`
      }
    });
    created.leases++;

    // Update unit status to OCCUPIED
    await prisma.unit.update({
      where: { id: unit.id },
      data: { status: 'OCCUPIED' }
    });

    // Create scheduled charges for this lease
    // Base rent
    await prisma.scheduledCharge.create({
      data: {
        leaseId: lease.id,
        description: 'Monthly Rent',
        amount: rentAmount,
        accountCode: '4000',
        chargeDay: 1,
        active: true
      }
    });
    created.scheduledCharges++;

    // Some tenants have pets or parking
    if (i % 3 === 0) {
      await prisma.scheduledCharge.create({
        data: {
          leaseId: lease.id,
          description: 'Pet Fee',
          amount: 50,
          accountCode: '4100',
          chargeDay: 1,
          active: true
        }
      });
      created.scheduledCharges++;
    }

    if (i % 2 === 0) {
      await prisma.scheduledCharge.create({
        data: {
          leaseId: lease.id,
          description: 'Parking',
          amount: 100,
          accountCode: '4100',
          chargeDay: 1,
          active: true
        }
      });
      created.scheduledCharges++;
    }
  }

  // Create Vendors
  const vendors = await Promise.all([
    prisma.vendor.create({
      data: {
        name: 'Bob Wilson',
        company: 'ABC Plumbing',
        email: 'service@abcplumbing.com',
        phone: '310-555-1001',
        specialties: ['PLUMBING'],
        active: true
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'Tom Johnson',
        company: 'Quick Electric',
        email: 'info@quickelectric.com',
        phone: '310-555-1002',
        specialties: ['ELECTRICAL'],
        active: true
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'Maria Rodriguez',
        company: 'Cool Air HVAC',
        email: 'service@coolairhvac.com',
        phone: '310-555-1003',
        specialties: ['HVAC'],
        active: true
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'Steve Miller',
        company: 'Handy Repairs',
        email: 'steve@handyrepairs.com',
        phone: '310-555-1004',
        specialties: ['GENERAL'],
        active: true
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'Carlos Sanchez',
        company: 'Green Lawn Care',
        email: 'info@greenlawncare.com',
        phone: '310-555-1005',
        specialties: ['LANDSCAPING'],
        active: true
      }
    })
  ]);
  created.vendors = vendors.length;

  // Create some Work Orders using units directly
  const workOrderData = [
    { title: 'Leaky faucet in bathroom', description: 'Kitchen sink faucet is dripping constantly', category: 'PLUMBING', priority: 'MEDIUM', status: 'OPEN' },
    { title: 'AC not cooling', description: 'Air conditioning unit not producing cold air', category: 'HVAC', priority: 'HIGH', status: 'IN_PROGRESS' },
    { title: 'Replace smoke detector batteries', description: 'Smoke detector beeping - needs new batteries', category: 'ELECTRICAL', priority: 'LOW', status: 'COMPLETED' },
    { title: 'Garage door stuck', description: 'Electric garage door opener not working', category: 'GENERAL', priority: 'MEDIUM', status: 'OPEN' },
  ];

  for (let i = 0; i < Math.min(workOrderData.length, allUnitsWithProperty.length); i++) {
    const unit = allUnitsWithProperty[i];
    await prisma.workOrder.create({
      data: {
        title: workOrderData[i].title,
        description: workOrderData[i].description,
        property: { connect: { id: unit.propertyId } },
        unit: { connect: { id: unit.id } },
        vendor: { connect: { id: vendors[i % vendors.length].id } },
        category: workOrderData[i].category as any,
        priority: workOrderData[i].priority as any,
        status: workOrderData[i].status as any,
        reportedBy: 'System Test'
      }
    });
    created.workOrders++;
  }

  return created;
}
