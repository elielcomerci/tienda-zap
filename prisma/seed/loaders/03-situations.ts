import { PrismaClient } from '@prisma/client';
import { situationsData } from '../data/03-situations';

export async function loadSituations(prisma: PrismaClient): Promise<void> {
  for (const sit of situationsData) {
    await prisma.situation.upsert({
      where: { slug: sit.slug },
      update: {
        name: sit.name,
        order: sit.order,
      },
      create: {
        slug: sit.slug,
        name: sit.name,
        order: sit.order,
        active: true,
      },
    });
  }

  console.log(`[SEED] ${situationsData.length} Situations persistidas.`);
}
