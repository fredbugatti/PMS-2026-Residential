Industrial Property Management System — Foundation Architecture
Summary
I understand. You're building a financial-first, ledger-driven property management system for industrial/warehouse properties. The general ledger is the single source of truth. All balances are derived, never stored. Immutability, idempotency, and audit-readiness are non-negotiable. UI and workflows are thin layers that feed the accounting engine—they never compute or store money.
I will deliver a complete architectural foundation covering tech stack, ledger design, posting rules, automation safety, core workflows, compliance strategy, and a phased build plan.

1. Recommended Tech Stack
Backend Framework
Choice: Node.js + TypeScript (NestJS or tRPC+Express)
Why:
* Type safety: TypeScript prevents entire classes of runtime errors in financial logic
* Transaction control: Excellent PostgreSQL client libraries with explicit transaction boundaries
* Idempotency: Easy to implement request deduplication with middleware
* Widespread talent: Reduces bus factor risk
* Async-first: Natural fit for job queues and event-driven patterns
Financial safety guarantees:
* Compile-time enforcement of ledger entry schemas
* Strong typing prevents accidentally passing wrong account IDs or amounts
* Explicit async/await makes transaction rollback logic clear

Database
Choice: PostgreSQL 15+
Why:
* ACID guarantees: Strong consistency, serializable isolation available
* Immutable append pattern: Perfect for ledger (INSERT-only table)
* Constraints: Foreign keys, check constraints, unique indexes enforce invariants at DB level
* Audit trails: created_at timestamps, trigger-based audit logs
* JSON support: Store structured metadata without schema drift
* Mature: 25+ years of production reliability
Financial safety guarantees:
* CHECK constraints prevent negative amounts in wrong accounts
* UNIQUE constraints enforce idempotency keys
* Row-level locks prevent double-posting
* Point-in-time recovery for disaster scenarios
* No eventual consistency—reads always see committed state
Rejected alternatives:
* MongoDB: No multi-document ACID until recently; weak schema enforcement
* MySQL: Weaker constraint enforcement, fewer safety features
* Supabase/Firebase: Good later for UI, but core ledger needs bare-metal Postgres control

ORM / Data Access
Choice: Prisma (with raw SQL escape hatch)
Why:
* Type-safe queries: Generated types match DB schema exactly
* Migration safety: Declarative schema with migration preview
* Transaction API: Explicit $transaction() blocks
* Raw SQL option: Can drop to SQL for complex ledger queries without losing type safety
Financial safety guarantees:
* Schema drift impossible—TypeScript types regenerated from DB
* Transactions are explicit, not hidden
* No "magic" updates—every mutation is visible in code
Pattern:

await prisma.$transaction(async (tx) => {
  const entry = await tx.ledgerEntry.create({...});
  await tx.lease.update({...}); // Coordinated state change
});
Constraint:
* NEVER use Prisma's update() on ledger entries
* Ledger table is INSERT-only; enforce with DB trigger if needed

Job Scheduling / Queues
Choice: BullMQ (Redis-backed) + pg-boss (Postgres-backed) hybrid
Primary: BullMQ for recurring jobs
* Battle-tested
* Cron-like scheduling
* Retry logic with exponential backoff
* Job deduplication via jobId
Secondary: pg-boss for critical financial workflows
* Jobs stored in Postgres (same ACID guarantees as ledger)
* Survives Redis failure
* Atomic job creation within ledger transaction
Why hybrid:
* BullMQ: Fast, handles high-volume daily rent posting
* pg-boss: Safety—move-in/move-out workflows live in same DB as money
Financial safety guarantees:
* Idempotency key = ${leaseId}:${yyyymmdd}:${jobType}
* Job record inserted BEFORE ledger entry (if job exists, skip)
* Dead-letter queue for manual review
* Job log is append-only audit trail
Rejected:
* Celery (Python): Adds language complexity
* AWS Lambda + EventBridge: Vendor lock-in, harder to test locally
* Cron: No retry logic, no deduplication, no observability

Payments Integration
Choice: Stripe (treasury/payments) with ledger-first reconciliation
Why:
* Industry standard
* Webhook reliability
* Idempotency built-in (Idempotency-Key header)
* Strong API guarantees
Financial safety pattern:
1. User clicks "Pay Rent"
2. System creates PaymentIntent with idempotency key = {leaseId}:{invoiceId}
3. On success webhook, system posts ledger entry (debit Cash, credit AR)
4. Webhook includes Stripe transaction ID → stored as ledger entry metadata
5. Reconciliation job matches Stripe settlements to ledger
Critical rule:
* Payment success does NOT directly trigger ledger entry
* Webhook handler calls createLedgerEntry() with idempotency key
* If webhook replays, ledger insert fails on unique constraint → safe
Rejected:
* Square, PayPal: Weaker developer experience
* ACH directly: Too much compliance overhead for v1
* Manual checks: Handled as cash entry with scanned image metadata

Auth Strategy
Choice: Clerk or Auth0 (managed) + row-level security
Why:
* Managed auth: Don't build password reset, MFA, breach detection
* Audit log: Who did what, when
* Role-based access: Owner, property manager, accountant, tenant
Financial safety guarantees:
* Ledger writes require ACCOUNTANT or SYSTEM role
* UI users can trigger workflows, but ledger posting happens server-side
* API tokens for automation have limited scopes
Pattern:
* Tenant can view their statement (derived from ledger)
* Tenant CANNOT post entries
* Property manager can trigger move-in, but system calculates pro-rata

Frontend Approach (Phase 3+)
Choice: Next.js (App Router) + shadcn/ui + TanStack Query
Why deferred:
* Phase 0-1: API-first, admin uses Retool or internal tools
* Phase 2: Build narrow workflows (move-in wizard)
* Phase 3: Self-service tenant portal
Why Next.js later:
* Server components = no accidental client-side math
* tRPC integration = type-safe API calls
* Can gate features behind auth without rolling own
Financial safety guarantees:
* Frontend NEVER calculates rent, pro-rata, late fees
* UI shows read-only derived balances from API
* Forms submit events; backend computes money

Observability / Logging
Choice: Structured logging (Pino) + Sentry + PostgreSQL audit log
Why:
* Pino: Fast JSON logs, searchable in production
* Sentry: Exception tracking, breadcrumb trail for debugging
* Audit table: Every ledger entry write logged with user ID, timestamp, request ID
Financial safety guarantees:
* Every createLedgerEntry() call emits structured log with idempotency key
* Ledger mutations trigger DB-level audit insert (cannot be bypassed)
* Request ID traces user action → queue job → ledger post
Critical:
* Logs are append-only
* Never log raw payment tokens
* Log metadata includes: {userId, leaseId, amount, accountCode, idempotencyKey}

Infrastructure / Deployment
Choice: Render.com or Railway (Phase 0-1), migrate to AWS ECS + RDS (Phase 2+)
Why start simple:
* Render/Railway: Managed Postgres, auto-deploys, $50/mo
* Faster iteration, fewer ops distractions
* Postgres backups built-in
Why migrate later:
* AWS RDS: Multi-AZ, automated backups, point-in-time recovery
* ECS: More control over job runners, scaling
* CloudWatch: Better compliance audit logs
Financial safety guarantees:
* Daily automated Postgres backups (test restores monthly)
* Secrets in environment variables, rotated quarterly
* Ledger table backed up to S3 (immutable, versioned)
Rejected:
* Vercel: No long-running jobs, no direct DB access
* Heroku: Expensive at scale, less control
* Self-hosted: Too much ops burden for small team

2. Final Accounting Architecture
Core Principle
The General Ledger is the ONLY source of financial truth.
All other tables (leases, properties, tenants) are operational metadata that REFERENCE ledger entries but never duplicate amounts.
Ledger Structure
Single table: ledger_entries

interface LedgerEntry {
  id: string; // UUID
  created_at: timestamp; // Immutable
  entry_date: date; // Accounting date (can differ from created_at)
  account_code: string; // FK to chart_of_accounts
  amount: decimal(12,2); // Positive or negative
  debit_credit: 'DR' | 'CR'; // Explicit direction
  entity_type: 'property' | 'lease' | 'tenant' | 'vendor';
  entity_id: string; // FK to entity
  description: string; // Human-readable
  idempotency_key: string; // UNIQUE constraint
  metadata: jsonb; // {invoiceId, stripePaymentId, etc.}
  posted_by: string; // user_id or 'SYSTEM'
  void_of_entry_id?: string; // FK to reversed entry
  status: 'POSTED' | 'VOID'; // Immutable once POSTED
}
Indexes:
* (idempotency_key) UNIQUE
* (entity_type, entity_id, entry_date) for statement queries
* (account_code, entry_date) for GL reports

