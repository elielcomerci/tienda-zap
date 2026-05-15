'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, LoginData } from '@/lib/validations'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import PasswordInput from '@/components/ui/PasswordInput'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const registered = searchParams.get('registered')
  const passwordReset = searchParams.get('passwordReset')
  const queryError = searchParams.get('error')
  const [error, setError] = useState(queryError ? decodeURIComponent(queryError) : '')
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
      router.push('/perfil')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-8 pt-6 space-y-4">
      {registered && (
        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl text-center font-medium">
          ✓ ¡Cuenta creada! Ya podés ingresar.
        </div>
      )}
      {passwordReset && (
        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl text-center font-medium">
          ✓ Contraseña actualizada con éxito.
        </div>
      )}

      <div>
        <label className="label">Email</label>
        <input type="email" {...register('email')} className="input !bg-gray-50 focus:!bg-white" placeholder="admin@zap.com.ar" />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
      </div>

      <PasswordInput
        name="password"
        label="Contraseña"
        placeholder="••••••••"
        registerParams={register('password')}
        error={errors.password?.message}
      />

      <div className="text-right -mt-2">
        <Link href="/recuperar" className="text-xs font-semibold text-gray-500 hover:text-[#ED2C71] transition-colors">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      {error && <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg text-center">{error}</p>}

      <div className="pt-2">
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center !py-3">
          {loading ? 'Verificando...' : 'Ingresar'} <ArrowRight size={16} />
        </button>
      </div>

      <p className="text-center text-sm text-gray-500">
        ¿No tenés cuenta?{' '}
        <Link href="/registro" className="text-[#ED2C71] font-semibold hover:underline">
          Registrate
        </Link>
      </p>
    </form>
  )
}
