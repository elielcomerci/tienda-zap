'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { useRef, type CSSProperties, type PointerEvent } from 'react'

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
  const ref = useRef<HTMLDivElement>(null)
  const hasRubro = Boolean(businessTypeSlug && businessTypeName)
  const href = hasRubro ? ZAP_RUBRO_PATHS[businessTypeSlug!] || 'https://zap.com.ar/' : 'https://zap.com.ar/'

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const element = ref.current
    if (!element || event.pointerType === 'touch') return

    const rect = element.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100

    element.style.setProperty('--mx', `${x}%`)
    element.style.setProperty('--my', `${y}%`)
  }

  function handlePointerLeave() {
    const element = ref.current
    if (!element) return
    element.style.setProperty('--mx', '50%')
    element.style.setProperty('--my', '50%')
  }

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="zap-context-bridge group relative isolate block w-full overflow-hidden rounded-[24px] border border-gray-200/80 bg-[#101014] px-5 py-5 text-white transition-[border-color,transform] duration-500 hover:-translate-y-0.5 hover:border-gray-300 sm:px-7 sm:py-6"
      style={
        {
          '--mx': '50%',
          '--my': '50%',
        } as CSSProperties
      }
    >
      <span className="zap-context-bridge__wash" aria-hidden="true" />
      <span className="zap-context-bridge__wash zap-context-bridge__wash--secondary" aria-hidden="true" />
      <span className="zap-context-bridge__grain" aria-hidden="true" />

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <span className="min-w-0 max-w-3xl">
          <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
            ZAP
          </span>

          {hasRubro ? (
            <>
              <span className="mt-1.5 block text-xl font-black tracking-tight sm:text-2xl">
                ¿Todavía no sabés qué necesitás?
              </span>
              <span className="mt-1 block text-sm leading-6 text-white/70 sm:text-[15px]">
                <Link
                  href={href}
                  className="inline-flex items-center gap-1 font-bold text-white underline decoration-[#ED164F] decoration-2 underline-offset-4 transition-colors hover:text-white/80 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ED164F]"
                >
                  Hacé el Primer paso <ArrowUpRight size={14} strokeWidth={2.5} />
                </Link>{' '}
                y obtené sugerencias concretas para{' '}
                <strong className="font-semibold text-white">{businessTypeName}</strong>.
              </span>
            </>
          ) : (
            <>
              <span className="mt-1.5 block text-xl font-black tracking-tight sm:text-2xl">
                ¿Querés ver todo lo que podemos hacer por tu negocio?
              </span>
              <span className="mt-1 block text-sm leading-6 text-white/65 sm:text-[15px]">
                Conocé todo lo que podemos hacer por él.
              </span>
            </>
          )}
        </span>

        {!hasRubro && (
          <Link
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:border-white/25 hover:bg-white/[0.1] sm:self-center"
          >
            Conocer ZAP
            <ArrowUpRight size={16} strokeWidth={2.5} />
          </Link>
        )}
      </div>

      <style jsx>{`
        .zap-context-bridge {
          --mx: 50%;
          --my: 50%;
          isolation: isolate;
        }

        .zap-context-bridge__wash,
        .zap-context-bridge__wash--secondary {
          position: absolute;
          inset: -45%;
          z-index: -2;
          pointer-events: none;
          background:
            radial-gradient(
              circle at var(--mx) var(--my),
              rgba(237, 22, 79, 0.28) 0%,
              rgba(237, 22, 79, 0.12) 13%,
              transparent 34%
            ),
            radial-gradient(
              circle at 25% 80%,
              rgba(118, 74, 255, 0.22) 0%,
              transparent 34%
            ),
            radial-gradient(
              circle at 82% 18%,
              rgba(0, 205, 255, 0.16) 0%,
              transparent 31%
            );
          filter: blur(30px) saturate(115%);
          transform: translate3d(-2%, 1%, 0) scale(1.04);
          animation: zapBridgeFloat 11s ease-in-out infinite alternate;
          transition: transform 900ms cubic-bezier(.22,1,.36,1);
        }

        .zap-context-bridge__wash--secondary {
          inset: -60%;
          opacity: 0.72;
          background:
            radial-gradient(
              circle at 68% 62%,
              rgba(255, 0, 112, 0.18) 0%,
              transparent 27%
            ),
            radial-gradient(
              circle at 38% 24%,
              rgba(74, 94, 255, 0.17) 0%,
              transparent 30%
            ),
            radial-gradient(
              circle at var(--mx) var(--my),
              rgba(255, 255, 255, 0.07) 0%,
              transparent 19%
            );
          filter: blur(42px);
          animation: zapBridgeFloatReverse 15s ease-in-out infinite alternate;
        }

        .zap-context-bridge:hover .zap-context-bridge__wash {
          transform: translate3d(2%, -2%, 0) scale(1.08);
        }

        .zap-context-bridge__grain {
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          opacity: 0.075;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.8'/%3E%3C/svg%3E");
          mix-blend-mode: soft-light;
        }

        @keyframes zapBridgeFloat {
          0% { transform: translate3d(-3%, 1%, 0) scale(1.03) rotate(-1deg); }
          100% { transform: translate3d(3%, -2%, 0) scale(1.08) rotate(1deg); }
        }

        @keyframes zapBridgeFloatReverse {
          0% { transform: translate3d(2%, -2%, 0) scale(1.04) rotate(1deg); }
          100% { transform: translate3d(-3%, 2%, 0) scale(1.09) rotate(-1deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .zap-context-bridge__wash,
          .zap-context-bridge__wash--secondary {
            animation: none;
            transition: none;
          }

          .zap-context-bridge {
            transition: border-color 200ms ease;
          }
        }
      `}
      </style>
    </div>
  )
}
