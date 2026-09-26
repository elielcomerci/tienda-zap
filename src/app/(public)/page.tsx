import Link from 'next/link'
import {
  ArrowRight,
  MessageCircleMore,
} from 'lucide-react'
import { getPublicCategories } from '@/lib/categories'
import { getProducts, getCombos } from '@/lib/products'
import { getPublicIntentions } from '@/lib/intentions'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import ComboSection from '@/components/public/ComboSection'
import ObjectivesSection from '@/components/public/ObjectivesSection'
import CatalogEntrySection from '@/components/public/CatalogEntrySection'

export const metadata = {
  title: 'Tienda ZAP — Soluciones concretas para tu marca',
  description:
    'Soluciones concretas para tu marca, tu local, tus ventas y cada punto de contacto.',
}

export default async function HomePage() {
  const session = await auth()
  let businessTypeName: string | null = null
  let businessTypeId: string | null = null

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        businessType: true,
      },
    })
    if (user?.businessType) {
      businessTypeId = user.businessType.id
      businessTypeName = user.businessType.name
    }
  }

  const [categories, allProducts, combos, intentions] = await Promise.all([
    getPublicCategories(),
    getProducts(undefined, undefined, { take: 20 }),
    getCombos(businessTypeId),
    getPublicIntentions(),
  ])

  const salesWhatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    ? `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(
        'Hola! Estoy viendo la tienda y quiero elegir lo mejor para mi negocio.'
      )}`
    : null

  const zapWebsiteUrl = 'https://zap.com.ar'

  return (
    <div className="bg-[linear-gradient(180deg,#fffbfd_0%,#FEF1F5_8%,#f8fafc_100%)]">
      {/* ── 1. HERO ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[#F7638B]/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(237,22,79,0.09),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(69,118,185,0.07),transparent_32%)]" />

        <div className="relative mx-auto max-w-[1380px] px-4 pb-16 pt-10 xl:px-8 xl:pb-20">
          <div className="max-w-3xl space-y-6">
            {/* Label */}
            <span className="inline-block rounded-full bg-[#FEF1F5] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C2103F]">
              Tienda ZAP
            </span>

            {/* H1 */}
            <h1 className="text-5xl font-black tracking-tight text-gray-950 sm:text-6xl xl:text-7xl">
              ¿Qué necesitás hacer?
            </h1>

            {/* Bajada */}
            <p className="max-w-xl text-base leading-8 text-gray-600 sm:text-lg">
              Soluciones concretas para tu marca, tu local, tus ventas y cada
              punto de contacto.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/productos"
                className="btn-primary !px-7 !py-3.5 !text-base"
              >
                Ver opciones <ArrowRight size={18} />
              </Link>
              {salesWhatsappUrl && (
                <Link
                  href={salesWhatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary !px-7 !py-3.5 !text-base"
                >
                  <MessageCircleMore size={18} />
                  Hablar con ZAP
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. OBJETIVOS ──────────────────────────────────────────── */}
      <ObjectivesSection intentions={intentions} />

      {/* ── 3. SOLUCIONES (Combos/Packs) ──────────────────────────── */}
      <ComboSection combos={combos} businessTypeName={businessTypeName} />

      {/* ── 4. COSAS / DESARROLLOS ────────────────────────────────── */}
      <CatalogEntrySection products={allProducts} />

      {/* ── 5. RUBROS / CATEGORÍAS ────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="border-y border-gray-100 bg-white">
          <div className="mx-auto max-w-[1380px] px-4 py-12 xl:px-8">
            <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.10)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
                    También por rubro
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-gray-950">
                    Si preferís entrar por rubro, las categorías quedan a mano.
                  </h2>
                </div>
                <Link
                  href="/productos"
                  className="shrink-0 text-sm font-semibold text-[#ED164F] hover:text-[#C2103F]"
                >
                  Abrir catálogo completo
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/productos?cat=${category.slug}`}
                    className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#F7638B]/30 hover:bg-[#FEF1F5] hover:text-[#C2103F]"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 6. CTA HACIA ZAP ──────────────────────────────────────── */}
      <section className="mx-auto max-w-[1380px] px-4 py-12 xl:px-8">
        <div className="rounded-[30px] border border-[#F7638B]/20 bg-gradient-to-br from-[#fff8fb] via-white to-[#f0f5ff] p-8 text-center shadow-[0_18px_50px_-42px_rgba(237,22,79,0.12)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ED164F]">
            ¿Necesitás algo que no aparece acá?
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">
            Hablemos. Seguro lo resolvemos.
          </h2>
          <p className="mt-3 max-w-lg mx-auto text-sm leading-7 text-gray-500">
            Si lo que buscás no está en el catálogo, escribinos. Trabajamos
            sobre lo que tu negocio necesita, no sobre lo que tenemos armado.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {salesWhatsappUrl && (
              <Link
                href={salesWhatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary !px-7 !py-3"
              >
                <MessageCircleMore size={16} />
                Hablar con ZAP
              </Link>
            )}
            <Link
              href={zapWebsiteUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary !px-7 !py-3"
            >
              Ver todo lo que hacemos <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
