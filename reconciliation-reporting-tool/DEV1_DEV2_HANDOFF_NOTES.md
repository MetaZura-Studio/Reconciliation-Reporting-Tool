# Dev 1 → Dev 2 Handoff Notes (Invoices UI + security)

This note documents **Dev 1 additions** that may affect Dev 2, and the recommended changes for Dev 2-owned endpoints to keep security + ownership clean.

## What Dev 1 added (SRS: Partner invoice upload + view own invoices)

### New DB table (Dev 1-owned)
- **`PartnerInvoiceUpload`** (Prisma model)
  - Stores partner-uploaded invoice files (metadata + filePath) for later processing.
  - Purpose: unblock the **Partner “Upload Partner Invoice”** screen without changing Dev 2 financial invoice workflow.

### New Partner routes (Dev 1 UI)
- **`/partner/invoices`**
  - Tabs:
    - **Uploads**: reads from Dev 1 upload table
    - **Invoice records**: reads from a scoped API (see below)
- **`/partner/invoices/upload`**
  - Uploads invoice file + metadata (partnerId/serviceId/month/year).

### New Partner APIs (Dev 1 backend)
- **`GET /api/partner/invoices`**
  - Lists partner invoice uploads (scoped to partner assignments).
- **`POST /api/partner/invoices/upload`**
  - Upload endpoint (multipart) that writes file into `uploads/partner-invoices/...` and inserts DB row.
  - Requires role `PARTNER` and assigned `partnerId` via `UserPartner`.
- **`GET /api/partner/invoices/[id]/download`**
  - Secure download for uploaded invoice files.
- **`GET /api/partner/invoices/financial`**
  - Returns **financial invoices** from Dev 2 `Invoice` table, but **scoped** to the logged-in partner’s assignments.
  - This exists because Dev 2 `GET /api/invoices` is currently not scoped by role (partners must not receive all invoices).

## What Dev 2 should change (recommended)

### 1) Add role-based scoping to `GET /api/invoices`
Current `GET /api/invoices` returns the latest 50 invoices for **any logged-in user**.

**Required** for security:
- If role is `PARTNER`: only return invoices where `partnerId` is in `UserPartner` assignments.
- If role is `OPCO`: only return invoices where `opcoId` is in `UserOpCo` assignments.
- If role is `CLIENT` or `ADMIN`: keep broad access (or implement your own scoping rules).

Once Dev 2 implements this, Dev 1 can **delete** the temporary endpoint:
- `GET /api/partner/invoices/financial`

### 2) Decide how uploaded invoice files map into Dev 2 financial workflows
Dev 1 has stored uploaded invoice files in `PartnerInvoiceUpload`.

Dev 2 should decide:
- Whether to parse these uploads and create/update `Invoice` records
- Whether they remain “attachments” linked to invoices

If you want a link:
- Add `partnerInvoiceUploadId` (nullable) onto Dev 2 `Invoice` model, or
- Add a join table (preferred if multiple files per invoice).

## Contract notes for Dev 2
- Dev 1 assignment tables (`UserOpCo`, `UserPartner`) are now being used for access control in multiple places.
- If Dev 2 needs “who can see which entity”, reuse these tables (do **not** duplicate).

