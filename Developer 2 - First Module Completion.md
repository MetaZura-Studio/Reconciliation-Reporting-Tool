# Developer 2 — First Module Completion (Financial Core)

This document summarizes what Developer 2 implemented so Developer 1 can understand the changes and integrate safely.

## Scope boundary (Dev 2 only)

Implemented **financial core modules** (reconciliation, invoices, collections, payments, search/export, audit) inside **Dev 2–owned** routes/APIs/modules.

Notes:
- The implementation intentionally avoids changes to shared UI components (`src/components/ui/**`) and shared layout shell (`src/components/layout/**`).
- Auth/session behavior is reused via existing helpers (`requireUser()`), not reimplemented.

## What is now working (end-to-end)

From the Client dashboard:
- **Reconciliation**: create a reconciliation run and list recent runs.
- **Invoices**: generate invoices, list invoices, and update invoice status.
- **Collections**: record OpCo collections received and list collections.
- **Payments**: record partner payments and list payments.
- **Search & Export**: search across financial records and export results as JSON.
- **Audit**: view audit trail entries written by Dev 2 endpoints.

Build verification:
- `npm run build` succeeds after these changes.

## Critical business rule enforced

**Partner invoice processing eligibility depends on OpCo collections received.**

This rule is enforced at backend status transitions:
- Invoice status update endpoint blocks moving invoice into `SENT`, `PARTIALLY_PAID`, or `PAID` unless:
  - sum of `Collection.amount` for the invoice’s **OpCo + month + year** is **>= invoice.amount**
- Payment creation endpoint blocks recording a `PROCESSED` payment (when linked to an invoice) unless the same collections condition is met.

This ensures the UI cannot “force” an invoice/payment state that violates the collection eligibility rule.

## Database changes (Prisma + migration)

### Changed
- `reconciliation-reporting-tool/prisma/schema.prisma`
  - Added Dev 2 financial core models and enums:
    - `Reconciliation`, `ReconciliationItem`
    - `Invoice`
    - `Collection`
    - `Payment`
    - `AuditLog`
    - Enums: `ReconciliationStatus`, `ReconciliationItemStatus`, `InvoiceStatus`, `PaymentStatus`
  - Added **back-relations** on existing models:
    - `User` → `auditLogs`
    - `OpCo` → `reconciliations`, `invoices`, `collections`
    - `Partner` → `reconciliations`, `invoices`, `payments`
    - `Service` → `reconciliations`, `invoices`

### Created
- `reconciliation-reporting-tool/prisma/migrations/20260413134330_dev2_financial_core/migration.sql`
  - Migration generated and applied locally to create the new tables.

Environment note:
- Prisma config in this repo **skips automatic env loading**; during local migrations we used `DATABASE_URL="file:./dev.db"` when running Prisma.

## Backend API endpoints (Dev 2)

All endpoints below:
- Require an authenticated session using `requireUser()`
- Return JSON with `{ ok: boolean, ... }` patterns consistent with existing APIs
- Write audit entries for key mutations

### Reconciliation
- **Created** `reconciliation-reporting-tool/src/app/api/reconciliation/route.ts`
  - `GET` basic stub response (presence/health style)
- **Created/Changed** `.../src/app/api/reconciliation/run/route.ts`
  - `POST /api/reconciliation/run`
  - Creates a `Reconciliation` row
  - Creates a small set of `ReconciliationItem` rows (currently stubbed items)
  - Updates reconciliation to `COMPLETED`
  - Writes audit action: `RECONCILIATION_RUN`
- **Created/Changed** `.../src/app/api/reconciliation/results/route.ts`
  - `GET /api/reconciliation/results`
  - Lists recent reconciliations with counts and master references (service/opco/partner)

### Invoices
- **Changed** `reconciliation-reporting-tool/src/app/api/invoices/route.ts`
  - `GET /api/invoices` lists recent invoices with counts and master references
- **Changed** `.../src/app/api/invoices/generate/route.ts`
  - `POST /api/invoices/generate` creates an invoice (`GENERATED`) and writes audit `INVOICE_GENERATE`
- **Changed** `.../src/app/api/invoices/[id]/status/route.ts`
  - `PATCH /api/invoices/:id/status` updates invoice status and writes audit `INVOICE_STATUS_UPDATE`
  - Enforces the collections eligibility rule described above
  - Note: route handler signature updated to satisfy Next.js route typing for dynamic params

### Collections
- **Changed** `reconciliation-reporting-tool/src/app/api/collections/route.ts`
  - `GET /api/collections` lists recent collections
  - `POST /api/collections` records a collection and writes audit `COLLECTION_CREATE`

