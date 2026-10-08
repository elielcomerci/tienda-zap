import { PrismaClient } from '@prisma/client';
import {
  sheetRawMaterials,
  sheetFinishingOperations,
  initialQuoterConfigs,
} from '../data/09-quoter-config';
import { quoterOptionConfigs } from '../data/09-quoter-options';

export async function loadQuoterConfig(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 1. Materias Primas con IDs estables
    for (const material of sheetRawMaterials) {
      await tx.rawMaterial.upsert({
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
  
      await tx.rawMaterialTier.deleteMany({
        where: { rawMaterialId: material.id },
      });
  
      await tx.rawMaterialTier.createMany({
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
      await tx.finishingOperation.upsert({
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
  
      await tx.finishingTier.deleteMany({
        where: { finishingId: finishing.id },
      });
  
      await tx.finishingTier.createMany({
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
      const product = await tx.product.findUnique({
        where: { slug: quoterCfg.productSlug },
        select: { id: true },
      });
  
      if (!product) {
        console.warn(`[SEED WARN] Producto '${quoterCfg.productSlug}' no encontrado para ProductQuoterConfig.`);
        continue;
      }
  
      const config = await tx.productQuoterConfig.upsert({
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
      await tx.productQuoterConfigMaterial.deleteMany({
        where: { configId: config.id },
      });
      await tx.productQuoterConfigMaterial.createMany({
        data: quoterCfg.rawMaterialIds.map((rawMaterialId) => ({
          configId: config.id,
          rawMaterialId,
        })),
      });
  
      // Finishings link
      await tx.quoterConfigFinishing.deleteMany({
        where: { configId: config.id },
      });
      await tx.quoterConfigFinishing.createMany({
        data: quoterCfg.finishingIds.map((finishingId) => ({
          configId: config.id,
          finishingId,
        })),
      });
  
      // Size presets
      await tx.productQuoterSizePreset.deleteMany({
        where: { configId: config.id },
      });
      await tx.productQuoterSizePreset.createMany({
        data: quoterCfg.sizePresets.map((sp) => ({
          configId: config.id,
          label: sp.label,
          width: sp.width,
          height: sp.height,
          sortOrder: sp.sortOrder,
        })),
      });
  
      // Semantic option groups. Rebuild from the source of truth so stale
      // options/constraints/size links cannot survive a seed.
      await tx.productQuoterOptionGroup.deleteMany({
        where: { configId: config.id },
      });
  
      const optionConfig = quoterOptionConfigs.find(
        (entry) => entry.productSlug === quoterCfg.productSlug
      );
  
      for (const groupSeed of optionConfig?.groups ?? []) {
        const group = await tx.productQuoterOptionGroup.create({
          data: {
            configId: config.id,
            key: groupSeed.key,
            name: groupSeed.name,
            selectionMode: groupSeed.selectionMode,
            required: groupSeed.required ?? false,
            sortOrder: groupSeed.sortOrder ?? 0,
          },
        });
  
        for (const optionSeed of groupSeed.options) {
          if (
            optionSeed.finishingId &&
            !quoterCfg.finishingIds.includes(optionSeed.finishingId)
          ) {
            throw new Error(
              `[SEED ERROR] Opción '${optionSeed.key}' de '${quoterCfg.productSlug}' referencia terminación '${optionSeed.finishingId}' que no está habilitada en ProductQuoterConfig.`
            );
          }
  
          const option = await tx.productQuoterOption.create({
            data: {
              groupId: group.id,
              key: optionSeed.key,
              label: optionSeed.label,
              required: optionSeed.required ?? false,
              hidden: optionSeed.hidden ?? false,
              defaultSelected: optionSeed.defaultSelected ?? false,
              finishingId: optionSeed.finishingId ?? null,
              sortOrder: optionSeed.sortOrder ?? 0,
            },
          });
  
          for (const sizeLabel of optionSeed.allowedSizeLabels ?? []) {
            const sizePreset = await tx.productQuoterSizePreset.findUnique({
              where: {
                configId_label: {
                  configId: config.id,
                  label: sizeLabel,
                },
              },
              select: { id: true },
            });
  
            if (!sizePreset) {
              throw new Error(
                `[SEED ERROR] Opción '${optionSeed.key}' de '${quoterCfg.productSlug}' referencia tamaño inexistente '${sizeLabel}'.`
              );
            }
  
            await tx.productQuoterOptionSize.create({
              data: {
                optionId: option.id,
                sizePresetId: sizePreset.id,
              },
            });
          }
        }
      }
  
      // Quantity presets
      await tx.productQuoterQuantityPreset.deleteMany({
        where: { configId: config.id },
      });
      await tx.productQuoterQuantityPreset.createMany({
        data: quoterCfg.quantityPresets.map((qp) => ({
          configId: config.id,
          quantity: qp.quantity,
          sortOrder: qp.sortOrder,
        })),
      });
    }
  
  }, { maxWait: 10000, timeout: 30000 });

  const rawMaterialCount = await prisma.rawMaterial.count();
  const finishingCount = await prisma.finishingOperation.count();
  const quoterConfigCount = await prisma.productQuoterConfig.count();

  console.log(
    `[SEED] Infraestructura de cotización cargada: ${rawMaterialCount} materiales, ${finishingCount} terminaciones, ${quoterConfigCount} configuradores de costeo.`
  );
}
