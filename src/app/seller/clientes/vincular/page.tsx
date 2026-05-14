'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { associateClient } from './actions'

export default function VincularClientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const emailOrDocument = formData.get('emailOrDocument') as string

    const res = await associateClient(emailOrDocument)
    if (res?.error) {
      setError(res.error)
      setLoading(false)
    } else {
      router.push('/seller/clientes?linked=1')
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6 pt-10">
      <Link href="/seller/clientes" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Volver a mi cartera
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Vincular Cliente</h1>
        <p className="mt-1 text-sm text-gray-500">
          Asociá a un usuario existente a tu cartera para cobrar comisiones sobre sus compras.
        </p>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 text-center font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="label">Correo electrónico o DNI/CUIT</label>
            <input 
              name="emailOrDocument" 
              type="text" 
              required 
              className="input" 
              placeholder="ej: juan@empresa.com o 2034567891" 
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? 'Buscando y vinculando...' : (
              <>
                <UserPlus size={18} />
                Vincular ahora
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
