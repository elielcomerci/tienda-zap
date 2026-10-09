import { Suspense } from 'react'
import { Zap } from 'lucide-react'
import Link from 'next/link'
import LoginForm from './components/LoginForm'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Iniciar sesión — ZAP Tienda' }

export default async function LoginPage() {
  const session = await auth()
  
  if (session?.user?.id) {
    redirect('/perfil')
  }

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#FAF8F8] px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-[#ED164F]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-20 -z-10 h-80 w-80 rounded-full bg-[#4576B9]/10 blur-3xl" />
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-black/[0.06] bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.22)]">
        <div className="border-b border-gray-100 bg-white px-8 pb-7 pt-9 text-center">
          <Link href="/" className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ED164F] to-[#4576B9] text-white shadow-lg shadow-[#ED164F]/20 transition-transform hover:scale-105">
            <Zap size={32} />
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-gray-950">ZAP <span className="text-[#ED164F]">Tienda</span></h1>
          <p className="mt-2 text-sm text-gray-500">Qué bueno tenerte de vuelta.</p>
        </div>
        <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">Cargando...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
