'use client'

import { useState, useTransition } from 'react'
import { Search, Phone, Mail, Check, Plus, X, UserPlus, ClipboardList, Edit3, History } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { updateClientNote } from '@/lib/actions/auth'
import { associateClient } from './vincular/actions'
import { createSellerLead, updateSellerLead, updateSellerLeadNote, updateSellerLeadStatus } from './actions'

type LeadStatus = 'NEW' | 'CONTACTED' | 'QUOTED' | 'WON' | 'LOST'

const leadStatusLabels: Record<LeadStatus, string> = {
  NEW: 'Nuevo',
  CONTACTED: 'Contactado',
  QUOTED: 'Cotizado',
  WON: 'Comprador',
  LOST: 'Perdido',
}

const leadStatusClasses: Record<LeadStatus, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  CONTACTED: 'bg-purple-100 text-purple-700',
  QUOTED: 'bg-amber-100 text-amber-700',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-gray-100 text-gray-600',
}

type ClientRow = {
  id: string
  name: string | null
  email: string
  phone: string | null
  sellerId: string | null
  operationalSellerId: string | null
  sellerNote: string | null
  createdAt: Date | string
  seller: { id: string; name: string | null; email: string } | null
  operationalSeller: { id: string; name: string | null; email: string } | null
  _count: { orders: number }
}

type LeadRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  businessName: string | null
  businessTypeId: string | null
  interest: string | null
  status: LeadStatus
  notes: string | null
  nextContactAt: Date | string | null
  createdAt: Date | string
  businessType: { name: string } | null
  convertedUser: { id: string; name: string | null; email: string } | null
  events: Array<{
    id: string
    type: string
    note: string | null
    createdAt: Date | string
  }>
}

type BusinessTypeOption = {
  id: string
  name: string
}

