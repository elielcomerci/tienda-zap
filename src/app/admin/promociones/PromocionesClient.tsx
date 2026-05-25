'use client'

import { useMemo, useState, useRef, ChangeEvent, FormEvent } from 'react'
import {
  BadgePercent,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Check,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  PauseCircle,
  Pencil,
  Plus,
  QrCode,
  Search,
  Ticket,
  Trash2,
  X,
} from 'lucide-react'
import {
  createPromotion,
  deletePromotion,
  exportPromotionCouponsCsv,
  generatePromotionCoupons,
  getPromotionCoupons,
  togglePromotionStatus,
  updatePromotion,
  updatePromotionCoupon,
  uploadPromoLogoToServer,
} from './actions'

type PromotionCouponListItem = {
  code: string
  status: 'AVAILABLE' | 'RESERVED' | 'USED' | 'EXPIRED'
  recipientName: string | null
  recipientBusiness: string | null
  recipientEmail: string | null
  recipientPhone: string | null
  batchName: string | null
  qrPayload: string | null
  scanCount: number
  lastScannedAt: Date | string | null
  metadata: Record<string, unknown> | null
  expiresAt: Date | string | null
  createdAt: Date | string
  _count?: {
    scans: number
    redemptions: number
  }
}

type PromotionWithCounts = {
  id: string
  name: string
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED'
  campaignKind: string | null
  audienceLabel: string | null
  qrBaseUrl: string | null
  priority: number
  discountKind: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  stackable: boolean
  activeFrom: Date | null
  activeTo: Date | null
  maxUses: number | null
  perUserLimit: number | null
  minOrderAmount: number | null
  firstOrderOnly: boolean
  allowedProductIds: string[]
  excludedProductIds: string[]
  allowedCategoryIds: string[]
  excludedCategoryIds: string[]
  welcomeTitle: string | null
  welcomeMessage: string | null
  welcomeConditions: string | null
  welcomeLogoUrl: string | null
  coupons: PromotionCouponListItem[]
  analytics: {
    totalScans: number
    reservedRedemptions: number
    confirmedRedemptions: number
    attributedRevenue: number
    attributedSubtotal: number
    discountGranted: number
    scanConversionRate: number
    couponConversionRate: number
    revenuePerDiscountPeso: number | null
  }
  _count: {
    coupons: number
    redemptions: number
  }
}

type PromotionFormState = {
  id?: string
  name: string
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED'
  campaignKind: string
  audienceLabel: string
  qrBaseUrl: string
  priority: string
  discountKind: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: string
  stackable: boolean
  activeFrom: string
  activeTo: string
  maxUses: string
  perUserLimit: string
  minOrderAmount: string
  firstOrderOnly: boolean
  allowedProductIds: string[]
  excludedProductIds: string[]
  allowedCategoryIds: string[]
  excludedCategoryIds: string[]
  welcomeTitle: string
  welcomeMessage: string
  welcomeConditions: string
  welcomeLogoUrl: string
}

type GenerateFormState = {
  promotionId: string
  quantity: string
  prefix: string
  batchName: string
  publicPresenterName: string
  recipients: string
  qrBaseUrl: string
  expiresAt: string
}

type CouponFormState = {
  code: string
  status: 'AVAILABLE' | 'EXPIRED'
  recipientName: string
  recipientBusiness: string
  recipientEmail: string
  recipientPhone: string
  batchName: string
  publicPresenterName: string
  expiresAt: string
}

type CouponPageState = {
  query: string
  status: 'ALL' | 'AVAILABLE' | 'RESERVED' | 'USED' | 'EXPIRED'
  batchName: string
  expiresMode: 'ALL' | 'ACTIVE' | 'EXPIRED' | 'NO_EXPIRATION'
  page: number
  pageSize: number
  total: number
  totalPages: number
  coupons: PromotionCouponListItem[]
  isLoading: boolean
  error: string
}

const DEFAULT_PROMOTION_FORM: PromotionFormState = {
  name: '',
  status: 'DRAFT',
  campaignKind: '',
  audienceLabel: '',
  qrBaseUrl: '',
  priority: '0',
  discountKind: 'PERCENTAGE',
  discountValue: '',
  stackable: false,
  activeFrom: '',
  activeTo: '',
  maxUses: '',
  perUserLimit: '',
  minOrderAmount: '',
  firstOrderOnly: false,
  allowedProductIds: [],
  excludedProductIds: [],
  allowedCategoryIds: [],
  excludedCategoryIds: [],
  welcomeTitle: '',
  welcomeMessage: '',
  welcomeConditions: '',
  welcomeLogoUrl: '',
}

const DEFAULT_GENERATE_FORM: GenerateFormState = {
  promotionId: '',
  quantity: '25',
  prefix: 'ZAP',
  batchName: '',
  publicPresenterName: '',
  recipients: '',
  qrBaseUrl: '',
  expiresAt: '',
}

const DEFAULT_COUPON_FORM: CouponFormState = {
  code: '',
  status: 'AVAILABLE',
  recipientName: '',
  recipientBusiness: '',
  recipientEmail: '',
  recipientPhone: '',
  batchName: '',
  publicPresenterName: '',
  expiresAt: '',
}

function getCouponMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return ''
  const value = (metadata as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : ''
}

function getSelectedValues(options: HTMLSelectElement['selectedOptions']) {
  return Array.from(options).map((option) => option.value)
}

function ScopeMultiSelect({
  label,
  options,
  selectedIds,
  onChange,
  size = 6,
}: {
  label: string
  options: Array<{ id: string; name: string }>
  selectedIds: string[]
  onChange: (values: string[]) => void
  size?: number
}) {
  const selectedOptions = selectedIds
    .map((id) => options.find((option) => option.id === id))
    .filter(Boolean) as Array<{ id: string; name: string }>

  const removeSelected = (id: string) => {
    onChange(selectedIds.filter((selectedId) => selectedId !== id))
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="label mb-0">{label}</label>
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-bold text-gray-500 transition-colors hover:text-orange-700"
          >
            Limpiar
          </button>
        )}
      </div>
      <select
        multiple
        size={size}
        value={selectedIds}
        onChange={(event) => onChange(getSelectedValues(event.currentTarget.selectedOptions))}
        className={size > 6 ? 'input min-h-44' : 'input min-h-36'}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {selectedOptions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => removeSelected(option.id)}
              className="rounded-full border border-orange-200 bg-white px-2.5 py-1 text-xs font-bold text-orange-700 transition-colors hover:bg-orange-50"
              title="Quitar"
            >
              {option.name} x
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function coerceDate(date: Date | string | null) {
  if (!date) return null
  return date instanceof Date ? date : new Date(date)
}

