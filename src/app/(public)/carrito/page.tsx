'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Trash2,
} from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { buildProductsUrl, type ExplorationContext } from '@/lib/exploration-context'
import { extractCouponCode } from '@/components/public/CouponSession'
import OrderItemOptions from '../checkout/OrderItemOptions'
import OrderItemBrief from '../checkout/OrderItemBrief'

type CouponPreviewState = {
  status: 'recognized' | 'invalid'
  normalizedCode?: string
  title: string
  detail: string
  originalTotal: number
  finalTotal: number
  discountAmount: number
}

export default function CartPage() {
  const searchParams = useSearchParams()
  const rawMode = searchParams.get('mode')
  const explorationContext: ExplorationContext = {
    mode: rawMode === 'objective' ? 'situation' : rawMode === 'product' || rawMode === 'situation' || rawMode === 'rubro' ? rawMode : undefined,
    businessTypeSlug: searchParams.get('rubro') || undefined,
    situationSlug: searchParams.get('situacion') || undefined,
    needSlug: searchParams.get('necesidad') || undefined,
  }
  const continueExploringHref = buildProductsUrl(explorationContext)
  const {
    items,
    removeItem,
    updateQuantity,
    updateNotes,
    total,
    clearCart,
    couponCode,
    setCouponCode,
    clearCouponCode,
  } = useCartStore()
  const count = useCartStore((state) => state.itemCount())
  const hasUnavailableItems = items.some((item) => item.price <= 0)
  const totalAmount = total()
  const [couponDraft, setCouponDraft] = useState(couponCode || '')
  const [couponPreview, setCouponPreview] = useState<CouponPreviewState | null>(null)
  const [couponFeedback, setCouponFeedback] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const discountAmount = couponPreview?.status === 'recognized' ? couponPreview.discountAmount : 0
  const finalTotal = couponPreview?.status === 'recognized' ? couponPreview.finalTotal : totalAmount

  const reviewCoupon = useCallback(async (rawCouponCode: string, saveToSession = true, showWelcome = false) => {
    const parsedCouponCode = extractCouponCode(rawCouponCode)
    if (!parsedCouponCode) {
      setCouponPreview(null)
      setCouponFeedback('Ingresá un código de cupón válido.')
      return
    }

    setCouponLoading(true)
    setCouponFeedback('')

    try {
      const response = await fetch('/api/checkout/coupon-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: parsedCouponCode,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes,
            briefType: item.briefType,
            briefResponses: item.briefResponses,
            briefReferenceLinks: item.briefReferenceLinks,
            briefReferenceFiles: item.briefReferenceFiles,
            fileUrl: item.fileUrl,
            designRequested: item.designRequested,
            selectedOptions: item.selectedOptions,
          })),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.detail || result.error || 'No pudimos revisar el cupón.')

      const normalizedCode = result.normalizedCode || parsedCouponCode
      setCouponPreview(result)
      setCouponDraft(normalizedCode)
      if (saveToSession) {
        setCouponCode(normalizedCode)
        localStorage.setItem('saved_coupon', normalizedCode)
      }
      if (showWelcome && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zap-coupon-applied', { detail: { code: normalizedCode } }))
      }
    } catch (error: any) {
      setCouponPreview(null)
      setCouponFeedback(error.message || 'No pudimos revisar el cupón.')
    } finally {
      setCouponLoading(false)
    }
  }, [items, setCouponCode])

  useEffect(() => {
    if (!couponCode || items.length === 0) {
      setCouponPreview(null)
      return
    }
    setCouponDraft(couponCode)
    void reviewCoupon(couponCode, false)
  }, [couponCode, items, reviewCoupon])

  const clearCoupon = () => {
    clearCouponCode()
    setCouponDraft('')
    setCouponPreview(null)
    setCouponFeedback('')
    localStorage.removeItem('saved_coupon')
    document.cookie = 'zap_welcome_promo=; path=/; max-age=0; samesite=lax'
    if (window.location.hostname === 'zap.com.ar' || window.location.hostname.endsWith('.zap.com.ar')) {
      document.cookie = 'zap_welcome_promo=; path=/; domain=.zap.com.ar; max-age=0; samesite=lax'
    }
  }

  if (items.length === 0) {
    return (
      <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fff8f1_24%,#f8fafc_100%)]">
        <div className="mx-auto max-w-[980px] px-4 py-20 sm:py-24">
          <div className="rounded-[36px] border border-gray-200 bg-white px-6 py-16 text-center shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:px-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#FEF1F5] text-[#ED164F]">
              <ShoppingBag size={36} />
            </div>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#ED164F]">
              Carrito vacío
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
              Todavía no elegiste tus piezas.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-gray-600">
              Cuando empieces a sumar piezas, acá vas a ver cantidades, variantes y detalles para
              revisar antes de avanzar.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/productos" className="btn-primary !px-6 !py-3.5">
                Ver productos <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fff8f1_18%,#f8fafc_100%)]">
      <div className="mx-auto max-w-[1380px] px-4 pb-12 pt-5 sm:pt-6 xl:px-8">
        <section className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#FEF1F5] px-3 py-1 text-xs font-semibold text-[#C2103F]">Paso 1 de 3</span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-950">Tu carrito</h1>
            <span className="text-sm text-gray-500">{count} {count === 1 ? 'pieza' : 'piezas'}</span>
          </div>
          <p className="text-lg font-bold text-gray-950">Total: ${finalTotal.toLocaleString('es-AR')}</p>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ED164F]">
                  Tu carrito
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950">
                  Tus productos
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">
                  
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href={continueExploringHref} className="btn-secondary">
                  Seguir explorando
                </Link>
                <button
                  type="button"
                  onClick={clearCart}
                  className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
                >
                  Vaciar carrito
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {items.map((item) => (
                <article
                  key={item.cartItemId || item.productId}
                  className="rounded-xl border border-gray-200 bg-gray-50/60 p-4"
                >
                  <div className="flex flex-col gap-5 lg:flex-row">
                    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[24px] border border-gray-200 bg-white">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={112}
                          height={112}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-gray-300">
                          Z
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600">
                              {item.catalogType === 'DESARROLLO' ? 'Desarrollo' : 'Producción'}
                            </span>
                          </div>

                          <h3 className="mt-3 line-clamp-2 text-2xl font-black tracking-tight text-gray-950">
                            {item.name}
                          </h3>

                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <p className="mt-2 text-sm text-gray-600">
                              {item.selectedOptions
                                .map((option) => `${option.name}: ${option.value}`)
                                .join(' - ')}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.cartItemId!)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Quitar ${item.name} del carrito`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                        <div className="space-y-4">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white bg-white p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                                Precio unitario
                              </p>
                              <p className="mt-2 text-lg font-black text-gray-950">
                                ${item.price.toLocaleString('es-AR')}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-white bg-white p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                                Cantidad
                              </p>
                              <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 p-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    item.quantity > 1
                                      ? updateQuantity(item.cartItemId!, item.quantity - 1)
                                      : removeItem(item.cartItemId!)
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm transition-colors hover:bg-gray-50"
                                >
                                  <Minus size={13} />
                                </button>
                                <span className="flex-1 text-center text-sm font-semibold">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.cartItemId!, item.quantity + 1)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm transition-colors hover:bg-gray-50"
                                >
                                  <Plus size={13} />
                                </button>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-white bg-white p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                                Subtotal
                              </p>
                              <p className="mt-2 text-lg font-black text-[#ED164F]">
                                ${(item.price * item.quantity).toLocaleString('es-AR')}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white bg-white p-4">
                            <label className="label">Nota para este trabajo</label>
                            <input
                              type="text"
                              placeholder="¿Algo importante para este producto?"
                              value={item.notes || ''}
                              onChange={(event) =>
                                updateNotes(item.cartItemId!, event.target.value)
                              }
                              className="input"
                            />
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-gray-200 pt-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                      Preparación
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      
                    </p>
                    <OrderItemOptions item={item} />
                    <OrderItemBrief item={item} />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="xl:sticky xl:top-24">
            <div className="rounded-[32px] bg-gray-950 p-6 text-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.7)]">
              <div className="border-b border-white/10 pb-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#F7638B]">
                  Resumen del pedido
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                  Todo listo para avanzar.
                </h2>
                <p className="mt-2 text-sm leading-7 text-gray-300">
                  Revisamos total, disponibilidad y preparación para que el pedido avance prolijo.
                </p>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <Tag size={18} className="mt-0.5 shrink-0 text-[#F7638B]" />
                  <div>
                    <p className="text-sm font-semibold text-white">¿Tenés un cupón?</p>
                    <p className="mt-1 text-xs leading-5 text-gray-400">
                      Cargalo ahora: el descuento se refleja antes de pasar al checkout.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={couponDraft}
                    onChange={(event) => setCouponDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void reviewCoupon(couponDraft, true, true)
                      }
                    }}
                    placeholder="Código de cupón"
                    className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#F7638B]"
                  />
                  <button
                    type="button"
                    onClick={() => void reviewCoupon(couponDraft, true, true)}
                    disabled={couponLoading}
                    className="rounded-xl bg-[#ED164F] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#F7638B] disabled:cursor-wait disabled:opacity-60"
                  >
                    {couponLoading ? '...' : 'Aplicar'}
                  </button>
                </div>
                {couponPreview?.normalizedCode && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                    <span className="min-w-0 truncate">
                      {couponPreview.normalizedCode}: {couponPreview.detail}
                    </span>
                    <button
                      type="button"
                      onClick={clearCoupon}
                      className="shrink-0 font-semibold text-white underline underline-offset-2"
                    >
                      Quitar
                    </button>
                  </div>
                )}
                {couponFeedback && (
                  <p className="mt-3 rounded-xl border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100">
                    {couponFeedback}
                  </p>
                )}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Total visible
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    ${finalTotal.toLocaleString('es-AR')}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">sin pasos ocultos</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Pago
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    Tarjeta, MercadoPago o transferencia
                  </p>
                </div>
              </div>

              {hasUnavailableItems ? (
                <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
                  Hay piezas que todavía no están listas para compra online. Quitalas antes de
                  continuar.
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                  El pedido está en condiciones de avanzar.
                </div>
              )}

              <div className="mt-5 space-y-3">
                {items.map((item) => (
                  <div
                    key={item.cartItemId || item.productId}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {item.name} x{item.quantity}
                      </p>
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <p className="mt-1 text-xs text-gray-400">
                          {item.selectedOptions.map((option) => option.value).join(' - ')}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-[#F7638B]">
                      ${(item.price * item.quantity).toLocaleString('es-AR')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm text-gray-300">
                  <span>Subtotal</span>
                  <span>${totalAmount.toLocaleString('es-AR')}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-sm text-emerald-200">
                    <span>Descuento {couponPreview?.normalizedCode ? `(${couponPreview.normalizedCode})` : ''}</span>
                    <span>-${discountAmount.toLocaleString('es-AR')}</span>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xl font-black text-white">
                  <span>Total</span>
                  <span>${finalTotal.toLocaleString('es-AR')}</span>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {hasUnavailableItems ? (
                  <button
                    type="button"
                    disabled
                    className="flex w-full cursor-not-allowed items-center justify-center rounded-[24px] bg-white/10 px-6 py-4 text-sm font-semibold text-gray-400"
                  >
                    Revisá el carrito
                  </button>
                ) : (
                  <Link
                    href="/checkout"
                    className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-[#ED164F] px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-[#ED164F]/30 transition-all hover:-translate-y-0.5 hover:bg-[#F7638B]"
                  >
                    Cerrar pedido <ArrowRight size={18} />
                  </Link>
                )}

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#F7638B]" />
                    <p className="text-sm leading-7 text-gray-300">
                      En el siguiente paso confirmás datos, elegís medio de pago y dejamos el
                      trabajo listo para empezar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

      </div>
    </div>
  )
}
