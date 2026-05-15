import IntentionForm from '../IntentionForm'

export default function NewIntentionPage() {
  return (
    <div className="space-y-6 max-w-[800px] mx-auto p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Objetivo</h1>
        <p className="text-sm text-gray-500 mt-1">
          Creá un nuevo objetivo o intención comercial para agrupar productos en el catálogo.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <IntentionForm />
      </div>
    </div>
  )
}
