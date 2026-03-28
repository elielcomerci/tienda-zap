import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { findAccessibleOrder } from '@/lib/order-access'

const validOrderStatuses = new Set([
  'PENDING',
  'PAID',
  'PROCESSING',
  'READY',
  'DELIVERED',
  'CANCELLED',
])

const validPaymentTypes = new Set(['MERCADOPAGO', 'TRANSFER', 'CASH'])

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') throw new Error('No autorizado')
}

const adminOrderInclude = {
  items: { include: { product: true, selectedOptions: true } },
  user: { select: { name: true, email: true, phone: true } },
}

const viewerOrderInclude = {
  items: {
    include: {
      product: { select: { id: true, name: true, slug: true, images: true } },
      selectedOptions: true,
    },
  },
  user: { select: { name: true, email: true, phone: true } },
}

export async function getOrders(status?: string, paymentType?: string) {
  await requireAdmin()

  const safeStatus = status && validOrderStatuses.has(status) ? status : undefined
  const safePaymentType = paymentType && validPaymentTypes.has(paymentType) ? paymentType : undefined

  return prisma.order.findMany({
    where: {
      ...(safeStatus ? { status: safeStatus as any } : {}),
      ...(safePaymentType ? { paymentType: safePaymentType as any } : {}),
    },
    include: adminOrderInclude,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getAdminOrder(id: string) {
  await requireAdmin()

  return prisma.order.findUnique({
    where: { id },
    include: adminOrderInclude,
  })
}

export async function getOrderForViewer(id: string, accessToken?: string) {
  return findAccessibleOrder(id, accessToken, {
    include: viewerOrderInclude,
  })
}

export async function getCustomerOrder(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('No autorizado')

  return prisma.order.findFirst({
    where: { id, userId: session.user.id },
    include: viewerOrderInclude,
  })
}

export async function getDashboardStats() {
  await requireAdmin()

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