Chart of Accounts Design
Table: chart_of_accounts

interface Account {
  code: string; // '1000', '4000', etc.
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'EQUITY';
  normal_balance: 'DR' | 'CR';
  active: boolean;
  parent_code?: string; // For sub-accounts
}
Baseline accounts (NON-NEGOTIABLE):
* 1000: Operating Cash (Asset, DR)
* 1200: Accounts Receivable (Asset, DR)
* 2100: Security Deposits Held (Liability, CR)
* 4000: Rental Income (Income, CR)
* 4100: Other Income (Income, CR)
* 5000: Repairs & Maintenance (Expense, DR)
* 6000+: CAPEX accounts (clearly separated)
Rules:
* Accounts CANNOT be deleted if ledger entries exist
* Account type CANNOT be changed
* New accounts require explicit approval (not auto-created)

Posting Contracts
Function signature:

async function createLedgerEntry(params: {
  idempotencyKey: string;
  entryDate: Date;
  accountCode: string;
  amount: Decimal;
  debitCredit: 'DR' | 'CR';
  entityType: string;
  entityId: string;
  description: string;
  metadata?: Record<string, any>;
  postedBy: string;
}): Promise<LedgerEntry>
Guarantees:
1. If idempotencyKey exists, return existing entry (no error)
2. Validates accountCode exists in COA
3. Validates amount matches account's normal balance direction
4. Inserts within transaction
5. Returns created entry
Forbidden:
* No updateLedgerEntry()
* No deleteLedgerEntry()
* Only voidLedgerEntry(entryId) → creates offsetting entry

How Accounting is Protected from Other Domains
Layered architecture:

┌─────────────────────────────────────┐
│  UI / API (workflows, events)       │
├─────────────────────────────────────┤
│  Domain Logic (lease, tenant)       │  ← CAN READ ledger
├─────────────────────────────────────┤
│  Accounting Service                 │  ← ONLY layer that writes ledger
├─────────────────────────────────────┤
│  Ledger (PostgreSQL)                │  ← Immutable, append-only
└─────────────────────────────────────┘
Enforcement:
* Ledger table grants: accounting_service role has INSERT, all others have SELECT
* TypeScript: createLedgerEntry() is private to accounting module
* Code review: Any PR touching ledger requires two approvals

3. Ledger Model Design
Single-Entry vs Double-Entry
Current (Phase 0-1): Single-entry with explicit DR/CR
Why:
* Simpler to implement
* Each row is a posting to one account
* Balances still derived correctly
* Auditable (each entry is atomic)
Target (Phase 2+): True double-entry
Why migrate:
* CPA expectation for audit
* Self-balancing (debits = credits enforced)
* Standard accounting practice
Migration path:
1. Introduce journal_entry table (header)
2. ledger_entry becomes journal_entry_line (detail)
3. Constraint: SUM(lines.amount WHERE debit) = SUM(lines.amount WHERE credit) per journal entry
4. Backfill existing entries into paired journal entries
For now: single-entry is SAFE because:
* We're only posting to one side at a time (rent charge = DR AR)
* Payment receipt = CR AR (separate entry)
* Trial balance can still be computed

Required Fields
Non-nullable:
* id, created_at, entry_date, account_code, amount, debit_credit, entity_type, entity_id, description, idempotency_key, posted_by, status
Nullable:
* void_of_entry_id (only set when voiding)
* metadata (optional context)
Constraints:
* amount > 0 (negative amounts forbidden; use opposite DR/CR instead)
* status IN ('POSTED', 'VOID')
* idempotency_key UNIQUE

Idempotency Strategy
Pattern:

{entityType}:{entityId}:{action}:{date}:{nonce?}
Examples:
* lease:123:rent_charge:2026-01-01
* lease:123:payment:inv-456
* lease:123:move_in_deposit:2026-01-05
Implementation:

const key = `lease:${leaseId}:rent_charge:${format(date, 'yyyy-MM-dd')}`;
try {
  await createLedgerEntry({ idempotencyKey: key, ... });
} catch (UniqueConstraintError) {
  // Already posted, safe to skip
  return;
}
Guarantees:
* Retry-safe: same job runs twice → second run is no-op
* Webhook replay-safe: Stripe webhook delivers twice → second insert fails gracefully
* Human error-safe: clicking "Post Rent" twice → second click does nothing

Void vs Reversal Mechanics
Void:
* Used when entry was posted in error
* Creates offsetting entry with void_of_entry_id pointing to original
* Original entry's status set to VOID
* Both entries remain visible in ledger
Reversal:
* Used for intentional corrections (e.g., tenant overpayment refund)
* Creates new entry with opposite DR/CR
* Original entry remains POSTED
* Description explains reversal reason
Implementation:

async function voidLedgerEntry(entryId: string, voidedBy: string) {
  return prisma.$transaction(async (tx) => {
    const original = await tx.ledgerEntry.findUnique({ where: { id: entryId } });
    if (original.status === 'VOID') throw new Error('Already voided');
    
    // Create offsetting entry
    await tx.ledgerEntry.create({
      data: {
        ...original,
        id: uuid(),
        amount: original.amount,
        debit_credit: original.debit_credit === 'DR' ? 'CR' : 'DR', // Flip
        description: `VOID: ${original.description}`,
        void_of_entry_id: entryId,
        posted_by: voidedBy,
        idempotency_key: `void:${entryId}`,
      }
    });
    
    // Mark original as void
    await tx.ledgerEntry.update({
      where: { id: entryId },
      data: { status: 'VOID' }
    });
  });
}
Rules:
* Voids must happen same accounting period (or require manager approval)
* Voided entries still show on statements (with "VOID" label)
* Audit log records who voided and why

Audit Guarantees
What is guaranteed:
1. Every entry has created_at (wall clock time)
2. Every entry has entry_date (accounting date)
3. Every entry has posted_by (user or SYSTEM)
4. Every entry is immutable (no UPDATE, only VOID)
5. Separate audit table logs every write attempt (success or failure)
Audit table schema:

interface AuditLog {
  id: string;
  timestamp: timestamp;
  user_id: string;
  action: 'CREATE_ENTRY' | 'VOID_ENTRY';
  entity_type: string;
  entity_id: string;
  before_state: jsonb;
  after_state: jsonb;
  success: boolean;
  error_message?: string;
}
Trigger:

CREATE TRIGGER audit_ledger_insert
AFTER INSERT ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CPA requirements:
* Trail shows who posted, when, and why
* Voided entries are never hidden
* Original entry + void pair sum to zero

4. Posting Rules & Invariants
What is Allowed
1. Insert new ledger entry (via createLedgerEntry())
2. Void existing entry (via voidLedgerEntry())
3. Read ledger (anytime, by anyone with permission)
4. Derive balances (computed from entries, never stored)

What is Forbidden
1. UPDATE ledger entry amount, account, or date
2. DELETE ledger entry
3. Store balances in leases or tenants table
4. Post entry without valid account_code in COA
5. Post entry without idempotency key
6. Post entry with amount ≤ 0
7. Create account on-the-fly (all accounts pre-approved)

How Violations are Prevented
Database level:

-- No UPDATE on amount/account/date
CREATE POLICY ledger_immutable ON ledger_entries
  FOR UPDATE USING (false);

-- No DELETE
CREATE POLICY ledger_no_delete ON ledger_entries
  FOR DELETE USING (false);

-- Amount must be positive
ALTER TABLE ledger_entries ADD CONSTRAINT positive_amount
  CHECK (amount > 0);

-- Account must exist
ALTER TABLE ledger_entries ADD CONSTRAINT valid_account
  FOREIGN KEY (account_code) REFERENCES chart_of_accounts(code);
Application level:

// TypeScript: no public update method exists
export class AccountingService {
  private constructor() {} // Singleton
  
  async createEntry(...) { /* allowed */ }
  async voidEntry(...) { /* allowed */ }
  // No updateEntry() method
}
Code review:
* Lint rule: flag any SQL containing UPDATE ledger_entries or DELETE FROM ledger_entries
* Required review by two engineers for any accounting module change

How Errors are Surfaced
Validation errors (before DB):
* Missing idempotency key → 400 Bad Request
* Invalid account code → 400 Bad Request, "Account X does not exist"
* Amount ≤ 0 → 400 Bad Request, "Amount must be positive"
Constraint errors (at DB):
* Duplicate idempotency key → log "Entry already exists", return existing entry (not an error)
* Foreign key violation → 500 Internal Server Error, alert engineering
Business logic errors:
* Lease not found → 404 Not Found
* Move-in date in past → 400 Bad Request, "Cannot move in to past date"
Observability:
* All errors logged with structured context
* Sentry alert on any 500 error in accounting service
* Daily report of failed job queue entries

