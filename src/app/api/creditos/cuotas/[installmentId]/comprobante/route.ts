import { createHash } from 'crypto'
import { put } from '@vercel/blob'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const MAX_PAYMENT_PROOF_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_PAYMENT_PROOF_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])

export async function POST(
  req: Request,
  { params }: { params: Promise<{ installmentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Inicia sesion para subir comprobantes.' }, { status: 401 })
    }

    const { installmentId } = await params
    const form = await req.formData()
    const file = form.get('file') as File | null
    const paymentMethod = String(form.get('paymentMethod') || 'TRANSFER')
    const notes = String(form.get('notes') || '').trim() || null

    if (!file) {
      return Response.json({ error: 'Selecciona un archivo.' }, { status: 400 })
    }

    if (file.size > MAX_PAYMENT_PROOF_SIZE_BYTES) {
      return Response.json(
        { error: 'El comprobante supera el maximo de 10MB.' },
        { status: 400 }
      )
    }

    if (!ALLOWED_PAYMENT_PROOF_TYPES.has(file.type)) {
      return Response.json(
        { error: 'Solo aceptamos JPG, PNG, WEBP o PDF.' },
        { status: 400 }
      )
    }

    if (!['TRANSFER', 'CASH', 'OTHER'].includes(paymentMethod)) {
      return Response.json({ error: 'El medio de pago no es valido.' }, { status: 400 })
    }

    const installment = await prisma.zapCreditInstallment.findFirst({
      where: {
        id: installmentId,
        plan: {
          order: {
            userId: session.user.id,
          },
        },
      },
      include: {
        plan: {
          select: {
            id: true,
            status: true,
            orderId: true,
          },
        },
        submissions: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            status: true,
            proofHash: true,
          },
        },
      },
    })

    if (!installment) {
      return Response.json({ error: 'Cuota no encontrada.' }, { status: 404 })
    }

    if (!['ACTIVE', 'APPROVED'].includes(installment.plan.status)) {
      return Response.json(
        { error: 'Este credito todavia no esta habilitado para registrar pagos.' },
        { status: 400 }
      )
    }

    if (installment.status === 'APPROVED') {
      return Response.json(
        { error: 'Esta cuota ya fue aprobada y no admite nuevos comprobantes.' },
        { status: 400 }
      )
    }

    if (installment.submissions.some((submission) => submission.status === 'SUBMITTED')) {
      return Response.json(
        { error: 'Ya hay un comprobante de esta cuota en revision.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const proofHash = createHash('sha256').update(buffer).digest('hex')

    if (installment.submissions.some((submission) => submission.proofHash === proofHash)) {
      return Response.json(
        { error: 'Este comprobante ya fue enviado para esta cuota.' },
        { status: 400 }
      )
    }

    const duplicateSubmission = await prisma.zapCreditPaymentSubmission.findFirst({
      where: {
        proofHash,
      },
      select: {
        id: true,
      },
    })

    const blob = await put(
      `creditos/${installment.plan.id}/${installmentId}-${Date.now()}-${file.name}`,
      file,
      { access: 'public' }
    )

    await prisma.$transaction([
      prisma.zapCreditPaymentSubmission.create({
        data: {
          installmentId,
          planId: installment.plan.id,
          submittedByUserId: session.user.id,
          paymentMethod: paymentMethod as 'TRANSFER' | 'CASH' | 'OTHER',
          amount: installment.amount,
          proofUrl: blob.url,
          proofFileName: file.name,
          proofContentType: file.type,
          proofSizeBytes: file.size,
          proofHash,
          duplicateOfSubmissionId: duplicateSubmission?.id ?? null,
          notes,
        },
      }),
      prisma.zapCreditInstallment.update({
        where: { id: installmentId },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          reviewNotes: null,
        },
      }),
    ])

    revalidatePath('/perfil')
    revalidatePath('/perfil/creditos')
    revalidatePath(`/perfil/creditos/${installment.plan.id}`)
    revalidatePath('/admin/creditos')
    revalidatePath(`/admin/creditos/${installment.plan.id}`)
    revalidatePath(`/admin/ordenes/${installment.plan.orderId}`)

    return Response.json({ ok: true })
  } catch (error) {
    console.error('Credit payment proof upload error:', error)
    return Response.json(
      { error: 'No pudimos subir el comprobante. Intenta de nuevo.' },
      { status: 500 }
    )
  }
}
