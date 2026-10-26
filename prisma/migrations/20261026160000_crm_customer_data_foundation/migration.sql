-- Shared customer data foundation: link sales leads to the common business account,
-- retain pasted conversation source text, and provide a neutral event envelope for later consumers.

ALTER TABLE "SellerLead"
ADD COLUMN "businessAccountId" TEXT;

CREATE INDEX "SellerLead_businessAccountId_idx"
ON "SellerLead"("businessAccountId");

ALTER TABLE "SellerLead"
ADD CONSTRAINT "SellerLead_businessAccountId_fkey"
FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CustomerConversation" (
  "id" TEXT NOT NULL,
  "businessAccountId" TEXT NOT NULL,
  "importedById" TEXT NOT NULL,
  "title" TEXT,
  "source" TEXT NOT NULL DEFAULT 'WHATSAPP_PASTE',
  "rawTranscript" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "conversationAt" TIMESTAMP(3),
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  CONSTRAINT "CustomerConversation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerConversation_businessAccountId_contentHash_key"
ON "CustomerConversation"("businessAccountId", "contentHash");
CREATE INDEX "CustomerConversation_businessAccountId_conversationAt_idx"
ON "CustomerConversation"("businessAccountId", "conversationAt");
CREATE INDEX "CustomerConversation_importedById_importedAt_idx"
ON "CustomerConversation"("importedById", "importedAt");

ALTER TABLE "CustomerConversation"
ADD CONSTRAINT "CustomerConversation_businessAccountId_fkey"
FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerConversation"
ADD CONSTRAINT "CustomerConversation_importedById_fkey"
FOREIGN KEY ("importedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CustomerTimelineEvent" (
  "id" TEXT NOT NULL,
  "businessAccountId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "eventType" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerTimelineEvent_businessAccountId_occurredAt_idx"
ON "CustomerTimelineEvent"("businessAccountId", "occurredAt");
CREATE INDEX "CustomerTimelineEvent_sourceType_sourceId_idx"
ON "CustomerTimelineEvent"("sourceType", "sourceId");
CREATE INDEX "CustomerTimelineEvent_eventType_occurredAt_idx"
ON "CustomerTimelineEvent"("eventType", "occurredAt");

ALTER TABLE "CustomerTimelineEvent"
ADD CONSTRAINT "CustomerTimelineEvent_businessAccountId_fkey"
FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerTimelineEvent"
ADD CONSTRAINT "CustomerTimelineEvent_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
