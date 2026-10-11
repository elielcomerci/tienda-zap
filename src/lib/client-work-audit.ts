import { prisma } from '@/lib/prisma'

type ClientWorkActivity = {
  actorId: string
  actorEmail?: string | null
  action: string
  entityType: 'ClientWork' | 'ClientWorkFile'
  entityId: string
  description: string
  metadata?: Record<string, string | number | boolean | null>
}

export async function recordClientWorkActivity(activity: ClientWorkActivity) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: activity.actorId,
        actorEmail: activity.actorEmail || null,
        action: activity.action,
        entityType: activity.entityType,
        entityId: activity.entityId,
        description: activity.description,
        metadata: activity.metadata ? JSON.parse(JSON.stringify(activity.metadata)) : undefined,
      },
    })
  } catch (error) {
    // Logging must not turn a completed file operation into a reported failure.
    console.error('No se pudo registrar la actividad de trabajos y archivos:', error)
  }
}
