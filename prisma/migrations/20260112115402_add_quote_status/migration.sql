/*
  Warnings:

  - You are about to drop the `RoleRate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RoleRate";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ServiceRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "service" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "complexity" TEXT NOT NULL,
    "basePrice" REAL NOT NULL,
    "multiplier" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientName" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "technicalParameters" TEXT NOT NULL,
    "estimatedCost" REAL NOT NULL,
    "staffingRequirements" TEXT NOT NULL,
    "diagramDefinition" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'BORRADOR',
    CONSTRAINT "Quote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Quote" ("clientName", "createdAt", "diagramDefinition", "estimatedCost", "id", "projectType", "staffingRequirements", "technicalParameters") SELECT "clientName", "createdAt", "diagramDefinition", "estimatedCost", "id", "projectType", "staffingRequirements", "technicalParameters" FROM "Quote";
DROP TABLE "Quote";
ALTER TABLE "new_Quote" RENAME TO "Quote";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
