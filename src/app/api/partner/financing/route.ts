import 'server-only'
import { NextResponse } from 'next/server'
import { authenticatePartnerRequest } from '@/lib/partner-auth'
import { getFinancingSnapshot } from '@/lib/financing'
import { prisma } from '@/lib/prisma'
import {
  calculateFinancingPlan,
  clampCreditDownPaymentPercent,
  getInstallmentLimits,
  type PaymentFrequency,
} from '@/lib/financing-calculator'

/**
 * POST /api/partner/financing
 *
 * Simula un plan de crédito ZAP para una sucursal partner.
 * Evalúa el historial de créditos activos/vencidos de esa sucursal
 * y aplica penalidades si corresponde.
 *
 * Body: { amount: number, installments: number, paymentFrequency?: "MONTHLY"|"WEEKLY"|"DAILY" }
 * Response: plan de cuotas completo con ratePercent, installmentAmount, schedule, etc.
 */
export async function POST(req: Request) {
  const auth = await authenticatePartnerRequest(req)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { partnerAccount } = auth

  let body: { amount?: unknown; installments?: unknown; paymentFrequency?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido.' }, { status: 400 })
  }

  const amount = typeof body.amount === 'number' ? body.amount : null
  const installments = typeof body.installments === 'number' ? Math.round(body.installments) : null
  const paymentFrequency: PaymentFrequency =
    body.paymentFrequency === 'WEEKLY' || body.paymentFrequency === 'DAILY'
      ? body.paymentFrequency
      : 'MONTHLY'

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'El campo amount debe ser un número positivo.' }, { status: 400 })
  }

  const { min, max } = getInstallmentLimits(paymentFrequency)
  if (!installments || installments < min || installments > max) {
    return NextResponse.json(
      { error: `Para pagos ${paymentFrequency} el rango de cuotas es ${min}–${max}.` },
      { status: 400 }
    )
  }

  // Evaluar historial crediticio del partner
  const [activeCredits, overdueInstallments] = await Promise.all([
    prisma.zapCreditPlan.count({
      where: {
        order: { partnerAccountId: partnerAccount.id },
        status: { in: ['QUOTED', 'APPROVED', 'ACTIVE'] },
      },
    }),
    prisma.zapCreditInstallment.count({
      where: {
        dueDate: { lt: new Date() },
        status: { in: ['PENDING', 'REJECTED'] },
        plan: {
          status: { in: ['APPROVED', 'ACTIVE'] },
          order: { partnerAccountId: partnerAccount.id },
        },
      },
    }),
  ])

  const snapshot = await getFinancingSnapshot()
  const hasDelinquency = overdueInstallments > 0
  const ratePenaltyPercent = hasDelinquency ? snapshot.settings.delinquentRatePenaltyPercent : 0
  const downPaymentPenaltyPercent = hasDelinquency
    ? snapshot.settings.delinquentDownPaymentPenaltyPercent
    : 0
  const effectiveRatePercent = snapshot.effectiveRatePercent + ratePenaltyPercent
  const downPaymentPercent = clampCreditDownPaymentPercent(30 + downPaymentPenaltyPercent)

  const firstDueDate = new Date()
  firstDueDate.setMonth(firstDueDate.getMonth() + 1)

  const plan = calculateFinancingPlan({
    baseAmount: amount,
    downPaymentPercent,
    ratePercent: effectiveRatePercent,
    installments,
    paymentFrequency,
    firstDueDate,
  })

  return NextResponse.json({
    // Info del branch
    branchId: partnerAccount.kiosco24BranchId,
    branchName: partnerAccount.kiosco24BranchName,
    // Estado crediticio
    creditStatus: {
      activeCredits,
      overdueInstallments,
      hasDelinquency,
      ratePenaltyPercent,
      downPaymentPenaltyPercent,
    },
    // Plan calculado
    plan: {
      baseAmount: plan.baseAmount,
      downPaymentPercent: plan.downPaymentPercent,
      downPaymentAmount: plan.downPaymentAmount,
      financedAmount: plan.financedAmount,
      ratePercent: plan.ratePercent,
      rateSource: snapshot.rateSource,
      paymentFrequency: plan.paymentFrequency,
      installments: plan.installments,
      installmentAmount: plan.installmentAmount,
      totalRepayable: plan.totalRepayable,
      totalInterest: plan.totalInterest,
      firstDueDate: plan.firstDueDate,
      schedule: plan.schedule,
    },
  })
}
