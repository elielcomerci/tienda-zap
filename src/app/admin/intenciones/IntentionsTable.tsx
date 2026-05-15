'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { toggleIntentionActive, deleteIntention } from './actions'

export default function IntentionsTable({ intentions }: { intentions: any[] }) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleToggle = async (id: string, active: boolean) => {
    setLoading(id)
    await toggleIntentionActive(id, !active)
    setLoading(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este objetivo?')) return
    setLoading(id)
    await deleteIntention(id)
    setLoading(null)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="px-6 py-4 font-semibold">Orden</th>
            <th className="px-6 py-4 font-semibold">Objetivo</th>
            <th className="px-6 py-4 font-semibold">Productos</th>
            <th className="px-6 py-4 font-semibold">Media</th>
            <th className="px-6 py-4 font-semibold">Estado</th>
            <th className="px-6 py-4 font-semibold text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {intentions.map((intention) => (
            <tr key={intention.id} className="hover:bg-gray-50/50">
              <td className="px-6 py-4 font-medium text-gray-900">{intention.order}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{intention.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{intention.name}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{intention.slug}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  {intention._count.products}
                </span>
              </td>
              <td className="px-6 py-4 text-xs text-gray-500">
                {intention.mediaType === 'NONE' ? '-' : intention.mediaType}
              </td>
              <td className="px-6 py-4">
                <button
                  onClick={() => handleToggle(intention.id, intention.active)}
                  disabled={loading === intention.id}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                    intention.active 
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {intention.active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  {intention.active ? 'Activo' : 'Oculto'}
                </button>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/admin/intenciones/${intention.id}`}
                    className="p-2 text-gray-400 hover:text-[#ED2C71] transition-colors"
                  >
                    <Edit size={16} />
                  </Link>
                  <button
                    onClick={() => handleDelete(intention.id)}
                    disabled={loading === intention.id}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {intentions.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                No hay objetivos cargados todavía.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
