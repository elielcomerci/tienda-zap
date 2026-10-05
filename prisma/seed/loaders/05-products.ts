import { PrismaClient } from '@prisma/client';
import { productsData } from '../data/05-products';

export async function loadProducts(prisma: PrismaClient): Promise<void> {
  for (const p of productsData) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        modality: p.modality,
        engine: p.engine,
        whatIs: p.whatIs,
        purpose: p.purpose,
        includes: p.includes || [],
        configurable: p.configurable || [],
        consultationNote: p.consultationNote || null,
        priceFrom: p.priceFrom ?? null,
        active: p.active ?? true,
      },
      create: {
        slug: p.slug,
        name: p.name,
        modality: p.modality,
        engine: p.engine,
        whatIs: p.whatIs,
        purpose: p.purpose,
        includes: p.includes || [],
        configurable: p.configurable || [],
        consultationNote: p.consultationNote || null,
        priceFrom: p.priceFrom ?? null,
        active: p.active ?? true,
        images: [],
      },
    });
  }

  console.log(`[SEED] ${productsData.length} Product Bases persistidos.`);
}
