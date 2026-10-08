import { PrismaClient } from '@prisma/client';
import { productsData } from '../data/05-products';

export async function loadProducts(prisma: PrismaClient): Promise<void> {
  for (const p of productsData) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        catalogType: p.catalogType,
        modality: p.modality,
        engine: p.engine,
        whatIs: p.whatIs,
        purpose: p.purpose,
        includes: p.includes || [],
        configurable: p.configurable || [],
        consultationNote: p.consultationNote || null,
        ...(p.price !== undefined ? { price: p.price } : {}),
        ...(p.briefType !== undefined ? { briefType: p.briefType } : {}),
        priceFrom: p.priceFrom ?? null,
        active: p.active ?? true,
      },
      create: {
        slug: p.slug,
        name: p.name,
        catalogType: p.catalogType,
        modality: p.modality,
        engine: p.engine,
        whatIs: p.whatIs,
        purpose: p.purpose,
        includes: p.includes || [],
        configurable: p.configurable || [],
        consultationNote: p.consultationNote || null,
        price: p.price ?? 0,
        briefType: p.briefType ?? null,
        priceFrom: p.priceFrom ?? null,
        active: p.active ?? true,
        images: [],
      },
    });
  }

  const expectedSlugs = productsData.map((product) => product.slug);
  // Keep historical product rows (orders/relations may reference them), but remove
  // products outside the current catalog from the public surface.
  await prisma.product.updateMany({
    where: { slug: { notIn: expectedSlugs }, active: true },
    data: { active: false },
  });

  console.log(`[SEED] ${productsData.length} Product Bases persistidos; productos fuera de fuente desactivados.`);
}
