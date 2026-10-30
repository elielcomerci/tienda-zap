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
  return <main className="mx-auto max-w-xl px-6 py-20"><p className="text-xs font-semibold uppercase tracking-[.18em] text-blue-700">ZAP · propuesta privada</p><h1 className="mt-3 text-3xl font-semibold text-gray-950">Tu acceso está casi listo</h1><p className="mt-3 text-sm leading-6 text-gray-600">Confirmaste que tenés acceso al email destinatario. Elegí una contraseña para crear tu cuenta o recuperar el acceso existente.</p><div className="mt-8"><CompleteProposalAccess token={token} /></div></main>
}
