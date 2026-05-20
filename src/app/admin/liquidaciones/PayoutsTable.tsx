'use client'

import { useState, useTransition } from 'react'
import { DollarSign, Send, Check } from 'lucide-react'
import { createSellerPayout } from '@/lib/actions/payouts'

export default function PayoutsTable({ sellers }: { sellers: any[] }) {
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [isPending, startTransition] = useTransition()
  const [successMsg, setSuccessMsg] = useState('')

  const handlePayout = (sellerId: string, availableBalance: number) => {
    if (Number(amount) <= 0 || Number(amount) > availableBalance) return

    startTransition(async () => {
      try {
        await createSellerPayout(sellerId, Number(amount), reference)
        setSuccessMsg('Liquidación registrada con éxito')
        setSelectedSeller(null)
        setAmount('')
        setReference('')
        setTimeout(() => setSuccessMsg(''), 3000)
      } catch (err: any) {
        alert(err.message)
      }
    })
  }

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-2">
          <Check size={20} />
          {successMsg}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Vendedor</th>
                <th className="px-6 py-4 font-semibold text-right">Histórico</th>
                <th className="px-6 py-4 font-semibold text-right text-gray-400">Retirado</th>
                <th className="px-6 py-4 font-semibold text-right text-orange-600">Saldo Disponible</th>
                <th className="px-6 py-4 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sellers.map((seller) => {
                const available = seller.totalEarned - seller.totalPaid
                
                return (
                  <tr key={seller.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{seller.name || 'Sin nombre'}</p>
                      <p className="text-xs text-gray-500">{seller.email}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-700">
                      ${seller.totalEarned.toLocaleString('es-AR')}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-400">
                      ${seller.totalPaid.toLocaleString('es-AR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold ${available > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                        ${available.toLocaleString('es-AR')}
                      </span>
                      {available > 0 && seller.breakdown && (
                        <div className="mt-1 space-x-2 text-[10px] font-medium text-gray-400">
                          <span>Tienda ${seller.breakdown.store.toLocaleString('es-AR')}</span>
                          <span>Manual ${seller.breakdown.manual.toLocaleString('es-AR')}</span>
                          <span>Abonos ${seller.breakdown.recurring.toLocaleString('es-AR')}</span>
                          <span>Regalias ${seller.breakdown.royalty.toLocaleString('es-AR')}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {selectedSeller === seller.id ? (
                        <div className="flex flex-col gap-2 items-end">
                          <input 
                            type="number" 
                            placeholder="Monto" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-32 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-[#ED2C71]"
                            max={available}
                          />
                          <input 
                            type="text" 
                            placeholder="Ref / Comprobante" 
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            className="w-32 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-[#ED2C71]"
                          />
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setSelectedSeller(null)}
                              className="text-xs text-gray-500 hover:text-gray-700 px-2"
                              disabled={isPending}
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={() => handlePayout(seller.id, available)}
                              className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
                              disabled={isPending || Number(amount) <= 0 || Number(amount) > available}
                            >
                              <Send size={14} /> Liquidar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setSelectedSeller(seller.id)
                            setAmount(available.toString())
                          }}
                          className={`btn-primary py-1.5 px-3 text-xs ${available <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={available <= 0}
                        >
                          Registrar Pago
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {sellers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No hay vendedores activos en el sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
