import { PrismaClient } from '@prisma/client';
import { offerMatrixData } from '../data/07-offer-matrix';

export async function loadOfferMatrix(prisma: PrismaClient): Promise<void> {
  const [businessTypes, situations, needs, products] = await Promise.all([
    prisma.businessType.findMany({ select: { id: true, slug: true } }),
    prisma.situation.findMany({ select: { id: true, slug: true } }),
    prisma.need.findMany({ select: { id: true, slug: true } }),
    prisma.product.findMany({ select: { id: true, slug: true } }),
  ]);

  const btMap = new Map(businessTypes.map((b) => [b.slug, b.id]));
  const sitMap = new Map(situations.map((s) => [s.slug, s.id]));
  const needMap = new Map(needs.map((n) => [n.slug, n.id]));
  const prodMap = new Map(products.map((p) => [p.slug, p.id]));

  // Remove relaciones que dejaron de formar parte de la matriz editorial.
  // La carga principal es upsert-based, así que sin esta limpieza una relación
  // retirada del seed seguiría apareciendo en producción.
  await prisma.offerMatrixEntry.deleteMany({
    where: {
      situation: { slug: 'quiero-generar-contactos' },
      need: { slug: 'necesito-facilitar-que-se-lleven-la-marca' },
    },
  });

  for (let i = 0; i < offerMatrixData.length; i++) {
    const entry = offerMatrixData[i];
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

    await prisma.offerMatrixEntry.upsert({
      where: {
        businessTypeId_situationId_needId_productId: {
          businessTypeId,
          situationId,
          needId,
          productId,
        },
      },
      update: {
        order: (i + 1) * 10,
      },
      create: {
        businessTypeId,
        situationId,
        needId,
        productId,
        order: (i + 1) * 10,
      },
    });
  }

  console.log(`[SEED] ${offerMatrixData.length} OfferMatrixEntries persistidas.`);
}
