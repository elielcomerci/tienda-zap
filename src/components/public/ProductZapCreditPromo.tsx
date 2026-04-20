import Link from 'next/link'
import { BadgePercent, MessageCircleMore, ShieldCheck, Wallet } from 'lucide-react'

export default function ProductZapCreditPromo({
  downPaymentPercent,
  whatsappUrl,
}: {
  downPaymentPercent: number
  whatsappUrl: string | null
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 shadow-sm">
      <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Credito ZAP
          </p>
          <h2 className="mt-2 text-2xl font-black text-gray-900">
            Financia este pedido con anticipo desde el {downPaymentPercent}%
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            Confirmas hoy y ordenas el saldo en pagos fijos. La explicacion completa vive en una
            sola pagina para no llenarte esta ficha de texto.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/80 bg-white/90 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <BadgePercent size={15} className="text-orange-500" />
                Anticipo
              </div>
              <p className="mt-2 text-lg font-black text-gray-900">Desde {downPaymentPercent}%</p>
              <p className="mt-1 text-xs text-gray-500">Segun producto e historial.</p>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/90 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <Wallet size={15} className="text-orange-500" />
                Seguimiento
              </div>
              <p className="mt-2 text-lg font-black text-gray-900">Desde tu cuenta</p>
              <p className="mt-1 text-xs text-gray-500">Cuotas, estados y comprobantes.</p>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/90 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <ShieldCheck size={15} className="text-orange-500" />
                Info clara
              </div>
              <p className="mt-2 text-lg font-black text-gray-900">Sin letra chica en la ficha</p>
              <p className="mt-1 text-xs text-gray-500">Condiciones, privacidad y detalle en un solo lugar.</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-orange-100 bg-white/90 p-5 lg:min-w-[280px]">
          <p className="text-sm font-semibold text-gray-900">Mas informacion</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Si quieres entender bien como funciona el credito antes de avanzar, lo dejamos resumido
            y ordenado en una pagina dedicada.
          </p>

          <div className="mt-5 flex flex-col gap-3">
            <Link href="/credito-zap" className="btn-secondary justify-center">
              Como funciona Credito ZAP
            </Link>
            {whatsappUrl && (
              <Link
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary justify-center"
              >
                <MessageCircleMore size={18} />
                Consultar este producto por WhatsApp
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
