import { Metadata } from 'next'
import ManualReceiptGenerator from './ManualReceiptGenerator'

export const metadata: Metadata = {
  title: 'Recibos Manuales | ZAP Admin',
}

export default function ManualReceiptsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">Ventas Manuales</h1>
        <p className="mt-2 text-sm text-gray-600">
          Registrá ventas de mostrador o servicios personalizados. El sistema creará una orden completada para mantener la correlatividad y generará el recibo en PDF para entregar al cliente.
        </p>
      </div>

      <ManualReceiptGenerator />
    </div>
  )
}
