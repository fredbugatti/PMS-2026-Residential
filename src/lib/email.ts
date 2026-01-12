import { prisma } from './accounting';

// Email configuration - uses Resend API
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@yourdomain.com';

interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  templateType: string;
  leaseId?: string;
  metadata?: Record<string, any>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Resend API
 */
export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  const { to, toName, subject, html, templateType, leaseId, metadata } = params;

  // Get notification settings
  const settings = await getNotificationSettings();

  // If no API key, log and return (development mode)
  if (!RESEND_API_KEY) {
    console.log('[EMAIL] No RESEND_API_KEY set - email would be sent:', {
      to,
      subject,
      templateType
    });

    // Still log to database for tracking
    await prisma.emailLog.create({
      data: {
        toEmail: to,
        toName,
        subject,
        templateType,
        status: 'SENT',
        leaseId,
        metadata: metadata || {},
        messageId: `dev-${Date.now()}`
      }
    });

    return { success: true, messageId: `dev-${Date.now()}` };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${settings.fromName} <${FROM_EMAIL}>`,
        to: toName ? `${toName} <${to}>` : to,
        subject,
        html,
        reply_to: settings.replyToEmail || undefined
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email');
    }

    // Log successful email
    await prisma.emailLog.create({
      data: {
        toEmail: to,
        toName,
        subject,
        templateType,
        status: 'SENT',
        leaseId,
        metadata: metadata || {},
        messageId: data.id
      }
    });

    return { success: true, messageId: data.id };

  } catch (error: any) {
    console.error('[EMAIL] Failed to send:', error);

    // Log failed email
    await prisma.emailLog.create({
      data: {
        toEmail: to,
        toName,
        subject,
        templateType,
        status: 'FAILED',
        leaseId,
        metadata: metadata || {},
        errorMessage: error.message
      }
    });

    return { success: false, error: error.message };
  }
}

/**
 * Get notification settings (singleton pattern)
 */
export async function getNotificationSettings() {
  let settings = await prisma.notificationSettings.findFirst();

  if (!settings) {
    // Create default settings
    settings = await prisma.notificationSettings.create({
      data: {
        paymentReceipts: true,
        latePaymentReminders: true,
        daysBeforeLateReminder: 3,
        leaseExpiryWarnings: true,
        leaseExpiryDays: [90, 60, 30],
        workOrderUpdates: true,
        workOrderCreated: true,
        monthlyStatements: false,
        fromName: 'Property Management'
      }
    });
  }

  return settings;
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(data: Partial<{
  paymentReceipts: boolean;
  latePaymentReminders: boolean;
  daysBeforeLateReminder: number;
  leaseExpiryWarnings: boolean;
  leaseExpiryDays: number[];
  workOrderUpdates: boolean;
  workOrderCreated: boolean;
  monthlyStatements: boolean;
  fromName: string;
  replyToEmail: string;
}>) {
  const settings = await getNotificationSettings();

  return prisma.notificationSettings.update({
    where: { id: settings.id },
    data
  });
}

// ==================== EMAIL TEMPLATES ====================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #2563eb; color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 32px 24px; }
    .footer { background: #f9fafb; padding: 24px; text-align: center; font-size: 14px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
    .amount { font-size: 32px; font-weight: bold; color: #059669; }
    .amount.due { color: #dc2626; }
    .info-box { background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .info-row:last-child { border-bottom: none; }
    .label { color: #6b7280; }
    .value { font-weight: 500; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 500; color: #374151; }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      <p>This is an automated message from your property management system.</p>
      <p>Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
`;

// ==================== SPECIFIC TEMPLATES ====================

export const emailTemplates = {
  /**
   * Payment Receipt
   */
  paymentReceipt: (data: {
    tenantName: string;
    amount: number;
    paymentDate: Date | string;
    description: string;
    propertyAddress: string;
    unitName: string;
    newBalance: number;
  }) => ({
    subject: `Payment Receipt - ${formatCurrency(data.amount)}`,
    html: baseTemplate(`
      <div class="header">
        <h1>Payment Received</h1>
      </div>
      <div class="content">
        <p>Dear ${data.tenantName},</p>
        <p>Thank you for your payment. This email confirms we have received:</p>

        <div style="text-align: center; margin: 24px 0;">
          <div class="amount">${formatCurrency(data.amount)}</div>
          <p style="color: #6b7280; margin: 8px 0;">Payment Received</p>
        </div>

        <div class="info-box">
          <div class="info-row">
            <span class="label">Date</span>
            <span class="value">${formatDate(data.paymentDate)}</span>
          </div>
          <div class="info-row">
            <span class="label">Description</span>
            <span class="value">${data.description}</span>
          </div>
          <div class="info-row">
            <span class="label">Property</span>
            <span class="value">${data.propertyAddress}</span>
          </div>
          <div class="info-row">
            <span class="label">Unit</span>
            <span class="value">${data.unitName}</span>
          </div>
          <div class="info-row">
            <span class="label">Remaining Balance</span>
            <span class="value" style="color: ${data.newBalance > 0 ? '#dc2626' : '#059669'}">${formatCurrency(data.newBalance)}</span>
          </div>
        </div>

        <p>Please keep this email for your records.</p>
      </div>
    `)
  }),

  /**
   * Late Payment Reminder (friendly)
   */
  latePaymentReminder: (data: {
    tenantName: string;
    amountDue: number;
    daysLate: number;
    dueDate: Date | string;
    propertyAddress: string;
    unitName: string;
    portalUrl?: string;
  }) => ({
    subject: `Friendly Reminder: Payment Due - ${formatCurrency(data.amountDue)}`,
    html: baseTemplate(`
      <div class="header" style="background: #f59e0b;">
        <h1>Payment Reminder</h1>
      </div>
      <div class="content">
        <p>Dear ${data.tenantName},</p>
        <p>This is a friendly reminder that your rent payment is past due.</p>

        <div style="text-align: center; margin: 24px 0;">
          <div class="amount due">${formatCurrency(data.amountDue)}</div>
          <p style="color: #dc2626; margin: 8px 0;">${data.daysLate} days past due</p>
        </div>

        <div class="info-box">
          <div class="info-row">
            <span class="label">Original Due Date</span>
            <span class="value">${formatDate(data.dueDate)}</span>
          </div>
          <div class="info-row">
            <span class="label">Property</span>
            <span class="value">${data.propertyAddress}</span>
          </div>
          <div class="info-row">
            <span class="label">Unit</span>
            <span class="value">${data.unitName}</span>
          </div>
        </div>

        <p>Please submit your payment as soon as possible to avoid any late fees.</p>

        ${data.portalUrl ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.portalUrl}" class="button">Pay Now</a>
        </div>
        ` : ''}

        <p>If you have already made this payment, please disregard this notice.</p>
        <p>If you are experiencing financial difficulties, please contact us to discuss payment arrangements.</p>
      </div>
    `)
  }),

  /**
   * Late Fee Notice
   */
  lateFeeNotice: (data: {
    tenantName: string;
    lateFeeAmount: number;
    originalAmount: number;
    totalDue: number;
    daysLate: number;
    propertyAddress: string;
    unitName: string;
  }) => ({
    subject: `Late Fee Charged - ${formatCurrency(data.lateFeeAmount)}`,
    html: baseTemplate(`
      <div class="header" style="background: #dc2626;">
        <h1>Late Fee Notice</h1>
      </div>
      <div class="content">
        <p>Dear ${data.tenantName},</p>
        <p>A late fee has been applied to your account as your rent payment is now ${data.daysLate} days past due.</p>

        <div class="info-box">
          <div class="info-row">
            <span class="label">Original Balance</span>
            <span class="value">${formatCurrency(data.originalAmount)}</span>
          </div>
          <div class="info-row">
            <span class="label">Late Fee</span>
            <span class="value" style="color: #dc2626;">+ ${formatCurrency(data.lateFeeAmount)}</span>
          </div>
          <div class="info-row" style="font-weight: bold;">
            <span class="label">Total Due</span>
            <span class="value" style="color: #dc2626;">${formatCurrency(data.totalDue)}</span>
          </div>
        </div>

        <p>Please submit payment immediately to avoid further action.</p>

        <p style="font-size: 14px; color: #6b7280;">
          Property: ${data.propertyAddress}<br>
          Unit: ${data.unitName}
        </p>
      </div>
    `)
  }),

  /**
   * Lease Expiration Warning
   */
  leaseExpiryWarning: (data: {
    tenantName: string;
    expirationDate: Date | string;
    daysRemaining: number;
    propertyAddress: string;
    unitName: string;
    monthlyRent: number;
  }) => ({
    subject: `Lease Expiring in ${data.daysRemaining} Days`,
    html: baseTemplate(`
      <div class="header" style="background: ${data.daysRemaining <= 30 ? '#dc2626' : data.daysRemaining <= 60 ? '#f59e0b' : '#2563eb'};">
        <h1>Lease Expiration Notice</h1>
      </div>
      <div class="content">
        <p>Dear ${data.tenantName},</p>
        <p>This is a reminder that your lease agreement will expire soon.</p>

        <div style="text-align: center; margin: 24px 0;">
          <div style="font-size: 48px; font-weight: bold; color: ${data.daysRemaining <= 30 ? '#dc2626' : '#f59e0b'};">${data.daysRemaining}</div>
          <p style="color: #6b7280; margin: 8px 0;">Days Remaining</p>
        </div>

        <div class="info-box">
          <div class="info-row">
            <span class="label">Lease End Date</span>
            <span class="value">${formatDate(data.expirationDate)}</span>
          </div>
          <div class="info-row">
            <span class="label">Property</span>
            <span class="value">${data.propertyAddress}</span>
          </div>
          <div class="info-row">
            <span class="label">Unit</span>
            <span class="value">${data.unitName}</span>
          </div>
          <div class="info-row">
            <span class="label">Current Rent</span>
            <span class="value">${formatCurrency(data.monthlyRent)}/month</span>
          </div>
        </div>

        <p><strong>What happens next?</strong></p>
        <p>Please contact us to discuss your renewal options. If you plan to move out, please provide written notice as required by your lease agreement.</p>

        <p>We value you as a tenant and hope to continue our relationship.</p>
      </div>
    `)
  }),

  /**
   * Work Order Created Confirmation
   */
  workOrderCreated: (data: {
    tenantName: string;
    workOrderId: string;
    title: string;
    description: string;
    priority: string;
    propertyAddress: string;
    unitName: string;
    createdDate: Date | string;
  }) => ({
    subject: `Work Order Created - ${data.title}`,
    html: baseTemplate(`
      <div class="header">
        <h1>Work Order Confirmation</h1>
      </div>
      <div class="content">
        <p>Dear ${data.tenantName},</p>
        <p>Your maintenance request has been received and logged.</p>

        <div class="info-box">
          <div class="info-row">
            <span class="label">Work Order #</span>
            <span class="value">${data.workOrderId.slice(0, 8).toUpperCase()}</span>
          </div>
          <div class="info-row">
            <span class="label">Issue</span>
            <span class="value">${data.title}</span>
          </div>
          <div class="info-row">
            <span class="label">Priority</span>
            <span class="value" style="color: ${data.priority === 'EMERGENCY' ? '#dc2626' : data.priority === 'HIGH' ? '#f59e0b' : '#059669'};">${data.priority}</span>
          </div>
          <div class="info-row">
            <span class="label">Submitted</span>
            <span class="value">${formatDate(data.createdDate)}</span>
          </div>
        </div>

        <p><strong>Description:</strong></p>
        <p style="background: #f9fafb; padding: 12px; border-radius: 6px;">${data.description}</p>

        <p>We will review your request and contact you to schedule a time for service if needed.</p>

        <p style="font-size: 14px; color: #6b7280;">
          Property: ${data.propertyAddress}<br>
          Unit: ${data.unitName}
        </p>
      </div>
    `)
  }),

  /**
   * Work Order Status Update
   */
  workOrderUpdate: (data: {
    tenantName: string;
    workOrderId: string;
    title: string;
    newStatus: string;
    updateNote?: string;
    scheduledDate?: Date | string;
    completedDate?: Date | string;
  }) => ({
    subject: `Work Order Update - ${data.title}`,
    html: baseTemplate(`
      <div class="header" style="background: ${data.newStatus === 'COMPLETED' ? '#059669' : '#2563eb'};">
        <h1>Work Order ${data.newStatus === 'COMPLETED' ? 'Completed' : 'Update'}</h1>
      </div>
      <div class="content">
        <p>Dear ${data.tenantName},</p>
        <p>There has been an update to your maintenance request.</p>

        <div class="info-box">
          <div class="info-row">
            <span class="label">Work Order #</span>
            <span class="value">${data.workOrderId.slice(0, 8).toUpperCase()}</span>
          </div>
          <div class="info-row">
            <span class="label">Issue</span>
            <span class="value">${data.title}</span>
          </div>
          <div class="info-row">
            <span class="label">Status</span>
            <span class="value" style="color: ${data.newStatus === 'COMPLETED' ? '#059669' : '#2563eb'};">${data.newStatus.replace('_', ' ')}</span>
          </div>
          ${data.scheduledDate ? `
          <div class="info-row">
            <span class="label">Scheduled Date</span>
            <span class="value">${formatDate(data.scheduledDate)}</span>
          </div>
          ` : ''}
          ${data.completedDate ? `
          <div class="info-row">
            <span class="label">Completed Date</span>
            <span class="value">${formatDate(data.completedDate)}</span>
          </div>
          ` : ''}
        </div>

        ${data.updateNote ? `
        <p><strong>Update:</strong></p>
        <p style="background: #f9fafb; padding: 12px; border-radius: 6px;">${data.updateNote}</p>
        ` : ''}

        ${data.newStatus === 'COMPLETED' ? `
        <p>Thank you for your patience. If you have any concerns about the completed work, please contact us.</p>
        ` : ''}
      </div>
    `)
  }),

  /**
   * Deposit Disposition Letter
   */
  depositDisposition: (data: {
    tenantName: string;
    propertyAddress: string;
    unitName: string;
    moveOutDate: Date | string;
    depositHeld: number;
    deductions: Array<{ description: string; amount: number; category: string }>;
    totalDeductions: number;
    amountToReturn: number;
    forwardingAddress?: string;
  }) => ({
    subject: `Security Deposit Disposition - ${data.unitName}`,
    html: baseTemplate(`
      <div class="header">
        <h1>Security Deposit Disposition</h1>
      </div>
      <div class="content">
        <p>Dear ${data.tenantName},</p>
        <p>This letter serves as the itemized statement of your security deposit disposition as required by law.</p>

        <div class="info-box">
          <div class="info-row">
            <span class="label">Property</span>
            <span class="value">${data.propertyAddress}</span>
          </div>
          <div class="info-row">
            <span class="label">Unit</span>
            <span class="value">${data.unitName}</span>
          </div>
          <div class="info-row">
            <span class="label">Move-Out Date</span>
            <span class="value">${formatDate(data.moveOutDate)}</span>
          </div>
        </div>

        <h3 style="margin-top: 24px;">Deposit Summary</h3>
        <table>
          <tr>
            <td><strong>Security Deposit Held</strong></td>
            <td style="text-align: right;">${formatCurrency(data.depositHeld)}</td>
          </tr>
        </table>

        ${data.deductions.length > 0 ? `
        <h3 style="margin-top: 24px;">Itemized Deductions</h3>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Category</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.deductions.map(d => `
            <tr>
              <td>${d.description}</td>
              <td>${d.category}</td>
              <td style="text-align: right; color: #dc2626;">-${formatCurrency(d.amount)}</td>
            </tr>
            `).join('')}
            <tr style="font-weight: bold;">
              <td colspan="2">Total Deductions</td>
              <td style="text-align: right; color: #dc2626;">-${formatCurrency(data.totalDeductions)}</td>
            </tr>
          </tbody>
        </table>
        ` : `
        <p><em>No deductions were made from your security deposit.</em></p>
        `}

        <div style="background: ${data.amountToReturn > 0 ? '#dcfce7' : '#fef2f2'}; padding: 16px; border-radius: 8px; margin-top: 24px; text-align: center;">
          <p style="margin: 0; color: #6b7280;">Amount ${data.amountToReturn >= 0 ? 'to be Returned' : 'Owed'}</p>
          <div style="font-size: 32px; font-weight: bold; color: ${data.amountToReturn >= 0 ? '#059669' : '#dc2626'};">
            ${formatCurrency(Math.abs(data.amountToReturn))}
          </div>
        </div>

        ${data.amountToReturn > 0 ? `
        <p style="margin-top: 24px;">A check for the above amount will be mailed to:</p>
        <div class="info-box">
          ${data.forwardingAddress || 'Forwarding address not provided - please contact us.'}
        </div>
        ` : data.amountToReturn < 0 ? `
        <p style="margin-top: 24px; color: #dc2626;">The deductions exceed the security deposit held. Please contact us to arrange payment of the remaining balance.</p>
        ` : ''}

        <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
          If you have any questions about this disposition, please contact us within 7 days of receiving this notice.
        </p>
      </div>
    `)
  })
};

// ==================== NOTIFICATION TRIGGERS ====================

/**
 * Send payment receipt email
 */
export async function sendPaymentReceipt(leaseId: string, amount: number, description: string) {
  const settings = await getNotificationSettings();
  if (!settings.paymentReceipts) return;

  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    select: {
      tenantName: true,
      tenantEmail: true,
      propertyName: true,
      unitName: true
    }
  });

  if (!lease?.tenantEmail) return;

  // Calculate new balance
  const entries = await prisma.ledgerEntry.findMany({
    where: { leaseId, accountCode: '1200', status: 'POSTED' as const }
  });

  const balance = entries.reduce((sum, e) => {
    const amt = Number(e.amount);
    return e.debitCredit === 'DR' ? sum + amt : sum - amt;
  }, 0);

  const template = emailTemplates.paymentReceipt({
    tenantName: lease.tenantName,
    amount,
    paymentDate: new Date(),
    description,
    propertyAddress: lease.propertyName || 'N/A',
    unitName: lease.unitName,
    newBalance: balance
  });

  return sendEmail({
    to: lease.tenantEmail,
    toName: lease.tenantName,
    subject: template.subject,
    html: template.html,
    templateType: 'payment_receipt',
    leaseId,
    metadata: { amount, balance }
  });
}

/**
 * Send work order created notification
 */
export async function sendWorkOrderCreatedNotification(workOrderId: string) {
  const settings = await getNotificationSettings();
  if (!settings.workOrderCreated) return;

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      lease: {
        select: { tenantName: true, tenantEmail: true }
      },
      property: true,
      unit: true
    }
  });

  if (!workOrder?.lease?.tenantEmail) return;

  const template = emailTemplates.workOrderCreated({
    tenantName: workOrder.lease.tenantName,
    workOrderId: workOrder.id,
    title: workOrder.title,
    description: workOrder.description,
    priority: workOrder.priority,
    propertyAddress: workOrder.property.address || workOrder.property.name,
    unitName: workOrder.unit.unitNumber,
    createdDate: workOrder.createdAt
  });

  return sendEmail({
    to: workOrder.lease.tenantEmail,
    toName: workOrder.lease.tenantName,
    subject: template.subject,
    html: template.html,
    templateType: 'work_order_created',
    leaseId: workOrder.leaseId || undefined,
    metadata: { workOrderId, status: workOrder.status }
  });
}

/**
 * Send work order update notification
 */
export async function sendWorkOrderUpdateNotification(
  workOrderId: string,
  newStatus: string,
  updateNote?: string
) {
  const settings = await getNotificationSettings();
  if (!settings.workOrderUpdates) return;

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      lease: {
        select: { tenantName: true, tenantEmail: true }
      }
    }
  });

  if (!workOrder?.lease?.tenantEmail) return;

  const template = emailTemplates.workOrderUpdate({
    tenantName: workOrder.lease.tenantName,
    workOrderId: workOrder.id,
    title: workOrder.title,
    newStatus,
    updateNote,
    scheduledDate: workOrder.scheduledDate || undefined,
    completedDate: workOrder.completedDate || undefined
  });

  return sendEmail({
    to: workOrder.lease.tenantEmail,
    toName: workOrder.lease.tenantName,
    subject: template.subject,
    html: template.html,
    templateType: 'work_order_update',
    leaseId: workOrder.leaseId || undefined,
    metadata: { workOrderId, newStatus }
  });
}
