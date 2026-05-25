import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, BarChart3, ClipboardList, Ticket } from 'lucide-react'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type PromotionDetailPageProps = {
  params: Promise<{ id: string }>
}

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString('es-AR')}`
}

function formatPercent(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`
}

function formatDate(date?: Date | null) {
  if (!date) return 'sin fecha'
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function statusTheme(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-100 text-emerald-800'
    case 'PAUSED':
      return 'bg-amber-100 text-amber-800'
    case 'EXPIRED':
      return 'bg-gray-200 text-gray-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export default async function PromotionDetailPage({ params }: PromotionDetailPageProps) {
  const { id } = await params

  const promotion = await prisma.promotion.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          coupons: true,
          redemptions: true,
        },
      },
      coupons: {
        orderBy: { createdAt: 'desc' },
        take: 25,
        include: {
          _count: {
            select: {
              scans: true,
              redemptions: true,
            },
          },
        },
      },
      redemptions: {
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: {
          order: {
            select: {
              id: true,
              total: true,
              subtotal: true,
              status: true,
              createdAt: true,
              guestName: true,
              guestEmail: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!promotion) notFound()

  const [scanAggregate, reservedRedemptions, confirmedRedemptions, auditLogs, products, categories] =
    await Promise.all([
      prisma.promotionCoupon.aggregate({
        where: { promotionId: promotion.id },
        _sum: { scanCount: true },
      }),
      prisma.couponRedemption.count({
        where: {
          promotionId: promotion.id,
          status: 'RESERVED',
        },
      }),
      prisma.couponRedemption.findMany({
        where: {
          promotionId: promotion.id,
          status: 'CONFIRMED',
        },
        select: {
          discountAmount: true,
          order: {
            select: {
              total: true,
              subtotal: true,
            },
          },
        },
      }),
      prisma.adminAuditLog.findMany({
        where: {
          OR: [
            { entityType: 'Promotion', entityId: promotion.id },
            {
              entityType: 'PromotionCoupon',
              entityId: {
                in: promotion.coupons.map((coupon) => coupon.code),
              },
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.product.findMany({
        where: {
          id: {
            in: [...promotion.allowedProductIds, ...promotion.excludedProductIds],
          },
        },
        select: { id: true, name: true },
      }),
      prisma.category.findMany({
        where: {
          id: {
            in: [...promotion.allowedCategoryIds, ...promotion.excludedCategoryIds],
          },
        },
        select: { id: true, name: true },
      }),
    ])

  const productNameById = new Map(products.map((product) => [product.id, product.name]))
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]))
  const confirmedCount = confirmedRedemptions.length
  const totalScans = scanAggregate._sum.scanCount ?? 0
  const attributedRevenue = confirmedRedemptions.reduce(
    (sum, redemption) => sum + redemption.order.total,
    0
  )
  const discountGranted = confirmedRedemptions.reduce(
    (sum, redemption) => sum + redemption.discountAmount,
    0
  )
  const scanConversionRate = totalScans > 0 ? (confirmedCount / totalScans) * 100 : 0
  const couponConversionRate =
    promotion._count.coupons > 0 ? (confirmedCount / promotion._count.coupons) * 100 : 0
  const revenuePerDiscountPeso = discountGranted > 0 ? attributedRevenue / discountGranted : null

  const metricCards = [
    ['Cupones', promotion._count.coupons.toLocaleString('es-AR')],
    ['Escaneos', totalScans.toLocaleString('es-AR')],
    ['Reservas', reservedRedemptions.toLocaleString('es-AR')],
    ['Compras', confirmedCount.toLocaleString('es-AR')],
    ['Facturacion', formatMoney(attributedRevenue)],
    ['Descuento', formatMoney(discountGranted)],
    ['Conv. escaneo', formatPercent(scanConversionRate)],
    ['Conv. cupon', formatPercent(couponConversionRate)],
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/admin/promociones"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition-colors hover:border-orange-300 hover:text-orange-700"
        >
          <ArrowLeft size={16} />
          Promociones
        </Link>
        <Link
          href={`/admin/auditoria?entity=Promotion&entityId=${encodeURIComponent(promotion.id)}`}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition-colors hover:border-orange-300 hover:text-orange-700"
        >
          <ClipboardList size={16} />
          Auditoria
        </Link>
      </div>

      <div className="rounded-[28px] bg-gray-950 p-6 text-white shadow-xl shadow-gray-950/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/70">
              <Ticket size={14} />
              Campana
            </div>
            <h1 className="text-2xl font-black">{promotion.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
              {promotion.audienceLabel || 'Sin audiencia declarada'} ·{' '}
              {promotion.discountKind === 'PERCENTAGE'
                ? `${promotion.discountValue}% OFF`
                : `${formatMoney(promotion.discountValue)} OFF`}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusTheme(promotion.status)}`}>
            {promotion.status}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {metricCards.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-orange-500" />
            <h2 className="font-black text-gray-900">Embudo</h2>
          </div>
          <div className="space-y-3">
            {[
              ['Generados', promotion._count.coupons],
              ['Escaneados', totalScans],
              ['Reservados', reservedRedemptions],
              ['Compras confirmadas', confirmedCount],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <span className="text-sm font-bold text-gray-600">{label}</span>
                <span className="text-sm font-black text-gray-900">{Number(value).toLocaleString('es-AR')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-gray-900">Reglas y alcance</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <p>Minimo: {promotion.minOrderAmount ? formatMoney(promotion.minOrderAmount) : 'sin minimo'}</p>
            <p>{promotion.firstOrderOnly ? 'Solo primera compra' : 'Sin regla de primera compra'}</p>
            <p>Limite total: {promotion.maxUses ?? 'sin tope'}</p>
            <p>Limite por usuario: {promotion.perUserLimit ?? 'sin limite'}</p>
            <p>Retorno estimado: {revenuePerDiscountPeso ? `${revenuePerDiscountPeso.toFixed(1)}x` : '-'}</p>
          </div>
          <div className="mt-5 space-y-3 text-xs">
            <p className="font-black uppercase tracking-[0.14em] text-gray-500">Categorias permitidas</p>
            <p className="text-gray-700">
              {promotion.allowedCategoryIds.map((id) => categoryNameById.get(id) || id).join(', ') || 'Todas'}
            </p>
            <p className="font-black uppercase tracking-[0.14em] text-gray-500">Categorias excluidas</p>
            <p className="text-gray-700">
              {promotion.excludedCategoryIds.map((id) => categoryNameById.get(id) || id).join(', ') || 'Ninguna'}
            </p>
            <p className="font-black uppercase tracking-[0.14em] text-gray-500">Productos permitidos</p>
            <p className="text-gray-700">
              {promotion.allowedProductIds.map((id) => productNameById.get(id) || id).join(', ') || 'Todos'}
            </p>
            <p className="font-black uppercase tracking-[0.14em] text-gray-500">Productos excluidos</p>
            <p className="text-gray-700">
              {promotion.excludedProductIds.map((id) => productNameById.get(id) || id).join(', ') || 'Ninguno'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-black text-gray-900">Ultimos cupones</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {promotion.coupons.map((coupon) => (
              <div key={coupon.code} className="px-5 py-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono font-black text-gray-900">{coupon.code}</p>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600">
                      {coupon.status}
                    </span>
                    <Link
                      href={`/admin/auditoria?entity=PromotionCoupon&entityId=${encodeURIComponent(coupon.code)}`}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700"
                    >
                      Auditoria
                    </Link>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {[coupon.recipientName, coupon.recipientBusiness, coupon.batchName]
                    .filter(Boolean)
                    .join(' · ') || 'Sin destinatario'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Escaneos: {coupon.scanCount} · redenciones: {coupon._count.redemptions}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-black text-gray-900">Actividad reciente</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {auditLogs.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-500">Sin eventos recientes.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="px-5 py-4 text-sm">
                  <p className="font-bold text-gray-900">{log.description || log.action}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDate(log.createdAt)} · {log.actorEmail || 'sistema'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-black text-gray-900">Ultimas redenciones</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {promotion.redemptions.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-500">Todavia no hay redenciones.</p>
          ) : (
            promotion.redemptions.map((redemption) => (
              <div
                key={redemption.id}
                className="grid gap-2 px-5 py-4 text-sm md:grid-cols-[1fr_160px_120px_120px]"
              >
                <div>
                  <p className="font-bold text-gray-900">
                    {redemption.order.user?.name ||
                      redemption.order.guestName ||
                      redemption.order.user?.email ||
                      redemption.order.guestEmail ||
                      'Cliente sin nombre'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{redemption.couponCode}</p>
                </div>
                <p className="text-gray-600">{redemption.status}</p>
                <p className="font-bold text-gray-900">{formatMoney(redemption.order.total)}</p>
                <p className="text-gray-500">{formatDate(redemption.createdAt)}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
