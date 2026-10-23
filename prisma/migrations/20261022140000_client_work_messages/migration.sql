CREATE TABLE "ClientWorkMessage" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientWorkMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientWorkMessage_workId_createdAt_idx" ON "ClientWorkMessage"("workId", "createdAt");
CREATE INDEX "ClientWorkMessage_senderId_createdAt_idx" ON "ClientWorkMessage"("senderId", "createdAt");

ALTER TABLE "ClientWorkMessage"
    ADD CONSTRAINT "ClientWorkMessage_workId_fkey"
    FOREIGN KEY ("workId") REFERENCES "ClientWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientWorkMessage"
    ADD CONSTRAINT "ClientWorkMessage_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
