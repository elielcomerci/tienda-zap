import { PrismaClient } from '@prisma/client';
import { impresosPackagingConfigurators } from '../data/06-configurators/impresos-packaging';
import { presenciaFisicaConfigurators } from '../data/06-configurators/presencia-fisica';
import { textilConfigurators } from '../data/06-configurators/textil';
import { digitalConfigurators } from '../data/06-configurators/digital';
import { campanasConfigurators } from '../data/06-configurators/campanas';

/**
 * Seed de configuradores. Las cinco familias gestionadas por Precios ZAP
 * preservan sus versiones existentes; las demás conservan el flujo histórico.
 */
const MANAGED_PRICING_SLUGS = new Set([
  'tarjetas-vouchers',
  'flyers-desplegables',
  'tags-etiquetas',
  'adhesivos-stickers',
  'carpetas-folders',
]);

/**
 * Conserva las versiones de las familias gestionadas por Precios ZAP.
 * Para los demás productos mantiene el comportamiento histórico del seed.
 */
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

  const configKeys = allConfigs.map((cfg) => cfg.productSlug + '|' + cfg.schemaVersion);
  const resolvedKeys = new Set(configKeys);
  if (resolvedKeys.size !== configKeys.length) {
    const duplicateKeys = [...new Set(
      configKeys.filter((key, index) => configKeys.indexOf(key) !== index)
    )];
    throw new Error(`[SEED ERROR] ConfiguratorVersion duplicada: ${duplicateKeys.join(', ')}.`);
  }

  const resolvedConfigs = allConfigs.map((cfg) => {
    const productId = productMap.get(cfg.productSlug);
    if (!productId) {
      throw new Error(`[SEED ERROR] Product con slug '${cfg.productSlug}' no encontrado para ConfiguratorVersion.`);
    }
    return { cfg, productId };
  });

  let persisted = 0;
  let preserved = 0;

  await prisma.$transaction(async (tx) => {
    for (const { cfg, productId } of resolvedConfigs) {
      if (MANAGED_PRICING_SLUGS.has(cfg.productSlug)) {
        const existingVersions = await tx.configuratorVersion.findMany({
          where: { productId },
          select: { id: true },
          take: 1,
        });

        if (existingVersions.length > 0) {
          preserved += 1;
          continue;
        }
      }

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
      persisted += 1;
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
        if (slug && MANAGED_PRICING_SLUGS.has(slug)) return false;
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

  console.log(
    `[SEED] Configuradores: ${persisted} persistidos; ${preserved} productos de Precios ZAP preservados; versiones obsoletas de otras familias archivadas.`
  );
}
