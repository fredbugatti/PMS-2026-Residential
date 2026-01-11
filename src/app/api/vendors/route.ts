import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/vendors - List all vendors
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');

    const vendors = await prisma.vendor.findMany({
      where: {
        ...(active !== null && { active: active === 'true' })
      },
      include: {
        _count: {
          select: {
            workOrders: true
          }
        }
      },
      orderBy: [
        { active: 'desc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(vendors);
  } catch (error: any) {
    console.error('GET /api/vendors error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

// POST /api/vendors - Create new vendor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const vendor = await prisma.vendor.create({
      data: {
        name: body.name,
        company: body.company || null,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        zipCode: body.zipCode || null,
        specialties: body.specialties || [],
        paymentTerms: body.paymentTerms || null,
        taxId: body.taxId || null,
        notes: body.notes || null,
        active: body.active !== undefined ? body.active : true
      }
    });

    return NextResponse.json(vendor, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/vendors error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create vendor' },
      { status: 400 }
    );
  }
}
