import { registerUser } from '@/lib/actions/auth'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import PasswordInput from '@/components/ui/PasswordInput'

export const metadata = { title: 'Crear cuenta — ZAP Tienda' }

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="p-8 pb-6 bg-gradient-to-br from-gray-900 via-gray-800 to-orange-950 text-white text-center">
          <Link href="/" className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500 shadow-lg shadow-orange-500/20 mb-4 transition-transform hover:scale-105">
            <Zap size={32} />
          </Link>
          <h1 className="text-2xl font-bold">Crear cuenta</h1>
          <p className="text-gray-400 text-sm mt-1">Registrate para seguir tus pedidos</p>
        </div>

        <form action={registerUser} className="p-8 pt-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl text-center">
              {decodeURIComponent(error)}
            </div>
          )}

          <div>
            <label className="label">Nombre completo</label>
            <input name="name" type="text" required className="input" placeholder="Juan García" />
          </div>

          <div>
            <label className="label">Email</label>
            <input name="email" type="email" required className="input" placeholder="juan@email.com" />
          </div>

          <div>
            <label className="label">
              Teléfono / WhatsApp <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input name="phone" type="tel" className="input" placeholder="1134567890" />
          </div>

          <PasswordInput
            name="password"
            label="Contraseña"
            placeholder="Mínimo 6 caracteres"
            required
          />

          <PasswordInput
            name="confirmPassword"
            label="Confirmar contraseña"
            placeholder="Repetí la contraseña"
            required
          />

          <div className="pt-2">
            <button type="submit" className="btn-primary w-full justify-center !py-3">
              Crear cuenta
            </button>
          </div>

          <p className="text-center text-sm text-gray-500">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="text-orange-500 font-semibold hover:underline">
              Ingresá
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
