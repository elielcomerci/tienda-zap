'use client'

import { useCallback, useEffect, useState } from 'react'
import { LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react'

type SavedCustomer = { id: string; name: string; documentType: string | null; documentNumber: string | null; vatCondition: string | null; address: string | null; email: string | null; phone: string | null }
type SavedProduct = { id: string; description: string; unit: string; unitPrice: string; vatRatePercent: string | null }

export default function NodoCatalogClient() {
  const [customers, setCustomers] = useState<SavedCustomer[]>([])
  const [products, setProducts] = useState<SavedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [customerEditId, setCustomerEditId] = useState<string | null>(null)
  const [productEditId, setProductEditId] = useState<string | null>(null)
  const [customer, setCustomer] = useState({ name: '', documentType: 'CUIT', documentNumber: '', vatCondition: '', address: '', email: '', phone: '' })
  const [product, setProduct] = useState({ description: '', unit: 'unidad', unitPrice: '', vatRatePercent: '' })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [customerResponse, productResponse] = await Promise.all([
        fetch('/api/nodo/customers', { cache: 'no-store' }),
        fetch('/api/nodo/products', { cache: 'no-store' }),
      ])
      const [customerPayload, productPayload] = await Promise.all([customerResponse.json(), productResponse.json()])
      if (!customerResponse.ok || !productResponse.ok) throw new Error(customerPayload.error || productPayload.error || 'No se pudo cargar la agenda.')
      setCustomers(Array.isArray(customerPayload.customers) ? customerPayload.customers : [])
      setProducts(Array.isArray(productPayload.products) ? productPayload.products : [])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar la agenda.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function saveCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const response = await fetch(customerEditId ? `/api/nodo/customers?id=${encodeURIComponent(customerEditId)}` : '/api/nodo/customers', { method: customerEditId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...customer, documentNumber: customer.documentNumber || null, vatCondition: customer.vatCondition || null, address: customer.address || null, email: customer.email || null, phone: customer.phone || null }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo guardar el cliente.')
      setCustomer({ name: '', documentType: 'CUIT', documentNumber: '', vatCondition: '', address: '', email: '', phone: '' })
      setCustomerEditId(null)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el cliente.')
    } finally { setBusy(false) }
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const response = await fetch(productEditId ? `/api/nodo/products?id=${encodeURIComponent(productEditId)}` : '/api/nodo/products', { method: productEditId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...product, unitPrice: Number(product.unitPrice), vatRatePercent: product.vatRatePercent === '' ? null : Number(product.vatRatePercent) }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo guardar el ítem.')
      setProduct({ description: '', unit: 'unidad', unitPrice: '', vatRatePercent: '' })
      setProductEditId(null)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el ítem.')
    } finally { setBusy(false) }
  }

  async function remove(path: 'customers' | 'products', id: string) {
    if (!confirm('¿Querés eliminar este registro de tu agenda?')) return
    setBusy(true); setError('')
    try {
      const response = await fetch(`/api/nodo/${path}?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo eliminar el registro.')
      if (path === 'customers' && customerEditId === id) {
        setCustomerEditId(null)
        setCustomer({ name: '', documentType: 'CUIT', documentNumber: '', vatCondition: '', address: '', email: '', phone: '' })
      }
      if (path === 'products' && productEditId === id) {
        setProductEditId(null)
        setProduct({ description: '', unit: 'unidad', unitPrice: '', vatRatePercent: '' })
      }
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo eliminar el registro.')
    } finally { setBusy(false) }
  }

  const inputClass = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#ED164F] focus:outline-none focus:ring-2 focus:ring-[#ED164F]/15'

  return <div className="space-y-5">
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {loading ? <p className="flex items-center gap-2 rounded-xl bg-white p-5 text-sm text-gray-500"><LoaderCircle className="animate-spin" size={16} />Cargando agenda…</p> : <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gray-950">Agenda de clientes</h2>
        <p className="mt-1 text-sm text-gray-500">Datos que cargaste para reutilizar al emitir. La información fiscal no se consulta ni valida automáticamente desde esta agenda.</p>
        <form onSubmit={saveCustomer} className="mt-5 grid gap-3 sm:grid-cols-2">
          {customerEditId && <p className="text-xs font-semibold text-sky-800 sm:col-span-2">Editando cliente guardado</p>}
          <label className="text-sm font-medium text-gray-700 sm:col-span-2">Nombre o razón social<input required maxLength={180} value={customer.name} onChange={event => setCustomer({ ...customer, name: event.target.value })} className={inputClass} /></label>
          <label className="text-sm font-medium text-gray-700">Documento<select value={customer.documentType} onChange={event => setCustomer({ ...customer, documentType: event.target.value })} className={inputClass}><option value="CUIT">CUIT</option><option value="CUIL">CUIL</option><option value="DNI">DNI</option><option value="CONSUMIDOR_FINAL">Consumidor final</option></select></label>
          <label className="text-sm font-medium text-gray-700">Número<input maxLength={20} value={customer.documentNumber} onChange={event => setCustomer({ ...customer, documentNumber: event.target.value })} className={inputClass} /></label>
          <label className="text-sm font-medium text-gray-700">Condición IVA<select value={customer.vatCondition} onChange={event => setCustomer({ ...customer, vatCondition: event.target.value })} className={inputClass}><option value="">Sin definir</option><option value="1">IVA Responsable Inscripto</option><option value="4">IVA Sujeto Exento</option><option value="5">Consumidor Final</option><option value="6">Monotributo</option><option value="13">Monotributo Social</option><option value="15">IVA No Alcanzado</option></select></label>
          <label className="text-sm font-medium text-gray-700">Domicilio<input maxLength={240} value={customer.address} onChange={event => setCustomer({ ...customer, address: event.target.value })} className={inputClass} /></label>
          <label className="text-sm font-medium text-gray-700">Email<input type="email" maxLength={254} value={customer.email} onChange={event => setCustomer({ ...customer, email: event.target.value })} className={inputClass} /></label>
          <label className="text-sm font-medium text-gray-700">Teléfono<input maxLength={40} value={customer.phone} onChange={event => setCustomer({ ...customer, phone: event.target.value })} className={inputClass} /></label>
          <button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#17151a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16} />{customerEditId ? 'Actualizar cliente' : 'Guardar cliente'}</button>
          {customerEditId && <button type="button" onClick={() => { setCustomerEditId(null); setCustomer({ name: '', documentType: 'CUIT', documentNumber: '', vatCondition: '', address: '', email: '', phone: '' }) }} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700">Cancelar edición</button>}
        </form>
        <ul className="mt-5 divide-y divide-gray-100">{customers.map(item => <li key={item.id} className="flex items-start gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-gray-900">{item.name}</p><p className="mt-0.5 text-xs text-gray-500">{[item.documentType, item.documentNumber, item.vatCondition].filter(Boolean).join(' · ') || 'Sin datos fiscales guardados'}</p></div><button type="button" aria-label={`Editar ${item.name}`} disabled={busy} onClick={() => { setCustomerEditId(item.id); setCustomer({ name: item.name, documentType: item.documentType || 'CUIT', documentNumber: item.documentNumber || '', vatCondition: item.vatCondition || '', address: item.address || '', email: item.email || '', phone: item.phone || '' }) }} className="rounded-lg p-2 text-gray-400 hover:bg-sky-50 hover:text-sky-700"><Pencil size={16} /></button><button type="button" aria-label={`Eliminar ${item.name}`} disabled={busy} onClick={() => void remove('customers', item.id)} className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={16} /></button></li>)}</ul>
        {!customers.length && <p className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">Todavía no guardaste clientes.</p>}
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gray-950">Productos y servicios</h2>
        <p className="mt-1 text-sm text-gray-500">Guardá descripciones, precios y alícuotas para reutilizarlos. Si el IVA queda sin definir, el ítem requiere revisión antes de facturar.</p>
        <form onSubmit={saveProduct} className="mt-5 grid gap-3 sm:grid-cols-2">
          {productEditId && <p className="text-xs font-semibold text-sky-800 sm:col-span-2">Editando ítem guardado</p>}
          <label className="text-sm font-medium text-gray-700 sm:col-span-2">Descripción<input required maxLength={240} value={product.description} onChange={event => setProduct({ ...product, description: event.target.value })} className={inputClass} /></label>
          <label className="text-sm font-medium text-gray-700">Unidad<input required maxLength={40} value={product.unit} onChange={event => setProduct({ ...product, unit: event.target.value })} className={inputClass} /></label>
          <label className="text-sm font-medium text-gray-700">Precio unitario sin IVA<input required type="number" min="0" step="0.01" value={product.unitPrice} onChange={event => setProduct({ ...product, unitPrice: event.target.value })} className={inputClass} /></label>
          <label className="text-sm font-medium text-gray-700 sm:col-span-2">IVA<select value={product.vatRatePercent} onChange={event => setProduct({ ...product, vatRatePercent: event.target.value })} className={inputClass}><option value="">Sin definir</option><option value="0">0%</option><option value="2.5">2,5%</option><option value="5">5%</option><option value="10.5">10,5%</option><option value="21">21%</option><option value="27">27%</option></select></label>
          <button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#17151a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16} />{productEditId ? 'Actualizar ítem' : 'Guardar ítem'}</button>
          {productEditId && <button type="button" onClick={() => { setProductEditId(null); setProduct({ description: '', unit: 'unidad', unitPrice: '', vatRatePercent: '' }) }} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700">Cancelar edición</button>}
        </form>
        <ul className="mt-5 divide-y divide-gray-100">{products.map(item => <li key={item.id} className="flex items-start gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-gray-900">{item.description}</p><p className="mt-0.5 text-xs text-gray-500">{item.unit} · ${Number(item.unitPrice).toLocaleString('es-AR', { minimumFractionDigits: 2 })} · IVA {item.vatRatePercent === null ? 'sin definir' : `${item.vatRatePercent}%`}</p></div><button type="button" aria-label={`Editar ${item.description}`} disabled={busy} onClick={() => { setProductEditId(item.id); setProduct({ description: item.description, unit: item.unit, unitPrice: item.unitPrice, vatRatePercent: item.vatRatePercent || '' }) }} className="rounded-lg p-2 text-gray-400 hover:bg-sky-50 hover:text-sky-700"><Pencil size={16} /></button><button type="button" aria-label={`Eliminar ${item.description}`} disabled={busy} onClick={() => void remove('products', item.id)} className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={16} /></button></li>)}</ul>
        {!products.length && <p className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">Todavía no guardaste productos o servicios.</p>}
      </section>
    </div>}
  </div>
}
