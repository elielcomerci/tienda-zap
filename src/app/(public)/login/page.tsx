import { Suspense } from 'react'
import { Zap } from 'lucide-react'
import Link from 'next/link'
import LoginForm from './components/LoginForm'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Iniciar sesión — ZAP Tienda' }

export default async function LoginPage() {
  const session = await auth()
  
  if (session?.user) {
    redirect('/perfil')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="p-8 pb-6 bg-gradient-to-br from-gray-900 via-gray-800 to-[#C91F5B]/30 text-white text-center">
          <Link href="/" className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#ED2C71] shadow-lg shadow-[#ED2C71]/20 mb-4 transition-transform hover:scale-105">
            <Zap size={32} />
          </Link>
          <h1 className="text-2xl font-bold">ZAP</h1>
          <p className="text-gray-400 text-sm mt-1">Ingresá a tu cuenta</p>
        </div>
        <Suspense fallback={<div className="p-8 text-center text-gray-400">Cargando...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
