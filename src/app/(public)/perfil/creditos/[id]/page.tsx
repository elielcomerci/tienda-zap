import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Receipt, Wallet } from 'lucide-react'
import { auth } from '@/auth'
import CreditPaymentUploader from '@/components/public/CreditPaymentUploader'
import {
  getCreditPlanStatusLabel,
  getCreditPlanStatusTheme,
  getInstallmentDisplayStatus,
  summarizeCreditPlan,
} from '@/lib/credit-status'
import {
  getEffectiveAnnualRatePercent,
  getNominalAnnualRatePercent,
} from '@/lib/financing-calculator'
import { getCustomerCreditPlan } from '@/lib/credits'
import { getOrderDisplayCode } from '@/lib/orders-workflow'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Detalle de credito | ZAP Tienda',
}

function getPaymentPlanLabel(paymentFrequency: string) {
  if (paymentFrequency === 'MONTHLY') return 'mensuales'
  if (paymentFrequency === 'WEEKLY') return 'semanales'
  return 'diarios'
}

export default async function CustomerCreditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params
  const plan = await getCustomerCreditPlan(id)
  if (!plan) notFound()

  const summary = summarizeCreditPlan(plan)
  const orderCode = getOrderDisplayCode(plan.order.id)
  const nominalAnnualRatePercent = getNominalAnnualRatePercent(plan.ratePercent)
  const effectiveAnnualRatePercent = getEffectiveAnnualRatePercent(plan.ratePercent)

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <Link
        href="/perfil/creditos"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} /> Volver a mis creditos
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
            <Wallet size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Credito #{orderCode}</h1>
            <p className="text-sm text-gray-500">Pedido asociado #{orderCode}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${getCreditPlanStatusTheme(plan.status)}`}
          >
            {getCreditPlanStatusLabel(plan.status)}
          </span>
          <Link href={`/perfil/ordenes/${plan.order.id}`} className="btn-secondary !py-2 !text-sm">
            Ver pedido
          </Link>
        </div>
      </div>

      {summary.overdueCount > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">Tenes cuotas vencidas en este credito</p>
              <p className="mt-1 text-rose-800">
                Subi el comprobante correspondiente para que podamos revisarlo y normalizar el
                estado de tu cuenta.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Anticipo</p>
          <p className="mt-2 text-2xl font-black text-gray-900">
            ${plan.downPaymentAmount.toLocaleString('es-AR')}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Capital financiado</p>
          <p className="mt-2 text-2xl font-black text-gray-900">
            ${plan.financedAmount.toLocaleString('es-AR')}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Cuotas aprobadas</p>
          <p className="mt-2 text-2xl font-black text-gray-900">{summary.approvedCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Saldo pendiente</p>
          <p className="mt-2 text-2xl font-black text-gray-900">
            ${summary.remainingAmount.toLocaleString('es-AR')}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Avance del credito</h2>
              <p className="mt-1 text-sm text-gray-500">
                Seguimiento de dinero cobrado y cuotas aprobadas.
              </p>
            </div>
            <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
              {summary.paymentProgressPercent}% cobrado
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm text-gray-600">
                <span>Capital recuperado</span>
                <span>
                  ${summary.paidAmount.toLocaleString('es-AR')} de $
                  {summary.totalScheduledAmount.toLocaleString('es-AR')}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500"
                  style={{ width: `${summary.paymentProgressPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-sm text-gray-600">
                <span>Cuotas aprobadas</span>
                <span>
                  {summary.approvedCount} de {plan.scheduleItems.length}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500"
                  style={{ width: `${summary.installmentProgressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-bold text-gray-900">Condiciones pactadas</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-between gap-4">
              <span>Tasa mensual fija</span>
              <strong className="text-gray-900">{plan.ratePercent.toLocaleString('es-AR')}%</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>TNA estimada</span>
              <strong className="text-gray-900">
                {nominalAnnualRatePercent.toLocaleString('es-AR')}%
              </strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>TEA estimada</span>
              <strong className="text-gray-900">
                {effectiveAnnualRatePercent.toLocaleString('es-AR')}%
              </strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Plan</span>
              <strong className="text-gray-900">
                {plan.installments} pagos {getPaymentPlanLabel(plan.paymentFrequency)}
              </strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Total proyectado</span>
              <strong className="text-gray-900">
                ${plan.totalRepayable.toLocaleString('es-AR')}
              </strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Interes total</span>
              <strong className="text-gray-900">
                ${plan.totalInterest.toLocaleString('es-AR')}
              </strong>
            </div>
          </div>

          <p className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-xs text-orange-900">
            La tasa quedo congelada cuando se genero este credito. Aunque cambie el IPC despues,
            este plan conserva las condiciones pactadas.
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="font-bold text-gray-900">Cronograma y pagos</h2>
        </div>

        <div className="space-y-4 p-4">
          {plan.scheduleItems.map((installment) => {
            const displayStatus = getInstallmentDisplayStatus(installment, plan.status)
            const latestSubmission = installment.submissions[0] || null
            const canUploadProof =
              ['ACTIVE', 'APPROVED'].includes(plan.status) &&
              (installment.status === 'PENDING' || installment.status === 'REJECTED')

            return (
              <div
                key={installment.id}
                className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">
                        Cuota #{installment.sequence}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${displayStatus.theme}`}
                      >
                        {displayStatus.label}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600">
                      Vence el {installment.dueDate.toLocaleDateString('es-AR')}
                    </p>

                    <p className="text-lg font-black text-gray-900">
                      ${installment.amount.toLocaleString('es-AR')}
                    </p>

                    <p className="text-xs text-gray-500">
                      Capital ${installment.principalAmount.toLocaleString('es-AR')} · Interes $
                      {installment.interestAmount.toLocaleString('es-AR')}
                    </p>

                    {installment.reviewNotes && (
                      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
                        <strong className="block text-xs uppercase tracking-wide text-gray-400">
                          Revision
                        </strong>
                        {installment.reviewNotes}
                      </div>
                    )}
                  </div>

                  <div className="w-full max-w-lg space-y-3">
                    {latestSubmission && (
                      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-gray-900">Ultimo comprobante enviado</p>
                          <span className="text-xs text-gray-400">
                            {latestSubmission.createdAt.toLocaleDateString('es-AR')}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Medio informado: {latestSubmission.paymentMethod}
                        </p>
                        {latestSubmission.notes && (
                          <p className="mt-2 text-sm text-gray-600">{latestSubmission.notes}</p>
                        )}
                        <a
                          href={latestSubmission.proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700"
                        >
                          <Receipt size={14} /> Ver comprobante
                        </a>
                      </div>
                    )}

                    {canUploadProof && <CreditPaymentUploader installmentId={installment.id} />}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
