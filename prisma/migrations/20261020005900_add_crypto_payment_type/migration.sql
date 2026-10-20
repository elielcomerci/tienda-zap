-- Add the enum value in a separate migration so PostgreSQL commits it before use.
ALTER TYPE "PaymentType" ADD VALUE IF NOT EXISTS 'CRYPTO';
