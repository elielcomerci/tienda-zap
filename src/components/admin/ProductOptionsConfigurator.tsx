'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Eye,
  ImageIcon,
  Plus,
  RefreshCcw,
  Tag,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'

type OptionDisplayType = 'BUTTON' | 'COLOR_SWATCH' | 'SIZE'

type OptionValue = {
  id?: string
  value: string
  colorHex?: string
}

type OptionTemplate = {
  id: string
  label: string
  description: string
  options: Option[]
}

type ValuePreset = {
  id: string
  label: string
  values: OptionValue[]
}

const MAX_VARIANT_MATRIX_SIZE = 2500

export interface Option {
  id?: string
  name: string
  displayType?: OptionDisplayType
  isRequired: boolean
  values: OptionValue[]
}

export interface Variant {
  id?: string
  combinations: Record<string, string>
  price: number
  sku?: string
  stock?: number
  imageUrl?: string
}

function cartesianProduct(options: Option[]): Record<string, string>[] {
  const validOptions = options
    .map((option) => ({
      ...option,
      values: option.values.filter((value) => value.value.trim()),
    }))
    .filter((option) => option.name.trim() && option.values.length > 0)
  if (validOptions.length === 0) return []

  return validOptions.reduce<Record<string, string>[]>((accumulator, option) => {
    const next: Record<string, string>[] = []
    const baseCombinations = accumulator.length > 0 ? accumulator : [{}]

    for (const combination of baseCombinations) {
      for (const value of option.values) {
        next.push({ ...combination, [option.name]: value.value })
      }
    }

    return next
  }, [])
}

function countVariantCombinations(options: Option[]) {
  return options
    .map((option) => ({
      name: option.name.trim(),
      valueCount: option.values.filter((value) => value.value.trim()).length,
    }))
    .filter((option) => option.name && option.valueCount > 0)
    .reduce((total, option) => total * option.valueCount, 1)
}

function normalizeOptionValue(value: string | OptionValue): OptionValue {
  if (typeof value === 'string') {
    return { value, colorHex: '' }
  }

  return {
    id: value.id,
    value: value.value || '',
    colorHex: value.colorHex || '',
  }
}

function normalizeOptions(options: Option[]): Option[] {
  return options.map((option) => ({
    ...option,
    displayType: option.displayType || 'BUTTON',
    values: option.values.map(normalizeOptionValue),
  }))
}

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}

function findExactVariant(variants: Variant[], combination: Record<string, string>) {
  return variants.find((variant) => {
    const variantKeys = Object.keys(variant.combinations)
    const combinationKeys = Object.keys(combination)
    if (variantKeys.length !== combinationKeys.length) return false
    return variantKeys.every((key) => variant.combinations[key] === combination[key])
  })
}

function getVisualMatchOptionNames(options: Option[]) {
  const colorOptions = options
    .filter((option) => option.displayType === 'COLOR_SWATCH' || option.name.toLowerCase().includes('color'))
    .map((option) => option.name)

  return colorOptions.length > 0 ? colorOptions : []
}

function getPriceMatrixOptions(options: Option[]) {
  return options.filter(
    (option) => option.name.trim() && option.values.some((value) => value.value.trim())
  )
}

function findVisualVariant(
  variants: Variant[],
  combination: Record<string, string>,
  optionNames: string[]
) {
  if (optionNames.length === 0) return undefined

  return variants.find((variant) => {
    if (!variant.imageUrl) return false
    return optionNames.every((optionName) => {
      const currentValue = variant.combinations[optionName]
      const nextValue = combination[optionName]
      return currentValue && nextValue && normalizeText(currentValue) === normalizeText(nextValue)
    })
  })
}

function findSubsetVariant(variants: Variant[], combination: Record<string, string>) {
  const combinationEntries = Object.entries(combination)
  if (combinationEntries.length === 0) return undefined

  return variants.find((variant) =>
    combinationEntries.every(([optionName, value]) => variant.combinations[optionName] === value)
  )
}

function findBestVariantForCombination(variants: Variant[], combination: Record<string, string>) {
  const exact = findExactVariant(variants, combination)
  if (exact && exact.price > 0) return exact

  const combinationEntries = Object.entries(combination)
  const subsetMatches = variants.filter((variant) =>
    combinationEntries.every(([optionName, value]) => variant.combinations[optionName] === value)
  )
  const pricedSubset = subsetMatches.find((variant) => variant.price > 0)
  if (pricedSubset) return pricedSubset
  if (subsetMatches[0]) return subsetMatches[0]

  const partialMatches = variants.filter((variant) =>
    Object.entries(variant.combinations).every(
      ([optionName, value]) => !value || combination[optionName] === value
    )
  )
  const pricedPartial = partialMatches.find((variant) => variant.price > 0)
  if (pricedPartial) return pricedPartial

  return exact || partialMatches[0]
}

