import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPortalTokens() {
  try {
    const leases = await prisma.lease.findMany({
      select: {
        id: true,
        tenantName: true,
        portalToken: true,
        status: true
      }
    });

    console.log('All leases:');
    leases.forEach(lease => {
      console.log(`- ${lease.tenantName} (${lease.status})`);
      console.log(`  ID: ${lease.id}`);
      console.log(`  Token: ${lease.portalToken ? 'EXISTS' : 'NULL'}`);
      if (lease.portalToken) {
        console.log(`  Token value: ${lease.portalToken.substring(0, 16)}...`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPortalTokens();
