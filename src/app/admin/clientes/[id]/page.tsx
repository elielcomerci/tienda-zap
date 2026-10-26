import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CalendarClock, ChartNoAxesCombined, CircleDollarSign, History, MessageSquareText, Package, ShoppingBag, UserRound } from 'lucide-react'
import { addBusinessAccountActivity } from '../actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Historia del cliente | ZAP Admin' }

const activityLabels: Record<string, string> = {
  NOTE: 'Nota', CALL: 'Llamada', EMAIL: 'Email', WHATSAPP: 'WhatsApp',
  MEETING: 'Reunión', FOLLOW_UP: 'Seguimiento',
}
const orderStatusLabels: Record<string, string> = {
  PENDING: 'Pendiente', PAID: 'Pagado', PROOF_SENT: 'Prueba enviada',
  IN_PRODUCTION: 'En producción', PROCESSING: 'En proceso', READY: 'Listo',
  DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
}
const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const dateLabel = (date: Date) => date.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })
const dayDiff = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000)

export default async function CustomerLifecyclePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') redirect('/login')
  const { id } = await params

  const account = await prisma.businessAccount.findUnique({
    where: { id },
    include: {
      businessType: { select: { name: true } },
      assignedSeller: { select: { name: true, email: true } },
      user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
      contacts: { orderBy: [{ isPrimary: 'desc' }, { updatedAt: 'desc' }] },
      activities: { orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }], take: 100 },
    },
  })
  if (!account) notFound()

  const [orders, consultations] = await Promise.all([
    prisma.order.findMany({
          where: { businessAccountId: account.id },
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: {
            items: { select: { id: true, productName: true, productSlug: true, quantity: true, unitPrice: true } },
            events: { orderBy: { createdAt: 'asc' }, select: { status: true, note: true, createdAt: true } },
          },
        }),
    prisma.consultRequest.findMany({
          where: { businessAccountId: account.id },
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: { product: { select: { name: true, slug: true } } },
        }),
  ])

  const purchaseStatuses = new Set(['PAID', 'IN_PRODUCTION', 'PROCESSING', 'READY', 'DELIVERED'])
  const relevantOrders = orders.filter(order => purchaseStatuses.has(order.status))
  const totalSpent = relevantOrders.reduce((sum, order) => sum + order.total, 0)
  const orderDates = relevantOrders.map(order => order.createdAt).sort((a, b) => a.getTime() - b.getTime())
  const lastPurchase = orderDates.at(-1) || null
  const averageGap = orderDates.length > 1
    ? Math.round(orderDates.slice(1).reduce((sum, date, index) => sum + dayDiff(orderDates[index], date), 0) / (orderDates.length - 1))
    : null
  const productCounts = new Map<string, { name: string; count: number }>()
  for (const order of relevantOrders) {
    for (const item of order.items) {
      const key = item.productSlug || item.productName || item.id
      const current = productCounts.get(key) || { name: item.productName || 'Producto sin nombre', count: 0 }
      current.count += item.quantity
      productCounts.set(key, current)
    }
  }
  const favoriteProducts = [...productCounts.values()].sort((a, b) => b.count - a.count).slice(0, 5)
  const daysSincePurchase = lastPurchase ? dayDiff(lastPurchase, new Date()) : null
  const customerSignal = !lastPurchase
    ? 'Todavía no hay compras vinculadas'
    : daysSincePurchase! <= 45
      ? 'Compra reciente'
      : daysSincePurchase! <= 120
        ? 'Sin compra reciente'
        : 'Cliente sin recompra registrada reciente'

  const timeline: Array<{ at: Date; type: string; title: string; detail: string; href?: string }> = []
  for (const activity of account.activities) {
    timeline.push({
      at: activity.occurredAt,
      type: activityLabels[activity.type] || 'Actividad',
      title: activity.title,
      detail: activity.detail || '',
    })
  }
  for (const order of orders) {
    timeline.push({
      at: order.createdAt,
      type: 'Pedido',
      title: `Pedido · ${currency.format(order.total)} · ${orderStatusLabels[order.status] || order.status}`,
      detail: order.items.map(item => `${item.quantity} × ${item.productName || 'Producto'}`).join(' · '),
      href: `/admin/ordenes/${order.id}`,
    })
    for (const event of order.events) {
      timeline.push({
        at: event.createdAt,
        type: 'Pedido actualizado',
        title: orderStatusLabels[event.status] || event.status,
        detail: event.note || `Pedido de ${currency.format(order.total)}`,
        href: `/admin/ordenes/${order.id}`,
      })
    }
  }
  for (const consultation of consultations) {
    timeline.push({
      at: consultation.createdAt,
      type: 'Consulta',
      title: consultation.product?.name ? `Consulta por ${consultation.product.name}` : 'Consulta comercial',
      detail: consultation.message,
    })
  }
  timeline.sort((a, b) => b.at.getTime() - a.at.getTime())

  return (
    <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:py-10">
      <Link href="/admin/clientes" className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-950">
        <ArrowLeft size={16} /> Volver a clientes
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-[#C2103F]">CRM ZAP · HISTORIA DEL CLIENTE</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950">{account.name}</h1>
          <p className="mt-2 text-sm text-gray-600">{account.businessType?.name || 'Rubro sin asignar'} · {account.status === 'ACTIVE' ? 'Activo' : account.status === 'PROSPECT' ? 'Prospecto' : account.status === 'INACTIVE' ? 'Inactivo' : 'Perdido'}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Asesor asignado</p>
          <p className="mt-1 font-bold text-gray-900">{account.assignedSeller?.name || account.assignedSeller?.email || 'Sin asignar'}</p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500"><ShoppingBag size={16} /> Pedidos vinculados</div>
          <p className="mt-3 text-3xl font-black text-gray-950">{relevantOrders.length}</p>
          <p className="mt-1 text-xs text-gray-500">Se excluyen los cancelados</p>
        </article>
        <article className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500"><CircleDollarSign size={16} /> Importe registrado</div>
          <p className="mt-3 text-3xl font-black text-gray-950">{currency.format(totalSpent)}</p>
          <p className="mt-1 text-xs text-gray-500">Suma de pedidos no cancelados; no equivale necesariamente a cobros confirmados</p>
        </article>
        <article className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500"><CalendarClock size={16} /> Último pedido</div>
          <p className="mt-3 text-xl font-black text-gray-950">{lastPurchase ? lastPurchase.toLocaleDateString('es-AR') : 'Sin datos'}</p>
          <p className="mt-1 text-xs text-gray-500">{daysSincePurchase !== null ? `Hace ${daysSincePurchase} días` : 'No hay pedidos asociados'}</p>
        </article>
        <article className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500"><ChartNoAxesCombined size={16} /> Señal de recurrencia</div>
          <p className="mt-3 text-lg font-black text-gray-950">{orderDates.length >= 2 ? `Cada ~${averageGap} días` : orderDates.length === 1 ? 'Una compra registrada' : 'Sin patrón todavía'}</p>
          <p className="mt-1 text-xs text-gray-500">{customerSignal}</p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <History size={19} className="text-[#C2103F]" />
              <h2 className="text-lg font-black text-gray-950">Línea de vida</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">Actividad registrada, consultas y pedidos vinculados por cuenta, usuario o email exacto.</p>
            <form action={addBusinessAccountActivity.bind(null, account.id)} className="mt-5 grid gap-3 rounded-xl bg-gray-50 p-4">
              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <label className="text-xs font-bold text-gray-600">Tipo de contacto
                  <select name="type" className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900">
                    <option value="NOTE">Nota</option><option value="CALL">Llamada</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">Email</option><option value="MEETING">Reunión</option><option value="FOLLOW_UP">Seguimiento</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-gray-600">Qué pasó
                  <input name="title" required maxLength={180} placeholder="Ej. Consultó por reposición de etiquetas" className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900" />
                </label>
              </div>
              <label className="text-xs font-bold text-gray-600">Detalle (opcional)
                <textarea name="detail" rows={2} maxLength={4000} placeholder="Contexto, necesidad, objeción, próximo paso acordado…" className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900" />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="text-xs text-gray-500">Fecha del contacto
                  <input type="datetime-local" name="occurredAt" className="ml-2 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900" />
                </label>
                <button type="submit" className="rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800">Registrar actividad</button>
              </div>
            </form>

            <div className="mt-6">
              {timeline.length ? (
                <ol className="space-y-0">
                  {timeline.map((item, index) => (
                    <li key={`${item.type}-${item.at.toISOString()}-${index}`} className="relative border-l border-gray-200 pb-6 pl-5 last:border-l-transparent last:pb-0">
                      <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#C2103F] ring-1 ring-gray-200" />
                      <p className="text-xs font-semibold text-gray-500">{item.type} · {dateLabel(item.at)}</p>
                      <p className="mt-1 font-bold text-gray-950">{item.title}</p>
                      {item.detail && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-600">{item.detail}</p>}
                      {item.href && <Link href={item.href} className="mt-1 inline-block text-xs font-bold text-[#C2103F] hover:underline">Ver pedido</Link>}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 px-5 py-8 text-center">
                  <MessageSquareText size={24} className="mx-auto text-gray-300" />
                  <p className="mt-3 font-bold text-gray-800">Todavía no hay actividad vinculada</p>
                  <p className="mt-1 text-sm text-gray-500">Registrá el primer contacto o vinculá al negocio con una cuenta de cliente para empezar a construir su historia.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-gray-950"><Package size={18} className="text-[#C2103F]" /> Hábitos observados</h2>
            <p className="mt-1 text-sm text-gray-500">Señales calculadas con pedidos vinculados y estados de compra confirmados; no son predicciones.</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Consultas registradas</p>
                <p className="mt-1 text-xl font-black text-gray-950">{consultations.length}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Productos más pedidos</p>
                {favoriteProducts.length ? (
                  <ol className="mt-2 space-y-2">
                    {favoriteProducts.map(product => <li key={product.name} className="flex justify-between gap-3 text-sm"><span className="text-gray-700">{product.name}</span><strong className="shrink-0 text-gray-950">×{product.count}</strong></li>)}
                  </ol>
                ) : <p className="mt-2 text-sm text-gray-500">Todavía no hay compras vinculadas.</p>}
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Frecuencia estimada</p>
                <p className="mt-1 text-sm font-bold text-gray-950">{averageGap !== null ? `Promedio histórico de ${averageGap} días entre pedidos` : 'Necesitamos al menos dos pedidos para estimarla.'}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-gray-950"><UserRound size={18} className="text-[#C2103F]" /> Datos de relación</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-xs font-semibold text-gray-500">Cuenta de tienda</dt><dd className="mt-1 font-semibold text-gray-900">{account.user?.name || account.user?.email || 'No vinculada'}</dd></div>
              {account.user?.email && <div><dt className="text-xs font-semibold text-gray-500">Email de cuenta</dt><dd className="mt-1 break-all text-gray-900">{account.user.email}</dd></div>}
              {account.user?.phone && <div><dt className="text-xs font-semibold text-gray-500">Teléfono de cuenta</dt><dd className="mt-1 text-gray-900">{account.user.phone}</dd></div>}
              <div><dt className="text-xs font-semibold text-gray-500">Cuenta CRM creada</dt><dd className="mt-1 text-gray-900">{account.createdAt.toLocaleDateString('es-AR')}</dd></div>
              <div><dt className="text-xs font-semibold text-gray-500">Contactos</dt><dd className="mt-1 text-gray-900">{account.contacts.length ? account.contacts.map(contact => [contact.firstName, contact.lastName].filter(Boolean).join(' ')).join(', ') : 'Sin contactos cargados'}</dd></div>
            </dl>
          </section>
        </aside>
      </section>
    </main>
  )
}
