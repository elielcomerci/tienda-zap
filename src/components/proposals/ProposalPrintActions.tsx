'use client'

export default function ProposalPrintActions() {
  return <div className="no-print flex justify-end"><button type="button" onClick={() => window.print()} className="btn-secondary">Imprimir / Guardar PDF</button></div>
}
