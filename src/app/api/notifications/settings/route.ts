import { NextRequest, NextResponse } from 'next/server';
import { getNotificationSettings, updateNotificationSettings } from '@/lib/email';

export const dynamic = 'force-dynamic';

// GET /api/notifications/settings - Get notification settings
export async function GET() {
  try {
    const settings = await getNotificationSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('GET /api/notifications/settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get notification settings' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/settings - Update notification settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const settings = await updateNotificationSettings({
      paymentReceipts: body.paymentReceipts,
      latePaymentReminders: body.latePaymentReminders,
      daysBeforeLateReminder: body.daysBeforeLateReminder,
      leaseExpiryWarnings: body.leaseExpiryWarnings,
      leaseExpiryDays: body.leaseExpiryDays,
      workOrderUpdates: body.workOrderUpdates,
      workOrderCreated: body.workOrderCreated,
      monthlyStatements: body.monthlyStatements,
      fromName: body.fromName,
      replyToEmail: body.replyToEmail
    });

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('PUT /api/notifications/settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update notification settings' },
      { status: 500 }
    );
  }
}
