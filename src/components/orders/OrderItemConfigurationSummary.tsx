type Selection = { name: string; value: string }

function readSnapshot(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const snapshot = value as Record<string, unknown>
  const selections = Array.isArray(snapshot.selections)
    ? snapshot.selections.filter(
        (item): item is Selection =>
          Boolean(item) && typeof item === 'object' &&
          typeof (item as Selection).name === 'string' &&
          typeof (item as Selection).value === 'string'
      )
    : []
  return { version: typeof snapshot.version === 'string' ? snapshot.version : null, selections }
}

export default function OrderItemConfigurationSummary({ snapshot }: { snapshot?: unknown }) {
  const configuration = readSnapshot(snapshot)
  if (!configuration || configuration.selections.length === 0) return null

  return (
    <div className="mt-3 rounded-xl border border-[#4576B9]/20 bg-[#EEF4FC]/55 p-3 text-sm">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2F5F9F]">
        Configuración confirmada{configuration.version ? ` · ${configuration.version}` : ''}
      </p>
      <dl className="grid gap-2 sm:grid-cols-2">
        {configuration.selections.map((selection) => (
          <div key={`${selection.name}-${selection.value}`} className="rounded-lg bg-white p-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">{selection.name}</dt>
            <dd className="mt-1 text-xs font-medium text-gray-800">{selection.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
