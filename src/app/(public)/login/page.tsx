'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, LoginData } from '@/lib/validations'
import { Zap, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginData) => {
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      redirect: false,
      email: data.email,
      password: data.password,
    })

    if (res?.error) {
      setError('Credenciales incorrectas')
      setLoading(false)
    } else {
      router.push('/admin')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="p-8 pb-6 bg-gradient-to-br from-gray-900 via-gray-800 to-orange-950 text-white text-center">
          <Link href="/" className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500 shadow-lg shadow-orange-500/20 mb-4 transition-transform hover:scale-105">
            <Zap size={32} />
          </Link>
          <h1 className="text-2xl font-bold">ZAP Admin</h1>
          <p className="text-gray-400 text-sm mt-1">Ingresá a tu panel de control</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 pt-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" {...register('email')} className="input !bg-gray-50 focus:!bg-white" placeholder="admin@zap.com.ar" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label">Contraseña</label>
            <input type="password" {...register('password')} className="input !bg-gray-50 focus:!bg-white" placeholder="••••••••" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          {error && <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg text-center">{error}</p>}

          <div className="pt-2">
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center !py-3">
              {loading ? 'Verificando...' : 'Ingresar'} <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
