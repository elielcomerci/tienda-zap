import crypto from 'crypto'
import { Prisma } from '@prisma/client'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const ORDER_PUBLIC_ACCESS_TOKEN_BYTES = 32

export function createOrderPublicAccessToken() {
  return crypto.randomBytes(ORDER_PUBLIC_ACCESS_TOKEN_BYTES).toString('base64url')
}

export function hashOrderPublicAccessToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function buildOrderAccessQuery(orderId: string, token?: string) {
  const params = new URLSearchParams({ orderId })
  if (token) params.set('token', token)
  return params.toString()
}

export async function getAccessibleOrderWhere(
  orderId: string,
  accessToken?: string
): Promise<Prisma.OrderWhereInput | null> {
  const session = await auth()

  if (session?.user?.role === 'ADMIN') {
    return { id: orderId }
  }

  const accessFilters: Prisma.OrderWhereInput[] = []

  if (session?.user?.id) {
    accessFilters.push({ userId: session.user.id })
  }

  if (accessToken) {
    accessFilters.push({
      publicAccessTokenHash: hashOrderPublicAccessToken(accessToken),
    })
  }

  if (accessFilters.length === 0) {
    return null
  }

  return {
    id: orderId,
    OR: accessFilters,
  }
}

export async function findAccessibleOrder(
  orderId: string,
  accessToken?: string,
  args: any = {}
): Promise<any> {
  const where = await getAccessibleOrderWhere(orderId, accessToken)
  if (!where) return null

  return prisma.order.findFirst({
    ...args,
    where,
  })
}

export async function findAccessibleOrderItem(
  orderId: string,
  itemId: string,
  accessToken?: string,
  args: any = {}
): Promise<any> {
  const orderWhere = await getAccessibleOrderWhere(orderId, accessToken)
  if (!orderWhere) return null

  return prisma.orderItem.findFirst({
    ...args,
    where: {
      id: itemId,
      order: {
        is: orderWhere,
      },
      ...(args.where ?? {}),
    },
  })
}
