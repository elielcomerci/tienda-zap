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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center">
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="p-8 pb-6 bg-gradient-to-br from-gray-900 via-gray-800 to-orange-950 text-white text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500 shadow-lg shadow-orange-500/20 mb-4">
            <KeyRound size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
          <p className="text-gray-400 text-sm mt-1">Ingresá tu email para continuar</p>
        </div>

        <form action={requestPasswordReset} className="p-8 pt-6 space-y-4">
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
