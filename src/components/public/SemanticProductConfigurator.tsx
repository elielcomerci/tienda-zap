'use client'
import { useEffect, useMemo, useState } from 'react'
import { Check, MessageCircleMore } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { appendWhatsappDetails } from '@/lib/whatsapp'
type Props = { product: any; configurator: any; inquiryUrl?: string | null }
type QuoteResult = { unitPrice: number; totalPrice: number; totalCost: number; selectedOptions: Array<{ name: string; value: string }>; taxTreatment?: 'INCLUDED'; netPrice?: number; vatAmount?: number; vatRatePercent?: number; breakdown?: Record<string, number> }
function visible(key: string, selected: Record<string, any>, configurator: any) {
  return (configurator.compatibility?.uiRules || []).filter((r: any) => r.field === key).every((r: any) => {
    const value = selected[r.condition?.field]
    if (r.condition?.operator === 'eq') return value === r.condition.value
    if (r.condition?.operator === 'neq') return value !== r.condition.value
    if (r.condition?.operator === 'exists') return value !== undefined && value !== null && value !== ''
    return true
  })
}
function hasCardsCost(configurator: any, selection: Record<string, any>) {
  const matrix = configurator.pricing?.providerFinishedCostMatrix
  if (matrix?.resolver?.type !== 'CARDS_DIGITAL') return true
  const quantity = String(selection.quantity ?? '')
  const printing = String(selection.printing ?? '')
  const format = selection.format === '9x10_plegada' ? '9x10' : String(selection.format ?? '')

  if (selection.productionProcess === 'offset') {
    if (selection.material !== 'ilustracion_350g') return false
    if (Number(quantity) < 1000 || (selection.additionalFinishings || []).length > 0) return false
    const tiers = matrix.tiers || {}
    let row: any
    if (selection.lamination === 'sin_laminar') row = tiers.clasicas?.finishes?.sin_laminar?.printing?.[printing]?.[format]
    if (selection.lamination === 'brillo') row = tiers.clasicas?.finishes?.opp_brillo?.printing?.[printing]?.[format]
    if (selection.lamination === 'mate') row = tiers.premium?.finishes?.opp_mate?.printing?.[printing]?.[format]
    if (selection.lamination === 'mate_uv_sectorizada' && printing === '4_4' && format === '9x5') {
      row = tiers.deluxe?.finishes?.opp_mate_laca_uv_sectorizada?.printing?.['4_4']?.sectorizedSides?.frente?.[format]
      const classic = tiers.clasicas?.finishes?.sin_laminar?.printing?.['4_4']?.[format]?.[quantity]
      if (row?.[quantity] !== undefined && classic !== undefined && Number(row[quantity]) < Number(classic)) return false
    }
    if (selection.productionProcess !== 'offset' && Number(quantity) === 500 && selection.material === 'ilustracion_350g' && printing === '4_4') return false
    return row?.[quantity] !== undefined
  }

  if (selection.format !== '9x5' || (selection.laminationSides && selection.laminationSides !== 'frente')) return false
  const cards = matrix.digitalOndemand?.cards?.[String(selection.material ?? '')]
  const row = cards?.quantities?.[quantity]?.[printing]
  const finishKey = selection.lamination === 'mate' ? 'laminado_mate'
    : selection.lamination === 'brillo' ? 'laminado_brillo'
    : selection.lamination === 'laca_uv' ? 'laca_uv'
    : selection.lamination === 'sin_laminar' ? 'sin_laminar' : null
  if (!row || !finishKey || row[finishKey] === undefined) return false
  const finishing = matrix.digitalOndemand?.finishing || {}
  return (selection.additionalFinishings || []).every((key: string) => {
    const source = key === 'puntas_redondeadas' ? finishing.puntas_redondeadas
      : key === 'perforacion' ? finishing.agujereado_3mm : null
    return source?.[quantity] !== undefined
  })
}

