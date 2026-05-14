'use client'

import { useState, useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { Plus, Trash2, FileText, CheckCircle2 } from 'lucide-react'

type Product = { id: string; name: string; price: number }

type FormValues = {
  customerName: string
  customerEmail: string
  customerPhone: string
  customerDocumentId: string
  paymentType: 'CASH' | 'TRANSFER' | 'MERCADOPAGO' | 'ZAP_CREDIT'
  orderStatus: 'PENDING' | 'PROCESSING' | 'READY' | 'DELIVERED'
  isPartialPayment: boolean
  paymentAmount: number
  notes: string
  items: {
    type: 'CATALOG' | 'CUSTOM'
    productId?: string
    customName?: string
    quantity: number
    unitPrice: number
  }[]
}

export default function ManualReceiptGenerator() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState<{ receiptUrl: string; orderCode: string } | null>(null)

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      paymentType: 'CASH',
      orderStatus: 'DELIVERED',
      isPartialPayment: false,
      items: [{ type: 'CUSTOM', quantity: 1, unitPrice: 0, customName: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const formItems = watch('items')
  const isPartialPayment = watch('isPartialPayment')

  useEffect(() => {
    fetch('/api/admin/products-selector')
      .then((res) => res.json())
      .then((data) => {
        if (data.products) setProducts(data.products)
      })
      .catch((err) => console.error('Failed to load products', err))
  }, [])

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      setValue(`items.${index}.unitPrice`, product.price)
    }
  }

  const subtotal = formItems.reduce((acc, item) => acc + (item.unitPrice || 0) * (item.quantity || 1), 0)

  const onSubmit = async (data: FormValues) => {
    setLoading(true)
    setError('')
    setSuccessData(null)

    // Clean up items based on type
    const payload = {
      ...data,
      paymentAmount: data.isPartialPayment ? Number(data.paymentAmount) : undefined,
      items: data.items.map(item => ({
        productId: item.type === 'CATALOG' ? item.productId : undefined,
        customName: item.type === 'CUSTOM' ? item.customName : undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    }

    try {
      const res = await fetch('/api/admin/recibos-manuales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Error al generar recibo')

      setSuccessData(result)
      
      // Auto download
      if (result.receiptUrl) {
        window.open(result.receiptUrl, '_blank')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (successData) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-emerald-950">Venta Registrada</h2>
        <p className="mt-2 text-emerald-800">
          La orden <strong>{successData.orderCode}</strong> se completó correctamente.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <a
            href={successData.receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary flex items-center gap-2 !bg-emerald-600 hover:!bg-emerald-700"
          >
            <FileText size={18} /> Descargar Recibo
          </a>
          <button
            onClick={() => {
              setSuccessData(null)
              setValue('items', [{ type: 'CUSTOM', quantity: 1, unitPrice: 0, customName: '' }])
              setValue('customerName', '')
              setValue('notes', '')
            }}
            className="btn-secondary"
          >
            Nueva Venta
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Datos del Cliente */}
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Datos del Cliente</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label">Nombre completo *</label>
            <input
              {...register('customerName', { required: 'Requerido' })}
              className="input"
              placeholder="Ej: Cliente Mostrador"
            />
            {errors.customerName && <p className="mt-1 text-xs text-red-500">{errors.customerName.message}</p>}
          </div>
          <div>
            <label className="label">Documento / CUIT</label>
            <input {...register('customerDocumentId')} className="input" placeholder="Opcional" />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input {...register('customerPhone')} className="input" placeholder="Opcional" />
          </div>
        </div>
      </section>

      {/* Detalle de Ítems */}
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Detalle de la Venta</h2>
          <button
            type="button"
            onClick={() => append({ type: 'CUSTOM', quantity: 1, unitPrice: 0, customName: '' })}
            className="btn-secondary !px-4 !py-2 text-sm flex items-center gap-2"
          >
            <Plus size={16} /> Agregar fila
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => {
            const currentType = formItems[index]?.type || 'CUSTOM'
            
            return (
              <div key={field.id} className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)_100px_140px_auto] items-start bg-gray-50 p-3 rounded-2xl border border-gray-100">
                
                <div>
                  <label className="label !text-xs">Tipo</label>
                  <select {...register(`items.${index}.type`)} className="input !py-2.5">
                    <option value="CUSTOM">Manual</option>
                    <option value="CATALOG">Catálogo</option>
                  </select>
                </div>

                <div>
                  <label className="label !text-xs">Descripción del Producto/Servicio *</label>
                  {currentType === 'CATALOG' ? (
                    <select
                      {...register(`items.${index}.productId`, { required: currentType === 'CATALOG' ? 'Requerido' : false })}
                      className="input !py-2.5"
                      onChange={(e) => handleProductChange(index, e.target.value)}
                    >
                      <option value="">Seleccionar producto...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      {...register(`items.${index}.customName`, { required: currentType === 'CUSTOM' ? 'Requerido' : false })}
                      className="input !py-2.5"
                      placeholder="Ej: Impresiones A4, Diseño Gráfico..."
                    />
                  )}
                </div>

                <div>
                  <label className="label !text-xs">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    {...register(`items.${index}.quantity`, { valueAsNumber: true, min: 1 })}
                    className="input !py-2.5"
                  />
                </div>

                <div>
                  <label className="label !text-xs">Precio Unit. ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`items.${index}.unitPrice`, { valueAsNumber: true, min: 0 })}
                    className="input !py-2.5"
                  />
                </div>

                <div className="pt-[28px]">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

              </div>
            )
          })}
        </div>
      </section>

      {/* Totales y Pago */}
      <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Información Adicional</h2>
          
          <div className="space-y-4">
            <div>
              <label className="label">Estado Inicial de la Orden</label>
              <select {...register('orderStatus')} className="input">
                <option value="DELIVERED">Completado / Entregado (Venta Final)</option>
                <option value="PENDING">Pendiente de Aprobación / Diseño</option>
                <option value="PROCESSING">En Producción</option>
                <option value="READY">Listo para Retirar</option>
              </select>
            </div>

            <div>
              <label className="label">Método de Pago</label>
              <select {...register('paymentType')} className="input">
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia / QR</option>
                <option value="MERCADOPAGO">Tarjeta (MercadoPago / Posnet)</option>
                <option value="ZAP_CREDIT">Crédito ZAP (Solo con cuenta previa)</option>
              </select>
            </div>
            
            <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input type="checkbox" {...register('isPartialPayment')} className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500" />
                <span className="text-sm font-semibold text-gray-900">Pago parcial (Seña / Anticipo)</span>
              </label>
              
              {isPartialPayment && (
                <div className="pl-6 animate-in slide-in-from-top-2">
                  <label className="label !text-xs">Monto que abona ahora ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    max={subtotal}
                    {...register('paymentAmount', { valueAsNumber: true, required: isPartialPayment ? 'Requerido' : false })}
                    className="input"
                    placeholder={`Max: $${subtotal}`}
                  />
                  {errors.paymentAmount && <p className="mt-1 text-xs text-red-500">{errors.paymentAmount.message}</p>}
                </div>
              )}
            </div>
            
            <div>
              <label className="label">Concepto o Notas (Aparece en el recibo)</label>
              <textarea
                {...register('notes')}
                className="input resize-none"
                rows={3}
                placeholder="Ej: Pago total por trabajo entregado en el momento."
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-gray-900 p-6 text-white shadow-xl">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400 mb-4">Resumen</h2>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-gray-300">
              <span>Subtotal</span>
              <span>${subtotal.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between font-bold text-2xl text-white pt-3 border-t border-gray-700">
              <span>Total</span>
              <span>${subtotal.toLocaleString('es-AR')}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ED2C71] px-6 py-4 text-sm font-bold text-white transition-all hover:bg-[#F66B9A] disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Generar Recibo y Orden'}
          </button>
          <p className="mt-4 text-xs text-center text-gray-400">
            Esta acción creará una orden en el sistema.
          </p>
        </div>
      </section>
    </form>
  )
}
