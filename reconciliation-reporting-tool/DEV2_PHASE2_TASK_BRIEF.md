# Dev 2 — Phase 2 Task Brief (SRS Completion)

This brief is actionable tasks for Dev 2 based on:
- current codebase state (vertical slice exists), and
- SRS gaps remaining.

Do **not** modify shared base files without coordination (`PROJECT_OWNERSHIP.md`).

---

## 1) Report review workflow (SRS 6.5.3 actions; Role matrix: Client/Admin)

### Target outcomes
- Client/Admin can:
  - open a report queue (all reports they’re authorized to see)
  - review and move report to **Under Review**
  - **Accept** or **Reject** with remarks
- Report status transitions follow SRS:
  - Submitted → Under Review → Accepted/Rejected

### Dev 2 tasks
- Implement Client/Admin UI screens:
  - View All Reports
  - Report detail + actions
- Implement/define review endpoints (coordinate with Dev 1, who owns reports API)
- Ensure audit logs are written for:
  - review start, accept, reject

### Dev 1 dependency
- Dev 1 will add any report fields you need (reviewerId/reviewedAt/remarks) if required.

---

## 2) Real reconciliation (SRS 6.7)

### Target outcomes
- Reconciliation can only run when required source reports exist and are accepted.
- Produces outcomes: matched/mismatch/missing.
- Supports:
  - clarification notes
  - adjustments with reason
  - save progress
  - finalize (lock) / reopen (reason)
  - export results

### Dev 2 tasks
- Replace stub run logic with real report-driven reconciliation.
- Persist reconciliation state and item statuses.
- Implement finalize/reopen rules and audit.

### Dev 1 dependency
- Reliable report metadata/query contract (already exists); parsing approach may require coordination.

---

## 3) Reconciliation → invoice generation wiring (SRS 8.3 + 11.4)

### Target outcomes
- OpCo invoices are generated from finalized/confirmed reconciliation values.
- Invoice uniqueness and required fields match SRS intent.
- Status transitions remain guarded by collections eligibility rule where applicable.

### Dev 2 tasks
- Add “generate invoice from reconciliation” workflow.
- Enforce “finalized required” unless explicit override is designed.
- Expand invoice list/filtering toward SRS.

---

## 4) Partner invoice upload integration (SRS 6.6.3)

### Current state
- Dev 1 stores partner-uploaded invoice files in `PartnerInvoiceUpload`.
- Dev 1 provides partner upload/list/download UI + APIs.

### Target outcomes
- Uploaded partner invoices become part of the financial invoice workflow:
  - Under Review → On Hold/Eligible → Approved → Paid
- Eligibility depends on OpCo collections received (already enforced in some places).

### Dev 2 tasks
- Decide linkage strategy:
  - `Invoice.partnerInvoiceUploadId` (1:1) OR join table (1:many)
- Implement review/processing statuses and transitions.
- Ensure collections rule affects eligibility and UI states.

---

## 5) Security scoping hardening (SRS role-based authorization)

### Must-have
- Ensure all Dev 2 list endpoints scope data by role + assignments:
  - invoices (already updated per Dev 2 handoff doc)
  - collections
  - payments
  - search
  - audit
  - reconciliation results

Use Dev 1 assignment join tables:
- `UserOpCo`
- `UserPartner`

---

## 6) Export + analytics (SRS reporting requirements)

### Target outcomes
- Excel export (mandatory per SRS) for key datasets
- Basic analytics/widgets and standard reports list

### Dev 2 tasks
- Add Excel export to search/results and core financial modules.
- Add summary widgets on Client dashboard aligned to SRS.

