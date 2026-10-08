import { PrismaClient } from '@prisma/client';
import { impresosPackagingConfigurators } from '../data/06-configurators/impresos-packaging';
import { presenciaFisicaConfigurators } from '../data/06-configurators/presencia-fisica';
import { textilConfigurators } from '../data/06-configurators/textil';
import { digitalConfigurators } from '../data/06-configurators/digital';
import { campanasConfigurators } from '../data/06-configurators/campanas';

export async function loadConfigurators(prisma: PrismaClient): Promise<void> {
  const allConfigs = [
    ...impresosPackagingConfigurators,
    ...presenciaFisicaConfigurators,
    ...textilConfigurators,
    ...digitalConfigurators,
    ...campanasConfigurators,
  ];

  const products = await prisma.product.findMany({
    where: { active: true },
    select: { id: true, slug: true },
  });
  const productMap = new Map(products.map((p) => [p.slug, p.id]));

  // Resolver todas las referencias antes de escribir; después persistir en una sola transacción.
  const resolvedConfigs = allConfigs.map((cfg) => {
    const productId = productMap.get(cfg.productSlug);
    if (!productId) {
      throw new Error(`[SEED ERROR] Product con slug '${cfg.productSlug}' no encontrado para ConfiguratorVersion.`);
    }
    return { cfg, productId };
  });

  const configKeys = resolvedConfigs.map(
    ({ cfg }) => cfg.productSlug + '|' + cfg.schemaVersion
  );
  const resolvedKeys = new Set(configKeys);
  if (resolvedKeys.size !== configKeys.length) {
    const duplicateKeys = [...new Set(
      configKeys.filter((key, index) => configKeys.indexOf(key) !== index)
    )];
    throw new Error(`[SEED ERROR] ConfiguratorVersion duplicada: ${duplicateKeys.join(', ')}.`);
  }

  await prisma.$transaction(async (tx) => {
    for (const { cfg, productId } of resolvedConfigs) {
      await tx.configuratorVersion.upsert({
        where: {
          productId_schemaVersion: {
            productId,
            schemaVersion: cfg.schemaVersion,
          },
        },
        update: {
          status: cfg.status,
          schema: cfg.schema,
          compatibility: cfg.compatibility || undefined,
          pricing: cfg.pricing || undefined,
        },
        create: {
          productId,
          schemaVersion: cfg.schemaVersion,
          status: cfg.status,
          schema: cfg.schema,
          compatibility: cfg.compatibility || undefined,
          pricing: cfg.pricing || undefined,
        },
      });
    }

    const activeProducts = await tx.product.findMany({
      where: { active: true },
      select: { id: true, slug: true },
    });

    const activeProductSlugs = new Map(activeProducts.map((product) => [product.id, product.slug]));
    const staleVersions = await tx.configuratorVersion.findMany({
      where: { productId: { in: activeProducts.map((product) => product.id) } },
      select: { id: true, productId: true, schemaVersion: true },
    });

    const staleIds = staleVersions
      .filter((version) => {
        const slug = activeProductSlugs.get(version.productId);
        return !slug || !resolvedKeys.has(slug + '|' + version.schemaVersion);
      })
      .map((version) => version.id);

    if (staleIds.length > 0) {
      await tx.configuratorVersion.updateMany({
        where: { id: { in: staleIds } },
        data: { status: 'ARCHIVED' },
      });
    }
  }, { maxWait: 10000, timeout: 15000 });

  console.log(`[SEED] ${allConfigs.length} ConfiguratorVersions (schema 1.0) persistidas; versiones obsoletas archivadas.`);
}
