import { PrismaClient, AccountType, DebitCredit } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Comprehensive Chart of Accounts for Residential Property Management
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
      description: 'Main bank account for day-to-day operations. Rent deposits go here.',
      type: 'ASSET' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '1010',
      name: 'Cash in Transit',
      description: 'Payments received but not yet deposited (e.g., checks being processed, Stripe pending).',
      type: 'ASSET' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '1050',
      name: 'Petty Cash',
      description: 'Small cash on hand for minor expenses like supplies or tips.',
      type: 'ASSET' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '1200',
      name: 'Tenant Balances (A/R)',
      description: 'Money tenants owe you. Increases when you charge rent, decreases when they pay.',
      type: 'ASSET' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '1210',
      name: 'Other Receivables',
      description: 'Money owed to you from non-tenants (e.g., insurance claims, vendor refunds).',
      type: 'ASSET' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '1300',
      name: 'Prepaid Insurance',
      description: 'Insurance premiums paid in advance. Expense portion recognized monthly.',
      type: 'ASSET' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '1310',
      name: 'Prepaid Property Taxes',
      description: 'Property taxes paid in advance before they are due.',
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
      description: 'Tenant security deposits you are holding. This is their money, not yours.',
      type: 'LIABILITY' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '2110',
      name: 'Pet Deposits Held',
      description: 'Refundable pet deposits from tenants. Return when they move out.',
      type: 'LIABILITY' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '2120',
      name: 'Last Month Rent Held',
      description: 'Last month rent collected upfront. Applied to final month of tenancy.',
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
      code: '2300',
      name: 'Accounts Payable',
      description: 'Bills you owe to vendors, contractors, or suppliers.',
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
      description: 'Your investment in the property. Profit/loss flows here at year end.',
      type: 'EQUITY' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '3100',
      name: 'Owner Draws',
      description: 'Money you take out of the business for personal use.',
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
      name: 'Rent Income',
      description: 'Monthly rent charged to tenants. Your main source of income.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4010',
      name: 'Late Fee Income',
      description: 'Fees charged when tenants pay rent late.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4020',
      name: 'Utility Reimbursement',
      description: 'Money collected from tenants to cover utilities you pay.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4030',
      name: 'Parking Income',
      description: 'Monthly fees for parking spaces or garage rental.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4040',
      name: 'Pet Fee Income',
      description: 'Monthly pet rent or one-time non-refundable pet fees.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4050',
      name: 'Storage Income',
      description: 'Fees for storage units, lockers, or extra space rental.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4060',
      name: 'Application Fee Income',
      description: 'Non-refundable fees charged when tenants apply.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4070',
      name: 'Move-In Fee Income',
      description: 'One-time non-refundable fees charged at lease signing.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4080',
      name: 'Laundry Income',
      description: 'Revenue from coin-operated or card laundry machines.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4090',
      name: 'Vending Income',
      description: 'Revenue from vending machines on the property.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4100',
      name: 'NSF/Returned Check Fee',
      description: 'Fees charged when a tenant\'s check bounces.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4110',
      name: 'Lease Break Fee',
      description: 'Fee charged when tenant breaks lease early.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4120',
      name: 'Damage Recovery',
      description: 'Money recovered from tenants for damages beyond normal wear.',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4130',
      name: 'Key/Lock Replacement Fee',
      description: 'Fee charged for lost keys or lock changes.',
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
    // EXPENSES (5000-5999) - Money GOING OUT
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
      name: 'Plumbing Repairs',
      description: 'Fixing pipes, faucets, toilets, water heaters, drains.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5020',
      name: 'Electrical Repairs',
      description: 'Fixing outlets, switches, panels, wiring, lighting.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5030',
      name: 'HVAC Repairs',
      description: 'Heating, air conditioning, and ventilation repairs.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5040',
      name: 'Appliance Repairs',
      description: 'Fixing refrigerators, stoves, dishwashers, washers, dryers.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5050',
      name: 'Roof Repairs',
      description: 'Fixing leaks, shingles, flashing, gutters.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5060',
      name: 'Flooring Repairs',
      description: 'Fixing carpet, tile, hardwood, vinyl flooring.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5070',
      name: 'Painting',
      description: 'Interior and exterior painting, touch-ups, staining.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5080',
      name: 'Window/Door Repairs',
      description: 'Fixing windows, doors, screens, locks, weatherstripping.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },

    // --- Property Operations (5100-5199) ---
    {
      code: '5100',
      name: 'Landscaping & Lawn Care',
      description: 'Mowing, trimming, tree care, seasonal planting.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5110',
      name: 'Snow Removal',
      description: 'Plowing, shoveling, salting during winter.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5120',
      name: 'Cleaning & Janitorial',
      description: 'Common area cleaning, unit turnover cleaning.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5130',
      name: 'Pest Control',
      description: 'Exterminator services for bugs, rodents, etc.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5140',
      name: 'Trash Removal',
      description: 'Garbage pickup, dumpster rental, recycling services.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5150',
      name: 'Pool/Spa Maintenance',
      description: 'Pool cleaning, chemicals, equipment repairs.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5160',
      name: 'Security Services',
      description: 'Security patrols, alarm monitoring, cameras.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5170',
      name: 'Elevator Maintenance',
      description: 'Elevator inspections, repairs, service contracts.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },

    // --- Utilities (5200-5299) ---
    {
      code: '5200',
      name: 'Electric - Common Areas',
      description: 'Electricity for hallways, laundry room, exterior lights.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5210',
      name: 'Electric - Landlord Paid',
      description: 'Electricity included in rent that you pay.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5220',
      name: 'Gas - Common Areas',
      description: 'Gas for common area heating, hot water.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5230',
      name: 'Gas - Landlord Paid',
      description: 'Gas included in rent that you pay.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5240',
      name: 'Water & Sewer',
      description: 'Water and sewer bills for the property.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5250',
      name: 'Internet/Cable - Common',
      description: 'WiFi for common areas or included in rent.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },

    // --- Insurance & Taxes (5300-5399) ---
    {
      code: '5300',
      name: 'Property Insurance',
      description: 'Hazard/fire insurance, liability coverage for property.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5310',
      name: 'Umbrella Insurance',
      description: 'Extra liability coverage beyond standard policies.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5320',
      name: 'Flood Insurance',
      description: 'Required flood coverage for properties in flood zones.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5350',
      name: 'Property Taxes',
      description: 'Annual real estate taxes paid to the county.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5360',
      name: 'HOA Fees',
      description: 'Homeowners association fees and special assessments.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },

    // --- Professional Services (5400-5499) ---
    {
      code: '5400',
      name: 'Property Management Fee',
      description: 'Fees paid to property manager (if not self-managed).',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5410',
      name: 'Legal Fees',
      description: 'Attorney fees for evictions, lease review, disputes.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5420',
      name: 'Accounting & Bookkeeping',
      description: 'CPA fees, tax preparation, bookkeeping services.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5430',
      name: 'Tenant Screening',
      description: 'Background checks, credit reports, application processing.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5440',
      name: 'Eviction Costs',
      description: 'Court fees, process server, locksmith for evictions.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },

    // --- Marketing & Admin (5500-5599) ---
    {
      code: '5500',
      name: 'Advertising & Marketing',
      description: 'Listing fees, Zillow, Apartments.com, signs, photos.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5510',
      name: 'Leasing Commission',
      description: 'Fees paid to agents for finding tenants.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5520',
      name: 'Office Supplies',
      description: 'Paper, printer ink, envelopes, stamps.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5530',
      name: 'Software & Subscriptions',
      description: 'Property management software, online tools.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5540',
      name: 'Phone & Communication',
      description: 'Cell phone, landline, answering service.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5550',
      name: 'Travel & Mileage',
      description: 'Mileage to/from property, parking fees.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5560',
      name: 'Bank Fees & Charges',
      description: 'Account fees, wire fees, credit card processing.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5570',
      name: 'Licenses & Permits',
      description: 'Rental licenses, business permits, inspections.',
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
      description: 'Light bulbs, filters, batteries, small tools.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5710',
      name: 'Cleaning Supplies',
      description: 'Mops, brooms, cleaners, trash bags.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5720',
      name: 'Equipment Purchase',
      description: 'Tools, ladders, lawn equipment (under $2,500).',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5730',
      name: 'Safety Equipment',
      description: 'Smoke detectors, fire extinguishers, CO detectors.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },

    // --- Turnover & Vacancy (5800-5899) ---
    {
      code: '5800',
      name: 'Unit Turnover Costs',
      description: 'Make-ready expenses between tenants (cleaning, minor repairs).',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5810',
      name: 'Appliance Replacement',
      description: 'New refrigerator, stove, dishwasher, etc.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5820',
      name: 'Carpet Replacement',
      description: 'New carpet or flooring during turnover.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5830',
      name: 'Keys & Locks',
      description: 'Re-keying, new locks, key copies.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },

    // --- Miscellaneous (5900-5999) ---
    {
      code: '5900',
      name: 'Miscellaneous Expense',
      description: 'Other expenses that don\'t fit elsewhere.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5910',
      name: 'Bad Debt / Write-offs',
      description: 'Uncollectible rent or fees written off.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5920',
      name: 'Tenant Incentives',
      description: 'Move-in specials, rent concessions, gift cards.',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5930',
      name: 'Emergency Repairs',
      description: 'Unexpected urgent repairs (burst pipes, storm damage).',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
  ];

  for (const account of accounts) {
    await prisma.chartOfAccounts.upsert({
      where: { code: account.code },
      update: {
        name: account.name,
        description: account.description,
        type: account.type,
        normalBalance: account.normalBalance,
        active: account.active
      },
      create: account
    });
    console.log(`✅ Created account: ${account.code} - ${account.name}`);
  }

  console.log('✨ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
