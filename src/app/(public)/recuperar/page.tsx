import { requestPasswordReset } from '@/lib/actions/recovery'
import Link from 'next/link'
import { ArrowLeft, KeyRound } from 'lucide-react'

export const metadata = { title: 'Recuperar contraseña — ZAP Tienda' }

export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams

  if (success) {
    return (
      <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#FAF8F8] px-4 py-10 sm:px-6">
        <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-[#ED164F]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 -z-10 h-80 w-80 rounded-full bg-[#4576B9]/10 blur-3xl" />
        <div className="w-full max-w-md rounded-[28px] border border-black/[0.06] bg-white p-8 text-center shadow-[0_24px_80px_-32px_rgba(15,23,42,0.22)]">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <KeyRound size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Revisá tu email</h1>
          <p className="text-gray-500 mb-6">
            Si el email ingresado está registrado, te enviamos un enlace para restablecer tu contraseña. Revisá tu bandeja de entrada o spam.
          </p>
          <Link href="/login" className="btn-primary w-full justify-center !py-3">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#FAF8F8] px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-[#ED164F]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-20 -z-10 h-80 w-80 rounded-full bg-[#4576B9]/10 blur-3xl" />
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-black/[0.06] bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.22)]">
        <div className="border-b border-gray-100 bg-white px-8 pb-7 pt-9 text-center">
          <Link href="/" aria-label="ZAP Tienda — inicio" className="mb-5 inline-flex items-center justify-center transition-opacity hover:opacity-80">
            <img src="https://res.cloudinary.com/dip14vkem/image/upload/v1756568241/logo_t37blz.png" alt="ZAP" width="180" height="60" className="h-12 w-auto max-w-[180px] object-contain" />
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-gray-950">Recuperar contraseña</h1>
          <p className="mt-2 text-sm text-gray-500">Te ayudamos a volver a entrar.</p>
        </div>

        <form action={requestPasswordReset} className="space-y-4 px-6 py-7 sm:px-8 sm:py-8">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl text-center">
              {decodeURIComponent(error)}
            </div>
          )}

          <div>
            <label className="label">Email registrado</label>
            <input name="email" type="email" required className="input" placeholder="tu@email.com" />
          </div>

          <div className="pt-2">
            <button type="submit" className="btn-primary w-full justify-center !py-3">
              Enviar enlace
            </button>
          </div>

          <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-gray-500 font-medium hover:text-gray-900 mt-4">
            <ArrowLeft size={16} /> Volver
          </Link>
        </form>
      </div>
    </div>
  )
}
