-- Additive compatibility migration: existing rows keep NULL and continue using R2_BUCKET_NAME.
ALTER TABLE "ClientWorkFile" ADD COLUMN IF NOT EXISTS "bucketName" TEXT;
