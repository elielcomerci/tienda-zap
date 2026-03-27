'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') throw new Error('No autorizado')
}

export async function getOrders(status?: string, paymentType?: string) {
  return prisma.order.findMany({
    where: {
      ...(status && { status: status as any }),
      ...(paymentType && { paymentType: paymentType as any }),
    },
    include: {
      items: { include: { product: true, selectedOptions: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true, selectedOptions: true } },
      user: { select: { name: true, email: true, phone: true } },
    },
  })
}

export async function updateOrderStatus(id: string, status: string) {
  await requireAdmin()
  await prisma.order.update({
    where: { id },
    data: { status: status as any },
  })
  revalidatePath('/admin/ordenes')
  revalidatePath(`/admin/ordenes/${id}`)
}

export async function confirmManualPayment(id: string) {
  await requireAdmin()
  await prisma.order.update({
    where: { id },
    data: { status: 'PAID' },
  })
  revalidatePath('/admin/ordenes')
  revalidatePath(`/admin/ordenes/${id}`)
}

export async function getDashboardStats() {
  const [pending, paid, processing, delivered, monthlyRevenue, recentOrders] = await Promise.all([
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { status: 'PAID' } }),
    prisma.order.count({ where: { status: 'PROCESSING' } }),
    prisma.order.count({ where: { status: 'DELIVERED' } }),
    prisma.order.aggregate({
      where: {
        status: { in: ['PAID', 'PROCESSING', 'READY', 'DELIVERED'] },
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { total: true },
    }),
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    }),
  ])

  return {
    counts: { pending, paid, processing, delivered },
    monthlyRevenue: monthlyRevenue._sum.total ?? 0,
    recentOrders,
  }
}
