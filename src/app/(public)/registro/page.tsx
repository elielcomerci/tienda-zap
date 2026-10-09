import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { registerUser } from '@/lib/actions/auth'
import { getPublicBusinessTypes } from '@/lib/business-types'
import Link from 'next/link'
import PasswordInput from '@/components/ui/PasswordInput'

export const metadata = { title: 'Crear cuenta — ZAP Tienda' }

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  
  const session = await auth()
  if (session?.user) {
    redirect('/perfil')
  }

  const businessTypes = await getPublicBusinessTypes()

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#FAF8F8] px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-[#ED164F]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-20 -z-10 h-80 w-80 rounded-full bg-[#4576B9]/10 blur-3xl" />
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-black/[0.06] bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.22)]">
        <div className="border-b border-gray-100 bg-white px-8 pb-7 pt-9 text-center">
          <Link href="/" aria-label="ZAP Tienda — inicio" className="mb-5 inline-flex items-center justify-center transition-opacity hover:opacity-80">
            <img src="https://res.cloudinary.com/dip14vkem/image/upload/v1756568241/logo_t37blz.png" alt="ZAP" width="180" height="60" className="h-12 w-auto max-w-[180px] object-contain" />
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-gray-950">Crear tu cuenta</h1>
          <p className="mt-2 text-sm text-gray-500">Tus ideas y pedidos, en un mismo lugar.</p>
        </div>

        <form action={registerUser} className="space-y-4 px-6 py-7 sm:px-8 sm:py-8">
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
            <input name="email" type="email" required className="input" placeholder="tu@email.com" />
          </div>

          <div>
            <label className="label">
              Teléfono / WhatsApp <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input name="phone" type="tel" className="input" placeholder="1134567890" />
          </div>

          <div>
            <label className="label">
              Documento (DNI/CUIT) <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input name="documentId" type="text" className="input" placeholder="Opcional para facturación/crédito" />
          </div>

          {businessTypes.length > 0 && (
            <div>
              <label className="label">
                ¿Cuál es tu rubro? <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <select name="businessTypeId" className="input" defaultValue="">
                <option value="">Seleccioná tu rubro</option>
                {businessTypes.map((bt) => (
                  <option key={bt.id} value={bt.id}>
                    {bt.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Te mostraremos productos relevantes para tu industria.
              </p>
            </div>
          )}

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
            <Link href="/login" className="text-[#ED164F] font-semibold hover:underline">
              Ingresá
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
