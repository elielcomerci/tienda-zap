'use client'

import { useState, useRef } from 'react'
import { Upload, X, FileImage, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { getProofUploadUrl, createProof } from '@/lib/actions/proofs'

type ProofData = {
  id: string
  fileName: string
  fileUrl: string
  note: string | null
  status: string
  reviewedAt: string | null
  reviewNote: string | null
  createdAt: string | Date
}

export default function ProofUploader({
  orderId,
  proofs,
  title = 'Pruebas de diseño',
  buttonText = 'Subir prueba',
  type = 'PROOF'
}: {
  orderId: string
  proofs: ProofData[]
  title?: string
  buttonText?: string
  type?: 'PROOF' | 'DELIVERABLE'
}) {
  const [uploading, setUploading] = useState(false)
  const [note, setNote] = useState('')
  const [showForm, setShowForm] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      // 1. Get presigned upload URL
      const { uploadUrl, objectKey } = await getProofUploadUrl(
        orderId,
        file.name,
        file.type
      )

      // 2. Upload file directly to R2
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })

      // 3. Create proof record and trigger email
      await createProof({
        orderId,
        objectKey,
        fileName: file.name,
        note: note.trim() || undefined,
        type,
      })

      setNote('')
      setShowForm(false)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      console.error('Error subiendo proof:', err)
      alert('Error al subir la prueba de diseño')
    } finally {
      setUploading(false)
    }
  }

  const statusConfig: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
    PENDING: { label: 'Pendiente de revisión', icon: Clock, cls: 'text-amber-600 bg-amber-50' },
    APPROVED: { label: 'Aprobado', icon: CheckCircle2, cls: 'text-green-600 bg-green-50' },
    REJECTED: { label: 'Rechazado', icon: XCircle, cls: 'text-red-600 bg-red-50' },
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4 border-b pb-2">
        <h3 className="font-bold text-gray-900">{title}</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#FEF1F6] px-3 py-1.5 text-xs font-semibold text-[#C91F5B] transition-colors hover:bg-[#FCE4EC]"
          >
            <Upload size={14} />
            {buttonText}
          </button>
        )}
      </div>

      {/* Upload form */}
      {showForm && (
        <div className="mb-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 space-y-3">
          <div>
            <label className="label text-xs">Archivo (imagen o PDF)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              className="input !text-sm !py-1.5"
            />
          </div>
          <div>
            <label className="label text-xs">Nota para el cliente (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input !text-sm !py-1.5"
              placeholder="Ej: Revisá los colores del logo"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn-primary !py-1.5 !px-4 !text-sm"
            >
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Enviar prueba
                </>
              )}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="btn-secondary !py-1.5 !px-4 !text-sm"
            >
              <X size={14} />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Existing proofs */}
      {proofs.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No hay archivos cargados todavía.</p>
      ) : (
        <div className="space-y-3">
          {proofs.map((proof) => {
            const sc = statusConfig[proof.status] || statusConfig.PENDING

            return (
              <div
                key={proof.id}
                className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                  <FileImage size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{proof.fileName}</p>
                  {proof.note && (
                    <p className="text-xs text-gray-500 mt-0.5 italic">&quot;{proof.note}&quot;</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    {type === 'PROOF' && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${sc.cls}`}>
                        <sc.icon size={12} />
                        {sc.label}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400">
                      {new Date(proof.createdAt).toLocaleString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {proof.reviewNote && (
                    <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded-lg px-2 py-1">
                      Feedback: {proof.reviewNote}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
