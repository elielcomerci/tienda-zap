'use client'

import { useState, type FormEvent } from 'react'
import { CalendarClock, Tag, X } from 'lucide-react'
import { generatePromotionCoupons } from '@/app/admin/promociones/actions'

export type WelcomePromotionOption = {
  id: string
  name: string
  discountKind: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  activeFrom: string | null
  activeTo: string | null
  minOrderAmount: number | null
  firstOrderOnly: boolean
  perUserLimit: number | null
  maxUses: number | null
  allowedProductCount: number
  excludedProductCount: number
}

export default function WelcomeCouponModal({
  promotions,
  recipientEmail,
  recipientName,
  recipientBusiness,
  recipientPhone,
  proposalTitle,
  onClose,
  onCreated,
}: {
  promotions: WelcomePromotionOption[]
  recipientEmail: string
  recipientName: string
  recipientBusiness: string
  recipientPhone: string
  proposalTitle: string
  onClose: () => void
  onCreated: (code: string, promotionName: string) => void
}) {
  const [promotionId, setPromotionId] = useState(promotions[0]?.id ?? '')
  const [usesPerCoupon, setUsesPerCoupon] = useState('1')
  const [expiresAt, setExpiresAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const selectedPromotion = promotions.find((promotion) => promotion.id === promotionId)
  const emailIsValid = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(recipientEmail.trim())

  const formatMoney = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!selectedPromotion) return setError('Elegí una promoción activa.')
    if (!emailIsValid) return setError('Completá primero el email de acceso del cliente.')
    const uses = Number(usesPerCoupon)
    if (!Number.isInteger(uses) || uses < 1 || uses > 500) return setError('Los usos deben estar entre 1 y 500.')

    setBusy(true)
    try {
      const recipientRow = [
        recipientName.trim() || recipientBusiness.trim() || 'Cliente',
        recipientBusiness.trim(),
        recipientEmail.trim().toLowerCase(),
        recipientPhone.trim(),
      ].join('\\t')
      const result = await generatePromotionCoupons({
        promotionId: selectedPromotion.id,
        quantity: 1,
        prefix: 'ZAP',
        batchName: `Propuesta ZAP · ${proposalTitle.trim() || 'Nueva propuesta'}`,
        recipients: recipientRow,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        usesPerCoupon: uses,
      })
      const code = result.codes?.[0]
      if (!code) throw new Error('El cupón se generó, pero no pudimos recuperar su código.')
      onCreated(code, selectedPromotion.name)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos crear el cupón.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/50 p-3 backdrop-blur-sm sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="welcome-coupon-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-gray-500">Propuesta comercial</p>
            <h2 id="welcome-coupon-title" className="mt-1 text-xl font-semibold tracking-tight text-gray-950">Crear cupón de bienvenida</h2>
            <p className="mt-1 text-sm text-gray-500">Se genera un único código y queda preparado para este destinatario.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Cerrar" className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40"><X size={19}/></button>
        </header>

        {promotions.length === 0 ? (
          <div className="space-y-4 p-6">
            <p className="text-sm leading-6 text-gray-600">No hay promociones activas disponibles. Creá o activá una promoción para definir el descuento, la vigencia y los productos alcanzados.</p>
            <a href="/admin/promociones" target="_blank" rel="noreferrer" className="inline-flex rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50">Abrir promociones</a>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
            <div>
              <label htmlFor="welcome-promotion" className="label">Promoción</label>
              <select id="welcome-promotion" value={promotionId} onChange={(event) => setPromotionId(event.target.value)} className="input" required>
                {promotions.map((promotion) => (
                  <option key={promotion.id} value={promotion.id}>
                    {promotion.name} · {promotion.discountKind === 'PERCENTAGE' ? `${promotion.discountValue}% OFF` : `${formatMoney(promotion.discountValue)} OFF`}
                  </option>
                ))}
              </select>
            </div>

            {selectedPromotion && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Tag size={16}/> {selectedPromotion.name}</div>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
                  {selectedPromotion.discountKind === 'PERCENTAGE' ? `${selectedPromotion.discountValue}% OFF` : `${formatMoney(selectedPromotion.discountValue)} OFF`}
                </p>
                <div className="mt-2 space-y-1 text-xs leading-5 text-gray-600">
                  {selectedPromotion.activeFrom || selectedPromotion.activeTo ? <p>Vigencia: {selectedPromotion.activeFrom ? new Date(selectedPromotion.activeFrom).toLocaleDateString('es-AR') : 'Desde su activación'} – {selectedPromotion.activeTo ? new Date(selectedPromotion.activeTo).toLocaleDateString('es-AR') : 'Sin fecha final'}</p> : <p>Sin límite de fechas en la promoción.</p>}
                  {selectedPromotion.minOrderAmount != null && <p>Compra mínima: {formatMoney(selectedPromotion.minOrderAmount)}</p>}
                  {selectedPromotion.firstOrderOnly && <p>Válido para primera compra.</p>}
                  {selectedPromotion.perUserLimit != null && <p>Máximo {selectedPromotion.perUserLimit} usos por cliente.</p>}
                  {selectedPromotion.maxUses != null && <p>Límite global de {selectedPromotion.maxUses} usos confirmados.</p>}
                  {selectedPromotion.allowedProductCount > 0 && <p>Aplica a {selectedPromotion.allowedProductCount} productos seleccionados.</p>}
                  {selectedPromotion.excludedProductCount > 0 && <p>Excluye {selectedPromotion.excludedProductCount} productos.</p>}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">Usos disponibles para este código</span>
                <input type="number" min="1" max="500" step="1" required value={usesPerCoupon} onChange={(event) => setUsesPerCoupon(event.target.value)} className="input"/>
              </label>
              <label className="block">
                <span className="label">Vencimiento del código (opcional)</span>
                <span className="relative block">
                  <CalendarClock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="input pl-9"/>
                </span>
              </label>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Destinatario</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{recipientBusiness || recipientName || 'Cliente de la propuesta'}</p>
              <p className="text-sm text-gray-600">{recipientEmail || 'Completá el email en la propuesta'}</p>
              {!emailIsValid && <p className="mt-2 text-xs text-amber-700">Primero completá un email válido en los datos del cliente.</p>}
            </div>

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button type="button" onClick={onClose} disabled={busy} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={busy || !emailIsValid || !selectedPromotion} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Creando cupón…' : 'Crear cupón'}</button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