const OPTION_TEMPLATES: OptionTemplate[] = [
  {
    id: 'unit-volume',
    label: 'Volumen',
    description: 'Litros, mililitros o cm3 para bebidas, limpieza, perfumeria, lubricantes o quimicos.',
    options: [
      {
        name: 'Presentacion',
        displayType: 'SIZE',
        isRequired: true,
        values: ['250 ml', '500 ml', '1 L', '5 L', 'Personalizado'].map((value) => ({ value })),
      },
    ],
  },
  {
    id: 'unit-weight',
    label: 'Peso',
    description: 'Gramos y kilos para alimentos, insumos, ferreteria, pet shop o venta a granel.',
    options: [
      {
        name: 'Peso',
        displayType: 'SIZE',
        isRequired: true,
        values: ['100 g', '250 g', '500 g', '1 kg', 'Personalizado'].map((value) => ({ value })),
      },
    ],
  },
  {
    id: 'unit-length',
    label: 'Longitud',
    description: 'Metros o centimetros para cables, telas, cintas, perfiles o materiales por tramo.',
    options: [
      {
        name: 'Largo',
        displayType: 'SIZE',
        isRequired: true,
        values: ['50 cm', '1 m', '2 m', '5 m', 'Personalizado'].map((value) => ({ value })),
      },
    ],
  },
  {
    id: 'unit-area',
    label: 'Superficie',
    description: 'Medidas por m2 o ancho x alto para placas, vidrios, lonas, pisos o revestimientos.',
    options: [
      {
        name: 'Medida',
        displayType: 'SIZE',
        isRequired: true,
        values: ['30x30 cm', '50x50 cm', '1 m2', 'Personalizado'].map((value) => ({ value })),
      },
    ],
  },
  {
    id: 'pack-size',
    label: 'Pack / cantidad',
    description: 'Unidades por caja, pack o combo para mayoristas, kioscos, alimentos e insumos.',
    options: [
      {
        name: 'Pack',
        displayType: 'SIZE',
        isRequired: true,
        values: ['Unidad', 'Pack x6', 'Pack x12', 'Caja x24', 'Personalizado'].map((value) => ({ value })),
      },
    ],
  },
  {
    id: 'flavor-color-size',
    label: 'Sabor / color / talle',
    description: 'Base flexible para indumentaria, alimentos, cosmetica, bazar y productos con atributos simples.',
    options: [
      {
        name: 'Variante',
        displayType: 'BUTTON',
        isRequired: true,
        values: ['Clasico', 'Premium', 'Especial'].map((value) => ({ value })),
      },
      {
        name: 'Color',
        displayType: 'COLOR_SWATCH',
        isRequired: false,
        values: [
          { value: 'Negro', colorHex: '#111827' },
          { value: 'Blanco', colorHex: '#ffffff' },
          { value: 'Rojo', colorHex: '#dc2626' },
        ],
      },
      {
        name: 'Talle',
        displayType: 'SIZE',
        isRequired: false,
        values: ['S', 'M', 'L', 'XL'].map((value) => ({ value })),
      },
    ],
  },
  {
    id: 'business-card',
    label: 'Tarjeta personal',
    description: 'Formato, papel, impresion, terminacion y cantidad para tarjetas comerciales.',
    options: [
      {
        name: 'Formato',
        displayType: 'SIZE',
        isRequired: true,
        values: ['9x5 cm', '8.5x5.5 cm'].map((value) => ({ value })),
      },
      {
        name: 'Papel',
        displayType: 'BUTTON',
        isRequired: true,
        values: ['Ilustracion 300g', 'Ilustracion 350g', 'Premium'].map((value) => ({ value })),
      },
      {
        name: 'Impresion',
        displayType: 'BUTTON',
        isRequired: true,
        values: ['Frente', 'Frente y dorso'].map((value) => ({ value })),
      },
      {
        name: 'Terminacion',
        displayType: 'BUTTON',
        isRequired: true,
        values: ['Sin terminacion', 'Laminado mate', 'Laminado brillo', 'Laca UV'].map((value) => ({
          value,
        })),
      },
      {
        name: 'Cantidad',
        displayType: 'SIZE',
        isRequired: true,
        values: ['100', '200', '500', '1000'].map((value) => ({ value })),
      },
    ],
  },
  {
    id: 'magnet',
    label: 'Iman',
    description: 'Medida, laca UV y cantidad para imanes promocionales.',
    options: [
      {
        name: 'Medida',
        displayType: 'SIZE',
        isRequired: true,
        values: ['6x4 cm', '7x5 cm', '9x5 cm', '10x7 cm'].map((value) => ({ value })),
      },
      {
        name: 'Terminacion',
        displayType: 'BUTTON',
        isRequired: true,
        values: ['Sin laca UV', 'Con laca UV'].map((value) => ({ value })),
      },
      {
        name: 'Cantidad',
        displayType: 'SIZE',
        isRequired: true,
        values: ['100', '200', '300', '500', '1000'].map((value) => ({ value })),
      },
    ],
  },
  {
    id: 'apparel',
    label: 'Indumentaria',
    description: 'Color, talle y corte para remeras, buzos, uniformes o gorras.',
    options: [
      {
        name: 'Color',
        displayType: 'COLOR_SWATCH',
        isRequired: true,
        values: [
          { value: 'Negro', colorHex: '#111827' },
          { value: 'Blanco', colorHex: '#ffffff' },
          { value: 'Azul', colorHex: '#1d4ed8' },
        ],
      },
      {
        name: 'Talle',
        displayType: 'SIZE',
        isRequired: true,
        values: ['S', 'M', 'L', 'XL'].map((value) => ({ value })),
      },
      {
        name: 'Corte',
        displayType: 'BUTTON',
        isRequired: true,
        values: ['Clasico', 'Oversize'].map((value) => ({ value })),
      },
    ],
  },
  {
    id: 'signage',
    label: 'Carteleria',
    description: 'Sustrato, medida, bastidor, impresion y backlight para carteles y lonas.',
    options: [
      {
        name: 'Sustrato',
        displayType: 'BUTTON',
        isRequired: true,
        values: ['Lona front', 'Vinilo impreso', 'Backlight', 'PVC espumado', 'Alto impacto', 'Acrilico'].map(
          (value) => ({ value })
        ),
      },
      {
        name: 'Estructura',
        displayType: 'BUTTON',
        isRequired: true,
        values: ['Solo impresion', 'Bastidor madera', 'Bastidor metalico'].map((value) => ({ value })),
      },
      {
        name: 'Iluminacion',
        displayType: 'BUTTON',
        isRequired: true,
        values: ['Sin iluminacion', 'Backlight'].map((value) => ({ value })),
      },
      {
        name: 'Terminacion',
        displayType: 'BUTTON',
        isRequired: true,
        values: ['Corte al ras', 'Ojales', 'Dobladillo', 'Laminado', 'Tensado en bastidor'].map((value) => ({
          value,
        })),
      },
    ],
  },
  {
    id: 'packaging',
    label: 'Packaging',
    description: 'Material y medida para cajas, bolsas, etiquetas y piezas de packaging.',
    options: [
      {
        name: 'Material',
        displayType: 'BUTTON',
        isRequired: true,
        values: ['Kraft', 'Blanco', 'Ilustracion'].map((value) => ({ value })),
      },
      {
        name: 'Medida',
        displayType: 'SIZE',
        isRequired: true,
        values: ['Chica', 'Mediana', 'Grande'].map((value) => ({ value })),
      },
    ],
  },
  {
    id: 'printing',
    label: 'Imprenta',
    description: 'Papel y cantidad para tarjetas, flyers, folletos y piezas simples.',
    options: [
      {
        name: 'Papel',
        displayType: 'BUTTON',
        isRequired: true,
        values: ['Obra', 'Ilustracion', 'Premium'].map((value) => ({ value })),
      },
      {
        name: 'Cantidad',
        displayType: 'SIZE',
        isRequired: true,
        values: ['100', '250', '500', '1000'].map((value) => ({ value })),
      },
    ],
  },
  {
    id: 'merchandising',
    label: 'Merchandising',
    description: 'Modelo, color y cantidad para objetos promocionales.',
    options: [
      {
        name: 'Modelo',
        displayType: 'BUTTON',
        isRequired: true,
        values: ['Estandar', 'Premium'].map((value) => ({ value })),
      },
      {
        name: 'Color',
        displayType: 'COLOR_SWATCH',
        isRequired: true,
        values: [
          { value: 'Negro', colorHex: '#111827' },
          { value: 'Blanco', colorHex: '#ffffff' },
          { value: 'Rojo', colorHex: '#dc2626' },
        ],
      },
      {
        name: 'Cantidad',
        displayType: 'SIZE',
        isRequired: true,
        values: ['10', '25', '50', '100'].map((value) => ({ value })),
      },
    ],
  },
]

