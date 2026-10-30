'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CompleteProposalAccess({ token }: { token: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (password.length < 8) return setError('Usá al menos 8 caracteres.')
    if (password !== confirmation) return setError('Las contraseñas no coinciden.')
    setBusy(true)
    try {
      const response = await fetch('/api/proposals/verify-email/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No pudimos confirmar el acceso.')
      router.push(data.redirectTo)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos confirmar el acceso.')
      setBusy(false)
    }
  }

  return <form onSubmit={submit} className="space-y-4">
    <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Nueva contraseña</span><input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm" /></label>
    <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Repetí la contraseña</span><input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmation} onChange={event => setConfirmation(event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm" /></label>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <button disabled={busy} className="w-full rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Confirmando…' : 'Confirmar y crear acceso'}</button>
  </form>
}
