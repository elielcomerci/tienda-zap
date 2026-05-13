'use client'

import { useState } from 'react'
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  ListChecks,
} from 'lucide-react'

type Installment = {
  id: string
  sequence: number
  dueDate: string
  amount: number
  status: string
}

type ReceiptDownloaderProps = {
  orderId: string
  orderTotal: number
  installments?: Installment[]
}

type PartialMode = 'installment' | 'manual'

export default function ReceiptDownloader({
  orderId,
  orderTotal,
  installments = [],
}: ReceiptDownloaderProps) {
  const [showPartial, setShowPartial] = useState(false)
  const [partialMode, setPartialMode] = useState<PartialMode>(
    installments.length > 0 ? 'installment' : 'manual'
  )
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [installmentSeq, setInstallmentSeq] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  // Actionable installments: PENDING, SUBMITTED, or REJECTED (not APPROVED/CANCELLED)
  const actionableInstallments = installments.filter(
    (i) => i.status === 'PENDING' || i.status === 'SUBMITTED' || i.status === 'REJECTED'
  )

  const selectedInstallment = actionableInstallments.find(
    (i) => i.id === selectedInstallmentId
  )

  const buildUrl = (partial: boolean) => {
    const base = `/api/admin/orders/${orderId}/receipt`
    if (!partial) return base

    const params = new URLSearchParams()

    if (partialMode === 'installment' && selectedInstallment) {
      params.set('paymentAmount', String(selectedInstallment.amount))
      params.set('paymentNote', `Cuota ${selectedInstallment.sequence}`)
      params.set('installmentSeq', String(selectedInstallment.sequence))
    } else {
      if (paymentAmount) params.set('paymentAmount', paymentAmount)
      if (paymentNote.trim()) params.set('paymentNote', paymentNote.trim())
      if (installmentSeq) params.set('installmentSeq', installmentSeq)
    }

    const qs = params.toString()
    return qs ? `${base}?${qs}` : base
  }

  const handleDownload = async (partial: boolean) => {
    setDownloading(true)
    setError('')
    try {
      const res = await fetch(buildUrl(partial))
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Error desconocido' }))
        setError(body.error || 'Error al generar el recibo.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recibo-${orderId.slice(-8)}-${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('Error de conexión al generar el recibo.')
    } finally {
      setDownloading(false)
    }
  }

  const canGeneratePartial =
    partialMode === 'installment'
      ? !!selectedInstallment
      : !!paymentAmount && Number(paymentAmount) <= orderTotal

  const fmtShortDate = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }

  const installmentStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pendiente'
      case 'SUBMITTED': return 'En revisión'
      case 'REJECTED': return 'Rechazada'
      default: return status
    }
  }

  const installmentStatusTheme = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-800'
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="card p-5">
      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
        <FileText size={18} className="text-orange-500" />
        Recibos
      </h3>

      <div className="space-y-3">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
            {error}
          </div>
        )}

        {/* Full receipt */}
        <button
          type="button"
          onClick={() => handleDownload(false)}
          disabled={downloading}
          className="btn-primary w-full justify-center !text-xs !py-2.5"
        >
          <Download size={14} />
          {downloading ? 'Generando...' : 'Descargar recibo completo'}
        </button>

        {/* Partial payment toggle */}
        <button
          type="button"
          onClick={() => setShowPartial((prev) => !prev)}
          className="btn-secondary w-full justify-center !text-xs !py-2"
        >
          {showPartial ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Recibo de pago parcial
        </button>

        {showPartial && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
            {/* Mode selector (only if there are actionable installments) */}
            {actionableInstallments.length > 0 && (
              <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPartialMode('installment')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
                    partialMode === 'installment'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ListChecks size={13} />
                  Seleccionar cuota
                </button>
                <button
                  type="button"
                  onClick={() => setPartialMode('manual')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
                    partialMode === 'manual'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <FileText size={13} />
                  Monto manual
                </button>
              </div>
            )}

            {/* Installment selection mode */}
            {partialMode === 'installment' && actionableInstallments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  Seleccioná una cuota para generar el recibo con sus datos.
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {actionableInstallments.map((inst) => {
                    const isSelected = selectedInstallmentId === inst.id
                    const isOverdue =
                      inst.status === 'PENDING' && new Date(inst.dueDate).getTime() < Date.now()

                    return (
                      <label
                        key={inst.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-orange-400 bg-orange-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="installment-select"
                          value={inst.id}
                          checked={isSelected}
                          onChange={() => setSelectedInstallmentId(inst.id)}
                          className="sr-only"
                        />
                        <div
                          className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-orange-500' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && (
                            <div className="h-2 w-2 rounded-full bg-orange-500" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              Cuota {inst.sequence}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                isOverdue
                                  ? 'bg-rose-100 text-rose-800'
                                  : installmentStatusTheme(inst.status)
                              }`}
                            >
                              {isOverdue ? 'Vencida' : installmentStatusLabel(inst.status)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                            <Calendar size={11} />
                            <span>Vence {fmtShortDate(inst.dueDate)}</span>
                          </div>
                        </div>

                        <span className="text-sm font-bold text-gray-900 shrink-0">
                          ${inst.amount.toLocaleString('es-AR')}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Manual mode */}
            {(partialMode === 'manual' || actionableInstallments.length === 0) && (
              <div className="space-y-3">
                <div>
                  <label className="label">Monto del pago</label>
                  <input
                    type="number"
                    min="0"
                    max={orderTotal}
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Ej: 5000"
                    className="input"
                  />
                  {Number(paymentAmount) > orderTotal && (
                    <p className="mt-1 text-xs text-amber-600">
                      El monto supera el total de la orden ($
                      {orderTotal.toLocaleString('es-AR')})
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Concepto (opcional)</label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="Ej: Anticipo inicial"
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Nro de cuota (opcional)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={installmentSeq}
                    onChange={(e) => setInstallmentSeq(e.target.value)}
                    placeholder="Ej: 3"
                    className="input"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleDownload(true)}
              disabled={downloading || !canGeneratePartial}
              className="btn-primary w-full justify-center !text-xs !py-2.5 !bg-gray-900 hover:!bg-gray-800"
            >
              <Download size={14} />
              {downloading
                ? 'Generando...'
                : partialMode === 'installment' && selectedInstallment
                  ? `Generar recibo cuota ${selectedInstallment.sequence}`
                  : 'Generar recibo parcial'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
