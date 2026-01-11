// Seed script for 55 Talmadge Road warehouse with 8 tenants
// Run with: npx ts-node scripts/seed-talmadge.ts

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating 55 Talmadge Road warehouse property...\n');

  // Create the property
  const property = await prisma.property.create({
    data: {
      name: '55 Talmadge Road',
      address: '55 Talmadge Road',
      city: 'Edison',
      state: 'NJ',
      zipCode: '08817',
      propertyType: 'COMMERCIAL',
      notes: 'Multi-tenant warehouse facility - BH Properties of Edison LLC',
      active: true
    }
  });

  console.log(`Created property: ${property.name} (${property.id})\n`);

  // Define tenants with their charges based on invoices
  const tenants = [
    {
      companyName: 'HOTPACK GLOBAL INC',
      tenantName: 'Mohammad Kunhi',
      unitName: '1st Floor - 5,000 SF',
      squareFeet: 5000,
      notes: 'Loading docks: TBD. 5,000 SF floor area.',
      charges: [
        { description: 'Base Rent (5,000 SF @ $15.50/SF annual)', amount: 6250.00, accountCode: '4000' },
        { description: 'CAM/Real Estate Tax (5,000 SF @ $3.00/SF annual)', amount: 1250.00, accountCode: '4100' },
        { description: 'Utilities (5,000 SF @ $1.00/SF annual)', amount: 416.67, accountCode: '4200' },
        { description: 'Machine Rental - Swing Reach 50%', amount: 1750.00, accountCode: '4300' },
        { description: 'Management Fee 5%', amount: 300.00, accountCode: '4400' }
      ]
    },
    {
      companyName: 'MAMROUT PAPER GROUP CORP',
      tenantName: 'Mamrout Paper',
      unitName: 'Storage - 6,367 SF',
      squareFeet: 6367,
      notes: 'Storage agreement. Customer responsible for own insurance. Loading docks: Small Buildings area.',
      charges: [
        { description: 'Monthly Storage Fee (6,367 SF all-inclusive)', amount: 7693.00, accountCode: '4000' }
      ]
    },
    {
      companyName: 'Kinwell Trading Inc',
      tenantName: 'Kinwell Trading',
      unitName: 'Multi-Floor - 12,867 SF',
      squareFeet: 12867,
      notes: 'Loading dock #13 only. One year lease. 10,000 SF + 2,867 SF starting Nov 15.',
      charges: [
        { description: 'Base Rent (12,867 SF @ $16.50/SF annual)', amount: 17692.00, accountCode: '4000' },
        { description: 'CAM Charges (12,867 SF @ $3.25/SF annual)', amount: 3484.81, accountCode: '4100' },
        { description: 'Utilities (12,867 SF @ $1.00/SF annual)', amount: 833.33, accountCode: '4200' },
        { description: 'Common Area (Lunch/Bathroom) 380SF', amount: 0.01, accountCode: '4100' },
        { description: 'Garbage Fee', amount: 500.00, accountCode: '4200' },
        { description: 'Swing Reach Machine (50% use)', amount: 1800.00, accountCode: '4300' },
        { description: 'Picker Machine (100% use)', amount: 1500.00, accountCode: '4300' },
        { description: 'Electric Rid-On Jack (100% use)', amount: 600.00, accountCode: '4300' }
      ]
    },
    {
      companyName: 'SR International Supply Chain Inc',
      tenantName: 'Kyle Lin',
      unitName: 'Multi-Floor - 10,624 SF',
      squareFeet: 10624,
      notes: 'First floor 3,824 SF + Third floor 6,800 SF. One year lease.',
      charges: [
        { description: '1st Floor Rent (3,824 SF)', amount: 5258.00, accountCode: '4000' },
        { description: '1st Floor CAM (3,824 SF @ $2.75/SF annual)', amount: 825.00, accountCode: '4100' },
        { description: '1st Floor Utilities', amount: 300.00, accountCode: '4200' },
        { description: '3rd Floor Rent (6,800 SF)', amount: 5666.67, accountCode: '4000' },
        { description: '3rd Floor CAM', amount: 566.67, accountCode: '4100' },
        { description: '3rd Floor Utilities', amount: 566.67, accountCode: '4200' },
        { description: 'Garbage Fee', amount: 150.00, accountCode: '4200' }
      ]
    },
    {
      companyName: 'GRAND AVENUE FOOD SUPPLY, INC.',
      tenantName: 'Grand Avenue Food',
      unitName: 'Storage - 22,338 SF (9 Aisles)',
      squareFeet: 22338,
      notes: 'Loading docks #1 and #2 only. 1,760 pallet positions. Storage charges for goods.',
      charges: [
        { description: 'Monthly Storage (22,338 SF @ $19.50/SF annual)', amount: 36299.00, accountCode: '4000' },
        { description: 'Garbage Fee', amount: 800.00, accountCode: '4200' },
        { description: 'Friendly Discount', amount: -4949.00, accountCode: '4000' }
      ]
    },
    {
      companyName: 'Elite Warehouse & Distribution Inc',
      tenantName: 'Elite Warehouse',
      unitName: 'Multi-Floor - Various',
      squareFeet: 60000,
      notes: 'Loading docks #6,7,8,9 only. 1st floor by pallet, 3rd floor 39,153 SF, 2nd floor mezzanine 16K SF.',
      charges: [
        { description: '1st Floor (9x25x225 pallets @ $18)', amount: 93960.00, accountCode: '4000' },
        { description: '3rd Floor (39,153 SF @ $8+$2)', amount: 32627.50, accountCode: '4000' },
        { description: '2nd Floor Mezzanine (16K SF @ $7+$2)', amount: 10618.00, accountCode: '4000' },
        { description: 'New Aisles (Nov 2025)', amount: 3024.00, accountCode: '4000' }
      ]
    },
    {
      companyName: 'GBY Warehousing LLC',
      tenantName: 'GBY Warehousing',
      unitName: 'Multi-Floor - 76,000 SF',
      squareFeet: 76000,
      notes: 'Loading docks #3 and #4 only. First floor 16K SF, Second floor 60K SF.',
      charges: [
        { description: '1st Floor Rent (16K SF @ $11+$2.50)', amount: 18000.00, accountCode: '4000' },
        { description: '2nd Floor Rent (60K SF @ $8+$2.50)', amount: 52500.00, accountCode: '4000' },
        { description: 'Friendly Credit', amount: -2831.00, accountCode: '4000' },
        { description: 'Garbage Fee', amount: 500.00, accountCode: '4200' }
      ]
    },
    {
      companyName: 'APLUS DEALS LLC',
      tenantName: 'Nechemia Landau & Simcha Berliner',
      unitName: '1st Floor - 7,369 SF',
      squareFeet: 7369,
      notes: '7,369 SF floor area + 273 SF common + 936 SF office. Equipment rental included.',
      charges: [
        { description: 'Base Rent (7,369 SF @ $18/SF annual)', amount: 11053.00, accountCode: '4000' },
        { description: 'CAM/Real Estate Tax (7,369 SF @ $3.50/SF annual)', amount: 2149.00, accountCode: '4100' },
        { description: 'Utilities (7,369 SF @ $1/SF annual)', amount: 614.00, accountCode: '4200' },
        { description: 'Machine Rental Monthly', amount: 1800.00, accountCode: '4300' },
        { description: 'Trash & Recycle Monthly', amount: 600.00, accountCode: '4200' }
      ]
    },
    {
      companyName: 'Beach Trading Company, Inc',
      tenantName: 'Beach Trading',
      unitName: '1st Floor Aisles',
      squareFeet: 0,
      notes: 'Loading dock #18 only. P.O. 185/63. One year lease, 60 days notice.',
      charges: [
        { description: '2 Single Aisles (longer to end) - Flat Fee', amount: 8277.00, accountCode: '4000' },
        { description: '3 Single Aisles (longer to end) - Flat Fee', amount: 12415.50, accountCode: '4000' },
        { description: 'Swing Reach Machine', amount: 1800.00, accountCode: '4300' }
      ]
    }
  ];

  // Create units and leases for each tenant
  for (const tenant of tenants) {
    console.log(`Creating unit and lease for ${tenant.companyName}...`);

    // Create unit
    const unit = await prisma.unit.create({
      data: {
        propertyId: property.id,
        unitNumber: tenant.unitName,
        squareFeet: tenant.squareFeet > 0 ? tenant.squareFeet : null,
        status: 'OCCUPIED',
        notes: tenant.notes
      }
    });

    // Generate portal token
    const portalToken = crypto.randomBytes(32).toString('hex');

    // Create lease
    const lease = await prisma.lease.create({
      data: {
        propertyId: property.id,
        unitId: unit.id,
        companyName: tenant.companyName,
        tenantName: tenant.tenantName,
        unitName: tenant.unitName,
        propertyName: property.name,
        status: 'ACTIVE',
        notes: tenant.notes,
        portalToken: portalToken,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31')
      }
    });

    // Calculate total monthly charges
    const totalMonthly = tenant.charges.reduce((sum, c) => sum + c.amount, 0);
    console.log(`  - Total monthly: $${totalMonthly.toLocaleString()}`);

    // Create scheduled charges
    for (const charge of tenant.charges) {
      await prisma.scheduledCharge.create({
        data: {
          leaseId: lease.id,
          description: charge.description,
          amount: charge.amount,
          accountCode: charge.accountCode,
          chargeDay: 1,
          active: true
        }
      });
    }

    console.log(`  - Created ${tenant.charges.length} scheduled charges`);
  }

  // Calculate totals
  const totalCharges = tenants.reduce((sum, t) =>
    sum + t.charges.reduce((s, c) => s + c.amount, 0), 0
  );

  console.log('\n========================================');
  console.log('55 Talmadge Road Setup Complete!');
  console.log('========================================');
  console.log(`Property ID: ${property.id}`);
  console.log(`Total Tenants: ${tenants.length}`);
  console.log(`Total Monthly Revenue: $${totalCharges.toLocaleString()}`);
  console.log('\nYou can view this property at:');
  console.log(`http://localhost:3000/properties/${property.id}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
