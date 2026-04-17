-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "serviceId" TEXT NOT NULL,
    "opcoId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "reconciliationId" TEXT,
    "partnerInvoiceUploadId" TEXT,
    "invoiceNumber" TEXT,
    "currency" TEXT,
    "amount" DECIMAL NOT NULL,
    "remarks" TEXT,
    "issuedAt" DATETIME,
    "dueAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_opcoId_fkey" FOREIGN KEY ("opcoId") REFERENCES "OpCo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "Reconciliation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_partnerInvoiceUploadId_fkey" FOREIGN KEY ("partnerInvoiceUploadId") REFERENCES "PartnerInvoiceUpload" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("amount", "createdAt", "currency", "dueAt", "id", "invoiceNumber", "issuedAt", "month", "opcoId", "partnerId", "reconciliationId", "remarks", "serviceId", "status", "updatedAt", "year") SELECT "amount", "createdAt", "currency", "dueAt", "id", "invoiceNumber", "issuedAt", "month", "opcoId", "partnerId", "reconciliationId", "remarks", "serviceId", "status", "updatedAt", "year" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE INDEX "Invoice_year_month_serviceId_opcoId_partnerId_idx" ON "Invoice"("year", "month", "serviceId", "opcoId", "partnerId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
