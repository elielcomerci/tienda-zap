'use server'

import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    throw new Error('No autorizado')
  }

  return session
}

function revalidateCreditViews(orderId: string, planId: string) {
  revalidatePath('/admin/creditos')
  revalidatePath(`/admin/creditos/${planId}`)
  revalidatePath('/admin/ordenes')
  revalidatePath(`/admin/ordenes/${orderId}`)
  revalidatePath('/perfil')
  revalidatePath('/perfil/creditos')
  revalidatePath(`/perfil/creditos/${planId}`)
}

export async function syncZapCreditPlanStatus(planId: string) {
  const plan = await prisma.zapCreditPlan.findUnique({
    where: { id: planId },
    select: {
      id: true,
      orderId: true,
      status: true,
      scheduleItems: {
        select: {
          status: true,
        },
      },
    },
  })

  if (!plan) {
    throw new Error('Credito no encontrado.')
  }

  if (plan.status === 'REJECTED' || plan.status === 'CANCELLED') {
    return plan.status
  }

  const totalInstallments = plan.scheduleItems.length
  const approvedInstallments = plan.scheduleItems.filter(
    (installment) => installment.status === 'APPROVED'
  ).length

  let nextStatus = plan.status

  if (totalInstallments > 0 && approvedInstallments === totalInstallments) {
    nextStatus = 'COMPLETED'
  } else if (plan.status === 'APPROVED' || plan.status === 'ACTIVE' || plan.status === 'COMPLETED') {
    nextStatus = 'ACTIVE'
  }

  if (nextStatus !== plan.status) {
    await prisma.zapCreditPlan.update({
      where: { id: plan.id },
      data: { status: nextStatus },
    })
  }

  revalidateCreditViews(plan.orderId, plan.id)
  return nextStatus
}

export async function activateZapCreditPlanForOrder(orderId: string) {
  const plan = await prisma.zapCreditPlan.findUnique({
    where: { orderId },
    select: {
      id: true,
      orderId: true,
      status: true,
    },
  })

  if (!plan || plan.status === 'REJECTED' || plan.status === 'CANCELLED' || plan.status === 'COMPLETED') {
    return
  }

  if (plan.status !== 'ACTIVE') {
    await prisma.zapCreditPlan.update({
      where: { id: plan.id },
      data: { status: 'ACTIVE' },
    })
  }

  revalidateCreditViews(plan.orderId, plan.id)
}

export async function approveCreditSubmission(input: {
  submissionId: string
  reviewNotes?: string
}) {
  const session = await requireAdmin()

  const submission = await prisma.zapCreditPaymentSubmission.findUnique({
    where: { id: input.submissionId },
    include: {
      installment: {
        select: {
          id: true,
          planId: true,
          plan: {
            select: {
              orderId: true,
            },
          },
        },
      },
    },
  })

  if (!submission) {
    throw new Error('Comprobante no encontrado.')
  }

  await prisma.$transaction([
    prisma.zapCreditPaymentSubmission.update({
      where: { id: submission.id },
      data: {
        status: 'APPROVED',
        reviewNotes: input.reviewNotes?.trim() || null,
        reviewedAt: new Date(),
        reviewedByUserId: session.user.id,
      },
    }),
    prisma.zapCreditPaymentSubmission.updateMany({
      where: {
        installmentId: submission.installmentId,
        id: { not: submission.id },
        status: 'SUBMITTED',
      },
      data: {
        status: 'REJECTED',
        reviewNotes: 'Se aprobó otro comprobante para esta cuota.',
        reviewedAt: new Date(),
        reviewedByUserId: session.user.id,
      },
    }),
    prisma.zapCreditInstallment.update({
      where: { id: submission.installmentId },
      data: {
        status: 'APPROVED',
        approvedSubmissionId: submission.id,
        approvedAt: new Date(),
        reviewNotes: input.reviewNotes?.trim() || null,
      },
    }),
  ])

  await syncZapCreditPlanStatus(submission.installment.planId)
}

export async function rejectCreditSubmission(input: {
  submissionId: string
  reviewNotes?: string
}) {
  const session = await requireAdmin()

  const submission = await prisma.zapCreditPaymentSubmission.findUnique({
    where: { id: input.submissionId },
    include: {
      installment: {
        select: {
          id: true,
          planId: true,
          plan: {
            select: {
              orderId: true,
            },
          },
        },
      },
    },
  })

  if (!submission) {
    throw new Error('Comprobante no encontrado.')
  }

  await prisma.zapCreditPaymentSubmission.update({
    where: { id: submission.id },
    data: {
      status: 'REJECTED',
      reviewNotes: input.reviewNotes?.trim() || null,
      reviewedAt: new Date(),
      reviewedByUserId: session.user.id,
    },
  })

  const remainingSubmitted = await prisma.zapCreditPaymentSubmission.count({
    where: {
      installmentId: submission.installmentId,
      status: 'SUBMITTED',
    },
  })

  await prisma.zapCreditInstallment.update({
    where: { id: submission.installmentId },
    data: {
      status: remainingSubmitted > 0 ? 'SUBMITTED' : 'REJECTED',
      reviewNotes: input.reviewNotes?.trim() || null,
    },
  })

  await syncZapCreditPlanStatus(submission.installment.planId)
}
