import Link from 'next/link'
import { BadgePercent, Building2, MessageCircleMore, Repeat } from 'lucide-react'

export default function ProductZapCreditPromo({
  productName,
  categoryName,
  downPaymentPercent,
  whatsappUrl,
}: {
  productName: string
  categoryName: string
  downPaymentPercent: number
  whatsappUrl: string | null
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 shadow-sm">
      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Credito ZAP
          </p>
          <h2 className="mt-2 text-2xl font-black text-gray-900">
            Este producto tambien se puede mover sin descapitalizar tu negocio
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            Si {productName.toLowerCase()} resuelve una necesidad puntual de tu local, podes
            trabajarlo con anticipo desde el {downPaymentPercent}% y adaptar el saldo a un plan
            fijo pensado para comercios.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/80 bg-white/90 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <BadgePercent size={15} className="text-orange-500" />
                Anticipo
              </div>
              <p className="mt-2 text-lg font-black text-gray-900">Desde {downPaymentPercent}%</p>
              <p className="mt-1 text-xs text-gray-500">Se define por producto e historial.</p>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/90 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <Repeat size={15} className="text-orange-500" />
                Flexibilidad
              </div>
              <p className="mt-2 text-lg font-black text-gray-900">Pagos a medida</p>
              <p className="mt-1 text-xs text-gray-500">
                Ajusta frecuencia y cantidad de pagos en checkout.
              </p>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/90 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <Building2 size={15} className="text-orange-500" />
                Para comercios
              </div>
              <p className="mt-2 text-lg font-black text-gray-900">Ideal para {categoryName}</p>
              <p className="mt-1 text-xs text-gray-500">
                Pensado para resolver necesidades reales de negocio.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-orange-100 bg-white/90 p-5">
          <p className="text-sm font-semibold text-gray-900">Como seguir con este producto</p>
          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <p>1. Configuralo y agregalo al carrito para simular el credito real.</p>
            <p>2. En checkout elegi Credito ZAP y ajusta el plan segun tu caja.</p>
            <p>3. Si preferis, te lo prearmamos por WhatsApp con este producto como base.</p>
          </div>

          <div className="mt-5 flex flex-col gap-3">
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

            <p className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/70 px-4 py-3 text-sm text-orange-900">
              Vendedores y clientes pueden usar esta misma ficha como base para conversar el caso y
              cerrar el plan sobre una necesidad concreta.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
