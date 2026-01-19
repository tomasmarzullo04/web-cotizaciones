-- CreateTable
CREATE TABLE "ServiceRate" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "complexity" TEXT NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "technicalParameters" TEXT NOT NULL,
    "estimatedCost" DOUBLE PRECISION NOT NULL,
    "staffingRequirements" TEXT NOT NULL,
    "diagramDefinition" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BORRADOR',
    "serviceType" TEXT NOT NULL DEFAULT 'Proyecto',

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
