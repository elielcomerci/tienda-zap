'use client'

import { CheckCircle2, Circle, Clock, Loader2, Package, Palette, Send, Truck, XCircle } from 'lucide-react'

type OrderEventData = {
  id: string
  status: string
  note: string | null
  createdAt: string | Date
}

const STATUS_CONFIG: Record<string, {
  label: string
  icon: typeof Circle
  color: string
  bgColor: string
}> = {
  PENDING: { label: 'Pedido recibido', icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-50' },
  PAID: { label: 'Pago confirmado', icon: CheckCircle2, color: 'text-green-500', bgColor: 'bg-green-50' },
  PROOF_SENT: { label: 'Prueba de diseño enviada', icon: Send, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  IN_PRODUCTION: { label: 'En producción', icon: Palette, color: 'text-purple-500', bgColor: 'bg-purple-50' },
  PROCESSING: { label: 'En proceso', icon: Loader2, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  READY: { label: 'Listo para retiro', icon: Package, color: 'text-[#ED2C71]', bgColor: 'bg-[#FEF1F6]' },
  DELIVERED: { label: 'Entregado', icon: Truck, color: 'text-green-600', bgColor: 'bg-green-50' },
  CANCELLED: { label: 'Cancelado', icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-50' },
}

const TIMELINE_ORDER = ['PENDING', 'PAID', 'PROOF_SENT', 'IN_PRODUCTION', 'PROCESSING', 'READY', 'DELIVERED']

export default function OrderTimeline({
  events,
  currentStatus,
}: {
  events: OrderEventData[]
  currentStatus: string
}) {
  if (events.length === 0) return null

  // Deduplicate by status, keeping the first occurrence
  const seenStatuses = new Set<string>()
  const uniqueEvents = events.filter((e) => {
    if (seenStatuses.has(e.status)) return false
    seenStatuses.add(e.status)
    return true
  })

  // Sort by timeline order
  const sortedEvents = [...uniqueEvents].sort((a, b) => {
    const aIdx = TIMELINE_ORDER.indexOf(a.status)
    const bIdx = TIMELINE_ORDER.indexOf(b.status)
    if (aIdx === -1 && bIdx === -1) return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    if (aIdx === -1) return 1
    if (bIdx === -1) return -1
    return aIdx - bIdx
  })

  const currentIdx = TIMELINE_ORDER.indexOf(currentStatus)

  return (
    <div className="space-y-0">
      {sortedEvents.map((event, i) => {
        const config = STATUS_CONFIG[event.status] || {
          label: event.status,
          icon: Circle,
          color: 'text-gray-400',
          bgColor: 'bg-gray-50',
        }
        const Icon = config.icon
        const isCurrent = event.status === currentStatus
        const isPast = TIMELINE_ORDER.indexOf(event.status) < currentIdx
        const isLast = i === sortedEvents.length - 1

        return (
          <div key={event.id} className="flex gap-3">
            {/* Vertical line + icon */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  isCurrent
                    ? `${config.bgColor} border-current ${config.color} ring-4 ring-current/10`
                    : isPast
                      ? `${config.bgColor} border-current ${config.color}`
                      : 'border-gray-200 bg-gray-50 text-gray-300'
                }`}
              >
                <Icon size={16} className={isCurrent ? 'animate-pulse' : ''} />
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 min-h-8 ${
                    isPast ? 'bg-gradient-to-b from-current/30 to-current/10' : 'bg-gray-200'
                  }`}
                  style={isPast ? { color: 'var(--tw-gradient-from)' } : undefined}
                />
              )}
            </div>

            {/* Content */}
            <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
              <p
                className={`text-sm font-semibold ${
                  isCurrent ? 'text-gray-900' : isPast ? 'text-gray-700' : 'text-gray-400'
                }`}
              >
                {config.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(event.createdAt).toLocaleString('es-AR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              {event.note && (
                <p className="text-xs text-gray-500 mt-1 italic">{event.note}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
