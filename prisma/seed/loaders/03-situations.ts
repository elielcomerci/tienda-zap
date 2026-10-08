import { PrismaClient } from '@prisma/client';
import { situationsData } from '../data/03-situations';

export async function loadSituations(prisma: PrismaClient): Promise<void> {
  for (const sit of situationsData) {
    await prisma.situation.upsert({
      where: { slug: sit.slug },
      update: {
        name: sit.name,
        order: sit.order,
        active: true,
      },
      create: {
        slug: sit.slug,
        name: sit.name,
        order: sit.order,
        active: true,
      },
    });
  }

  const expectedSlugs = situationsData.map((sit) => sit.slug);
  await prisma.situation.updateMany({
    where: { slug: { notIn: expectedSlugs }, active: true },
    data: { active: false },
  });

  console.log(`[SEED] ${situationsData.length} Situations persistidas.`);
}