function optionsFor(key: string, field: any, selected: Record<string, any>, configurator: any) {
  let options = Array.isArray(field.options) ? field.options : []
  const allowed = configurator.compatibility?.allowedFormats?.[selected.foldingType]
  if (key === 'format' && allowed) options = options.filter((o: any) => allowed.includes(o.id))

  // En tarjetas, la matriz de proveedor decide qué variantes se pueden cotizar.
  // No se duplican restricciones de tamaños, gramajes o terminaciones en la UI.
  if (configurator.pricing?.providerFinishedCostMatrix?.resolver?.type === 'CARDS_DIGITAL') {
    if (key === 'additionalFinishings' && selected.productionProcess === 'offset') return []
    if (['format', 'material', 'printing', 'lamination', 'quantity'].includes(key)) {
      options = options.filter((option: any) => {
        const value = option.id ?? option.value
        const candidate = { ...selected, [key]: key === 'quantity' ? Number(value) : value }
        if (hasCardsCost(configurator, candidate)) return true
        // Un formato puede tener precio en otra terminación o sistema de impresión.
        // Para formatos/impresión/cantidad, buscar celdas reales compatibles sin
        // alterar las otras elecciones del usuario. La terminación seleccionada
        // se respeta cuando el campo que se está editando es la terminación misma.
        const finishes = selected.productionProcess === 'offset'
          ? ['sin_laminar', 'brillo', 'mate']
          : ['sin_laminar', 'laca_uv', 'brillo', 'mate']
        const printings = selected.productionProcess === 'offset'
          ? ['4_0', '4_1', '4_4']
          : ['4_0', '4_4']
        const tryFinishes = key === 'lamination' ? [candidate.lamination] : finishes
        const tryPrintings = key === 'printing' ? [candidate.printing] : printings
        return tryFinishes.some((lamination: string) =>
          tryPrintings.some((printing: string) =>
            hasCardsCost(configurator, { ...candidate, lamination, printing })
          )
        )
      })
    }
  }
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
  const [quoteForKey, setQuoteForKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((state) => state.addItem)
  const normalized = useMemo(() => {
    const result: Record<string, any> = {}
    Object.entries(selected).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') result[key] = value })
    return result
  }, [selected])
  const configuredInquiryUrl = useMemo(() => {
    const details = Object.entries(normalized).flatMap(([key, value]) => {
      if (!visible(key, normalized, configurator)) return [];
      const field = fields[key] || {};
      const name = field.label || key;
      if (Array.isArray(value)) {
        const labels = value.map((entry) => {
          const option = (field.options || []).find((item: any) => (item.id ?? item.value) === entry);
          return option?.label || String(entry);
        });
        return labels.length ? [{ name, value: labels.join(', ') }] : [];
      }
      const option = (field.options || []).find((item: any) => (item.id ?? item.value) === value);
      return [{ name, value: option?.label || String(value) }];
    });
    return appendWhatsappDetails(inquiryUrl, 'Configuración elegida:', details);
  }, [configurator, fields, inquiryUrl, normalized]);

  const complete = Object.entries(fields).filter(([, field]: [string, any]) => field.required).every(([key, field]: [string, any]) => {
    const value = normalized[key]
    return field.type === 'multiselect' ? Array.isArray(value) : value !== undefined && value !== ''
  })
  const quoteKey = product.id + ':' + (configurator.id || configurator.schemaVersion || 'unversioned') + ':' + JSON.stringify({ schema: configurator.schema, compatibility: configurator.compatibility, pricing: configurator.pricing }) + ':' + JSON.stringify(normalized)
  const currentQuote = quote && quoteForKey === quoteKey ? quote : null

  useEffect(() => {
    if (!complete) { setQuote(null); setQuoteForKey(''); setLoading(false); setError(''); return }
    const key = quoteKey
    const controller = new AbortController()
    setQuote(null); setQuoteForKey(''); setLoading(true); setError('')
    fetch('/api/product-quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, selection: normalized }), signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No pudimos calcular esta configuración.'); return data })
      .then((data) => { setQuote(data); setQuoteForKey(key) })
      .catch((err) => { if (err?.name !== 'AbortError') { setQuote(null); setQuoteForKey(''); setError(err?.message || 'CONSULT_REQUIRED') } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [complete, normalized, quoteKey, product.id])
  const change = (key: string, value: any) => {
    if (key === 'productionProcess' && fields.productionProcess) {
      setSelected((previous) => {
        const offset = value === 'offset'
        const currentQuantity = Number(previous.quantity || 1000)
        const quantity = offset ? Math.max(1000, currentQuantity) : Math.min(1000, currentQuantity)
        return {
          ...previous,
          productionProcess: value,
          material: offset ? 'ilustracion_350g' : previous.material,
          format: offset ? '9x5' : previous.format,
          quantity,
          printing: offset && quantity > 1000 ? '4_4' : previous.printing,
          lamination: offset
            ? (['sin_laminar', 'brillo', 'mate', 'mate_uv_sectorizada'].includes(previous.lamination) ? previous.lamination : 'sin_laminar')
            : (previous.lamination === 'mate_uv_sectorizada' ? 'sin_laminar' : previous.lamination),
          additionalFinishings: offset ? [] : previous.additionalFinishings,
        }
      })
      return
    }
    if (key === 'quantity' && selected.productionProcess === 'digital' && Number(value) === 500 && selected.printing === '4_4') {
      setSelected((previous) => ({ ...previous, quantity: value, printing: '4_0' }))
      return
    }
    if (key === 'quantity' && selected.productionProcess === 'offset' && Number(value) > 1000) {
      setSelected((previous) => ({
        ...previous,
        quantity: 1000,
        printing: '4_4',
        lamination: ['sin_laminar', 'brillo', 'mate'].includes(previous.lamination) ? previous.lamination : 'sin_laminar',
      }))
      return
    }
    setSelected((previous) => ({ ...previous, [key]: value }))
  }
  const quoteHasApprovedTaxDisplay = currentQuote?.taxTreatment === 'INCLUDED' && typeof currentQuote.netPrice === 'number' && typeof currentQuote.vatAmount === 'number' && typeof currentQuote.vatRatePercent === 'number'
  const addQuoted = () => {
    if (!currentQuote || loading || !quoteHasApprovedTaxDisplay) return
    addItem({ productId: product.id, name: product.name, price: currentQuote.totalPrice, catalogType: product.catalogType, modality: product.modality, creditDownPaymentPercent: product.creditDownPaymentPercent || 30, image: product.images?.[0] || '', quantity: 1, briefType: ['DESIGN','MUSIC','VIDEO'].includes(product.briefType) ? product.briefType : 'NONE', selectedOptions: currentQuote.selectedOptions, configuratorSelection: normalized })
    setAdded(true); setTimeout(() => setAdded(false), 1500)
  }
  return (
    <section className="rounded-[28px] border border-gray-200 bg-white p-5 sm:p-7">
      <div className="border-b border-gray-100 pb-5"><h2 className="text-2xl font-black text-gray-950 sm:text-3xl">Elegí cómo la querés</h2></div>
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
      <div className="mt-6 rounded-[28px] bg-gray-950 p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Precio final</p>
        {loading ? <p className="mt-3 text-sm text-gray-300">Calculando…</p> : quoteHasApprovedTaxDisplay && currentQuote ? (
          <>
            <p className="mt-3 text-4xl font-black">{'$' + currentQuote.totalPrice.toLocaleString('es-AR')}</p>
            <p className="mt-2 text-sm font-semibold text-gray-200">IVA incluido</p>
            <p className="mt-2 text-xs leading-5 text-gray-300">{'Precio sin impuestos nacionales: $' + currentQuote.netPrice!.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</p>
            <p className="mt-1 text-xs leading-5 text-gray-300">{'IVA (' + currentQuote.vatRatePercent + '%): $' + currentQuote.vatAmount!.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</p>
          </>
        ) : currentQuote || error === 'CONSULT_REQUIRED' ? (
          <p className="mt-3 text-3xl font-black text-[#F7638B]">Consultar</p>
        ) : (
          <p className="mt-3 text-sm text-gray-300">{complete ? 'Elegí una configuración válida.' : 'Elegí las opciones que faltan.'}</p>
        )}
        {currentQuote && !quoteHasApprovedTaxDisplay ? <p className="mt-2 text-sm text-gray-300">Estamos validando el precio final y los impuestos aplicables a esta configuración.</p> : null}
        {error === 'CONSULT_REQUIRED' ? <p className="mt-2 text-sm text-gray-300">Esta combinación necesita una revisión con ZAP.</p> : null}
        <div className="mt-5">
          {quoteHasApprovedTaxDisplay && currentQuote ? (
            <button type="button" onClick={addQuoted} className="w-full rounded-2xl bg-[#ED164F] px-5 py-3 text-sm font-black text-white">{added ? 'Agregado' : 'Agregar al carrito'}</button>
          ) : (
            <a href={configuredInquiryUrl || inquiryUrl || '#'} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ED164F] px-5 py-3 text-sm font-black text-white"><MessageCircleMore size={18} />Hablar con ZAP</a>
          )}
        </div>
      </div>
    </section>
  )
}
