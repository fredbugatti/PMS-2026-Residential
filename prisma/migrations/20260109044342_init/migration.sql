-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY');

-- CreateEnum
CREATE TYPE "DebitCredit" AS ENUM ('DR', 'CR');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('POSTED', 'VOID');

-- CreateTable
CREATE TABLE "chart_of_accounts" (
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "AccountType" NOT NULL,
    "normal_balance" "DebitCredit" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entry_date" DATE NOT NULL,
    "account_code" VARCHAR(10) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "debit_credit" "DebitCredit" NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "idempotency_key" VARCHAR(100) NOT NULL,
    "posted_by" VARCHAR(100) NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'POSTED',
    "void_of_entry_id" UUID,
    "lease_id" UUID,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leases" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_name" VARCHAR(200) NOT NULL,
    "unit_name" VARCHAR(100) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_idempotency_key_key" ON "ledger_entries"("idempotency_key");

-- CreateIndex
CREATE INDEX "ledger_entries_account_code_entry_date_idx" ON "ledger_entries"("account_code", "entry_date");

-- CreateIndex
CREATE INDEX "ledger_entries_idempotency_key_idx" ON "ledger_entries"("idempotency_key");

-- CreateIndex
CREATE INDEX "ledger_entries_lease_id_idx" ON "ledger_entries"("lease_id");

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_code_fkey" FOREIGN KEY ("account_code") REFERENCES "chart_of_accounts"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
