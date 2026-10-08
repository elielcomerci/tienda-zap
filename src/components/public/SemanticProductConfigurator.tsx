'use client'
import { useEffect, useMemo, useState } from 'react'
import { Check, MessageCircleMore } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
type Props = { product: any; configurator: any; inquiryUrl?: string | null }
type QuoteResult = { unitPrice: number; totalPrice: number; totalCost: number; selectedOptions: Array<{ name: string; value: string }>; breakdown?: Record<string, number> }
const quoteCache = new Map<string, QuoteResult>()
function visible(key: string, selected: Record<string, any>, configurator: any) {
  return (configurator.compatibility?.uiRules || []).filter((r: any) => r.field === key).every((r: any) => {
    const value = selected[r.condition?.field]
    if (r.condition?.operator === 'eq') return value === r.condition.value
    if (r.condition?.operator === 'neq') return value !== r.condition.value
    if (r.condition?.operator === 'exists') return value !== undefined && value !== null && value !== ''
    return true
  })
}
function optionsFor(key: string, field: any, selected: Record<string, any>, configurator: any) {
  let options = Array.isArray(field.options) ? field.options : []
  const allowed = configurator.compatibility?.allowedFormats?.[selected.foldingType]
  if (key === 'format' && allowed) options = options.filter((o: any) => allowed.includes(o.id))
  return options
}
export default function SemanticProductConfigurator({ product, configurator, inquiryUrl }: Props) {
  const fields = configurator.schema?.fields || {}
  const [selected, setSelected] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {}
    Object.entries(fields).forEach(([key, field]: [string, any]) => {
      if (field.default !== undefined) initial[key] = field.default
      if (field.type === 'multiselect' && field.default === undefined) initial[key] = []
    })
    return initial
  })
  const [quote, setQuote] = useState<QuoteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((state) => state.addItem)
  const normalized = useMemo(() => {
    const result: Record<string, any> = {}
    Object.entries(selected).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') result[key] = value })
    return result
  }, [selected])
  const complete = Object.entries(fields).filter(([, field]: [string, any]) => field.required).every(([key, field]: [string, any]) => {
    const value = normalized[key]
    return field.type === 'multiselect' ? Array.isArray(value) : value !== undefined && value !== ''
  })
  useEffect(() => {
    if (!complete) { setQuote(null); setError(''); return }
    const key = product.id + ':' + JSON.stringify(normalized)
    const cached = quoteCache.get(key)
    if (cached) { setQuote(cached); return }
    const controller = new AbortController()
    setLoading(true); setError('')
    fetch('/api/product-quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, selection: normalized }), signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No pudimos calcular esta configuración.'); return data })
      .then((data) => { quoteCache.set(key, data); setQuote(data) })
      .catch((err) => { if (err?.name !== 'AbortError') { setQuote(null); setError(err?.message || 'CONSULT_REQUIRED') } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [complete, normalized, product.id])
  const change = (key: string, value: any) => setSelected((previous) => ({ ...previous, [key]: value }))
  const addQuoted = () => {
    if (!quote) return
    addItem({ productId: product.id, name: product.name, price: quote.totalPrice, catalogType: product.catalogType, modality: product.modality, creditDownPaymentPercent: product.creditDownPaymentPercent || 30, image: product.images?.[0] || '', quantity: 1, briefType: ['DESIGN','MUSIC','VIDEO'].includes(product.briefType) ? product.briefType : 'NONE', selectedOptions: quote.selectedOptions })
    setAdded(true); setTimeout(() => setAdded(false), 1500)
  }
  return (
    <section className="rounded-[28px] border border-gray-200 bg-white p-5 sm:p-7">
      <div className="border-b border-gray-100 pb-5"><span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600">Configuración</span><h2 className="mt-4 text-2xl font-black text-gray-950 sm:text-3xl">Elegí cómo la querés</h2></div>
      <div className="mt-6 space-y-4">
        {Object.entries(fields).map(([key, field]: [string, any]) => {
          if (!visible(key, selected, configurator)) return null
          const options = optionsFor(key, field, selected, configurator)
          if (field.type === 'multiselect') {
            const values = Array.isArray(selected[key]) ? selected[key] : []
            return <div key={key} className="rounded-[24px] border border-gray-200 bg-gray-50/70 p-4"><h3 className="text-base font-bold text-gray-900">{field.label || key}</h3><div className="mt-4 grid gap-2 sm:grid-cols-2">{options.map((option: any) => { const active = values.includes(option.id); return <button key={option.id} type="button" onClick={() => change(key, active ? values.filter((v: string) => v !== option.id) : values.concat(option.id))} className={'rounded-2xl border-2 p-3 text-left text-sm font-semibold ' + (active ? 'border-[#ED164F] bg-[#FEF1F5] text-[#C2103F]' : 'border-gray-200 bg-white text-gray-700')}>{option.label || option.id}{active ? <Check className="float-right" size={16} /> : null}</button> })}</div></div>
          }
          return <label key={key} className="block rounded-[24px] border border-gray-200 bg-gray-50/70 p-4"><span className="text-base font-bold text-gray-900">{field.label || key}</span><select value={selected[key] ?? ''} onChange={(event) => change(key, field.type === 'quantity_selector' ? Number(event.target.value) : event.target.value)} className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900">{options.map((option: any) => <option key={option.id ?? option.value} value={option.id ?? option.value}>{option.label ?? option.value}</option>)}</select></label>
        })}
      </div>
      <div className="mt-6 rounded-[28px] bg-gray-950 p-5 text-white"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Precio final</p>{loading ? <p className="mt-3 text-sm text-gray-300">Calculando…</p> : quote ? <p className="mt-3 text-4xl font-black">{'$' + quote.totalPrice.toLocaleString('es-AR')}</p> : error === 'CONSULT_REQUIRED' ? <p className="mt-3 text-3xl font-black text-[#F7638B]">Consultar</p> : <p className="mt-3 text-sm text-gray-300">{complete ? 'Elegí una configuración válida.' : 'Elegí las opciones que faltan.'}</p>}{error === 'CONSULT_REQUIRED' ? <p className="mt-2 text-sm text-gray-300">Esta combinación necesita una revisión con ZAP.</p> : null}<div className="mt-5">{quote ? <button type="button" onClick={addQuoted} className="w-full rounded-2xl bg-[#ED164F] px-5 py-3 text-sm font-black text-white">{added ? 'Agregado' : 'Agregar al carrito'}</button> : <a href={inquiryUrl || '#'} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ED164F] px-5 py-3 text-sm font-black text-white"><MessageCircleMore size={18} />Hablar con ZAP</a>}</div></div>
    </section>
  )
}
