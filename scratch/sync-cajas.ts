import fs from 'fs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { loadProducts } from '../prisma/seed/loaders/05-products';
import { loadConfigurators } from '../prisma/seed/loaders/06-configurators';

for (const file of ['.env.local', '.env']) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool as any) });

async function main() {
  console.log('[SYNC] Actualizando productos (cajas-personalizadas -> CONSULTAR)...');
  await loadProducts(prisma);

  // Eliminar cualquier ConfiguratorVersion para cajas-personalizadas (ahora es CONSULTAR)
  const p = await prisma.product.findUnique({ where: { slug: 'cajas-personalizadas' } });
  if (p) {
    await prisma.configuratorVersion.deleteMany({ where: { productId: p.id } });
  }

  console.log('[SYNC] Sincronizando ConfiguratorVersions...');
  await loadConfigurators(prisma);
  console.log('[SYNC] Listo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
