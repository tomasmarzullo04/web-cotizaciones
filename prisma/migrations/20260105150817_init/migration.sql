-- CreateTable
CREATE TABLE "RoleRate" (
    "role" TEXT NOT NULL PRIMARY KEY,
    "monthlyRate" REAL NOT NULL,
    "baseHours" INTEGER NOT NULL DEFAULT 160,
    "hourlyRate" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientName" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "technicalParameters" TEXT NOT NULL,
    "estimatedCost" REAL NOT NULL,
    "staffingRequirements" TEXT NOT NULL,
    "diagramDefinition" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
