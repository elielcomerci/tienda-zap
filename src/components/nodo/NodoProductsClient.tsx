'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { LoaderCircle, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

type SavedProduct = { id: string; kind: 'PRODUCT' | 'SERVICE'; description: string; unit: string; unitPrice: string; vatRatePercent: string | null }
type ProductForm = { kind: 'PRODUCT' | 'SERVICE'; description: string; unit: string; unitPrice: string; vatRatePercent: string }

const emptyProduct: ProductForm = { kind: 'PRODUCT', description: '', unit: 'unidad', unitPrice: '', vatRatePercent: '' }
const inputClass = 'mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-[#ED164F] focus:outline-none focus:ring-2 focus:ring-[#ED164F]/15'

export default function NodoProductsClient({ accountId }: { accountId: string }) {
  const api = useCallback((path: string) => `${path}${path.includes('?') ? '&' : '?'}accountId=${encodeURIComponent(accountId)}`, [accountId])
  const [products, setProducts] = useState<SavedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<SavedProduct | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [product, setProduct] = useState<ProductForm>(emptyProduct)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(api('/api/nodo/products'), { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar los productos.')
      setProducts(Array.isArray(payload.products) ? payload.products : [])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los productos.')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => { void load() }, [load])

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es-AR')
    if (!normalizedQuery) return products
    return products.filter(item => item.description.toLocaleLowerCase('es-AR').includes(normalizedQuery))
  }, [products, query])

  function startCreate() {
    setEditing(null)
    setProduct(emptyProduct)
    setFormOpen(true)
    setError('')
  }

  function startEdit(item: SavedProduct) {
    setEditing(item)
    setProduct({ kind: item.kind, description: item.description, unit: item.unit, unitPrice: item.unitPrice, vatRatePercent: item.vatRatePercent || '' })
    setFormOpen(true)
    setError('')
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
    setProduct(emptyProduct)
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch(api(editing ? `/api/nodo/products?id=${encodeURIComponent(editing.id)}` : '/api/nodo/products'), {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...product, unitPrice: Number(product.unitPrice), vatRatePercent: product.vatRatePercent === '' ? null : Number(product.vatRatePercent) }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo guardar el producto o servicio.')
      closeForm()
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el producto o servicio.')
    } finally {
      setBusy(false)
    }
  }

  async function removeProduct(item: SavedProduct) {
    if (!confirm(`¿Querés eliminar “${item.description}” de tu catálogo?`)) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(api(`/api/nodo/products?id=${encodeURIComponent(item.id)}`), { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo eliminar el producto o servicio.')
      if (editing?.id === item.id) closeForm()
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo eliminar el producto o servicio.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="space-y-5">
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

    {formOpen && <section aria-labelledby="product-form-title" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div><h2 id="product-form-title" className="text-lg font-semibold text-gray-950">{editing ? 'Editar producto o servicio' : 'Nuevo producto o servicio'}</h2><p className="mt-1 text-sm text-gray-500">Los valores se pueden revisar antes de emitir cada comprobante.</p></div>
        <button type="button" onClick={closeForm} aria-label="Cerrar formulario" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X size={18} /></button>
      </div>
      <form onSubmit={saveProduct} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-700">Tipo<select value={product.kind} onChange={event => { const kind = event.target.value === 'SERVICE' ? 'SERVICE' : 'PRODUCT'; setProduct(current => ({ ...current, kind, unit: ['unidad', 'servicio'].includes(current.unit) ? kind === 'SERVICE' ? 'servicio' : 'unidad' : current.unit })) }} className={inputClass}><option value="PRODUCT">Producto</option><option value="SERVICE">Servicio</option></select></label>
        <label className="text-sm font-medium text-gray-700 sm:col-span-2">Descripción<input required maxLength={240} value={product.description} onChange={event => setProduct({ ...product, description: event.target.value })} className={inputClass} /></label>
        <label className="text-sm font-medium text-gray-700">{product.kind === 'SERVICE' ? 'Unidad o período' : 'Unidad'}<input required maxLength={40} value={product.unit} onChange={event => setProduct({ ...product, unit: event.target.value })} className={inputClass} placeholder={product.kind === 'SERVICE' ? 'Por hora, mes, sesión…' : 'Unidad, caja, kg…'} /></label>
        <label className="text-sm font-medium text-gray-700">Precio unitario sin IVA<input required type="number" min="0.01" step="0.01" value={product.unitPrice} onChange={event => setProduct({ ...product, unitPrice: event.target.value })} className={inputClass} /></label>
        <label className="text-sm font-medium text-gray-700 sm:col-span-2">Alícuota de IVA<select value={product.vatRatePercent} onChange={event => setProduct({ ...product, vatRatePercent: event.target.value })} className={inputClass}><option value="">Sin definir</option><option value="0">0%</option><option value="2.5">2,5%</option><option value="5">5%</option><option value="10.5">10,5%</option><option value="21">21%</option><option value="27">27%</option></select></label>
        {!product.vatRatePercent && <p className="text-xs leading-5 text-amber-800 sm:col-span-2">Si dejás el IVA sin definir, vas a tener que confirmarlo al emitir.</p>}
        <div className="flex flex-wrap gap-2 sm:col-span-2"><button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#17151a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16} />{editing ? 'Guardar cambios' : product.kind === 'SERVICE' ? 'Guardar servicio' : 'Guardar producto'}</button><button type="button" onClick={closeForm} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700">Cancelar</button></div>
      </form>
    </section>}

    {!formOpen && products.length > 0 && <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-gray-600">{products.length} {products.length === 1 ? 'ítem guardado' : 'ítems guardados'}</p><button type="button" onClick={startCreate} className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-[#17151a] px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} />Agregar</button></div>}
    {!formOpen && products.length > 0 && <label className="relative block max-w-lg"><span className="sr-only">Buscar productos o servicios por descripción</span><Search size={17} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por descripción" className={`${inputClass} pl-10`} /></label>}
    {loading ? <p className="flex items-center gap-2 rounded-xl bg-gray-50 p-5 text-sm text-gray-500"><LoaderCircle className="animate-spin" size={16} />Cargando catálogo…</p> : filteredProducts.length ? <ul className="divide-y divide-gray-100">{filteredProducts.map(item => <li key={item.id} className="flex items-start gap-3 py-4"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-gray-900">{item.description}</p><p className="mt-1 text-xs text-gray-500">{item.kind === 'SERVICE' ? 'Servicio' : 'Producto'} · {item.unit} · ${Number(item.unitPrice).toLocaleString('es-AR', { minimumFractionDigits: 2 })} · IVA {item.vatRatePercent === null ? 'sin definir' : `${item.vatRatePercent}%`}</p></div><button type="button" aria-label={`Editar ${item.description}`} disabled={busy} onClick={() => startEdit(item)} className="rounded-lg p-2 text-gray-500 hover:bg-sky-50 hover:text-sky-700"><Pencil size={16} /></button><button type="button" aria-label={`Eliminar ${item.description}`} disabled={busy} onClick={() => void removeProduct(item)} className="rounded-lg p-2 text-gray-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={16} /></button></li>)}</ul> : query ? <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">No hay productos o servicios que coincidan con la búsqueda.</p> : !error && !formOpen && <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8"><p className="text-sm font-semibold text-gray-950">Agregá lo que vendés para tenerlo listo al facturar.</p><button type="button" onClick={startCreate} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#17151a] px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} />Agregar primer producto o servicio</button></div>}
  </div>
}
