import { put } from '@vercel/blob'
import { NextRequest } from 'next/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null

    if (!file) {
      return Response.json({ error: 'No se encontro el archivo.' }, { status: 400 })
    }

    if (file.type !== 'image/png') {
      return Response.json({ error: 'Solo se aceptan PNG para estampas.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ error: 'El PNG debe pesar como maximo 5MB.' }, { status: 400 })
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')
    const blob = await put(`disenos-clientes/${Date.now()}-${safeName}`, file, {
      access: 'public',
    })

    return Response.json({ url: blob.url })
  } catch (error) {
    console.error('Product design upload error:', error)
    return Response.json({ error: 'No pudimos subir el diseno.' }, { status: 500 })
  }
}
