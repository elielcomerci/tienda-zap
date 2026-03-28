import Link from 'next/link'
import { ArrowRight, Calculator, Landmark, Percent } from 'lucide-react'
import FinancingCalculator from '@/components/admin/FinancingCalculator'
import { saveFinancingSettings } from '@/lib/actions/financing'
import { getAdminOrder } from '@/lib/orders'
import { getFinancingSnapshot } from '@/lib/financing'
import { calculateWeightedDownPaymentPercent, getPaymentFrequencyLabel } from '@/lib/financing-calculator'
import { getOrderDisplayCode } from '@/lib/orders-workflow'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Financiacion | ZAP Admin',
}

export default async function AdminFinancingPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>
}) {
  const { orderId } = await searchParams
  const financingSnapshot = await getFinancingSnapshot()
  const linkedOrder = orderId ? await getAdminOrder(orderId) : null

  const orderContext =
    linkedOrder && linkedOrder.paymentType === 'ZAP_CREDIT'
      ? {
          orderId: linkedOrder.id,
          orderCode: getOrderDisplayCode(linkedOrder.id),
          total: linkedOrder.total,
          downPaymentPercent: calculateWeightedDownPaymentPercent(
            linkedOrder.items.map((item) => ({
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              creditDownPaymentPercent: item.creditDownPaymentPercent,
            }))
          ),
          existingPlan: linkedOrder.zapCreditPlan
            ? {
                ratePercent: linkedOrder.zapCreditPlan.ratePercent,
                installments: linkedOrder.zapCreditPlan.installments,
                paymentFrequency: linkedOrder.zapCreditPlan.paymentFrequency,
                firstDueDate: linkedOrder.zapCreditPlan.firstDueDate?.toISOString() ?? null,
                notes: linkedOrder.zapCreditPlan.notes,
              }
            : null,
        }
      : undefined

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financiacion ZAP</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tasa de referencia por IPC, override manual y calculadora interna para cerrar planes.
          </p>
        </div>

        {orderContext && (
          <Link href={`/admin/ordenes/${orderContext.orderId}`} className="btn-secondary">
            Volver a la orden #{orderContext.orderCode}
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
              <Percent size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Promedio IPC 12 meses</p>
              <p className="text-2xl font-black text-gray-900">
                {financingSnapshot.indecRate
                  ? `${financingSnapshot.indecRate.averageRatePercent.toLocaleString('es-AR')}%`
                  : 'No disponible'}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {financingSnapshot.indecRate
              ? `Ultimo dato: ${new Date(financingSnapshot.indecRate.lastObservationDate).toLocaleDateString('es-AR')}`
              : 'No pudimos leer la API de INDEC en este momento.'}
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
              <Landmark size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Tasa activa</p>
              <p className="text-2xl font-black text-gray-900">
                {financingSnapshot.effectiveRatePercent.toLocaleString('es-AR')}%
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Fuente actual:{' '}
            {financingSnapshot.rateSource === 'MANUAL_OVERRIDE'
              ? 'override manual'
              : financingSnapshot.rateSource === 'INDEC_AVERAGE'
                ? 'promedio IPC 12 meses'
                : 'fallback local'}
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <Calculator size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Defaults del sistema</p>
              <p className="text-2xl font-black text-gray-900">
                {financingSnapshot.settings.defaultInstallments} cuotas
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Frecuencia:{' '}
            {getPaymentFrequencyLabel(financingSnapshot.settings.defaultPaymentFrequency)}. Tarjeta:{' '}
            hasta {financingSnapshot.settings.cardInstallments} cuotas.
          </p>
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Configuracion global</h2>
            <p className="mt-1 text-sm text-gray-500">
              Define serie de referencia, override de tasa y defaults para nuevas solicitudes.
            </p>
          </div>
        </div>

        <form action={saveFinancingSettings} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="label">Serie INDEC</label>
            <input
              type="text"
              name="indecSeriesId"
              defaultValue={financingSnapshot.settings.indecSeriesId}
              className="input font-mono !text-sm"
            />
          </div>

          <div>
            <label className="label">Override manual</label>
            <div className="relative">
              <input
                type="number"
                name="manualRatePercent"
                min="0"
                step="0.01"
                defaultValue={financingSnapshot.settings.manualRatePercent ?? ''}
                className="input !pr-10"
                placeholder="Vacio = usar IPC"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-gray-400">
                %
              </span>
            </div>
          </div>

          <div>
            <label className="label">Cuotas por defecto</label>
            <input
              type="number"
              name="defaultInstallments"
              min="1"
              max="36"
              step="1"
              defaultValue={financingSnapshot.settings.defaultInstallments}
              className="input"
            />
          </div>

          <div>
            <label className="label">Frecuencia por defecto</label>
            <select
              name="defaultPaymentFrequency"
              defaultValue={financingSnapshot.settings.defaultPaymentFrequency}
              className="input"
            >
              <option value="DAILY">Diario</option>
              <option value="WEEKLY">Semanal</option>
              <option value="MONTHLY">Mensual</option>
            </select>
          </div>

          <div>
            <label className="label">Cuotas con tarjeta</label>
            <input
              type="number"
              name="cardInstallments"
              min="1"
              max="6"
              step="1"
              defaultValue={financingSnapshot.settings.cardInstallments}
              className="input"
            />
          </div>

          <div>
            <label className="label">Recargo por mora sobre tasa</label>
            <div className="relative">
              <input
                type="number"
                name="delinquentRatePenaltyPercent"
                min="0"
                step="0.01"
                defaultValue={financingSnapshot.settings.delinquentRatePenaltyPercent}
                className="input !pr-10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-gray-400">
                %
              </span>
            </div>
          </div>

          <div>
            <label className="label">Recargo por mora sobre anticipo</label>
            <div className="relative">
              <input
                type="number"
                name="delinquentDownPaymentPenaltyPercent"
                min="0"
                max="20"
                step="1"
                defaultValue={financingSnapshot.settings.delinquentDownPaymentPenaltyPercent}
                className="input !pr-10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-gray-400">
                pts
              </span>
            </div>
          </div>

          <div className="md:col-span-2 xl:col-span-4 flex items-end">
            <button type="submit" className="btn-primary justify-center !py-3">
              Guardar configuracion
            </button>
          </div>
        </form>
      </div>

      {orderContext && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-orange-700">
                Calculadora vinculada a la orden #{orderContext.orderCode}
              </p>
              <p className="mt-1 text-sm text-orange-900">
                Usa esta vista para cerrar la propuesta y guardarla en la orden sin salir del flujo
                administrativo.
              </p>
            </div>
            <Link href={`/admin/ordenes/${orderContext.orderId}`} className="btn-secondary">
              Ver detalle
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}

      <FinancingCalculator
        effectiveRatePercent={financingSnapshot.effectiveRatePercent}
        defaultInstallments={financingSnapshot.settings.defaultInstallments}
        defaultPaymentFrequency={financingSnapshot.settings.defaultPaymentFrequency}
        orderContext={orderContext}
      />
    </div>
  )
}
