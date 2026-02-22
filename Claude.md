# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PMS 2026 Industrial — warehouse/industrial property management system. Next.js 14 + React 18 + TypeScript + Prisma + PostgreSQL. Deployed on Vercel.

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Prisma generate + Next.js build
- `npm run start` — Production server
- `npm run lint` — ESLint
- `npm test` — Jest test runner
- `npm run test:watch` — Jest in watch mode
- `npm run test:coverage` — Jest with coverage
- `npm run db:studio` — Prisma Studio
- `npm run db:migrate` — Prisma migrate dev
- `npm run db:seed` — Run seed script
- `npm run db:generate` — Regenerate Prisma client

## Architecture

- **App Router** (Next.js 14) — all pages under `src/app/`
- **Path alias**: `@/*` maps to `./src/*`
- **Authentication**: Middleware-based using `ADMIN_SECRET` header. Tenant portal uses token auth. Stripe webhooks use signature verification. Cron jobs use `CRON_SECRET`.
- **PWA**: next-pwa generates service worker + offline fallback (disabled in dev)
- **Sentry**: Error tracking with 20% trace sampling, 10% session replay (100% on error)

### Key Directories

- `src/app/` — Pages: accounting, leases, ledger, properties, maintenance, vendors, reports, expenses, bills-due, rent-increases, settings, tenant portal
- `src/app/api/` — 32+ API routes (CRUD, cron jobs, webhooks, search, reports)
- `src/components/` — AppLayout, Sidebar, GlobalSearch, Toast, UI primitives
- `src/lib/accounting.ts` — Core ledger posting (postEntry, postDoubleEntry, postBalancedEntries)
- `src/lib/api-utils.ts` — Error handling, rate limiting
- `src/lib/stripe.ts` — Payment processing
- `src/lib/qstash.ts` — Job queue client
- `src/lib/validation.ts` — Zod schemas
- `src/lib/audit.ts` — Audit logging
- `prisma/schema.prisma` — Full data model
- `tests/integration/` — 10+ integration test suites

### Financial System (Ledger-First)

INSERT-only ledger. Entries are never deleted — only voided (EntryStatus: POSTED or VOID). All transactions must balance (DR = CR). Idempotency enforced via `idempotencyKey` unique constraint.

- `ChartOfAccounts` — Account types: ASSET, LIABILITY, INCOME, EXPENSE, EQUITY
- `LedgerEntry` — Immutable journal entries with debit/credit
- `AuditLog` — Tracks all financial actions (who, what, when, IP, amount)

### Key Models

- Property/Unit — Warehouse properties with industrial specs (clear height, dock doors)
- Lease — Tenant leases with Stripe autopay, portal tokens, scheduled charges
- ScheduledCharge/ScheduledExpense — Recurring automated postings
- WorkOrder — Maintenance tracking with status updates and photos
- BankAccount/Reconciliation/ReconciliationLine — Bank reconciliation workflow
- Vendor — Vendor management with payment terms
- DocumentTemplate — Templates with merge fields

### Integrations

- **Stripe** — Rent collection, autopay, webhook idempotency tracking
- **QStash (Upstash)** — Cron jobs for rent posting, expense posting, autopay
- **Vercel KV** — Distributed rate limiting and caching
- **Sentry** — Error tracking and session replay

### Testing

Jest + ts-jest with supertest for API testing. Test helpers in `tests/setup.ts` provide `createTestLease()`, `cleanupTestData()`, and `generateTestToken()`. Cleanup voids ledger entries (never deletes) to maintain immutability. 30-second timeout.

## Workflow Rules

1. Read codebase first, write plan to `tasks/todo.md` with checkable items
2. Check in before starting work for plan verification
3. Keep changes simple — impact as little code as possible
4. No lazy fixes — find root causes
5. Add a review section to todo.md summarizing changes
