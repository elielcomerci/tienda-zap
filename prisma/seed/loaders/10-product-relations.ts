import { PrismaClient } from '@prisma/client';
import { productRelationsData } from '../data/10-product-relations';

export async function loadProductRelations(prisma: PrismaClient): Promise<void> {
  await prisma.productRelation.deleteMany();
  const products = await prisma.product.findMany({ select: { id: true, slug: true } });
  const productIds = new Map(products.map((product) => [product.slug, product.id]));
  for (const relation of productRelationsData) {
    const productId = productIds.get(relation.productSlug);
    const relatedProductId = productIds.get(relation.relatedProductSlug);
    if (!productId || !relatedProductId) throw new Error(
      `[SEED ERROR] ProductRelation inválida: '${relation.productSlug}' → '${relation.relatedProductSlug}'.`
    );
    await prisma.productRelation.create({ data: { productId, relatedProductId } });
  }
  console.log(`[SEED] ${productRelationsData.length} ProductRelations persistidas.`);
}