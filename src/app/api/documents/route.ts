import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// GET /api/documents - Get documents by leaseId
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const leaseId = searchParams.get('leaseId');

    if (!leaseId) {
      return NextResponse.json(
        { error: 'leaseId is required' },
        { status: 400 }
      );
    }

    const documents = await prisma.document.findMany({
      where: { leaseId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(documents);

  } catch (error: any) {
    console.error('GET /api/documents error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST /api/documents - Upload document
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const leaseId = formData.get('leaseId') as string;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string | null;
    const uploadedBy = formData.get('uploadedBy') as string || 'system';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!leaseId) {
      return NextResponse.json(
        { error: 'leaseId is required' },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: 'category is required' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Create lease-specific directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents', leaseId);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${sanitizedFileName}`;
    const filePath = path.join(uploadDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Create database record
    const fileUrl = `/uploads/documents/${leaseId}/${fileName}`;
    const document = await prisma.document.create({
      data: {
        leaseId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        fileUrl,
        category,
        description: description || null,
        uploadedBy
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Document uploaded successfully',
      document
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/documents error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload document' },
      { status: 500 }
    );
  }
}
