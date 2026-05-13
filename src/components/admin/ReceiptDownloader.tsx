'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  Ban,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Edit3,
  FileText,
  ListChecks,
  Loader2,
  Plus,
  X,
} from 'lucide-react'

// ─── Types ───

type Installment = {
  id: string
  sequence: number
  dueDate: string
  amount: number
  status: string
}

type ReceiptSummary = {
  id: string
  receiptCode: string
  amount: number
  concept: string | null
  pdfUrl: string
  status: 'ACTIVE' | 'VOIDED'
  voidedReason: string | null
  replacedByReceiptId: string | null
  createdAt: string
}

type ReceiptDownloaderProps = {
  orderId: string
  orderTotal: number
  installments?: Installment[]
  existingReceipts?: ReceiptSummary[]
}

type PartialMode = 'installment' | 'manual'

// ─── Helpers ───

function fmtShortDate(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function fmtCurrency(value: number) {
  return `$${value.toLocaleString('es-AR')}`
}

function installmentStatusLabel(status: string) {
  switch (status) {
    case 'PENDING': return 'Pendiente'
    case 'SUBMITTED': return 'En revisión'
    case 'REJECTED': return 'Rechazada'
    default: return status
  }
}

function installmentStatusTheme(status: string) {
  switch (status) {
    case 'PENDING': return 'bg-amber-100 text-amber-800'
    case 'SUBMITTED': return 'bg-blue-100 text-blue-800'
    case 'REJECTED': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-700'
  }
}

// ─── Component ───

export default function ReceiptDownloader({
  orderId,
  orderTotal,
  installments = [],
  existingReceipts = [],
}: ReceiptDownloaderProps) {
  const router = useRouter()

  // Creation state
  const [showCreate, setShowCreate] = useState(false)
  const [partialMode, setPartialMode] = useState<PartialMode>(
    installments.length > 0 ? 'installment' : 'manual'
  )
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [creating, setCreating] = useState(false)

  // Void state
  const [voidingId, setVoidingId] = useState<string | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [voidLoading, setVoidLoading] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editConcept, setEditConcept] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  // General
  const [error, setError] = useState('')

  const actionableInstallments = installments.filter(
    (i) => i.status === 'PENDING' || i.status === 'SUBMITTED' || i.status === 'REJECTED'
  )

  const selectedInstallment = actionableInstallments.find(
    (i) => i.id === selectedInstallmentId
  )

  const activeReceipts = existingReceipts.filter((r) => r.status === 'ACTIVE')
  const voidedReceipts = existingReceipts.filter((r) => r.status === 'VOIDED')

  // ─── Handlers ───

  const handleCreate = async (fullOrder: boolean) => {
    setCreating(true)
    setError('')
    try {
      const body: Record<string, unknown> = {}

      if (!fullOrder) {
        if (partialMode === 'installment' && selectedInstallment) {
          body.amount = selectedInstallment.amount
          body.concept = `Cuota ${selectedInstallment.sequence}`
          body.installmentId = selectedInstallment.id
        } else {
          body.amount = Number(paymentAmount)
          if (paymentNote.trim()) body.concept = paymentNote.trim()
        }
      }

      const res = await fetch(`/api/admin/orders/${orderId}/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Error desconocido' }))
        setError(data.error || 'Error al generar el recibo.')
        return
      }

      const data = await res.json()

      // Download the PDF
      const a = document.createElement('a')
      a.href = data.pdfUrl
      a.download = `${data.receiptCode}.pdf`
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      a.remove()

      // Reset form and refresh
      setPaymentAmount('')
      setPaymentNote('')
      setSelectedInstallmentId(null)
      setShowCreate(false)
      router.refresh()
    } catch {
      setError('Error de conexión al generar el recibo.')
    } finally {
      setCreating(false)
    }
  }

  const handleVoid = async () => {
    if (!voidingId) return
    setVoidLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/receipt`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptId: voidingId, reason: voidReason }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Error desconocido' }))
        setError(data.error || 'Error al anular el recibo.')
        return
      }
      setVoidingId(null)
      setVoidReason('')
      router.refresh()
    } catch {
      setError('Error de conexión.')
    } finally {
      setVoidLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!editingId) return
    setEditLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/receipt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptId: editingId,
          amount: Number(editAmount),
          concept: editConcept.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Error desconocido' }))
        setError(data.error || 'Error al editar el recibo.')
        return
      }
      setEditingId(null)
      setEditAmount('')
      setEditConcept('')
      router.refresh()
    } catch {
      setError('Error de conexión.')
    } finally {
      setEditLoading(false)
    }
  }

  const canCreatePartial =
    partialMode === 'installment'
      ? !!selectedInstallment
      : !!paymentAmount && Number(paymentAmount) > 0 && Number(paymentAmount) <= orderTotal

  // ─── Render ───

  return (
    <div className="card p-5">
      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
        <FileText size={18} className="text-orange-500" />
        Recibos
      </h3>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 flex items-start gap-2 mb-3">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
          {error}
          <button type="button" onClick={() => setError('')} className="ml-auto shrink-0 text-red-400 hover:text-red-600">
            <X size={12} />
          </button>
        </div>
      )}

      {/* ─── Existing receipts ─── */}
      {existingReceipts.length > 0 ? (
        <div className="space-y-2 mb-4">
          {activeReceipts.map((receipt) => (
            <div key={receipt.id}>
              {/* Normal view */}
              {voidingId !== receipt.id && editingId !== receipt.id && (
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{receipt.receiptCode}</span>
                      <span className="text-xs text-gray-400">{fmtShortDate(receipt.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {fmtCurrency(receipt.amount)}
                      {receipt.concept && ` · ${receipt.concept}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={receipt.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      title="Descargar PDF"
                    >
                      <Download size={14} />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(receipt.id)
                        setEditAmount(String(receipt.amount))
                        setEditConcept(receipt.concept || '')
                      }}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                      title="Editar recibo"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoidingId(receipt.id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Anular recibo"
                    >
                      <Ban size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Void inline form */}
              {voidingId === receipt.id && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-red-900">
                    Anular {receipt.receiptCode}
                  </p>
                  <input
                    type="text"
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="Motivo de anulación"
                    className="input !text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleVoid}
                      disabled={voidLoading || !voidReason.trim()}
                      className="btn-primary !py-1.5 !px-3 !text-xs !bg-red-600 hover:!bg-red-700"
                    >
                      {voidLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setVoidingId(null); setVoidReason('') }}
                      className="btn-secondary !py-1.5 !px-3 !text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Edit inline form */}
              {editingId === receipt.id && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-900">
                    Editar {receipt.receiptCode}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label !text-[10px]">Monto</label>
                      <input
                        type="number"
                        min="0"
                        max={orderTotal}
                        step="0.01"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="input !text-xs"
                      />
                    </div>
                    <div>
                      <label className="label !text-[10px]">Concepto</label>
                      <input
                        type="text"
                        value={editConcept}
                        onChange={(e) => setEditConcept(e.target.value)}
                        placeholder="Opcional"
                        className="input !text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-amber-700">
                    Se anulará el recibo original y se creará uno nuevo con los datos corregidos.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleEdit}
                      disabled={editLoading || !editAmount || Number(editAmount) <= 0 || Number(editAmount) > orderTotal}
                      className="btn-primary !py-1.5 !px-3 !text-xs !bg-amber-600 hover:!bg-amber-700"
                    >
                      {editLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingId(null); setEditAmount(''); setEditConcept('') }}
                      className="btn-secondary !py-1.5 !px-3 !text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Voided receipts */}
          {voidedReceipts.length > 0 && (
            <details className="rounded-lg border border-gray-100 bg-gray-50">
              <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold text-gray-400 marker:hidden">
                {voidedReceipts.length} recibo{voidedReceipts.length > 1 ? 's' : ''} anulado{voidedReceipts.length > 1 ? 's' : ''}
              </summary>
              <div className="border-t border-gray-100 px-3 py-2 space-y-1.5">
                {voidedReceipts.map((receipt) => (
                  <div key={receipt.id} className="flex items-center gap-2 opacity-50">
                    <span className="text-xs text-gray-500 line-through">{receipt.receiptCode}</span>
                    <span className="text-xs text-gray-400">{fmtCurrency(receipt.amount)}</span>
                    {receipt.voidedReason && (
                      <span className="text-[10px] text-red-400 truncate">— {receipt.voidedReason}</span>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 mb-4">Sin recibos emitidos para esta orden.</p>
      )}

      {/* ─── Create new receipt ─── */}
      <div className="space-y-3">
        {/* Quick full-order receipt */}
        <button
          type="button"
          onClick={() => handleCreate(true)}
          disabled={creating}
          className="btn-primary w-full justify-center !text-xs !py-2.5"
        >
          {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {creating ? 'Generando...' : 'Nuevo recibo completo'}
        </button>

        {/* Partial receipt toggle */}
        <button
          type="button"
          onClick={() => setShowCreate((prev) => !prev)}
          className="btn-secondary w-full justify-center !text-xs !py-2"
        >
          {showCreate ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Recibo de pago parcial
        </button>

        {showCreate && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
            {/* Mode selector */}
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

            {/* Installment selection */}
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
                          {isSelected && <div className="h-2 w-2 rounded-full bg-orange-500" />}
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
                          {fmtCurrency(inst.amount)}
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
                      El monto supera el total de la orden ({fmtCurrency(orderTotal)})
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
              </div>
            )}

            <button
              type="button"
              onClick={() => handleCreate(false)}
              disabled={creating || !canCreatePartial}
              className="btn-primary w-full justify-center !text-xs !py-2.5 !bg-gray-900 hover:!bg-gray-800"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {creating
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
