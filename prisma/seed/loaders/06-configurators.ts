import { PrismaClient } from '@prisma/client';
import { impresosPackagingConfigurators } from '../data/06-configurators/impresos-packaging';
import { presenciaFisicaConfigurators } from '../data/06-configurators/presencia-fisica';
import { textilConfigurators } from '../data/06-configurators/textil';
import { digitalConfigurators } from '../data/06-configurators/digital';
import { campanasConfigurators } from '../data/06-configurators/campanas';

/**
 * Seed de importación inicial, no editor de precios.
 *
 * Una vez que un producto tiene versiones de configurador, sus datos quedan
 * bajo administración del panel. El seed no actualiza ni archiva versiones
 * existentes: así una futura ejecución no pisa borradores, publicaciones ni
 * versiones históricas creadas desde Precios ZAP.
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
  if (new Set(configKeys).size !== configKeys.length) {
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

  let created = 0;
  let preserved = 0;

  await prisma.$transaction(async (tx) => {
    for (const { cfg, productId } of resolvedConfigs) {
      // Any existing version means this product is now managed through the admin.
      // Do not update the matching version or archive versions unknown to the seed.
      const existingVersions = await tx.configuratorVersion.findMany({
        where: { productId },
        select: { id: true },
        take: 1,
      });

      if (existingVersions.length > 0) {
        preserved += 1;
        continue;
      }

      await tx.configuratorVersion.create({
        data: {
          productId,
          schemaVersion: cfg.schemaVersion,
          status: cfg.status,
          schema: cfg.schema,
          compatibility: cfg.compatibility || undefined,
          pricing: cfg.pricing || undefined,
        },
      });
      created += 1;
    }
  }, { maxWait: 10000, timeout: 15000 });

  console.log(
    `[SEED] Configuradores: ${created} importados por primera vez; ${preserved} productos preservados (administración activa).`
  );
}