const VALUE_PRESETS: ValuePreset[] = [
  {
    id: 'sizes',
    label: 'Talles',
    values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((value) => ({ value })),
  },
  {
    id: 'quantities',
    label: 'Cantidades',
    values: ['50', '100', '250', '500', '1000'].map((value) => ({ value })),
  },
  {
    id: 'paper-sizes',
    label: 'Formatos',
    values: ['A6', 'A5', 'A4', 'A3'].map((value) => ({ value })),
  },
  {
    id: 'product-sizes',
    label: 'Medidas',
    values: ['Chica', 'Mediana', 'Grande'].map((value) => ({ value })),
  },
  {
    id: 'basic-colors',
    label: 'Colores',
    values: [
      { value: 'Negro', colorHex: '#111827' },
      { value: 'Blanco', colorHex: '#ffffff' },
      { value: 'Rojo', colorHex: '#dc2626' },
      { value: 'Azul', colorHex: '#1d4ed8' },
    ],
  },
  {
    id: 'graphic-finishings',
    label: 'Terminaciones',
    values: [
      'Sin terminacion',
      'Troquelado',
      'Laminado mate',
      'Laminado brillo',
      'Laca UV',
      'Sectorizado',
      'Plegado',
    ].map((value) => ({ value })),
  },
]