5. Recurring Charge Accounting
How Recurring Rent is Represented
Table: recurring_charges

interface RecurringCharge {
  id: string;
  lease_id: string;
  account_code: string; // FK to COA (e.g., '4000' for rent)
  amount: decimal(12,2);
  frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  start_date: date;
  end_date?: date;
  description: string; // "Base Rent - Unit 5"
  active: boolean;
}
Rules:
* account_code MUST exist in COA (FK constraint)
* If account_code is deleted/deactivated → charge cannot post
* Charge is template, NOT a ledger entry
* Posting happens via scheduled job

How Posting Works
Daily cron job:

// Runs at 2 AM daily
async function postRecurringCharges(date: Date) {
  const charges = await getActiveChargesForDate(date);
  
  for (const charge of charges) {
    const idempotencyKey = `lease:${charge.lease_id}:recurring:${charge.id}:${formatDate(date)}`;
    
    try {
      await createLedgerEntry({
        idempotencyKey,
        entryDate: date,
        accountCode: charge.account_code, // Validated by FK
        amount: charge.amount,
        debitCredit: 'DR', // Rent is DR to AR
        entityType: 'lease',
        entityId: charge.lease_id,
        description: charge.description,
        metadata: { recurringChargeId: charge.id },
        postedBy: 'SYSTEM',
      });
    } catch (error) {
      // Log failure, add to dead-letter queue
      await logFailedCharge(charge, error);
    }
  }
}
Validation:
* If account_code FK fails → charge is skipped, alert sent
* If lease is inactive → charge skipped
* If charge.end_date < date → charge skipped

How Re-Runs are Safe
Idempotency key prevents double-posting:
Scenario: Job runs twice on 2026-01-01
* First run: Posts entry with key lease:123:recurring:charge-456:2026-01-01
* Second run: Attempts insert with same key → unique constraint fails → no-op
Explicit check before posting:

const exists = await ledgerEntryExists(idempotencyKey);
if (exists) {
  logger.info('Entry already posted, skipping', { idempotencyKey });
  return;
}

How Missed Runs are Handled
Backfill job:

// Runs on startup, fills gaps
async function backfillMissedCharges() {
  const lastProcessedDate = await getLastProcessedDate();
  const today = new Date();
  
  for (let date = lastProcessedDate; date < today; date = addDays(date, 1)) {
    await postRecurringCharges(date);
  }
}
Guarantees:
* If server is down for 3 days, backfill posts all missed days
* Idempotency prevents duplicates
* Backfill runs before live job
* last_processed_date stored in system_state table
Dead-letter handling:
* Failed charges go to failed_charges table
* Daily report emailed to accounting team
* Manual review + re-run tool

How Automation Cannot Double-Post
Multi-layer protection:
1. Idempotency key (primary defense)
2. Database UNIQUE constraint (enforcement)
3. Job deduplication (BullMQ jobId = {leaseId}:{date})
4. Audit log (every attempt recorded)
Example failure mode:
* Webhook delivers twice → both attempt to post → second fails on unique key → logged as duplicate → no financial impact

6. Complete Data Model (Operational Tables)
Core Philosophy
Operational tables store WHO, WHAT, WHERE. Ledger stores MONEY.
Never duplicate amounts between tables.

Properties Table
interface Property {
  id: string; // UUID
  created_at: timestamp;
  name: string; // "Warehouse District 5"
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: 'INDUSTRIAL' | 'WAREHOUSE' | 'FLEX_SPACE';
  total_square_feet: number;
  acquisition_date?: date;
  notes?: string;
  active: boolean;
}
Rules:
* Property ID tags EVERY ledger entry (via entity_id when entity_type = 'property')
* Cannot be deleted if ledger entries exist
* Consolidated reporting = just filter ledger by property_id

Units Table
interface Unit {
  id: string;
  property_id: string; // FK to properties
  unit_number: string; // "Bay 1", "Suite 200"
  square_feet: number;
  unit_type: 'WAREHOUSE' | 'OFFICE' | 'YARD_SPACE';
  status: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE';
  notes?: string;
  active: boolean;
}
Rules:
* One unit = one lease at a time
* Unit status automatically updates when lease activates/ends
* Unit square footage used for pro-rata calculations ONLY if user requests it (manual override always available)

Tenants Table
interface Tenant {
  id: string;
  created_at: timestamp;
  type: 'COMPANY' | 'INDIVIDUAL';
  company_name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  tax_id?: string; // For 1099
  notes?: string;
  active: boolean;
}
Rules:
* Tenant can have multiple leases (serial or parallel)
* Tenant balance = SUM(ledger_entries WHERE entity_type = 'tenant' AND entity_id = tenant.id)
* Never store balance in this table

Leases Table
interface Lease {
  id: string;
  created_at: timestamp;
  tenant_id: string; // FK to tenants
  unit_id: string; // FK to units
  property_id: string; // FK to properties (denormalized for reporting)

  // Dates
  start_date: date;
  end_date: date;
  move_in_date?: date; // Actual move-in (may differ from start_date)
  move_out_date?: date; // Actual move-out

  // Status
  status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'TERMINATED';

  // Security Deposit (NOT the current balance, just the original amount)
  security_deposit_amount: decimal(12,2);

  // Metadata
  lease_document_url?: string; // Link to signed PDF
  notes?: string;
}
Rules:
* Lease does NOT store "amount owed" or "current balance"
* Recurring charges stored in separate recurring_charges table
* One-time charges (move-in fees, deposits) posted directly to ledger
* Lease balance = SUM(ledger_entries WHERE entity_type = 'lease' AND entity_id = lease.id)

Recurring Charges Table (Already defined, adding clarifications)
interface RecurringCharge {
  id: string;
  lease_id: string; // FK to leases
  property_id: string; // Denormalized from lease for reporting
  account_code: string; // FK to COA
  charge_type: 'RENT' | 'CAM' | 'UTILITIES' | 'INSURANCE' | 'TAX' | 'OTHER';
  amount: decimal(12,2);
  frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  start_date: date;
  end_date?: date;
  day_of_month: number; // 1-28 (default 1)
  description: string; // "Base Rent - Bay 1"
  active: boolean;
}
Additional Rules for Simple Model:
* No automated NNN logic - user adds each charge manually
* CAM estimates = just another recurring charge
* If user wants to bill utilities separately, they add a UTILITIES charge
* System doesn't care about lease type - just posts what you configure

Vendors Table (For future expense tracking)
interface Vendor {
  id: string;
  created_at: timestamp;
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string; // For 1099
  vendor_type: 'MAINTENANCE' | 'CONTRACTOR' | 'SUPPLIER' | 'SERVICE' | 'OTHER';
  payment_terms?: string; // "Net 30"
  notes?: string;
  active: boolean;
}
Usage:
* When posting expense: entity_type = 'vendor', entity_id = vendor.id
* 1099 report = SUM(ledger WHERE entity_type = 'vendor' AND account in expense accounts)

Relationship to Ledger
Every ledger entry references ONE entity:
* entity_type = 'property' → property-level expense (repairs, capex)
* entity_type = 'lease' → charge or payment tied to specific lease
* entity_type = 'tenant' → tenant-level entry (rare, usually use lease)
* entity_type = 'vendor' → expense payment to vendor

Property-level reporting: Filter ledger by property_id (stored in metadata or via JOIN through lease)

7. Balance Derivation Queries (The Heart of "Derived, Never Stored")
Tenant Current Balance
-- What does this tenant owe right now?
SELECT
  t.id,
  t.company_name,
  COALESCE(SUM(
    CASE
      WHEN le.debit_credit = 'DR' THEN le.amount
      WHEN le.debit_credit = 'CR' THEN -le.amount
    END
  ), 0) as current_balance
FROM tenants t
LEFT JOIN leases l ON l.tenant_id = t.id
LEFT JOIN ledger_entries le ON le.entity_type = 'lease' AND le.entity_id = l.id
WHERE le.account_code IN ('1200') -- AR account
  AND le.status = 'POSTED'
  AND t.id = ?
GROUP BY t.id, t.company_name;
Result: Positive = tenant owes money, Negative = tenant has credit

Lease Statement (All Activity)
-- Show all charges and payments for a lease in a date range
SELECT
  le.entry_date,
  le.description,
  a.name as account_name,
  CASE
    WHEN le.debit_credit = 'DR' THEN le.amount ELSE 0
  END as charges,
  CASE
    WHEN le.debit_credit = 'CR' THEN le.amount ELSE 0
  END as payments,
  SUM(
    CASE
      WHEN le.debit_credit = 'DR' THEN le.amount
      ELSE -le.amount
    END
  ) OVER (ORDER BY le.entry_date, le.created_at) as running_balance
