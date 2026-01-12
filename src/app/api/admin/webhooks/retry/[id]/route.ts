import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

// POST /api/admin/webhooks/retry/[id] - Manually retry a failed webhook
// Note: Protected by middleware (same-origin browser requests allowed)
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const webhookId = params.id;

        // Get the webhook event
        const webhook = await prisma.webhookEvent.findUnique({
            where: { id: webhookId }
        });

        if (!webhook) {
            return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
        }

        if (webhook.status !== 'failed') {
            return NextResponse.json({
                error: 'Can only retry failed webhooks',
                currentStatus: webhook.status
            }, { status: 400 });
        }

        if (!stripe) {
            return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
        }

        // Fetch the original Stripe event
        const stripeEvent = await stripe.events.retrieve(webhook.stripeEventId);

        // Re-process the webhook by calling the same handler logic
        // This requires importing the handler function or duplicating logic
        // For now, we'll mark it for manual review and provide the stripe event data

        return NextResponse.json({
            success: true,
            message: 'Webhook event data retrieved. Manual processing required.',
            webhook: {
                id: webhook.id,
                stripeEventId: webhook.stripeEventId,
                eventType: webhook.eventType,
                failureReason: webhook.errorMessage
            },
            stripeEvent: {
                id: stripeEvent.id,
                type: stripeEvent.type,
                data: stripeEvent.data
            },
            instructions: 'Review the stripe event data and manually post ledger entries if needed.'
        });

    } catch (error: any) {
        console.error('POST /api/admin/webhooks/retry/[id] error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to retry webhook' },
            { status: 500 }
        );
    }
}
