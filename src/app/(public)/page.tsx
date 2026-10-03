import Link from 'next/link'
import {
  ArrowRight,
  MessageCircleMore,
} from 'lucide-react'
import { getProducts, getCombos } from '@/lib/products'
import { getPublicSituations } from '@/lib/discovery'
import { getPublicBusinessTypes } from '@/lib/business-types'
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

  const [allProducts, combos, situations, businessTypes] = await Promise.all([
    getProducts(undefined, undefined, { take: 20 }),
    getCombos(businessTypeId),
    getPublicSituations(),
    getPublicBusinessTypes(),
  ])

  const salesWhatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    ? `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(
        'Hola! Estoy viendo la tienda y quiero elegir lo mejor para mi negocio.'
      )}`
    : null


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
              Contanos qué está pasando.
            </h1>

            {/* Rubros chips */}
            {businessTypes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {businessTypes.map((bt) => (
                  <Link
                    key={bt.id}
                    href={`/productos?mode=rubro&rubro=${bt.slug}`}
                    className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-[#F7638B]/30 hover:bg-[#FEF1F5] hover:text-[#C2103F]"
                  >
                    {bt.name}
                  </Link>
                ))}
              </div>
            )}

            {/* CTA secundario */}
            <div>
              <Link
                href="/productos?mode=product"
                className="btn-secondary !px-7 !py-3.5 !text-base"
              >
                Ya sé qué necesito <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. SITUACIONES ────────────────────────────────────────── */}
      <ObjectivesSection situations={situations} />

      {/* ── 3. SOLUCIONES (Combos/Packs) ──────────────────────────── */}
      <ComboSection combos={combos} businessTypeName={businessTypeName} />

      {/* ── 4. COSAS / DESARROLLOS ────────────────────────────────── */}
      <CatalogEntrySection products={allProducts} />

      {/* ── 5. CIERRE ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1380px] px-4 py-12 xl:px-8">
        <div className="rounded-[30px] border border-[#F7638B]/20 bg-gradient-to-br from-[#fff8fb] via-white to-[#f0f5ff] p-8 text-center shadow-[0_18px_50px_-42px_rgba(237,22,79,0.12)]">
          <h2 className="text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">
            ¿No encontrás lo que necesitás? Hablemos.
          </h2>
          {salesWhatsappUrl && (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href={salesWhatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary !px-7 !py-3"
              >
                <MessageCircleMore size={16} />
                Hablar con ZAP
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
