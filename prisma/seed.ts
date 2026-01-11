import { PrismaClient, AccountType, DebitCredit } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed Chart of Accounts (5 baseline accounts)
  const accounts: Array<{
    code: string;
    name: string;
    type: AccountType;
    normalBalance: DebitCredit;
    active: boolean;
  }> = [
    {
      code: '1000',
      name: 'Operating Cash',
      type: 'ASSET' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '1200',
      name: 'Accounts Receivable',
      type: 'ASSET' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '2100',
      name: 'Security Deposits Held',
      type: 'LIABILITY' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4000',
      name: 'Rental Income',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4010',
      name: 'Late Fees',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4020',
      name: 'Utility Reimbursement',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4030',
      name: 'Parking Income',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4040',
      name: 'Pet Fees',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4050',
      name: 'Storage Income',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4060',
      name: 'Application Fees',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '4100',
      name: 'Other Income',
      type: 'INCOME' as AccountType,
      normalBalance: 'CR' as DebitCredit,
      active: true
    },
    {
      code: '5000',
      name: 'Repairs & Maintenance',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5010',
      name: 'Utilities',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5020',
      name: 'Insurance',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5030',
      name: 'Property Taxes',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5040',
      name: 'Management Fees',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5050',
      name: 'Legal & Professional',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5060',
      name: 'Advertising & Marketing',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5070',
      name: 'Landscaping',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5080',
      name: 'Cleaning & Janitorial',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5090',
      name: 'Supplies',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    },
    {
      code: '5100',
      name: 'Other Expenses',
      type: 'EXPENSE' as AccountType,
      normalBalance: 'DR' as DebitCredit,
      active: true
    }
  ];

  for (const account of accounts) {
    await prisma.chartOfAccounts.upsert({
      where: { code: account.code },
      update: {},
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
