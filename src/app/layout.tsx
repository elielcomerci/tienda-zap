import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'ZAP Tienda — Impresión y Gráfica',
    template: '%s | ZAP Tienda',
  },
  description: 'Cartelería, tarjetas personales, banners, stickers, imanes y más. Calidad de imprenta al alcance de todos.',
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
