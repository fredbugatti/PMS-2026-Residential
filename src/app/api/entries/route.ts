import { NextRequest, NextResponse } from 'next/server';
import { postEntry, getRecentEntries } from '@/lib/accounting';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const entry = await postEntry({
      accountCode: body.accountCode,
      amount: body.amount,
      debitCredit: body.debitCredit,
      description: body.description,
      entryDate: new Date(body.entryDate),
      leaseId: body.leaseId || undefined,
      postedBy: 'user' // TODO: Get from auth session
    });

    return NextResponse.json(entry, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/entries error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to post entry' },
      { status: 400 }
    );
  }
}

export async function GET() {
  try {
    const entries = await getRecentEntries(50);
    return NextResponse.json(entries);
  } catch (error: any) {
    console.error('GET /api/entries error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch entries' },
      { status: 500 }
    );
  }
}
