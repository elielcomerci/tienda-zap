'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Link2, LoaderCircle, RefreshCw, ShieldAlert, UserPlus, Users } from 'lucide-react'

type Customer = { id: string; name: string | null; email: string; phone: string | null; documentId: string | null }
type Tenant = { id: string; name: string; slug: string; status: string; assigned: boolean }
type Account = {
  id: string; userId: string; tenantId: string; tenantName: string; tenantSlug: string;
  status: string; createdAt: string; invoiceCount: number;
  customer: { name: string | null; email: string; phone: string | null; documentId: string | null }
}

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

export default function FiscalClientsAdminClient() {
  const [users, setUsers] = useState<Customer[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [userId, setUserId] = useState('')
  const [mode, setMode] = useState<'create' | 'connect'>('create')
  const [tenantId, setTenantId] = useState('')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)

  const availableTenants = useMemo(() => tenants.filter(tenant => !tenant.assigned), [tenants])
  const availableUsers = useMemo(() => users.filter(user => !accounts.some(account => account.userId === user.id)), [users, accounts])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/fiscal/clients', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar las cuentas fiscales.')
      setUsers(payload.users || [])
      setTenants(payload.tenants || [])
      setAccounts(payload.accounts || [])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las cuentas fiscales.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (mode === 'connect' && !availableTenants.some(tenant => tenant.id === tenantId)) {
      setTenantId(availableTenants[0]?.id || '')
    }
  }, [mode, availableTenants, tenantId])

  function selectUser(id: string) {
    setUserId(id)
    const selected = users.find(user => user.id === id)
    if (selected) {
      const base = selected.name || selected.email.split('@')[0]
      setName(base)
      if (!slugEdited) setSlug(slugify(base))
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin/fiscal/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, mode,
          ...(mode === 'create' ? { name: name.trim(), slug: slug.trim() } : { tenantId }),
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo vincular la cuenta.')
      setNotice(payload.message || 'Cuenta fiscal vinculada al cliente.')
      setUserId('')
      setTenantId('')
      setName('')
      setSlug('')
      setSlugEdited(false)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo vincular la cuenta.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-zap-magenta">Fiscal · Atención al cliente</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Clientes fiscales</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">Vinculá cada cliente de Tienda ZAP con su cuenta fiscal. La clave de soporte se cifra en el servidor; no se muestra ni se envía al navegador.</p>
        </div>
        <button onClick={() => void load()} disabled={loading || busy} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><ShieldAlert size={18} className="mt-0.5 shrink-0" />{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><UserPlus size={18} className="text-gray-500" /><h2 className="font-semibold text-gray-900">Vincular cliente</h2></div>
        <p className="mt-1 text-sm text-gray-500">Podés crear una cuenta fiscal nueva o conectar una cuenta existente del Worker. En ambos casos ZAP conserva una credencial cifrada para poder asistir al cliente.</p>
        <form onSubmit={event => void submit(event)} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">Cliente de Tienda ZAP
            <select required value={userId} onChange={event => selectUser(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-normal text-gray-900">
              <option value="">Seleccionar cliente…</option>
              {availableUsers.map(user => <option key={user.id} value={user.id}>{user.name || user.email} · {user.email}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">Acción
            <select value={mode} onChange={event => setMode(event.target.value as 'create' | 'connect')} className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-normal text-gray-900">
              <option value="create">Crear cuenta fiscal nueva</option>
              <option value="connect">Vincular cuenta existente del Worker</option>
            </select>
          </label>
          {mode === 'create' ? <>
            <label className="block text-sm font-medium text-gray-700">Nombre de cuenta
              <input required maxLength={120} value={name} onChange={event => { const value = event.target.value; setName(value); if (!slugEdited) setSlug(slugify(value)) }} className="mt-1.5 block w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal text-gray-900" placeholder="Empresa o comercio" />
            </label>
            <label className="block text-sm font-medium text-gray-700">Identificador
              <input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={60} value={slug} onChange={event => { setSlug(event.target.value); setSlugEdited(true) }} className="mt-1.5 block w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-sm font-normal text-gray-900" placeholder="empresa-comercio" />
            </label>
          </> : <label className="block text-sm font-medium text-gray-700 md:col-span-2">Cuenta del Worker sin asignar
            <select required value={tenantId} onChange={event => setTenantId(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-normal text-gray-900">
              <option value="">Seleccionar cuenta…</option>
              {availableTenants.map(tenant => <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.slug} · {tenant.status}</option>)}
            </select>
            {availableTenants.length === 0 && <span className="mt-1 block text-xs text-amber-700">No hay cuentas disponibles para vincular.</span>}
          </label>}
          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <button type="submit" disabled={busy || loading || !userId || (mode === 'connect' && !tenantId)} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Link2 size={16} />}
              {busy ? 'Vinculando…' : 'Vincular cuenta'}
            </button>
            <span className="text-xs text-gray-500">No se solicita ni se muestra el certificado privado en esta pantalla.</span>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2"><Users size={18} className="text-gray-500" /><h2 className="font-semibold text-gray-900">Cuentas asignadas</h2><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{accounts.length}</span></div>
        {loading ? <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Cargando cuentas…</div> : accounts.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">Todavía no hay clientes fiscales vinculados.</div> : <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="divide-y divide-gray-100">
            {accounts.map(account => <article key={account.id} className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900">{account.customer.name || account.customer.email}</h3>
                <p className="mt-1 text-sm text-gray-500">{account.customer.email}{account.customer.phone ? ` · ${account.customer.phone}` : ''}</p>
                <p className="mt-2 text-xs text-gray-500">Cuenta fiscal: {account.tenantName} · {account.tenantSlug}</p>
                <p className="mt-1 break-all font-mono text-[11px] text-gray-400">Tenant ID: {account.tenantId}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={account.status === 'ACTIVE' ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700' : 'rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700'}>{account.status === 'ACTIVE' ? 'Vinculada' : account.status}</span>
                <span className="text-sm text-gray-500">{account.invoiceCount} comprobantes</span>
                <Link href={`/admin/fiscal/clientes/${encodeURIComponent(account.id)}`} className="rounded-xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800">Abrir soporte</Link>
              </div>
            </article>)}
          </div>
        </div>}
      </section>
    </div>
  )
}
