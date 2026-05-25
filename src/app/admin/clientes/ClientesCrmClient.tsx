'use client'

import { useState } from 'react'
import { Building2, Mail, Phone, Plus, Save, UserRound, X } from 'lucide-react'
import { saveBusinessAccount, saveBusinessContact } from './actions'

type BusinessAccountStatus = 'PROSPECT' | 'ACTIVE' | 'INACTIVE' | 'LOST'

type Option = {
  id: string
  name: string | null
  email?: string | null
}

type Account = {
  id: string
  name: string
  legalName: string | null
  taxId: string | null
  status: BusinessAccountStatus
  source: string | null
  tags: string[]
  notes: string | null
  nextActionAt: Date | string | null
  businessTypeId: string | null
  assignedSellerId: string | null
  operationalSellerId: string | null
  userId: string | null
  businessType: { name: string } | null
  assignedSeller: Option | null
  operationalSeller: Option | null
  user: Option | null
  contacts: Array<{
    id: string
    firstName: string
    lastName: string | null
    role: string | null
    email: string | null
    phone: string | null
    whatsapp: string | null
    isPrimary: boolean
    notes: string | null
  }>
  _count: { coupons: number }
}

const statusLabels: Record<BusinessAccountStatus, string> = {
  PROSPECT: 'Prospecto',
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  LOST: 'Perdido',
}

const statusStyles: Record<BusinessAccountStatus, string> = {
  PROSPECT: 'bg-amber-50 text-amber-700 border-amber-100',
  ACTIVE: 'bg-green-50 text-green-700 border-green-100',
  INACTIVE: 'bg-gray-50 text-gray-600 border-gray-200',
  LOST: 'bg-red-50 text-red-700 border-red-100',
}

