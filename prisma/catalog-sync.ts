import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

import { loadBusinessTypes } from './seed/loaders/02-business-types';
import { loadSituations } from './seed/loaders/03-situations';
import { loadNeeds } from './seed/loaders/04-needs';
import { loadProducts } from './seed/loaders/05-products';
import { loadConfigurators } from './seed/loaders/06-configurators';
import { loadProductRelations } from './seed/loaders/10-product-relations';
import { productsData } from './seed/data/05-products';
import { runSeedAudit } from './seed/audit/seed-audit';

/**
 * Synchronizes catalog definitions without reseeding commercial amounts.
 *
 * Deliberately excluded:
 * - loadOfferMatrix: the existing commercial matrix is already defined.
 * - loadQuoterConfig: preserves raw-material/finishing costs and quote tiers.
 * - loadPacks: does not change pack availability.
 * - loadAdmin: does not touch admin credentials.
 */
const pool = new Pool({ connectionString: process.env.DATABASE_URL as string });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('[CATALOG SYNC] DATABASE_URL no está configurada.');
  }

  console.log('--------------------------------------------------');
  console.log('TIENDA ZAP — SINCRONIZACIÓN SEGURA DEL CATÁLOGO');
  console.log('--------------------------------------------------');
  console.log('Preserva precios existentes, costos, matriz comercial y packs.\n');

  // Never create a catalog product with a placeholder price during a preservation sync.
  const existingProducts = await prisma.product.findMany({
    where: { slug: { in: productsData.map((product) => product.slug) } },
    select: { slug: true },
  });
  const existingSlugs = new Set(existingProducts.map((product) => product.slug));
  const missingSlugs = productsData.map((product) => product.slug).filter((slug) => !existingSlugs.has(slug));
  if (missingSlugs.length > 0) {
    throw new Error(
      `[CATALOG SYNC] Se cancela antes de escribir: faltan productos existentes con precio comercial por verificar: ${missingSlugs.join(', ')}`
    );
  }

  await loadBusinessTypes(prisma);
  await loadSituations(prisma);
  await loadNeeds(prisma);
  await loadProducts(prisma, { preservePricing: true, deactivateMissing: false });
  await loadConfigurators(prisma);
  await loadProductRelations(prisma);

  console.log('\n[CATALOG SYNC] Carga finalizada. Ejecutando auditoría integral...');
  await runSeedAudit(prisma);
  console.log('\n[CATALOG SYNC] Auditoría aprobada.');
}

main()
  .catch((error) => {
    console.error('\n[CATALOG SYNC FAILED]', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