FROM ledger_entries le
JOIN chart_of_accounts a ON a.code = le.account_code
WHERE le.entity_type = 'lease'
  AND le.entity_id = ?
  AND le.status = 'POSTED'
  AND le.entry_date BETWEEN ? AND ?
ORDER BY le.entry_date, le.created_at;
Result: Statement with running balance column

Property P&L (Income Statement)
-- All income and expenses for a property in a date range
SELECT
  a.code,
  a.name,
  a.type,
  SUM(
    CASE
      WHEN a.normal_balance = 'DR' AND le.debit_credit = 'DR' THEN le.amount
      WHEN a.normal_balance = 'DR' AND le.debit_credit = 'CR' THEN -le.amount
      WHEN a.normal_balance = 'CR' AND le.debit_credit = 'CR' THEN le.amount
      WHEN a.normal_balance = 'CR' AND le.debit_credit = 'DR' THEN -le.amount
    END
  ) as balance
FROM ledger_entries le
JOIN chart_of_accounts a ON a.code = le.account_code
WHERE le.property_id = ? -- Assumes property_id in ledger metadata
  AND le.entry_date BETWEEN ? AND ?
  AND le.status = 'POSTED'
  AND a.type IN ('INCOME', 'EXPENSE')
GROUP BY a.code, a.name, a.type, a.normal_balance
ORDER BY a.code;
Result: Income (positive) and Expenses (positive), Net = Income - Expenses

Security Deposit Reconciliation
-- Ensure cash held matches liability
SELECT
  'Cash Held' as account,
  SUM(CASE WHEN debit_credit = 'DR' THEN amount ELSE -amount END) as balance
FROM ledger_entries
WHERE account_code = '1000' -- Operating Cash
  AND metadata->>'deposit_related' = 'true'
  AND status = 'POSTED'
UNION ALL
SELECT
  'Deposit Liability' as account,
  SUM(CASE WHEN debit_credit = 'CR' THEN amount ELSE -amount END) as balance
FROM ledger_entries
WHERE account_code = '2100' -- Security Deposits Held
  AND status = 'POSTED';
Result: Both should match (cash in = liability out)

Trial Balance (All Accounts)
-- Verify system integrity: total debits = total credits
SELECT
  a.code,
  a.name,
  a.type,
  a.normal_balance,
  SUM(CASE WHEN le.debit_credit = 'DR' THEN le.amount ELSE 0 END) as total_debits,
  SUM(CASE WHEN le.debit_credit = 'CR' THEN le.amount ELSE 0 END) as total_credits,
  SUM(
    CASE
      WHEN a.normal_balance = 'DR' THEN
        (CASE WHEN le.debit_credit = 'DR' THEN le.amount ELSE -le.amount END)
      ELSE
        (CASE WHEN le.debit_credit = 'CR' THEN le.amount ELSE -le.amount END)
    END
  ) as balance
FROM chart_of_accounts a
LEFT JOIN ledger_entries le ON le.account_code = a.code AND le.status = 'POSTED'
WHERE a.active = true
GROUP BY a.code, a.name, a.type, a.normal_balance
ORDER BY a.code;
Verification:
* SUM(total_debits) MUST equal SUM(total_credits)
* If not, data integrity issue (alert engineering immediately)

Aging Report (AR Breakdown)
-- How old are unpaid charges?
WITH lease_balances AS (
  SELECT
    l.id as lease_id,
    t.company_name,
    p.name as property_name,
    le.entry_date,
    SUM(CASE WHEN le.debit_credit = 'DR' THEN le.amount ELSE -le.amount END) as amount
  FROM ledger_entries le
  JOIN leases l ON le.entity_type = 'lease' AND le.entity_id = l.id
  JOIN tenants t ON t.id = l.tenant_id
  JOIN properties p ON p.id = l.property_id
  WHERE le.account_code = '1200' -- AR
    AND le.status = 'POSTED'
  GROUP BY l.id, t.company_name, p.name, le.entry_date
  HAVING SUM(CASE WHEN le.debit_credit = 'DR' THEN le.amount ELSE -le.amount END) > 0
)
SELECT
  company_name,
  property_name,
  SUM(CASE WHEN CURRENT_DATE - entry_date <= 30 THEN amount ELSE 0 END) as current,
  SUM(CASE WHEN CURRENT_DATE - entry_date BETWEEN 31 AND 60 THEN amount ELSE 0 END) as days_31_60,
  SUM(CASE WHEN CURRENT_DATE - entry_date BETWEEN 61 AND 90 THEN amount ELSE 0 END) as days_61_90,
  SUM(CASE WHEN CURRENT_DATE - entry_date > 90 THEN amount ELSE 0 END) as over_90,
  SUM(amount) as total_due
FROM lease_balances
GROUP BY company_name, property_name
ORDER BY total_due DESC;

8. Core Workflows (Simple, Manual-First Approach)
Workflow 1: Add a New Property
Steps:
1. Navigate to Properties → Add New Property
2. Fill in form: Name, Address, Square Footage, Type
3. Click Save
4. Done - property appears in list

No ledger entries created yet (property acquisition is manual journal entry if needed)

Workflow 2: Add a New Tenant
Steps:
1. Navigate to Tenants → Add New Tenant
2. Fill in form: Name/Company, Email, Phone, Billing Address
3. Click Save
4. Done - tenant appears in list

No ledger entries created yet

Workflow 3: Create a New Lease (The Big One)
Steps:
1. Navigate to Leases → Create New Lease
2. Select Tenant (dropdown of existing tenants, or "Add New" quick-add)
3. Select Property → Select Unit
4. Enter Dates: Start Date, End Date
5. Enter Security Deposit Amount (just the number, like $5,000)
6. Click "Save Draft" (lease is now DRAFT status)

7. Add Recurring Charges:
   - Click "Add Charge" button
   - For each charge (Rent, CAM, etc.):
     - Select Charge Type (dropdown)
     - Enter Amount
     - Select Frequency (Monthly, Quarterly, Annual)
     - Enter Start Date (default to lease start)
     - Enter Description
   - Click "Add Charge"
   - Repeat for each charge line

8. Review Summary:
   - System shows: "This lease will post $X per month starting on Y"
   - User clicks "Activate Lease"

9. System Actions (Automated):
   - Update lease status to ACTIVE
   - Update unit status to OCCUPIED
   - Post security deposit entries:
     a. DR 1000 Operating Cash $5,000 (assuming cash received)
     b. CR 2100 Security Deposits Held $5,000
   - Recurring charges are now active (will post on scheduled dates)

UI Notes:
* Entire flow is one multi-step form (wizard UI)
* "Save Draft" available at any step
* Can return to draft leases later to finish
* Clear, friendly labels: "What's the monthly rent?" instead of "Charge Amount"

Workflow 4: Record a Payment (Manual Allocation)
Steps:
1. Navigate to Leases → [Select Lease] → "Record Payment"
2. System shows current balance: "Tenant owes $2,500"
3. System shows breakdown:
   - Rent: $2,000
   - CAM: $300
   - Late Fee: $200
   (Derived from ledger in real-time)

4. Enter payment details:
   - Payment Date
   - Payment Amount: $800 (user enters what they received)
   - Payment Method: dropdown (Check, ACH, Cash, Stripe)
   - Check Number / Transaction ID (optional)

5. Manual Allocation (This is key for simplicity):
   - System shows input fields:
     □ Apply to Rent: $___
     □ Apply to CAM: $___
     □ Apply to Late Fee: $___
   - User manually types $800 into "Apply to Rent"
   - System validates: Total must equal payment amount
   - Click "Record Payment"

6. System Actions:
   - Post ONE ledger entry:
     DR 1000 Operating Cash $800
   - Post allocated entries:
     CR 1200 Accounts Receivable $800
     (with metadata: {leaseId, allocatedTo: 'rent'})
   - Idempotency key: lease:123:payment:stripe_xyz (or check_456)

7. System shows updated balance: "Tenant owes $1,700"

UI Notes:
* Allocation is EXPLICIT - no guessing
* System suggests allocation (most overdue first) but user can override
* "Apply Full Payment to Rent" quick button for common case
* Receipt automatically generated (PDF)

Workflow 5: Post a One-Time Charge
Steps:
1. Navigate to Leases → [Select Lease] → "Add Charge"
2. Fill in form:
   - Charge Type: dropdown (Late Fee, Repair Charge, Admin Fee, Other)
   - Amount: $___
   - Description: "Late fee for January rent"
   - Date: (default today)
3. Click "Post Charge"
4. System Actions:
   - Post ledger entry:
     DR 1200 Accounts Receivable $___
     CR 4100 Other Income $___
   - Idempotency key: lease:123:charge:uuid