function formatDateInput(value: Date | string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export default function ClientesCrmClient({
  accounts,
  businessTypes,
  sellers,
  users,
}: {
  accounts: Account[]
  businessTypes: Array<{ id: string; name: string }>
  sellers: Option[]
  users: Option[]
}) {
  const [accountDraft, setAccountDraft] = useState<Account | null>(null)
  const [contactAccount, setContactAccount] = useState<Account | null>(null)
  const [contactDraft, setContactDraft] = useState<Account['contacts'][number] | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-950">Clientes CRM</h1>
          <p className="mt-1 text-sm text-gray-500">
            Cuentas comerciales y contactos para campañas, cupones y seguimiento vendedor.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAccountDraft({} as Account)}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800"
        >
          <Plus size={17} />
          Nueva cuenta
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-black uppercase tracking-[0.14em] text-gray-500">
              <tr>
                <th className="px-4 py-3">Negocio</th>
                <th className="px-4 py-3">Contacto principal</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Asesor</th>
                <th className="px-4 py-3">Cupones</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    Todavia no hay cuentas comerciales cargadas.
                  </td>
                </tr>
              ) : (
                accounts.map((account) => {
                  const primaryContact = account.contacts.find((contact) => contact.isPrimary) || account.contacts[0]
                  return (
                    <tr key={account.id} className="align-top hover:bg-gray-50/70">
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                            <Building2 size={18} />
                          </div>
                          <div>
                            <p className="font-black text-gray-950">{account.name}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {account.businessType?.name || account.legalName || 'Sin rubro asignado'}
                            </p>
                            {account.tags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {account.tags.map((tag) => (
                                  <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {primaryContact ? (
                          <div className="space-y-1">
                            <p className="font-bold text-gray-900">
                              {[primaryContact.firstName, primaryContact.lastName].filter(Boolean).join(' ')}
                            </p>
                            {primaryContact.email && (
                              <p className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Mail size={13} />
                                {primaryContact.email}
                              </p>
                            )}
                            {(primaryContact.whatsapp || primaryContact.phone) && (
                              <p className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Phone size={13} />
                                {primaryContact.whatsapp || primaryContact.phone}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Sin contactos</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${statusStyles[account.status]}`}>
                          {statusLabels[account.status]}
                        </span>
                        {account.nextActionAt && (
                          <p className="mt-2 text-xs text-gray-500">
                            Proxima accion: {new Date(account.nextActionAt).toLocaleDateString('es-AR')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-600">
                        <p className="font-bold">{account.assignedSeller?.name || account.assignedSeller?.email || 'Sin asesor'}</p>
                        {account.operationalSeller && (
                          <p className="mt-1 text-gray-400">Operativo: {account.operationalSeller.name || account.operationalSeller.email}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 font-black text-gray-900">{account._count.coupons}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setContactAccount(account)
                              setContactDraft(null)
                            }}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                          >
                            Contacto
                          </button>
                          <button
                            type="button"
                            onClick={() => setAccountDraft(account)}
                            className="rounded-lg bg-gray-950 px-3 py-2 text-xs font-bold text-white hover:bg-gray-800"
                          >
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {accountDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form action={saveBusinessAccount} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <h2 className="text-lg font-black text-gray-950">{accountDraft.id ? 'Editar cuenta' : 'Nueva cuenta'}</h2>
              <button type="button" onClick={() => setAccountDraft(null)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <input type="hidden" name="id" value={accountDraft.id || ''} />
              <label className="block sm:col-span-2">
                <span className="label">Nombre comercial</span>
                <input name="name" defaultValue={accountDraft.name || ''} className="input" required />
              </label>
              <label className="block">
                <span className="label">Razon social</span>
                <input name="legalName" defaultValue={accountDraft.legalName || ''} className="input" />
              </label>
              <label className="block">
                <span className="label">CUIT / Identificacion</span>
                <input name="taxId" defaultValue={accountDraft.taxId || ''} className="input" />
              </label>
              <label className="block">
                <span className="label">Rubro</span>
                <select name="businessTypeId" defaultValue={accountDraft.businessTypeId || ''} className="input">
                  <option value="">Sin rubro</option>
                  {businessTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Estado</span>
                <select name="status" defaultValue={accountDraft.status || 'PROSPECT'} className="input">
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Asesor titular</span>
                <select name="assignedSellerId" defaultValue={accountDraft.assignedSellerId || ''} className="input">
                  <option value="">Sin asesor</option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>{seller.name || seller.email}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Asesor operativo</span>
                <select name="operationalSellerId" defaultValue={accountDraft.operationalSellerId || ''} className="input">
                  <option value="">Sin asesor operativo</option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>{seller.name || seller.email}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Usuario vinculado</span>
                <select name="userId" defaultValue={accountDraft.userId || ''} className="input">
                  <option value="">Sin usuario</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name || user.email}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Proxima accion</span>
                <input type="date" name="nextActionAt" defaultValue={formatDateInput(accountDraft.nextActionAt)} className="input" />
              </label>
              <label className="block">
                <span className="label">Origen</span>
                <input name="source" defaultValue={accountDraft.source || ''} className="input" placeholder="Referido, campaña, mostrador" />
              </label>
              <label className="block">
                <span className="label">Tags</span>
                <input name="tags" defaultValue={accountDraft.tags?.join(', ') || ''} className="input" placeholder="pizzeria, recurrente" />
              </label>
              <label className="block sm:col-span-2">
                <span className="label">Notas internas</span>
                <textarea name="notes" defaultValue={accountDraft.notes || ''} className="input min-h-28" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 p-5">
              <button type="button" onClick={() => setAccountDraft(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700">
                Cancelar
              </button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-sm font-bold text-white">
                <Save size={16} />
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {contactAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form action={saveBusinessContact} className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <div>
                <h2 className="text-lg font-black text-gray-950">Contacto de {contactAccount.name}</h2>
                <p className="text-xs text-gray-500">Cargalo para personalizar cupones y seguimiento comercial.</p>
              </div>
              <button type="button" onClick={() => setContactAccount(null)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <input type="hidden" name="id" value={contactDraft?.id || ''} />
              <input type="hidden" name="accountId" value={contactAccount.id} />
              {contactAccount.contacts.length > 0 && !contactDraft && (
                <div className="sm:col-span-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-gray-500">Contactos actuales</p>
                  <div className="flex flex-wrap gap-2">
                    {contactAccount.contacts.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => setContactDraft(contact)}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700"
                      >
                        <UserRound size={13} />
                        {contact.firstName} {contact.lastName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <label className="block">
                <span className="label">Nombre</span>
                <input name="firstName" defaultValue={contactDraft?.firstName || ''} className="input" required />
              </label>
              <label className="block">
                <span className="label">Apellido</span>
                <input name="lastName" defaultValue={contactDraft?.lastName || ''} className="input" />
              </label>
              <label className="block">
                <span className="label">Rol</span>
                <input name="role" defaultValue={contactDraft?.role || ''} className="input" placeholder="Dueño, compras, marketing" />
              </label>
              <label className="block">
                <span className="label">Email</span>
                <input type="email" name="email" defaultValue={contactDraft?.email || ''} className="input" />
              </label>
              <label className="block">
                <span className="label">Telefono</span>
                <input name="phone" defaultValue={contactDraft?.phone || ''} className="input" />
              </label>
              <label className="block">
                <span className="label">WhatsApp</span>
                <input name="whatsapp" defaultValue={contactDraft?.whatsapp || ''} className="input" />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-gray-200 p-3 text-sm font-bold text-gray-700 sm:col-span-2">
                <input type="checkbox" name="isPrimary" defaultChecked={contactDraft?.isPrimary || contactAccount.contacts.length === 0} />
                Contacto principal del negocio
              </label>
              <label className="block sm:col-span-2">
                <span className="label">Notas</span>
                <textarea name="notes" defaultValue={contactDraft?.notes || ''} className="input min-h-24" />
              </label>
            </div>
            <div className="flex justify-between gap-2 border-t border-gray-100 p-5">
              <button type="button" onClick={() => setContactDraft(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700">
                Nuevo contacto
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setContactAccount(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700">
                  Cerrar
                </button>
                <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-sm font-bold text-white">
                  <Save size={16} />
                  Guardar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
