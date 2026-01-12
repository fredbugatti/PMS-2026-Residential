import { NextRequest, NextResponse } from 'next/server';
import { prisma, postDoubleEntry } from '@/lib/accounting';
import { sendEmail, emailTemplates } from '@/lib/email';

export const dynamic = 'force-dynamic';

// POST /api/move-out/[leaseId]/complete - Complete move-out and process deposit return
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const { leaseId } = await params;
    const body = await request.json();

    // Get the inspection with all details
    const inspection = await prisma.moveOutInspection.findUnique({
      where: { leaseId },
      include: {
        deductions: true,
        lease: {
          select: {
            tenantName: true,
            tenantEmail: true,
            propertyName: true,
            unitName: true,
            endDate: true
          }
        }
      }
    });

    if (!inspection) {
      return NextResponse.json(
        { error: 'Move-out inspection not found' },
        { status: 404 }
      );
    }

    if (inspection.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Move-out inspection already completed' },
        { status: 400 }
      );
    }

    const depositHeld = Number(inspection.depositHeld);
    const totalDeductions = Number(inspection.totalDeductions);
    const amountToReturn = Number(inspection.amountToReturn);
    const today = new Date();

    // Post ledger entries for the deposit disposition
    const ledgerEntries: string[] = [];

    // If there are deductions, record them as income
    if (totalDeductions > 0) {
      // Group deductions by category for cleaner ledger entries
      const deductionsByCategory: { [key: string]: number } = {};
      for (const d of inspection.deductions) {
        const cat = d.category;
        deductionsByCategory[cat] = (deductionsByCategory[cat] || 0) + Number(d.amount);
      }

      for (const [category, amount] of Object.entries(deductionsByCategory)) {
        const description = `Security Deposit Deduction - ${category.replace('_', ' ')}`;

        // DR: Security Deposit Liability (2100) - reduce what we owe
        // CR: Other Income (4900) - record deduction as income
        try {
          const result = await postDoubleEntry({
            debitEntry: {
              accountCode: '2100',
              amount,
              debitCredit: 'DR',
              description,
              entryDate: today,
              leaseId,
              postedBy: 'system'
            },
            creditEntry: {
              accountCode: '4900',
              amount,
              debitCredit: 'CR',
              description,
              entryDate: today,
              leaseId,
              postedBy: 'system'
            }
          });
          ledgerEntries.push(result.debit.id);
          ledgerEntries.push(result.credit.id);
        } catch (e: any) {
          // Idempotency - entry may already exist, continue
          console.log('Deduction entry may already exist:', e.message);
        }
      }
    }

    // If returning money, record the return
    if (amountToReturn > 0) {
      const returnDescription = `Security Deposit Return - ${inspection.lease.tenantName}`;

      // DR: Security Deposit Liability (2100) - reduce what we owe
      // CR: Cash/Bank (1000) - money leaving
      try {
        const result = await postDoubleEntry({
          debitEntry: {
            accountCode: '2100',
            amount: amountToReturn,
            debitCredit: 'DR',
            description: returnDescription,
            entryDate: today,
            leaseId,
            postedBy: 'system'
          },
          creditEntry: {
            accountCode: '1000',
            amount: amountToReturn,
            debitCredit: 'CR',
            description: returnDescription,
            entryDate: today,
            leaseId,
            postedBy: 'system'
          }
        });
        ledgerEntries.push(result.debit.id);
        ledgerEntries.push(result.credit.id);
      } catch (e: any) {
        // Idempotency - entry may already exist
        console.log('Return entry may already exist:', e.message);
      }
    }

    // Update inspection status
    await prisma.moveOutInspection.update({
      where: { leaseId },
      data: {
        status: 'COMPLETED',
        completedAt: today,
        letterGeneratedAt: today
      }
    });

    // Update lease status to ENDED if not already
    await prisma.lease.update({
      where: { id: leaseId },
      data: { status: 'ENDED' }
    });

    // Send disposition email if tenant has email and sendEmail is true
    let emailSent = false;
    if (body.sendEmail !== false && inspection.lease.tenantEmail) {
      const template = emailTemplates.depositDisposition({
        tenantName: inspection.lease.tenantName,
        propertyAddress: inspection.lease.propertyName || 'N/A',
        unitName: inspection.lease.unitName,
        moveOutDate: inspection.lease.endDate || inspection.inspectionDate,
        depositHeld,
        deductions: inspection.deductions.map(d => ({
          description: d.description,
          amount: Number(d.amount),
          category: d.category.replace('_', ' ')
        })),
        totalDeductions,
        amountToReturn,
        forwardingAddress: inspection.forwardingAddress || undefined
      });

      const result = await sendEmail({
        to: inspection.lease.tenantEmail,
        toName: inspection.lease.tenantName,
        subject: template.subject,
        html: template.html,
        templateType: 'deposit_disposition',
        leaseId,
        metadata: {
          depositHeld,
          totalDeductions,
          amountToReturn
        }
      });

      emailSent = result.success;

      if (result.success) {
        await prisma.moveOutInspection.update({
          where: { leaseId },
          data: {
            letterSentAt: today,
            letterSentMethod: 'EMAIL'
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      depositHeld,
      totalDeductions,
      amountToReturn,
      ledgerEntries,
      emailSent,
      message: amountToReturn > 0
        ? `Deposit return of $${amountToReturn.toFixed(2)} has been processed`
        : totalDeductions > depositHeld
        ? `Tenant owes $${Math.abs(amountToReturn).toFixed(2)} after deductions`
        : 'Security deposit fully applied to deductions'
    });

  } catch (error: any) {
    console.error('POST /api/move-out/[leaseId]/complete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete move-out' },
      { status: 500 }
    );
  }
}
