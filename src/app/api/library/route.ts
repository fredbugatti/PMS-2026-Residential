import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';
import { DocumentCategory } from '@prisma/client';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// GET /api/library - Get all library documents
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const propertyId = searchParams.get('propertyId');
    const leaseId = searchParams.get('leaseId');
    const tag = searchParams.get('tag');
    const favoritesOnly = searchParams.get('favoritesOnly') === 'true';

    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (propertyId) {
      where.propertyId = propertyId;
    }

    if (leaseId) {
      where.leaseId = leaseId;
    }

    if (tag) {
      where.tags = {
        has: tag
      };
    }

    if (favoritesOnly) {
      where.isFavorite = true;
    }

    const documents = await prisma.documentLibrary.findMany({
      where,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(documents);

  } catch (error: any) {
    console.error('GET /api/library error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST /api/library - Upload document
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string | null;
    const description = formData.get('description') as string | null;
    const tags = formData.get('tags') as string | null;
    const propertyId = formData.get('propertyId') as string | null;
    const leaseId = formData.get('leaseId') as string | null;
    const uploadedBy = formData.get('uploadedBy') as string || 'Property Manager';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB for library)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 50MB' },
        { status: 400 }
      );
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'library');
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

    // Parse tags
    const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [];

    // Create database record
    const fileUrl = `/uploads/library/${fileName}`;
    const document = await prisma.documentLibrary.create({
      data: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        fileUrl,
        category: (category as DocumentCategory) || null,
        tags: tagsArray,
        description: description || null,
        uploadedBy,
        propertyId: propertyId || null,
        leaseId: leaseId || null
      },
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
      message: 'Document uploaded successfully',
      document
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/library error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload document' },
      { status: 500 }
    );
  }
}
