import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAPI() {
  try {
    const leaseId = '401bc887-5c4e-48ae-9c09-6f789295ad51';

    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        ledgerEntries: {
          where: { status: 'POSTED' },
          include: {
            account: true
          },
          orderBy: [
            { entryDate: 'desc' },
            { createdAt: 'desc' }
          ]
        }
      }
    });

    if (!lease) {
      console.log('Lease not found');
      return;
    }

    console.log('Lease data:');
    console.log('- ID:', lease.id);
    console.log('- Tenant:', lease.tenantName);
    console.log('- Portal Token:', lease.portalToken ? 'EXISTS' : 'NULL');
    console.log('- Portal Last Access:', lease.portalLastAccess);

    // Calculate balance
    let balance = 0;
    for (const entry of lease.ledgerEntries) {
      if (entry.accountCode === '1200') {
        const amount = Number(entry.amount);
        balance += entry.debitCredit === 'DR' ? amount : -amount;
      }
    }

    const result = {
      ...lease,
      balance
    };

    console.log('\nReturned fields:');
    console.log('- Has portalToken:', 'portalToken' in result);
    console.log('- Has portalLastAccess:', 'portalLastAccess' in result);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPI();
