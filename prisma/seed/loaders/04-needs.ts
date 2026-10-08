import { PrismaClient } from '@prisma/client';
import { needsData } from '../data/04-needs';

export async function loadNeeds(prisma: PrismaClient): Promise<void> {
  for (const need of needsData) {
    await prisma.need.upsert({
      where: { slug: need.slug },
      update: {
        name: need.name,
        order: need.order,
      },
      create: {
        slug: need.slug,
        name: need.name,
        order: need.order,
        active: true,
      },
    });
  }

  const expectedSlugs = needsData.map((need) => need.slug);
  await prisma.need.deleteMany({
    where: { slug: { notIn: expectedSlugs } },
  });

  console.log(`[SEED] ${needsData.length} Needs persistidas.`);
}
