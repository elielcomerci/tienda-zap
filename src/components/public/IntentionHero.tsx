'use client'

import { Intention } from '@/lib/intentions'
import { Play } from 'lucide-react'

export default function IntentionHero({ intention }: { intention: Intention }) {
  if (!intention.description && (!intention.mediaType || intention.mediaType === 'NONE')) return null

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm mb-6 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-pink-50/50 to-transparent rounded-bl-full -z-0" />

      <div className="relative z-10 grid gap-6 md:grid-cols-[1fr_auto] items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF1F6] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#C91F5B] mb-3">
            {intention.icon} Solución Recomendada
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
            {intention.name}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed max-w-xl">
            {intention.description}
          </p>
        </div>

        {intention.mediaType && intention.mediaType !== 'NONE' && intention.mediaUrl && (
          <div className="md:w-[320px] shrink-0">
            {intention.mediaType === 'AUDIO' && (
              <div className="bg-gray-900 rounded-2xl p-4 shadow-xl text-white">
                <p className="text-xs font-bold uppercase tracking-widest text-[#ED2C71] mb-2 flex items-center gap-2">
                  <Play size={12} className="fill-[#ED2C71]" /> Demo Inmediata
                </p>
                <p className="text-sm font-medium mb-3">{intention.mediaTitle}</p>
                <audio controls className="w-full h-10 custom-audio" src={intention.mediaUrl} preload="none">
                  Tu navegador no soporta el elemento de audio.
                </audio>
              </div>
            )}
            
            {intention.mediaType === 'YOUTUBE' && (
              <div className="rounded-2xl overflow-hidden shadow-xl aspect-video bg-gray-900 relative">
                <iframe 
                  className="absolute inset-0 w-full h-full"
                  src={intention.mediaUrl} 
                  title={intention.mediaTitle || "Video"}
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
