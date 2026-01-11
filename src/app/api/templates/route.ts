import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/templates - Get all document templates
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (activeOnly) {
      where.active = true;
    }

    const templates = await prisma.documentTemplate.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(templates);

  } catch (error: any) {
    console.error('GET /api/templates error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST /api/templates - Create new document template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      category,
      templateContent,
      mergeFields,
      fileType,
      createdBy
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    if (!templateContent) {
      return NextResponse.json(
        { error: 'Template content is required' },
        { status: 400 }
      );
    }

    const template = await prisma.documentTemplate.create({
      data: {
        name,
        description: description || null,
        category,
        templateContent,
        mergeFields: mergeFields || [],
        fileType: fileType || 'pdf',
        createdBy: createdBy || 'system'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Template created successfully',
      template
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/templates error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create template' },
      { status: 500 }
    );
  }
}
