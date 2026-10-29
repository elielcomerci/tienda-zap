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
