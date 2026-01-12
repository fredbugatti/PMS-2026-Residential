-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('LEASE_AGREEMENT', 'LEASE_AMENDMENT', 'NOTICE_TO_VACATE', 'RENT_INCREASE_NOTICE', 'LEASE_RENEWAL', 'MOVE_IN_CHECKLIST', 'MOVE_OUT_CHECKLIST', 'RECEIPT', 'INVOICE', 'VIOLATION_NOTICE', 'LATE_RENT_NOTICE', 'THREE_DAY_NOTICE', 'EVICTION_NOTICE', 'MAINTENANCE_AUTHORIZATION', 'PET_ADDENDUM', 'PARKING_AGREEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY');

-- CreateEnum
CREATE TYPE "DebitCredit" AS ENUM ('DR', 'CR');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('POSTED', 'VOID');

-- CreateEnum
CREATE TYPE "WorkOrderCategory" AS ENUM ('PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE', 'GENERAL', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkOrderPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaidBy" AS ENUM ('OWNER', 'TENANT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'PENDING');

-- CreateEnum
CREATE TYPE "PaymentTerms" AS ENUM ('DUE_ON_RECEIPT', 'NET_15', 'NET_30', 'NET_60');

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
    "lease_id" TEXT,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(200) NOT NULL,
    "address" VARCHAR(300),
    "city" VARCHAR(100),
    "state" VARCHAR(50),
    "zip_code" VARCHAR(20),
    "total_units" INTEGER,
    "property_type" VARCHAR(20) NOT NULL DEFAULT 'RESIDENTIAL',
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "property_id" TEXT NOT NULL,
    "unit_number" VARCHAR(50) NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" DECIMAL(3,1),
    "square_feet" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'VACANT',
    "notes" TEXT,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leases" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "property_id" TEXT,
    "unit_id" TEXT,
    "tenant_name" VARCHAR(200) NOT NULL,
    "company_name" VARCHAR(200),
    "tenant_email" VARCHAR(200),
    "tenant_phone" VARCHAR(50),
    "unit_name" VARCHAR(100) NOT NULL,
    "property_name" VARCHAR(200),
    "start_date" DATE,
    "end_date" DATE,
    "security_deposit_amount" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "auto_charge_enabled" BOOLEAN NOT NULL DEFAULT false,
    "charge_day" INTEGER,
    "grace_period_days" INTEGER DEFAULT 5,
    "late_fee_amount" DECIMAL(12,2),
    "late_fee_type" VARCHAR(20),
    "reminder_emails" BOOLEAN NOT NULL DEFAULT false,
    "last_charged_date" DATE,
    "portal_token" VARCHAR(64),
    "portal_token_expires_at" TIMESTAMP(3),
    "portal_last_access" TIMESTAMP(3),
    "autopay_enabled" BOOLEAN NOT NULL DEFAULT false,
    "autopay_day" INTEGER,
    "autopay_method" VARCHAR(20),
    "autopay_last4" VARCHAR(4),
    "autopay_setup_date" TIMESTAMP(3),
    "autopay_bank_name" VARCHAR(100),
    "stripe_customer_id" VARCHAR(100),
    "stripe_payment_method_id" VARCHAR(100),
    "stripe_last_payment_date" TIMESTAMP(3),
    "stripe_last_payment_status" VARCHAR(50),

    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_charges" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_id" TEXT NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "charge_day" INTEGER NOT NULL,
    "account_code" VARCHAR(10) NOT NULL DEFAULT '4000',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_charged_date" DATE,

    CONSTRAINT "scheduled_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rent_increases" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_id" TEXT NOT NULL,
    "previous_amount" DECIMAL(12,2) NOT NULL,
    "new_amount" DECIMAL(12,2) NOT NULL,
    "effective_date" DATE NOT NULL,
    "notice_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notice_generated" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "applied_at" TIMESTAMP(3),
    "applied_by" VARCHAR(100),

    CONSTRAINT "rent_increases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_id" TEXT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "uploaded_by" VARCHAR(100) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "category" "DocumentCategory" NOT NULL,
    "template_content" TEXT NOT NULL,
    "merge_fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "file_type" VARCHAR(20) NOT NULL DEFAULT 'pdf',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_by" VARCHAR(100) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_library" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "category" "DocumentCategory",
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "uploaded_by" VARCHAR(100) NOT NULL,
    "property_id" TEXT,
    "lease_id" TEXT,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "document_library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "property_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "lease_id" TEXT,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "WorkOrderCategory" NOT NULL,
    "priority" "WorkOrderPriority" NOT NULL,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'OPEN',
    "reported_by" VARCHAR(200) NOT NULL,
    "reported_email" VARCHAR(200),
    "assigned_to" VARCHAR(200),
    "vendor_id" TEXT,
    "estimated_cost" DECIMAL(12,2),
    "actual_cost" DECIMAL(12,2),
    "paid_by" "PaidBy",
    "invoice_number" VARCHAR(100),
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "scheduled_date" DATE,
    "completed_date" DATE,
    "paid_date" DATE,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "internal_notes" TEXT,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_updates" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "work_order_id" TEXT NOT NULL,
    "status" "WorkOrderStatus" NOT NULL,
    "note" TEXT NOT NULL,
    "updated_by" VARCHAR(200) NOT NULL,

    CONSTRAINT "work_order_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "company" VARCHAR(200),
    "email" VARCHAR(200),
    "phone" VARCHAR(50),
    "address" VARCHAR(300),
    "city" VARCHAR(100),
    "state" VARCHAR(50),
    "zip_code" VARCHAR(20),
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "payment_terms" "PaymentTerms",
    "tax_id" VARCHAR(50),
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_expenses" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "property_id" TEXT NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "charge_day" INTEGER NOT NULL,
    "account_code" VARCHAR(10) NOT NULL DEFAULT '5000',
    "vendor_id" TEXT,
    "requires_confirmation" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_posted_date" DATE,
    "notes" TEXT,

    CONSTRAINT "scheduled_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_expenses" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_expense_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "account_code" VARCHAR(10) NOT NULL,
    "vendor_id" TEXT,
    "due_date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by" VARCHAR(100),
    "notes" TEXT,

    CONSTRAINT "pending_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cron_logs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "job_name" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "charges_posted" INTEGER NOT NULL DEFAULT 0,
    "charges_skipped" INTEGER NOT NULL DEFAULT 0,
    "charges_errored" INTEGER NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2),
    "duration" INTEGER,
    "error_message" TEXT,
    "details" JSONB,

    CONSTRAINT "cron_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stripe_event_id" VARCHAR(100) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "lease_id" TEXT,
    "payment_intent_id" VARCHAR(100),
    "amount" DECIMAL(12,2),
    "status" VARCHAR(50) NOT NULL,
    "error_message" TEXT,
    "raw_event" JSONB,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" VARCHAR(50) NOT NULL,
    "user_id" VARCHAR(100),
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(12,2),
    "lease_id" VARCHAR(100),
    "description" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_idempotency_key_key" ON "ledger_entries"("idempotency_key");

