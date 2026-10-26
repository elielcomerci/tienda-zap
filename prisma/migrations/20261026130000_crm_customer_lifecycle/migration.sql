CREATE TABLE "BusinessAccountActivity" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    CONSTRAINT "BusinessAccountActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BusinessAccountActivity_accountId_occurredAt_idx"
ON "BusinessAccountActivity"("accountId", "occurredAt");

CREATE INDEX "BusinessAccountActivity_type_occurredAt_idx"
ON "BusinessAccountActivity"("type", "occurredAt");

ALTER TABLE "BusinessAccountActivity"
ADD CONSTRAINT "BusinessAccountActivity_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "BusinessAccount"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
