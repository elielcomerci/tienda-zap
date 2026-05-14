'use client'

import { useState } from 'react'
import { Search, ShieldAlert, ShieldCheck, UserCheck, UserX, Percent } from 'lucide-react'
import { setRole, toggleBan, updateCommissionRate } from './actions'
import { useRouter } from 'next/navigation'

export default function UsersClientTable({ users, initialQuery }: { users: any[], initialQuery?: string }) {
  const router = useRouter()
  const [q, setQ] = useState(initialQuery || '')
  const [loading, setLoading] = useState<string | null>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (q.trim()) {
      router.push(`/admin/usuarios?q=${encodeURIComponent(q)}`)
    } else {
      router.push('/admin/usuarios')
    }
  }

  const handleRoleChange = async (userId: string, currentRole: string) => {
    setLoading(userId)
    const newRole = currentRole === 'CUSTOMER' ? 'SELLER' : 'CUSTOMER'
    await setRole(userId, newRole)
    setLoading(null)
  }

  const handleBanToggle = async (userId: string, isBanned: boolean) => {
    if (!confirm(`¿Estás seguro de ${isBanned ? 'desbanear' : 'banear'} a este usuario?`)) return
    setLoading(userId)
    await toggleBan(userId, !isBanned)
    setLoading(null)
  }

  const handleCommissionChange = async (userId: string, currentRate: number) => {
    const rate = prompt(`Ingresá el nuevo porcentaje de comisión para este vendedor (actual: ${currentRate}%):`, currentRate.toString())
    if (!rate) return
    const parsedRate = parseFloat(rate)
    if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      alert('Porcentaje inválido.')
      return
    }
    setLoading(userId)
    await updateCommissionRate(userId, parsedRate)
    setLoading(null)
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
            placeholder="Buscar por nombre, email o DNI..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
        </div>
        <button type="submit" className="btn-primary py-2 px-4 text-sm">
          Buscar
        </button>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Usuario</th>
                <th className="px-6 py-4 font-semibold">Rol</th>
                <th className="px-6 py-4 font-semibold">Métricas</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No se encontraron usuarios.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{user.name || 'Sin nombre'}</p>
                      <p className="text-gray-500">{user.email}</p>
                      {user.documentId && <p className="text-xs text-gray-400 mt-0.5">DNI/CUIT: {user.documentId}</p>}
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'ADMIN' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-800">
                          Administrador
                        </span>
                      ) : user.role === 'SELLER' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">
                          Vendedor
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
                          Cliente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p>{user._count.orders} Órdenes</p>
                      {user.role === 'SELLER' && (
                        <div className="mt-1 flex flex-col items-start gap-1">
                          <p className="text-orange-600 font-medium text-xs">
                            {user._count.clients} Clientes a cargo
                          </p>
                          <button 
                            onClick={() => handleCommissionChange(user.id, user.sellerProfile?.defaultCommissionRate || 20)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-[#ED2C71] transition-colors"
                          >
                            <Percent size={10} /> 
                            Comisión: {user.sellerProfile?.defaultCommissionRate || 20}%
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.isBanned ? (
                        <span className="inline-flex items-center gap-1.5 text-red-600 font-semibold text-xs">
                          <ShieldAlert size={14} /> Baneado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold text-xs">
                          <ShieldCheck size={14} /> Activo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.role !== 'ADMIN' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRoleChange(user.id, user.role)}
                            disabled={loading === user.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {user.role === 'CUSTOMER' ? (
                              <><UserCheck size={14} className="text-orange-500" /> Hacer Vendedor</>
                            ) : (
                              <><UserX size={14} className="text-gray-500" /> Degradar a Cliente</>
                            )}
                          </button>
                          <button
                            onClick={() => handleBanToggle(user.id, user.isBanned)}
                            disabled={loading === user.id}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                              user.isBanned 
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-700 hover:bg-red-100'
                            }`}
                          >
                            {user.isBanned ? 'Desbanear' : 'Banear'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
