# Phase 2 Execution Plan (You + Dev 2)

This plan completes the remaining gaps vs the SRS after the current “vertical slice”.

Assumptions:
- Dev 1 owns: auth/users/masters/reports/notifications + admin/opco/partner UI.
- Dev 2 owns: client operations (reconciliation/invoices/collections/payments/search/audit) + client dashboard.
- Shared base files are coordinated per `PROJECT_OWNERSHIP.md`.

---

## 0) Branch + PR discipline (do this first)

Branches:
- `dev` (integration)
- `dev1/<feature>` and `dev2/<feature>`

PR rules:
- One module per PR
- No shared-base refactors in feature PRs
- Every PR includes:
  - impacted routes/APIs
  - data model changes (if any)
  - test steps

---

## 1) Milestone A — Report review + “Accepted reports” pipeline (unblocks reconciliation)

### Dev 2 delivers (owner)
**Goal:** Client/Admin can review uploaded reports and set them to Accepted/Rejected.

Deliverables:
- **UI** (Client/Admin):
  - “View All Reports” queue
  - Report detail viewer
  - Actions: Review → Accept/Reject + remarks
- **API**:
  - Add/implement review endpoint(s) on the existing reports API contract (coordinate with Dev 1)
  - Ensure report status transitions align to SRS (Submitted → Under Review → Accepted/Rejected)
- **Audit hooks**:
  - Write audit logs for review/accept/reject actions

Acceptance criteria:
- A Client user can accept/reject a report; status updates persist.
- Non-authorized users cannot perform review actions.

### Dev 1 delivers (supporting owner)
**Goal:** Ensure reports storage supports review lifecycle and remains secure.

Deliverables:
- Add any required report fields (only if Dev 2 needs them):
  - reviewerId, reviewedAt, reviewRemarks, etc.
- Ensure download endpoint remains secure.
- Update Admin/OpCo/Partner report list UIs to show new statuses.

Acceptance criteria:
- Reports list filters include status reliably (Admin/OpCo/Partner).

---

## 2) Milestone B — Real reconciliation (replace stub; finalize/reopen)

### Dev 2 delivers (owner)
**Goal:** Reconciliation uses Accepted reports, produces matched/mismatch sets, supports finalization and reopen.

Deliverables:
- **Data sourcing**:
  - Load Accepted OpCo + Partner report(s) for same period/service/entity keys
  - Block reconciliation when required reports are missing (SRS rule)
- **Workbench workflow**:
  - Matched vs mismatches vs missing
  - Clarification notes
  - Adjustments with mandatory reason
  - Save progress
  - Finalize (locks) + Reopen (requires reason)
- **Export**:
  - Export reconciliation results (format to be decided; Excel later milestone)
- **Audit coverage**:
  - Start, save, adjust, finalize, reopen

Acceptance criteria:
- Reconciliation cannot run without required Accepted source reports.
- Finalize makes reconciliation read-only; reopen restores edit ability with audit history.

### Dev 1 delivers (supporting owner)
**Goal:** Provide stable “report metadata & access” contract for Dev 2.

Deliverables:
- Ensure report keys are complete and queryable:
  - month/year/service/opco/partner/type/status
- If Dev 2 needs file-derived structured values, align on approach:
  - Dev 2 parses directly (requires safe access patterns), or
  - Dev 1 provides an extraction step/API (preferred if you want stricter control).

Acceptance criteria:
- Dev 2 can reliably locate the correct report set for a reconciliation key.

---

## 3) Milestone C — Reconciliation → invoice generation wiring

### Dev 2 delivers (owner)
**Goal:** OpCo invoices are generated from finalized/confirmed reconciliation outputs (SRS).

Deliverables:
- Invoice generation uses reconciliation confirmed values (no manual-only amount)
- Enforce “must be finalized” unless override is explicitly designed
- Expand invoice fields/statuses closer to SRS where possible

Acceptance criteria:
- Generating invoice from reconciliation is reproducible and traceable (audit log).

---

## 4) Milestone D — Partner invoice upload integration

### Dev 1 delivers (owner of upload UI/storage)
**Goal:** Partner invoice upload screen matches SRS fields.

Deliverables:
- Add missing SRS fields to Partner invoice upload:
  - related OpCo, invoice number, invoice date, currency, amount, etc.
- Update upload list grid accordingly
- Keep secure download + assignment enforcement

Acceptance criteria:
- Uploaded invoice record contains all SRS-required fields and validations.

### Dev 2 delivers (owner of financial workflow)
**Goal:** Uploaded partner invoices become part of the financial `Invoice` workflow.

Deliverables:
- Define linkage:
  - 1:1 `Invoice.partnerInvoiceUploadId` OR join table
- Implement statuses + transitions (On Hold / Eligible / Approved / Paid) driven by collections rule
- Client/Admin review partner invoices as per SRS

Acceptance criteria:
- Partner invoice eligibility and payment processing obey the collections rule end-to-end.

---

## 5) Milestone E — Notifications/reminders engine + real export

### Dev 1 delivers (owner)
**Notifications/reminders**
- Implement scheduler/trigger engine:
  - trigger events, offsets, repeats, duplicate suppression
  - write NotificationLog entries
- Email sending can remain stubbed initially, but logs must be correct.

### Dev 2 delivers (owner)
**Export + analytics**
- Implement Excel export for search/reconciliation/invoices/collections/payments
- Implement core analytics widgets and standard reports list (SRS reporting section)

---

## 6) Integration touchpoints (must coordinate)
- Report status lifecycle contract (Accepted/Rejected/Under Review)
- Reconciliation input keys + report selection rule
- Partner invoice upload ↔ Invoice linkage model
- Role/entity scoping using `UserOpCo` / `UserPartner` across Dev 2 endpoints
- Audit event coverage list (SRS 6.12.1)

