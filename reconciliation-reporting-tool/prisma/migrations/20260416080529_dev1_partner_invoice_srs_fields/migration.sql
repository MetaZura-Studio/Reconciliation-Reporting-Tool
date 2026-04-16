-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PartnerInvoiceUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "opcoId" TEXT,
    "serviceId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "invoiceNumber" TEXT,
    "invoiceDate" DATETIME,
    "currency" TEXT,
    "amount" DECIMAL,
    "reference" TEXT,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileMimeType" TEXT,
    "remarks" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedById" TEXT NOT NULL,
    CONSTRAINT "PartnerInvoiceUpload_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnerInvoiceUpload_opcoId_fkey" FOREIGN KEY ("opcoId") REFERENCES "OpCo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PartnerInvoiceUpload_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PartnerInvoiceUpload_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PartnerInvoiceUpload" ("fileMimeType", "fileName", "filePath", "id", "month", "partnerId", "reference", "remarks", "serviceId", "submittedAt", "submittedById", "year") SELECT "fileMimeType", "fileName", "filePath", "id", "month", "partnerId", "reference", "remarks", "serviceId", "submittedAt", "submittedById", "year" FROM "PartnerInvoiceUpload";
DROP TABLE "PartnerInvoiceUpload";
ALTER TABLE "new_PartnerInvoiceUpload" RENAME TO "PartnerInvoiceUpload";
CREATE INDEX "PartnerInvoiceUpload_year_month_partnerId_serviceId_idx" ON "PartnerInvoiceUpload"("year", "month", "partnerId", "serviceId");
CREATE INDEX "PartnerInvoiceUpload_invoiceNumber_idx" ON "PartnerInvoiceUpload"("invoiceNumber");
CREATE UNIQUE INDEX "PartnerInvoiceUpload_partnerId_invoiceNumber_year_month_serviceId_key" ON "PartnerInvoiceUpload"("partnerId", "invoiceNumber", "year", "month", "serviceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
