import Link from 'next/link'
import {
  ArrowRight,
  BadgePercent,
  Building2,
  CheckCircle2,
  FileText,
  MessageCircleMore,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { buildWhatsappUrl } from '@/lib/whatsapp'

export const metadata = {
  title: 'Credito ZAP',
  description:
    'Conoce como funciona Credito ZAP, que informacion usamos y como acompanamos cada pedido.',
}

const highlights = [
  {
    icon: BadgePercent,
    title: 'Anticipo claro',
    description: 'Cada producto define un anticipo minimo para confirmar el pedido sin frenar tu compra.',
  },
  {
    icon: Wallet,
    title: 'Plan simple',
    description: 'El saldo se organiza en pagos fijos y puedes seguirlo desde tu cuenta.',
  },
  {
    icon: ShieldCheck,
    title: 'Condiciones visibles',
    description: 'Mostramos simulacion, tasa y vencimientos antes de que confirmes.',
  },
]

const steps = [
  'Eliges tus productos, revisas el anticipo estimado y simulas el plan en checkout.',
  'Confirmas el pedido con el anticipo y ZAP deja cerrado el esquema de pagos de esa compra.',
  'Desde tu cuenta puedes seguir cuotas, comprobantes, estados y proximos vencimientos.',
]

const requirements = [
  'Cuenta iniciada para poder registrar el credito y asociarlo a tu historial.',
  'Datos basicos del pedido, facturacion y envio completos para emitir y coordinar el trabajo.',
  'Revision automatica de condiciones vigentes segun historial y situacion de cuotas.',
]

const privacyPoints = [
  'Usamos tus datos para identificar la compra, preparar facturacion, coordinar entrega y administrar el financiamiento.',
  'La informacion del perfil y del pedido se muestra dentro de tu cuenta para que puedas seguir pagos, comprobantes y estado del trabajo.',
  'No pedimos mas informacion de la necesaria dentro del flujo de compra: el detalle largo vive en esta pagina para mantener el checkout simple.',
]

export default function CreditoZapPage() {
  const whatsappUrl = buildWhatsappUrl(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    'Hola! Quiero conocer como funciona Credito ZAP para mi negocio.'
  )

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden border-b border-orange-100 bg-gradient-to-br from-gray-950 via-gray-900 to-orange-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(251,146,60,0.24),_transparent_38%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-24">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-orange-200">
              <Wallet size={14} />
              Credito ZAP
            </p>
            <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">
              Una sola pagina para entender el credito sin meter ruido en la compra.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-300 md:text-lg">
              Aqui centralizamos como funciona Credito ZAP, quienes somos, como trabajamos y que
              hacemos con tus datos. En producto y checkout queda solo lo necesario para decidir
              rapido.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/productos" className="btn-primary">
                Ver productos <ArrowRight size={18} />
              </Link>
              {whatsappUrl && (
                <Link
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary !border-white/20 !bg-white/10 !text-white hover:!bg-white/20"
                >
                  <MessageCircleMore size={18} />
                  Hablar por WhatsApp
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm">
                <item.icon size={20} />
              </div>
              <p className="mt-4 text-lg font-black text-gray-900">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="border-y border-gray-100 bg-gray-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
              Como funciona
            </p>
            <h2 className="mt-2 text-3xl font-black text-gray-900">
              Confirmas hoy y repartes el saldo con una propuesta clara.
            </h2>
            <div className="mt-6 space-y-4">
              {steps.map((step, index) => (
                <div key={step} className="flex gap-4 rounded-3xl border border-white bg-white p-5 shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-100 font-black text-orange-600">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
              Que necesitas
            </p>
            <h3 className="mt-2 text-2xl font-black text-gray-900">Requisitos practicos</h3>
            <div className="mt-5 space-y-3">
              {requirements.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-orange-500" />
                  <p className="text-sm text-gray-600">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="quienes-somos" className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-orange-100 bg-white p-7 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-500">
              <Building2 size={22} />
            </div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
              Quienes somos
            </p>
            <h2 className="mt-2 text-3xl font-black text-gray-900">ZAP acompana trabajos reales.</h2>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              ZAP Tienda combina produccion grafica con una forma de compra mas ordenada para
              negocios que necesitan resolver carteleria, impresos y exhibicion sin patearlo para
              mas adelante.
            </p>
          </div>

          <div
            id="como-trabajamos"
            className="rounded-[2rem] border border-gray-200 bg-gray-950 p-7 text-white shadow-sm"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-orange-300">
              <FileText size={22} />
            </div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-orange-300">
              Como trabajamos
            </p>
            <h2 className="mt-2 text-3xl font-black">Venta simple, seguimiento claro.</h2>
            <p className="mt-4 text-sm leading-relaxed text-gray-300">
              Mostramos precio, anticipo, simulacion y resumen del pedido antes de confirmar.
              Cuando el credito aplica, dejamos el detalle tecnico accesible pero sin convertir la
              compra en una lectura eterna.
            </p>
          </div>
        </div>
      </section>

      <section id="privacidad" className="border-t border-gray-100 bg-orange-50/40">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Privacidad
          </p>
          <h2 className="mt-2 text-3xl font-black text-gray-900">Usamos tus datos para operar tu pedido, no para distraerte.</h2>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {privacyPoints.map((item) => (
              <div key={item} className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
                <p className="text-sm leading-relaxed text-gray-600">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