5. Charge appears on tenant statement immediately

Workflow 6: Move-Out (End a Lease)
Steps:
1. Navigate to Leases → [Select Lease] → "Move Out"
2. System shows:
   - Current balance: $X (may be positive or negative)
   - Security deposit held: $Y
3. Enter move-out details:
   - Actual Move-Out Date
   - Final Charges (optional):
     □ Cleaning Fee: $___
     □ Damages: $___
     □ Pro-rata Rent Adjustment: $___
   - Each charge posts to ledger immediately (user sees running total)

4. System calculates deposit disposition:
   - Deposit Held: $5,000
   - Final Balance Owed: -$200 (tenant has credit)
   - Deposit to Return: $5,200

5. User confirms: "Return $5,200 to tenant"
6. System Actions:
   - Post deposit return entries:
     DR 2100 Security Deposits Held $5,000
     CR 1000 Operating Cash $5,000
   - Post overpayment refund:
     DR 1200 AR $200 (clears the credit)
     CR 1000 Cash $200
   - Update lease status to ENDED
   - Update unit status to VACANT
   - Stop all recurring charges (set end_date = move_out_date)

7. Generate final statement (PDF) for tenant

UI Notes:
* Wizard walks through each step
* Calculator widget shows running total
* "Standard Cleaning Fee: $150" quick-add buttons for common charges
* Preview final statement before confirming

Workflow 7: Run Month-End Close
Steps:
1. Navigate to Reports → Month-End Close
2. System runs validation checks:
   ✓ All recurring charges posted for the month
   ✓ Trial balance: Debits = Credits
   ✓ No pending failed jobs in dead-letter queue
   ✓ All deposits reconciled (cash = liability)
3. If all checks pass:
   - System shows summary: "All systems healthy for period YYYY-MM"
   - User clicks "Mark Period Closed"
   - System records close date in system_state table
4. If checks fail:
   - System shows specific issues: "3 recurring charges failed to post"
   - Links to resolve each issue
   - Cannot close until resolved

