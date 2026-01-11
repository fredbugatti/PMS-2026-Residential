import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';
import { unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// DELETE /api/documents/[id] - Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get document info before deleting
    const document = await prisma.document.findUnique({
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
    await prisma.document.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error: any) {
    console.error('DELETE /api/documents/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete document' },
      { status: 500 }
    );
  }
}
