'use client'

import { useCartStore } from '@/lib/cart-store'
import { CheckCircle2, MessageSquare, UploadCloud } from 'lucide-react'

export default function OrderItemOptions({ item }: { item: any }) {
  const { updateItemOptions } = useCartStore()

  const handleDesignRequest = () => {
    updateItemOptions(item.cartItemId!, { designRequested: true, fileUrl: undefined })
  }

  const clearOptions = () => {
    updateItemOptions(item.cartItemId!, { designRequested: false, fileUrl: undefined })
  }

  return (
    <div className="border border-gray-100 p-4 rounded-xl mt-3 bg-gray-50/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 text-sm">Archivos para {item.name}</h4>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-200 bg-white text-center">
          <UploadCloud size={24} className="text-gray-400 mb-2" />
          <span className="text-xs font-medium text-gray-700">Subis el archivo despues de comprar</span>
          <span className="text-[10px] text-gray-400 mt-1">
            Desde la pagina de exito o desde tu perfil
          </span>
        </div>

        <button
          type="button"
          onClick={item.designRequested ? clearOptions : handleDesignRequest}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-colors
            ${item.designRequested
              ? 'border-orange-500 bg-orange-50 text-orange-700'
              : 'border-gray-200 hover:border-orange-400 bg-white text-gray-600'
            }`}
        >
          {item.designRequested ? (
            <>
              <CheckCircle2 size={24} className="text-orange-500 mb-1" />
              <span className="text-xs font-semibold text-center">Diseno solicitado</span>
              <span className="text-[10px] text-orange-600 mt-1">
                Lo coordinamos por WhatsApp
              </span>
            </>
          ) : (
            <>
              <MessageSquare size={24} className="text-gray-400 mb-2" />
              <span className="text-xs font-medium">Necesito diseno</span>
              <span className="text-[10px] text-gray-400 mt-0.5">Marcamos este item para coordinarlo</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
