-- Aplicar una sola vez en la base de datos de Tienda ZAP antes de habilitar Trabajos y archivos.
-- El bucket R2 usado por estos objetos debe ser privado y no tener un dominio público asociado.
CREATE TABLE "ClientWork" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientWork_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ClientWorkFile" (
  "id" TEXT NOT NULL,
  "workId" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "objectKey" TEXT NOT NULL,
  "previousObjectKey" TEXT,
  "cleanupError" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientWorkFile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClientWorkFile_objectKey_key" ON "ClientWorkFile"("objectKey");
CREATE INDEX "ClientWork_userId_updatedAt_idx" ON "ClientWork"("userId", "updatedAt");
CREATE INDEX "ClientWork_createdById_createdAt_idx" ON "ClientWork"("createdById", "createdAt");
CREATE INDEX "ClientWorkFile_workId_createdAt_idx" ON "ClientWorkFile"("workId", "createdAt");
CREATE INDEX "ClientWorkFile_uploadedById_createdAt_idx" ON "ClientWorkFile"("uploadedById", "createdAt");
ALTER TABLE "ClientWork" ADD CONSTRAINT "ClientWork_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientWork" ADD CONSTRAINT "ClientWork_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientWorkFile" ADD CONSTRAINT "ClientWorkFile_workId_fkey" FOREIGN KEY ("workId") REFERENCES "ClientWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientWorkFile" ADD CONSTRAINT "ClientWorkFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
