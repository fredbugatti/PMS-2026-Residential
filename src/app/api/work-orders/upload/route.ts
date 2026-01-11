import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// POST /api/work-orders/upload - Upload photos for work orders
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Create upload directory for work order photos
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'work-orders');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      // Validate file type (images only)
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.name}. Only images are allowed.` },
          { status: 400 }
        );
      }

      // Validate file size (max 5MB per image)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File ${file.name} is too large. Max size is 5MB.` },
          { status: 400 }
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const extension = file.name.split('.').pop() || 'jpg';
      const fileName = `${timestamp}-${randomId}.${extension}`;
      const filePath = path.join(uploadDir, fileName);

      // Convert file to buffer and save
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Store the public URL
      uploadedUrls.push(`/uploads/work-orders/${fileName}`);
    }

    return NextResponse.json({
      success: true,
      message: `${uploadedUrls.length} photo(s) uploaded successfully`,
      urls: uploadedUrls
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/work-orders/upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload photos' },
      { status: 500 }
    );
  }
}
