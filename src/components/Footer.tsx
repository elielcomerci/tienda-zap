'use client'

import React from 'react'
import { Heart } from 'lucide-react'

interface FooterProps {
  clientData?: {
    colores?: {
      texto?: string
    }
  }
}

const Footer: React.FC<FooterProps> = ({ clientData }) => {
  const borderColor = clientData?.colores?.texto || '#d1d5db'

  return (
    <footer className="relative bg-white py-8">
      <div className="container mx-auto px-4 text-center">
        <p className="flex items-center justify-center space-x-2 text-sm md:text-base font-medium">
          <span>Hecho con</span>
          <Heart className="w-5 h-5 text-red-500 animate-pulse" />
          <span>en Parque Leloir</span>
        </p>
        <p
          className="mt-2 text-xs md:text-sm opacity-70"
          style={{ color: borderColor }}
        >
          © {new Date().getFullYear()} - ZAP Agencia Creativa. Todos los derechos reservados.
        </p>

        {/* Fondo degradado sutil */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#ED164F]/10 via-purple-200/5 to-transparent pointer-events-none" />
      </div>
    </footer>
  )
}

export default Footer
