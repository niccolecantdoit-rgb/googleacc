/*
  Warnings:

  - You are about to drop the column `recoveryEmail` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `recoveryPhone` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `verificationPhone` on the `Account` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "passwordEnc" TEXT NOT NULL,
    "f2aType" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "recoveryEmailEnc" TEXT,
    "recoveryEmailSearch" TEXT,
    "recoveryPhoneEnc" TEXT,
    "recoveryPhoneSearch" TEXT,
    "verificationPhoneEnc" TEXT,
    "verificationPhoneSearch" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Account" ("createdAt", "email", "f2aType", "id", "order", "passwordEnc", "updatedAt", "username") SELECT "createdAt", "email", "f2aType", "id", "order", "passwordEnc", "updatedAt", "username" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");
CREATE INDEX "Account_order_idx" ON "Account"("order");
CREATE INDEX "Account_recoveryEmailSearch_idx" ON "Account"("recoveryEmailSearch");
CREATE INDEX "Account_recoveryPhoneSearch_idx" ON "Account"("recoveryPhoneSearch");
CREATE INDEX "Account_verificationPhoneSearch_idx" ON "Account"("verificationPhoneSearch");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
