import { PrismaClient } from '@prisma/client';
import {
  sheetRawMaterials,
  sheetFinishingOperations,
  initialQuoterConfigs,
} from '../data/09-quoter-config';

export async function loadQuoterConfig(prisma: PrismaClient): Promise<void> {
  // 1. Materias Primas con IDs estables
  for (const material of sheetRawMaterials) {
    await prisma.rawMaterial.upsert({
      where: { id: material.id },
      update: {
        name: material.name,
        width: material.width,
        height: material.height,
        unit: material.unit,
        active: true,
      },
      create: {
        id: material.id,
        name: material.name,
        width: material.width,
        height: material.height,
        unit: material.unit,
        active: true,
      },
    });

    await prisma.rawMaterialTier.deleteMany({
      where: { rawMaterialId: material.id },
    });

    await prisma.rawMaterialTier.createMany({
      data: material.tiers.map((t) => ({
        rawMaterialId: material.id,
        minQty: t.minQty,
        maxQty: t.maxQty,
        unitPrice: t.unitPrice,
      })),
    });
  }

  // 2. Operaciones de Terminación con IDs estables
  for (const finishing of sheetFinishingOperations) {
    await prisma.finishingOperation.upsert({
      where: { id: finishing.id },
      update: {
        name: finishing.name,
        costType: finishing.costType,
        active: true,
      },
      create: {
        id: finishing.id,
        name: finishing.name,
        costType: finishing.costType,
        active: true,
      },
    });

    await prisma.finishingTier.deleteMany({
      where: { finishingId: finishing.id },
    });

    await prisma.finishingTier.createMany({
      data: finishing.tiers.map((t) => ({
        finishingId: finishing.id,
        minQty: t.minQty,
        maxQty: t.maxQty,
        unitPrice: t.unitPrice,
      })),
    });
  }

  // 3. ProductQuoterConfig para productos configurables
  for (const quoterCfg of initialQuoterConfigs) {
    const product = await prisma.product.findUnique({
      where: { slug: quoterCfg.productSlug },
      select: { id: true },
    });

    if (!product) {
      console.warn(`[SEED WARN] Producto '${quoterCfg.productSlug}' no encontrado para ProductQuoterConfig.`);
      continue;
    }

    const config = await prisma.productQuoterConfig.upsert({
      where: { productId: product.id },
      update: {
        pricingMode: quoterCfg.pricingMode,
        margin: quoterCfg.margin,
        bleed: quoterCfg.bleed,
        profitMargin: quoterCfg.profitMargin,
        minProfitMargin: quoterCfg.minProfitMargin,
        maxProfitMargin: quoterCfg.maxProfitMargin,
        allowCustomSize: quoterCfg.allowCustomSize,
      },
      create: {
        productId: product.id,
        pricingMode: quoterCfg.pricingMode,
        margin: quoterCfg.margin,
        bleed: quoterCfg.bleed,
        profitMargin: quoterCfg.profitMargin,
        minProfitMargin: quoterCfg.minProfitMargin,
        maxProfitMargin: quoterCfg.maxProfitMargin,
        allowCustomSize: quoterCfg.allowCustomSize,
      },
    });

    // Materials link
    await prisma.productQuoterConfigMaterial.deleteMany({
      where: { configId: config.id },
    });
    await prisma.productQuoterConfigMaterial.createMany({
      data: quoterCfg.rawMaterialIds.map((rawMaterialId) => ({
        configId: config.id,
        rawMaterialId,
      })),
    });

    // Finishings link
    await prisma.quoterConfigFinishing.deleteMany({
      where: { configId: config.id },
    });
    await prisma.quoterConfigFinishing.createMany({
      data: quoterCfg.finishingIds.map((finishingId) => ({
        configId: config.id,
        finishingId,
      })),
    });

    // Size presets
    await prisma.productQuoterSizePreset.deleteMany({
      where: { configId: config.id },
    });
    await prisma.productQuoterSizePreset.createMany({
      data: quoterCfg.sizePresets.map((sp) => ({
        configId: config.id,
        label: sp.label,
        width: sp.width,
        height: sp.height,
        sortOrder: sp.sortOrder,
      })),
    });

    // Quantity presets
    await prisma.productQuoterQuantityPreset.deleteMany({
      where: { configId: config.id },
    });
    await prisma.productQuoterQuantityPreset.createMany({
      data: quoterCfg.quantityPresets.map((qp) => ({
        configId: config.id,
        quantity: qp.quantity,
        sortOrder: qp.sortOrder,
      })),
    });
  }

  const rawMaterialCount = await prisma.rawMaterial.count();
  const finishingCount = await prisma.finishingOperation.count();
  const quoterConfigCount = await prisma.productQuoterConfig.count();

  console.log(
    `[SEED] Infraestructura de cotización cargada: ${rawMaterialCount} materiales, ${finishingCount} terminaciones, ${quoterConfigCount} configuradores de costeo.`
  );
}