export default function ProductOptionsConfigurator({
  initialOptions = [],
  initialVariants = [],
  basePrice = 0,
  disableStock = false,
  onOptionsChange,
  onOptionsDataChange,
  onVariantsDataChange,
}: {
  initialOptions?: Option[]
  initialVariants?: Variant[]
  basePrice?: number
  disableStock?: boolean
  onOptionsChange?: (hasOptions: boolean) => void
  onOptionsDataChange?: (options: Option[]) => void
  onVariantsDataChange?: (variants: Variant[]) => void
}) {
  const [options, setOptions] = useState<Option[]>(() => normalizeOptions(initialOptions))
  const [variants, setVariants] = useState<Variant[]>(initialVariants)
  const [uploadingVariantIndex, setUploadingVariantIndex] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [variantFilters, setVariantFilters] = useState<Record<string, string>>({})
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkStock, setBulkStock] = useState('')
  const [bulkImageUrl, setBulkImageUrl] = useState('')
  const [bulkImageUploading, setBulkImageUploading] = useState(false)
  const [previewSelections, setPreviewSelections] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const priceMatrixOptions = useMemo(() => getPriceMatrixOptions(options), [options])
  const priceMatrixOptionNames = useMemo(
    () => new Set(priceMatrixOptions.map((option) => option.name)),
    [priceMatrixOptions]
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [variantFilters, searchQuery, variants.length])

  useEffect(() => {
    onOptionsChange?.(options.length > 0)
    onOptionsDataChange?.(options)
  }, [onOptionsChange, onOptionsDataChange, options])

  useEffect(() => {
    onVariantsDataChange?.(variants)
  }, [variants, onVariantsDataChange])

  useEffect(() => {
    if (!disableStock) {
      return
    }

    setVariants((current) => current.map((variant) => ({ ...variant, stock: undefined })))
  }, [disableStock])

  useEffect(() => {
    const handleApplyVariants = (e: Event) => {
      const customEvent = e as CustomEvent<{ options: Record<string, string>; price: number }[]>
      const incomingVariants = customEvent.detail

      if (!incomingVariants || incomingVariants.length === 0) return

      // Collect all option names and their complete value sets from the quoter
      const incomingOptionsMap: Record<string, Set<string>> = {}
      incomingVariants.forEach(v => {
        Object.entries(v.options).forEach(([optName, optValue]) => {
          if (!incomingOptionsMap[optName]) incomingOptionsMap[optName] = new Set()
          incomingOptionsMap[optName].add(optValue)
        })
      })

      if (incomingVariants.length > MAX_VARIANT_MATRIX_SIZE) {
        setUploadError(
          `El cotizador intento generar ${incomingVariants.length} variantes. El maximo operativo es ${MAX_VARIANT_MATRIX_SIZE}. Ajusta materiales, cantidades o terminaciones antes de aplicar.`
        )
        return
      }

      // Start from existing options that are NOT managed by the quoter (manual ones)
      const quoterOptionNames = new Set(Object.keys(incomingOptionsMap).map(k => k.toLowerCase()))
      const manualOptions = options.filter(o => !quoterOptionNames.has(o.name.toLowerCase()))
      const imageMatchOptionNames = getVisualMatchOptionNames(manualOptions)
      let nextOptions = [...manualOptions]

      // Add/replace quoter-managed options with fresh values (no merging)
      Object.entries(incomingOptionsMap).forEach(([optName, optValuesSet]) => {
        nextOptions.push({
          name: optName,
          displayType: 'BUTTON',
          isRequired: true,
          values: Array.from(optValuesSet).map((value) => ({ value })),
        })
      })

      const incomingOptions = Object.entries(incomingOptionsMap).map(([optName, optValuesSet]) => ({
        name: optName,
        displayType: 'BUTTON' as OptionDisplayType,
        isRequired: true,
        values: Array.from(optValuesSet).map((value) => ({ value })),
      }))
      const quoterOptions = getPriceMatrixOptions(incomingOptions)
      const nextCombinationCount = countVariantCombinations(quoterOptions)
      if (nextCombinationCount > MAX_VARIANT_MATRIX_SIZE) {
        setUploadError(
          `La cotizacion generaria ${nextCombinationCount} variantes de venta. El maximo operativo es ${MAX_VARIANT_MATRIX_SIZE}. Reduce cantidades, materiales o terminaciones.`
        )
        return
      }

      setOptions(nextOptions)

      // The quoter only owns price-driving options. Visual options such as Color/Talle stay selectable,
      // but they must not multiply the price matrix.
      const combinations = cartesianProduct(quoterOptions)
      const nextVariants = combinations.map((combination) => {
        const matchingIncoming = incomingVariants
          .filter((variant) =>
            Object.entries(combination).every(([optionName, value]) => variant.options[optionName] === value)
          )
          .sort((a, b) => a.price - b.price)
        const incoming = matchingIncoming[0]
        const existing = findExactVariant(variants, combination) || findSubsetVariant(variants, combination)
        const imageSource = existing || findVisualVariant(variants, combination, imageMatchOptionNames)
        return existing
          ? { ...existing, price: incoming ? incoming.price : existing.price, imageUrl: existing.imageUrl || imageSource?.imageUrl }
          : { combinations: combination, price: incoming ? incoming.price : basePrice, imageUrl: imageSource?.imageUrl }
      })
      setVariants(nextVariants)
    }

    window.addEventListener('apply-quoter-variants', handleApplyVariants)
    return () => window.removeEventListener('apply-quoter-variants', handleApplyVariants)
  }, [options, variants, basePrice])

  useEffect(() => {
    const compactCount = countVariantCombinations(priceMatrixOptions)
    if (compactCount <= 0 || compactCount > MAX_VARIANT_MATRIX_SIZE) return
    if (variants.length === compactCount) return

    const combinations = cartesianProduct(priceMatrixOptions)
    const nextVariants = combinations.map((combination) => {
      const existing = findBestVariantForCombination(variants, combination)

      return existing
        ? {
            combinations: combination,
            price: existing.price,
            sku: existing.sku,
            stock: existing.stock,
            imageUrl: existing.imageUrl,
          }
        : { combinations: combination, price: basePrice }
    })

    setUploadError(
      `Se sincronizo la matriz de ${variants.length} a ${nextVariants.length} variantes de venta.`
    )
    setVariants(nextVariants)
  }, [basePrice, priceMatrixOptions, variants])

  useEffect(() => {
    const handleApplyImageToOption = (event: Event) => {
      const customEvent = event as CustomEvent<{
        optionName?: string
        optionValue?: string
        imageUrl?: string
        onlyEmpty?: boolean
      }>
      const { optionName, optionValue, imageUrl, onlyEmpty = false } = customEvent.detail || {}
      if (!optionName || !optionValue || !imageUrl) return

      const normalize = (value: string) => value.trim().toLowerCase()
      setVariants((current) =>
        current.map((variant) => {
          const variantValue = variant.combinations[optionName]
          const matches =
            variantValue === optionValue ||
            normalize(variantValue || '') === normalize(optionValue)

          if (!matches) return variant
          if (onlyEmpty && variant.imageUrl) return variant
          return { ...variant, imageUrl }
        })
      )
    }

    window.addEventListener('apply-variant-image-by-option', handleApplyImageToOption)
    return () => window.removeEventListener('apply-variant-image-by-option', handleApplyImageToOption)
  }, [])

  const addOption = () => {
    setOptions([...options, { name: '', displayType: 'BUTTON', isRequired: true, values: [{ value: '' }] }])
  }

  const applyTemplate = (template: OptionTemplate) => {
    const existingNames = new Set(options.map((option) => option.name.trim().toLowerCase()))
    const missingOptions = normalizeOptions(template.options).filter(
      (option) => !existingNames.has(option.name.trim().toLowerCase())
    )

    if (missingOptions.length === 0) return
    setOptions([...options, ...missingOptions])
  }

  const updateOptionName = (index: number, name: string) => {
    const nextOptions = [...options]
    nextOptions[index].name = name
    setOptions(nextOptions)
  }

  const toggleOptionRequired = (index: number) => {
    const nextOptions = [...options]
    nextOptions[index].isRequired = !nextOptions[index].isRequired
    setOptions(nextOptions)
  }

  const updateOptionDisplayType = (index: number, displayType: OptionDisplayType) => {
    const nextOptions = [...options]
    nextOptions[index].displayType = displayType
    setOptions(nextOptions)
  }

  const removeOption = (index: number) => {
    setOptions(options.filter((_, optionIndex) => optionIndex !== index))
  }

  const addValue = (optionIndex: number) => {
    const nextOptions = [...options]
    nextOptions[optionIndex].values.push({ value: '', colorHex: '' })
    setOptions(nextOptions)
  }

  const updateValue = (optionIndex: number, valueIndex: number, value: string) => {
    const nextOptions = [...options]
    nextOptions[optionIndex].values[valueIndex].value = value
    setOptions(nextOptions)
  }

  const updateValueColor = (optionIndex: number, valueIndex: number, colorHex: string) => {
    const nextOptions = [...options]
    nextOptions[optionIndex].values[valueIndex].colorHex = colorHex
    setOptions(nextOptions)
  }

  const removeValue = (optionIndex: number, valueIndex: number) => {
    const nextOptions = [...options]
    nextOptions[optionIndex].values = nextOptions[optionIndex].values.filter(
      (_, index) => index !== valueIndex
    )
    setOptions(nextOptions)
  }

  const moveValue = (optionIndex: number, valueIndex: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? valueIndex - 1 : valueIndex + 1
    if (nextIndex < 0 || nextIndex >= options[optionIndex].values.length) return

    const nextOptions = [...options]
    const nextValues = [...nextOptions[optionIndex].values]
    const currentValue = nextValues[valueIndex]
    nextValues[valueIndex] = nextValues[nextIndex]
    nextValues[nextIndex] = currentValue
    nextOptions[optionIndex].values = nextValues
    setOptions(nextOptions)
  }

  const applyValuePreset = (optionIndex: number, preset: ValuePreset) => {
    const nextOptions = [...options]
    const currentValues = nextOptions[optionIndex].values
    const existing = new Set(currentValues.map((value) => value.value.trim().toLowerCase()))
    const missingValues = preset.values.filter(
      (value) => !existing.has(value.value.trim().toLowerCase())
    )

    if (missingValues.length === 0) return

    nextOptions[optionIndex].values = [
      ...currentValues.filter((value) => value.value.trim()),
      ...missingValues.map((value) => ({ ...value })),
    ]

    if (preset.id === 'sizes') {
      nextOptions[optionIndex].displayType = 'SIZE'
    }
    if (preset.id === 'basic-colors') {
      nextOptions[optionIndex].displayType = 'COLOR_SWATCH'
    }
    if (preset.id === 'graphic-finishings') {
      nextOptions[optionIndex].displayType = 'BUTTON'
      nextOptions[optionIndex].isRequired = true
    }

    setOptions(nextOptions)
  }

  const selectPreviewValue = (optionName: string, value: string) => {
    setPreviewSelections((current) => ({
      ...current,
      [optionName]: current[optionName] === value ? '' : value,
    }))
  }

  const generateVariants = () => {
    const combinationCount = countVariantCombinations(priceMatrixOptions)
    if (combinationCount > MAX_VARIANT_MATRIX_SIZE) {
      setUploadError(
        `La matriz generaria ${combinationCount} variantes. El maximo operativo es ${MAX_VARIANT_MATRIX_SIZE}. Reduce la cantidad de opciones antes de generarla.`
      )
      return
    }

    setUploadError('')
    const combinations = cartesianProduct(priceMatrixOptions)
    const imageMatchOptionNames = getVisualMatchOptionNames(options)

    const nextVariants = combinations.map((combination) => {
      const existing = findExactVariant(variants, combination)
      const imageSource = existing || findVisualVariant(variants, combination, imageMatchOptionNames)

      return existing || {
        combinations: combination,
        price: basePrice,
        imageUrl: imageSource?.imageUrl,
      }
    })

    setVariants(nextVariants)
  }

  const updateVariantPrice = (index: number, price: number) => {
    const nextVariants = [...variants]
    nextVariants[index].price = price
    setVariants(nextVariants)
  }

  const updateVariantStock = (index: number, stock: number) => {
    const nextVariants = [...variants]
    nextVariants[index].stock = stock
    setVariants(nextVariants)
  }

  const updateVariantSku = (index: number, sku: string) => {
    const nextVariants = [...variants]
    nextVariants[index].sku = sku
    setVariants(nextVariants)
  }

  const updateVariantImage = (index: number, imageUrl: string) => {
    const nextVariants = [...variants]
    nextVariants[index].imageUrl = imageUrl
    setVariants(nextVariants)
  }

  const visibleVariants = useMemo(
    () => {
      const query = searchQuery.trim().toLowerCase()
      return variants
        .map((variant, index) => ({ variant, index }))
        .filter(({ variant }) => {
          const matchesFilters = Object.entries(variantFilters).every(
            ([optionName, value]) =>
              !value || !priceMatrixOptionNames.has(optionName) || variant.combinations[optionName] === value
          )
          if (!matchesFilters) return false

          if (query) {
            const combinationValues = Object.values(variant.combinations).map((v) => v.toLowerCase())
            const skuMatch = variant.sku ? variant.sku.toLowerCase().includes(query) : false
            const combinationMatch = combinationValues.some((val) => val.includes(query))
            return skuMatch || combinationMatch
          }

          return true
        })
    },
    [priceMatrixOptionNames, variantFilters, variants, searchQuery]
  )

  const filteredCount = visibleVariants.length
  const matrixExpectedCount = countVariantCombinations(priceMatrixOptions)
  const matrixExceedsLimit = matrixExpectedCount > MAX_VARIANT_MATRIX_SIZE
  const itemsPerPage = 25
  const totalPages = Math.ceil(filteredCount / itemsPerPage) || 1
  const paginatedVariants = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return visibleVariants.slice(startIndex, startIndex + itemsPerPage)
  }, [visibleVariants, currentPage, itemsPerPage])

  const hasActiveFilters = Object.values(variantFilters).some(Boolean) || Boolean(searchQuery)
  const zeroPriceVariantsCount = variants.filter((variant) => !variant.price || variant.price <= 0).length
  const colorValuesWithoutSwatchCount = options
    .filter((option) => option.displayType === 'COLOR_SWATCH')
    .flatMap((option) => option.values)
    .filter((value) => value.value.trim() && !value.colorHex).length
  const matrixNeedsRegeneration =
    options.length > 0 && matrixExpectedCount > 0 && variants.length !== matrixExpectedCount

  const updateVariantFilter = (optionName: string, value: string) => {
    setVariantFilters((current) => ({
      ...current,
      [optionName]: value,
    }))
  }

  const clearVariantFilters = () => {
    setVariantFilters({})
    setSearchQuery('')
  }

  const applyBulkPriceToVisible = () => {
    const price = Number(bulkPrice)
    if (!Number.isFinite(price) || price < 0 || filteredCount === 0) return

    const visibleIndexes = new Set(visibleVariants.map(({ index }) => index))
    setVariants((current) =>
      current.map((variant, index) =>
        visibleIndexes.has(index) ? { ...variant, price } : variant
      )
    )
    setBulkPrice('')
  }

  const applyBulkStockToVisible = () => {
    const stock = Number.parseInt(bulkStock, 10)
    if (!Number.isFinite(stock) || stock < 0 || filteredCount === 0) return

    const visibleIndexes = new Set(visibleVariants.map(({ index }) => index))
    setVariants((current) =>
      current.map((variant, index) =>
        visibleIndexes.has(index) ? { ...variant, stock } : variant
      )
    )
    setBulkStock('')
  }

  const applyBulkImageToVisible = () => {
    if (!bulkImageUrl || filteredCount === 0) return

    const visibleIndexes = new Set(visibleVariants.map(({ index }) => index))
    setVariants((current) =>
      current.map((variant, index) =>
        visibleIndexes.has(index) ? { ...variant, imageUrl: bulkImageUrl } : variant
      )
    )
  }

  const clearBulkImageFromVisible = () => {
    if (filteredCount === 0) return

    const visibleIndexes = new Set(visibleVariants.map(({ index }) => index))
    setVariants((current) =>
      current.map((variant, index) =>
        visibleIndexes.has(index) ? { ...variant, imageUrl: '' } : variant
      )
    )
  }

  const uploadBulkVariantImage = async (file?: File) => {
    if (!file) return

    setBulkImageUploading(true)
    setUploadError('')

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('La imagen masiva debe pesar como maximo 5MB.')
      setBulkImageUploading(false)
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok || !data.url) throw new Error(data.error || 'No pudimos subir la imagen.')
      setBulkImageUrl(data.url)
    } catch (error: any) {
      setUploadError(error.message || 'No pudimos subir la imagen para aplicar en lote.')
    } finally {
      setBulkImageUploading(false)
    }
  }

  const uploadVariantImage = async (index: number, file?: File) => {
    if (!file) return

    setUploadingVariantIndex(index)
    setUploadError('')

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Cada imagen de variante debe pesar como maximo 5MB.')
      setUploadingVariantIndex(null)
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok || !data.url) throw new Error(data.error || 'No pudimos subir la imagen.')
      updateVariantImage(index, data.url)
    } catch (error: any) {
      setUploadError(error.message || 'No pudimos subir la imagen de la variante.')
    } finally {
      setUploadingVariantIndex(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="card border-orange-100 bg-orange-50/30 p-6">
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <h2 className="flex items-center gap-2 font-bold text-gray-900">
            <Tag className="text-orange-500" size={20} />
            Opciones y variantes
          </h2>
          <button type="button" onClick={addOption} className="btn-secondary !py-1.5 !text-xs">
            <Plus size={14} />
            Anadir opcion
          </button>
        </div>

        <div className="mb-5 rounded-xl border border-orange-100 bg-white p-4">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">Plantillas de carga</p>
              <p className="text-xs text-gray-500">
                Agregan opciones editables. Revisalas antes de generar la matriz.
              </p>
            </div>
            {variants.length > 0 && (
              <span className="text-xs font-semibold text-orange-600">
                Si cambias opciones, regenera la matriz.
              </span>
            )}
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {OPTION_TEMPLATES.map((template) => {
              const missingCount = template.options.filter(
                (templateOption) =>
                  !options.some(
                    (option) =>
                      option.name.trim().toLowerCase() === templateOption.name.trim().toLowerCase()
                  )
              ).length

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  disabled={missingCount === 0}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left transition hover:border-orange-200 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <span className="block text-sm font-bold text-gray-900">{template.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-gray-500">
                    {template.description}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {options.length > 0 && (
          <div className="mb-5 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-600" />
              <p className="text-sm font-bold text-gray-900">Estado de configuracion</p>
            </div>
            <div className="grid gap-2 text-xs font-semibold text-gray-700 sm:grid-cols-2">
              <div className="rounded-lg bg-white px-3 py-2">
                {matrixExceedsLimit
                  ? `La matriz generaria ${matrixExpectedCount} variantes. El maximo operativo es ${MAX_VARIANT_MATRIX_SIZE}.`
                  : matrixNeedsRegeneration
                  ? `La matriz tiene ${variants.length} variantes y deberia tener ${matrixExpectedCount}.`
                  : variants.length > 0
                    ? 'La matriz coincide con las opciones actuales.'
                    : 'Genera la matriz antes de guardar un producto configurable.'}
              </div>
              <div className="rounded-lg bg-white px-3 py-2">
                La matriz de venta usa: {priceMatrixOptions.map((option) => option.name).join(', ') || 'opciones configuradas'}.
              </div>
              <div className="rounded-lg bg-white px-3 py-2">
                {zeroPriceVariantsCount > 0
                  ? `${zeroPriceVariantsCount} variantes tienen precio 0 y no se compran online.`
                  : 'Todas las variantes generadas tienen precio mayor a 0.'}
              </div>
              <div className="rounded-lg bg-white px-3 py-2">
                {colorValuesWithoutSwatchCount > 0
                  ? `${colorValuesWithoutSwatchCount} colores no tienen swatch definido.`
                  : 'Los valores visuales de color estan completos.'}
              </div>
            </div>
          </div>
        )}

        {options.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">
            Este producto no tiene configuraciones adicionales. Es un producto simple.
          </p>
        ) : (
          <div className="space-y-6">
            {options.map((option, optionIndex) => (
              <div key={optionIndex} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-4 flex items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Nombre de opcion (ej: Terminacion)"
                        value={option.name}
                        onChange={(event) => updateOptionName(optionIndex, event.target.value)}
                        className="input !py-1.5 !text-sm flex-1 font-bold"
                      />
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          checked={option.isRequired}
                          onChange={() => toggleOptionRequired(optionIndex)}
                          className="rounded text-orange-500"
                        />
                        Requerido
                      </label>
                      <select
                        value={option.displayType || 'BUTTON'}
                        onChange={(event) =>
                          updateOptionDisplayType(optionIndex, event.target.value as OptionDisplayType)
                        }
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold text-gray-700 outline-none focus:border-orange-400"
                        aria-label="Tipo de presentacion"
                      >
                        <option value="BUTTON">Botones</option>
                        <option value="COLOR_SWATCH">Color</option>
                        <option value="SIZE">Talle / medida</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeOption(optionIndex)}
                        className="rounded p-1.5 text-red-500 hover:bg-red-50"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <span className="text-xs font-bold text-gray-500">Atajos</span>
                      {VALUE_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyValuePreset(optionIndex, preset)}
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {option.values.map((value, valueIndex) => (
                        <div
                          key={valueIndex}
                          className="flex items-center gap-1 rounded-lg bg-gray-100 py-1 pl-3 pr-1"
                        >
                          <input
                            type="text"
                            placeholder="Valor"
                            value={value.value}
                            onChange={(event) => updateValue(optionIndex, valueIndex, event.target.value)}
                            className="w-24 border-none bg-transparent p-0 text-sm placeholder-gray-400 focus:ring-0"
                          />
                          {(option.displayType || 'BUTTON') === 'COLOR_SWATCH' && (
                            <input
                              type="color"
                              value={value.colorHex || '#111827'}
                              onChange={(event) =>
                                updateValueColor(optionIndex, valueIndex, event.target.value)
                              }
                              className="h-6 w-7 cursor-pointer rounded border border-white bg-transparent p-0"
                              aria-label={`Color para ${value.value || 'valor'}`}
                            />
                          )}
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => moveValue(optionIndex, valueIndex, 'up')}
                              disabled={valueIndex === 0}
                              className="rounded p-0.5 text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-30"
                              aria-label="Subir valor"
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveValue(optionIndex, valueIndex, 'down')}
                              disabled={valueIndex === option.values.length - 1}
                              className="rounded p-0.5 text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-30"
                              aria-label="Bajar valor"
                            >
                              <ChevronDown size={12} />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeValue(optionIndex, valueIndex)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addValue(optionIndex)}
                        className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600 hover:bg-orange-100"
                      >
                        + Anadir valor
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={generateVariants}
                disabled={matrixExceedsLimit}
                className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-55"
              >
                <RefreshCcw size={16} />
                Generar matriz de venta
              </button>
              <p className="mt-2 text-center text-xs text-gray-500">
                Regenerala cada vez que agregues o modifiques opciones para actualizar la tabla.
              </p>
              <p className="mt-1 text-center text-xs font-medium text-orange-600">
                Precio 0 = variante no disponible para compra online
              </p>
            </div>
          </div>
        )}
      </div>

      {options.length > 0 && (
        <div className="card border-blue-100 bg-blue-50/30 p-6">
          <div className="mb-4 flex items-center justify-between border-b border-blue-100 pb-3">
            <h2 className="flex items-center gap-2 font-bold text-gray-900">
              <Eye className="text-blue-600" size={20} />
              Preview del selector
            </h2>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-blue-700">
              Vista aproximada
            </span>
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
            {options.map((option) => (
              <div key={option.name || option.id}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-gray-900">{option.name || 'Opcion'}</p>
                  <span className="text-xs font-semibold text-gray-500">
                    {option.isRequired ? 'Requerida' : 'Opcional'}
                  </span>
                </div>

                <div
                  className={`grid gap-2 ${
                    option.displayType === 'COLOR_SWATCH'
                      ? 'grid-cols-3 sm:grid-cols-4'
                      : option.displayType === 'SIZE'
                        ? 'grid-cols-4 sm:grid-cols-6'
                        : 'grid-cols-2 sm:grid-cols-3'
                  }`}
                >
                  {option.values
                    .filter((value) => value.value.trim())
                    .map((value) => {
                      const isSelected = previewSelections[option.name] === value.value
                      const isColorSwatch = option.displayType === 'COLOR_SWATCH'
                      const isSize = option.displayType === 'SIZE'

                      return (
                        <button
                          key={value.value}
                          type="button"
                          onClick={() => selectPreviewValue(option.name, value.value)}
                          className={`relative border-2 transition-all ${
                            isColorSwatch
                              ? 'rounded-2xl p-2.5 text-center'
                              : isSize
                                ? 'rounded-xl px-3 py-3 text-center'
                                : 'rounded-2xl p-3 text-left'
                          } ${
                            isSelected
                              ? 'border-[#ED2C71] bg-[#FEF1F6] text-[#C91F5B] shadow-sm'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-[#F66B9A]/30'
                          }`}
                        >
                          {isColorSwatch && (
                            <span
                              className="mx-auto mb-2 block h-7 w-7 rounded-full border border-black/10 shadow-inner ring-2 ring-white"
                              style={{ backgroundColor: value.colorHex || value.value }}
                              aria-hidden="true"
                            />
                          )}
                          <span className={`block font-semibold ${isSize ? 'text-base' : 'text-sm'}`}>
                            {value.value}
                          </span>
                        </button>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs font-medium text-blue-700">
            Este preview muestra estilo y orden de valores. Disponibilidad, precio y fotos se calculan con la matriz.
          </p>
        </div>
      )}

      {variants.length > 0 && options.length > 0 && (
        <div className="card overflow-hidden border-orange-200">
          <div className="flex items-center justify-between bg-orange-500 p-4 text-white">
            <h3 className="flex items-center gap-2 font-bold">
              <DollarSign size={18} />
              Matriz de venta
            </h3>
            <span className="rounded-full bg-orange-600 px-2 py-1 text-xs font-semibold">
              {variants.length} combinaciones
            </span>
          </div>

          <div className="space-y-4 border-b border-orange-100 bg-orange-50/50 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-[200px] flex-[2] text-xs font-semibold text-gray-600">
                Buscar por texto (talle, color, SKU...)
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input mt-1 !py-2 !text-sm"
                  placeholder="Ej: Negro, XL, TJ-100..."
                />
              </label>

              {priceMatrixOptions.map((option) => (
                <label key={option.name} className="min-w-36 flex-1 text-xs font-semibold text-gray-600">
                  {option.name || 'Opcion'}
                  <select
                    value={variantFilters[option.name] || ''}
                    onChange={(event) => updateVariantFilter(option.name, event.target.value)}
                    className="mt-1 w-full rounded-lg border border-orange-100 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-orange-400"
                  >
                    <option value="">Todas</option>
                    {option.values
                      .filter((value) => value.value.trim())
                      .map((value) => (
                        <option key={value.value} value={value.value}>
                          {value.value}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearVariantFilters}
                  className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs font-bold text-orange-600 hover:bg-orange-50"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-orange-100 bg-white p-3">
              <div className="mr-auto">
                <p className="text-sm font-bold text-gray-900">
                  {filteredCount} variantes visibles
                </p>
                <p className="text-xs text-gray-500">
                  Las acciones masivas solo afectan las variantes filtradas.
                </p>
              </div>

              <label className="w-36 text-xs font-semibold text-gray-600">
                Precio
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={bulkPrice}
                  onChange={(event) => setBulkPrice(event.target.value)}
                  className="input mt-1 !py-2 !text-sm"
                  placeholder="0.00"
                />
              </label>
              <button
                type="button"
                onClick={applyBulkPriceToVisible}
                disabled={!bulkPrice || filteredCount === 0}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Aplicar precio
              </button>

              {!disableStock && (
                <>
                  <label className="w-28 text-xs font-semibold text-gray-600">
                    Stock
                    <input
                      type="number"
                      min="0"
                      value={bulkStock}
                      onChange={(event) => setBulkStock(event.target.value)}
                      className="input mt-1 !py-2 !text-sm"
                      placeholder="0"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={applyBulkStockToVisible}
                    disabled={!bulkStock || filteredCount === 0}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    Aplicar stock
                  </button>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-orange-100 bg-white p-3">
              <div className="mr-auto">
                <p className="text-sm font-bold text-gray-900">Foto para variantes visibles</p>
                <p className="text-xs text-gray-500">
                  Subi una imagen y aplicala solo a las variantes visibles con los filtros actuales.
                </p>
              </div>

              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-gray-300">
                {bulkImageUrl ? (
                  <img src={bulkImageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon size={20} />
                )}
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
                <UploadCloud size={14} />
                {bulkImageUploading ? 'Subiendo...' : 'Subir foto'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={bulkImageUploading}
                  onChange={(event) => {
                    uploadBulkVariantImage(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
              </label>

              <button
                type="button"
                onClick={applyBulkImageToVisible}
                disabled={!bulkImageUrl || filteredCount === 0}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Aplicar foto
              </button>

              <button
                type="button"
                onClick={clearBulkImageFromVisible}
                disabled={filteredCount === 0}
                className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Limpiar fotos
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 font-semibold text-gray-600">
                <tr>
                  <th className="px-4 py-3">Variante</th>
                  <th className="w-40 px-4 py-3">Precio ARS</th>
                  <th className="w-48 px-4 py-3">Foto opcional</th>
                  <th className="w-32 px-4 py-3">SKU</th>
                  {!disableStock && <th className="w-24 px-4 py-3">Stock</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedVariants.map(({ variant, index }) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {Object.entries(variant.combinations).map(([key, value]) => (
                        <span
                          key={key}
                          className="mr-1 mb-1 inline-block rounded-md border bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {value}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-2">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={variant.price}
                          onChange={(event) => updateVariantPrice(index, parseFloat(event.target.value) || 0)}
                          className="input !py-1.5 !pl-6 !w-full font-bold text-orange-600"
                        />
                      </div>
                      {variant.price === 0 && (
                        <p className="mt-1 text-[11px] font-medium text-orange-600">
                          No disponible online
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-gray-300">
                          {variant.imageUrl ? (
                            <img src={variant.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon size={18} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                            <UploadCloud size={13} />
                            {uploadingVariantIndex === index ? 'Subiendo...' : 'Cargar'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingVariantIndex !== null}
                              onChange={(event) => {
                                uploadVariantImage(index, event.target.files?.[0])
                                event.target.value = ''
                              }}
                            />
                          </label>
                          {variant.imageUrl && (
                            <button
                              type="button"
                              onClick={() => updateVariantImage(index, '')}
                              className="ml-1 inline-flex items-center rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                              aria-label="Quitar foto de variante"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={variant.sku || ''}
                        onChange={(event) => updateVariantSku(index, event.target.value)}
                        className="input !py-1.5 !w-full font-mono text-xs"
                        placeholder="Ej: TJ-100-M"
                      />
                    </td>
                    {!disableStock && (
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          value={variant.stock ?? ''}
                          onChange={(event) => updateVariantStock(index, parseInt(event.target.value, 10) || 0)}
                          className="input !py-1.5 !w-full"
                          placeholder="∞"
                        />
                      </td>
                    )}
                  </tr>
                ))}
                {visibleVariants.length === 0 && (
                  <tr>
                    <td
                      colSpan={disableStock ? 4 : 5}
                      className="px-4 py-8 text-center text-sm font-semibold text-gray-400"
                    >
                      No hay variantes que coincidan con los filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 bg-white px-4 py-4 sm:flex-row">
              <p className="text-xs font-semibold text-gray-500">
                Mostrando <span className="font-bold text-gray-900">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredCount)}</span> a{' '}
                <span className="font-bold text-gray-900">{Math.min(currentPage * itemsPerPage, filteredCount)}</span> de{' '}
                <span className="font-bold text-gray-900">{filteredCount}</span> variantes
              </p>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>

                {(() => {
                  const pageNumbers = []
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i)
                  } else {
                    pageNumbers.push(1)
                    if (currentPage > 3) pageNumbers.push('ellipsis')
                    const start = Math.max(2, currentPage - 1)
                    const end = Math.min(totalPages - 1, currentPage + 1)
                    for (let i = start; i <= end; i++) pageNumbers.push(i)
                    if (currentPage < totalPages - 2) pageNumbers.push('ellipsis')
                    pageNumbers.push(totalPages)
                  }
                  return pageNumbers.map((page, i) =>
                    page === 'ellipsis' ? (
                      <span key={`ellipsis-${i}`} className="px-1.5 text-xs font-semibold text-gray-400 select-none">
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page as number)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                          currentPage === page
                            ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )
                })()}

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
          {uploadError && (
            <p className="border-t border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
              {uploadError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
