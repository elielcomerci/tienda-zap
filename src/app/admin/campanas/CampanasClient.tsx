'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Megaphone, Check, X, ShieldAlert, Tag, Percent } from 'lucide-react'
import { PartnerCampaign } from '@prisma/client'
import { createCampaign, updateCampaign, deleteCampaign, toggleCampaignActive } from './actions'

type Product = { id: string; name: string; slug: string; price: number }

type CampanaFormData = {
  id?: string
  zone: string
  format: string
  title: string
  description: string
  ctaText: string
  imageUrl: string
  backgroundColor: string
  textColor: string
  actionType: string
  actionUrl: string
  productId: string
  // Promo
  hasPromo: boolean
  promoType: string
  discountKind: string
  discountValue: string
}

const DEFAULT_FORM: CampanaFormData = {
  zone: 'resumen',
  format: 'banner_small',
  title: '',
  description: '',
  ctaText: '',
  imageUrl: '',
  backgroundColor: '#f97316',
  textColor: '#ffffff',
  actionType: 'open_url',
  actionUrl: '',
  productId: '',
  hasPromo: false,
  promoType: 'COMBO',
  discountKind: 'PERCENTAGE',
  discountValue: '',
}

const ZONE_LABELS: Record<string, string> = {
  resumen: 'Resumen Checkout',
  stats: 'Dashboard / Stats',
  configuracion: 'Configuración',
}

const PROMO_TYPE_LABELS: Record<string, string> = {
  COMBO: '🧃 Combo',
  ZONA_ROJA: '🔴 Zona Roja (por vencimiento)',
  HAPPY_HOUR: '⏰ Happy Hour',
  DIA_TEMATICO: '🎉 Día Temático',
}

const DISCOUNT_LABELS: Record<string, string> = {
  PERCENTAGE: 'Porcentaje (%)',
  FIXED_PRICE: 'Precio fijo ($)',
}

function campanaToForm(c: PartnerCampaign): CampanaFormData {
  const hasPromo = !!(c as any).promoType
  return {
    id: c.id,
    zone: c.zone,
    format: c.format,
    title: c.title,
    description: c.description || '',
    ctaText: c.ctaText || '',
    imageUrl: c.imageUrl || '',
    backgroundColor: c.backgroundColor || '#f97316',
    textColor: c.textColor || '#ffffff',
    actionType: c.actionType,
    actionUrl: c.actionUrl || '',
    productId: c.productId || '',
    hasPromo,
    promoType: (c as any).promoType || 'COMBO',
    discountKind: (c as any).discountKind || 'PERCENTAGE',
    discountValue: (c as any).discountValue != null ? String((c as any).discountValue) : '',
  }
}

function formToPayload(f: CampanaFormData) {
  return {
    zone: f.zone,
    format: f.format,
    title: f.title,
    description: f.description,
    ctaText: f.ctaText,
    imageUrl: f.imageUrl,
    backgroundColor: f.backgroundColor,
    textColor: f.textColor,
    actionType: f.actionType,
    actionUrl: f.actionType === 'open_url' ? f.actionUrl : '',
    productId: f.actionType === 'one_click_order' ? f.productId : '',
    promoType: f.hasPromo ? f.promoType : '',
    discountKind: f.hasPromo ? f.discountKind : '',
    discountValue: f.hasPromo && f.discountValue ? parseFloat(f.discountValue) : undefined,
  }
}

