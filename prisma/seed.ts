import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

import { loadAdmin } from './seed/loaders/01-admin';
import { loadBusinessTypes } from './seed/loaders/02-business-types';
import { loadSituations } from './seed/loaders/03-situations';
import { loadNeeds } from './seed/loaders/04-needs';
import { loadProducts } from './seed/loaders/05-products';
import { loadConfigurators } from './seed/loaders/06-configurators';
import { loadOfferMatrix } from './seed/loaders/07-offer-matrix';
import { loadPacks } from './seed/loaders/08-packs';
import { loadQuoterConfig } from './seed/loaders/09-quoter-config';
import { runSeedAudit } from './seed/audit/seed-audit';

const pool = new Pool({ connectionString: process.env.DATABASE_URL as string });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--------------------------------------------------');
  console.log('TIENDA ZAP — EJECUCIÓN DE SEED v1.0 (FASE D)');
  console.log('--------------------------------------------------\n');

  await loadAdmin(prisma);
  await loadBusinessTypes(prisma);
  await loadSituations(prisma);
  await loadNeeds(prisma);
  await loadProducts(prisma);
  await loadConfigurators(prisma);
  await loadOfferMatrix(prisma);
  await loadPacks(prisma);
  await loadQuoterConfig(prisma);

  console.log('\n[SEED] Carga finalizada con éxito. Ejecutando auditoría de integridad...');
  await runSeedAudit(prisma);
}

main()
  .catch((e) => {
    console.error('\n[SEED FATAL ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
