import { redirect } from 'next/navigation'
import { Check, CircleHelp, Settings2, UserRound, Wallet } from 'lucide-react'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { updateProfile } from '@/lib/actions/auth'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mi cuenta | ZAP Tienda' }

export default async function CuentaPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const [user, creditsCount, overdueCreditsCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.zapCreditPlan.count({ where: { order: { userId: session.user.id } } }),
    prisma.zapCreditInstallment.count({ where: { dueDate: { lt: new Date() }, status: { in: ['PENDING', 'REJECTED'] }, plan: { status: { in: ['APPROVED', 'ACTIVE'] }, order: { userId: session.user.id } } } }),
  ])
  if (!user) redirect('/login')
  const { saved, error } = await searchParams

  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
    <header><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Mi cuenta</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">Datos y seguridad</h1><p className="mt-2 text-sm text-gray-500">Administrá los datos de acceso y tus beneficios.</p></header>
    {saved && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><Check className="mr-2 inline" size={16} />Perfil actualizado correctamente.</p>}
    {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{decodeURIComponent(error)}</p>}
    <div className="mt-6 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><UserRound size={21} /></span><div className="min-w-0"><p className="truncate font-semibold text-gray-950">{user.name || 'Sin nombre'}</p><p className="truncate text-sm text-gray-500">{user.email}</p></div></div><div className="mt-5 border-t border-gray-100 pt-4"><p className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Settings2 size={16} />Datos y acceso</p><p className="mt-2 text-sm leading-5 text-gray-500">Actualizá tus datos personales y gestioná tu contraseña.</p><a href="/perfil/creditos" className="mt-4 flex items-center justify-between rounded-xl bg-orange-50 px-3 py-3 text-sm"><span><span className="block font-semibold text-orange-950">Créditos y beneficios</span><span className="mt-0.5 block text-xs text-orange-800">{creditsCount} plan{creditsCount === 1 ? '' : 'es'}{overdueCreditsCount > 0 ? ` · ${overdueCreditsCount} cuota${overdueCreditsCount === 1 ? '' : 's'} vencida${overdueCreditsCount === 1 ? '' : 's'}` : ''}</span></span><Wallet size={18} className="text-orange-700" /></a><p className="mt-4 flex items-center gap-2 text-xs text-gray-400"><CircleHelp size={14} />¿Necesitás ayuda? <a className="font-semibold text-[#c2103f] hover:underline" href="https://wa.me/541125832323" target="_blank" rel="noreferrer">Contactá a ZAP</a></p></div></section>
      <form action={updateProfile} className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6"><h2 className="font-semibold text-gray-950">Información personal</h2><p className="mt-1 text-sm text-gray-500">Editá los datos asociados a tu acceso.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-gray-700">Nombre<input name="name" defaultValue={user.name || ''} required className="input mt-1.5 w-full" /></label><label className="block text-sm font-medium text-gray-700">Teléfono<input name="phone" defaultValue={user.phone || ''} className="input mt-1.5 w-full" placeholder="1134567890" /></label></div><div className="my-5 border-t border-gray-100" /><p className="text-xs font-bold uppercase tracking-wide text-gray-400">Cambiar contraseña</p><div className="mt-3 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-gray-700">Contraseña actual<input name="currentPassword" type="password" autoComplete="current-password" className="input mt-1.5 w-full" /></label><label className="block text-sm font-medium text-gray-700">Nueva contraseña<input name="newPassword" type="password" autoComplete="new-password" className="input mt-1.5 w-full" placeholder="Mínimo 6 caracteres" /></label></div><button type="submit" className="btn-primary mt-5 inline-flex items-center gap-2"><Check size={16} />Guardar cambios</button></form>
    </div>
  </main>
}
