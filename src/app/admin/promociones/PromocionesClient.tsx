'use client'

import { useMemo, useState } from 'react'
import {
  BadgePercent,
  Check,
  Copy,
  PauseCircle,
  Pencil,
  Plus,
  Ticket,
  Trash2,
  X,
} from 'lucide-react'
import {
  createPromotion,
  deletePromotion,
  generatePromotionCoupons,
  togglePromotionStatus,
  updatePromotion,
} from './actions'

type PromotionWithCounts = {
  id: string
  name: string
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED'
  priority: number
  discountKind: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  stackable: boolean
  activeFrom: Date | null
  activeTo: Date | null
  maxUses: number | null
  perUserLimit: number | null
  coupons: Array<{
    code: string
    status: 'AVAILABLE' | 'RESERVED' | 'USED' | 'EXPIRED'
    expiresAt: Date | null
    createdAt: Date
  }>
  _count: {
    coupons: number
    redemptions: number
  }
}

type PromotionFormState = {
  id?: string
  name: string
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED'
  priority: string
  discountKind: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: string
  stackable: boolean
  activeFrom: string
  activeTo: string
  maxUses: string
  perUserLimit: string
}

type GenerateFormState = {
  promotionId: string
  quantity: string
  prefix: string
  expiresAt: string
}

const DEFAULT_PROMOTION_FORM: PromotionFormState = {
  name: '',
  status: 'DRAFT',
  priority: '0',
  discountKind: 'PERCENTAGE',
  discountValue: '',
  stackable: false,
  activeFrom: '',
  activeTo: '',
  maxUses: '',
  perUserLimit: '',
}

const DEFAULT_GENERATE_FORM: GenerateFormState = {
  promotionId: '',
  quantity: '25',
  prefix: 'ZAP',
  expiresAt: '',
}

function formatDateInputValue(date: Date | null) {
  if (!date) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function mapPromotionToForm(promotion: PromotionWithCounts): PromotionFormState {
  return {
    id: promotion.id,
    name: promotion.name,
    status: promotion.status,
    priority: String(promotion.priority ?? 0),
    discountKind: promotion.discountKind,
    discountValue: String(promotion.discountValue),
    stackable: promotion.stackable,
    activeFrom: formatDateInputValue(promotion.activeFrom),
    activeTo: formatDateInputValue(promotion.activeTo),
    maxUses: promotion.maxUses != null ? String(promotion.maxUses) : '',
    perUserLimit: promotion.perUserLimit != null ? String(promotion.perUserLimit) : '',
  }
}

function statusTheme(status: PromotionWithCounts['status']) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-100 text-emerald-700'
    case 'PAUSED':
      return 'bg-amber-100 text-amber-700'
    case 'EXPIRED':
      return 'bg-gray-200 text-gray-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function couponStatusTheme(status: PromotionWithCounts['coupons'][number]['status']) {
  switch (status) {
    case 'AVAILABLE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'RESERVED':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'USED':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    default:
      return 'bg-rose-50 text-rose-700 border-rose-200'
  }
}

