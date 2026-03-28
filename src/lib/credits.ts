import 'server-only'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCreditEligibilityForUser } from '@/lib/financing'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    throw new Error('No autorizado')
  }

  return session
}

async function requireCustomer() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('No autorizado')
  }

  return session
}

const creditPlanInclude = {
  order: {
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  },
  scheduleItems: {
    orderBy: {
      sequence: 'asc' as const,
    },
    include: {
      submissions: {
        orderBy: {
          createdAt: 'desc' as const,
        },
      },
    },
  },
}

export async function getCurrentUserCreditEligibility() {
  const session = await auth()
  return getCreditEligibilityForUser(session?.user?.id)
}

export async function getCustomerCreditPlans() {
  const session = await requireCustomer()

  return prisma.zapCreditPlan.findMany({
    where: {
      order: {
        userId: session.user.id,
      },
    },
    include: creditPlanInclude,
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function getCustomerCreditPlan(id: string) {
  const session = await requireCustomer()

  return prisma.zapCreditPlan.findFirst({
    where: {
      id,
      order: {
        userId: session.user.id,
      },
    },
    include: creditPlanInclude,
  })
}

export async function getAdminCreditPlans() {
  await requireAdmin()

  return prisma.zapCreditPlan.findMany({
    include: creditPlanInclude,
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function getAdminCreditPlan(id: string) {
  await requireAdmin()

  return prisma.zapCreditPlan.findUnique({
    where: { id },
    include: creditPlanInclude,
  })
}