UI Notes:
* Checklist UI (green checks, red X's)
* One-click drill-down to fix issues
* Optional: Generate month-end reports (P&L, Balance Sheet) as PDFs

9. UI/UX Design Philosophy (Modern, Fun, Easy)
Design System
Choice: shadcn/ui (Tailwind-based component library)
Why:
* Modern, clean aesthetic
* Accessible by default
* Customizable
* Copy-paste components (no bloat)

Color Palette:
* Primary: Blue (trust, professionalism)
* Success: Green (payments received, validations passed)
* Warning: Amber (draft leases, pending items)
* Danger: Red (overdue, errors)
* Neutral: Gray (backgrounds, text)

Typography:
* Headings: Inter (clean, modern)
* Body: System font stack (fast loading)
* Monospace: Fira Code (for amounts, account codes)

Key UI Patterns
Dashboard (Home Screen):
┌─────────────────────────────────────────┐
│ Properties Overview                     │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│ │ Total   │ │ Total   │ │ Total   │   │
│ │ Rent    │ │ Occupied│ │ Overdue │   │
│ │ $45K/mo │ │ 12/15   │ │ $3,200  │   │
│ └─────────┘ └─────────┘ └─────────┘   │
├─────────────────────────────────────────┤
│ Recent Activity                         │
│ • Payment received: $2,000 - Acme Corp  │
│ • Lease activated: Bay 5 - Widget Inc  │
│ • Charge posted: Late fee - Acme Corp   │
├─────────────────────────────────────────┤
│ Action Items                            │
│ ⚠ 2 leases expiring in 30 days          │
│ ⚠ 1 failed recurring charge (review)    │
└─────────────────────────────────────────┘

Properties List:
* Table view with sortable columns
* Search/filter by name, city, status
* "Add Property" button (top right, prominent)
* Each row has "View" button → drills into property detail

Property Detail:
* Header: Property name, address, image
* Tabs:
  - Overview (units, lease summary)
  - Leases (list of all leases for this property)
  - Financials (P&L, cash flow)
  - Documents (lease PDFs, photos)

Lease Detail (Most Important Screen):
┌─────────────────────────────────────────┐
│ Bay 1 - Acme Corp                       │
│ Active • $2,000/mo • Expires: 12/31/26  │
├─────────────────────────────────────────┤
│ Balance Due: $2,500                     │
│ ┌─────────────────────────────────────┐ │
│ │ 🟢 Record Payment                   │ │
│ │ 🔵 Add Charge                       │ │
│ │ 🔴 Move Out                         │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Recurring Charges                       │
│ • Rent: $2,000/mo (1st of month)        │
│ • CAM: $300/mo (1st of month)           │
│ [Add Recurring Charge]                  │
├─────────────────────────────────────────┤
│ Recent Activity                         │
│ Date       Description        Amount    │
│ 01/01/26   Rent Charge       +$2,000   │
│ 12/15/25   Payment Received  -$2,000   │
│ 12/01/25   Rent Charge       +$2,000   │
│ [View Full Statement]                   │
└─────────────────────────────────────────┘

Statement View:
* Clean table: Date | Description | Charges | Payments | Balance
* Running balance column (like a bank statement)
* Export to PDF button
* Date range picker (default: current year)
* Print-friendly CSS

Forms (Lease Creation, Payment Entry):
* Multi-step wizard for complex flows
* Progress indicator at top (Step 2 of 5)
* "Save Draft" always available
* Inline validation (instant feedback)
* Helpful hints: "This is the total amount the tenant will pay each month"
* Auto-save every 30 seconds (draft state)

Mobile Considerations:
* Responsive design (works on tablet, but not phone-optimized in v1)
* Key actions available on mobile: record payment, view balances
* Complex workflows (lease creation) better on desktop (show gentle nudge: "This works better on desktop")

Delight Factors:
* Smooth animations (page transitions, modals)
* Optimistic UI updates (payment posts instantly, no loading spinner)
* Keyboard shortcuts (press 'P' to record payment, 'N' for new lease)
* Empty states with friendly illustrations: "No leases yet. Create your first one!"
* Success confirmations with celebratory micro-animations (confetti on first lease?)
* Dark mode support (toggle in settings)

Error Handling (User-Friendly):
* Never show raw error messages: "Unique constraint violation on idempotency_key"
* Instead: "This payment has already been recorded. View existing payment →"
* Inline errors (next to field) vs page-level errors (banner at top)
* Actionable: "3 recurring charges failed. Review failed charges →"

10. Statement Generation (Tenant-Facing & Owner-Facing)
Tenant Statement
Purpose: Show tenant what they owe
Generated on-demand or monthly (automated email)

Content:
┌─────────────────────────────────────────┐
│ STATEMENT                               │
│ For: Acme Corporation                   │
│ Property: Warehouse District 5 - Bay 1  │
│ Period: December 2025                   │
├─────────────────────────────────────────┤
│ Previous Balance: $0.00                 │
│                                         │
│ Charges:                                │
│ 12/01/25  Base Rent           $2,000.00│
│ 12/01/25  CAM Estimate        $300.00  │
│                                         │
│ Payments:                               │
│ 12/05/25  Payment (Check 1234) -$2,300 │
│                                         │
│ Current Balance: $0.00                  │
│ ✓ PAID IN FULL                          │
└─────────────────────────────────────────┘

Format: PDF (printable, emailable)
Branding: Logo, property management company name, contact info
Payment Instructions: "Pay online at [URL] or mail check to [address]"

Owner Statement (Property-Level)
Purpose: Show owner how their property performed
Generated monthly (automated)

Content:
┌─────────────────────────────────────────┐
│ OWNER STATEMENT                         │
│ Property: Warehouse District 5          │
│ Period: December 2025                   │
├─────────────────────────────────────────┤
│ INCOME                                  │
│ Rental Income              $8,000.00   │
│ CAM Recoveries             $1,200.00   │
│ Late Fees                  $150.00     │
│ Total Income               $9,350.00   │
│                                         │
│ EXPENSES                                │
│ Repairs & Maintenance      $450.00     │
│ Property Management Fee    $935.00     │
│ Insurance                  $200.00     │
│ Total Expenses             $1,585.00   │
│                                         │
│ NET OPERATING INCOME       $7,765.00   │
│                                         │
│ Distributions:                          │
│ 12/31/25  ACH Transfer     $7,765.00   │
│                                         │
│ Balance Retained: $0.00                 │
└─────────────────────────────────────────┘

Format: PDF with attached detailed ledger (CSV export)

Move-Out Statement
Purpose: Final accounting of deposit and charges
Generated when lease ends

Content:
┌─────────────────────────────────────────┐
│ FINAL MOVE-OUT STATEMENT                │
│ Tenant: Acme Corporation                │
│ Unit: Bay 1                             │
│ Move-Out Date: 01/15/2026               │
├─────────────────────────────────────────┤
│ Security Deposit Held: $5,000.00       │
│                                         │
│ Final Charges:                          │
│ Pro-rata Rent (1-15 Jan)   $1,000.00   │
│ Cleaning Fee               $150.00     │
│                                         │
│ Credits:                                │
│ Overpayment from Dec       -$200.00    │
│                                         │
│ Total Charges: $950.00                  │
│                                         │
│ DEPOSIT REFUND: $4,050.00               │
│ (Check mailed to tenant on 01/20/26)    │
└─────────────────────────────────────────┘

Format: PDF + check stub (if applicable)
Legal: Include state-specific deposit return requirements
Compliance: Itemized deductions with receipts attached

Aging Report (Internal)
Purpose: Identify collection issues
Generated on-demand

Format: Table (HTML + CSV export)
Columns: Tenant | Property | Current | 31-60 Days | 61-90 Days | 90+ Days | Total
Sorting: Default by Total (highest first)
Action: Click tenant name → goes to lease detail to record payment

11. Compliance & Tax Reporting
1099 Generation (Vendor Payments)
Trigger: Annually (January)
Steps:
1. System identifies all vendors paid >$600 in previous year
2. Query: SUM(ledger WHERE entity_type = 'vendor' AND account_code IN expense_accounts AND year = YYYY)
3. Generate 1099-MISC forms (PDF)
4. Export to CSV for import into tax software (e.g., TurboTax)

Data Required:
* Vendor tax ID (collected in vendor profile)
* Total payments
* Payer info (property management company)

Security Deposit Compliance
Varies by state - system should support:
* Separate bank account tracking (tag ledger entries with bank_account_id)
* Interest calculation (if required by state):
  - Store interest rate in system_state table
  - Annual job posts interest credit to tenant
  - Entry: DR Interest Expense, CR Security Deposit Liability
* Time limits for return (system sends alert: "Deposit must be returned by X date")

California Example:
* Must return within 21 days
* Must provide itemized deductions
* System workflow: Move-out date + 21 days = deadline reminder

Financial Statement Preparation
Reports generated for CPA/auditor:
1. Balance Sheet (Point in time):
   - Assets (Cash, AR)
   - Liabilities (Deposits held, AP if tracked)
   - Equity (Retained earnings)

2. Profit & Loss (Period):
   - Income (Rent, CAM, Fees)
   - Expenses (Maintenance, Management, Taxes)
   - Net Income

3. Cash Flow Statement (Period):
   - Operating activities
   - Investing activities (CAPEX)
   - Financing activities (owner distributions)

All derived from ledger queries, exported to Excel/PDF

Data Retention Policy
* Ledger entries: NEVER delete (permanent)
* Audit logs: Keep 7 years (IRS requirement)
* Tenant records: Keep 7 years after lease end
* Lease documents: Keep permanently (or per state law)
* Payment receipts: Keep 7 years

Backup strategy:
* Daily automated Postgres backups (retained 90 days)
* Monthly snapshot to S3 (retained 7 years)
* Annual export to cold storage (Glacier)

12. Error Recovery & Reconciliation
Bank Reconciliation (Monthly)
Purpose: Ensure ledger cash matches actual bank balance
Process:
1. Export bank statement (CSV)
2. Upload to system
3. System matches transactions:
   - Ledger entry date + amount = bank transaction → auto-match
   - Unmatched items flagged for review
4. User manually matches remaining (e.g., date off by 1 day)
5. System identifies discrepancies:
   - In ledger, not in bank (check not cashed yet)
   - In bank, not in ledger (missing entry!)
6. Reconciliation report shows:
   - Ledger cash balance: $X
   - Bank balance: $Y
   - Outstanding checks: $Z
   - Deposits in transit: $A
   - Reconciled balance: $X = $Y + $Z - $A ✓

UI: Split-screen (ledger on left, bank on right), drag-to-match

Dispute Handling
Scenario: Tenant disputes a charge
Process:
1. Navigate to disputed charge (in ledger)
2. Click "Dispute" button
3. System marks entry with metadata: {disputed: true, disputeReason: "...", disputedAt: timestamp}
4. Entry still shows on statement but flagged: "⚠ Disputed"
5. Resolution options:
   a. Void the charge (if tenant is right)
   b. Add note explaining charge (if charge is valid)
   c. Partial credit (post adjustment entry)
6. Dispute log tracked in audit table

Correction Procedures
Scenario: Rent was posted to wrong account
Process:
1. Identify incorrect entry (e.g., posted to account 5000 instead of 1200)
2. Navigate to entry detail → Click "Void & Repost"
3. System:
   a. Voids original entry (creates offsetting entry)
   b. Opens form to create corrected entry (pre-filled with corrected values)
   c. User confirms → new entry posted
4. Audit trail shows: "Voided and reposted to correct account by [user] on [date]"

Critical Rule: NEVER edit ledger entries directly - always void + repost

Failed Job Recovery
Scenario: Recurring charge job fails (e.g., database timeout)
Process:
1. Job added to failed_jobs table with error details
2. Daily report emailed to admin: "3 charges failed to post"
3. Admin navigates to Failed Jobs dashboard
4. For each failed job:
   - View error message
   - Options:
     a. Retry (re-runs job)
     b. Skip (marks as resolved, no action)
     c. Manual post (opens form to post manually)
5. Idempotency ensures retry is safe

UI: Table with red status badges, "Retry All" bulk action

Month-End Close Validation
Checklist (all must pass):
1. ✓ Trial balance: SUM(debits) = SUM(credits)
2. ✓ No failed jobs in queue
3. ✓ All recurring charges posted for month
4. ✓ Security deposit reconciliation: Cash = Liability
5. ✓ No ledger entries with status = NULL (data integrity check)
6. ✓ All leases have valid account codes in recurring charges

If any fail → system blocks close, shows specific fix instructions

13. Testing Strategy (Critical for Financial Code)
Unit Tests
Scope: Every posting function
Framework: Jest (TypeScript)
Coverage Target: 100% for accounting service

Example tests:
test('createLedgerEntry: posts entry with valid data', async () => {
  const entry = await createLedgerEntry({
    idempotencyKey: 'test:123',
    accountCode: '1200',
    amount: new Decimal('1000.00'),
    debitCredit: 'DR',
    // ...
  });
  expect(entry.amount).toBe('1000.00');
  expect(entry.status).toBe('POSTED');
});

test('createLedgerEntry: rejects negative amount', async () => {
  await expect(createLedgerEntry({
    amount: new Decimal('-100'),
    // ...
  })).rejects.toThrow('Amount must be positive');
});

test('createLedgerEntry: idempotency - returns existing entry', async () => {
  const key = 'test:duplicate';
  const entry1 = await createLedgerEntry({ idempotencyKey: key, ... });
  const entry2 = await createLedgerEntry({ idempotencyKey: key, ... });
  expect(entry1.id).toBe(entry2.id); // Same entry returned
});

Integration Tests
Scope: Full workflows end-to-end
Framework: Supertest (API testing)

Example test:
test('Full lease lifecycle: create → charge → pay → move-out', async () => {
  // 1. Create lease
  const lease = await api.post('/leases').send({ tenantId, unitId, ... });

  // 2. Add recurring charge
  await api.post(`/leases/${lease.id}/recurring-charges`).send({ amount: 1000 });

  // 3. Trigger recurring charge job
  await postRecurringCharges(new Date('2026-01-01'));

  // 4. Verify ledger entry created
  const balance = await getTenantBalance(lease.tenant_id);
  expect(balance).toBe('1000.00');

  // 5. Record payment
  await api.post(`/leases/${lease.id}/payments`).send({ amount: 1000 });

  // 6. Verify balance cleared
  const newBalance = await getTenantBalance(lease.tenant_id);
  expect(newBalance).toBe('0.00');

  // 7. Move out
  await api.post(`/leases/${lease.id}/move-out`).send({ moveOutDate: '2026-06-01' });

  // 8. Verify deposit returned
  const depositEntries = await getDepositEntries(lease.id);
  expect(depositEntries).toHaveLength(2); // Deposit in + deposit out
  expect(sum(depositEntries.map(e => e.amount))).toBe('0.00'); // Net zero
});

Property-Based Tests (Advanced)
Scope: Verify invariants hold for ALL inputs
Framework: fast-check (property-based testing)

Example test:
test('Property: Total debits always equal total credits', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(arbitraryLedgerEntry()), // Generate random entries
      async (entries) => {
        for (const entry of entries) {
          await createLedgerEntry(entry);
        }
        const trialBalance = await getTrialBalance();
        const totalDebits = sum(trialBalance.map(a => a.total_debits));
        const totalCredits = sum(trialBalance.map(a => a.total_credits));
        expect(totalDebits).toBe(totalCredits);
      }
    )
  );
});

