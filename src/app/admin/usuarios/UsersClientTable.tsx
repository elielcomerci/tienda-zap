'use client'

import { useState } from 'react'
import { Search, ShieldAlert, ShieldCheck, UserCheck, UserX, Medal } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  assignCustomerCommercialOwners,
  penalizeSellerRank,
  setRole,
  toggleBan,
  updateSellerProfileSettings,
  updateSellerRank,
} from './actions'

const SELLER_RANKS = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'] as const
type SellerRank = (typeof SELLER_RANKS)[number]
type SellerStatus = 'ACTIVE' | 'RETIRED' | 'SUSPENDED'
type SellerOption = { id: string; name: string | null; email: string }

const rankLabels: Record<SellerRank, string> = {
  BRONZE: 'Bronce',
  SILVER: 'Plata',
  GOLD: 'Oro',
  DIAMOND: 'Diamante',
}

export default function UsersClientTable({
  users,
  sellers,
  initialQuery,
}: {
  users: any[]
  sellers: SellerOption[]
  initialQuery?: string
}) {
  const router = useRouter()
  const [q, setQ] = useState(initialQuery || '')
  const [loading, setLoading] = useState<string | null>(null)
  const [ownerDrafts, setOwnerDrafts] = useState<Record<string, { sellerId: string; operationalSellerId: string }>>({})

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
    if (!confirm(`Estas seguro de ${isBanned ? 'desbanear' : 'banear'} a este usuario?`)) return
    setLoading(userId)
    await toggleBan(userId, !isBanned)
    setLoading(null)
  }

  const parseRank = (value: string | null) => {
    const rank = value?.trim().toUpperCase() as SellerRank | undefined
    return rank && SELLER_RANKS.includes(rank) ? rank : null
  }

  const handleRankChange = async (userId: string, currentRank: SellerRank) => {
    const rank = parseRank(
      prompt(`Nuevo rango (${SELLER_RANKS.join(', ')}). Actual: ${currentRank}`, currentRank)
    )
    if (!rank) return

    setLoading(userId)
    try {
      await updateSellerRank(userId, rank)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo actualizar el rango.')
    } finally {
      setLoading(null)
    }
  }

  const handlePenalty = async (userId: string, currentRank: SellerRank) => {
    const rank = parseRank(
      prompt(`Rango destino por penalizacion (${SELLER_RANKS.join(', ')}). Actual: ${currentRank}`, currentRank)
    )
    if (!rank) return

    const reason = prompt('Motivo obligatorio de penalizacion (minimo 10 caracteres):')
    if (!reason) return

    setLoading(userId)
    try {
      await penalizeSellerRank(userId, rank, reason)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo registrar la penalizacion.')
    } finally {
      setLoading(null)
    }
  }

  const handleStatusChange = async (userId: string, currentStatus: SellerStatus) => {
    const status = prompt('Estado comercial (ACTIVE, RETIRED, SUSPENDED):', currentStatus)?.trim().toUpperCase() as
      | SellerStatus
      | undefined
    if (!status || !['ACTIVE', 'RETIRED', 'SUSPENDED'].includes(status)) return

    setLoading(userId)
    try {
      await updateSellerProfileSettings(userId, { status })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo actualizar el estado.')
    } finally {
      setLoading(null)
    }
  }

  const handleTemporaryRate = async (userId: string) => {
    const rateInput = prompt('Porcentaje temporal de comision. Dejar vacio para quitar override:')
    if (rateInput === null) return

    if (!rateInput.trim()) {
      setLoading(userId)
      try {
        await updateSellerProfileSettings(userId, {
          temporaryCommissionRate: null,
          temporaryRateExpiresAt: null,
        })
      } finally {
        setLoading(null)
      }
      return
    }

    const rate = Number(rateInput)
    const days = Number(prompt('Dias de vigencia:', '30'))
    if (!Number.isFinite(rate) || rate < 0 || rate > 100 || !Number.isFinite(days) || days <= 0) {
      alert('Override invalido.')
      return
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + days)

    setLoading(userId)
    try {
      await updateSellerProfileSettings(userId, {
        temporaryCommissionRate: rate,
        temporaryRateExpiresAt: expiresAt,
      })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo guardar el override.')
    } finally {
      setLoading(null)
    }
  }

  const handleLeaderboardToggle = async (userId: string, currentValue: boolean) => {
    setLoading(userId)
    try {
      await updateSellerProfileSettings(userId, { excludeFromLeaderboards: !currentValue })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo actualizar rankings.')
    } finally {
      setLoading(null)
    }
  }

  const getOwnerDraft = (user: any) =>
    ownerDrafts[user.id] ?? {
      sellerId: user.sellerId || '',
      operationalSellerId: user.operationalSellerId || '',
    }

  const updateOwnerDraft = (user: any, patch: Partial<{ sellerId: string; operationalSellerId: string }>) => {
    setOwnerDrafts((current) => ({
      ...current,
      [user.id]: {
        ...getOwnerDraft(user),
        ...patch,
      },
    }))
  }

  const handleCustomerOwners = async (user: any) => {
    const draft = getOwnerDraft(user)
    setLoading(user.id)
    try {
      await assignCustomerCommercialOwners(user.id, {
        sellerId: draft.sellerId || null,
        operationalSellerId: draft.operationalSellerId || null,
      })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo asignar la cartera.')
    } finally {
      setLoading(null)
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
                <th className="px-6 py-4 font-semibold">Metricas</th>
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
                users.map((user) => {
                  const rank = (user.sellerProfile?.rank || 'BRONZE') as SellerRank
                  const status = (user.sellerProfile?.status || 'ACTIVE') as SellerStatus
                  const isCommercialUser = (user.role === 'SELLER' || user.role === 'ADMIN') && user.sellerProfile
                  const ownerDraft = getOwnerDraft(user)

                  return (
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
                        <p>{user._count.orders} Ordenes</p>
                        {isCommercialUser && (
                          <div className="mt-1 flex flex-col items-start gap-1">
                            <p className="text-orange-600 font-medium text-xs">
                              {user._count.clients} Clientes a cargo
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600">
                                <Medal size={10} />
                                {rankLabels[rank]} · {user.sellerProfile.defaultCommissionRate}%
                              </span>
                              <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600">
                                {status}
                              </span>
                              <button
                                onClick={() => handleRankChange(user.id, rank)}
                                disabled={loading === user.id}
                                className="text-[10px] font-semibold text-gray-500 transition-colors hover:text-[#ED2C71] disabled:opacity-50"
                              >
                                Cambiar rango
                              </button>
                              <button
                                onClick={() => handlePenalty(user.id, rank)}
                                disabled={loading === user.id}
                                className="text-[10px] font-semibold text-red-500 transition-colors hover:text-red-700 disabled:opacity-50"
                              >
                                Penalizar
                              </button>
                              <button
                                onClick={() => handleStatusChange(user.id, status)}
                                disabled={loading === user.id}
                                className="text-[10px] font-semibold text-gray-500 transition-colors hover:text-[#ED2C71] disabled:opacity-50"
                              >
                                Estado
                              </button>
                              <button
                                onClick={() => handleTemporaryRate(user.id)}
                                disabled={loading === user.id}
                                className="text-[10px] font-semibold text-gray-500 transition-colors hover:text-[#ED2C71] disabled:opacity-50"
                              >
                                Override
                              </button>
                              <button
                                onClick={() => handleLeaderboardToggle(user.id, user.sellerProfile.excludeFromLeaderboards)}
                                disabled={loading === user.id}
                                className="text-[10px] font-semibold text-gray-500 transition-colors hover:text-[#ED2C71] disabled:opacity-50"
                              >
                                {user.sellerProfile.excludeFromLeaderboards ? 'Incluir ranking' : 'Excluir ranking'}
                              </button>
                            </div>
                          </div>
                        )}
                        {user.role === 'CUSTOMER' && (
                          <div className="mt-2 grid max-w-md gap-2 text-xs text-gray-500 sm:grid-cols-[1fr_1fr_auto]">
                            <select
                              value={ownerDraft.sellerId}
                              onChange={(event) => updateOwnerDraft(user, { sellerId: event.target.value })}
                              disabled={loading === user.id || sellers.length === 0}
                              className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-orange-500 disabled:opacity-50"
                              aria-label="Vendedor titular"
                            >
                              <option value="">Sin titular</option>
                              {sellers.map((seller) => (
                                <option key={seller.id} value={seller.id}>
                                  {seller.name || seller.email}
                                </option>
                              ))}
                            </select>
                            <select
                              value={ownerDraft.operationalSellerId}
                              onChange={(event) => updateOwnerDraft(user, { operationalSellerId: event.target.value })}
                              disabled={loading === user.id || sellers.length === 0}
                              className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-orange-500 disabled:opacity-50"
                              aria-label="Heredero operativo"
                            >
                              <option value="">Sin heredero</option>
                              {sellers.map((seller) => (
                                <option key={seller.id} value={seller.id}>
                                  {seller.name || seller.email}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleCustomerOwners(user)}
                              disabled={loading === user.id || sellers.length === 0}
                              className="rounded-lg bg-gray-100 px-2 py-1.5 font-semibold text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50"
                            >
                              Guardar
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
