'use client'

import { useState } from 'react'
import { CheckCircle2, FileImage, Loader2, MessageSquare, XCircle } from 'lucide-react'
import { reviewProof } from '@/lib/actions/proofs'

type ProofData = {
  id: string
  fileName: string
  fileUrl: string
  objectKey: string | null
  note: string | null
  status: string
  reviewNote: string | null
  createdAt: string
}

export default function ProofReviewSection({
  proofs,
  orderId,
}: {
  proofs: ProofData[]
  orderId: string
}) {
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [feedbackNote, setFeedbackNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReview = async (proofId: string, status: 'APPROVED' | 'REJECTED') => {
    setLoading(true)
    try {
      await reviewProof({
        proofId,
        status,
        reviewNote: status === 'REJECTED' ? feedbackNote : undefined,
      })
      setReviewingId(null)
      setFeedbackNote('')
    } catch (err) {
      console.error(err)
      alert('Error al enviar la revisión')
    } finally {
      setLoading(false)
    }
  }

  const pendingProofs = proofs.filter((p) => p.status === 'PENDING')
  const reviewedProofs = proofs.filter((p) => p.status !== 'PENDING')

  return (
    <div className="card p-5 space-y-4">
      <h3 className="font-bold text-gray-900 text-sm">Pruebas de diseño</h3>

      {pendingProofs.map((proof) => (
        <div key={proof.id} className="rounded-xl border-2 border-[#ED2C71]/20 bg-[#FEF1F6]/50 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF1F6] text-[#ED2C71]">
              <FileImage size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{proof.fileName}</p>
              <p className="text-xs text-gray-500">
                {new Date(proof.createdAt).toLocaleString('es-AR')}
              </p>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
              Pendiente
            </span>
          </div>

          {proof.note && (
            <div className="flex items-start gap-2 rounded-lg bg-white p-3 text-sm text-gray-700">
              <MessageSquare size={14} className="mt-0.5 shrink-0 text-[#ED2C71]" />
              <p><em>Nota del diseñador:</em> {proof.note}</p>
            </div>
          )}

          {proof.objectKey && (
            <a
              href={proof.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary w-full justify-center !text-xs !py-2"
            >
              <FileImage size={14} /> Ver prueba de diseño
            </a>
          )}

          {reviewingId === proof.id ? (
            <div className="space-y-3 border-t border-[#ED2C71]/10 pt-3">
              <label className="block text-xs font-medium text-gray-700">
                ¿Qué cambios necesitás?
              </label>
              <textarea
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                className="input !text-sm !py-2"
                rows={2}
                placeholder="Ej: El logo debería ser más grande, ajustar el color de fondo..."
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleReview(proof.id, 'REJECTED')}
                  disabled={loading || !feedbackNote.trim()}
                  className="btn-secondary flex-1 justify-center !text-xs !py-2"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  Enviar cambios
                </button>
                <button
                  onClick={() => { setReviewingId(null); setFeedbackNote('') }}
                  className="btn-secondary !text-xs !py-2"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => handleReview(proof.id, 'APPROVED')}
                disabled={loading}
                className="btn-primary flex-1 justify-center !text-xs !py-2.5"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Aprobar diseño
              </button>
              <button
                onClick={() => setReviewingId(proof.id)}
                className="btn-secondary flex-1 justify-center !text-xs !py-2.5"
              >
                <XCircle size={14} />
                Pedir cambios
              </button>
            </div>
          )}
        </div>
      ))}

      {reviewedProofs.length > 0 && (
        <div className="space-y-2">
          {reviewedProofs.map((proof) => (
            <div key={proof.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
              <FileImage size={16} className="shrink-0 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 truncate">{proof.fileName}</p>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                proof.status === 'APPROVED'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {proof.status === 'APPROVED' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                {proof.status === 'APPROVED' ? 'Aprobado' : 'Cambios solicitados'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
