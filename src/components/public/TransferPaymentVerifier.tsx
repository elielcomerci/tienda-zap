'use client'

import { FormEvent, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Search } from 'lucide-react'

export default function TransferPaymentVerifier({
  orderId,
  accessToken,
}: {
  orderId: string
  accessToken?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [verified, setVerified] = useState(false)
  const [transferDate, setTransferDate] = useState('')
  const [referenceSuffix, setReferenceSuffix] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setVerified(false)
    startTransition(async () => {
      try {
        const response = await fetch('/api/checkout/transfer/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, accessToken, transferDate, referenceSuffix }),
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'No pudimos verificar la transferencia.')
        if (!payload.verified) {
          setError(payload.error || 'Todavía no encontramos la transferencia. Revisá los datos e intentá de nuevo.')
          return
        }
        setVerified(true)
        router.refresh()
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'No pudimos verificar la transferencia.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-[#F7638B]/20 bg-white p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-950">Verificar transferencia automáticamente</p>
        <p className="mt-1 text-xs leading-5 text-gray-600">
          Usá la fecha y los últimos 6 dígitos del número de operación. El titular debe coincidir con el DNI o CUIT informado en el pedido.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-gray-700">
          Fecha de la transferencia
          <input
            required
            type="date"
            value={transferDate}
            onChange={(event) => setTransferDate(event.target.value)}
            className="input mt-1 w-full"
          />
        </label>
        <label className="text-xs font-semibold text-gray-700">
          Últimos 5 o 6 dígitos de operación
          <input
            required
            inputMode="numeric"
            pattern="\d{5,6}"
            minLength={5}
            maxLength={6}
            value={referenceSuffix}
            onChange={(event) => setReferenceSuffix(event.target.value.replace(/\D/g, '').slice(0, 6))}
            className="input mt-1 w-full"
            placeholder="123456"
          />
        </label>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{error}</p>}
      {verified && <p role="status" className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800"><CheckCircle2 size={16} /> Pago verificado. Actualizando el pedido…</p>}
      <button type="submit" disabled={pending} className="btn-primary mt-3 w-full justify-center !py-3 !text-sm">
        <Search size={16} />
        {pending ? 'Buscando en Mercado Pago…' : 'Buscar transferencia'}
      </button>
    </form>
  )
}
