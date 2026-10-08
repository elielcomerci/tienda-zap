import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { buildWhatsappUrl } from '@/lib/whatsapp'
import { getPublicCatalogTypes } from '@/lib/products'
import { getPublicSituations } from '@/lib/discovery'
import { getPublicBusinessTypes } from '@/lib/business-types'
import HomeLandingSections from '@/components/public/HomeLandingSections'

export const metadata = {
  title: 'Tienda ZAP — Soluciones concretas para tu marca',
  description:
    'Soluciones concretas para tu marca, tu local, tus ventas y cada punto de contacto.',
}

export default async function HomePage() {
  const [catalogTypes, situations, businessTypes] = await Promise.all([
    getPublicCatalogTypes(),
    getPublicSituations(),
    getPublicBusinessTypes(),
  ])

  const salesWhatsappUrl = buildWhatsappUrl(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    'Hola! Estoy viendo la tienda y quiero contarles qué está pasando en mi negocio.'
  )

  return (
    <div className="bg-white">
      <HomeLandingSections
        businessTypes={businessTypes}
        situations={situations}
        products={catalogTypes}
      />

      {/* ── 5. CIERRE ─────────────────────────────────────────────── */}
      <section className="bg-black text-white">
        <div className="mx-auto max-w-[1380px] px-4 py-16 sm:py-20 xl:px-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                ¿No sabés por dónde empezar?
              </h2>
              <p className="mt-2 text-base sm:text-lg text-gray-400">
                Contanos qué está pasando en tu negocio.
              </p>
            </div>
            {salesWhatsappUrl ? (
              <Link
                href={salesWhatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ED164F] px-8 py-4 text-base font-bold text-white transition-all hover:bg-[#C2103F] active:scale-[0.98]"
              >
                Hablemos <ArrowRight size={18} />
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}