-- CreateIndex
CREATE INDEX "ledger_entries_account_code_entry_date_idx" ON "ledger_entries"("account_code", "entry_date");

-- CreateIndex
CREATE INDEX "ledger_entries_idempotency_key_idx" ON "ledger_entries"("idempotency_key");

-- CreateIndex
CREATE INDEX "ledger_entries_lease_id_idx" ON "ledger_entries"("lease_id");

-- CreateIndex
CREATE INDEX "units_property_id_idx" ON "units"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "units_property_id_unit_number_key" ON "units"("property_id", "unit_number");

-- CreateIndex
CREATE UNIQUE INDEX "leases_portal_token_key" ON "leases"("portal_token");

-- CreateIndex
CREATE UNIQUE INDEX "leases_stripe_customer_id_key" ON "leases"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "leases_property_id_idx" ON "leases"("property_id");

-- CreateIndex
CREATE INDEX "leases_unit_id_idx" ON "leases"("unit_id");

-- CreateIndex
CREATE INDEX "leases_status_idx" ON "leases"("status");

-- CreateIndex
CREATE INDEX "leases_autopay_enabled_autopay_day_idx" ON "leases"("autopay_enabled", "autopay_day");

-- CreateIndex
CREATE INDEX "leases_tenant_email_idx" ON "leases"("tenant_email");

-- CreateIndex
CREATE INDEX "scheduled_charges_lease_id_idx" ON "scheduled_charges"("lease_id");

-- CreateIndex
CREATE INDEX "scheduled_charges_charge_day_active_idx" ON "scheduled_charges"("charge_day", "active");

-- CreateIndex
CREATE INDEX "rent_increases_lease_id_idx" ON "rent_increases"("lease_id");

