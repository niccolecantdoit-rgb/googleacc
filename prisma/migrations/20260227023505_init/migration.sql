-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "passwordEnc" TEXT NOT NULL,
    "f2aType" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "recoveryEmail" TEXT,
    "recoveryPhone" TEXT,
    "verificationPhone" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AccountTag" (
    "accountId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "AccountTag_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AccountTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateIndex
CREATE INDEX "Account_order_idx" ON "Account"("order");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Tag_order_idx" ON "Tag"("order");

-- CreateIndex
CREATE INDEX "AccountTag_tagId_idx" ON "AccountTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountTag_accountId_tagId_key" ON "AccountTag"("accountId", "tagId");
