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

type CommercialDraft = {
  rank: SellerRank
  status: SellerStatus
  temporaryRate: string
  temporaryDays: string
  excludeFromLeaderboards: boolean
  penaltyRank: SellerRank
  penaltyReason: string
}

const rankLabels: Record<SellerRank, string> = {
  BRONZE: 'Inicial',
  SILVER: 'Asociado',
  GOLD: 'Senior',
  DIAMOND: 'Estrategico',
}

const statusLabels: Record<SellerStatus, string> = {
  ACTIVE: 'Activo',
  RETIRED: 'Retirado',
  SUSPENDED: 'Suspendido',
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
  const [commercialDrafts, setCommercialDrafts] = useState<Record<string, CommercialDraft>>({})

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

  const getCommercialDraft = (user: any): CommercialDraft =>
    commercialDrafts[user.id] ?? {
      rank: (user.sellerProfile?.rank || 'BRONZE') as SellerRank,
      status: (user.sellerProfile?.status || 'ACTIVE') as SellerStatus,
      temporaryRate: user.sellerProfile?.temporaryCommissionRate?.toString() || '',
      temporaryDays: '30',
      excludeFromLeaderboards: Boolean(user.sellerProfile?.excludeFromLeaderboards),
      penaltyRank: (user.sellerProfile?.rank || 'BRONZE') as SellerRank,
      penaltyReason: '',
    }

  const updateCommercialDraft = (user: any, patch: Partial<CommercialDraft>) => {
    setCommercialDrafts((current) => ({
      ...current,
      [user.id]: {
        ...getCommercialDraft(user),
        ...patch,
      },
    }))
  }

  const handleCommercialSave = async (user: any) => {
    const draft = getCommercialDraft(user)
    const currentRank = (user.sellerProfile?.rank || 'BRONZE') as SellerRank
    const rate = draft.temporaryRate.trim() ? Number(draft.temporaryRate) : null
    const days = Number(draft.temporaryDays || 30)
    let expiresAt: Date | null = null

    if (rate !== null) {
      if (!Number.isFinite(rate) || rate < 0 || rate > 100 || !Number.isFinite(days) || days <= 0) {
        alert('Override invalido.')
        return
      }
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + days)
    }

    setLoading(user.id)
    try {
      if (draft.rank !== currentRank) {
        await updateSellerRank(user.id, draft.rank)
      }
      await updateSellerProfileSettings(user.id, {
        status: draft.status,
        temporaryCommissionRate: rate,
        temporaryRateExpiresAt: expiresAt,
        excludeFromLeaderboards: draft.excludeFromLeaderboards,
      })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo actualizar el perfil comercial.')
    } finally {
      setLoading(null)
    }
  }

  const handlePenalty = async (user: any) => {
    const draft = getCommercialDraft(user)
    setLoading(user.id)
    try {
      await penalizeSellerRank(user.id, draft.penaltyRank, draft.penaltyReason)
      updateCommercialDraft(user, { penaltyReason: '' })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo registrar la penalizacion.')
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
                  const commercialDraft = getCommercialDraft(user)

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
                            Asesor
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
                                {statusLabels[status]}
                              </span>
                            </div>
                            <div className="mt-2 grid w-full max-w-3xl gap-2 rounded-lg bg-gray-50 p-2 text-xs sm:grid-cols-[1fr_1fr_90px_80px_auto_auto]">
                              <select
                                value={commercialDraft.rank}
                                onChange={(event) => updateCommercialDraft(user, { rank: event.target.value as SellerRank })}
                                disabled={loading === user.id}
                                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 outline-none focus:border-orange-500 disabled:opacity-50"
                                aria-label="Rango comercial"
                              >
                                {SELLER_RANKS.map((option) => (
                                  <option key={option} value={option}>{rankLabels[option]}</option>
                                ))}
                              </select>
                              <select
                                value={commercialDraft.status}
                                onChange={(event) => updateCommercialDraft(user, { status: event.target.value as SellerStatus })}
                                disabled={loading === user.id}
                                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 outline-none focus:border-orange-500 disabled:opacity-50"
                                aria-label="Estado comercial"
                              >
                                {Object.entries(statusLabels).map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                              <input
                                type="number"
                                value={commercialDraft.temporaryRate}
                                onChange={(event) => updateCommercialDraft(user, { temporaryRate: event.target.value })}
                                disabled={loading === user.id}
                                placeholder="% temp."
                                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 outline-none focus:border-orange-500 disabled:opacity-50"
                              />
                              <input
                                type="number"
                                min={1}
                                value={commercialDraft.temporaryDays}
                                onChange={(event) => updateCommercialDraft(user, { temporaryDays: event.target.value })}
                                disabled={loading === user.id || !commercialDraft.temporaryRate.trim()}
                                placeholder="Dias"
                                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 outline-none focus:border-orange-500 disabled:opacity-50"
                              />
                              <label className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 font-semibold text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={commercialDraft.excludeFromLeaderboards}
                                  onChange={(event) => updateCommercialDraft(user, { excludeFromLeaderboards: event.target.checked })}
                                  disabled={loading === user.id}
                                />
                                Sin ranking
                              </label>
                              <button
                                onClick={() => handleCommercialSave(user)}
                                disabled={loading === user.id}
                                className="rounded-lg bg-gray-900 px-2 py-1.5 font-semibold text-white transition-colors hover:bg-black disabled:opacity-50"
                              >
                                Guardar
                              </button>
                            </div>
                            <div className="mt-2 grid w-full max-w-3xl gap-2 rounded-lg border border-red-100 bg-red-50 p-2 text-xs sm:grid-cols-[140px_1fr_auto]">
                              <select
                                value={commercialDraft.penaltyRank}
                                onChange={(event) => updateCommercialDraft(user, { penaltyRank: event.target.value as SellerRank })}
                                disabled={loading === user.id}
                                className="rounded-lg border border-red-100 bg-white px-2 py-1.5 outline-none focus:border-red-400 disabled:opacity-50"
                                aria-label="Rango por penalizacion"
                              >
                                {SELLER_RANKS.map((option) => (
                                  <option key={option} value={option}>{rankLabels[option]}</option>
                                ))}
                              </select>
                              <input
                                value={commercialDraft.penaltyReason}
                                onChange={(event) => updateCommercialDraft(user, { penaltyReason: event.target.value })}
                                disabled={loading === user.id}
                                placeholder="Motivo obligatorio de revision de rango"
                                className="rounded-lg border border-red-100 bg-white px-2 py-1.5 outline-none focus:border-red-400 disabled:opacity-50"
                              />
                              <button
                                onClick={() => handlePenalty(user)}
                                disabled={loading === user.id || commercialDraft.penaltyReason.trim().length < 10}
                                className="rounded-lg bg-red-600 px-2 py-1.5 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                              >
                                Penalizar
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
                              aria-label="Asesor titular"
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
                              aria-label="Asesor operativo"
                            >
                              <option value="">Sin operativo</option>
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
                                <><UserCheck size={14} className="text-orange-500" /> Hacer Asesor</>
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
