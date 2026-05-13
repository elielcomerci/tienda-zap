'use client'

import Link from 'next/link'
import { BadgePercent, ChevronDown, MessageCircleMore } from 'lucide-react'
import { useState } from 'react'

export default function ProductZapCreditPromo({
  downPaymentPercent,
  whatsappUrl,
}: {
  downPaymentPercent: number
  whatsappUrl: string | null
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#F66B9A]/20 bg-gradient-to-r from-[#FEF1F6] via-white to-[#F0F5FA]">
      {/* Collapsed bar — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#FEF1F6]/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FEF1F6] text-[#ED2C71]">
            <BadgePercent size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">
              Crédito ZAP — anticipo desde {downPaymentPercent}%
            </p>
            <p className="text-xs text-gray-500">
              Financiación directa con seguimiento en tu cuenta.
            </p>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-gray-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expandable content */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[#F66B9A]/10 px-5 pb-5 pt-4">
            <p className="text-sm leading-7 text-gray-600">
              Resolvé este trabajo con un anticipo y seguimiento claro de cuotas y comprobantes desde tu cuenta.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/crédito-zap" className="btn-secondary !py-2 !px-4 !text-xs">
                Ver detalle
              </Link>
              {whatsappUrl && (
                <Link
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary !py-2 !px-4 !text-xs"
                >
                  <MessageCircleMore size={14} />
                  Consultar
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
