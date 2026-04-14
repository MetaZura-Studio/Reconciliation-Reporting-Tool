# Dev 1 — Next Steps After Merging Dev 2 (Single Combined Brief)

Paste this doc into Cursor after you create a new Dev1 branch **from the merged integration branch**.

---

## 1) Current snapshot

### Stack
- Next.js (App Router) + TypeScript + Tailwind
- Prisma + SQLite (`DATABASE_URL="file:./dev.db"`)
- Auth: httpOnly JWT session cookie + route protection middleware

### Core routes (ownership split)
- Dev 1 UI: `src/app/(auth)/**`, `src/app/(dashboard)/admin/**`, `src/app/(dashboard)/opco/**`, `src/app/(dashboard)/partner/**`
- Dev 2 UI: `src/app/(dashboard)/client/**`
- Dev 1 APIs: `src/app/api/auth/**`, `users/**`, `masters/**`, `reports/**`, `notifications/**`
- Dev 2 APIs: `src/app/api/reconciliation/**`, `invoices/**`, `collections/**`, `payments/**`, `search/**`, `audit/**`

Shared base (touch only if coordinated):
- `src/components/layout/**`, `src/components/ui/**`
- `src/lib/db.ts`, `src/lib/auth.ts`, `src/middleware.ts`
- `src/types/**`, `src/schemas/common/**`, `src/config/**`
- `prisma/schema.prisma`

---

## 2) What Dev 1 has already implemented

### Auth & access control (working)
- `POST /api/auth/login`: validates credentials, lockout on failed attempts, sets httpOnly cookie, returns role-based redirect
- `POST /api/auth/logout`: clears cookie
- `src/middleware.ts`: protects dashboards + role redirects
- `/login` UI form
- Seed admin: `admin@example.com / Admin@12345`

### Shared dashboard shell (working)
- `src/app/(dashboard)/layout.tsx` wraps all dashboards in shared shell
- `src/components/layout/*`: Sidebar (role-aware), Topbar (user + logout)

### Admin module (working)
- Users:
  - `GET/POST /api/users`
  - `PATCH /api/users/[id]`
  - UI: `/admin/users`
- Masters:
  - `GET/POST /api/masters/opcos`
  - `GET/POST /api/masters/partners`
  - `GET/POST /api/masters/services`
  - UI: `/admin/masters`

### Reports (Admin working; OpCo/Partner partial)
- Upload:
  - `POST /api/reports/upload` (multipart `meta` + `file`)
  - Saves file to `./uploads/<YYYY-MM>/...`
  - Stores metadata in `Report`
  - Blocks future period + duplicate key (revision flow not implemented)
- List:
  - `GET /api/reports` (filters)
  - Temporary rule: non-admin/non-client see only “submitted by me”
- UI:
  - `/admin/reports` (upload + list)
  - `/opco/reports` placeholder
  - `/partner/reports` placeholder

---

## 3) What Dev 2 has completed (Financial Core — first module)

### DB (Prisma + migration)
Added models/enums + migration:
- Models: `Reconciliation`, `ReconciliationItem`, `Invoice`, `Collection`, `Payment`, `AuditLog`
- Enums: `ReconciliationStatus`, `ReconciliationItemStatus`, `InvoiceStatus`, `PaymentStatus`
- Back-relations added on `User/OpCo/Partner/Service`
- Migration: `prisma/migrations/20260413134330_dev2_financial_core/migration.sql`

### Business rule enforced (critical)
**Partner invoice/payment processing eligibility depends on OpCo collections received.**
- Invoice status update blocks moving to `SENT|PARTIALLY_PAID|PAID` unless collections for **OpCo+month+year** cover invoice amount.
- Payment creation blocks `status=PROCESSED` (when invoice-linked) unless same condition holds.

### Dev 2 APIs (working)
- Reconciliation:
  - `POST /api/reconciliation/run`
  - `GET /api/reconciliation/results`
- Invoices:
  - `POST /api/invoices/generate`
  - `GET /api/invoices`
  - `PATCH /api/invoices/[id]/status` (eligibility enforced)
- Collections: `GET/POST /api/collections`
- Payments: `GET/POST /api/payments` (eligibility enforced)
- Search: `GET /api/search?q=...` (basic)
- Audit: `GET /api/audit`
- Module: `src/modules/audit/logger.ts` (`writeAudit(...)`)

### Dev 2 UI (working)
Client dashboard hub + pages:
- `/client` hub + links
- `/client/reconciliation`
- `/client/invoices`
- `/client/collections`
- `/client/payments`
- `/client/search` (JSON export)
- `/client/audit`

Known stubs (Dev 2):
- Reconciliation items are sample/stub (not parsing uploaded report files yet)
- Invoice generation not derived from reconciliation results yet
- Master ID pickers not implemented (IDs entered manually)

---

## 4) Merge checklist (must do after merging Dev 2 branch)

Run from repo root:

```powershell
npm install
npx prisma migrate dev
npx prisma generate
npm run build
npm run lint
```

If local DB is out of sync and you don’t care about local data:
- delete `dev.db` then re-run migrate + seed

---

## 5) Dev 1 work to do next (in order)

### Priority 1 — Entity assignments + enforcement (unblocks real OpCo/Partner usage)
1. Add Admin UI + APIs to manage:
   - `UserOpCo` assignments
   - `UserPartner` assignments
2. Enforce backend rules:
   - OpCo user can upload/view reports **only for assigned OpCo(s)**
   - Partner user can upload/view reports **only for assigned Partner(s)**
3. Update `/api/reports` visibility from “submittedById only” to role+assignment scoping.

### Priority 2 — Reports module completion (Dev 1)
1. Replace placeholders:
   - `/opco/reports`
   - `/partner/reports`
2. Implement SRS filters/status grid for “View Reports”.
3. Add **secure report download** endpoint:
   - authorized users only
   - do not expose raw file paths

### Priority 3 — Auth completion (SRS)
- Forgot password (token/OTP + expiry + email integration stub/log)
- Change password (complexity + reuse prevention)

### Priority 4 — Notifications & reminders (Dev 1)
- DB + API + UI for:
  - reminder settings (trigger, offsets, repeats, templates)
  - notification templates/settings
  - notification logs (even if sending is stubbed)

### Priority 5 — Masters expansion
- Add missing SRS master fields + edit/deactivate flows
- Manage Partner↔Service associations (`PartnerService`)

### Priority 6 — Non-client dashboards
- Admin/OpCo/Partner dashboards with real widgets and deep links per SRS.

---

## 6) Exact Cursor instruction for your new Dev1 branch (copy/paste)

**Goal:** Continue Dev1 after Dev2 merge; implement entity assignment enforcement and complete OpCo/Partner report flows.

- Ensure repo builds after merge (`npm install`, `prisma migrate dev`, `prisma generate`, `npm run build`, `npm run lint`).
- Implement Admin CRUD for `UserOpCo` + `UserPartner` assignments (UI + API).
- Enforce entity scope in:
  - `POST /api/reports/upload`
  - `GET /api/reports`
- Replace `/opco/reports` and `/partner/reports` placeholders with real upload/list pages using enforced scope.
- Add authorized report download endpoint.
- Do not modify Dev2-owned folders or shared base files without coordination.

