import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';
import crypto from 'crypto';

// POST /api/leases/[id]/portal - Generate or regenerate portal token
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // Token expires in 90 days by default
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    // Update the lease with the new portal token and expiration
    const lease = await prisma.lease.update({
      where: { id },
      data: {
        portalToken: token,
        portalTokenExpiresAt: expiresAt
      },
      include: {
        property: true,
        unit: true
      }
    });

    const portalUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/tenant/${token}`;

    return NextResponse.json({
      success: true,
      token,
      portalUrl,
      expiresAt,
      lease: {
        id: lease.id,
        tenantName: lease.tenantName,
        tenantEmail: lease.tenantEmail
      }
    });

  } catch (error: any) {
    console.error('POST /api/leases/[id]/portal error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate portal token' },
      { status: 500 }
    );
  }
}

// DELETE /api/leases/[id]/portal - Revoke portal access
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.lease.update({
      where: { id },
      data: {
        portalToken: null,
        portalTokenExpiresAt: null,
        portalLastAccess: null
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Portal access revoked'
    });

  } catch (error: any) {
    console.error('DELETE /api/leases/[id]/portal error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to revoke portal access' },
      { status: 500 }
    );
  }
}
