'use client'

import { useState } from 'react'

export default function RequestProposalEmailVerification({ inviteId }: { inviteId: string }) {
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function requestVerification() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/proposals/verify-email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No pudimos enviar el email.')
      setSent(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos enviar el email.')
    } finally {
      setBusy(false)
    }
  }

  return <div>
    {sent ? <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">Te enviamos un enlace de confirmación. Revisá tu casilla y también la carpeta de correo no deseado.</p> : <button type="button" onClick={requestVerification} disabled={busy} className="rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Enviando…' : 'Enviar confirmación por email'}</button>}
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
  </div>
}
