-- Add data integrity constraints for financial safety
-- Migration: 0002_add_data_integrity_constraints

-- Ensure scheduled charge day is within valid range (1-28)
-- Day 29-31 can cause issues in February and short months
ALTER TABLE "ScheduledCharge"
ADD CONSTRAINT "scheduled_charge_day_range"
CHECK ("chargeDay" >= 1 AND "chargeDay" <= 28);

-- Ensure scheduled expense day is within valid range (1-28)
ALTER TABLE "ScheduledExpense"
ADD CONSTRAINT "scheduled_expense_day_range"
CHECK ("chargeDay" >= 1 AND "chargeDay" <= 28);

-- Ensure autopay day is within valid range when autopay is enabled
ALTER TABLE "Lease"
ADD CONSTRAINT "autopay_day_range"
CHECK ("autopayDay" IS NULL OR ("autopayDay" >= 1 AND "autopayDay" <= 28));

-- Ensure lease dates are in correct order (end date after start date)
ALTER TABLE "Lease"
ADD CONSTRAINT "lease_dates_order"
CHECK ("startDate" IS NULL OR "endDate" IS NULL OR "endDate" > "startDate");

-- Ensure ledger entry amounts are positive
ALTER TABLE "LedgerEntry"
ADD CONSTRAINT "ledger_entry_positive_amount"
CHECK ("amount" > 0);

-- Ensure scheduled charge amounts are positive
ALTER TABLE "ScheduledCharge"
ADD CONSTRAINT "scheduled_charge_positive_amount"
CHECK ("amount" > 0);

-- Ensure scheduled expense amounts are positive
ALTER TABLE "ScheduledExpense"
ADD CONSTRAINT "scheduled_expense_positive_amount"
CHECK ("amount" > 0);

-- Ensure work order actual cost is positive when set
ALTER TABLE "WorkOrder"
ADD CONSTRAINT "work_order_positive_cost"
CHECK ("actualCost" IS NULL OR "actualCost" > 0);

-- Ensure rent increase amounts are positive
ALTER TABLE "RentIncrease"
ADD CONSTRAINT "rent_increase_positive_amounts"
CHECK ("previousAmount" > 0 AND "newAmount" > 0);

-- Create index for faster ledger queries by lease and date
CREATE INDEX IF NOT EXISTS "idx_ledger_entries_lease_date"
ON "LedgerEntry"("leaseId", "entryDate");

-- Create index for pending expenses by property and status
CREATE INDEX IF NOT EXISTS "idx_pending_expenses_property_status"
ON "PendingExpense"("propertyId", "status");
