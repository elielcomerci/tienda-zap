-- Migración aditiva para entornos donde commercial-proposals.sql ya fue aplicado.
-- Ejecutar primero en desarrollo/staging y validar antes de cualquier entorno productivo.
ALTER TABLE "CommercialProposalStage"
  ADD COLUMN IF NOT EXISTS "track" TEXT NOT NULL DEFAULT 'NOW';
