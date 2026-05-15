'use client'

import { useState } from 'react'
import { Copy, QrCode, Check, Smartphone } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

export default function ReferralCard({ sellerId, sellerName }: { sellerId: string, sellerName: string }) {
  const [copied, setCopied] = useState(false)
  const link = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${sellerId}` : `https://tienda-zap.com/?ref=${sellerId}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('No se pudo copiar el enlace')
    }
  }

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg') as any
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = `QR-ZAP-${sellerName.replace(/\s+/g, '-')}.png`
      downloadLink.href = `${pngFile}`
      downloadLink.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <div className="rounded-2xl border-2 border-gray-900 bg-gray-900 p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Smartphone size={150} />
      </div>
      
      <div className="bg-white p-2 rounded-xl shrink-0">
        <QRCodeSVG 
          id="qr-code-svg"
          value={link} 
          size={120} 
          bgColor="#ffffff"
          fgColor="#111827" 
          level="H"
          marginSize={1}
        />
      </div>

      <div className="flex-1 space-y-4 relative z-10 w-full">
        <div>
          <h2 className="text-xl font-bold">Tu Enlace ZAP</h2>
          <p className="text-sm text-gray-400 mt-1">
            Compartí este enlace o código QR. Quien ingrese a la tienda con él, quedará asociado a tu cartera de clientes por 30 días.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-800 rounded-xl px-4 py-3 font-mono text-sm text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap border border-gray-700">
            {link}
          </div>
          <button 
            onClick={copyToClipboard}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors shrink-0"
          >
            {copied ? <Check size={20} /> : <Copy size={20} />}
          </button>
        </div>

        <button 
          onClick={downloadQR}
          className="flex items-center gap-2 text-sm font-bold text-[#ED2C71] hover:text-[#C91F5B] transition-colors"
        >
          <QrCode size={18} />
          Descargar QR para imprimir
        </button>
      </div>
    </div>
  )
}
