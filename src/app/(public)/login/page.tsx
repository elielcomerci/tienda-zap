import { Suspense } from 'react'
import Link from 'next/link'
import LoginForm from './components/LoginForm'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Iniciar sesión — ZAP Tienda' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const session = await auth()
  
  const { callbackUrl } = await searchParams
  const safeCallback = callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//') ? callbackUrl : '/perfil'
  if (session?.user?.id) {
    redirect(safeCallback)
  }

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#FAF8F8] px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-[#ED164F]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-20 -z-10 h-80 w-80 rounded-full bg-[#4576B9]/10 blur-3xl" />
      <div className="w-full max-w-md overflow-hidden rounded-[30px] border border-black/[0.06] bg-white shadow-[0_28px_90px_-38px_rgba(15,23,42,0.28)]">
        <div className="h-1.5 bg-gradient-to-r from-[#ED164F] via-[#D93478] to-[#4576B9]" />
        <div className="border-b border-gray-100 bg-white px-8 pb-7 pt-8 text-center">
          <Link href="/" aria-label="ZAP Tienda — inicio" className="mb-5 inline-flex items-center justify-center transition-opacity hover:opacity-80">
            <img src="https://res.cloudinary.com/dip14vkem/image/upload/v1756568241/logo_t37blz.png" alt="ZAP" width="180" height="60" className="h-12 w-auto max-w-[180px] object-contain" />
          </Link>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4576B9]">Tu espacio ZAP</p>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">Qué bueno tenerte de vuelta.</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">Ingresá para seguir con tus consultas y pedidos.</p>
        </div>
        <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">Cargando...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
