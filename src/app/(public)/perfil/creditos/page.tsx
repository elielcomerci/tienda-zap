import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, ArrowLeft, ChevronRight, Wallet } from 'lucide-react'
import { auth } from '@/auth'
import {
  summarizeCreditPlan,
  getCreditPlanStatusLabel,
  getCreditPlanStatusTheme,
} from '@/lib/credit-status'
import { getCustomerCreditPlans, getCurrentUserCreditEligibility } from '@/lib/credits'
import { getFinancingSnapshot } from '@/lib/financing'
import { getOrderDisplayCode } from '@/lib/orders-workflow'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Mis creditos | ZAP Tienda',
}

export default async function CustomerCreditsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const financingSnapshot = await getFinancingSnapshot()
  const [plans, eligibility] = await Promise.all([
    getCustomerCreditPlans(session.user.id),
    getCurrentUserCreditEligibility(financingSnapshot, session.user.id),
  ])

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <Link
        href="/perfil"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} /> Volver a mi perfil
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
          <Wallet size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis creditos</h1>
          <p className="text-sm text-gray-500">
            Estado de cartera, vencimientos y comprobantes cargados.
          </p>
        </div>
      </div>

      {eligibility.hasDelinquency && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">Tenes cuotas vencidas pendientes</p>
              <p className="mt-1 text-amber-800">
                Podes seguir comprando, pero las nuevas solicitudes de Credito ZAP van a mostrar
                tasa y anticipo mas altos hasta regularizar tu cuenta.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Creditos activos</p>
          <p className="mt-2 text-2xl font-black text-gray-900">
            {eligibility.activeCreditsCount}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Cuotas vencidas</p>
          <p className="mt-2 text-2xl font-black text-gray-900">
            {eligibility.overdueInstallmentsCount}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Creditos totales</p>
          <p className="mt-2 text-2xl font-black text-gray-900">{plans.length}</p>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Wallet size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="font-medium">Todavia no tenes creditos activos</p>
          <Link
            href="/productos"
            className="mt-3 inline-block text-sm text-orange-500 hover:underline"
          >
            Ver productos
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => {
            const summary = summarizeCreditPlan(plan)
            const orderCode = getOrderDisplayCode(plan.order.id)

            return (
              <Link
                key={plan.id}
                href={`/perfil/creditos/${plan.id}`}
                className="group card flex items-center gap-4 p-4 transition-all hover:border-orange-200 hover:shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getCreditPlanStatusTheme(plan.status)}`}
                    >
                      {getCreditPlanStatusLabel(plan.status)}
                    </span>
                    <span className="text-xs text-gray-400">Orden #{orderCode}</span>
                    {summary.overdueCount > 0 && (
                      <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
                        {summary.overdueCount} vencida/s
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-gray-900">
                    {plan.order.items.map((item) => item.product.name).join(', ')}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Pagado: ${summary.paidAmount.toLocaleString('es-AR')} · Pendiente: $
                    {summary.remainingAmount.toLocaleString('es-AR')}
                  </p>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                      <span>Avance del credito</span>
                      <span>{summary.paymentProgressPercent}% cobrado</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500"
                        style={{ width: `${summary.paymentProgressPercent}%` }}
                      />
                    </div>
                  </div>

                  {summary.nextDueItem && (
                    <p className="mt-2 text-xs text-gray-400">
                      Proximo vencimiento {summary.nextDueItem.dueDate.toLocaleDateString('es-AR')}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-bold text-gray-900">
                    ${plan.financedAmount.toLocaleString('es-AR')}
                  </p>
                  <ChevronRight
                    size={16}
                    className="ml-auto mt-1 text-gray-300 transition-colors group-hover:text-orange-400"
                  />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