function formatDateInputValue(date: Date | string | null) {
  const value = coerceDate(date)
  if (!value || Number.isNaN(value.getTime())) return ''
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function formatDisplayDate(date: Date | string | null) {
  const value = coerceDate(date)
  if (!value || Number.isNaN(value.getTime())) return ''
  return value.toLocaleDateString('es-AR')
}

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString('es-AR')}`
}

function formatPercent(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`
}

function createInitialCouponPages(promotions: PromotionWithCounts[]): Record<string, CouponPageState> {
  return Object.fromEntries(
    promotions.map((promotion) => {
      const pageSize = Math.max(promotion.coupons.length, 20)
      return [
        promotion.id,
        {
          query: '',
          status: 'ALL',
          batchName: '',
          expiresMode: 'ALL',
          page: 1,
          pageSize,
          total: promotion._count.coupons,
          totalPages: Math.max(1, Math.ceil(promotion._count.coupons / pageSize)),
          coupons: promotion.coupons,
          isLoading: false,
          error: '',
        },
      ]
    })
  )
}

function formatLegacyDateInputValue(date: Date | null) {
  if (!date) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function mapPromotionToForm(promotion: PromotionWithCounts): PromotionFormState {
  return {
    id: promotion.id,
    name: promotion.name,
    status: promotion.status,
    campaignKind: promotion.campaignKind ?? '',
    audienceLabel: promotion.audienceLabel ?? '',
    qrBaseUrl: promotion.qrBaseUrl ?? '',
    priority: String(promotion.priority ?? 0),
    discountKind: promotion.discountKind,
    discountValue: String(promotion.discountValue),
    stackable: promotion.stackable,
    activeFrom: formatLegacyDateInputValue(promotion.activeFrom),
    activeTo: formatLegacyDateInputValue(promotion.activeTo),
    maxUses: promotion.maxUses != null ? String(promotion.maxUses) : '',
    perUserLimit: promotion.perUserLimit != null ? String(promotion.perUserLimit) : '',
    minOrderAmount: promotion.minOrderAmount != null ? String(promotion.minOrderAmount) : '',
    firstOrderOnly: promotion.firstOrderOnly,
    allowedProductIds: promotion.allowedProductIds ?? [],
    excludedProductIds: promotion.excludedProductIds ?? [],
    allowedCategoryIds: promotion.allowedCategoryIds ?? [],
    excludedCategoryIds: promotion.excludedCategoryIds ?? [],
    welcomeTitle: promotion.welcomeTitle ?? '',
    welcomeMessage: promotion.welcomeMessage ?? '',
    welcomeConditions: promotion.welcomeConditions ?? '',
    welcomeLogoUrl: promotion.welcomeLogoUrl ?? '',
  }
}

function mapCouponToForm(coupon: PromotionWithCounts['coupons'][number]): CouponFormState {
  return {
    code: coupon.code,
    status: coupon.status === 'EXPIRED' ? 'EXPIRED' : 'AVAILABLE',
    recipientName: coupon.recipientName ?? '',
    recipientBusiness: coupon.recipientBusiness ?? '',
    recipientEmail: coupon.recipientEmail ?? '',
    recipientPhone: coupon.recipientPhone ?? '',
    batchName: coupon.batchName ?? '',
    publicPresenterName: getCouponMetadataString(coupon.metadata, 'publicPresenterName'),
    expiresAt: formatDateInputValue(coupon.expiresAt),
  }
}

function statusTheme(status: PromotionWithCounts['status']) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-100 text-emerald-700'
    case 'PAUSED':
      return 'bg-amber-100 text-amber-700'
    case 'EXPIRED':
      return 'bg-gray-200 text-gray-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function couponStatusTheme(status: PromotionWithCounts['coupons'][number]['status']) {
  switch (status) {
    case 'AVAILABLE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'RESERVED':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'USED':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    default:
      return 'bg-rose-50 text-rose-700 border-rose-200'
  }
}

function getPromotionRiskWarnings(form: PromotionFormState) {
  const warnings: string[] = []
  const discountValue = Number(form.discountValue || '0')
  const minOrderAmount = Number(form.minOrderAmount || '0')
  const hasUsageLimit = Boolean(form.maxUses)
  const hasDateLimit = Boolean(form.activeTo)
  const hasScopedReach =
    form.allowedCategoryIds.length > 0 ||
    form.allowedProductIds.length > 0 ||
    form.excludedCategoryIds.length > 0 ||
    form.excludedProductIds.length > 0

  if (form.discountKind === 'PERCENTAGE' && discountValue >= 40) {
    warnings.push('Descuento porcentual alto: revisar margen antes de activar.')
  } else if (form.discountKind === 'PERCENTAGE' && discountValue >= 25 && !hasScopedReach) {
    warnings.push('Descuento relevante aplicado a todo el catalogo: conviene acotar productos o categorias.')
  }

  if (form.discountKind === 'FIXED_AMOUNT' && discountValue > 0 && !minOrderAmount) {
    warnings.push('Monto fijo sin compra minima: puede consumir margen en pedidos chicos.')
  }

  if (form.discountKind === 'FIXED_AMOUNT' && minOrderAmount > 0 && discountValue >= minOrderAmount) {
    warnings.push('El descuento fijo es igual o mayor al minimo de compra.')
  }

  if (form.status === 'ACTIVE' && !hasUsageLimit && !hasDateLimit) {
    warnings.push('Campana activa sin fecha final ni limite total de usos.')
  }

  if (form.stackable && (discountValue >= 20 || !hasScopedReach)) {
    warnings.push('Stacking habilitado en una promo amplia o agresiva: revisar acumulacion futura.')
  }

  if (!form.perUserLimit && !form.firstOrderOnly) {
    warnings.push('Sin limite por usuario: un cliente podria usar varias promos si consigue varios cupones.')
  }

  return warnings
}

