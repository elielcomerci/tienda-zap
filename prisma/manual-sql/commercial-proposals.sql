-- Aplicar manualmente en Tienda ZAP solo después de revisar y validar el esquema de la rama.
-- No ejecutar en producción hasta completar pruebas y aprobar la integración.
CREATE TABLE "CommercialProposal" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "diagnosis" TEXT,
  "solution" TEXT,
  "scope" TEXT,
  "deliverables" TEXT,
  "timeline" TEXT,
  "conditions" TEXT,
  "amount" DECIMAL(14,2),
  "currency" TEXT NOT NULL DEFAULT 'ARS',
  "paymentTerms" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "targetEmail" TEXT,
  "customerId" TEXT,
  "businessAccountId" TEXT,
  "createdById" TEXT NOT NULL,
  "customerResponse" TEXT,
  "respondedAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialProposal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialProposal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CommercialProposal_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CommercialProposal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "CommercialProposalMaterial" (
  "id" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "label" TEXT,
  "url" TEXT,
  "objectKey" TEXT,
  "fileName" TEXT,
  "contentType" TEXT,
  "sizeBytes" INTEGER,
  "note" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommercialProposalMaterial_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialProposalMaterial_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "CommercialProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CommercialProposalInvite" (
  "id" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  CONSTRAINT "CommercialProposalInvite_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialProposalInvite_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "CommercialProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CommercialProposalInvite_tokenHash_key" ON "CommercialProposalInvite"("tokenHash");
CREATE INDEX "CommercialProposal_customerId_updatedAt_idx" ON "CommercialProposal"("customerId", "updatedAt");
CREATE INDEX "CommercialProposal_businessAccountId_updatedAt_idx" ON "CommercialProposal"("businessAccountId", "updatedAt");
CREATE INDEX "CommercialProposal_status_updatedAt_idx" ON "CommercialProposal"("status", "updatedAt");
CREATE INDEX "CommercialProposalMaterial_proposalId_sortOrder_idx" ON "CommercialProposalMaterial"("proposalId", "sortOrder");
CREATE INDEX "CommercialProposalInvite_proposalId_createdAt_idx" ON "CommercialProposalInvite"("proposalId", "createdAt");

CREATE TABLE "CommercialProposalStage" (
 "id" TEXT NOT NULL,"proposalId" TEXT NOT NULL,"position" INTEGER NOT NULL DEFAULT 0,"title" TEXT NOT NULL,
 "description" TEXT,"scope" TEXT,"deliverables" TEXT,"timeline" TEXT,"conditions" TEXT,"amount" DECIMAL(14,2),
 "currency" TEXT NOT NULL DEFAULT 'ARS',"paymentTerms" TEXT,"status" TEXT NOT NULL DEFAULT 'PENDING',"clientWorkId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CommercialProposalStage_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CommercialProposalStage_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "CommercialProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "CommercialProposalStage_clientWorkId_fkey" FOREIGN KEY ("clientWorkId") REFERENCES "ClientWork"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CommercialProposalStage_clientWorkId_key" ON "CommercialProposalStage"("clientWorkId");
CREATE INDEX "CommercialProposalStage_proposalId_position_idx" ON "CommercialProposalStage"("proposalId","position");
CREATE INDEX "CommercialProposalStage_status_updatedAt_idx" ON "CommercialProposalStage"("status","updatedAt");
CREATE TABLE "CommercialProposalStageComment" (
 "id" TEXT NOT NULL,"stageId" TEXT NOT NULL,"authorId" TEXT,"authorName" TEXT,"authorEmail" TEXT,"authorRole" TEXT NOT NULL,
 "action" TEXT,"message" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CommercialProposalStageComment_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CommercialProposalStageComment_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "CommercialProposalStage"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommercialProposalStageComment_stageId_createdAt_idx" ON "CommercialProposalStageComment"("stageId","createdAt");
CREATE INDEX "CommercialProposalStageComment_authorId_createdAt_idx" ON "CommercialProposalStageComment"("authorId","createdAt");


-- Autoría de materiales privados de propuestas.
ALTER TABLE "CommercialProposalMaterial"
  ADD COLUMN IF NOT EXISTS "uploadedById" TEXT,
  ADD COLUMN IF NOT EXISTS "uploadedByName" TEXT,
  ADD COLUMN IF NOT EXISTS "uploadedByRole" TEXT;


-- Versiones inmutables de lo que se compartió con cada cliente.
CREATE TABLE IF NOT EXISTS "CommercialProposalVersion" (
  "id" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommercialProposalVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialProposalVersion_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "CommercialProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CommercialProposalVersion_proposalId_version_key" ON "CommercialProposalVersion"("proposalId","version");
CREATE INDEX IF NOT EXISTS "CommercialProposalVersion_proposalId_createdAt_idx" ON "CommercialProposalVersion"("proposalId","createdAt");

