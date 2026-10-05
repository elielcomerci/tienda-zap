import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getAdminSeedData } from '../data/01-admin';

export async function loadAdmin(prisma: PrismaClient): Promise<void> {
  const admin = getAdminSeedData();
  if (!admin) return;

  const passwordHash = await bcrypt.hash(admin.password, 12);

  await prisma.user.upsert({
    where: { email: admin.email },
    update: {
      role: 'ADMIN',
      name: admin.name,
    },
    create: {
      email: admin.email,
      password: passwordHash,
      role: 'ADMIN',
      name: admin.name,
    },
  });

  console.log(`[SEED] Admin cargado / actualizado: ${admin.email}`);
}
