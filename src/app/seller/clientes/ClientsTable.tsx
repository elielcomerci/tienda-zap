'use client'

import { useState, useTransition } from 'react'
import { Search, Phone, Mail, FileText, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { updateClientNote } from '@/lib/actions/auth'

export default function ClientsTable({ clients, initialQuery }: { clients: any[], initialQuery?: string }) {
  const router = useRouter()
  const [q, setQ] = useState(initialQuery || '')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (q.trim()) {
      router.push(`/seller/clientes?q=${encodeURIComponent(q)}`)
    } else {
      router.push('/seller/clientes')
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
        </div>
        <button type="submit" className="py-2 px-6 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-black transition-colors">
          Buscar
        </button>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Contacto</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                <th className="px-6 py-4 font-semibold">Notas</th>
                <th className="px-6 py-4 font-semibold text-right">Órdenes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No tenés clientes en tu cartera que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  const hasOrders = client._count.orders > 0

                  return (
                    <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{client.name || 'Sin nombre'}</p>
                        <p className="text-xs text-gray-400">Registrado el {new Date(client.createdAt).toLocaleDateString('es-AR')}</p>
                      </td>
                      <td className="px-6 py-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Mail size={14} className="text-gray-400" />
                          <span className="text-sm">{client.email}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Phone size={14} className="text-gray-400" />
                            <a href={`https://wa.me/${client.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-sm text-green-600 hover:underline">
                              {client.phone}
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${hasOrders ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {hasOrders ? 'Activo' : 'Sin Compras'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <NoteEditor clientId={client.id} initialNote={client.sellerNote || ''} />
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
      </div>
    </div>
  )
}

function NoteEditor({ clientId, initialNote }: { clientId: string, initialNote: string }) {
  const [note, setNote] = useState(initialNote)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleBlur = () => {
    if (note === initialNote) return
    startTransition(async () => {
      try {
        await updateClientNote(clientId, note || null)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch (error) {
        console.error(error)
      }
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
        className="w-full min-w-[150px] resize-none rounded-lg border border-gray-200 bg-gray-50/50 p-2 text-xs text-gray-700 outline-none focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500"
      />
      {saved && <Check size={14} className="absolute right-2 top-2 text-green-500" />}
    </div>
  )
}
