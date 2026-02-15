// Audit Logging Library
// Non-blocking audit trail for all financial operations

import { prisma } from './accounting';

export interface LogAuditParams {
    source: string;              // 'cron', 'webhook', 'tenant_portal', 'admin', 'api'
    action: string;              // 'charge_posted', 'payment_received', 'entry_voided', etc.
    entityType: string;          // 'ledger_entry', 'lease', 'payment'
    entityId: string;
    amount?: number;
    leaseId?: string;
    description: string;
    request?: Request;           // For extracting IP, user agent
    metadata?: any;              // Before/after state, extra context
}

/**
 * Log an audit entry for financial operations
 * 
 * IMPORTANT: This is NON-BLOCKING. If audit log fails, the operation continues.
 * Audit logs are supplementary, not required for accounting correctness.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
    try {
        const {
            source,
            action,
            entityType,
            entityId,
            amount,
            leaseId,
            description,
            request,
            metadata
        } = params;

        // Extract IP and user agent from request if provided
        let ipAddress: string | null = null;
        let userAgent: string | null = null;

        if (request) {
            // Get IP from various headers (Vercel, Cloudflare, etc.)
            ipAddress =
                request.headers.get('x-forwarded-for')?.split(',')[0] ||
                request.headers.get('x-real-ip') ||
                null;

            userAgent = request.headers.get('user-agent');
        }

        await prisma.auditLog.create({
            data: {
                source,
                action,
                entityType,
                entityId,
                amount: amount ? amount : null,
                leaseId: leaseId || null,
                description,
                ipAddress,
                userAgent,
                metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null
            }
        });
    } catch (err: any) {
        // CRITICAL: Never throw - audit log failures must not block operations
        console.error(`[Audit] Failed to log (non-blocking): ${err.message}`);
    }
}

/**
 * Log multiple audit entries atomically (best effort)
 */
export async function logAuditBatch(entries: LogAuditParams[]): Promise<void> {
    try {
        await prisma.$transaction(
            entries.map(params => {
                const { source, action, entityType, entityId, amount, leaseId, description, metadata } = params;
                return prisma.auditLog.create({
                    data: {
                        source,
                        action,
                        entityType,
                        entityId,
                        amount: amount || null,
                        leaseId: leaseId || null,
                        description,
                        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null
                    }
                });
            })
        );
    } catch (err: any) {
        console.error(`[Audit] Failed to log batch (non-blocking): ${err.message}`);
    }
}
