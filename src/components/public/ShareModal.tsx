'use client'

import { useState, useEffect } from 'react'
import { Share2, Copy, Check, MessageCircle, X } from 'lucide-react'

export default function ShareModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState('')

  useEffect(() => {
    setUrl(window.location.href)
  }, [isOpen])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`Mirá este catálogo de productos de ZAP Agencia:\n${url}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:text-[#ED2C71]"
      >
        <Share2 size={16} /> Compartir Catálogo
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm transition-opacity">
          <div className="relative w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
            
            <h3 className="text-xl font-bold text-gray-900 mb-1">Compartir con amigos</h3>
            <p className="text-sm text-gray-500 mb-6">Enviá este enlace para que otros puedan ver el catálogo completo.</p>

            <div className="space-y-3">
              <button
                onClick={handleWhatsApp}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white transition-all hover:bg-[#20bd5a]"
              >
                <MessageCircle size={18} /> Compartir por WhatsApp
              </button>

              <div className="relative flex items-center">
                <input 
                  type="text" 
                  readOnly 
                  value={url} 
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-4 pr-12 text-xs text-gray-600 outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  title="Copiar enlace"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
