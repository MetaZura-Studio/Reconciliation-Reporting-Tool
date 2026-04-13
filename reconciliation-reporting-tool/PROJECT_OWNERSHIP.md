# Project Ownership (Dev 1 vs Dev 2)

Single source of truth to avoid merge conflicts.

## Route ownership

### Dev 1
- `src/app/(auth)/**`
- `src/app/(dashboard)/admin/**`
- `src/app/(dashboard)/opco/**`
- `src/app/(dashboard)/partner/**`

### Dev 2
- `src/app/(dashboard)/client/**`

## API ownership

### Dev 1
- `src/app/api/auth/**`
- `src/app/api/users/**`
- `src/app/api/masters/**`
- `src/app/api/reports/**`
- `src/app/api/notifications/**`

### Dev 2
- `src/app/api/reconciliation/**`
- `src/app/api/invoices/**`
- `src/app/api/collections/**`
- `src/app/api/payments/**`
- `src/app/api/search/**`
- `src/app/api/audit/**`

## Module ownership

### Dev 1
- `src/modules/auth/**`
- `src/modules/users/**`
- `src/modules/masters/**`
- `src/modules/reports/**`
- `src/modules/notifications/**`

### Dev 2
- `src/modules/reconciliation/**`
- `src/modules/invoices/**`
- `src/modules/collections/**`
- `src/modules/payments/**`
- `src/modules/search/**`
- `src/modules/audit/**`
- `src/modules/dashboard/**` (client-focused)

## Component ownership

### Dev 1
- `src/components/layout/**`
- `src/components/reports/**`

### Dev 2
- `src/components/reconciliation/**`
- `src/components/invoices/**`
- `src/components/dashboard/client/**`

## Shared (touch only with coordination)
- `src/app/layout.tsx`
- `src/components/ui/**`
- `src/lib/db.ts`
- `src/lib/auth.ts`
- `src/middleware.ts`
- `src/types/**`
- `src/schemas/common/**`
- `src/config/**`
- `prisma/schema.prisma` (coordinate schema changes and migrations)

## Database table ownership (draft)

### Dev 1 drafts
- `User`
- `OpCo`
- `Partner`
- `Service`
- `PartnerService`
- `Report`
- `UserOpCo`
- `UserPartner`

### Dev 2 drafts (to be added when implemented)
- `Reconciliation`
- `ReconciliationItem`
- `Invoice`
- `Collection`
- `Payment`
- `AuditLog`

