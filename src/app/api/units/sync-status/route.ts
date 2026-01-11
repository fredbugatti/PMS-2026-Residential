import { NextRequest, NextResponse } from 'next/server';
import { syncAllUnitStatuses, syncPropertyUnitStatuses, syncUnitStatus } from '@/lib/unitStatus';

// POST /api/units/sync-status - Manually sync unit statuses
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { unitId, propertyId, all } = body;

    if (all) {
      // Sync all units in the system
      await syncAllUnitStatuses();
      return NextResponse.json({
        success: true,
        message: 'All unit statuses synced successfully'
      });
    }

    if (propertyId) {
      // Sync all units in a property
      await syncPropertyUnitStatuses(propertyId);
      return NextResponse.json({
        success: true,
        message: 'Property unit statuses synced successfully'
      });
    }

    if (unitId) {
      // Sync a single unit
      const newStatus = await syncUnitStatus(unitId);
      return NextResponse.json({
        success: true,
        message: 'Unit status synced successfully',
        status: newStatus
      });
    }

    return NextResponse.json(
      { error: 'Please provide unitId, propertyId, or set all to true' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('POST /api/units/sync-status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync unit statuses' },
      { status: 500 }
    );
  }
}
