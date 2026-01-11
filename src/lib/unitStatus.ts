import { prisma } from './accounting';

/**
 * Automatically update unit status based on lease status
 *
 * Logic:
 * - If unit has an ACTIVE lease -> OCCUPIED
 * - If unit has no active leases but has DRAFT leases -> VACANT (available but pending)
 * - If unit has no leases or only ENDED/TERMINATED leases -> VACANT
 */
export async function syncUnitStatus(unitId: string): Promise<string> {
  try {
    // Get all leases for this unit
    const leases = await prisma.lease.findMany({
      where: { unitId },
      select: {
        status: true
      }
    });

    let newStatus = 'VACANT';

    // Check if there's an active lease
    const hasActiveLease = leases.some(lease => lease.status === 'ACTIVE');

    if (hasActiveLease) {
      newStatus = 'OCCUPIED';
    } else {
      // Check if there are draft leases (future occupancy)
      const hasDraftLease = leases.some(lease => lease.status === 'DRAFT');
      if (hasDraftLease) {
        newStatus = 'VACANT'; // Could add 'PENDING' status in future
      }
    }

    // Update the unit status
    await prisma.unit.update({
      where: { id: unitId },
      data: { status: newStatus }
    });

    return newStatus;
  } catch (error) {
    console.error('Error syncing unit status:', error);
    throw error;
  }
}

/**
 * Sync unit status for all units in a property
 */
export async function syncPropertyUnitStatuses(propertyId: string): Promise<void> {
  try {
    const units = await prisma.unit.findMany({
      where: { propertyId },
      select: { id: true }
    });

    await Promise.all(
      units.map(unit => syncUnitStatus(unit.id))
    );
  } catch (error) {
    console.error('Error syncing property unit statuses:', error);
    throw error;
  }
}

/**
 * Sync all unit statuses in the system
 */
export async function syncAllUnitStatuses(): Promise<void> {
  try {
    const units = await prisma.unit.findMany({
      select: { id: true }
    });

    await Promise.all(
      units.map(unit => syncUnitStatus(unit.id))
    );
  } catch (error) {
    console.error('Error syncing all unit statuses:', error);
    throw error;
  }
}