export default function CampanasClient({ initialCampaigns }: { initialCampaigns: PartnerCampaign[] }) {
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<CampanaFormData>(DEFAULT_FORM)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  // Selector de productos
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  // Carga productos cuando se entra en modo one_click_order
  useEffect(() => {
    if (formData.actionType === 'one_click_order' && products.length === 0) {
      setLoadingProducts(true)
      fetch('/api/admin/products-selector')
        .then(r => r.json())
        .then(d => setProducts(d.products ?? []))
        .catch(() => {})
        .finally(() => setLoadingProducts(false))
    }
  }, [formData.actionType, products.length])

  const set = (patch: Partial<CampanaFormData>) => setFormData(prev => ({ ...prev, ...patch }))

  const handleOpenModal = (campaign?: PartnerCampaign) => {
    setFormData(campaign ? campanaToForm(campaign) : DEFAULT_FORM)
    setError('')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      const payload = formToPayload(formData)
      if (formData.id) {
        await updateCampaign(formData.id, payload)
      } else {
        await createCampaign(payload)
      }
      window.location.reload()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error guardando campaña')
      setIsLoading(false)
    }
  }

  const handleToggle = async (id: string, current: boolean) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, active: !current } : c))
    try { await toggleCampaignActive(id, !current) }
    catch { setCampaigns(prev => prev.map(c => c.id === id ? { ...c, active: current } : c)) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta campaña?')) return
    setCampaigns(prev => prev.filter(c => c.id !== id))
    try { await deleteCampaign(id) }
    catch { window.location.reload() }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="text-orange-500" size={24} />
            Campañas Partner
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona los anuncios que se inyectan en kiosco24.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
        >
          <Plus size={18} /> Crear Campaña
        </button>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.length === 0 ? (
          <div className="col-span-full card p-16 text-center">
            <ShieldAlert size={40} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">No hay campañas creadas</h2>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Crea tu primera campaña para mostrar anuncios en kiosco24.
            </p>
          </div>
        ) : (
          campaigns.map(camp => {
            const pv = (camp as any).discountValue
            const pk = (camp as any).discountKind
            const pt = (camp as any).promoType
            const discountLabel = pv != null
              ? pk === 'PERCENTAGE' ? `${pv}% OFF` : `$${pv} precio fijo`
              : null

            return (
              <div
                key={camp.id}
                className={`card overflow-hidden border-2 transition-all ${camp.active ? 'border-transparent' : 'border-gray-200 opacity-60'}`}
                style={{ borderTopColor: camp.active ? (camp.backgroundColor ?? '#f97316') : undefined, borderTopWidth: 3 }}
              >
                {camp.imageUrl && (
                  <div className="h-28 w-full bg-gray-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={camp.imageUrl} alt={camp.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded uppercase tracking-wider">
                          {ZONE_LABELS[camp.zone] ?? camp.zone}
                        </span>
                        {discountLabel && (
                          <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded flex items-center gap-1">
                            <Tag size={10} /> {discountLabel}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-gray-900 mt-2 leading-tight line-clamp-1">{camp.title}</h3>
                      {pt && (
                        <p className="text-xs text-gray-400 mt-0.5">{PROMO_TYPE_LABELS[pt] ?? pt}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggle(camp.id, camp.active)}
                      className={`ml-2 p-1.5 rounded-full shrink-0 ${camp.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
                      title={camp.active ? 'Desactivar' : 'Activar'}
                    >
                      {camp.active ? <Check size={15} /> : <X size={15} />}
                    </button>
                  </div>

                  {camp.description && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{camp.description}</p>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                    <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded">{camp.format}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleOpenModal(camp)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit size={15} />
                      </button>
                      <button onClick={() => handleDelete(camp.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10">
              <h2 className="text-xl font-bold text-gray-900">
                {formData.id ? 'Editar Campaña' : 'Nueva Campaña'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

              {/* Zona / Formato */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Zona</label>
                  <select value={formData.zone} onChange={e => set({ zone: e.target.value })} className="input" required>
                    <option value="resumen">Resumen Checkout</option>
                    <option value="stats">Dashboard / Stats</option>
                    <option value="configuracion">Configuración</option>
                  </select>
                </div>
                <div>
                  <label className="label">Formato</label>
                  <select value={formData.format} onChange={e => set({ format: e.target.value })} className="input" required>
                    <option value="text_only">Solo Texto</option>
                    <option value="banner_small">Banner Pequeño</option>
                    <option value="banner_large">Banner Grande</option>
                  </select>
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="label">Título *</label>
                <input type="text" value={formData.title} onChange={e => set({ title: e.target.value })} className="input" required />
              </div>

              {/* Descripción */}
              <div>
                <label className="label">Descripción</label>
                <textarea value={formData.description} onChange={e => set({ description: e.target.value })} className="input min-h-[72px]" />
              </div>

              {/* Imagen */}
              <div>
                <label className="label">URL de Imagen</label>
                <input type="url" value={formData.imageUrl} onChange={e => set({ imageUrl: e.target.value })} className="input" placeholder="https://…" />
              </div>

              {/* Acción */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Tipo de Acción</label>
                  <select value={formData.actionType} onChange={e => set({ actionType: e.target.value, actionUrl: '', productId: '' })} className="input" required>
                    <option value="open_url">Abrir Enlace</option>
                    <option value="one_click_order">Compra 1 clic (ZAP)</option>
                  </select>
                </div>
                <div>
                  {formData.actionType === 'open_url' ? (
                    <>
                      <label className="label">URL de Destino</label>
                      <input type="url" value={formData.actionUrl} onChange={e => set({ actionUrl: e.target.value })} className="input" placeholder="https://…" />
                    </>
                  ) : (
                    <>
                      <label className="label">Producto ZAP</label>
                      {loadingProducts ? (
                        <div className="input text-gray-400 text-sm">Cargando productos…</div>
                      ) : (
                        <select value={formData.productId} onChange={e => set({ productId: e.target.value })} className="input">
                          <option value="">— Seleccioná un producto —</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} · ${p.price.toLocaleString('es-AR')}
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* CTA + Colores */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Texto Botón (CTA)</label>
                  <input type="text" value={formData.ctaText} onChange={e => set({ ctaText: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Color Fondo</label>
                  <input type="color" value={formData.backgroundColor} onChange={e => set({ backgroundColor: e.target.value })} className="input h-[42px] p-1 cursor-pointer" />
                </div>
                <div>
                  <label className="label">Color Texto</label>
                  <input type="color" value={formData.textColor} onChange={e => set({ textColor: e.target.value })} className="input h-[42px] p-1 cursor-pointer" />
                </div>
              </div>

              {/* ── Sección Promoción ── */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => set({ hasPromo: !formData.hasPromo })}
                  className={`w-full flex items-center justify-between px-5 py-3 text-sm font-semibold transition-colors ${formData.hasPromo ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                  <span className="flex items-center gap-2">
                    <Percent size={15} />
                    Agregar Promoción / Descuento
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${formData.hasPromo ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-500'}`}>
                    {formData.hasPromo ? 'Activa' : 'Sin promo'}
                  </span>
                </button>

                {formData.hasPromo && (
                  <div className="p-5 space-y-4 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Tipo de Promo</label>
                        <select value={formData.promoType} onChange={e => set({ promoType: e.target.value })} className="input">
                          {Object.entries(PROMO_TYPE_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">Tipo de Descuento</label>
                        <select value={formData.discountKind} onChange={e => set({ discountKind: e.target.value })} className="input">
                          {Object.entries(DISCOUNT_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="label">
                        {formData.discountKind === 'PERCENTAGE' ? 'Porcentaje de descuento (%)' : 'Precio fijo del combo ($)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.discountValue}
                        onChange={e => set({ discountValue: e.target.value })}
                        className="input"
                        placeholder={formData.discountKind === 'PERCENTAGE' ? 'Ej: 15' : 'Ej: 2500'}
                        required={formData.hasPromo}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl" disabled={isLoading}>
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl flex items-center gap-2" disabled={isLoading}>
                  {isLoading ? 'Guardando…' : 'Guardar Campaña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .label { display: block; font-size: 0.8rem; font-weight: 600; color: #374151; margin-bottom: 0.25rem; }
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 0.625rem; font-size: 0.875rem; outline: none; }
        .input:focus { border-color: #f97316; }
      `}</style>
    </div>
  )
}
