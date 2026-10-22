import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { quoteConfiguratorSelection } from '../src/lib/pricing/configurator-adapter';

/**
 * Integration smoke test against a separately provisioned, seeded test database.
 * It intentionally never falls back to DATABASE_URL, which may point at production.
 */
async function main() {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error('Falta TEST_DATABASE_URL. Esta prueba requiere una base de prueba aislada y sembrada; no usa DATABASE_URL.');
  }
  if (process.env.DATABASE_URL && connectionString === process.env.DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL no puede ser igual a DATABASE_URL. Se bloquea la ejecución contra la base principal.');
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool as any) });
  try {
    const versions = await prisma.configuratorVersion.findMany({
      where: { status: 'ACTIVE', product: { slug: { in: ['tarjetas-vouchers', 'tags-etiquetas', 'adhesivos-stickers'] } } },
      select: { schemaVersion: true, schema: true, compatibility: true, pricing: true, status: true, product: { select: { slug: true } } },
    });

    assert.ok(versions.length > 0, 'La base de prueba debe contener configuradores activos sembrados');
    for (const version of versions) {
      const schema = version.schema as any;
      const pricing = version.pricing as any;
      assert.ok(schema?.fields && typeof schema.fields === 'object', `${version.product.slug}: schema sin fields`);
      assert.ok(pricing && typeof pricing === 'object', `${version.product.slug}: pricing ausente en DB`);

      const selection: Record<string, any> = {};
      for (const [key, field] of Object.entries(schema.fields as Record<string, any>)) {
        if ((field as any).default !== undefined) selection[key] = (field as any).default;
      }

      const quote = quoteConfiguratorSelection({
        productSlug: version.product.slug,
        schemaVersion: version.schemaVersion,
        status: version.status,
        schema,
        compatibility: version.compatibility as any,
        pricing,
      } as any, selection);

      assert.ok(Number.isFinite(quote.totalCost) && quote.totalCost > 0, `${version.product.slug}: costo no válido calculado desde DB`);
      assert.ok(Number.isFinite(quote.totalPrice) && quote.totalPrice > 0, `${version.product.slug}: precio no válido calculado desde DB`);
      if (quote.netPrice != null && quote.vatAmount != null) {
        assert.ok(Math.abs(quote.totalPrice - quote.netPrice - quote.vatAmount) < 0.02, `${version.product.slug}: neto + IVA no coincide con total`);
      }
      console.log(`✓ ${version.product.slug}@${version.schemaVersion}: cotización derivada de ConfiguratorVersion en DB`);
    }
    console.log(`Resultado: ${versions.length} configuradores activos comprobados contra TEST_DATABASE_URL.`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
