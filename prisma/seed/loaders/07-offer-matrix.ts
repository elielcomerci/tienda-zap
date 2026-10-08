import { PrismaClient } from '@prisma/client';
import { offerMatrixData } from '../data/07-offer-matrix';

export async function loadOfferMatrix(prisma: PrismaClient): Promise<void> {
  const [businessTypes, situations, needs, products] = await Promise.all([
    prisma.businessType.findMany({ select: { id: true, slug: true } }),
    prisma.situation.findMany({ where: { active: true }, select: { id: true, slug: true } }),
    prisma.need.findMany({ where: { active: true }, select: { id: true, slug: true } }),
    prisma.product.findMany({ where: { active: true }, select: { id: true, slug: true } }),
  ]);

  const btMap = new Map(businessTypes.map((b) => [b.slug, b.id]));
  const sitMap = new Map(situations.map((s) => [s.slug, s.id]));
  const needMap = new Map(needs.map((n) => [n.slug, n.id]));
  const prodMap = new Map(products.map((p) => [p.slug, p.id]));

  // Resolver y validar todo antes de tocar la matriz persistida.
  const resolvedEntries = offerMatrixData.map((entry, index) => {
    const businessTypeId = btMap.get(entry.businessTypeSlug);
    const situationId = sitMap.get(entry.situationSlug);
    const needId = needMap.get(entry.needSlug);
    const productId = prodMap.get(entry.productSlug);

    if (!businessTypeId) {
      throw new Error(`[SEED ERROR] BusinessType no encontrado: ${entry.businessTypeSlug}`);
    }
    if (!situationId) {
      throw new Error(`[SEED ERROR] Situation no encontrada: ${entry.situationSlug}`);
    }
    if (!needId) {
      throw new Error(`[SEED ERROR] Need no encontrada: ${entry.needSlug}`);
    }
    if (!productId) {
      throw new Error(`[SEED ERROR] Product no encontrado: ${entry.productSlug}`);
    }

    return {
      businessTypeId,
      situationId,
      needId,
      productId,
      order: (index + 1) * 10,
    };
  });

  // La matriz editorial es fuente completa. La sustitución es atómica:
  // un error de escritura no deja la base con la matriz vacía o incompleta.
  await prisma.$transaction(async (tx) => {
    await tx.offerMatrixEntry.deleteMany({});
    if (resolvedEntries.length > 0) {
      await tx.offerMatrixEntry.createMany({ data: resolvedEntries });
    }
  });

  console.log(`[SEED] ${resolvedEntries.length} OfferMatrixEntries persistidas.`);
}
