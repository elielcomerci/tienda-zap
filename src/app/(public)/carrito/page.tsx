'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Wallet,
} from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { useCreditEligibility } from '@/lib/use-credit-eligibility'
import ZapCreditSimulationCard from '@/components/public/ZapCreditSimulationCard'
import OrderItemOptions from '../checkout/OrderItemOptions'

export default function CartPage() {
  const { items, removeItem, updateQuantity, updateNotes, total, clearCart } = useCartStore()
  const count = useCartStore((state) => state.itemCount())
  const hasUnavailableItems = items.some((item) => item.price <= 0)
  const { eligibility, isLoading } = useCreditEligibility()
  const totalAmount = total()

  if (items.length === 0) {
    return (
      <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fff8f1_24%,#f8fafc_100%)]">
        <div className="mx-auto max-w-[980px] px-4 py-20 sm:py-24">
          <div className="rounded-[36px] border border-gray-200 bg-white px-6 py-16 text-center shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:px-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 text-orange-500">
              <ShoppingBag size={36} />
            </div>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
              Carrito vacio
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
              Todavia no elegiste tus piezas.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-gray-600">
              Cuando empieces a sumar productos, aca vas a ver el pedido armado con cantidades,
              variantes y una salida clara al checkout.
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
      <div className="mx-auto max-w-[1380px] px-4 pb-16 pt-8 sm:pt-10 xl:px-8">
        <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
                  Paso 1 de 3
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600">
                  {count} item{count === 1 ? '' : 's'} activos
                </span>
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
                Tu pedido ya tiene forma.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-gray-600">
                Revisamos cantidad, variantes, notas y preparacion del archivo antes de pasar al
                checkout. La idea es que todo se vea claro tambien en desktop.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Total visible
                </p>
                <p className="mt-2 text-2xl font-black text-gray-950">
                  ${totalAmount.toLocaleString('es-AR')}
                </p>
                <p className="mt-1 text-sm text-gray-600">sin pasos ocultos</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Preparacion
                </p>
                <p className="mt-2 text-base font-bold text-gray-950">
                  Archivos o diseno
                </p>
                <p className="mt-1 text-sm text-gray-600">lo dejas marcado desde ahora</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Checkout
                </p>
                <p className="mt-2 text-base font-bold text-gray-950">Datos y pago</p>
                <p className="mt-1 text-sm text-gray-600">en una sola vista ordenada</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
          <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-8">
            <div className="flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                  Tu carrito
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950">
                  Revisa cada linea del pedido.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">
                  Puedes ajustar cantidades, sumar observaciones y dejar definido si el trabajo va
                  con archivo final o con pedido de diseno.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href="/productos" className="btn-secondary">
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
                  className="rounded-[28px] border border-gray-200 bg-gray-50/60 p-5"
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
                              {item.isService ? 'Servicio' : 'Produccion'}
                            </span>
                            {item.creditDownPaymentPercent ? (
                              <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
                                Credito ZAP {item.creditDownPaymentPercent}%
                              </span>
                            ) : null}
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
                              <p className="mt-2 text-lg font-black text-orange-600">
                                ${(item.price * item.quantity).toLocaleString('es-AR')}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white bg-white p-4">
                            <label className="label">Nota para este trabajo</label>
                            <input
                              type="text"
                              placeholder="Algo importante para este producto?"
                              value={item.notes || ''}
                              onChange={(event) =>
                                updateNotes(item.cartItemId!, event.target.value)
                              }
                              className="input"
                            />
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white bg-white p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                            Preparacion
                          </p>
                          <p className="mt-2 text-sm font-semibold text-gray-900">
                            Define si envias archivo final o si prefieres que lo coordinemos.
                          </p>
                          <OrderItemOptions item={item} compact />
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="xl:sticky xl:top-24">
            <div className="rounded-[32px] bg-gray-950 p-6 text-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.7)]">
              <div className="border-b border-white/10 pb-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-400">
                  Resumen del pedido
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                  Todo listo para pasar al checkout.
                </h2>
                <p className="mt-2 text-sm leading-7 text-gray-300">
                  Revisamos el total, detectamos piezas no disponibles y te damos una salida clara
                  para seguir.
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Total visible
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    ${totalAmount.toLocaleString('es-AR')}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">sin pasos ocultos</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Flexibilidad
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-white">
                    <Wallet size={18} className="text-orange-300" />
                    <span className="text-sm font-semibold">
                      Tarjeta, transferencia o Credito ZAP
                    </span>
                  </div>
                </div>
              </div>

              {hasUnavailableItems ? (
                <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
                  Hay piezas que todavia no estan listas para compra online. Quitalas antes de
                  continuar.
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                  El pedido esta en condiciones de pasar al checkout.
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
                    <span className="shrink-0 text-sm font-semibold text-orange-300">
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
                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xl font-black text-white">
                  <span>Total</span>
                  <span>${totalAmount.toLocaleString('es-AR')}</span>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {hasUnavailableItems ? (
                  <button
                    type="button"
                    disabled
                    className="flex w-full cursor-not-allowed items-center justify-center rounded-[24px] bg-white/10 px-6 py-4 text-sm font-semibold text-gray-400"
                  >
                    Revisa el carrito
                  </button>
                ) : (
                  <Link
                    href="/checkout"
                    className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-orange-500 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition-all hover:-translate-y-0.5 hover:bg-orange-400"
                  >
                    Cerrar pedido <ArrowRight size={18} />
                  </Link>
                )}

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck size={18} className="mt-0.5 shrink-0 text-orange-300" />
                    <p className="text-sm leading-7 text-gray-300">
                      En el checkout confirmas datos, eliges medio de pago y dejas el pedido listo
                      para avanzar sin friccion.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-8 rounded-[32px] border border-orange-200 bg-white/70 p-4 shadow-[0_18px_50px_-42px_rgba(249,115,22,0.35)] sm:p-5">
          <ZapCreditSimulationCard
            totalAmount={totalAmount}
            items={items.map((item) => ({
              unitPrice: item.price,
              quantity: item.quantity,
              creditDownPaymentPercent: item.creditDownPaymentPercent ?? 30,
            }))}
            eligibility={eligibility}
            isLoading={isLoading}
            title="Asi podria moverse con Credito ZAP"
            description="Una vista rapida para saber si hoy te conviene resolverlo con mas aire."
          />
        </div>
      </div>
    </div>
  )
}
