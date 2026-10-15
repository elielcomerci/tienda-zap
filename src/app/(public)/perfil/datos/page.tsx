import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { updateProfile } from '@/lib/actions/auth'
import AccountSectionNav from '@/components/public/AccountSectionNav'
import { UserRound } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mis datos — ZAP Tienda' }

export default async function PerfilDatosPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const [user, params] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }), searchParams,
  ])
  if (!user) redirect('/login')
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div><p className="text-sm text-gray-500">Mi cuenta</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-900"><UserRound size={24} className="text-[#ED164F]" /> Mis datos</h1><p className="mt-1 text-sm text-gray-500">Información personal y seguridad de tu cuenta.</p></div>
      <AccountSectionNav active="data" />
      <div className="card max-w-2xl p-6">
        <p className="font-bold text-gray-900">{user.name || 'Sin nombre'}</p><p className="mb-6 text-sm text-gray-500">{user.email}</p>
        {params.saved && <div className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">Perfil actualizado correctamente.</div>}
        {params.error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{decodeURIComponent(params.error)}</div>}
        <form action={updateProfile} className="space-y-4">
          <div><label className="label">Nombre</label><input name="name" defaultValue={user.name || ''} required className="input" /></div>
          <div><label className="label">Teléfono</label><input name="phone" defaultValue={user.phone || ''} className="input" placeholder="1134567890" /></div>
          <hr className="border-gray-100" /><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Cambiar contraseña</p>
          <div><label className="label">Contraseña actual</label><input name="currentPassword" type="password" className="input" placeholder="••••••••" /></div>
          <div><label className="label">Nueva contraseña</label><input name="newPassword" type="password" className="input" placeholder="Mínimo 6 caracteres" /></div>
          <button type="submit" className="btn-primary w-full justify-center">Guardar cambios</button>
        </form>
      </div>
    </div>
  )
}
