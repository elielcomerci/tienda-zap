import Link from 'next/link'
import { AlertTriangle, Eye, Receipt, ShieldAlert, Wallet } from 'lucide-react'
import {
  getCreditPlanStatusLabel,
  getCreditPlanStatusTheme,
  summarizeCreditPlan,
} from '@/lib/credit-status'
import { getAdminCreditPlans } from '@/lib/credits'
import { getOrderDisplayCode } from '@/lib/orders-workflow'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Creditos | ZAP Admin',
}

function getCustomerLabel(plan: Awaited<ReturnType<typeof getAdminCreditPlans>>[number]) {
  return (
    plan.order.user?.name ||
    plan.order.guestName ||
    plan.order.user?.email ||
    plan.order.guestEmail ||
    'Cliente sin nombre'
  )
}

export default async function AdminCreditsPage() {
  const plans = await getAdminCreditPlans()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Creditos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Seguimiento de cartera, pagos en revision y alertas de comprobantes duplicados.
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 font-semibold text-gray-500">
            <tr>
              <th className="px-6 py-4">Credito</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Pagos</th>
              <th className="px-6 py-4">Alertas</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {plans.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  Todavia no hay creditos registrados.
                </td>
              </tr>
            ) : (
              plans.map((plan) => {
                const summary = summarizeCreditPlan(plan)
                const orderCode = getOrderDisplayCode(plan.order.id)

                return (
                  <tr key={plan.id} className="transition-colors hover:bg-gray-50/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                          <Wallet size={18} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">#{orderCode}</p>
                          <p className="text-xs text-gray-400">
                            {plan.createdAt.toLocaleDateString('es-AR')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{getCustomerLabel(plan)}</p>
                      <p className="text-xs text-gray-500">
                        ${plan.financedAmount.toLocaleString('es-AR')} financiados
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getCreditPlanStatusTheme(plan.status)}`}>
                        {getCreditPlanStatusLabel(plan.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-xs text-gray-600">
                        <p>{summary.approvedCount} aprobadas</p>
                        <p>{summary.submittedCount} en revision</p>
                        <p>{summary.pendingCount} pendientes</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {summary.overdueCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
                            <AlertTriangle size={12} /> {summary.overdueCount} vencida/s
                          </span>
                        )}
                        {summary.submittedCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
                            <Receipt size={12} /> {summary.submittedCount} por revisar
                          </span>
                        )}
                        {summary.flaggedSubmissions > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                            <ShieldAlert size={12} /> {summary.flaggedSubmissions} duplicado/s
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/creditos/${plan.id}`} className="btn-secondary !py-2 !text-xs">
                        <Eye size={14} />
                        Detalle
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