export default function PromocionesClient({
  initialPromotions,
}: {
  initialPromotions: PromotionWithCounts[]
}) {
  const [promotions, setPromotions] = useState(initialPromotions)
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false)
  const [promotionForm, setPromotionForm] = useState<PromotionFormState>(DEFAULT_PROMOTION_FORM)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [generateForm, setGenerateForm] = useState<GenerateFormState>(DEFAULT_GENERATE_FORM)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const activeCount = useMemo(
    () => promotions.filter((promotion) => promotion.status === 'ACTIVE').length,
    [promotions]
  )

  const handleOpenPromotionModal = (promotion?: PromotionWithCounts) => {
    setPromotionForm(promotion ? mapPromotionToForm(promotion) : DEFAULT_PROMOTION_FORM)
    setError('')
    setIsPromotionModalOpen(true)
  }

  const handleOpenGenerateModal = (promotion: PromotionWithCounts) => {
    setGenerateForm({
      ...DEFAULT_GENERATE_FORM,
      promotionId: promotion.id,
      prefix: promotion.name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6) || 'ZAP',
    })
    setError('')
    setIsGenerateModalOpen(true)
  }

  const refreshPage = () => window.location.reload()

  const handleSavePromotion = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')

    try {
      const payload = {
        name: promotionForm.name,
        status: promotionForm.status,
        priority: Number(promotionForm.priority || '0'),
        discountKind: promotionForm.discountKind,
        discountValue: Number(promotionForm.discountValue || '0'),
        stackable: promotionForm.stackable,
        activeFrom: promotionForm.activeFrom || null,
        activeTo: promotionForm.activeTo || null,
        maxUses: promotionForm.maxUses ? Number(promotionForm.maxUses) : null,
        perUserLimit: promotionForm.perUserLimit ? Number(promotionForm.perUserLimit) : null,
      }

      if (promotionForm.id) {
        await updatePromotion(promotionForm.id, payload)
      } else {
        await createPromotion(payload)
      }

      refreshPage()
    } catch (saveError: any) {
      setError(saveError.message || 'No pudimos guardar la promocion.')
      setIsSaving(false)
    }
  }

  const handleGenerateCoupons = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')

    try {
      await generatePromotionCoupons({
        promotionId: generateForm.promotionId,
        quantity: Number(generateForm.quantity || '0'),
        prefix: generateForm.prefix,
        expiresAt: generateForm.expiresAt || null,
      })

      refreshPage()
    } catch (generateError: any) {
      setError(generateError.message || 'No pudimos generar el lote de cupones.')
      setIsSaving(false)
    }
  }

  const handleDeletePromotion = async (id: string) => {
    if (!confirm('¿Eliminar esta promocion?')) return

    try {
      await deletePromotion(id)
      refreshPage()
    } catch (deleteError: any) {
      setError(deleteError.message || 'No pudimos borrar la promocion.')
    }
  }

  const handleCopyCoupon = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      setError('No pudimos copiar el codigo al portapapeles.')
    }
  }

  const handleQuickStatusChange = async (
    id: string,
    status: PromotionWithCounts['status']
  ) => {
    try {
      await togglePromotionStatus(id, status)
      refreshPage()
    } catch (statusError: any) {
      setError(statusError.message || 'No pudimos cambiar el estado.')
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Ticket className="text-orange-500" size={24} />
            Promociones y Cupones
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Crea promociones transaccionales y genera lotes de cupones listos para checkout.
          </p>
        </div>
        <button
          onClick={() => handleOpenPromotionModal()}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          <Plus size={18} />
          Nueva promocion
        </button>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Promociones cargadas</p>
          <p className="mt-2 text-3xl font-black text-gray-900">{promotions.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Promociones activas</p>
          <p className="mt-2 text-3xl font-black text-gray-900">{activeCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Cupones visibles</p>
          <p className="mt-2 text-3xl font-black text-gray-900">
            {promotions.reduce((sum, promotion) => sum + promotion._count.coupons, 0)}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {promotions.length === 0 ? (
          <div className="card col-span-full p-16 text-center">
            <Ticket size={40} className="mx-auto mb-4 text-gray-300" />
            <h2 className="text-lg font-bold text-gray-900">Todavia no hay promociones</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              Crea la primera promocion para empezar a validar cupones reales desde checkout.
            </p>
          </div>
        ) : (
          promotions.map((promotion) => (
            <div key={promotion.id} className="card overflow-hidden border-2 border-transparent">
              <div className="border-b border-gray-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${statusTheme(
                          promotion.status
                        )}`}
                      >
                        {promotion.status}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                        Prioridad {promotion.priority}
                      </span>
                      <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                        {promotion.discountKind === 'PERCENTAGE'
                          ? `${promotion.discountValue}% OFF`
                          : `$${promotion.discountValue.toLocaleString('es-AR')} OFF`}
                      </span>
                    </div>
                    <h2 className="mt-3 text-xl font-black text-gray-900">{promotion.name}</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {promotion.stackable ? 'Apilable' : 'No apilable'} · max usos:{' '}
                      {promotion.maxUses ?? 'sin tope'} · limite por usuario:{' '}
                      {promotion.perUserLimit ?? 'sin limite'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleQuickStatusChange(
                          promotion.id,
                          promotion.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
                        )
                      }
                      className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                      title={promotion.status === 'ACTIVE' ? 'Pausar promocion' : 'Activar promocion'}
                    >
                      {promotion.status === 'ACTIVE' ? (
                        <PauseCircle size={18} />
                      ) : (
                        <Check size={18} />
                      )}
                    </button>
                    <button
                      onClick={() => handleOpenPromotionModal(promotion)}
                      className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                      title="Editar promocion"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDeletePromotion(promotion.id)}
                      className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Eliminar promocion"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-3">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Cupones
                  </p>
                  <p className="mt-2 text-2xl font-black text-gray-900">
                    {promotion._count.coupons}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Redenciones
                  </p>
                  <p className="mt-2 text-2xl font-black text-gray-900">
                    {promotion._count.redemptions}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Ventana
                  </p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    {promotion.activeFrom
                      ? promotion.activeFrom.toLocaleDateString('es-AR')
                      : 'sin inicio'}{' '}
                    →{' '}
                    {promotion.activeTo
                      ? promotion.activeTo.toLocaleDateString('es-AR')
                      : 'sin fin'}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-100 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                      Ultimos cupones
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Puedes generar lotes nuevos sin tocar el checkout existente.
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenGenerateModal(promotion)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-300 hover:text-orange-700"
                  >
                    <BadgePercent size={16} />
                    Generar lote
                  </button>
                </div>

                {promotion.coupons.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
                    Esta promocion todavia no tiene cupones generados.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {promotion.coupons.map((coupon) => (
                      <div
                        key={coupon.code}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm font-bold text-gray-900">
                            {coupon.code}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {coupon.expiresAt
                              ? `vence ${coupon.expiresAt.toLocaleDateString('es-AR')}`
                              : 'sin vencimiento'}{' '}
                            · creado {coupon.createdAt.toLocaleDateString('es-AR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${couponStatusTheme(
                              coupon.status
                            )}`}
                          >
                            {coupon.status}
                          </span>
                          <button
                            onClick={() => handleCopyCoupon(coupon.code)}
                            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                            title="Copiar codigo"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {isPromotionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/90 px-6 py-5 backdrop-blur-md">
              <h2 className="text-xl font-bold text-gray-900">
                {promotionForm.id ? 'Editar promocion' : 'Nueva promocion'}
              </h2>
              <button
                onClick={() => setIsPromotionModalOpen(false)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePromotion} className="space-y-6 p-6">
              <div>
                <label className="label">Nombre</label>
                <input
                  value={promotionForm.name}
                  onChange={(event) =>
                    setPromotionForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="input"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Estado</label>
                  <select
                    value={promotionForm.status}
                    onChange={(event) =>
                      setPromotionForm((current) => ({
                        ...current,
                        status: event.target.value as PromotionFormState['status'],
                      }))
                    }
                    className="input"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PAUSED">Paused</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                </div>
                <div>
                  <label className="label">Prioridad</label>
                  <input
                    type="number"
                    value={promotionForm.priority}
                    onChange={(event) =>
                      setPromotionForm((current) => ({ ...current, priority: event.target.value }))
                    }
                    className="input"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Tipo de descuento</label>
                  <select
                    value={promotionForm.discountKind}
                    onChange={(event) =>
                      setPromotionForm((current) => ({
                        ...current,
                        discountKind: event.target.value as PromotionFormState['discountKind'],
                      }))
                    }
                    className="input"
                  >
                    <option value="PERCENTAGE">Porcentaje</option>
                    <option value="FIXED_AMOUNT">Monto fijo</option>
                  </select>
                </div>
                <div>
                  <label className="label">
                    {promotionForm.discountKind === 'PERCENTAGE'
                      ? 'Valor (%)'
                      : 'Valor fijo ($)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={promotionForm.discountValue}
                    onChange={(event) =>
                      setPromotionForm((current) => ({
                        ...current,
                        discountValue: event.target.value,
                      }))
                    }
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Activa desde</label>
                  <input
                    type="datetime-local"
                    value={promotionForm.activeFrom}
                    onChange={(event) =>
                      setPromotionForm((current) => ({ ...current, activeFrom: event.target.value }))
                    }
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Activa hasta</label>
                  <input
                    type="datetime-local"
                    value={promotionForm.activeTo}
                    onChange={(event) =>
                      setPromotionForm((current) => ({ ...current, activeTo: event.target.value }))
                    }
                    className="input"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Maximo de usos</label>
                  <input
                    type="number"
                    min="1"
                    value={promotionForm.maxUses}
                    onChange={(event) =>
                      setPromotionForm((current) => ({ ...current, maxUses: event.target.value }))
                    }
                    className="input"
                    placeholder="Sin tope"
                  />
                </div>
                <div>
                  <label className="label">Limite por usuario</label>
                  <input
                    type="number"
                    min="1"
                    value={promotionForm.perUserLimit}
                    onChange={(event) =>
                      setPromotionForm((current) => ({
                        ...current,
                        perUserLimit: event.target.value,
                      }))
                    }
                    className="input"
                    placeholder="Sin limite"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={promotionForm.stackable}
                  onChange={(event) =>
                    setPromotionForm((current) => ({
                      ...current,
                      stackable: event.target.checked,
                    }))
                  }
                />
                Permitir stacking futuro
              </label>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPromotionModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-wait disabled:bg-orange-300"
                >
                  {isSaving ? 'Guardando...' : 'Guardar promocion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <h2 className="text-xl font-bold text-gray-900">Generar lote de cupones</h2>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGenerateCoupons} className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={generateForm.quantity}
                    onChange={(event) =>
                      setGenerateForm((current) => ({ ...current, quantity: event.target.value }))
                    }
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Prefijo</label>
                  <input
                    value={generateForm.prefix}
                    onChange={(event) =>
                      setGenerateForm((current) => ({ ...current, prefix: event.target.value }))
                    }
                    className="input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Vencimiento del lote (opcional)</label>
                <input
                  type="datetime-local"
                  value={generateForm.expiresAt}
                  onChange={(event) =>
                    setGenerateForm((current) => ({ ...current, expiresAt: event.target.value }))
                  }
                  className="input"
                />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                Generamos codigos no secuenciales del estilo <strong>ZAP-7F3K9Q2A-X</strong> con
                checksum para que luego puedan escanearse o copiarse en checkout.
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-wait disabled:bg-orange-300"
                >
                  {isSaving ? 'Generando...' : 'Generar cupones'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
