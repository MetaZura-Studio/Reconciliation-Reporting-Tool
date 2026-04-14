# Dev 2 — Start Here (Dev 1 Handoff)

This document summarizes **what Dev 1 has implemented**, what is **ready for Dev 2 to build on**, and what is **pending/required on Dev 2** to complete the system safely (security + integration).

Last updated: 2026-04-14

---

## 1) Dev 1 completed (high level)

### Platform foundation
- **Auth**: httpOnly JWT session cookie
  - Login / logout
  - Forgot password (token-based reset; email is stubbed via server log)
  - Change password (complexity + recent password reuse prevention)
- **Role routing + protection**: middleware redirects/blocks by role
- **Shared dashboard shell**: sidebar + topbar + logout

### Admin module
- **Users**: create users, update status
- **Entity assignments**:
  - Assign OpCos to OpCo users (`UserOpCo`)
  - Assign Partners to Partner users (`UserPartner`)
- **Masters**:
  - OpCos / Partners / Services: create + edit + deactivate (status field)
  - Partner↔Service associations (`PartnerService`) management (create/remove)
- **Reports**:
  - Upload + list with **role+assignment scoping**
  - Secure download endpoint (no raw file path exposure)
- **Notifications & reminders**:
  - Notification templates
  - Reminder settings
  - Notification logs (sending can remain stubbed)

### OpCo module (Dev 1)
- OpCo dashboard widgets + deep links
- OpCo Reports page (upload + list + download) with assignment enforcement

### Partner module (Dev 1)
- Partner dashboard widgets + deep links
- Partner Reports page (upload + list + download) with assignment enforcement
- **Partner invoice features (Dev 1 screens from the SRS)**
  - `/partner/invoices/upload`: upload invoice file + metadata
  - `/partner/invoices`: view uploads + view invoice records (read-only)

---

## 2) API routes owned/implemented by Dev 1 (current)

### Auth (Dev 1)
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/change-password`

### Users + assignments (Dev 1)
- `GET/POST /api/users`
- `PATCH /api/users/[id]`
- `GET/PUT /api/users/[id]/opcos`
- `GET/PUT /api/users/[id]/partners`
- `GET /api/users/me/assignments` (used by OpCo/Partner UIs)

### Masters (Dev 1)
- `GET/POST /api/masters/opcos`
- `PATCH /api/masters/opcos/[id]`
- `GET/POST /api/masters/partners`
- `PATCH /api/masters/partners/[id]`
- `GET/POST /api/masters/services`
- `PATCH /api/masters/services/[id]`
- `GET/POST/DELETE /api/masters/partner-services` (PartnerService link management)

### Reports (Dev 1)
- `GET /api/reports` (now role+assignment scoped for OPCO/PARTNER)
- `POST /api/reports/upload` (now enforces assignment for OPCO/PARTNER)
- `GET /api/reports/[id]/download` (secure download)

### Notifications & reminders (Dev 1)
- `GET/POST /api/notifications/templates`
- `PATCH /api/notifications/templates/[id]`
- `GET/POST /api/notifications/reminders`
- `PATCH /api/notifications/reminders/[id]`
- `GET /api/notifications/logs`

### Partner invoice upload (Dev 1)
- `POST /api/partner/invoices/upload` (multipart; assignment enforced)
- `GET /api/partner/invoices` (lists uploads; assignment scoped)
- `GET /api/partner/invoices/[id]/download` (secure download; assignment scoped)
- `GET /api/partner/invoices/financial` (**temporary** scoped view into Dev 2 Invoice table)

---

## 3) DB models added/extended by Dev 1

### Existing core models already in schema (Dev 1 side)
- `User`, `OpCo`, `Partner`, `Service`, `Report`
- Assignment join tables: `UserOpCo`, `UserPartner`
- Association table: `PartnerService`

### Added by Dev 1 (post-merge)
- **Auth**
  - `PasswordResetToken`
  - `PasswordHistory`
- **Notifications**
  - `NotificationTemplate`
  - `ReminderSetting`
  - `NotificationLog`
- **Partner invoice uploads**
  - `PartnerInvoiceUpload` (stores uploaded invoice files + metadata)

---

## 4) IMPORTANT: Security / access control rules to reuse (Dev 2)

Dev 1 is now enforcing entity scoping using:
- `UserOpCo` for OpCo access
- `UserPartner` for Partner access

Dev 2 should **reuse these exact tables** for access control (do not create parallel “assignments” tables).

---

## 5) Pending for Dev 2 (must-do checklist)

### A) Fix invoice list scoping (security-critical)
Current Dev 2 route:
- `GET /api/invoices` returns the latest invoices for **any logged-in user**.

**Dev 2 MUST update it** to scope by role:
- **PARTNER**: only invoices where `partnerId` is in the user’s `UserPartner` assignments
- **OPCO**: only invoices where `opcoId` is in the user’s `UserOpCo` assignments
- **ADMIN/CLIENT**: whatever broad access rules you intend

Once this is done, Dev 1 can remove:
- `GET /api/partner/invoices/financial` (temporary workaround)

### B) Decide how Partner invoice uploads integrate into financial processing
Dev 1 stores uploaded files in `PartnerInvoiceUpload`. Dev 2 must choose one of:
- Parse uploads → create/update `Invoice` records (and reconcile with collections/payments workflow)
- Treat uploads as attachments linked to invoices

If linking is needed, recommended approaches:
- Add `partnerInvoiceUploadId` to Dev 2 `Invoice` (simple 1:1), or
- Create a join table for 1:many (preferred if multiple files per invoice)

### C) Integration phase items (owned by Dev 2 in the SRS split)
These are Dev 2’s modules/screens:
- Reconciliation workbench + engine wiring
- Report review / accept / reject workflow
- Invoice status updates (eligibility rule already enforced)
- Collections tracking
- Partner payment processing
- Search/filter/export
- Audit logs UI + API
- Analytics/reporting widgets (client-oriented)

---

## 6) Notes on UI expectations for Dev 2

Dev 1 created/extended the shared patterns already in use:
- Tailwind-based pages with consistent layout wrappers
- Tables + filters are mostly “page-local” (no shared table component yet)

Dev 2 should:
- Reuse existing shell (`src/app/(dashboard)/layout.tsx`) and styling conventions
- Avoid modifying shared base files without coordination (`PROJECT_OWNERSHIP.md`)

