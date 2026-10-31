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
    return <main className="mx-auto max-w-xl px-6 py-20"><h1 className="text-2xl font-semibold">Este enlace ya no está disponible</h1><p className="mt-3 text-sm text-gray-600">Puede haber vencido o haber sido utilizado. Volvé a la invitación para solicitar uno nuevo.</p></main>
  }
  const parts = verification.identifier.split(':')
  const email = parts.length === 4 ? parts[3] : ''
  const existingUser = email ? await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true, role: true, isBanned: true } }) : null
  const existingCustomer = !!existingUser && existingUser.role === 'CUSTOMER' && !existingUser.isBanned
  return <main className="mx-auto max-w-xl px-6 py-20"><p className="text-xs font-semibold uppercase tracking-[.18em] text-gray-500">ZAP · propuesta privada</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">{existingCustomer ? 'Confirmá tu acceso' : 'Creá tu acceso'}</h1><p className="mt-3 text-sm leading-6 text-gray-600">{existingCustomer ? 'Este email ya tiene una cuenta. Te vamos a llevar al ingreso sin modificar tu contraseña.' : 'Definí una contraseña para ingresar y consultar tu propuesta.'}</p><div className="mt-8"><CompleteProposalAccess token={token} existingCustomer={existingCustomer} /></div></main>
}
