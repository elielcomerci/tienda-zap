CREATE TABLE "PublicPadronUsage" (
    "visitorHash" VARCHAR(64) NOT NULL,
    "dayKey" VARCHAR(10) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublicPadronUsage_pkey" PRIMARY KEY ("visitorHash", "dayKey")
);

CREATE INDEX "PublicPadronUsage_dayKey_idx" ON "PublicPadronUsage"("dayKey");
