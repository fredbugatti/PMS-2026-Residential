import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  try {
    const { job } = await request.json();

    if (!job || !['daily-charges', 'daily-expenses', 'process-autopay'].includes(job)) {
      return NextResponse.json({ error: 'Invalid job name' }, { status: 400 });
    }

    // Get the base URL from the request
    const baseUrl = request.nextUrl.origin;

    // Call the cron endpoint with the CRON_SECRET
    const response = await fetch(`${baseUrl}/api/cron/${job}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
    });

    const result = await response.json();

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      result
    });
  } catch (error: any) {
    console.error('Error running cron job:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
