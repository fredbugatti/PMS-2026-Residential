import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/templates/[id] - Get single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const template = await prisma.documentTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);

  } catch (error: any) {
    console.error('GET /api/templates/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

// PUT /api/templates/[id] - Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      description,
      category,
      templateContent,
      mergeFields,
      fileType,
      active
    } = body;

    // Check if template exists
    const existing = await prisma.documentTemplate.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Prevent editing system templates
    if (existing.isSystem) {
      return NextResponse.json(
        { error: 'System templates cannot be modified' },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (templateContent !== undefined) updateData.templateContent = templateContent;
    if (mergeFields !== undefined) updateData.mergeFields = mergeFields;
    if (fileType !== undefined) updateData.fileType = fileType;
    if (active !== undefined) updateData.active = active;

    const template = await prisma.documentTemplate.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      template
    });

  } catch (error: any) {
    console.error('PUT /api/templates/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE /api/templates/[id] - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if template exists
    const template = await prisma.documentTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Prevent deleting system templates
    if (template.isSystem) {
      return NextResponse.json(
        { error: 'System templates cannot be deleted' },
        { status: 403 }
      );
    }

    await prisma.documentTemplate.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error: any) {
    console.error('DELETE /api/templates/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete template' },
      { status: 500 }
    );
  }
}
