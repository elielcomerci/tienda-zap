'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login')
  }
}

export async function createIncentive(data: {
  title: string
  description?: string
  goalType: string
  goalTarget: number
  rewardType: string
  rewardAmount: number
  startDate: Date
  endDate: Date
}) {
  await requireAdmin()

  await prisma.sellerIncentive.create({
    data: {
      ...data,
      active: true,
    },
  })

  revalidatePath('/admin/incentivos')
}

export async function toggleIncentiveActive(id: string, active: boolean) {
  await requireAdmin()

  await prisma.sellerIncentive.update({
    where: { id },
    data: { active },
  })

  revalidatePath('/admin/incentivos')
}

export async function deleteIncentive(id: string) {
  await requireAdmin()

  await prisma.sellerIncentive.delete({
    where: { id },
  })

  revalidatePath('/admin/incentivos')
}
