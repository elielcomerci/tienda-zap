import Link from 'next/link'
import { ClipboardList, Filter, ShieldCheck } from 'lucide-react'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Auditoria | ZAP Admin' }

type AuditPageProps = {
  searchParams?: Promise<{
    q?: string
    action?: string
    entity?: string
    entityId?: string
    actor?: string
    from?: string
    to?: string
    detail?: string
    page?: string
  }>
}

function getParam(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : ''
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function parseDateInput(value: string, endOfDay = false) {
  if (!value) return null
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatJson(value: unknown) {
  if (value == null) return 'null'
  return JSON.stringify(value, null, 2)
}

export default async function AdminAuditPage({ searchParams }: AuditPageProps) {
  const params = (await searchParams) ?? {}
  const q = getParam(params.q)
  const action = getParam(params.action)
  const entity = getParam(params.entity)
  const entityId = getParam(params.entityId)
  const actor = getParam(params.actor)
  const from = getParam(params.from)
  const to = getParam(params.to)
  const detail = getParam(params.detail)
  const page = Math.max(Number(params.page || '1') || 1, 1)
  const pageSize = 40
  const fromDate = parseDateInput(from)
  const toDate = parseDateInput(to, true)

  const where = {
    ...(action ? { action } : {}),
    ...(entity ? { entityType: entity } : {}),
    ...(entityId ? { entityId } : {}),
    ...(actor ? { actorEmail: { contains: actor, mode: 'insensitive' as const } } : {}),
    ...(fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { actorEmail: { contains: q, mode: 'insensitive' as const } },
            { action: { contains: q, mode: 'insensitive' as const } },
            { entityType: { contains: q, mode: 'insensitive' as const } },
            { entityId: { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [total, logs, actions, entities, selectedLog] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.adminAuditLog.findMany({
      distinct: ['action'],
      orderBy: { action: 'asc' },
      select: { action: true },
    }),
    prisma.adminAuditLog.findMany({
      distinct: ['entityType'],
      orderBy: { entityType: 'asc' },
      select: { entityType: true },
    }),
    detail ? prisma.adminAuditLog.findUnique({ where: { id: detail } }) : null,
  ])
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const queryParams = new URLSearchParams()
  if (q) queryParams.set('q', q)
  if (action) queryParams.set('action', action)
  if (entity) queryParams.set('entity', entity)
  if (entityId) queryParams.set('entityId', entityId)
  if (actor) queryParams.set('actor', actor)
  if (from) queryParams.set('from', from)
  if (to) queryParams.set('to', to)

  const pageHref = (targetPage: number) => {
    const nextParams = new URLSearchParams(queryParams)
    nextParams.set('page', String(targetPage))
    return `/admin/auditoria?${nextParams.toString()}`
  }

  const detailHref = (id: string) => {
    const nextParams = new URLSearchParams(queryParams)
    nextParams.set('page', String(page))
    nextParams.set('detail', id)
    return `/admin/auditoria?${nextParams.toString()}`
  }

  const clearDetailHref = () => {
    const nextParams = new URLSearchParams(queryParams)
    nextParams.set('page', String(page))
    return `/admin/auditoria?${nextParams.toString()}`
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-gray-950 p-6 text-white shadow-xl shadow-gray-950/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/70">
              <ShieldCheck size={14} />
              Control
            </div>
            <h1 className="text-2xl font-black">Auditoria operativa</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
              Registro de acciones sensibles del admin para promociones, cupones y exportaciones.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 text-center">
            <ClipboardList size={22} className="mx-auto mb-1 text-orange-300" />
            <p className="text-2xl font-black">{total}</p>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/50">eventos</p>
          </div>
        </div>
      </div>

      <form className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-gray-500">
          <Filter size={16} />
          Filtros
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
          <input
            name="q"
            defaultValue={q}
            className="input"
            placeholder="Buscar por actor, accion, entidad o descripcion"
          />
          <select name="action" defaultValue={action} className="input">
            <option value="">Todas las acciones</option>
            {actions.map((item) => (
              <option key={item.action} value={item.action}>
                {item.action}
              </option>
            ))}
          </select>
          <select name="entity" defaultValue={entity} className="input">
            <option value="">Todas las entidades</option>
            {entities.map((item) => (
              <option key={item.entityType} value={item.entityType}>
                {item.entityType}
              </option>
            ))}
          </select>
          <button className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-black">
            Aplicar
          </button>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
          <input
            name="actor"
            defaultValue={actor}
            className="input"
            placeholder="Filtrar por actor/email"
          />
          {entityId && <input type="hidden" name="entityId" value={entityId} />}
          <input name="from" type="date" defaultValue={from} className="input" />
          <input name="to" type="date" defaultValue={to} className="input" />
          <Link
            href="/admin/auditoria"
            className="rounded-xl border border-gray-200 px-4 py-2 text-center text-sm font-bold text-gray-700 transition-colors hover:border-orange-300 hover:text-orange-700"
          >
            Limpiar
          </Link>
        </div>
      </form>

      {selectedLog && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-orange-600">
                Detalle de evento
              </p>
              <h2 className="mt-1 text-lg font-black text-gray-900">
                {selectedLog.description || selectedLog.action}
              </h2>
              <p className="mt-1 font-mono text-xs text-gray-500">
                {selectedLog.action} · {selectedLog.entityType}
                {selectedLog.entityId ? ` · ${selectedLog.entityId}` : ''}
              </p>
            </div>
            <Link
              href={clearDetailHref()}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-600 transition-colors hover:border-orange-300 hover:text-orange-700"
            >
              Cerrar
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-gray-500">Antes</p>
              <pre className="max-h-80 overflow-auto rounded-xl bg-gray-950 p-3 text-xs text-gray-100">
                {formatJson(selectedLog.before)}
              </pre>
            </div>
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-gray-500">Despues</p>
              <pre className="max-h-80 overflow-auto rounded-xl bg-gray-950 p-3 text-xs text-gray-100">
                {formatJson(selectedLog.after)}
              </pre>
            </div>
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-gray-500">Metadata</p>
              <pre className="max-h-80 overflow-auto rounded-xl bg-gray-950 p-3 text-xs text-gray-100">
                {formatJson(selectedLog.metadata)}
              </pre>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="grid grid-cols-[170px_1fr_170px_90px] gap-4 border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-gray-500">
          <span>Fecha</span>
          <span>Evento</span>
          <span>Actor</span>
          <span></span>
        </div>
        {logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No hay eventos con esos filtros.</div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="grid grid-cols-[170px_1fr_170px_90px] gap-4 border-b border-gray-100 px-4 py-4 text-sm last:border-b-0"
            >
              <span className="text-gray-500">{formatDate(log.createdAt)}</span>
              <div className="min-w-0">
                <p className="font-black text-gray-900">{log.description || log.action}</p>
                <p className="mt-1 truncate font-mono text-xs text-gray-500">
                  {log.action} · {log.entityType}
                  {log.entityId ? ` · ${log.entityId}` : ''}
                </p>
              </div>
              <span className="truncate text-gray-600">{log.actorEmail || 'sistema'}</span>
              <Link
                href={detailHref(log.id)}
                className="text-right text-sm font-bold text-orange-600 hover:text-orange-700"
              >
                Ver
              </Link>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 text-sm font-semibold text-gray-600">
        <span>
          Pagina {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          <Link
            href={pageHref(Math.max(1, page - 1))}
            className={`rounded-xl border px-3 py-2 ${
              page <= 1 ? 'pointer-events-none opacity-50' : 'hover:border-orange-300 hover:text-orange-700'
            }`}
          >
            Anterior
          </Link>
          <Link
            href={pageHref(Math.min(totalPages, page + 1))}
            className={`rounded-xl border px-3 py-2 ${
              page >= totalPages
                ? 'pointer-events-none opacity-50'
                : 'hover:border-orange-300 hover:text-orange-700'
            }`}
          >
            Siguiente
          </Link>
        </div>
      </div>
    </div>
  )
}
