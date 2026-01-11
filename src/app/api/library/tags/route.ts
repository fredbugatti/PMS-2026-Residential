import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/library/tags - Get all unique tags
export async function GET(request: NextRequest) {
  try {
    const documents = await prisma.documentLibrary.findMany({
      select: {
        tags: true
      }
    });

    // Flatten and get unique tags
    const allTags = documents.flatMap(doc => doc.tags);
    const uniqueTags = Array.from(new Set(allTags)).sort();

    return NextResponse.json(uniqueTags);

  } catch (error: any) {
    console.error('GET /api/library/tags error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}
