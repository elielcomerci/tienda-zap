import { PrismaClient } from '@prisma/client';
import { packsData } from '../data/08-packs';

export async function loadPacks(prisma: PrismaClient): Promise<void> {
  if (packsData.length === 0) {
    // Packs are not part of the current public catalog. Preserve rows and items
    // for history, but ensure old records cannot remain publicly active.
    await prisma.pack.updateMany({
      where: { active: true },
      data: { active: false },
    });
    console.log(`[SEED] 0 Packs activos (catálogo reservado para fase posterior).`);
    return;
  }

  // Implementation ready for when packs are defined
  for (const pack of packsData) {
    let businessTypeId: string | undefined = undefined;
    if (pack.businessTypeSlug) {
      const bt = await prisma.businessType.findUnique({ where: { slug: pack.businessTypeSlug } });
      if (bt) businessTypeId = bt.id;
    }

    const createdPack = await prisma.pack.upsert({
      where: { slug: pack.slug },
      update: {
        name: pack.name,
        description: pack.description || null,
        images: pack.images || [],
        businessTypeId: businessTypeId || null,
        pricingMode: pack.pricingMode,
        fixedPrice: pack.fixedPrice ?? null,
        discountPercent: pack.discountPercent ?? 0,
        active: true,
      },
      create: {
        slug: pack.slug,
        name: pack.name,
        description: pack.description || null,
        images: pack.images || [],
        businessTypeId: businessTypeId || null,
        pricingMode: pack.pricingMode,
        fixedPrice: pack.fixedPrice ?? null,
        discountPercent: pack.discountPercent ?? 0,
      },
    });

    for (const item of pack.items) {
      const prod = await prisma.product.findUnique({ where: { slug: item.productSlug } });
      if (!prod) continue;

      const existing = await prisma.packItem.findFirst({
        where: { packId: createdPack.id, productId: prod.id },
      });

      if (existing) {
        await prisma.packItem.update({
          where: { id: existing.id },
          data: {
            quantity: item.quantity,
            presets: item.presets || undefined,
            order: item.order ?? 0,
          },
        });
      } else {
        await prisma.packItem.create({
          data: {
            packId: createdPack.id,
            productId: prod.id,
            quantity: item.quantity,
            presets: item.presets || undefined,
            order: item.order ?? 0,
          },
        });
      }
    }
  }

  console.log(`[SEED] ${packsData.length} Packs persistidos.`);
}
