# Dev 2 Handoff — Reconciliation & Reporting Tool

This document is for **Developer 2** to paste into Cursor after pulling the project.

## Quick start (Windows)

### 1) Node
- Use Node.js installed on your machine.

### 2) Important: Windows path gotcha (`&`)
If your local folder path contains an ampersand (example: `Reconciliation & Reporting Tool`), some npm postinstall scripts can break on Windows.

**Recommended fix:** create a junction and work from it:

```powershell
cmd /c 'mklink /J E:\RRT "E:\Reconciliation & Reporting Tool"'
cd E:\RRT\reconciliation-reporting-tool
```

If you don’t have `&` in your path, just `cd` into the repo normally.

### 3) Install deps

```powershell
npm install
```

### 4) Database + Prisma (SQLite)

```powershell
npx prisma migrate dev
npx prisma generate
```

### 5) Seed admin user (optional but useful)

```powershell
npm run db:seed
```

Seeded credentials:
- Email: `admin@example.com`
- Password: `Admin@12345`

### 6) Run the app

```powershell
npm run dev
```

Open:
- `http://localhost:3000`

## What already exists (from Dev 1)

- **Auth**: login API + httpOnly JWT session cookie + logout
- **Role redirects**: `/` and `/login` redirect to role dashboards
- **Route protection**: middleware blocks dashboards without session
- **Shared shell**: sidebar + topbar + logout (used by all routes under `src/app/(dashboard)/**`)
- **Admin working screens**
  - `/admin/users` (create/list/update user status)
  - `/admin/masters` (create/list OpCos, Partners, Services)
  - `/admin/reports` (upload report + list recent reports)
- **Reports API**
  - `POST /api/reports/upload` (multipart meta+file, stores file on disk, stores metadata in DB)
  - `GET /api/reports` (list/filter; non-admin currently limited to “submitted by me”)

## Ownership split (follow strictly)

### Dev 2 owns (safe to edit freely)
- **UI routes**
  - `src/app/(dashboard)/client/**`
- **API routes**
  - `src/app/api/reconciliation/**`
  - `src/app/api/invoices/**`
  - `src/app/api/collections/**`
  - `src/app/api/payments/**`
  - `src/app/api/search/**`
  - `src/app/api/audit/**`
- **Modules**
  - `src/modules/reconciliation/**`
  - `src/modules/invoices/**`
  - `src/modules/collections/**`
  - `src/modules/payments/**`
  - `src/modules/search/**`
  - `src/modules/audit/**`
  - `src/modules/dashboard/**` (client-only area)
- **Components**
  - `src/components/reconciliation/**`
  - `src/components/invoices/**`
  - `src/components/dashboard/client/**`

### Shared base — do NOT change without coordination
- `src/components/layout/**` (shell)
- `src/components/ui/**` (design system)
- `src/lib/db.ts`, `src/lib/auth.ts`
- `src/middleware.ts`
- `src/types/**`, `src/schemas/common/**`, `src/config/**`
- `prisma/schema.prisma` (coordinate schema changes)

## API contract notes (start implementing against these)

Dev 2 modules should assume these “upstream” concepts are stable:
- **Roles**: `ADMIN | CLIENT | OPCO | PARTNER`
- **Report statuses/types** are in Prisma schema and should be reused, not redefined.

Suggested Dev 2 endpoints (initial pass):
- `POST /api/reconciliation/run`
- `GET /api/reconciliation/results`
- `POST /api/invoices/generate`
- `PATCH /api/invoices/:id/status`
- `POST /api/collections`
- `POST /api/payments`
- `GET /api/audit` (later)
- `GET /api/search` (later)

## Key business rule (do not miss)
- **Partner invoice processing eligibility depends on OpCo collections received**.
  - This rule must be enforced in backend status transitions and UI states.

## Environment variables
Current `.env`:
- `DATABASE_URL="file:./dev.db"`
- `AUTH_JWT_SECRET="dev-secret-change-me"`

## Current tech constraints
- Prisma is currently pinned to **v6** for compatibility with the current generated client setup.
  - Don’t upgrade Prisma without coordinating because it changes client config expectations.

