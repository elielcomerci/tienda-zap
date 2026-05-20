'use client'

import { useMemo, useState, useTransition } from 'react'
import { CalendarDays, Pause, Play, Plus, RefreshCcw, XCircle } from 'lucide-react'
import {
  createRecurringSubscription,
  generateAllRecurringCommissions,
  generateRecurringCommission,
  updateRecurringSubscriptionStatus,
} from './actions'

type UserOption = {
  id: string
  name: string | null
  email: string
}

type Subscription = {
  id: string
  name: string
  monthlyAmount: number
  dueDay: number
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED'
  notes: string | null
  client: UserOption
  portfolioSeller: UserOption
  operationalSeller: UserOption | null
  commissions: Array<{
    status: string
    amount: number
    period: string | null
  }>
}

export default function AbonosClient({
  clients,
  sellers,
  subscriptions,
  period,
}: {
  clients: UserOption[]
  sellers: UserOption[]
  subscriptions: Subscription[]
  period: string
}) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    clientId: '',
    portfolioSellerId: '',
    operationalSellerId: '',
    name: '',
    monthlyAmount: '',
    dueDay: '10',
    notes: '',
  })

  const sellerOptions = useMemo(() => sellers.map((seller) => ({
    ...seller,
    label: seller.name ? `${seller.name} · ${seller.email}` : seller.email,
  })), [sellers])

  const submit = () => {
    startTransition(async () => {
      try {
        await createRecurringSubscription({
          clientId: form.clientId,
          portfolioSellerId: form.portfolioSellerId,
          operationalSellerId: form.operationalSellerId || null,
          name: form.name,
          monthlyAmount: Number(form.monthlyAmount),
          dueDay: Number(form.dueDay),
          notes: form.notes,
        })
        setForm({
          clientId: '',
          portfolioSellerId: '',
          operationalSellerId: '',
          name: '',
          monthlyAmount: '',
          dueDay: '10',
          notes: '',
        })
        setMessage('Abono creado.')
      } catch (error) {
        alert(error instanceof Error ? error.message : 'No se pudo crear el abono.')
      }
    })
  }

  const runAction = (action: () => Promise<unknown>, success: string) => {
    startTransition(async () => {
      try {
        await action()
        setMessage(success)
      } catch (error) {
        alert(error instanceof Error ? error.message : 'No se pudo completar la accion.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Nuevo abono recurrente</h2>
            <p className="mt-1 text-sm text-gray-500">Carga manual para servicios mensuales confirmados.</p>
          </div>
          <button
            type="button"
            onClick={() => runAction(generateAllRecurringCommissions, `Comisiones generadas para ${period}.`)}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
          >
            <RefreshCcw size={16} />
            Generar mes
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Cliente</span>
            <select
              value={form.clientId}
              onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-orange-500"
            >
              <option value="">Seleccionar...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name ? `${client.name} · ${client.email}` : client.email}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Asesor titular</span>
            <select
              value={form.portfolioSellerId}
              onChange={(event) => setForm((current) => ({ ...current, portfolioSellerId: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-orange-500"
            >
              <option value="">Seleccionar...</option>
              {sellerOptions.map((seller) => (
                <option key={seller.id} value={seller.id}>{seller.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Heredero operativo</span>
            <select
              value={form.operationalSellerId}
              onChange={(event) => setForm((current) => ({ ...current, operationalSellerId: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-orange-500"
            >
              <option value="">Sin asignar</option>
              {sellerOptions.map((seller) => (
                <option key={seller.id} value={seller.id}>{seller.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Nombre del abono</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-orange-500"
              placeholder="Mantenimiento web mensual"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Monto mensual neto</span>
            <input
              type="number"
              value={form.monthlyAmount}
              onChange={(event) => setForm((current) => ({ ...current, monthlyAmount: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-orange-500"
              placeholder="0"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Dia de vencimiento</span>
            <input
              type="number"
              min={1}
              max={28}
              value={form.dueDay}
              onChange={(event) => setForm((current) => ({ ...current, dueDay: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-orange-500"
            />
          </label>

          <label className="space-y-1 text-sm md:col-span-2 xl:col-span-3">
            <span className="font-medium text-gray-700">Notas</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              className="min-h-20 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-orange-500"
              placeholder="Detalle interno del servicio recurrente..."
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
          >
            <Plus size={16} />
            Crear abono
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Abonos activos y cartera</h2>
          <p className="mt-1 text-sm text-gray-500">Periodo de liquidacion actual: {period}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Abono</th>
                <th className="px-5 py-3 font-semibold">Cliente</th>
                <th className="px-5 py-3 font-semibold">Asesor</th>
                <th className="px-5 py-3 font-semibold text-right">Mensual</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subscriptions.map((subscription) => {
                const periodCommission = subscription.commissions.find((commission) => commission.period === period)

                return (
                  <tr key={subscription.id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">{subscription.name}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500">
                        <CalendarDays size={13} />
                        Vence dia {subscription.dueDay}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-800">{subscription.client.name || 'Sin nombre'}</p>
                      <p className="text-xs text-gray-500">{subscription.client.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-800">{subscription.portfolioSeller.name || subscription.portfolioSeller.email}</p>
                      {subscription.operationalSeller && (
                        <p className="text-xs text-gray-500">Heredero: {subscription.operationalSeller.name || subscription.operationalSeller.email}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-gray-900">
                      ${subscription.monthlyAmount.toLocaleString('es-AR')}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        {subscription.status}
                      </span>
                      {periodCommission && (
                        <p className="mt-1 text-xs font-medium text-emerald-600">
                          {periodCommission.status} · ${periodCommission.amount.toLocaleString('es-AR')}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => runAction(() => generateRecurringCommission(subscription.id), 'Comision mensual generada.')}
                          disabled={isPending || subscription.status !== 'ACTIVE'}
                          className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                          title="Generar comision del periodo"
                        >
                          <RefreshCcw size={15} />
                        </button>
                        {subscription.status === 'ACTIVE' ? (
                          <button
                            type="button"
                            onClick={() => runAction(() => updateRecurringSubscriptionStatus(subscription.id, 'PAUSED'), 'Abono pausado.')}
                            disabled={isPending}
                            className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                            title="Pausar"
                          >
                            <Pause size={15} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => runAction(() => updateRecurringSubscriptionStatus(subscription.id, 'ACTIVE'), 'Abono activado.')}
                            disabled={isPending || subscription.status === 'CANCELLED'}
                            className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                            title="Activar"
                          >
                            <Play size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => runAction(() => updateRecurringSubscriptionStatus(subscription.id, 'CANCELLED'), 'Abono cancelado.')}
                          disabled={isPending || subscription.status === 'CANCELLED'}
                          className="rounded-lg border border-red-100 p-2 text-red-500 transition hover:bg-red-50 disabled:opacity-40"
                          title="Cancelar"
                        >
                          <XCircle size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {subscriptions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                    Todavia no hay abonos cargados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
