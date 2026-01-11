import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function generatePortalTokens() {
  try {
    console.log('Finding leases without portal tokens...');

    // Find all leases that don't have a portal token
    const leasesWithoutToken = await prisma.lease.findMany({
      where: {
        portalToken: null
      },
      select: {
        id: true,
        tenantName: true,
        status: true
      }
    });

    console.log(`Found ${leasesWithoutToken.length} leases without portal tokens`);

    if (leasesWithoutToken.length === 0) {
      console.log('All leases already have portal tokens!');
      return;
    }

    console.log('Generating portal tokens...');

    let updated = 0;
    for (const lease of leasesWithoutToken) {
      const token = crypto.randomBytes(32).toString('hex');

      await prisma.lease.update({
        where: { id: lease.id },
        data: { portalToken: token }
      });

      console.log(`✓ Generated token for: ${lease.tenantName} (${lease.status})`);
      updated++;
    }

    console.log(`\nSuccessfully generated ${updated} portal tokens!`);

  } catch (error) {
    console.error('Error generating portal tokens:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

generatePortalTokens()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
