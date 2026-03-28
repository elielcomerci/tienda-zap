import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  Receipt,
  ShieldAlert,
  Wallet,
} from 'lucide-react'
import { approveCreditSubmission, rejectCreditSubmission } from '@/lib/actions/credits'
import {
  getCreditPlanStatusLabel,
  getCreditPlanStatusTheme,
  getInstallmentDisplayStatus,
  summarizeCreditPlan,
} from '@/lib/credit-status'
import { getAdminCreditPlan } from '@/lib/credits'
import { getOrderDisplayCode } from '@/lib/orders-workflow'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Detalle de credito | ZAP Admin',
}

export default async function AdminCreditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const plan = await getAdminCreditPlan(id)
  if (!plan) notFound()

  const summary = summarizeCreditPlan(plan)
  const orderCode = getOrderDisplayCode(plan.order.id)
  const customerLabel =
    plan.order.user?.name ||
    plan.order.guestName ||
    plan.order.user?.email ||
    plan.order.guestEmail ||
    'Cliente sin nombre'

  return (
    <div className="space-y-6">
      <Link href="/admin/creditos" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Volver a creditos
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
            <Wallet size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Credito #{orderCode}</h1>
            <p className="text-sm text-gray-500">{customerLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${getCreditPlanStatusTheme(plan.status)}`}>
            {getCreditPlanStatusLabel(plan.status)}
          </span>
          <Link href={`/admin/ordenes/${plan.order.id}`} className="btn-secondary !py-2 !text-sm">
            Ver orden
          </Link>
        </div>
      </div>

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
          <p className="text-sm font-medium text-gray-500">Pendientes de revisión</p>
          <p className="mt-2 text-2xl font-black text-gray-900">{summary.submittedCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Alertas por duplicado</p>
          <p className="mt-2 text-2xl font-black text-gray-900">{summary.flaggedSubmissions}</p>
        </div>
      </div>

      {(summary.overdueCount > 0 || summary.flaggedSubmissions > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-700" />
            <div className="space-y-1">
              {summary.overdueCount > 0 && (
                <p>
                  Hay <strong>{summary.overdueCount}</strong> cuota/s vencida/s.
                </p>
              )}
              {summary.flaggedSubmissions > 0 && (
                <p>
                  Encontramos <strong>{summary.flaggedSubmissions}</strong> comprobante/s marcados
                  como posible duplicado.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {plan.scheduleItems.map((installment) => {
          const displayStatus = getInstallmentDisplayStatus(installment, plan.status)

          return (
            <div key={installment.id} className="card overflow-hidden">
              <div className="border-b border-gray-100 px-6 py-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="font-bold text-gray-900">
                      Cuota #{installment.sequence} · ${installment.amount.toLocaleString('es-AR')}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Vence el {installment.dueDate.toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${displayStatus.theme}`}>
                    {displayStatus.label}
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-4">
                {installment.submissions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                    Aun no hay comprobantes cargados para esta cuota.
                  </div>
                ) : (
                  installment.submissions.map((submission) => (
                    <div key={submission.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                              {submission.status}
                            </span>
                            <span className="text-xs text-gray-400">
                              {submission.createdAt.toLocaleString('es-AR')}
                            </span>
                            {submission.duplicateOfSubmissionId && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                                <AlertTriangle size={12} /> Posible duplicado
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">
                            Medio informado: <strong>{submission.paymentMethod}</strong>
                          </p>
                          <p className="text-sm text-gray-700">
                            Monto declarado: <strong>${submission.amount.toLocaleString('es-AR')}</strong>
                          </p>
                          {submission.notes && (
                            <p className="text-sm text-gray-600">{submission.notes}</p>
                          )}
                          {submission.reviewNotes && (
                            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                              <strong className="block text-xs uppercase tracking-wide text-gray-400">
                                Revision
                              </strong>
                              {submission.reviewNotes}
                            </div>
                          )}
                        </div>

                        <div className="w-full max-w-sm space-y-3">
                          <a
                            href={submission.proofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary w-full justify-center !py-2 !text-xs"
                          >
                            <Download size={14} />
                            Ver comprobante
                          </a>

                          {submission.status === 'SUBMITTED' && (
                            <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                              <p className="text-sm font-semibold text-blue-900">
                                Revision administrativa
                              </p>

                              <form
                                action={async (formData) => {
                                  'use server'
                                  await approveCreditSubmission({
                                    submissionId: submission.id,
                                    reviewNotes: String(formData.get('reviewNotes') || ''),
                                  })
                                }}
                                className="space-y-3"
                              >
                                <textarea
                                  name="reviewNotes"
                                  rows={2}
                                  className="input resize-none"
                                  placeholder="Notas internas sobre la validacion."
                                />
                                <button type="submit" className="btn-primary w-full justify-center !py-2 !text-xs !bg-emerald-600 hover:!bg-emerald-700">
                                  <Receipt size={14} />
                                  Aprobar pago
                                </button>
                              </form>

                              <form
                                action={async (formData) => {
                                  'use server'
                                  await rejectCreditSubmission({
                                    submissionId: submission.id,
                                    reviewNotes: String(formData.get('reviewNotes') || ''),
                                  })
                                }}
                                className="space-y-3"
                              >
                                <textarea
                                  name="reviewNotes"
                                  rows={2}
                                  className="input resize-none"
                                  placeholder="Motivo del rechazo o pedido de nueva evidencia."
                                />
                                <button type="submit" className="btn-secondary w-full justify-center !py-2 !text-xs !border-red-200 !text-red-700 hover:!bg-red-50">
                                  Rechazar comprobante
                                </button>
                              </form>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
