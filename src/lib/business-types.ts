import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') redirect('/login')
}

export async function getBusinessTypes() {
  return prisma.businessType.findMany({
    include: {
      categories: { select: { id: true, name: true, slug: true } },
      _count: { select: { users: true } },
    },
    orderBy: { name: 'asc' },
  })
}

export async function getActiveBusinessTypes() {
  return prisma.businessType.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  })
}

export async function createBusinessType(data: { name: string; slug: string; categoryIds: string[] }) {
  await requireAdmin()
  return prisma.businessType.create({
    data: {
      name: data.name,
      slug: data.slug,
      categories: { connect: data.categoryIds.map((id) => ({ id })) },
    },
  })
}

export async function updateBusinessType(
  id: string,
  data: { name: string; slug: string; categoryIds: string[] }
) {
  await requireAdmin()
  return prisma.businessType.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      categories: { set: data.categoryIds.map((cid) => ({ id: cid })) },
    },
  })
}

export async function deleteBusinessType(id: string) {
  await requireAdmin()
  // Unlink users first
  await prisma.user.updateMany({
    where: { businessTypeId: id },
    data: { businessTypeId: null },
  })
  return prisma.businessType.delete({ where: { id } })
}
