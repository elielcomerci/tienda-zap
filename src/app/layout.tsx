import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'ZAP Tienda - Agencia Creativa',
    template: '%s | ZAP Tienda',
  },
  description: 'Piezas graficas, diseño y producción para marcas que cuidan como se ven.',
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