Concept: Generate hundreds of random ledger entries, verify system invariants never break

Reconciliation Tests
Scope: Verify derived balances are correct
Strategy: Post known entries, query balance, assert expected value

Example test:
test('Tenant balance derivation: charge - payment = balance', async () => {
  const leaseId = 'test-lease-123';

  // Post charge
  await createLedgerEntry({
    idempotencyKey: 'charge-1',
    entityType: 'lease',
    entityId: leaseId,
    accountCode: '1200',
    amount: new Decimal('1000'),
    debitCredit: 'DR',
    // ...
  });

  // Post payment
  await createLedgerEntry({
    idempotencyKey: 'payment-1',
    entityType: 'lease',
    entityId: leaseId,
    accountCode: '1200',
    amount: new Decimal('600'),
    debitCredit: 'CR',
    // ...
  });

  // Verify balance
  const balance = await getLeaseBalance(leaseId);
  expect(balance).toBe('400.00'); // 1000 - 600 = 400
});

Manual Testing Checklist (Pre-Launch)
□ Create property → Create tenant → Create lease with recurring charges
□ Verify recurring charges post on schedule
□ Record payment with manual allocation
□ Post one-time charge (late fee)
□ Void a charge (test void mechanics)
□ Move out tenant, verify deposit return
□ Generate tenant statement (PDF looks good?)
□ Generate property P&L
□ Run trial balance (debits = credits?)
□ Simulate failed job, verify dead-letter queue
□ Test idempotency: run same job twice, verify no double-post
□ Test bank reconciliation import
□ Test month-end close validation

Performance Tests (Phase 2+)
Scope: Ensure system scales to 100+ properties, 1000+ tenants
Tools: k6 (load testing)
Scenarios:
* 100 concurrent payment posts
* Generate 1000 tenant statements
* Query balance for 1000 leases (should be <100ms per query)

14. Phase 0 Build Plan (Foundation - Weeks 1-4)
Goal: Ledger + Core Posting Functions (No UI Yet)
Week 1: Database Setup
□ Install PostgreSQL 15
□ Create database: property_management
□ Design schema (DDL files):
  - chart_of_accounts table
  - ledger_entries table (with all constraints)
  - audit_log table
  - Triggers for audit trail
□ Seed data: baseline chart of accounts (accounts 1000, 1200, 2100, 4000, 5000, etc.)
□ Write migration files (Prisma migrate)
□ Test: Insert sample entries, verify constraints work

Deliverable: Database is live, schema documented

Week 2: Accounting Service (Core Logic)
□ Set up Node.js + TypeScript + NestJS project
□ Install Prisma, generate types
□ Implement AccountingService:
  - createLedgerEntry() function
  - voidLedgerEntry() function
  - getTrialBalance() query
  - getTenantBalance() query
  - getLeaseStatement() query
□ Write unit tests (Jest)
□ Test idempotency manually (run same entry twice)

Deliverable: accounting.service.ts with 100% test coverage

Week 3: Job Queue Setup
□ Install BullMQ + Redis (local for dev)
□ Create RecurringChargesJob:
  - Queries active recurring charges
  - Calls createLedgerEntry() for each
  - Handles failures → dead-letter queue
□ Create BackfillJob (for missed runs)
□ Test: Schedule job for tomorrow, advance system clock, verify post
□ Test: Kill job mid-run, restart, verify idempotency

Deliverable: Jobs run reliably, no double-posts

Week 4: API Layer (REST Endpoints)
□ Create REST API (NestJS controllers):
  - POST /ledger/entries (manual entry)
  - POST /ledger/entries/:id/void
  - GET /ledger/trial-balance
  - GET /leases/:id/balance
  - GET /leases/:id/statement
□ Add authentication (Clerk or Auth0 integration)
□ Add request logging (Pino)
□ Test with Postman/Insomnia

Deliverable: API is functional, secured, documented (OpenAPI spec)

Phase 0 Acceptance Criteria:
✓ Can post ledger entry via API
✓ Can void entry via API
✓ Can query tenant balance (derived from ledger)
✓ Recurring charges post automatically on schedule
✓ Idempotency prevents double-posting
✓ Trial balance query returns correct totals (debits = credits)
✓ Unit tests pass (100% coverage on accounting service)
✓ Integration test: full lease lifecycle works end-to-end

Phase 1 Build Plan (Operational Tables + Basic UI - Weeks 5-8)
Goal: Add properties, tenants, leases, units tables + simple admin UI
Week 5-6: Operational Tables
□ Create tables: properties, units, tenants, leases, recurring_charges
□ Add foreign keys to ledger_entries (property_id in metadata)
□ Write Prisma schema
□ Create seed script (sample properties, tenants, leases)
□ Write CRUD API endpoints for each table

Week 7-8: Admin UI (Internal Tool)
Option A: Use Retool (fastest)
  - Connect to Postgres
  - Build forms for: Create Property, Create Tenant, Create Lease
  - Build table views for: List Properties, List Leases
  - Build payment form with manual allocation

Option B: Build custom UI (Next.js + shadcn/ui)
  - Set up Next.js project
  - Install shadcn/ui components
  - Build pages: Properties, Tenants, Leases
  - Build forms: Create Lease (multi-step wizard)
  - Build payment modal

Deliverable: Can manage full lease lifecycle via UI (no more API testing)

Phase 1 Acceptance Criteria:
✓ Can create property via UI
✓ Can create tenant via UI
✓ Can create lease with recurring charges via UI
✓ Can record payment with manual allocation via UI
✓ Tenant statement generates correctly (PDF)
✓ Dashboard shows key metrics (total rent, occupancy, overdue)

Phase 2 Build Plan (Advanced Features - Weeks 9-16)
□ Stripe integration (online payments)
□ Automated email: tenant statements, payment receipts
□ Bank reconciliation tool
□ Owner statements (property-level P&L)
□ Vendor tracking + expense entry
□ 1099 generation
□ Move-out workflow (wizard)
□ Late fee automation (configurable grace periods)
□ Document storage (S3 + lease PDF viewer)
□ Mobile-responsive UI improvements

Phase 3 Build Plan (Tenant Portal - Weeks 17-24)
□ Tenant login (Clerk auth)
□ Tenant dashboard: current balance, upcoming charges
□ Online payment (Stripe integration)
□ View payment history
□ Download statements (PDF)
□ Maintenance request submission (future: work order system)

15. Development Environment Setup
Local Development Stack
1. PostgreSQL 15:
   brew install postgresql@15
   brew services start postgresql@15
   createdb property_management

2. Redis (for BullMQ):
   brew install redis
   brew services start redis

3. Node.js 20+:
   brew install node@20

4. Project Setup:
   mkdir pms-backend && cd pms-backend
   npm init -y
   npm install @nestjs/core @nestjs/common prisma @prisma/client bullmq ioredis
   npm install -D typescript @types/node jest ts-jest
   npx prisma init

5. Environment Variables (.env):
   DATABASE_URL="postgresql://user:pass@localhost:5432/property_management"
   REDIS_URL="redis://localhost:6379"
   JWT_SECRET="your-secret-key"
   CLERK_API_KEY="your-clerk-key"

6. Database Migrations:
   npx prisma migrate dev --name init
   npx prisma generate

7. Run Development Server:
   npm run start:dev

Docker Compose (Alternative)
For team consistency, use Docker:

version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: property_management
      POSTGRES_USER: pms_user
      POSTGRES_PASSWORD: pms_pass
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://pms_user:pms_pass@postgres:5432/property_management
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

volumes:
  pgdata:

Run: docker-compose up

16. Security Considerations
Authentication & Authorization
* All API endpoints require authentication (JWT from Clerk/Auth0)
* Role-based access control:
  - ADMIN: Full access (can void entries, manage users)
  - ACCOUNTANT: Can post entries, view all data
  - PROPERTY_MANAGER: Can create leases, record payments (posts via API, not direct ledger access)
  - TENANT: Can view own statements, make payments (read-only for ledger)
* Ledger write endpoints: ADMIN or ACCOUNTANT only
* API rate limiting: 100 requests/minute per user

Data Protection
* Passwords: Never stored (managed by auth provider)
* Sensitive data (SSN, Tax ID): Encrypted at rest (Postgres pgcrypto)
* Payment tokens: Never stored (Stripe handles via tokenization)
* PII: GDPR-compliant deletion (tenant requests)
* Audit log: Record all ledger writes (who, when, what, why)

