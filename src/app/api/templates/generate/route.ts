import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// POST /api/templates/generate - Generate document from template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, leaseId, mergeData } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    if (!leaseId) {
      return NextResponse.json(
        { error: 'Lease ID is required' },
        { status: 400 }
      );
    }

    // Get template
    const template = await prisma.documentTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    if (!template.active) {
      return NextResponse.json(
        { error: 'Template is not active' },
        { status: 400 }
      );
    }

    // Get lease data with rent scheduled charge
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        property: true,
        unit: true,
        scheduledCharges: {
          where: { accountCode: '4000', active: true }
        }
      }
    });

    if (!lease) {
      return NextResponse.json(
        { error: 'Lease not found' },
        { status: 404 }
      );
    }

    // Get rent from scheduled charge
    const rentCharge = lease.scheduledCharges[0];
    const monthlyRent = rentCharge ? Number(rentCharge.amount) : null;

    // Prepare merge data with lease information
    const defaultMergeData: Record<string, string> = {
      tenantName: lease.tenantName || '',
      tenantEmail: lease.tenantEmail || '',
      tenantPhone: lease.tenantPhone || '',
      unitName: lease.unitName || '',
      propertyName: lease.propertyName || lease.property?.name || '',
      propertyAddress: lease.property?.address || '',
      propertyCity: lease.property?.city || '',
      propertyState: lease.property?.state || '',
      propertyZipCode: lease.property?.zipCode || '',
      unitNumber: lease.unit?.unitNumber || '',
      dockDoors: lease.unit?.dockDoors?.toString() || '',
      clearHeight: lease.unit?.clearHeight?.toString() || '',
      monthlyRent: monthlyRent?.toString() || '',
      securityDeposit: lease.securityDepositAmount?.toString() || '',
      startDate: lease.startDate ? new Date(lease.startDate).toLocaleDateString() : '',
      endDate: lease.endDate ? new Date(lease.endDate).toLocaleDateString() : '',
      currentDate: new Date().toLocaleDateString(),
      ...mergeData // Allow override/additional fields
    };

    // Replace merge fields in template content
    let generatedContent = template.templateContent;
    for (const [key, value] of Object.entries(defaultMergeData)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      generatedContent = generatedContent.replace(regex, value);
    }

    return NextResponse.json({
      success: true,
      content: generatedContent,
      template: {
        id: template.id,
        name: template.name,
        category: template.category,
        fileType: template.fileType
      },
      mergeData: defaultMergeData
    });

  } catch (error: any) {
    console.error('POST /api/templates/generate error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate document' },
      { status: 500 }
    );
  }
}
