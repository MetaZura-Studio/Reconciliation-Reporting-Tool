-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReminderSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "triggerEvent" TEXT NOT NULL DEFAULT 'REPORT_SUBMISSION_DUE',
    "triggerTiming" TEXT NOT NULL DEFAULT 'BEFORE_DUE',
    "daysOffset" INTEGER NOT NULL DEFAULT 3,
    "daysBeforeDue" INTEGER NOT NULL DEFAULT 3,
    "repeatEveryDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "templateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReminderSetting_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ReminderSetting" ("createdAt", "daysBeforeDue", "id", "isActive", "name", "repeatEveryDays", "reportType", "targetRole", "templateId", "updatedAt") SELECT "createdAt", "daysBeforeDue", "id", "isActive", "name", "repeatEveryDays", "reportType", "targetRole", "templateId", "updatedAt" FROM "ReminderSetting";
DROP TABLE "ReminderSetting";
ALTER TABLE "new_ReminderSetting" RENAME TO "ReminderSetting";
CREATE UNIQUE INDEX "ReminderSetting_name_key" ON "ReminderSetting"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
