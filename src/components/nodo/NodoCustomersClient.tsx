'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

type SavedCustomer = { id: string; name: string; documentType: string | null; documentNumber: string | null; vatCondition: string | null; address: string | null; email: string | null; phone: string | null }
type CustomerForm = { name: string; documentType: string; documentNumber: string; vatCondition: string; address: string; email: string; phone: string }

const emptyCustomer: CustomerForm = { name: '', documentType: 'CUIT', documentNumber: '', vatCondition: '', address: '', email: '', phone: '' }
const inputClass = 'mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-[#ED164F] focus:outline-none focus:ring-2 focus:ring-[#ED164F]/15'

export default function NodoCustomersClient({ accountId }: { accountId: string }) {
  const router = useRouter()
  const api = useCallback((path: string) => `${path}${path.includes('?') ? '&' : '?'}accountId=${encodeURIComponent(accountId)}`, [accountId])
  const [customers, setCustomers] = useState<SavedCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<SavedCustomer | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [customer, setCustomer] = useState<CustomerForm>(emptyCustomer)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(api('/api/nodo/customers'), { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar los clientes.')
      setCustomers(Array.isArray(payload.customers) ? payload.customers : [])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los clientes.')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => { void load() }, [load])

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es-AR')
    if (!normalizedQuery) return customers
    return customers.filter(item => [item.name, item.documentNumber].some(value => value?.toLocaleLowerCase('es-AR').includes(normalizedQuery)))
  }, [customers, query])

  function startCreate() {
    setEditing(null)
    setCustomer(emptyCustomer)
    setFormOpen(true)
    setError('')
  }

  function startEdit(item: SavedCustomer) {
    setEditing(item)
    setCustomer({ name: item.name, documentType: item.documentType || 'CUIT', documentNumber: item.documentNumber || '', vatCondition: item.vatCondition || '', address: item.address || '', email: item.email || '', phone: item.phone || '' })
    setFormOpen(true)
    setError('')
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
    setCustomer(emptyCustomer)
  }

  async function saveCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch(api(editing ? `/api/nodo/customers?id=${encodeURIComponent(editing.id)}` : '/api/nodo/customers'), {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...customer, documentNumber: customer.documentNumber || null, vatCondition: customer.vatCondition || null, address: customer.address || null, email: customer.email || null, phone: customer.phone || null }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo guardar el cliente.')
      const returnToEmission = new URLSearchParams(window.location.search).get('returnTo') === 'emit'
      if (returnToEmission && typeof payload.customer?.id === 'string') {
        router.push(`/perfil/nodo/emitir?clienteId=${encodeURIComponent(payload.customer.id)}`)
        return
      }
      closeForm()
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el cliente.')
    } finally {
      setBusy(false)
    }
  }

  async function removeCustomer(item: SavedCustomer) {
    if (!confirm(`¿Querés eliminar a ${item.name} de tu agenda?`)) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(api(`/api/nodo/customers?id=${encodeURIComponent(item.id)}`), { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo eliminar el cliente.')
      if (editing?.id === item.id) closeForm()
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo eliminar el cliente.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="space-y-5">
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

    {formOpen && <section aria-labelledby="customer-form-title" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div><h2 id="customer-form-title" className="text-lg font-semibold text-gray-950">{editing ? 'Editar cliente' : 'Nuevo cliente'}</h2><p className="mt-1 text-sm text-gray-500">Guardá los datos del receptor para reutilizarlos al emitir.</p></div>
        <button type="button" onClick={closeForm} aria-label="Cerrar formulario" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X size={18} /></button>
      </div>
      <form onSubmit={saveCustomer} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-700 sm:col-span-2">Nombre o razón social<input required maxLength={180} value={customer.name} onChange={event => setCustomer({ ...customer, name: event.target.value })} className={inputClass} /></label>
        <label className="text-sm font-medium text-gray-700">Tipo de documento<select value={customer.documentType} onChange={event => setCustomer({ ...customer, documentType: event.target.value, documentNumber: event.target.value === 'CONSUMIDOR_FINAL' ? '' : customer.documentNumber })} className={inputClass}><option value="CUIT">CUIT</option><option value="CUIL">CUIL</option><option value="DNI">DNI</option><option value="CONSUMIDOR_FINAL">Consumidor final</option></select></label>
        <label className="text-sm font-medium text-gray-700">Número de documento<input required={customer.documentType !== 'CONSUMIDOR_FINAL'} maxLength={20} value={customer.documentNumber} onChange={event => setCustomer({ ...customer, documentNumber: event.target.value })} className={inputClass} /></label>
        <label className="text-sm font-medium text-gray-700">Condición frente al IVA<select value={customer.vatCondition} onChange={event => setCustomer({ ...customer, vatCondition: event.target.value })} className={inputClass}><option value="">Sin definir</option><option value="1">IVA Responsable Inscripto</option><option value="4">IVA Sujeto Exento</option><option value="5">Consumidor Final</option><option value="6">Monotributo</option><option value="13">Monotributo Social</option><option value="15">IVA No Alcanzado</option></select></label>
        <label className="text-sm font-medium text-gray-700">Domicilio<input maxLength={240} value={customer.address} onChange={event => setCustomer({ ...customer, address: event.target.value })} className={inputClass} /></label>
        <label className="text-sm font-medium text-gray-700">Email<input type="email" maxLength={254} value={customer.email} onChange={event => setCustomer({ ...customer, email: event.target.value })} className={inputClass} /></label>
        <label className="text-sm font-medium text-gray-700">Teléfono<input maxLength={40} value={customer.phone} onChange={event => setCustomer({ ...customer, phone: event.target.value })} className={inputClass} /></label>
        <div className="flex flex-wrap gap-2 sm:col-span-2"><button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#17151a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16} />{editing ? 'Guardar cambios' : 'Guardar cliente'}</button><button type="button" onClick={closeForm} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700">Cancelar</button></div>
      </form>
    </section>}

    {!formOpen && customers.length > 0 && <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-600">{customers.length} {customers.length === 1 ? 'cliente guardado' : 'clientes guardados'}</p>
      <button type="button" onClick={startCreate} className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-[#17151a] px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} />Agregar cliente</button>
    </div>}
    {!formOpen && customers.length > 0 && <label className="relative block max-w-lg"><span className="sr-only">Buscar clientes por nombre o CUIT</span><Search size={17} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nombre o CUIT" className={`${inputClass} pl-10`} /></label>}
    {!loading && query && filteredCustomers.length === 0 && <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">No hay clientes que coincidan con la búsqueda.</p>}
    {loading ? <p className="flex items-center gap-2 rounded-xl bg-gray-50 p-5 text-sm text-gray-500"><LoaderCircle className="animate-spin" size={16} />Cargando clientes…</p> : filteredCustomers.length ? <ul className="divide-y divide-gray-100">{filteredCustomers.map(item => <li key={item.id} className="flex items-start gap-3 py-4"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-gray-900">{item.name}</p><p className="mt-1 text-xs text-gray-500">{[item.documentType, item.documentNumber, item.vatCondition].filter(Boolean).join(' · ') || 'Sin datos del documento o condición fiscal'}</p>{item.email && <p className="mt-1 truncate text-xs text-gray-500">{item.email}</p>}</div><button type="button" aria-label={`Editar ${item.name}`} disabled={busy} onClick={() => startEdit(item)} className="rounded-lg p-2 text-gray-500 hover:bg-sky-50 hover:text-sky-700"><Pencil size={16} /></button><button type="button" aria-label={`Eliminar ${item.name}`} disabled={busy} onClick={() => void removeCustomer(item)} className="rounded-lg p-2 text-gray-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={16} /></button></li>)}</ul> : !query && !formOpen && <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8"><h2 className="text-lg font-semibold text-gray-950">Tu agenda empieza acá.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">Todavía no hay clientes guardados. Agregá el primero para tener sus datos listos cuando necesites facturar.</p><button type="button" onClick={startCreate} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#17151a] px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} />Agregar primer cliente</button></div>}
  </div>
}
