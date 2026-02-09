import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * One-time migration endpoint to apply Payment and InvoiceSequence tables
 *
 * This endpoint applies the 0002_add_payment_tracking migration directly
 * to the production database.
 *
 * Usage: POST /api/admin/migrate
 * Security: Should be protected or removed after use
 */
export async function POST(request: Request) {
  try {
    console.log('Starting migration...');

    // Check if tables already exist
    const invoiceSeqExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'invoice_sequence'
      );
    `;

    const paymentsExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'payments'
      );
    `;

    // @ts-ignore
    if (invoiceSeqExists[0]?.exists && paymentsExists[0]?.exists) {
      return NextResponse.json({
        success: true,
        message: 'Tables already exist. Migration not needed.',
        alreadyApplied: true
      });
    }

    // Apply migration SQL
    console.log('Creating invoice_sequence table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "invoice_sequence" (
        "id" TEXT NOT NULL DEFAULT 'singleton',
        "last_number" INTEGER NOT NULL DEFAULT 5526,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "invoice_sequence_pkey" PRIMARY KEY ("id")
      );
    `;

    console.log('Creating payments table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "payment_date" DATE NOT NULL,
        "amount" DECIMAL(12,2) NOT NULL,
        "payment_method" TEXT NOT NULL,
        "reference_number" VARCHAR(100),
        "lease_id" TEXT NOT NULL,
        "invoice_id" TEXT,
        "ledger_entry_id" TEXT,
        "account_code" VARCHAR(10) NOT NULL DEFAULT '1000',
        "notes" TEXT,
        "recorded_by" VARCHAR(100) NOT NULL,
        CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
      );
    `;

    console.log('Creating indexes...');
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "payments_ledger_entry_id_key"
      ON "payments"("ledger_entry_id");
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "payments_lease_id_idx"
      ON "payments"("lease_id");
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "payments_invoice_id_idx"
      ON "payments"("invoice_id");
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "payments_payment_date_idx"
      ON "payments"("payment_date");
    `;

    console.log('Adding foreign keys...');
    await prisma.$executeRaw`
      ALTER TABLE "payments"
      ADD CONSTRAINT "payments_lease_id_fkey"
      FOREIGN KEY ("lease_id") REFERENCES "leases"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
    `;
    await prisma.$executeRaw`
      ALTER TABLE "payments"
      ADD CONSTRAINT "payments_invoice_id_fkey"
      FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
    `;

    console.log('Migration completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Migration applied successfully! Tables created: invoice_sequence, payments',
      tablesCreated: ['invoice_sequence', 'payments']
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        hint: 'Tables may already exist, or there may be a database connection issue'
      },
      { status: 500 }
    );
  }
}

// Check migration status
export async function GET() {
  try {
    const invoiceSeqExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'invoice_sequence'
      );
    `;

    const paymentsExists = await prisma.$queryRaw`
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'payments'
      );
    `;

    // @ts-ignore
    const migrationApplied = invoiceSeqExists[0]?.exists && paymentsExists[0]?.exists;

    return NextResponse.json({
      success: true,
      migrationApplied,
      tables: {
        // @ts-ignore
        invoice_sequence: invoiceSeqExists[0]?.exists || false,
        // @ts-ignore
        payments: paymentsExists[0]?.exists || false
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
