-- CreateTable
CREATE TABLE "invoice_sequence" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "last_number" INTEGER NOT NULL DEFAULT 5526,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "reference_number" VARCHAR(100),
    "lease_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "ledger_entry_id" TEXT,
    "account_code" VARCHAR(10) NOT NULL DEFAULT '1000',
    "notes" TEXT,
    "recorded_by" VARCHAR(100) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_ledger_entry_id_key" ON "payments"("ledger_entry_id");

-- CreateIndex
CREATE INDEX "payments_lease_id_idx" ON "payments"("lease_id");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