export default function PromocionesClient({
  initialPromotions,
  products,
  categories,
}: {
  initialPromotions: PromotionWithCounts[]
  products: Array<{ id: string; name: string; categoryId: string }>
  categories: Array<{ id: string; name: string }>
}) {
  const [promotions, setPromotions] = useState(initialPromotions)
  const [couponPages, setCouponPages] = useState<Record<string, CouponPageState>>(() =>
    createInitialCouponPages(initialPromotions)
  )
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false)
  const [promotionForm, setPromotionForm] = useState<PromotionFormState>(DEFAULT_PROMOTION_FORM)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [generateForm, setGenerateForm] = useState<GenerateFormState>(DEFAULT_GENERATE_FORM)
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false)
  const [couponForm, setCouponForm] = useState<CouponFormState>(DEFAULT_COUPON_FORM)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeCount = useMemo(
    () => promotions.filter((promotion) => promotion.status === 'ACTIVE').length,
    [promotions]
  )
  const campaignTotals = useMemo(
    () =>
      promotions.reduce(
        (totals, promotion) => ({
          coupons: totals.coupons + promotion._count.coupons,
          scans: totals.scans + promotion.analytics.totalScans,
          confirmedRedemptions:
            totals.confirmedRedemptions + promotion.analytics.confirmedRedemptions,
          revenue: totals.revenue + promotion.analytics.attributedRevenue,
          discount: totals.discount + promotion.analytics.discountGranted,
        }),
        { coupons: 0, scans: 0, confirmedRedemptions: 0, revenue: 0, discount: 0 }
      ),
    [promotions]
  )
  const promotionRiskWarnings = useMemo(
    () => getPromotionRiskWarnings(promotionForm),
    [promotionForm]
  )

  const handleOpenPromotionModal = (promotion?: PromotionWithCounts) => {
    setPromotionForm(promotion ? mapPromotionToForm(promotion) : DEFAULT_PROMOTION_FORM)
    setError('')
    setIsPromotionModalOpen(true)
  }

  const handleOpenGenerateModal = (promotion: PromotionWithCounts) => {
    setGenerateForm({
      ...DEFAULT_GENERATE_FORM,
      promotionId: promotion.id,
      qrBaseUrl:
        promotion.qrBaseUrl ||
        (typeof window !== 'undefined' ? window.location.origin : ''),
      prefix: promotion.name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6) || 'ZAP',
    })
    setError('')
    setIsGenerateModalOpen(true)
  }

  const handleOpenCouponModal = (coupon: PromotionWithCounts['coupons'][number]) => {
    setCouponForm(mapCouponToForm(coupon))
    setError('')
    setIsCouponModalOpen(true)
  }

  const loadCouponsPage = async (
    promotionId: string,
    options: { page?: number; query?: string } = {}
  ) => {
    const current = couponPages[promotionId]
    const page = options.page ?? current?.page ?? 1
    const query = options.query ?? current?.query ?? ''
    const status = current?.status ?? 'ALL'
    const batchName = current?.batchName ?? ''
    const expiresMode = current?.expiresMode ?? 'ALL'
    const pageSize = current?.pageSize ?? 20

    setCouponPages((pages) => ({
      ...pages,
      [promotionId]: {
        ...(pages[promotionId] ?? {
          query,
          status,
          batchName,
          expiresMode,
          page,
          pageSize,
          total: 0,
          totalPages: 1,
          coupons: [],
          error: '',
        }),
        query,
        page,
        isLoading: true,
        error: '',
      },
    }))

    try {
      const result = await getPromotionCoupons({
        promotionId,
        query,
        status,
        batchName,
        expiresMode,
        page,
        pageSize,
      })
      setCouponPages((pages) => ({
        ...pages,
        [promotionId]: {
          query,
          status,
          batchName,
          expiresMode,
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
          coupons: result.coupons as PromotionCouponListItem[],
          isLoading: false,
          error: '',
        },
      }))
    } catch (loadError: any) {
      setCouponPages((pages) => ({
        ...pages,
        [promotionId]: {
          ...(pages[promotionId] ?? {
            query,
            status,
            batchName,
            expiresMode,
            page,
            pageSize,
            total: 0,
            totalPages: 1,
            coupons: [],
          }),
          isLoading: false,
          error: loadError.message || 'No pudimos cargar los cupones.',
        },
      }))
    }
  }

  const handleCouponSearchChange = (promotionId: string, query: string) => {
    setCouponPages((pages) => ({
      ...pages,
      [promotionId]: {
        ...(pages[promotionId] ?? {
          query,
          page: 1,
          status: 'ALL',
          batchName: '',
          expiresMode: 'ALL',
          pageSize: 20,
          total: 0,
          totalPages: 1,
          coupons: [],
          isLoading: false,
          error: '',
        }),
        query,
      },
    }))
  }

  const updateCouponFilters = (
    promotionId: string,
    filters: Partial<Pick<CouponPageState, 'status' | 'batchName' | 'expiresMode'>>
  ) => {
    setCouponPages((pages) => ({
      ...pages,
      [promotionId]: {
        ...(pages[promotionId] ?? {
          query: '',
          page: 1,
          status: 'ALL',
          batchName: '',
          expiresMode: 'ALL',
          pageSize: 20,
          total: 0,
          totalPages: 1,
          coupons: [],
          isLoading: false,
          error: '',
        }),
        ...filters,
      },
    }))
  }

  const refreshPage = () => window.location.reload()

  const handleSavePromotion = async (event: FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')

    try {
      const payload = {
        name: promotionForm.name,
        status: promotionForm.status,
        campaignKind: promotionForm.campaignKind || null,
        audienceLabel: promotionForm.audienceLabel || null,
        qrBaseUrl: promotionForm.qrBaseUrl || null,
        priority: Number(promotionForm.priority || '0'),
        discountKind: promotionForm.discountKind,
        discountValue: Number(promotionForm.discountValue || '0'),
        stackable: promotionForm.stackable,
        activeFrom: promotionForm.activeFrom || null,
        activeTo: promotionForm.activeTo || null,
        maxUses: promotionForm.maxUses ? Number(promotionForm.maxUses) : null,
        perUserLimit: promotionForm.perUserLimit ? Number(promotionForm.perUserLimit) : null,
        minOrderAmount: promotionForm.minOrderAmount ? Number(promotionForm.minOrderAmount) : null,
        firstOrderOnly: promotionForm.firstOrderOnly,
        allowedProductIds: promotionForm.allowedProductIds,
        excludedProductIds: promotionForm.excludedProductIds,
        allowedCategoryIds: promotionForm.allowedCategoryIds,
        excludedCategoryIds: promotionForm.excludedCategoryIds,
        welcomeTitle: promotionForm.welcomeTitle || null,
        welcomeMessage: promotionForm.welcomeMessage || null,
        welcomeConditions: promotionForm.welcomeConditions || null,
        welcomeLogoUrl: promotionForm.welcomeLogoUrl || null,
      }

      if (promotionForm.id) {
        await updatePromotion(promotionForm.id, payload)
      } else {
        await createPromotion(payload)
      }

      refreshPage()
    } catch (saveError: any) {
      setError(saveError.message || 'No pudimos guardar la promocion.')
      setIsSaving(false)
    }
  }

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingLogo(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const { publicUrl } = await uploadPromoLogoToServer(formData)

      setPromotionForm((current) => ({ ...current, welcomeLogoUrl: publicUrl }))
    } catch (err: any) {
      setError(err.message || 'No pudimos subir el logo.')
    } finally {
      setIsUploadingLogo(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleGenerateCoupons = async (event: FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')

    try {
      await generatePromotionCoupons({
        promotionId: generateForm.promotionId,
        quantity: Number(generateForm.quantity || '0'),
        prefix: generateForm.prefix,
        batchName: generateForm.batchName || null,
        publicPresenterName: generateForm.publicPresenterName || null,
        recipients: generateForm.recipients || null,
        qrBaseUrl: generateForm.qrBaseUrl || null,
        expiresAt: generateForm.expiresAt || null,
      })

      refreshPage()
    } catch (generateError: any) {
      setError(generateError.message || 'No pudimos generar el lote de cupones.')
      setIsSaving(false)
    }
  }

  const handleSaveCoupon = async (event: FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')

    try {
      await updatePromotionCoupon({
        code: couponForm.code,
        status: couponForm.status,
        recipientName: couponForm.recipientName || null,
        recipientBusiness: couponForm.recipientBusiness || null,
        recipientEmail: couponForm.recipientEmail || null,
        recipientPhone: couponForm.recipientPhone || null,
        batchName: couponForm.batchName || null,
        publicPresenterName: couponForm.publicPresenterName || null,
        expiresAt: couponForm.expiresAt || null,
      })

      refreshPage()
    } catch (saveError: any) {
      setError(saveError.message || 'No pudimos guardar el cupon.')
      setIsSaving(false)
    }
  }

  const handleDeletePromotion = async (id: string) => {
    if (!confirm('¿Eliminar esta promocion?')) return

    try {
      await deletePromotion(id)
      refreshPage()
    } catch (deleteError: any) {
      setError(deleteError.message || 'No pudimos borrar la promocion.')
    }
  }

  const handleCopyCoupon = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      setError('No pudimos copiar el codigo al portapapeles.')
    }
  }

  const handleExportCoupons = async (
    promotion: PromotionWithCounts,
    options?: {
      filtered?: boolean
      query?: string
      status?: CouponPageState['status']
      batchName?: string
      expiresMode?: CouponPageState['expiresMode']
    }
  ) => {
    try {
      const csv = await exportPromotionCouponsCsv({
        promotionId: promotion.id,
        filtered: Boolean(options?.filtered),
        query: options?.query,
        status: options?.status,
        batchName: options?.batchName,
        expiresMode: options?.expiresMode,
      })
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${
        promotion.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'cupones'
      }${options?.filtered ? '-filtrado' : ''}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (exportError: any) {
      setError(exportError.message || 'No pudimos exportar los cupones.')
    }
  }

  const handleQuickStatusChange = async (
    id: string,
    status: PromotionWithCounts['status']
  ) => {
    try {
      await togglePromotionStatus(id, status)
      refreshPage()
    } catch (statusError: any) {
      setError(statusError.message || 'No pudimos cambiar el estado.')
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Ticket className="text-orange-500" size={24} />
            Promociones y Cupones
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Crea promociones transaccionales y genera lotes de cupones listos para checkout.
          </p>
        </div>
        <button
          onClick={() => handleOpenPromotionModal()}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          <Plus size={18} />
          Nueva promocion
        </button>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Promociones cargadas</p>
          <p className="mt-2 text-3xl font-black text-gray-900">{promotions.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Promociones activas</p>
          <p className="mt-2 text-3xl font-black text-gray-900">{activeCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Cupones visibles</p>
          <p className="mt-2 text-3xl font-black text-gray-900">
            {campaignTotals.coupons}
          </p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Escaneos</p>
          <p className="mt-2 text-2xl font-black text-gray-900">{campaignTotals.scans}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Compras atribuidas</p>
          <p className="mt-2 text-2xl font-black text-gray-900">
            {campaignTotals.confirmedRedemptions}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Facturacion atribuida</p>
          <p className="mt-2 text-2xl font-black text-gray-900">
            {formatMoney(campaignTotals.revenue)}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-gray-500">Descuento otorgado</p>
          <p className="mt-2 text-2xl font-black text-gray-900">
            {formatMoney(campaignTotals.discount)}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {promotions.length === 0 ? (
          <div className="card col-span-full p-16 text-center">
            <Ticket size={40} className="mx-auto mb-4 text-gray-300" />
            <h2 className="text-lg font-bold text-gray-900">Todavia no hay promociones</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              Crea la primera promocion para empezar a validar cupones reales desde checkout.
            </p>
          </div>
        ) : (
          promotions.map((promotion) => {
            const couponPage =
              couponPages[promotion.id] ??
              ({
                query: '',
                status: 'ALL',
                batchName: '',
                expiresMode: 'ALL',
                page: 1,
                pageSize: 20,
                total: promotion._count.coupons,
                totalPages: Math.max(1, Math.ceil(promotion._count.coupons / 20)),
                coupons: promotion.coupons,
                isLoading: false,
                error: '',
              } satisfies CouponPageState)

            return (
            <div key={promotion.id} className="card overflow-hidden border-2 border-transparent">
              <div className="border-b border-gray-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${statusTheme(
                          promotion.status
                        )}`}
                      >
                        {promotion.status}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                        Prioridad {promotion.priority}
                      </span>
                      <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                        {promotion.discountKind === 'PERCENTAGE'
                          ? `${promotion.discountValue}% OFF`
                          : `$${promotion.discountValue.toLocaleString('es-AR')} OFF`}
                      </span>
                      {promotion.campaignKind && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          {promotion.campaignKind}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-3 text-xl font-black text-gray-900">{promotion.name}</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {promotion.stackable ? 'Apilable' : 'No apilable'} · max usos:{' '}
                      {promotion.maxUses ?? 'sin tope'} · limite por usuario:{' '}
                      {promotion.perUserLimit ?? 'sin limite'}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Minimo:{' '}
                      {promotion.minOrderAmount != null
                        ? `$${promotion.minOrderAmount.toLocaleString('es-AR')}`
                        : 'sin minimo'}{' '}
                      · {promotion.firstOrderOnly ? 'solo primera compra' : 'sin regla de primera compra'}
                    </p>
                    {promotion.audienceLabel && (
                      <p className="mt-1 text-sm font-medium text-gray-700">
                        Audiencia: {promotion.audienceLabel}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`/admin/promociones/${encodeURIComponent(promotion.id)}`}
                      className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                      title="Ver detalle de campana"
                    >
                      <ExternalLink size={18} />
                    </a>
                    <button
                      onClick={() =>
                        handleQuickStatusChange(
                          promotion.id,
                          promotion.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
                        )
                      }
                      className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                      title={promotion.status === 'ACTIVE' ? 'Pausar promocion' : 'Activar promocion'}
                    >
                      {promotion.status === 'ACTIVE' ? (
                        <PauseCircle size={18} />
                      ) : (
                        <Check size={18} />
                      )}
                    </button>
                    <button
                      onClick={() => handleOpenPromotionModal(promotion)}
                      className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                      title="Editar promocion"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDeletePromotion(promotion.id)}
                      className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Eliminar promocion"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-3">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Cupones
                  </p>
                  <p className="mt-2 text-2xl font-black text-gray-900">
                    {promotion._count.coupons}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Redenciones
                  </p>
                  <p className="mt-2 text-2xl font-black text-gray-900">
                    {promotion._count.redemptions}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Ventana
                  </p>
                  <p suppressHydrationWarning className="mt-2 text-sm font-semibold text-gray-900">
                    {promotion.activeFrom
                      ? promotion.activeFrom.toLocaleDateString('es-AR')
                      : 'sin inicio'}{' '}
                    →{' '}
                    {promotion.activeTo
                      ? promotion.activeTo.toLocaleDateString('es-AR')
                      : 'sin fin'}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 border-t border-gray-100 px-5 py-4 md:grid-cols-4">
                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
                    Escaneos
                  </p>
                  <p className="mt-2 text-xl font-black text-gray-900">
                    {promotion.analytics.totalScans}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                    Conversion
                  </p>
                  <p className="mt-2 text-xl font-black text-gray-900">
                    {formatPercent(promotion.analytics.scanConversionRate)}
                  </p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                    Facturacion
                  </p>
                  <p className="mt-2 text-xl font-black text-gray-900">
                    {formatMoney(promotion.analytics.attributedRevenue)}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    Retorno
                  </p>
                  <p className="mt-2 text-xl font-black text-gray-900">
                    {promotion.analytics.revenuePerDiscountPeso
                      ? `${promotion.analytics.revenuePerDiscountPeso.toFixed(1)}x`
                      : '-'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatMoney(promotion.analytics.discountGranted)} descontado
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-100 p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                      Cupones del lote
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Busca por codigo, persona, negocio, email, telefono o lote.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleOpenGenerateModal(promotion)}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-300 hover:text-orange-700"
                    >
                      <BadgePercent size={16} />
                      Generar lote
                    </button>
                    <button
                      onClick={() =>
                        handleExportCoupons(promotion, {
                          filtered: true,
                          query: couponPage.query,
                          status: couponPage.status,
                          batchName: couponPage.batchName,
                          expiresMode: couponPage.expiresMode,
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-300 hover:text-orange-700"
                    >
                      <Download size={16} />
                      CSV filtrado
                    </button>
                    <button
                      onClick={() => handleExportCoupons(promotion)}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-300 hover:text-orange-700"
                    >
                      <Download size={16} />
                      CSV total
                    </button>
                    {promotion._count.coupons > 0 && (
                      <a
                        href={`/api/admin/promotions/${encodeURIComponent(promotion.id)}/coupons-sheet`}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-300 hover:text-orange-700"
                      >
                        <QrCode size={16} />
                        PDF lote
                      </a>
                    )}
                  </div>
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    loadCouponsPage(promotion.id, { page: 1, query: couponPage.query })
                  }}
                  className="mb-4 space-y-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1">
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        value={couponPage.query}
                        onChange={(event) => handleCouponSearchChange(promotion.id, event.target.value)}
                        className="input pl-9"
                        placeholder="Buscar cupon, negocio, persona o lote"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={couponPage.isLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black disabled:cursor-wait disabled:bg-gray-400"
                    >
                      <Search size={16} />
                      Buscar
                    </button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    <select
                      value={couponPage.status}
                      onChange={(event) =>
                        updateCouponFilters(promotion.id, {
                          status: event.target.value as CouponPageState['status'],
                        })
                      }
                      className="input"
                    >
                      <option value="ALL">Todos los estados</option>
                      <option value="AVAILABLE">Disponibles</option>
                      <option value="RESERVED">Reservados</option>
                      <option value="USED">Usados</option>
                      <option value="EXPIRED">Expirados</option>
                    </select>
                    <input
                      value={couponPage.batchName}
                      onChange={(event) =>
                        updateCouponFilters(promotion.id, { batchName: event.target.value })
                      }
                      className="input"
                      placeholder="Filtrar por lote"
                    />
                    <select
                      value={couponPage.expiresMode}
                      onChange={(event) =>
                        updateCouponFilters(promotion.id, {
                          expiresMode: event.target.value as CouponPageState['expiresMode'],
                        })
                      }
                      className="input"
                    >
                      <option value="ALL">Todos los vencimientos</option>
                      <option value="ACTIVE">Vigentes</option>
                      <option value="EXPIRED">Vencidos por fecha</option>
                      <option value="NO_EXPIRATION">Sin vencimiento</option>
                    </select>
                  </div>
                </form>

                {couponPage.error && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {couponPage.error}
                  </div>
                )}

                {promotion._count.coupons === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
                    Esta promocion todavia no tiene cupones generados.
                  </div>
                ) : couponPage.coupons.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
                    No encontramos cupones con esa busqueda.
                  </div>
                ) : (
                  <div className={couponPage.isLoading ? 'space-y-3 opacity-60' : 'space-y-3'}>
                    {couponPage.coupons.map((coupon) => (
                      <div
                        key={coupon.code}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm font-bold text-gray-900">
                            {coupon.code}
                          </p>
                          {(coupon.recipientName || coupon.recipientBusiness || coupon.batchName) && (
                            <p className="mt-1 truncate text-xs font-semibold text-gray-700">
                              {[coupon.recipientName, coupon.recipientBusiness, coupon.batchName]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          )}
                          <p suppressHydrationWarning className="mt-1 text-xs text-gray-500">
                            {coupon.expiresAt
                              ? `vence ${formatDisplayDate(coupon.expiresAt)}`
                              : 'sin vencimiento'}{' '}
                            · creado {formatDisplayDate(coupon.createdAt)}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Escaneos: {coupon.scanCount ?? coupon._count?.scans ?? 0}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${couponStatusTheme(
                              coupon.status
                            )}`}
                          >
                            {coupon.status}
                          </span>
                          <button
                            onClick={() => handleOpenCouponModal(coupon)}
                            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                            title="Editar destinatario del cupon"
                          >
                            <Pencil size={16} />
                          </button>
                          <a
                            href={`/admin/auditoria?entity=PromotionCoupon&entityId=${encodeURIComponent(coupon.code)}`}
                            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                            title="Ver auditoria del cupon"
                          >
                            <ClipboardList size={16} />
                          </a>
                          <button
                            onClick={() => handleCopyCoupon(coupon.code)}
                            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                            title="Copiar codigo"
                          >
                            <Copy size={16} />
                          </button>
                          <a
                            href={`/api/admin/coupons/${encodeURIComponent(coupon.code)}/qr`}
                            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                            title="Descargar tarjeta PDF"
                          >
                            <QrCode size={16} />
                          </a>
                          <a
                            href={coupon.qrPayload || `/cupon/${encodeURIComponent(coupon.code)}`}
                            target="_blank"
                            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                            title="Probar link del cupon"
                          >
                            <ExternalLink size={16} />
                          </a>
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-semibold text-gray-600">
                        Pagina {couponPage.page} de {couponPage.totalPages} - {couponPage.total}{' '}
                        cupones
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={couponPage.isLoading || couponPage.page <= 1}
                          onClick={() => loadCouponsPage(promotion.id, { page: couponPage.page - 1 })}
                          className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-300 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ChevronLeft size={16} />
                          Anterior
                        </button>
                        <button
                          type="button"
                          disabled={couponPage.isLoading || couponPage.page >= couponPage.totalPages}
                          onClick={() => loadCouponsPage(promotion.id, { page: couponPage.page + 1 })}
                          className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-300 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Siguiente
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )
          })
        )}
      </div>

      {isPromotionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/90 px-6 py-5 backdrop-blur-md">
              <h2 className="text-xl font-bold text-gray-900">
                {promotionForm.id ? 'Editar promocion' : 'Nueva promocion'}
              </h2>
              <button
                onClick={() => setIsPromotionModalOpen(false)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePromotion} className="space-y-6 p-6">
              <div>
                <label className="label">Nombre</label>
                <input
                  value={promotionForm.name}
                  onChange={(event) =>
                    setPromotionForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="input"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Tipo de campana</label>
                  <input
                    value={promotionForm.campaignKind}
                    onChange={(event) =>
                      setPromotionForm((current) => ({
                        ...current,
                        campaignKind: event.target.value,
                      }))
                    }
                    className="input"
                    placeholder="Ej: QR personalizado"
                  />
                </div>
                <div>
                  <label className="label">Audiencia</label>
                  <input
                    value={promotionForm.audienceLabel}
                    onChange={(event) =>
                      setPromotionForm((current) => ({
                        ...current,
                        audienceLabel: event.target.value,
                      }))
                    }
                    className="input"
                    placeholder="Ej: Comercios zona centro"
                  />
                </div>
              </div>

              <div>
                <label className="label">URL base para QR</label>
                <input
                  value={promotionForm.qrBaseUrl}
                  onChange={(event) =>
                    setPromotionForm((current) => ({ ...current, qrBaseUrl: event.target.value }))
                  }
                  className="input"
                  placeholder="Ej: https://tutienda.com"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Estado</label>
                  <select
                    value={promotionForm.status}
                    onChange={(event) =>
                      setPromotionForm((current) => ({
                        ...current,
                        status: event.target.value as PromotionFormState['status'],
                      }))
                    }
                    className="input"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PAUSED">Paused</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                </div>
                <div>
                  <label className="label">Prioridad</label>
                  <input
                    type="number"
                    value={promotionForm.priority}
                    onChange={(event) =>
                      setPromotionForm((current) => ({ ...current, priority: event.target.value }))
                    }
                    className="input"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Tipo de descuento</label>
                  <select
                    value={promotionForm.discountKind}
                    onChange={(event) =>
                      setPromotionForm((current) => ({
                        ...current,
                        discountKind: event.target.value as PromotionFormState['discountKind'],
                      }))
                    }
                    className="input"
                  >
                    <option value="PERCENTAGE">Porcentaje</option>
                    <option value="FIXED_AMOUNT">Monto fijo</option>
                  </select>
                </div>
                <div>
                  <label className="label">
                    {promotionForm.discountKind === 'PERCENTAGE'
                      ? 'Valor (%)'
                      : 'Valor fijo ($)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={promotionForm.discountValue}
                    onChange={(event) =>
                      setPromotionForm((current) => ({
                        ...current,
                        discountValue: event.target.value,
                      }))
                    }
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Activa desde</label>
                  <input
                    type="datetime-local"
                    value={promotionForm.activeFrom}
                    onChange={(event) =>
                      setPromotionForm((current) => ({ ...current, activeFrom: event.target.value }))
                    }
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Activa hasta</label>
                  <input
                    type="datetime-local"
                    value={promotionForm.activeTo}
                    onChange={(event) =>
                      setPromotionForm((current) => ({ ...current, activeTo: event.target.value }))
                    }
                    className="input"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Maximo de usos</label>
                  <input
                    type="number"
                    min="1"
                    value={promotionForm.maxUses}
                    onChange={(event) =>
                      setPromotionForm((current) => ({ ...current, maxUses: event.target.value }))
                    }
                    className="input"
                    placeholder="Sin tope"
                  />
                </div>
                <div>
                  <label className="label">Limite por usuario</label>
                  <input
                    type="number"
                    min="1"
                    value={promotionForm.perUserLimit}
                    onChange={(event) =>
                      setPromotionForm((current) => ({
                        ...current,
                        perUserLimit: event.target.value,
                      }))
                    }
                    className="input"
                    placeholder="Sin limite"
                  />
                </div>
              </div>

              {promotionRiskWarnings.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-black text-amber-900">
                    <AlertTriangle size={18} />
                    Advertencias comerciales
                  </div>
                  <ul className="space-y-1 text-sm leading-6 text-amber-900">
                    {promotionRiskWarnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Monto minimo del pedido</label>
                  <input
                    type="number"
                    min="0"
                    value={promotionForm.minOrderAmount}
                    onChange={(event) =>
                      setPromotionForm((current) => ({
                        ...current,
                        minOrderAmount: event.target.value,
                      }))
                    }
                    className="input"
                    placeholder="Sin minimo"
                  />
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={promotionForm.firstOrderOnly}
                    onChange={(event) =>
                      setPromotionForm((current) => ({
                        ...current,
                        firstOrderOnly: event.target.checked,
                      }))
                    }
                  />
                  Solo primera compra del cliente
                </label>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-4">
                  <p className="text-sm font-black text-gray-900">Alcance del descuento</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Si elegis productos o categorias permitidas, el descuento se calcula solo sobre esos items.
                    Las exclusiones siempre tienen prioridad.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <ScopeMultiSelect
                    label="Categorias permitidas"
                    options={categories}
                    selectedIds={promotionForm.allowedCategoryIds}
                    onChange={(values) =>
                      setPromotionForm((current) => ({ ...current, allowedCategoryIds: values }))
                    }
                  />
                  <ScopeMultiSelect
                    label="Categorias excluidas"
                    options={categories}
                    selectedIds={promotionForm.excludedCategoryIds}
                    onChange={(values) =>
                      setPromotionForm((current) => ({ ...current, excludedCategoryIds: values }))
                    }
                  />
                  <ScopeMultiSelect
                    label="Productos permitidos"
                    options={products}
                    selectedIds={promotionForm.allowedProductIds}
                    size={8}
                    onChange={(values) =>
                      setPromotionForm((current) => ({ ...current, allowedProductIds: values }))
                    }
                  />
                  <ScopeMultiSelect
                    label="Productos excluidos"
                    options={products}
                    selectedIds={promotionForm.excludedProductIds}
                    size={8}
                    onChange={(values) =>
                      setPromotionForm((current) => ({ ...current, excludedProductIds: values }))
                    }
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={promotionForm.stackable}
                  onChange={(event) =>
                    setPromotionForm((current) => ({
                      ...current,
                      stackable: event.target.checked,
                    }))
                  }
                />
                Permitir stacking futuro
              </label>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Modal de Bienvenida Premium</h3>
                <p className="text-xs text-gray-500">
                  Completar estos campos activará un modal automático cuando el cliente ingrese por una campaña o escanee un QR.
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label">Título</label>
                    <input
                      value={promotionForm.welcomeTitle}
                      onChange={(event) =>
                        setPromotionForm((current) => ({ ...current, welcomeTitle: event.target.value }))
                      }
                      className="input"
                      placeholder="Ej: Beneficio Exclusivo REMAX"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="label">URL Logo (opcional)</label>
                    <div className="flex gap-2">
                      <input
                        value={promotionForm.welcomeLogoUrl}
                        onChange={(event) =>
                          setPromotionForm((current) => ({ ...current, welcomeLogoUrl: event.target.value }))
                        }
                        className="input flex-1"
                        placeholder="https://..."
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingLogo}
                        className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                      >
                        {isUploadingLogo ? 'Subiendo...' : 'Subir'}
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleLogoUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>
                    {promotionForm.welcomeLogoUrl && (
                      <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50 p-2 flex items-center justify-center h-20 w-32 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={promotionForm.welcomeLogoUrl} 
                          alt="Preview" 
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5Y2EzYWYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMiAxMmw1LjI1LTUuMjVhMi4yNSAyLjI1IDAgMCAxMy4xOCAwTDExIDEwIi8+PHBhdGggZD0iTTExIDEwbDQuMjUtNC4yNWEyLjI1IDIuMjUgMCAwIDEzLjE4IDBMMjIgMTIiLz48Y2lyY2xlIGN4PSI4LjUiIGN5PSI4LjUiIHI9IjEuNSIvPjxwb2x5Z29uIHBvaW50cz0iMyAzIDIxIDIxIi8+PC9zdmc+'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="label">Mensaje</label>
                  <textarea
                    value={promotionForm.welcomeMessage}
                    onChange={(event) =>
                      setPromotionForm((current) => ({ ...current, welcomeMessage: event.target.value }))
                    }
                    className="input min-h-[80px]"
                    placeholder="Ej: Tenés un 20% de descuento por los próximos 30 días..."
                  />
                </div>

                <div>
                  <label className="label">Condiciones (letra chica)</label>
                  <input
                    value={promotionForm.welcomeConditions}
                    onChange={(event) =>
                      setPromotionForm((current) => ({ ...current, welcomeConditions: event.target.value }))
                    }
                    className="input"
                    placeholder="Ej: Válido hasta el 31/12. No acumulable."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPromotionModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-wait disabled:bg-orange-300"
                >
                  {isSaving ? 'Guardando...' : 'Guardar promocion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/90 px-6 py-5 backdrop-blur-md">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Editar cupon</h2>
                <p className="mt-1 font-mono text-xs font-bold text-gray-500">{couponForm.code}</p>
              </div>
              <button
                onClick={() => setIsCouponModalOpen(false)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-5 p-6">
              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm leading-6 text-orange-900">
                Estos datos personalizan la experiencia publica. Si cargas negocio/persona, el cliente
                vera que el beneficio fue preparado para ese destinatario o acercado por ese referente.
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Persona destinataria</label>
                  <input
                    value={couponForm.recipientName}
                    onChange={(event) =>
                      setCouponForm((current) => ({ ...current, recipientName: event.target.value }))
                    }
                    className="input"
                    placeholder="Ej: Ana Lopez"
                  />
                </div>
                <div>
                  <label className="label">Negocio destinatario</label>
                  <input
                    value={couponForm.recipientBusiness}
                    onChange={(event) =>
                      setCouponForm((current) => ({ ...current, recipientBusiness: event.target.value }))
                    }
                    className="input"
                    placeholder="Ej: Grafica Norte"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={couponForm.recipientEmail}
                    onChange={(event) =>
                      setCouponForm((current) => ({ ...current, recipientEmail: event.target.value }))
                    }
                    className="input"
                    placeholder="ana@mail.com"
                  />
                </div>
                <div>
                  <label className="label">Telefono</label>
                  <input
                    value={couponForm.recipientPhone}
                    onChange={(event) =>
                      setCouponForm((current) => ({ ...current, recipientPhone: event.target.value }))
                    }
                    className="input"
                    placeholder="341..."
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Lote / origen</label>
                  <input
                    value={couponForm.batchName}
                    onChange={(event) =>
                      setCouponForm((current) => ({ ...current, batchName: event.target.value }))
                    }
                    className="input"
                    placeholder="Ej: Expo mayo 2026"
                  />
                </div>
                <div>
                  <label className="label">Nombre visible publico</label>
                  <input
                    value={couponForm.publicPresenterName}
                    onChange={(event) =>
                      setCouponForm((current) => ({ ...current, publicPresenterName: event.target.value }))
                    }
                    className="input"
                    placeholder="Ej: REMAX, Cafe Norte, Ana Lopez"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Tiene prioridad sobre negocio/persona para el texto publico del cupon.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Estado</label>
                  <select
                    value={couponForm.status}
                    onChange={(event) =>
                      setCouponForm((current) => ({
                        ...current,
                        status: event.target.value as CouponFormState['status'],
                      }))
                    }
                    className="input"
                  >
                    <option value="AVAILABLE">Disponible</option>
                    <option value="EXPIRED">Expirado</option>
                  </select>
                </div>
                <div>
                  <label className="label">Vencimiento</label>
                  <input
                    type="datetime-local"
                    value={couponForm.expiresAt}
                    onChange={(event) =>
                      setCouponForm((current) => ({ ...current, expiresAt: event.target.value }))
                    }
                    className="input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-wait disabled:bg-orange-300"
                >
                  {isSaving ? 'Guardando...' : 'Guardar cupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <h2 className="text-xl font-bold text-gray-900">Generar lote de cupones</h2>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGenerateCoupons} className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={generateForm.quantity}
                    onChange={(event) =>
                      setGenerateForm((current) => ({ ...current, quantity: event.target.value }))
                    }
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Prefijo</label>
                  <input
                    value={generateForm.prefix}
                    onChange={(event) =>
                      setGenerateForm((current) => ({ ...current, prefix: event.target.value }))
                    }
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Nombre del lote</label>
                  <input
                    value={generateForm.batchName}
                    onChange={(event) =>
                      setGenerateForm((current) => ({ ...current, batchName: event.target.value }))
                    }
                    className="input"
                    placeholder="Ej: Expo mayo 2026"
                  />
                </div>
                <div>
                  <label className="label">Nombre visible del referente</label>
                  <input
                    value={generateForm.publicPresenterName}
                    onChange={(event) =>
                      setGenerateForm((current) => ({ ...current, publicPresenterName: event.target.value }))
                    }
                    className="input"
                    placeholder="Ej: REMAX, C21, Dra. Lopez, Cafe Norte"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Se muestra al cliente como beneficio acercado por este referente. No uses aca nombres internos.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">URL base para QR</label>
                  <input
                    value={generateForm.qrBaseUrl}
                    onChange={(event) =>
                      setGenerateForm((current) => ({ ...current, qrBaseUrl: event.target.value }))
                    }
                    className="input"
                    placeholder="https://tutienda.com"
                  />
                </div>
              </div>

              <div>
                <label className="label">Vencimiento del lote (opcional)</label>
                <input
                  type="datetime-local"
                  value={generateForm.expiresAt}
                  onChange={(event) =>
                    setGenerateForm((current) => ({ ...current, expiresAt: event.target.value }))
                  }
                  className="input"
                />
              </div>

              <div>
                <label className="label">Destinatarios variables (opcional)</label>
                <textarea
                  value={generateForm.recipients}
                  onChange={(event) =>
                    setGenerateForm((current) => ({ ...current, recipients: event.target.value }))
                  }
                  className="input min-h-32"
                  placeholder={'Nombre, Negocio, email, telefono\nAna Lopez, Grafica Norte, ana@mail.com, 341...'}
                />
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Si cargas destinatarios, generamos un cupon unico por linea y la cantidad se toma
                  de la lista. Las columnas extra quedan guardadas como variables de campana.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                Generamos codigos no secuenciales del estilo <strong>ZAP-7F3K9Q2A-X</strong>, su
                landing <strong>/cupon/codigo</strong>, tarjeta PDF individual y pliego PDF de lote.
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-wait disabled:bg-orange-300"
                >
                  {isSaving ? 'Generando...' : 'Generar cupones'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
