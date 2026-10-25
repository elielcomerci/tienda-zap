import { NextResponse } from 'next/server'

export function nodoCatalogErrorResponse(area: 'customers' | 'products', operation: 'read' | 'save' | 'update' | 'delete', error: unknown) {
  console.error(`[nodo/${area}] ${operation} failed`, error instanceof Error ? error.name : 'UnknownError')
  const messages = {
    customers: { read: 'No se pudo cargar la agenda de clientes.', save: 'No se pudo guardar el cliente.', update: 'No se pudo actualizar el cliente.', delete: 'No se pudo eliminar el cliente.' },
    products: { read: 'No se pudo cargar el catálogo de productos.', save: 'No se pudo guardar el ítem.', update: 'No se pudo actualizar el ítem.', delete: 'No se pudo eliminar el ítem.' },
  }
  return NextResponse.json({ error: messages[area][operation] }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
}
