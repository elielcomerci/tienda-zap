CREATE TABLE "ClientWorkMessageRead" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientWorkMessageRead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientWorkMessageRead_messageId_userId_key" ON "ClientWorkMessageRead"("messageId", "userId");
CREATE INDEX "ClientWorkMessageRead_userId_readAt_idx" ON "ClientWorkMessageRead"("userId", "readAt");

ALTER TABLE "ClientWorkMessageRead"
    ADD CONSTRAINT "ClientWorkMessageRead_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "ClientWorkMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientWorkMessageRead"
    ADD CONSTRAINT "ClientWorkMessageRead_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "ClientWorkApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'SUPERSEDED');

CREATE TABLE "ClientWorkFileApproval" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "respondedById" TEXT,
    "status" "ClientWorkApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "activeKey" TEXT,
    "fileUpdatedAt" TIMESTAMP(3) NOT NULL,
    "response" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    CONSTRAINT "ClientWorkFileApproval_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientWorkFileApproval_fileId_requestedAt_idx" ON "ClientWorkFileApproval"("fileId", "requestedAt");
CREATE INDEX "ClientWorkFileApproval_status_requestedAt_idx" ON "ClientWorkFileApproval"("status", "requestedAt");
CREATE UNIQUE INDEX "ClientWorkFileApproval_activeKey_key" ON "ClientWorkFileApproval"("activeKey");

ALTER TABLE "ClientWorkFileApproval"
    ADD CONSTRAINT "ClientWorkFileApproval_fileId_fkey"
    FOREIGN KEY ("fileId") REFERENCES "ClientWorkFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientWorkFileApproval"
    ADD CONSTRAINT "ClientWorkFileApproval_requestedById_fkey"
    FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClientWorkFileApproval"
    ADD CONSTRAINT "ClientWorkFileApproval_respondedById_fkey"
    FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
