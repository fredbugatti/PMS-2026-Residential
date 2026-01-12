-- Add warehouse-specific fields to Property table
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "total_square_feet" INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "leasable_square_feet" INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "total_loading_docks" INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "total_drive_in_doors" INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "clear_height" DECIMAL(5, 1);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "parking_spaces" INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "year_built" INTEGER;

-- Update default property type to WAREHOUSE
ALTER TABLE "properties" ALTER COLUMN "property_type" SET DEFAULT 'WAREHOUSE';

-- Add warehouse space-specific fields to Unit table
ALTER TABLE "units" ADD COLUMN IF NOT EXISTS "loading_docks" INTEGER;
ALTER TABLE "units" ADD COLUMN IF NOT EXISTS "drive_in_doors" INTEGER;
ALTER TABLE "units" ADD COLUMN IF NOT EXISTS "office_square_feet" INTEGER;
ALTER TABLE "units" ADD COLUMN IF NOT EXISTS "clear_height" DECIMAL(5, 1);

-- Add business tenant fields to Lease table
ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "contact_title" VARCHAR(100);
ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "business_type" VARCHAR(50);
ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "billing_address" VARCHAR(500);
ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "leased_square_feet" INTEGER;

-- Add annual escalation fields to Lease table
ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "escalation_enabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "escalation_percent" DECIMAL(5, 2);
ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "escalation_month" INTEGER;
ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "escalation_day" INTEGER;
ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "last_escalation_date" DATE;
