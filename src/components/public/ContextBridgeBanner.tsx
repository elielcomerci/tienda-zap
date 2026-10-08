'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

const ZAP_RUBRO_PATHS: Record<string, string> = {
  gastronomia: '/gastronomia/primer-paso',
  'moda-showrooms': '/moda/primer-paso',
  inmobiliarias: '/inmobiliarias/primer-paso',
  'belleza-salud': '/belleza-y-salud/primer-paso',
  'comercios-retail': '/retail/primer-paso',
  'eventos-experiencias': '/eventos/primer-paso',
  wellness: '/gym-y-yoga/primer-paso',
}

type Props = {
  businessTypeName?: string
  businessTypeSlug?: string
}

export default function ContextBridgeBanner({ businessTypeName, businessTypeSlug }: Props) {
  const hasRubro = Boolean(businessTypeSlug && businessTypeName)
  const href = hasRubro ? ZAP_RUBRO_PATHS[businessTypeSlug!] || 'https://zap.com.ar/' : 'https://zap.com.ar/'

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
      <div className="min-w-0 max-w-4xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/75">
          ZAP · UNA MIRADA MÁS AMPLIA
        </p>

        {hasRubro ? (
          <>
            <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
              ¿Todavía no sabés qué necesitás?
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/90 sm:text-base sm:leading-7">
              <Link
                href={href}
                className="inline-flex items-center gap-1.5 font-bold text-white underline decoration-white/80 decoration-2 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Hacé el Primer paso <ArrowUpRight size={16} strokeWidth={2.5} />
              </Link>{' '}
              y obtené sugerencias concretas para <strong className="font-bold">{businessTypeName}</strong>.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
              ¿Querés ver todo lo que podemos hacer por tu negocio?
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/90 sm:text-base sm:leading-7">
              Conocé todo lo que podemos hacer por él.
            </p>
          </>
        )}
      </div>

      {!hasRubro && (
        <Link
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-2 self-start border-b-2 border-white/80 pb-2 text-sm font-bold text-white transition-colors hover:border-white sm:self-center sm:text-base"
        >
          Conocer ZAP
          <ArrowUpRight size={18} strokeWidth={2.5} />
        </Link>
      )}
    </div>
  )
}
