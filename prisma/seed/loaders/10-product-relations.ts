import { PrismaClient } from '@prisma/client';
import { productRelationsData } from '../data/10-product-relations';

export async function loadProductRelations(prisma: PrismaClient): Promise<void> {
  const products = await prisma.product.findMany({ where: { active: true }, select: { id: true, slug: true } });
  const productIds = new Map(products.map((product) => [product.slug, product.id]));

  // Validar las relaciones antes de eliminar las actuales.
  const resolvedRelations = productRelationsData.map((relation) => {
    const productId = productIds.get(relation.productSlug);
    const relatedProductId = productIds.get(relation.relatedProductSlug);
    if (!productId || !relatedProductId) {
      throw new Error(
        `[SEED ERROR] ProductRelation inválida: '${relation.productSlug}' → '${relation.relatedProductSlug}'.`
      );
    }
    return { productId, relatedProductId };
  });

  // La lista del seed es la fuente completa y se reemplaza en una sola transacción.
  await prisma.$transaction(async (tx) => {
    await tx.productRelation.deleteMany();
    if (resolvedRelations.length > 0) {
      await tx.productRelation.createMany({ data: resolvedRelations });
    }
  });

  console.log(`[SEED] ${resolvedRelations.length} ProductRelations persistidas.`);
}
