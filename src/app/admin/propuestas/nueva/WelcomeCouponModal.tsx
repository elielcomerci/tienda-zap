'use client'

import { useState, type FormEvent } from 'react'
import { CalendarClock, Tag, X } from 'lucide-react'
import { createPromotion, generatePromotionCoupons } from '@/app/admin/promociones/actions'

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

export type WelcomeProductOption = { id: string; name: string }

type NewPromotionForm = {
  name: string
  discountKind: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: string
  activeTo: string
  minOrderAmount: string
  maxUses: string
  perUserLimit: string
  firstOrderOnly: boolean
  allowedProductIds: string[]
  excludedProductIds: string[]
}

export default function WelcomeCouponModal({
  promotions,
  products,
  recipientEmail,
  recipientName,
  recipientBusiness,
  recipientPhone,
  proposalTitle,
  onClose,
  onCreated,
}: {
  promotions: WelcomePromotionOption[]
  products: WelcomeProductOption[]
  recipientEmail: string
  recipientName: string
  recipientBusiness: string
  recipientPhone: string
  proposalTitle: string
  onClose: () => void
  onCreated: (code: string, promotionName: string) => void
}) {
  const [availablePromotions, setAvailablePromotions] = useState(promotions)
  const [mode, setMode] = useState<'EXISTING' | 'NEW'>(promotions.length ? 'EXISTING' : 'NEW')
  const [promotionId, setPromotionId] = useState(promotions[0]?.id ?? '')
  const [newPromotion, setNewPromotion] = useState<NewPromotionForm>({
    name: 'Beneficio de bienvenida' + (proposalTitle.trim() ? ' · ' + proposalTitle.trim() : ''),
    discountKind: 'PERCENTAGE',
    discountValue: '10',
    activeTo: '',
    minOrderAmount: '',
    maxUses: '',
    perUserLimit: '',
    firstOrderOnly: false,
    allowedProductIds: [],
    excludedProductIds: [],
  })
  const [usesPerCoupon, setUsesPerCoupon] = useState('1')
  const [expiresAt, setExpiresAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const selectedPromotion = availablePromotions.find((promotion) => promotion.id === promotionId)
  const email = recipientEmail.trim()
  const emailIsValid = email.includes('@') && email.split('@')[1]?.includes('.')

  const formatMoney = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value)

  const setNewPromotionField = <K extends keyof NewPromotionForm,>(key: K, value: NewPromotionForm[K]) => {
    setNewPromotion((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!emailIsValid) return setError('Completá primero el email de acceso del cliente.')
    const uses = Number(usesPerCoupon)
    if (!Number.isInteger(uses) || uses < 1 || uses > 500) return setError('Los usos deben estar entre 1 y 500.')

    setBusy(true)
    try {
      let activePromotion = mode === 'EXISTING' ? selectedPromotion : undefined

      if (mode === 'NEW') {
        const discountValue = Number(newPromotion.discountValue)
        if (!newPromotion.name.trim()) throw new Error('La promoción necesita un nombre.')
        if (!Number.isFinite(discountValue) || discountValue <= 0) throw new Error('El descuento debe ser mayor a cero.')
        if (newPromotion.discountKind === 'PERCENTAGE' && discountValue > 100) throw new Error('El porcentaje no puede superar el 100%.')
        if (newPromotion.activeTo && new Date(newPromotion.activeTo).getTime() <= Date.now()) throw new Error('La vigencia debe terminar en una fecha futura.')

        const created = await createPromotion({
          name: newPromotion.name.trim(),
          status: 'ACTIVE',
          discountKind: newPromotion.discountKind,
          discountValue,
          activeTo: newPromotion.activeTo ? new Date(newPromotion.activeTo).toISOString() : null,
          minOrderAmount: newPromotion.minOrderAmount ? Number(newPromotion.minOrderAmount) : null,
          maxUses: newPromotion.maxUses ? Number(newPromotion.maxUses) : null,
          perUserLimit: newPromotion.perUserLimit ? Number(newPromotion.perUserLimit) : null,
          firstOrderOnly: newPromotion.firstOrderOnly,
          allowedProductIds: newPromotion.allowedProductIds,
          excludedProductIds: newPromotion.excludedProductIds,
          stackable: false,
          campaignKind: 'PROPOSAL_WELCOME',
          audienceLabel: 'Clientes de propuestas ZAP',
          welcomeTitle: 'Un beneficio para vos',
          welcomeMessage: 'Tenés un beneficio de bienvenida para usar en la tienda ZAP. El código queda asociado a tu cuenta y se aplicará según las condiciones de esta promoción.',
          landingSurface: 'TIENDA',
        })

        activePromotion = {
          id: created.id,
          name: created.name,
          discountKind: created.discountKind,
          discountValue: created.discountValue,
          activeFrom: created.activeFrom?.toISOString() || null,
          activeTo: created.activeTo?.toISOString() || null,
          minOrderAmount: created.minOrderAmount,
          firstOrderOnly: created.firstOrderOnly,
          perUserLimit: created.perUserLimit,
          maxUses: created.maxUses,
          allowedProductCount: created.allowedProductIds.length,
          excludedProductCount: created.excludedProductIds.length,
        }
        setAvailablePromotions((current) => [activePromotion!, ...current])
        setPromotionId(created.id)
        setMode('EXISTING')
      }

      if (!activePromotion) throw new Error('Elegí una promoción activa o creá una nueva.')
      const recipientRow = [
        recipientName.trim() || recipientBusiness.trim() || 'Cliente',
        recipientBusiness.trim(),
        email.toLowerCase(),
        recipientPhone.trim(),
      ].map((value) => value.replace(/[;,\t]+/g, ' ').trim()).join('\t')

      const result = await generatePromotionCoupons({
        promotionId: activePromotion.id,
        quantity: 1,
        prefix: 'ZAP',
        publicPresenterName: 'ZAP Agencia Creativa',
        batchName: 'Propuesta ZAP · ' + (proposalTitle.trim() || 'Nueva propuesta'),
        recipients: recipientRow,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        usesPerCoupon: uses,
      })
      const code = result.codes?.[0]
      if (!code) throw new Error('La promoción quedó creada, pero no pudimos recuperar el código del cupón.')
      onCreated(code, activePromotion.name)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos crear el cupón.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/50 p-3 backdrop-blur-sm sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="welcome-coupon-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-gray-500">Propuesta comercial</p>
            <h2 id="welcome-coupon-title" className="mt-1 text-xl font-semibold tracking-tight text-gray-950">Crear cupón de bienvenida</h2>
            <p className="mt-1 text-sm text-gray-500">Usá una promoción existente o definí una nueva sin salir de la propuesta.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Cerrar" className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40"><X size={19}/></button>
        </header>

        <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4">
            <button type="button" onClick={() => { setMode('EXISTING'); setError('') }} disabled={!availablePromotions.length || busy} className={mode === 'EXISTING' ? 'rounded-lg bg-gray-950 px-3 py-2 text-sm font-semibold text-white' : 'rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-40'}>Usar promoción existente</button>
            <button type="button" onClick={() => { setMode('NEW'); setError('') }} disabled={busy} className={mode === 'NEW' ? 'rounded-lg bg-gray-950 px-3 py-2 text-sm font-semibold text-white' : 'rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700'}>Crear nueva promoción</button>
          </div>

          {mode === 'EXISTING' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="welcome-promotion" className="label">Promoción activa</label>
                <select id="welcome-promotion" value={promotionId} onChange={(event) => setPromotionId(event.target.value)} className="input" required>
                  {availablePromotions.map((promotion) => (
                    <option key={promotion.id} value={promotion.id}>
                      {promotion.name} · {promotion.discountKind === 'PERCENTAGE' ? promotion.discountValue + '% OFF' : formatMoney(promotion.discountValue) + ' OFF'}
                    </option>
                  ))}
                </select>
              </div>
              {selectedPromotion && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Tag size={16}/> {selectedPromotion.name}</div>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
                    {selectedPromotion.discountKind === 'PERCENTAGE' ? selectedPromotion.discountValue + '% OFF' : formatMoney(selectedPromotion.discountValue) + ' OFF'}
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
            </div>
          )}

          {mode === 'NEW' && (
            <div className="space-y-4">
              <label className="block">
                <span className="label">Nombre de la promoción</span>
                <input value={newPromotion.name} onChange={(event) => setNewPromotionField('name', event.target.value)} className="input" required maxLength={120}/>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="label">Tipo de descuento</span>
                  <select value={newPromotion.discountKind} onChange={(event) => setNewPromotionField('discountKind', event.target.value as NewPromotionForm['discountKind'])} className="input">
                    <option value="PERCENTAGE">Porcentaje</option>
                    <option value="FIXED_AMOUNT">Monto fijo</option>
                  </select>
                </label>
                <label className="block">
                  <span className="label">{newPromotion.discountKind === 'PERCENTAGE' ? 'Descuento (%)' : 'Descuento ($)'}</span>
                  <input type="number" min="0.01" max={newPromotion.discountKind === 'PERCENTAGE' ? 100 : undefined} step="0.01" value={newPromotion.discountValue} onChange={(event) => setNewPromotionField('discountValue', event.target.value)} className="input" required/>
                </label>
                <label className="block">
                  <span className="label">Vigente hasta (opcional)</span>
                  <input type="datetime-local" value={newPromotion.activeTo} onChange={(event) => setNewPromotionField('activeTo', event.target.value)} className="input"/>
                </label>
                <label className="block">
                  <span className="label">Compra mínima (opcional)</span>
                  <input type="number" min="0" step="0.01" value={newPromotion.minOrderAmount} onChange={(event) => setNewPromotionField('minOrderAmount', event.target.value)} className="input" placeholder="Sin mínimo"/>
                </label>
                <label className="block">
                  <span className="label">Límite total de usos (opcional)</span>
                  <input type="number" min="1" step="1" value={newPromotion.maxUses} onChange={(event) => setNewPromotionField('maxUses', event.target.value)} className="input" placeholder="Sin límite"/>
                </label>
                <label className="block">
                  <span className="label">Usos por cliente (opcional)</span>
                  <input type="number" min="1" step="1" value={newPromotion.perUserLimit} onChange={(event) => setNewPromotionField('perUserLimit', event.target.value)} className="input" placeholder="Sin límite"/>
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={newPromotion.firstOrderOnly} onChange={(event) => setNewPromotionField('firstOrderOnly', event.target.checked)} className="rounded border-gray-300"/>
                Solo para la primera compra
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="label">Productos incluidos</span>
                  <select multiple size={5} value={newPromotion.allowedProductIds} onChange={(event) => setNewPromotionField('allowedProductIds', Array.from(event.currentTarget.selectedOptions).map((option) => option.value))} className="input min-h-32">
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </select>
                  <span className="mt-1 block text-xs text-gray-500">Vacío = todos los productos.</span>
                </label>
                <label className="block">
                  <span className="label">Productos excluidos</span>
                  <select multiple size={5} value={newPromotion.excludedProductIds} onChange={(event) => setNewPromotionField('excludedProductIds', Array.from(event.currentTarget.selectedOptions).map((option) => option.value))} className="input min-h-32">
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </select>
                  <span className="mt-1 block text-xs text-gray-500">Opcional. Tiene prioridad sobre los incluidos.</span>
                </label>
              </div>
              <p className="text-xs leading-5 text-gray-500">La promoción se activa al crearla. El motor de cupones aplicará estas condiciones al validar el checkout.</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Usos disponibles para este código</span>
              <input type="number" min="1" max="500" step="1" required value={usesPerCoupon} onChange={(event) => setUsesPerCoupon(event.target.value)} className="input"/>
            </label>
            <label className="block">
              <span className="label">Vencimiento propio del código (opcional)</span>
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
            <button type="submit" disabled={busy || !emailIsValid || (mode === 'EXISTING' && !selectedPromotion)} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Creando cupón…' : 'Crear cupón'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