-- CreateIndex
CREATE INDEX "rent_increases_effective_date_status_idx" ON "rent_increases"("effective_date", "status");

-- CreateIndex
CREATE INDEX "documents_lease_id_idx" ON "documents"("lease_id");

-- CreateIndex
CREATE INDEX "documents_category_idx" ON "documents"("category");

-- CreateIndex
CREATE INDEX "document_templates_category_active_idx" ON "document_templates"("category", "active");

-- CreateIndex
CREATE INDEX "document_library_category_idx" ON "document_library"("category");

-- CreateIndex
CREATE INDEX "document_library_property_id_idx" ON "document_library"("property_id");

-- CreateIndex
CREATE INDEX "document_library_lease_id_idx" ON "document_library"("lease_id");

-- CreateIndex
CREATE INDEX "document_library_uploaded_by_idx" ON "document_library"("uploaded_by");

-- CreateIndex
CREATE INDEX "work_orders_property_id_idx" ON "work_orders"("property_id");

-- CreateIndex
CREATE INDEX "work_orders_unit_id_idx" ON "work_orders"("unit_id");

-- CreateIndex
CREATE INDEX "work_orders_lease_id_idx" ON "work_orders"("lease_id");

-- CreateIndex
CREATE INDEX "work_orders_vendor_id_idx" ON "work_orders"("vendor_id");

-- CreateIndex
CREATE INDEX "work_orders_status_priority_idx" ON "work_orders"("status", "priority");

-- CreateIndex
CREATE INDEX "work_orders_payment_status_idx" ON "work_orders"("payment_status");

-- CreateIndex
CREATE INDEX "work_orders_created_at_idx" ON "work_orders"("created_at");

-- CreateIndex
CREATE INDEX "work_order_updates_work_order_id_idx" ON "work_order_updates"("work_order_id");

-- CreateIndex
CREATE INDEX "vendors_name_idx" ON "vendors"("name");

-- CreateIndex
CREATE INDEX "scheduled_expenses_property_id_idx" ON "scheduled_expenses"("property_id");

-- CreateIndex
CREATE INDEX "scheduled_expenses_vendor_id_idx" ON "scheduled_expenses"("vendor_id");

-- CreateIndex
CREATE INDEX "scheduled_expenses_charge_day_active_idx" ON "scheduled_expenses"("charge_day", "active");

-- CreateIndex
CREATE INDEX "pending_expenses_scheduled_expense_id_idx" ON "pending_expenses"("scheduled_expense_id");

-- CreateIndex
CREATE INDEX "pending_expenses_property_id_idx" ON "pending_expenses"("property_id");

-- CreateIndex
CREATE INDEX "pending_expenses_status_idx" ON "pending_expenses"("status");

-- CreateIndex
CREATE INDEX "pending_expenses_due_date_idx" ON "pending_expenses"("due_date");

-- CreateIndex
CREATE INDEX "cron_logs_job_name_created_at_idx" ON "cron_logs"("job_name", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_stripe_event_id_key" ON "webhook_events"("stripe_event_id");

-- CreateIndex
CREATE INDEX "webhook_events_stripe_event_id_idx" ON "webhook_events"("stripe_event_id");

-- CreateIndex
CREATE INDEX "webhook_events_event_type_created_at_idx" ON "webhook_events"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "webhook_events_lease_id_idx" ON "webhook_events"("lease_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_source_idx" ON "audit_logs"("source");

-- CreateIndex
CREATE INDEX "audit_logs_lease_id_idx" ON "audit_logs"("lease_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_code_fkey" FOREIGN KEY ("account_code") REFERENCES "chart_of_accounts"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "scheduled_charges" ADD CONSTRAINT "scheduled_charges_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_increases" ADD CONSTRAINT "rent_increases_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_library" ADD CONSTRAINT "document_library_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_library" ADD CONSTRAINT "document_library_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_order_updates" ADD CONSTRAINT "work_order_updates_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_expenses" ADD CONSTRAINT "scheduled_expenses_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_expenses" ADD CONSTRAINT "scheduled_expenses_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pending_expenses" ADD CONSTRAINT "pending_expenses_scheduled_expense_id_fkey" FOREIGN KEY ("scheduled_expense_id") REFERENCES "scheduled_expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_expenses" ADD CONSTRAINT "pending_expenses_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_expenses" ADD CONSTRAINT "pending_expenses_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