export default function ClientsTable({
  clients,
  leads,
  businessTypes,
  initialQuery,
  initialStatus,
  initialFollowUp,
}: {
  clients: ClientRow[]
  leads: LeadRow[]
  businessTypes: BusinessTypeOption[]
  initialQuery?: string
  initialStatus?: string
  initialFollowUp?: string
}) {
  const router = useRouter()
  const [q, setQ] = useState(initialQuery || '')
  const [modalOpen, setModalOpen] = useState(false)
  const [status, setStatus] = useState(initialStatus || '')
  const [followUp, setFollowUp] = useState(initialFollowUp || '')

  const applyFilters = (next?: { q?: string; status?: string; followUp?: string }) => {
    const params = new URLSearchParams()
    const query = next?.q ?? q
    const nextStatus = next?.status ?? status
    const nextFollowUp = next?.followUp ?? followUp

    if (query.trim()) params.set('q', query.trim())
    if (nextStatus) params.set('status', nextStatus)
    if (nextFollowUp) params.set('followUp', nextFollowUp)

    router.push(params.toString() ? `/seller/clientes?${params.toString()}` : '/seller/clientes')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    applyFilters()
  }

  const clearFilters = () => {
    setQ('')
    setStatus('')
    setFollowUp('')
    router.push('/seller/clientes')
  }

  const dueLeads = leads.filter((lead) => lead.nextContactAt && new Date(lead.nextContactAt) <= new Date() && !['WON', 'LOST'].includes(lead.status)).length

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1 lg:w-96">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, email, telefono o negocio..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <button type="submit" className="rounded-xl bg-gray-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-black">
            Buscar
          </button>
        </form>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="btn-primary inline-flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Agregar cliente
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            applyFilters({ status: event.target.value })
          }}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700"
        >
          <option value="">Todos los estados</option>
          {Object.entries(leadStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={followUp}
          onChange={(event) => {
            setFollowUp(event.target.value)
            applyFilters({ followUp: event.target.value })
          }}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700"
        >
          <option value="">Todas las acciones</option>
          <option value="due">Acciones vencidas</option>
          <option value="none">Sin proxima accion</option>
        </select>
        <button type="button" onClick={clearFilters} className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100">
          Limpiar
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Prospectos" value={leads.length} />
        <MetricCard label="Clientes registrados" value={clients.length} />
        <MetricCard label="Acciones vencidas" value={dueLeads} />
      </div>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-gray-900">Prospectos</h2>
            <p className="text-xs text-gray-500">Contactos cargados manualmente o captados por campañas.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Contacto</th>
                <th className="px-6 py-4 font-semibold">Interes</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                <th className="px-6 py-4 font-semibold">Notas</th>
                <th className="px-6 py-4 font-semibold">Proxima accion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Todavia no hay prospectos cargados.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => <LeadTableRow key={lead.id} lead={lead} businessTypes={businessTypes} />)
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-gray-900">Clientes registrados</h2>
            <p className="text-xs text-gray-500">Usuarios asociados a tu cartera comercial.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Contacto</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                <th className="px-6 py-4 font-semibold">Notas</th>
                <th className="px-6 py-4 font-semibold text-right">Ordenes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No tenes clientes registrados que coincidan con la busqueda.
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  const hasOrders = client._count.orders > 0

                  return (
                    <tr key={client.id} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{client.name || 'Sin nombre'}</p>
                        <p className="text-xs text-gray-400">Registrado el {formatDate(client.createdAt)}</p>
                        <div className="mt-2 space-y-0.5 text-xs text-gray-500">
                          <p>Titular: {client.seller?.name || client.seller?.email || 'Sin asignar'}</p>
                          {client.operationalSeller && (
                            <p>Heredero operativo: {client.operationalSeller.name || client.operationalSeller.email}</p>
                          )}
                        </div>
                      </td>
                      <td className="space-y-1 px-6 py-4">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Mail size={14} className="text-gray-400" />
                          <span className="text-sm">{client.email}</span>
                        </div>
                        {client.phone && (
                          <WhatsappLink phone={client.phone} />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${hasOrders ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {hasOrders ? 'Activo' : 'Sin compras'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <ClientNoteEditor clientId={client.id} initialNote={client.sellerNote || ''} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-gray-900">{client._count.orders}</span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <AddClientModal businessTypes={businessTypes} onClose={() => setModalOpen(false)} />
      )}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-gray-900">{value}</p>
    </div>
  )
}

function LeadTableRow({ lead, businessTypes }: { lead: LeadRow; businessTypes: BusinessTypeOption[] }) {
  const [isPending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const latestEvent = lead.events[0]

  return (
    <>
      <tr className="transition-colors hover:bg-gray-50/50">
        <td className="px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-gray-900">{lead.name}</p>
              {lead.businessName && <p className="text-xs text-gray-500">{lead.businessName}</p>}
            </div>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-[#ED2C71]"
              title="Editar prospecto"
            >
              <Edit3 size={15} />
            </button>
          </div>
          <div className="mt-2 space-y-1">
            {lead.email && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Mail size={13} className="text-gray-400" />
                {lead.email}
              </div>
            )}
            {lead.phone && <WhatsappLink phone={lead.phone} />}
          </div>
        </td>
        <td className="px-6 py-4">
          <p className="font-medium text-gray-900">{lead.interest || 'Sin interes cargado'}</p>
          <p className="mt-1 text-xs text-gray-500">{lead.businessType?.name || 'Rubro sin definir'}</p>
          {lead.convertedUser && (
            <p className="mt-2 rounded-lg bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
              Vinculado a {lead.convertedUser.name || lead.convertedUser.email}
            </p>
          )}
          {latestEvent && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
              <History size={13} />
              {eventLabel(latestEvent.type)} · {formatDate(latestEvent.createdAt)}
            </p>
          )}
        </td>
        <td className="px-6 py-4">
          <select
            value={lead.status}
            disabled={isPending}
            onChange={(event) => {
              const status = event.target.value as LeadStatus
              startTransition(async () => {
                await updateSellerLeadStatus(lead.id, status)
              })
            }}
            className={`rounded-full border-0 px-3 py-1 text-xs font-bold outline-none ring-1 ring-inset ring-black/5 ${leadStatusClasses[lead.status]}`}
          >
            {Object.entries(leadStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </td>
        <td className="px-6 py-4">
          <LeadNoteEditor leadId={lead.id} initialNote={lead.notes || ''} />
        </td>
        <td className="px-6 py-4 text-sm text-gray-500">
          <span className={isLeadDue(lead) ? 'font-bold text-red-600' : ''}>
            {lead.nextContactAt ? formatDate(lead.nextContactAt) : 'Sin fecha'}
          </span>
          {lead.events.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-semibold text-gray-400 hover:text-gray-700">
                Historial
              </summary>
              <div className="mt-2 space-y-2">
                {lead.events.map((event) => (
                  <div key={event.id} className="rounded-lg bg-gray-50 p-2 text-xs">
                    <p className="font-semibold text-gray-700">{eventLabel(event.type)}</p>
                    {event.note && <p className="text-gray-500">{event.note}</p>}
                    <p className="text-gray-400">{formatDate(event.createdAt)}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </td>
      </tr>

      {editOpen && (
        <tr>
          <td colSpan={5} className="p-0">
            <EditLeadModal
              lead={lead}
              businessTypes={businessTypes}
              onClose={() => setEditOpen(false)}
            />
          </td>
        </tr>
      )}
    </>
  )
}

function AddClientModal({
  businessTypes,
  onClose,
}: {
  businessTypes: BusinessTypeOption[]
  onClose: () => void
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'lead' | 'existing'>('lead')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleLeadSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setError(null)
    setMessage(null)

    startTransition(async () => {
      const result = await createSellerLead(formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      setMessage('Prospecto cargado en tu cartera.')
      router.refresh()
      onClose()
    })
  }

  const handleExistingSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const emailOrDocument = String(formData.get('emailOrDocument') || '')
    setError(null)
    setMessage(null)

    startTransition(async () => {
      const result = await associateClient(emailOrDocument)
      if (result?.error) {
        setError(result.error)
        return
      }
      setMessage('Cliente vinculado a tu cartera.')
      router.refresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/50 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="text-xl font-black text-gray-900">Agregar cliente</h2>
            <p className="mt-1 text-sm text-gray-500">Carga un prospecto o vincula un usuario ya registrado.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-gray-100 px-5 pt-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setMode('lead')}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${mode === 'lead' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500'}`}
            >
              <ClipboardList size={16} /> Prospecto nuevo
            </button>
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${mode === 'existing' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500'}`}
            >
              <UserPlus size={16} /> Usuario existente
            </button>
          </div>
        </div>

        <div className="p-5">
          {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
          {message && <div className="mb-4 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-700">{message}</div>}

          {mode === 'lead' ? (
            <form onSubmit={handleLeadSubmit} className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre">
                <input name="name" required className="input" placeholder="Juan Perez" />
              </Field>
              <Field label="WhatsApp">
                <input name="phone" required className="input" placeholder="223..." />
              </Field>
              <Field label="Email">
                <input name="email" type="email" className="input" placeholder="cliente@empresa.com" />
              </Field>
              <Field label="Negocio">
                <input name="businessName" className="input" placeholder="Nombre del local o marca" />
              </Field>
              <Field label="Rubro">
                <select name="businessTypeId" className="input">
                  <option value="">Sin definir</option>
                  {businessTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Proxima accion">
                <input name="nextContactAt" type="date" className="input" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Interes">
                  <input name="interest" className="input" placeholder="Ej: vidriera, tarjetas, carteleria..." />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Nota inicial">
                  <textarea name="notes" rows={3} className="input resize-none" placeholder="Contexto, oportunidad o detalle del contacto..." />
                </Field>
              </div>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={isPending} className="btn-primary">
                  {isPending ? 'Guardando...' : 'Guardar prospecto'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleExistingSubmit} className="space-y-4">
              <Field label="Email o DNI/CUIT del usuario">
                <input name="emailOrDocument" required className="input" placeholder="cliente@empresa.com o 20345678910" />
              </Field>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={isPending} className="btn-primary">
                  {isPending ? 'Vinculando...' : 'Vincular usuario'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function EditLeadModal({
  lead,
  businessTypes,
  onClose,
}: {
  lead: LeadRow
  businessTypes: BusinessTypeOption[]
  onClose: () => void
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setError(null)

    startTransition(async () => {
      const result = await updateSellerLead(lead.id, formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/50 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="text-xl font-black text-gray-900">Editar prospecto</h2>
            <p className="mt-1 text-sm text-gray-500">Actualiza datos, estado y proxima accion.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 p-5 sm:grid-cols-2">
          {error && <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 sm:col-span-2">{error}</div>}
          <Field label="Nombre">
            <input name="name" required defaultValue={lead.name} className="input" />
          </Field>
          <Field label="WhatsApp">
            <input name="phone" required defaultValue={lead.phone || ''} className="input" />
          </Field>
          <Field label="Email">
            <input name="email" type="email" defaultValue={lead.email || ''} className="input" />
          </Field>
          <Field label="Negocio">
            <input name="businessName" defaultValue={lead.businessName || ''} className="input" />
          </Field>
          <Field label="Rubro">
            <select name="businessTypeId" defaultValue={lead.businessTypeId || ''} className="input">
              <option value="">Sin definir</option>
              {businessTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Estado">
            <select name="status" defaultValue={lead.status} className="input">
              {Object.entries(leadStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Proxima accion">
            <input name="nextContactAt" type="date" defaultValue={dateInputValue(lead.nextContactAt)} className="input" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Interes">
              <input name="interest" defaultValue={lead.interest || ''} className="input" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Notas">
              <textarea name="notes" rows={3} defaultValue={lead.notes || ''} className="input resize-none" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  )
}

function ClientNoteEditor({ clientId, initialNote }: { clientId: string, initialNote: string }) {
  const [note, setNote] = useState(initialNote)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleBlur = () => {
    if (note === initialNote) return
    startTransition(async () => {
      await updateClientNote(clientId, note || null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="relative">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={handleBlur}
        placeholder="Anotar detalles..."
        rows={2}
        disabled={isPending}
        className="w-full min-w-[150px] resize-none rounded-lg border border-gray-200 bg-gray-50/50 p-2 text-xs text-gray-700 outline-none focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500"
      />
      {saved && <Check size={14} className="absolute right-2 top-2 text-green-500" />}
    </div>
  )
}

function LeadNoteEditor({ leadId, initialNote }: { leadId: string, initialNote: string }) {
  const [note, setNote] = useState(initialNote)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleBlur = () => {
    if (note === initialNote) return
    startTransition(async () => {
      await updateSellerLeadNote(leadId, note || null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="relative">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={handleBlur}
        placeholder="Seguimiento..."
        rows={2}
        disabled={isPending}
        className="w-full min-w-[150px] resize-none rounded-lg border border-gray-200 bg-gray-50/50 p-2 text-xs text-gray-700 outline-none focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500"
      />
      {saved && <Check size={14} className="absolute right-2 top-2 text-green-500" />}
    </div>
  )
}

function WhatsappLink({ phone }: { phone: string }) {
  return (
    <div className="flex items-center gap-1.5 text-gray-600">
      <Phone size={14} className="text-gray-400" />
      <a href={`https://wa.me/${phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-sm text-green-600 hover:underline">
        {phone}
      </a>
    </div>
  )
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString('es-AR')
}

function dateInputValue(value: Date | string | null) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

function isLeadDue(lead: LeadRow) {
  if (!lead.nextContactAt || lead.status === 'WON' || lead.status === 'LOST') return false
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return new Date(lead.nextContactAt) <= today
}

function eventLabel(type: string) {
  const labels: Record<string, string> = {
    CREATED: 'Creado',
    UPDATED: 'Actualizado',
    STATUS_CHANGED: 'Estado cambiado',
    NOTE_UPDATED: 'Nota editada',
    CONVERTED: 'Convertido',
  }

  return labels[type] || type
}