Infrastructure Security
* HTTPS only (TLS 1.3)
* Database: No public access (VPC-only)
* Environment secrets: Stored in managed secret manager (AWS Secrets Manager, not .env in prod)
* Backup encryption: S3 server-side encryption
* Principle of least privilege: DB user for app has no DELETE permission on ledger table

SQL Injection Prevention
* Prisma ORM: Parameterized queries by default
* No raw SQL for user input
* Input validation: Zod schemas on all API inputs

17. Deployment Architecture (Production-Ready)
Phase 0-1: Simple Deployment (Render.com)
┌─────────────────┐
│   Render.com    │
│  ┌───────────┐  │
│  │ Web Service│  │ ← NestJS API (Node.js)
│  └───────────┘  │
│  ┌───────────┐  │
│  │ PostgreSQL│  │ ← Managed Postgres
│  └───────────┘  │
│  ┌───────────┐  │
│  │   Redis   │  │ ← Managed Redis
│  └───────────┘  │
└─────────────────┘
Cost: ~$50/month
Pros: Zero ops, auto-deploy from GitHub, backups included
Cons: Limited scalability, no multi-region

Phase 2+: AWS Deployment
┌─────────────────────────────────────┐
│ AWS                                 │
│  ┌─────────────────┐                │
│  │ CloudFront (CDN)│                │
│  └────────┬────────┘                │
│           │                         │
│  ┌────────▼────────┐                │
│  │ S3 (Static UI)  │                │
│  └─────────────────┘                │
│           │                         │
│  ┌────────▼────────┐                │
│  │ ALB (Load Bal.) │                │
│  └────────┬────────┘                │
│           │                         │
│  ┌────────▼────────┐                │
│  │ ECS (Containers)│ ← NestJS API   │
│  │  - Task 1       │                │
│  │  - Task 2       │                │
│  └────────┬────────┘                │
│           │                         │
│  ┌────────▼────────┐                │
│  │ RDS PostgreSQL  │ ← Multi-AZ     │
│  │  (Primary + RR) │                │
│  └─────────────────┘                │
│  ┌─────────────────┐                │
│  │ ElastiCache     │ ← Redis        │
│  └─────────────────┘                │
│  ┌─────────────────┐                │
│  │ S3 (Backups)    │ ← Daily dumps  │
│  └─────────────────┘                │
└─────────────────────────────────────┘
Cost: ~$300-500/month (depends on usage)
Pros: Scalable, multi-AZ, enterprise-grade
Cons: More ops overhead

Monitoring & Alerts
* Application: Sentry (error tracking), Datadog (APM)
* Infrastructure: CloudWatch (AWS), Render Metrics
* Alerts:
  - Any 500 error in AccountingService → page on-call engineer
  - Failed recurring charge job → email daily digest
  - Trial balance mismatch → immediate Slack alert
  - Database CPU >80% → email infra team
* Uptime monitoring: UptimeRobot (ping /health endpoint every 5 min)

Backup Strategy
* Database:
  - Automated daily backups (Render/RDS handles this)
  - Retain 90 days of point-in-time recovery
  - Monthly snapshot exported to S3 (long-term retention)
  - Test restore monthly (automate this!)
* Application code:
  - GitHub (version control)
  - Tagged releases (semantic versioning)
* Documents (PDFs, images):
  - S3 with versioning enabled
  - Lifecycle policy: transition to Glacier after 1 year

Disaster Recovery
* RTO (Recovery Time Objective): 4 hours
* RPO (Recovery Point Objective): 1 hour (max data loss)
* Runbook:
  1. Detect outage (monitoring alert)
  2. Assess severity (DB corruption vs app crash)
  3. If DB issue: restore from latest backup
  4. If app issue: rollback to previous deploy
  5. Verify: Run trial balance query, check recent entries
  6. Communicate: Update status page, notify users

18. Decision Log (Key Architectural Choices)
Decision 1: Single-Entry (Phase 0) → Double-Entry (Phase 2)
Why: Simpler to implement, easier to understand, sufficient for initial MVP
Trade-off: Not standard accounting practice, will need migration later
Migration plan: Add journal_entry table, backfill existing entries
Timeline: After first 10 leases are live

Decision 2: Manual Payment Allocation (No Waterfall)
Why: User knows their priorities better than code
Trade-off: More clicks, potential for human error
Mitigation: Validation (total must match), suggested allocation
Reconsider: If users consistently allocate the same way, add "Auto-Allocate" button

Decision 3: No Multi-Tenancy (Phase 0)
Why: Single property management company, no need for tenant isolation
Trade-off: Cannot sell as SaaS easily
Future: If pivoting to SaaS, add company_id to all tables, row-level security

Decision 4: PostgreSQL Over NoSQL
Why: ACID guarantees critical for financial data, schema enforcement prevents errors
Trade-off: Harder to scale horizontally (but unlikely to hit limits)
Rejected: MongoDB (eventual consistency risk)

Decision 5: Idempotency via Unique Constraint (Not Distributed Lock)
Why: Simpler, leverages database guarantees, no external dependency (Redis lock)
Trade-off: Relies on database to serialize concurrent writes
Risk: Low (Postgres handles this well)

Decision 6: Jobs in Postgres (pg-boss) for Critical Paths
Why: Same ACID guarantees as ledger, survives Redis failure
Trade-off: Slower than BullMQ
Usage: Financial workflows only (move-in, move-out); bulk jobs use BullMQ

Decision 7: UI Framework: Next.js (Not React SPA)
Why: Server components prevent client-side math, better SEO, simpler auth
Trade-off: Steeper learning curve vs plain React
Timeline: Phase 1+ (use Retool for Phase 0 admin UI)

Decision 8: Managed Auth (Clerk) Over Custom
Why: Don't reinvent security (password hashing, MFA, breach detection)
Trade-off: Vendor dependency, monthly cost (~$25)
Rejected: Rolling own auth (too risky for financial app)

19. Future Enhancements (Post-MVP)
Phase 4: Advanced Automation
* Auto-allocate payments (waterfall: oldest charges first)
* Late fee automation (configurable grace periods, max fees)
* Lease renewal automation (copy recurring charges to new term)
* Rent increase automation (apply % increase on anniversary)
* Pro-rata calculations (system calculates mid-month move-ins)

Phase 5: Integrations
* QuickBooks sync (bidirectional ledger sync)
* Stripe Connect (collect payments on behalf of owners)
* DocuSign (e-signature for leases)
* Plaid (bank account verification for ACH payments)
* Twilio (SMS reminders for rent due)
* Zapier webhooks (custom integrations)

Phase 6: Advanced Reporting
* Custom report builder (drag-drop columns, filters)
* Forecasting (projected cash flow based on active leases)
* Benchmarking (compare properties: $/sq ft, occupancy rate)
* Portfolio-level consolidation (roll up multiple properties)
* Variance analysis (actual vs budget)

Phase 7: Mobile App
* React Native app for property managers
* Push notifications: "Payment received", "Lease expiring"
* Photo capture: Move-in inspection, damage reports
* Offline mode: Record payment, sync when online

Phase 8: AI/ML Features
* Predictive late payment risk (flag tenants likely to be late)
* Smart rent pricing (suggest market-rate rent based on comps)
* Anomaly detection (flag unusual expenses for review)
* Natural language queries: "Which tenants are overdue?" → SQL

20. Conclusion & Next Steps
You Now Have:
✓ Complete technical architecture (database, backend, frontend)
✓ Full data model (ledger, COA, operational tables)
✓ Core workflows (lease creation, payments, move-out)
✓ UI/UX philosophy (modern, simple, manual-first)
✓ Testing strategy (unit, integration, property-based)
✓ Compliance plan (1099, deposits, retention)
✓ Deployment plan (Render → AWS)
✓ Phase 0 build plan (4 weeks to working API)

Next Actions:
1. Review this document (confirm everything aligns with your vision)
2. Set up development environment (Postgres, Node.js, Redis)
3. Create GitHub repo (initialize with .gitignore, README)
4. Week 1: Build database schema (DDL files, seed data)
5. Week 2: Build accounting service (core posting functions)
6. Week 3: Build job queue (recurring charges automation)
7. Week 4: Build API (REST endpoints, authentication)
8. End of Phase 0: You'll have a working ledger system (API-driven, no UI yet)

This Is Production-Ready:
* Idempotency prevents double-posting ✓
* Audit trail tracks every change ✓
* Constraints prevent bad data ✓
* Balances derived, never stored ✓
* Tests ensure correctness ✓
* Simple, manual workflows ✓

Let's Build This!
Ready to start with Phase 0 (Database Schema)? I can generate the Prisma schema file and initial migration.
