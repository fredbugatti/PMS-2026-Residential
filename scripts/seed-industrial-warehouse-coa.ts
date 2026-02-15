// Seed script: Industrial Warehouse Chart of Accounts
// Replaces residential COA with warehouse/industrial-specific accounts
// Run with: npx tsx scripts/seed-industrial-warehouse-coa.ts

import { PrismaClient, AccountType, DebitCredit } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Loading Industrial Warehouse Chart of Accounts...\n');

  const accounts: Array<{
    code: string;
    name: string;
    description: string;
    type: AccountType;
    normalBalance: DebitCredit;
    active: boolean;
  }> = [
    // ═══════════════════════════════════════════════════════════════════
    // ASSETS (1000-1999) - What you OWN
    // ═══════════════════════════════════════════════════════════════════
    {
      code: '1000',
      name: 'Operating Cash',
      description: 'Main bank account for day-to-day operations. Rent deposits, vendor payments.',
      type: 'ASSET' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '1001',
      name: 'Cash in Transit',
      description: 'Payments received but not yet deposited (ACH pending, wire transfers in process).',
      type: 'ASSET' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '1050',
      name: 'Petty Cash',
      description: 'Small cash on hand for minor warehouse facility expenses.',
      type: 'ASSET' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '1200',
      name: 'Tenant Balances (A/R)',
      description: 'Money tenants owe. Increases with rent/CAM charges, decreases with payments.',
      type: 'ASSET' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '1210',
      name: 'Other Receivables',
      description: 'Non-tenant receivables: insurance claims, vendor refunds, damage recovery.',
      type: 'ASSET' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '1220',
      name: 'CAM Receivables',
      description: 'Common Area Maintenance charges billed but not yet collected from tenants.',
      type: 'ASSET' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '1300',
      name: 'Prepaid Insurance',
      description: 'Insurance premiums paid in advance. Expense recognized monthly.',
      type: 'ASSET' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '1310',
      name: 'Prepaid Property Taxes',
      description: 'Property taxes paid in advance before due date.',
      type: 'ASSET' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },

    // ═══════════════════════════════════════════════════════════════════
    // LIABILITIES (2000-2999) - What you OWE
    // ═══════════════════════════════════════════════════════════════════
    {
      code: '2100',
      name: 'Security Deposits Held',
      description: 'Tenant security deposits held in trust. This is their money until lease ends.',
      type: 'LIABILITY' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '2150',
      name: 'Tenant Improvement Allowance Payable',
      description: 'TI allowances committed to tenants for build-out of warehouse spaces.',
      type: 'LIABILITY' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '2200',
      name: 'Prepaid Rent',
      description: 'Rent paid by tenants in advance (before it is due).',
      type: 'LIABILITY' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '2210',
      name: 'Deferred Rent',
      description: 'Rent abatements or free rent periods being amortized over lease term.',
      type: 'LIABILITY' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '2250',
      name: 'CAM Reconciliation Payable',
      description: 'CAM overpayments owed back to tenants after annual reconciliation.',
      type: 'LIABILITY' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '2300',
      name: 'Accounts Payable',
      description: 'Bills owed to vendors, contractors, and suppliers.',
      type: 'LIABILITY' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '2400',
      name: 'Mortgage Payable',
      description: 'Outstanding balance on property mortgage loans.',
      type: 'LIABILITY' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },

    // ═══════════════════════════════════════════════════════════════════
    // EQUITY (3000-3999) - Net Worth / Owner Investment
    // ═══════════════════════════════════════════════════════════════════
    {
      code: '3000',
      name: 'Owner Equity',
      description: 'Owner investment in the property. Profit/loss flows here at year end.',
      type: 'EQUITY' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '3100',
      name: 'Owner Draws',
      description: 'Money taken out of the business for personal use.',
      type: 'EQUITY' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '3200',
      name: 'Retained Earnings',
      description: 'Accumulated profits kept in the business from previous years.',
      type: 'EQUITY' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },

    // ═══════════════════════════════════════════════════════════════════
    // INCOME (4000-4999) - Money COMING IN
    // ═══════════════════════════════════════════════════════════════════
    {
      code: '4000',
      name: 'Base Rent Income',
      description: 'Monthly base rent charged to warehouse tenants (NNN or gross lease).',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4010',
      name: 'CAM Reimbursement',
      description: 'Common Area Maintenance charges billed back to tenants (NNN pass-through).',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4020',
      name: 'Property Tax Reimbursement',
      description: 'Property taxes billed back to tenants under NNN lease terms.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4030',
      name: 'Insurance Reimbursement',
      description: 'Insurance costs billed back to tenants under NNN lease terms.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4040',
      name: 'Utility Reimbursement',
      description: 'Utility costs billed back to tenants (electric, water, gas).',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4100',
      name: 'Late Fee Income',
      description: 'Fees charged when tenants pay rent or CAM charges late.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4110',
      name: 'NSF/Returned Check Fee',
      description: 'Fees charged when a tenant check bounces or ACH fails.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4120',
      name: 'Lease Termination Fee',
      description: 'Fee charged when tenant breaks warehouse lease early.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4200',
      name: 'Maintenance Recovery Income',
      description: 'Money recovered from tenants for property damage or maintenance caused by tenant.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4210',
      name: 'Tenant Improvement Recovery',
      description: 'Unamortized TI allowance recovered when tenant vacates early.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4300',
      name: 'Dock/Loading Fee Income',
      description: 'Additional fees for shared loading dock or dock door usage.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4310',
      name: 'Yard Storage Income',
      description: 'Revenue from outdoor yard storage, trailer parking, or container storage.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4320',
      name: 'Parking Income',
      description: 'Fees for truck parking, employee parking, or overflow lot usage.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4330',
      name: 'Signage Income',
      description: 'Revenue from building signage rights or monument sign space.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4340',
      name: 'Percentage Rent',
      description: 'Additional rent based on tenant gross sales exceeding a breakpoint.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4350',
      name: 'Forklift/Equipment Rental',
      description: 'Revenue from renting forklifts, pallet jacks, or shared equipment.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4900',
      name: 'Other Income',
      description: 'Miscellaneous income that doesn\'t fit other categories.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },

    // ═══════════════════════════════════════════════════════════════════
    // EXPENSES (5000-6999) - Money GOING OUT
    // ═══════════════════════════════════════════════════════════════════

    // --- Repairs & Maintenance (5000-5099) ---
    {
      code: '5000',
      name: 'General Repairs',
      description: 'Miscellaneous repairs that don\'t fit specific categories.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5010',
      name: 'Roof Repairs',
      description: 'Flat roof patching, membrane repairs, flashing, drain maintenance.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5020',
      name: 'HVAC - Industrial Systems',
      description: 'Warehouse HVAC units, make-up air units, exhaust fans, RTUs.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5030',
      name: 'Loading Dock Repairs',
      description: 'Dock levelers, dock bumpers, pit repairs, dock seals/shelters.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5040',
      name: 'Overhead Door Repairs',
      description: 'Roll-up doors, sectional doors, door openers, springs, tracks.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5050',
      name: 'Concrete & Paving Repairs',
      description: 'Warehouse floor repairs, parking lot patching, curb repair, striping.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5060',
      name: 'Fire Suppression System',
      description: 'Sprinkler inspections, repairs, fire alarm service, extinguisher maintenance.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5070',
      name: 'Electrical Systems',
      description: 'High-voltage panels, 3-phase power, lighting, outlets, transformers.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5080',
      name: 'Plumbing Repairs',
      description: 'Pipes, drains, floor drains, restroom plumbing, backflow preventers.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5090',
      name: 'Painting & Exterior',
      description: 'Interior/exterior painting, bollard painting, line striping.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },

    // --- Property Operations (5100-5199) ---
    {
      code: '5100',
      name: 'Landscaping & Grounds',
      description: 'Mowing, trimming, seasonal planting, drainage maintenance.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5110',
      name: 'Snow & Ice Removal',
      description: 'Plowing, salting, shoveling of parking lots, driveways, dock areas.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5120',
      name: 'Janitorial - Common Areas',
      description: 'Common area cleaning, restroom servicing, lobby/hallway maintenance.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5130',
      name: 'Pest Control',
      description: 'Rodent control, insect treatment — critical for warehouse environments.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5140',
      name: 'Waste & Dumpster Service',
      description: 'Dumpster rental, trash hauling, recycling, compactor service.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5150',
      name: 'Security Services',
      description: 'Security patrols, alarm monitoring, CCTV, access control systems.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5160',
      name: 'Fencing & Gate Repairs',
      description: 'Perimeter fencing, gate operators, card readers, bollard repairs.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },

    // --- Utilities (5200-5299) ---
    {
      code: '5200',
      name: 'Electric - Common Areas',
      description: 'Electricity for exterior lights, common halls, dock lights, parking lot lights.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5210',
      name: 'Electric - Landlord Paid',
      description: 'Electricity for tenant spaces included in gross lease or shared meter.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5220',
      name: 'Gas/Propane',
      description: 'Natural gas or propane for heating, warehouse unit heaters.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5240',
      name: 'Water & Sewer',
      description: 'Water and sewer service for the property.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5250',
      name: 'Stormwater Management',
      description: 'Stormwater utility fees, retention pond maintenance, drain cleaning.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },

    // --- Insurance & Taxes (5300-5399) ---
    {
      code: '5300',
      name: 'Property Insurance',
      description: 'Hazard/fire insurance, building coverage for warehouse structure.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5310',
      name: 'General Liability Insurance',
      description: 'Liability coverage for property operations, slip-and-fall, etc.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5320',
      name: 'Environmental Insurance',
      description: 'Pollution liability, environmental contamination coverage.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5330',
      name: 'Umbrella Insurance',
      description: 'Excess liability coverage beyond standard policies.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5350',
      name: 'Property Taxes',
      description: 'Annual real estate taxes paid to the county/municipality.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },

    // --- Professional Services (5400-5499) ---
    {
      code: '5400',
      name: 'Property Management Fee',
      description: 'Fees paid to property management company (if not self-managed).',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5410',
      name: 'Legal Fees',
      description: 'Attorney fees for lease negotiation, evictions, disputes, zoning.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5420',
      name: 'Accounting & Bookkeeping',
      description: 'CPA fees, tax preparation, CAM reconciliation, bookkeeping services.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5430',
      name: 'Environmental Compliance',
      description: 'Phase I/II assessments, hazmat inspections, EPA compliance, remediation.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5440',
      name: 'Tenant Screening',
      description: 'Credit checks, business background verification, reference checks.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5450',
      name: 'Eviction Costs',
      description: 'Court fees, process server, locksmith, attorney fees for evictions.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },

    // --- Marketing & Admin (5500-5599) ---
    {
      code: '5500',
      name: 'Advertising & Marketing',
      description: 'LoopNet, CoStar, CRE listings, signage, broker marketing.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5510',
      name: 'Leasing Commission',
      description: 'Broker commissions for new leases and renewals.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5520',
      name: 'Office Supplies',
      description: 'Paper, printer ink, envelopes, stamps, office sundries.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5530',
      name: 'Software & Subscriptions',
      description: 'Property management software, CoStar, accounting tools.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5540',
      name: 'Phone & Communication',
      description: 'Cell phone, office phone, answering service.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5550',
      name: 'Travel & Mileage',
      description: 'Mileage to/from property, parking fees, travel expenses.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5560',
      name: 'Bank Fees & Charges',
      description: 'Account fees, wire fees, ACH processing, credit card charges.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5570',
      name: 'Licenses & Permits',
      description: 'Business permits, fire permits, occupancy certificates, inspections.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },

    // --- Mortgage & Financing (5600-5699) ---
    {
      code: '5600',
      name: 'Mortgage Interest',
      description: 'Interest portion of mortgage payments (tax deductible).',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5610',
      name: 'Loan Fees',
      description: 'Points, origination fees, refinance costs.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },

    // --- Supplies & Equipment (5700-5799) ---
    {
      code: '5700',
      name: 'Maintenance Supplies',
      description: 'Light bulbs, filters, batteries, small tools, hardware.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5710',
      name: 'Cleaning Supplies',
      description: 'Common area cleaning products, trash bags, paper goods.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5720',
      name: 'Equipment Purchase',
      description: 'Tools, ladders, pressure washer, small equipment (under $2,500).',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5730',
      name: 'Safety Equipment',
      description: 'Fire extinguishers, AED, first aid, safety signs, eye wash stations.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },

    // --- Turnover & Capital (5800-5899) ---
    {
      code: '5800',
      name: 'Unit Turnover Costs',
      description: 'Make-ready expenses between tenants: cleaning, minor repairs, painting.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5810',
      name: 'Dock Equipment Replacement',
      description: 'New dock levelers, dock bumpers, dock plates, dock seals.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5820',
      name: 'Overhead Door Replacement',
      description: 'New roll-up doors, sectional doors, high-speed doors.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5830',
      name: 'HVAC Replacement',
      description: 'New RTUs, warehouse unit heaters, make-up air units.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5840',
      name: 'Roof Replacement',
      description: 'Full or partial roof replacement, membrane, insulation.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5850',
      name: 'Parking Lot Resurfacing',
      description: 'Asphalt overlay, seal coating, full repaving of truck court or lot.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5860',
      name: 'Tenant Improvement Build-Out',
      description: 'Landlord-funded tenant improvements: demising walls, offices, restrooms.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },

    // --- Other Expenses (5900-5999) ---
    {
      code: '5900',
      name: 'Bad Debt / Write-offs',
      description: 'Uncollectible rent or charges written off after collection efforts.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5910',
      name: 'Tenant Incentives',
      description: 'Free rent periods, move-in allowances, or other concessions.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5920',
      name: 'Emergency Repairs',
      description: 'Urgent after-hours repairs: burst pipes, roof leaks, power outages.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5990',
      name: 'Miscellaneous Expense',
      description: 'Expenses that don\'t fit other categories.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },

    // --- Maintenance Expense (6000+) ---
    {
      code: '6100',
      name: 'Maintenance Expense',
      description: 'General maintenance costs: work orders, preventive maintenance, service calls.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
  ];

  // Get the set of codes we want to keep
  const newCodes = new Set(accounts.map(a => a.code));

  // Delete old accounts that are NOT in our new list and have no ledger entries
  const existingAccounts = await prisma.chartOfAccounts.findMany({ select: { code: true } });
  const oldCodes = existingAccounts.map(a => a.code).filter(code => !newCodes.has(code));
  let deleted = 0;
  for (const code of oldCodes) {
    const txCount = await prisma.ledgerEntry.count({ where: { accountCode: code } });
    if (txCount === 0) {
      await prisma.chartOfAccounts.delete({ where: { code } });
      deleted++;
    } else {
      // Deactivate accounts with transactions that we're replacing
      await prisma.chartOfAccounts.update({ where: { code }, data: { active: false } });
      console.log(`  ⚠ Deactivated ${code} (has ${txCount} transactions)`);
    }
  }
  if (deleted > 0) console.log(`Removed ${deleted} unused residential accounts.`);

  // Upsert all industrial warehouse accounts
  console.log(`Upserting ${accounts.length} industrial warehouse accounts...`);
  for (const account of accounts) {
    await prisma.chartOfAccounts.upsert({
      where: { code: account.code },
      update: { name: account.name, description: account.description, type: account.type, normalBalance: account.normalBalance, active: account.active },
      create: account,
    });
  }

  console.log(`\n✅ Successfully loaded ${accounts.length} accounts for Industrial Warehouse.`);
  console.log('\nAccount breakdown:');
  const types = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];
  for (const type of types) {
    const count = accounts.filter(a => a.type === type).length;
    console.log(`  ${type}: ${count} accounts`);
  }
}

main()
  .catch((e) => {
    console.error('Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
