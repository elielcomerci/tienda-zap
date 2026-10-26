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

-- Link legacy leads only when existing data identifies exactly one account.
-- Ambiguous matches intentionally remain unlinked for manual reconciliation.
WITH candidates AS (
  SELECT sl."id" AS "leadId", ba."id" AS "accountId"
  FROM "SellerLead" sl
  JOIN "BusinessAccount" ba ON ba."userId" = sl."convertedUserId"
  WHERE sl."convertedUserId" IS NOT NULL
    AND (ba."assignedSellerId" IS NULL OR ba."assignedSellerId" = sl."sellerId")
    AND (ba."operationalSellerId" IS NULL OR ba."operationalSellerId" = sl."sellerId")

  UNION

  SELECT sl."id" AS "leadId", bc."accountId"
  FROM "SellerLead" sl
  JOIN "BusinessContact" bc
    ON sl."email" IS NOT NULL
   AND lower(trim(bc."email")) = lower(trim(sl."email"))
  JOIN "BusinessAccount" ba ON ba."id" = bc."accountId"
  WHERE trim(sl."email") <> ''
    AND (ba."assignedSellerId" IS NULL OR ba."assignedSellerId" = sl."sellerId")
    AND (ba."operationalSellerId" IS NULL OR ba."operationalSellerId" = sl."sellerId")

  UNION

  SELECT sl."id" AS "leadId", bc."accountId"
  FROM "SellerLead" sl
  JOIN "BusinessContact" bc
    ON sl."phone" IS NOT NULL
   AND regexp_replace(bc."phone", '[^0-9]', '', 'g') =
       regexp_replace(sl."phone", '[^0-9]', '', 'g')
  JOIN "BusinessAccount" ba ON ba."id" = bc."accountId"
  WHERE regexp_replace(trim(sl."phone"), '[^0-9]', '', 'g') <> ''
    AND (ba."assignedSellerId" IS NULL OR ba."assignedSellerId" = sl."sellerId")
    AND (ba."operationalSellerId" IS NULL OR ba."operationalSellerId" = sl."sellerId")
),
unique_candidates AS (
  SELECT "leadId", MIN("accountId") AS "accountId"
  FROM candidates
  GROUP BY "leadId"
  HAVING COUNT(DISTINCT "accountId") = 1
)
UPDATE "SellerLead" sl
SET "businessAccountId" = uc."accountId"
FROM unique_candidates uc
WHERE sl."id" = uc."leadId"
  AND sl."businessAccountId" IS NULL;

-- Link historical consultations by exact email only when it identifies one account.
ALTER TABLE "ConsultRequest"
ADD COLUMN "businessAccountId" TEXT;

CREATE INDEX "ConsultRequest_businessAccountId_createdAt_idx"
ON "ConsultRequest"("businessAccountId", "createdAt");

ALTER TABLE "ConsultRequest"
ADD CONSTRAINT "ConsultRequest_businessAccountId_fkey"
FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

WITH consultation_candidates AS (
  SELECT cr."id" AS "consultId", ba."id" AS "accountId"
  FROM "ConsultRequest" cr
  JOIN "BusinessAccount" ba ON ba."userId" IS NOT NULL
  JOIN "User" u ON u."id" = ba."userId"
  WHERE lower(trim(u."email")) = lower(trim(cr."customerEmail"))
    AND trim(cr."customerEmail") <> ''

  UNION

  SELECT cr."id" AS "consultId", bc."accountId"
  FROM "ConsultRequest" cr
  JOIN "BusinessContact" bc
    ON cr."customerEmail" <> ''
   AND lower(trim(bc."email")) = lower(trim(cr."customerEmail"))
),
unique_consultation_candidates AS (
  SELECT "consultId", MIN("accountId") AS "accountId"
  FROM consultation_candidates
  GROUP BY "consultId"
  HAVING COUNT(DISTINCT "accountId") = 1
)
UPDATE "ConsultRequest" cr
SET "businessAccountId" = uc."accountId"
FROM unique_consultation_candidates uc
WHERE cr."id" = uc."consultId"
  AND cr."businessAccountId" IS NULL;

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
