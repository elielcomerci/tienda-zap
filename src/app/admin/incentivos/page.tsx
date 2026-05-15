import { prisma } from '@/lib/prisma'
import { Target, Gift, Plus } from 'lucide-react'
import { createIncentive, toggleIncentiveActive, deleteIncentive } from '@/lib/actions/incentives'

export const metadata = { title: 'Incentivos de Vendedores — ZAP Admin' }

export default async function AdminIncentivesPage() {
  const incentives = await prisma.sellerIncentive.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { sellerProgress: true } }
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Incentivos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Creá metas y desafíos para motivar a tus vendedores.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50 font-semibold text-gray-900">
              Desafíos Activos e Historial
            </div>
            {incentives.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No hay incentivos creados.</div>
            ) : (
              <ul className="divide-y">
                {incentives.map((inc) => (
                  <li key={inc.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900">{inc.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${inc.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {inc.active ? 'Activo' : 'Pausado'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{inc.description}</p>
                        <div className="flex items-center gap-4 text-xs font-medium text-gray-400 mt-2">
                          <span className="flex items-center gap-1"><Target size={14}/> Meta: {inc.goalType === 'SALES_COUNT' ? `${inc.goalTarget} ventas` : `$${inc.goalTarget.toLocaleString('es-AR')}`}</span>
                          <span className="flex items-center gap-1 text-[#ED2C71]"><Gift size={14}/> Premio: ${inc.rewardAmount.toLocaleString('es-AR')}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-sm">
                        <span className="text-gray-500">{new Date(inc.endDate).toLocaleDateString('es-AR')}</span>
                        <div className="flex items-center gap-2">
                          <form action={async () => {
                            'use server'
                            await toggleIncentiveActive(inc.id, !inc.active)
                          }}>
                            <button className="text-xs font-bold px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                              {inc.active ? 'Pausar' : 'Activar'}
                            </button>
                          </form>
                          <form action={async () => {
                            'use server'
                            await deleteIncentive(inc.id)
                          }}>
                            <button className="text-xs font-bold px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors">
                              Eliminar
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <form action={async (formData) => {
            'use server'
            await createIncentive({
              title: formData.get('title') as string,
              description: formData.get('description') as string,
              goalType: formData.get('goalType') as string,
              goalTarget: Number(formData.get('goalTarget')),
              rewardType: 'FIXED_BONUS',
              rewardAmount: Number(formData.get('rewardAmount')),
              startDate: new Date(formData.get('startDate') as string),
              endDate: new Date(formData.get('endDate') as string),
            })
          }} className="bg-white border rounded-2xl shadow-sm p-6 space-y-4 sticky top-6">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Plus size={18} className="text-[#ED2C71]" /> Nuevo Desafío
            </h2>
            
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Título</label>
              <input name="title" required className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#ED2C71] outline-none" placeholder="Bono Fin de Semana" />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Descripción</label>
              <textarea name="description" className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#ED2C71] outline-none" placeholder="Cerrá 5 ventas..." rows={2}></textarea>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Tipo de Meta</label>
                <select name="goalType" className="w-full mt-1 border rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="SALES_COUNT">Cantidad de Ventas</option>
                  <option value="TOTAL_REVENUE">Volumen ($)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Objetivo</label>
                <input name="goalTarget" type="number" required className="w-full mt-1 border rounded-lg px-3 py-2 text-sm outline-none" placeholder="5" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Premio Fijo ($)</label>
              <input name="rewardAmount" type="number" required className="w-full mt-1 border rounded-lg px-3 py-2 text-sm outline-none" placeholder="10000" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Inicio</label>
                <input name="startDate" type="date" required className="w-full mt-1 border rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Fin</label>
                <input name="endDate" type="date" required className="w-full mt-1 border rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
            </div>

            <button type="submit" className="w-full mt-2 py-2 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-colors">
              Crear Incentivo
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
