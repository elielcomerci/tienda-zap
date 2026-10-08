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
  const { updateItemOptions, updateBrief } = useCartStore()

  const isDesignProduct = item.catalogType === 'COSA' && item.briefType === 'DESIGN'

  // En un producto de diseño, el archivo final es justamente lo que estamos comprando.
  // No corresponde pedir otro archivo ni ofrecer "Necesito diseño".
  if (isDesignProduct) return null

  const handleDesignRequest = () => {
    updateItemOptions(item.cartItemId!, { designRequested: true, fileUrl: undefined })
    updateBrief(item.cartItemId!, {
      briefType: 'DESIGN',
      briefResponses: item.briefResponses || {},
      briefReferenceLinks: item.briefReferenceLinks || [],
      briefReferenceFiles: item.briefReferenceFiles || [],
    })
  }

  const clearOptions = () => {
    updateItemOptions(item.cartItemId!, { designRequested: false, fileUrl: undefined })
    updateBrief(item.cartItemId!, {
      briefType: 'NONE',
      briefResponses: undefined,
      briefReferenceLinks: [],
      briefReferenceFiles: [],
    })
  }

  return (
    <div
      className={`mt-3 rounded-2xl border border-gray-100 bg-gray-50/60 ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-3'}`}>
        <h4 className="text-sm font-semibold text-gray-900">
          {compact ? 'Preparacion del item' : `Archivos para ${item.name}`}
        </h4>
      </div>

      <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-3'}`}>
        <div
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white text-center ${
            compact ? 'p-3' : 'p-4'
          }`}
        >
          <UploadCloud
            size={compact ? 18 : 24}
            className={`text-gray-400 ${compact ? 'mb-1.5' : 'mb-2'}`}
          />
          <span className="text-xs font-medium text-gray-700">
            Subis el archivo despues de comprar
          </span>
          <span
            className={`text-gray-400 ${compact ? 'mt-0.5 text-[9px]' : 'mt-1 text-[10px]'}`}
          >
            Desde la página de exito o desde tu perfil
          </span>
        </div>

        <button
          type="button"
          onClick={item.designRequested ? clearOptions : handleDesignRequest}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 transition-colors ${
            compact ? 'p-3' : 'p-4'
          } ${
            item.designRequested
              ? 'border-[#ED164F] bg-[#FEF1F5] text-[#C2103F]'
              : 'border-gray-200 bg-white text-gray-600 hover:border-orange-400'
          }`}
        >
          {item.designRequested ? (
            <>
              <CheckCircle2 size={compact ? 18 : 24} className="mb-1 text-[#ED164F]" />
              <span className="text-center text-xs font-semibold">Diseño solicitado</span>
              <span
                className={`${compact ? 'mt-0.5 text-[9px]' : 'mt-1 text-[10px]'} text-[#ED164F]`}
              >
                Lo coordinamos por WhatsApp
              </span>
            </>
          ) : (
            <>
              <MessageSquare
                size={compact ? 18 : 24}
                className={`text-gray-400 ${compact ? 'mb-1.5' : 'mb-2'}`}
              />
              <span className="text-xs font-medium">Necesito diseño</span>
              <span
                className={`${compact ? 'mt-0.5 text-[9px]' : 'mt-0.5 text-[10px]'} text-gray-400`}
              >
                Marcamos este item para coordinarlo
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
