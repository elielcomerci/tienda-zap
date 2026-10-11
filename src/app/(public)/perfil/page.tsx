import { auth, signOut } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import AccountSectionNav from '@/components/public/AccountSectionNav'
import { ArrowRight, FolderOpen, Package, ReceiptText, UserRound, Wallet } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mi cuenta — ZAP Tienda' }

export default async function PerfilPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const [user, ordersCount, creditsCount, invoicesCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } }),
    prisma.order.count({ where: { userId: session.user.id } }),
    prisma.zapCreditPlan.count({ where: { order: { userId: session.user.id } } }),
    prisma.order.count({ where: { userId: session.user.id, OR: [{ invoiceStatus: { not: null } }, { invoiceUrl: { not: null } }] } }),
  ])
  if (!user) redirect('/login')

  const sections = [
    { href: '/perfil/ordenes', title: 'Mis pedidos', description: `${ordersCount} pedido/s · Estado y detalles de tus compras.`, icon: Package },
    { href: '/perfil/trabajos', title: 'Mis trabajos y archivos', description: 'Pruebas, entregables y archivos de tus trabajos.', icon: FolderOpen },
    { href: '/perfil/creditos', title: 'Crédito ZAP', description: `${creditsCount} crédito/s · Cuotas y pagos.`, icon: Wallet },
    { href: '/perfil/facturacion', title: 'Facturación', description: `${invoicesCount} comprobante/s · Estado y descargas.`, icon: ReceiptText },
    { href: '/perfil/datos', title: 'Mis datos', description: 'Información personal y seguridad de tu cuenta.', icon: UserRound },
  ]

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">Tu espacio en ZAP</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Hola{user.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
          <p className="mt-1 text-sm text-gray-500">{user.email}</p>
        </div>
        <form action={async () => { 'use server'; await signOut({ redirectTo: '/' }) }}>
          <button type="submit" className="text-sm text-gray-500 hover:text-red-500">Cerrar sesión</button>
        </form>
      </div>
      <AccountSectionNav active="home" />
      <section className="grid gap-3 sm:grid-cols-2">
        {sections.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="card group flex min-h-32 items-start gap-4 p-5 transition-all hover:border-[#F7638B]/30 hover:shadow-sm">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FEF1F5] text-[#ED164F]"><Icon size={21} /></span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-bold text-gray-900">{title}<ArrowRight size={15} className="text-gray-300 group-hover:text-[#ED164F]" /></span>
              <span className="mt-2 block text-sm leading-5 text-gray-500">{description}</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  )
}