### Payments
- **Changed** `reconciliation-reporting-tool/src/app/api/payments/route.ts`
  - `GET /api/payments` lists recent payments
  - `POST /api/payments` records a payment and writes audit `PAYMENT_CREATE`
  - Enforces collections eligibility before accepting `status=PROCESSED` for invoice-linked payments

### Search
- **Changed** `reconciliation-reporting-tool/src/app/api/search/route.ts`
  - `GET /api/search?q=...` searches across invoices/collections/payments (basic contains search on id/reference/remarks/invoiceNumber)

### Audit
- **Changed** `reconciliation-reporting-tool/src/app/api/audit/route.ts`
  - `GET /api/audit` lists recent audit log entries with actor info

## Dev 2 server-side module added

### Created
- `reconciliation-reporting-tool/src/modules/audit/logger.ts`
  - `writeAudit(...)` helper used by Dev 2 APIs to record audit entries.

## Client dashboard UI (Dev 2)

### Changed
- `reconciliation-reporting-tool/src/app/(dashboard)/client/page.tsx`
  - Converted from placeholder to a **hub** page linking to all Dev 2 modules.

### Created/Changed (functional pages)
- `.../src/app/(dashboard)/client/reconciliation/page.tsx`
  - Form to run reconciliation + table of recent runs
- `.../src/app/(dashboard)/client/invoices/page.tsx`
  - Form to generate invoice + list + status update actions
- `.../src/app/(dashboard)/client/collections/page.tsx`
  - Form to record collection + list collections
- `.../src/app/(dashboard)/client/payments/page.tsx`
  - Form to record payment + list payments
- `.../src/app/(dashboard)/client/search/page.tsx`
  - Search input and a simple **JSON export** (downloads a `.json` file)
- `.../src/app/(dashboard)/client/audit/page.tsx`
  - Lists audit entries

UI notes:
- These pages use plain HTML inputs/buttons with Tailwind classes to avoid modifying shared UI components.
- IDs for `serviceId`, `opcoId`, `partnerId` are currently entered manually (no master pickers yet).

## Intentional “stub” parts (what’s not fully real yet)

- Reconciliation engine currently creates **sample** reconciliation items (it does not parse uploaded report files yet).
- Invoice generation currently takes amount/currency from UI input; it does not calculate from reconciliation results yet.
- Search/export is basic; export is JSON only.
- No strict role scoping beyond “must be logged in” (tenant/role constraints can be tightened later within Dev 2 scope).

## How Dev 1 can work with this

- Dev 1 can continue implementing report review/acceptance and dashboards without conflict.
- Integration points for later:
  - When report acceptance is implemented, Dev 1 can pass accepted `Report` IDs into Dev 2’s reconciliation run request (schema already has optional `opcoReportId`, `partnerReportId`, `clientReportId` fields for linkage).
- Dev 1 should avoid editing the Dev 2 API/UI folders listed above to prevent conflicts.

## Files summary (quick list)

### Created
- `reconciliation-reporting-tool/src/app/(dashboard)/client/audit/page.tsx`
- `reconciliation-reporting-tool/src/app/(dashboard)/client/collections/page.tsx`
- `reconciliation-reporting-tool/src/app/(dashboard)/client/invoices/page.tsx`
- `reconciliation-reporting-tool/src/app/(dashboard)/client/payments/page.tsx`
- `reconciliation-reporting-tool/src/app/(dashboard)/client/reconciliation/page.tsx`
- `reconciliation-reporting-tool/src/app/(dashboard)/client/search/page.tsx`
- `reconciliation-reporting-tool/src/app/api/audit/route.ts` (was stub earlier; now real)
- `reconciliation-reporting-tool/src/app/api/collections/route.ts` (was stub earlier; now real)
- `reconciliation-reporting-tool/src/app/api/invoices/[id]/status/route.ts` (was stub earlier; now real)
- `reconciliation-reporting-tool/src/app/api/invoices/generate/route.ts` (was stub earlier; now real)
- `reconciliation-reporting-tool/src/app/api/invoices/route.ts` (was stub earlier; now real)
- `reconciliation-reporting-tool/src/app/api/payments/route.ts` (was stub earlier; now real)
- `reconciliation-reporting-tool/src/app/api/reconciliation/results/route.ts` (was stub earlier; now real)
- `reconciliation-reporting-tool/src/app/api/reconciliation/run/route.ts` (was stub earlier; now real)
- `reconciliation-reporting-tool/src/app/api/reconciliation/route.ts`
- `reconciliation-reporting-tool/src/app/api/search/route.ts` (was stub earlier; now real)
- `reconciliation-reporting-tool/src/modules/audit/logger.ts`
- `reconciliation-reporting-tool/prisma/migrations/20260413134330_dev2_financial_core/migration.sql`

### Changed
- `reconciliation-reporting-tool/src/app/(dashboard)/client/page.tsx`
- `reconciliation-reporting-tool/prisma/schema.prisma`

