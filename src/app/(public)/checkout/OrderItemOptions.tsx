'use client'

import { useCartStore } from '@/lib/cart-store'
import { CheckCircle2, MessageSquare, UploadCloud } from 'lucide-react'

export default function OrderItemOptions({
  item,
  compact = false,
}: {
  item: any
  compact?: boolean
}) {
  const { updateItemOptions } = useCartStore()

  if (item.isService) {
    return (
      <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-800">
        Este item es un servicio, asi que no necesita archivo final ni stock fisico.
      </div>
    )
  }

  const handleDesignRequest = () => {
    updateItemOptions(item.cartItemId!, { designRequested: true, fileUrl: undefined })
  }

  const clearOptions = () => {
    updateItemOptions(item.cartItemId!, { designRequested: false, fileUrl: undefined })
  }

  return (
    <div
      className={`mt-3 rounded-xl border border-gray-100 bg-gray-50/50 ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-3'}`}>
        <h4 className="font-semibold text-gray-900 text-sm">Archivos para {item.name}</h4>
      </div>

      <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-3'}`}>
        <div
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white text-center ${
            compact ? 'p-3' : 'p-4'
          }`}
        >
          <UploadCloud size={compact ? 18 : 24} className={`text-gray-400 ${compact ? 'mb-1.5' : 'mb-2'}`} />
          <span className="text-xs font-medium text-gray-700">Subis el archivo despues de comprar</span>
          <span className={`text-gray-400 ${compact ? 'mt-0.5 text-[9px]' : 'mt-1 text-[10px]'}`}>
            Desde la pagina de exito o desde tu perfil
          </span>
        </div>

        <button
          type="button"
          onClick={item.designRequested ? clearOptions : handleDesignRequest}
          className={`flex flex-col items-center justify-center rounded-xl border-2 transition-colors ${
            compact ? 'p-3' : 'p-4'
          }
            ${item.designRequested
              ? 'border-orange-500 bg-orange-50 text-orange-700'
              : 'border-gray-200 hover:border-orange-400 bg-white text-gray-600'
            }`}
        >
          {item.designRequested ? (
            <>
              <CheckCircle2 size={compact ? 18 : 24} className="mb-1 text-orange-500" />
              <span className="text-xs font-semibold text-center">Diseno solicitado</span>
              <span className={`${compact ? 'mt-0.5 text-[9px]' : 'mt-1 text-[10px]'} text-orange-600`}>
                Lo coordinamos por WhatsApp
              </span>
            </>
          ) : (
            <>
              <MessageSquare size={compact ? 18 : 24} className={`text-gray-400 ${compact ? 'mb-1.5' : 'mb-2'}`} />
              <span className="text-xs font-medium">Necesito diseno</span>
              <span className={`${compact ? 'mt-0.5 text-[9px]' : 'mt-0.5 text-[10px]'} text-gray-400`}>
                Marcamos este item para coordinarlo
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
