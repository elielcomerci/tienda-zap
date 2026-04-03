import 'server-only'
import { NextResponse } from 'next/server'
import { authenticatePartnerRequest } from '@/lib/partner-auth'
import { getFinancingSnapshot } from '@/lib/financing'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/partner/cashflow
 *
 * Devuelve el resumen crediticio de una sucursal partner en tienda.zap.
 * Permite que kiosco24 muestre un widget "Mi crédito ZAP" en su panel.
 *
 * Response:
 * {
 *   creditStatus: { activeCredits, overdueInstallments, hasDelinquency },
 *   rates: { baseRatePercent, penaltyPercent, effectiveRatePercent },
 *   summary: { totalOrders, totalSpent, totalPaid, totalPending },
 *   recentCredits: [ ...últimos 5 créditos con estado ]
 * }
 */
export async function GET(req: Request) {
  const auth = await authenticatePartnerRequest(req)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { partnerAccount } = auth

  const [
    allOrders,
    activeCredits,
    overdueInstallments,
    paidInstallments,
    pendingInstallments,
  ] = await Promise.all([
    // Todas las órdenes del partner
    prisma.order.findMany({
      where: { partnerAccountId: partnerAccount.id },
      select: {
        id: true,
        total: true,
        status: true,
        paymentType: true,
        createdAt: true,
        zapCreditPlan: {
          select: {
            id: true,
            status: true,
            ratePercent: true,
            installments: true,
            installmentAmount: true,
            totalRepayable: true,
            firstDueDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    // Créditos activos
    prisma.zapCreditPlan.count({
      where: {
        order: { partnerAccountId: partnerAccount.id },
        status: { in: ['QUOTED', 'APPROVED', 'ACTIVE'] },
      },
    }),
    // Cuotas vencidas sin pagar
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
    // Cuotas aprobadas (pagadas)
    prisma.zapCreditInstallment.aggregate({
      _sum: { amount: true },
      where: {
        status: 'APPROVED',
        plan: { order: { partnerAccountId: partnerAccount.id } },
      },
    }),
    // Cuotas pendientes (futuras)
    prisma.zapCreditInstallment.aggregate({
      _sum: { amount: true },
      where: {
        status: 'PENDING',
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
  const effectiveRatePercent = snapshot.effectiveRatePercent + ratePenaltyPercent

  const totalSpent = allOrders.reduce((sum, o) => sum + o.total, 0)
  const totalPaid = paidInstallments._sum.amount ?? 0
  const totalPending = pendingInstallments._sum.amount ?? 0

  // Últimos 5 créditos con su estado
  const recentCredits = allOrders
    .filter((o) => o.zapCreditPlan)
    .slice(0, 5)
    .map((o) => ({
      orderId: o.id,
      orderDate: o.createdAt,
      creditStatus: o.zapCreditPlan!.status,
      installments: o.zapCreditPlan!.installments,
      installmentAmount: o.zapCreditPlan!.installmentAmount,
      totalRepayable: o.zapCreditPlan!.totalRepayable,
      firstDueDate: o.zapCreditPlan!.firstDueDate,
    }))

  return NextResponse.json({
    partner: {
      branchId: partnerAccount.kiosco24BranchId,
      branchName: partnerAccount.kiosco24BranchName,
    },
    creditStatus: {
      activeCredits,
      overdueInstallments,
      hasDelinquency,
    },
    rates: {
      baseRatePercent: snapshot.effectiveRatePercent,
      rateSource: snapshot.rateSource,
      penaltyPercent: ratePenaltyPercent,
      effectiveRatePercent,
      note: hasDelinquency
        ? `Tenés ${overdueInstallments} cuota(s) vencida(s). Tu tasa tiene un recargo de +${ratePenaltyPercent}%.`
        : 'Tu historial de pagos está al día. Accedés a la tasa base.',
    },
    summary: {
      totalOrders: allOrders.length,
      totalSpent,
      totalPaid,
      totalPending,
    },
    recentCredits,
  })
}
