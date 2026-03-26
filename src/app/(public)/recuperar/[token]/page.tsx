import { resetPassword } from '@/lib/actions/recovery'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { KeyRound } from 'lucide-react'
import PasswordInput from '@/components/ui/PasswordInput'

export const metadata = { title: 'Nueva contraseña — ZAP Tienda' }

export default async function NuevaPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { token } = await params
  const { error } = await searchParams

  // Verificar validez del token en el Server Component antes de mostrar el formulario
  const verificationToken = await prisma.verificationToken.findFirst({
    where: { token },
  })

  if (!verificationToken) {
    redirect('/login?error=El+enlace+es+inválido+o+ya+fue+usado')
  }

  if (new Date() > verificationToken.expires) {
    redirect('/login?error=El+enlace+ha+expirado')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="p-8 pb-6 bg-gradient-to-br from-gray-900 via-gray-800 to-orange-950 text-white text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500 shadow-lg shadow-orange-500/20 mb-4">
            <KeyRound size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">Nueva contraseña</h1>
          <p className="text-gray-400 text-sm mt-1">Ingresá tu nueva clave para {verificationToken.identifier}</p>
        </div>

        <form action={resetPassword} className="p-8 pt-6 space-y-4">
          <input type="hidden" name="token" value={token} />

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl text-center">
              {decodeURIComponent(error)}
            </div>
          )}

          <PasswordInput
            name="password"
            label="Nueva contraseña"
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
              Actualizar contraseña
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
