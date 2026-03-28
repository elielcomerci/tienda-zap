type InstallmentLike = {
  dueDate: Date
  amount: number
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  submissions?: Array<{ duplicateOfSubmissionId?: string | null }>
}

type CreditPlanLike = {
  status: 'REQUESTED' | 'QUOTED' | 'APPROVED' | 'ACTIVE' | 'COMPLETED' | 'REJECTED' | 'CANCELLED'
  financedAmount: number
  scheduleItems: InstallmentLike[]
}

export function getCreditPlanStatusLabel(status: CreditPlanLike['status']) {
  switch (status) {
    case 'REQUESTED':
      return 'Solicitado'
    case 'QUOTED':
      return 'Cotizado'
    case 'APPROVED':
      return 'Aprobado'
    case 'ACTIVE':
      return 'Activo'
    case 'COMPLETED':
      return 'Completado'
    case 'REJECTED':
      return 'Rechazado'
    case 'CANCELLED':
      return 'Cancelado'
    default:
      return status
  }
}

export function getCreditPlanStatusTheme(status: CreditPlanLike['status']) {
  switch (status) {
    case 'REQUESTED':
      return 'bg-yellow-100 text-yellow-800'
    case 'QUOTED':
      return 'bg-orange-100 text-orange-800'
    case 'APPROVED':
      return 'bg-sky-100 text-sky-800'
    case 'ACTIVE':
      return 'bg-blue-100 text-blue-800'
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-800'
    case 'REJECTED':
      return 'bg-red-100 text-red-800'
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export function getInstallmentDisplayStatus(
  installment: InstallmentLike,
  planStatus: CreditPlanLike['status']
) {
  if (installment.status === 'APPROVED') {
    return { key: 'APPROVED', label: 'Aprobada', theme: 'bg-emerald-100 text-emerald-800' }
  }

  if (installment.status === 'SUBMITTED') {
    return { key: 'SUBMITTED', label: 'En revisión', theme: 'bg-blue-100 text-blue-800' }
  }

  if (installment.status === 'REJECTED') {
    return { key: 'REJECTED', label: 'Rechazada', theme: 'bg-red-100 text-red-800' }
  }

  if (installment.status === 'CANCELLED') {
    return { key: 'CANCELLED', label: 'Cancelada', theme: 'bg-gray-100 text-gray-700' }
  }

  if (
    planStatus === 'ACTIVE' &&
    installment.dueDate.getTime() < Date.now() &&
    installment.status === 'PENDING'
  ) {
    return { key: 'OVERDUE', label: 'Vencida', theme: 'bg-rose-100 text-rose-800' }
  }

  if (planStatus === 'REQUESTED' || planStatus === 'QUOTED') {
    return { key: 'WAITING', label: 'Pendiente de activar', theme: 'bg-orange-100 text-orange-800' }
  }

  return { key: 'PENDING', label: 'Pendiente', theme: 'bg-amber-100 text-amber-800' }
}

export function summarizeCreditPlan(plan: CreditPlanLike) {
  const now = Date.now()
  const approvedItems = plan.scheduleItems.filter((item) => item.status === 'APPROVED')
  const submittedItems = plan.scheduleItems.filter((item) => item.status === 'SUBMITTED')
  const rejectedItems = plan.scheduleItems.filter((item) => item.status === 'REJECTED')
  const activeItems = plan.scheduleItems.filter((item) => item.status !== 'CANCELLED')
  const overdueItems = plan.scheduleItems.filter(
    (item) =>
      item.status === 'PENDING' &&
      plan.status === 'ACTIVE' &&
      item.dueDate.getTime() < now
  )
  const pendingItems = plan.scheduleItems.filter(
    (item) => item.status === 'PENDING' && item.dueDate.getTime() >= now
  )
  const paidAmount = approvedItems.reduce((total, item) => total + item.amount, 0)
  const totalScheduledAmount = activeItems.reduce((total, item) => total + item.amount, 0)
  const remainingAmount =
    plan.scheduleItems.length > 0
      ? plan.scheduleItems
          .filter((item) => item.status !== 'APPROVED' && item.status !== 'CANCELLED')
          .reduce((total, item) => total + item.amount, 0)
      : Math.max(0, plan.financedAmount - paidAmount)
  const installmentProgressPercent =
    activeItems.length > 0 ? Math.round((approvedItems.length / activeItems.length) * 100) : 0
  const paymentProgressPercent =
    totalScheduledAmount > 0 ? Math.round((paidAmount / totalScheduledAmount) * 100) : 0
  const nextDueItem =
    plan.scheduleItems
      .filter((item) => item.status !== 'APPROVED' && item.status !== 'CANCELLED')
      .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime())[0] || null
  const flaggedSubmissions = plan.scheduleItems.reduce((count, item) => {
    return (
      count +
      (item.submissions?.filter((submission) => Boolean(submission.duplicateOfSubmissionId)).length || 0)
    )
  }, 0)

  return {
    approvedCount: approvedItems.length,
    submittedCount: submittedItems.length,
    rejectedCount: rejectedItems.length,
    overdueCount: overdueItems.length,
    pendingCount: pendingItems.length,
    paidAmount,
    remainingAmount,
    totalScheduledAmount,
    installmentProgressPercent,
    paymentProgressPercent,
    nextDueItem,
    flaggedSubmissions,
  }
}
