import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';
import { unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// GET /api/library/[id] - Get single document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const document = await prisma.documentLibrary.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            name: true
          }
        },
        lease: {
          select: {
            id: true,
            tenantName: true,
            unitName: true
          }
        }
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(document);

  } catch (error: any) {
    console.error('GET /api/library/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

// PUT /api/library/[id] - Update document metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: any = {};

    if (body.category !== undefined) updateData.category = body.category;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.propertyId !== undefined) updateData.propertyId = body.propertyId;
    if (body.leaseId !== undefined) updateData.leaseId = body.leaseId;
    if (body.isFavorite !== undefined) updateData.isFavorite = body.isFavorite;

    const document = await prisma.documentLibrary.update({
      where: { id },
      data: updateData,
      include: {
        property: {
          select: {
            id: true,
            name: true
          }
        },
        lease: {
          select: {
            id: true,
            tenantName: true,
            unitName: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Document updated successfully',
      document
    });

  } catch (error: any) {
    console.error('PUT /api/library/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update document' },
      { status: 500 }
    );
  }
}

// DELETE /api/library/[id] - Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get document info before deleting
    const document = await prisma.documentLibrary.findUnique({
      where: { id }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete file from filesystem
    const filePath = path.join(process.cwd(), 'public', document.fileUrl);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    // Delete database record
    await prisma.documentLibrary.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error: any) {
    console.error('DELETE /api/library/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete document' },
      { status: 500 }
    );
  }
}
