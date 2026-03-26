import { put } from '@vercel/blob'
import { NextRequest } from 'next/server'
import { auth } from '@/auth'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return Response.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const form = await req.formData()
    const file = form.get('file') as File

    if (!file) {
      return Response.json({ error: 'No se encontró el archivo' }, { status: 400 })
    }

    const blob = await put(`productos/${Date.now()}-${file.name}`, file, {
      access: 'public',
    })

    return Response.json({ url: blob.url })
  } catch (error) {
    console.error('Upload error:', error)
    return Response.json({ error: 'Error al subir el archivo' }, { status: 500 })
  }
}
