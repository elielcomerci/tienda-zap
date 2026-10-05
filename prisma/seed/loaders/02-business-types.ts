import { PrismaClient } from '@prisma/client';
import { businessTypesData } from '../data/02-business-types';

export async function loadBusinessTypes(prisma: PrismaClient): Promise<void> {
  for (const bt of businessTypesData) {
    await prisma.businessType.upsert({
      where: { slug: bt.slug },
      update: { name: bt.name },
      create: { slug: bt.slug, name: bt.name },
    });
  }

  console.log(`[SEED] 7 BusinessTypes (Rubros) persistidos.`);
}
