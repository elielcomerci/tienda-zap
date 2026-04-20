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
    <section className="overflow-hidden rounded-[32px] border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 shadow-[0_18px_50px_-42px_rgba(249,115,22,0.55)]">
      <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center xl:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Credito ZAP
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-gray-950">
            Activalo hoy con anticipo desde el {downPaymentPercent}%.
          </h2>

          <div className="mt-6 grid gap-3 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <BadgePercent size={15} className="text-orange-500" />
                Anticipo
              </div>
              <p className="mt-2 text-lg font-black text-gray-900">Desde {downPaymentPercent}%</p>
              <p className="mt-1 text-xs text-gray-500">Segun producto.</p>
            </div>

            <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <Wallet size={15} className="text-orange-500" />
                Seguimiento
              </div>
              <p className="mt-2 text-lg font-black text-gray-900">Todo en tu cuenta</p>
              <p className="mt-1 text-xs text-gray-500">Pedido, cuotas y comprobantes.</p>
            </div>

            <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <ShieldCheck size={15} className="text-orange-500" />
                Info clara
              </div>
              <p className="mt-2 text-lg font-black text-gray-900">Sin vueltas</p>
              <p className="mt-1 text-xs text-gray-500">Condiciones claras antes de avanzar.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-orange-100 bg-white/90 p-5 shadow-sm xl:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-900">
            Siguiente paso
          </p>
          <p className="mt-3 text-sm leading-7 text-gray-600">Ve el detalle o hablalo con nosotros.</p>

          <div className="mt-5 flex flex-col gap-3">
            <Link href="/credito-zap" className="btn-secondary justify-center">
              Ver credito
            </Link>
            {whatsappUrl && (
              <Link
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary justify-center"
              >
                <MessageCircleMore size={18} />
                Consultar este trabajo
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
