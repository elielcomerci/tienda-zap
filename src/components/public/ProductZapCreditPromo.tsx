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
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#FEF1F6]/50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FEF1F6] text-[#ED2C71]">
            <BadgePercent size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900">
              Crédito ZAP desde {downPaymentPercent}%
            </p>
            <p className="text-xs text-gray-500">Simulación antes de confirmar.</p>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-gray-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap gap-3 border-t border-[#F66B9A]/10 px-5 pb-5 pt-4">
            <Link href="/credito-zap" className="btn-secondary !py-2 !px-4 !text-xs">
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
    </section>
  )
}
