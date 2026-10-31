import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import CompleteProposalAccess from './CompleteProposalAccess'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Confirmar acceso | ZAP' }

export default async function CompleteProposalAccessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[a-f0-9]{64}$/.test(token)) notFound()
  const verification = await prisma.verificationToken.findUnique({ where: { token }, select: { identifier: true, expires: true } })
  if (!verification || !verification.identifier.startsWith('proposal-invite:') || verification.expires <= new Date()) {
    return <main className="flex min-h-screen items-center justify-center bg-white px-4 py-12"><section className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 sm:p-10"><p className="text-sm font-semibold tracking-[.2em] text-zap-magenta">ZAP</p><h1 className="mt-8 text-2xl font-semibold tracking-tight text-gray-950">Este enlace ya no está disponible</h1><p className="mt-3 text-sm leading-6 text-gray-600">Volvé a la invitación para solicitar uno nuevo.</p></section></main>
  }
  const parts = verification.identifier.split(':')
  const email = parts.length === 4 ? parts[3] : ''
  const existingUser = email ? await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true, role: true, isBanned: true } }) : null
  const existingCustomer = !!existingUser && existingUser.role === 'CUSTOMER' && !existingUser.isBanned
  return <main className="flex min-h-screen items-center justify-center bg-[#FAF9F6] px-4 py-12"><section className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 sm:p-10"><p className="text-sm font-semibold tracking-[.2em] text-gray-950">ZAP</p><p className="mt-8 text-xs font-semibold uppercase tracking-[.16em] text-zap-magenta">Acceso privado</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">{existingCustomer ? 'Confirmá tu acceso' : 'Creá tu acceso'}</h1><p className="mt-3 text-sm leading-6 text-gray-600">{existingCustomer ? 'Tu cuenta y contraseña siguen igual.' : 'Elegí una contraseña para consultar tu propuesta.'}</p><div className="mt-7"><CompleteProposalAccess token={token} existingCustomer={existingCustomer} /></div></section></main>
}
