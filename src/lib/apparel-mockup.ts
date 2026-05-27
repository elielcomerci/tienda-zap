export type ApparelMockupSide = 'front' | 'back'

export type ApparelMockupArea = {
  x: number
  y: number
  width: number
  height: number
  rotate?: number
  opacity?: number
}

export type ApparelMockupColor = {
  value: string
  colorHex?: string | null
  frontImageUrl?: string | null
  backImageUrl?: string | null
}

export type ApparelMockupPresetDesign = {
  id: string
  name: string
  imageUrl: string
  description?: string | null
}

export type ApparelMockupConfig = {
  id: string
  type: 'APPAREL_MOCKUP'
  enabled: boolean
  title?: string
  allowCustomDesign?: boolean
  allowPresetDesigns?: boolean
  colorOptionName?: string
  placementOptionName?: string
  defaultSide?: ApparelMockupSide
  printAreas: Record<ApparelMockupSide, ApparelMockupArea>
  colors: ApparelMockupColor[]
  presetDesigns?: ApparelMockupPresetDesign[]
}

export function normalizeApparelValue(value?: string | null) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function inferApparelMockupSide(
  selection: string | undefined,
  fallback: ApparelMockupSide
): ApparelMockupSide {
  const value = normalizeApparelValue(selection)
  const hasBack = value.includes('espalda') || value.includes('atras') || value.includes('dorso')
  const hasFront = value.includes('frente') || value.includes('adelante') || value.includes('pecho')
  if (hasBack && hasFront) return fallback
  if (hasBack) return 'back'
  if (hasFront) return 'front'
  return fallback
}

export function getSelectedApparelOptionValue(
  selectedOptions: Record<string, string>,
  preferredName?: string,
  aliases: string[] = []
) {
  const entries = Object.entries(selectedOptions)
  const candidates = [preferredName, ...aliases].filter(Boolean).map((name) => normalizeApparelValue(name))

  for (const candidate of candidates) {
    const exact = entries.find(([name]) => normalizeApparelValue(name) === candidate)
    if (exact?.[1]) return exact[1]
  }

  for (const candidate of candidates) {
    const partial = entries.find(([name]) => {
      const optionName = normalizeApparelValue(name)
      return optionName.includes(candidate) || candidate.includes(optionName)
    })
    if (partial?.[1]) return partial[1]
  }

  return undefined
}

const DEFAULT_AREA: ApparelMockupArea = {
  x: 32,
  y: 24,
  width: 36,
  height: 34,
  rotate: 0,
  opacity: 0.92,
}

export const DEFAULT_APPAREL_MOCKUP: ApparelMockupConfig = {
  id: 'apparel-mockup',
  type: 'APPAREL_MOCKUP',
  enabled: false,
  title: 'Mockup de indumentaria',
  allowCustomDesign: true,
  allowPresetDesigns: true,
  colorOptionName: 'Color',
  placementOptionName: 'Ubicacion',
  defaultSide: 'front',
  printAreas: {
    front: DEFAULT_AREA,
    back: { ...DEFAULT_AREA, y: 22 },
  },
  colors: [],
  presetDesigns: [],
}

export function parseMediaList(value: unknown): any[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getProductMediaTracks(value: unknown) {
  return parseMediaList(value).filter((item) =>
    item && ['AUDIO', 'VIDEO', 'YOUTUBE'].includes(item.type)
  )
}

export function getApparelMockupConfig(value: unknown): ApparelMockupConfig | null {
  const config = parseMediaList(value).find((item) => item?.type === 'APPAREL_MOCKUP')
  if (!config) return null

  return {
    ...DEFAULT_APPAREL_MOCKUP,
    ...config,
    printAreas: {
      front: { ...DEFAULT_APPAREL_MOCKUP.printAreas.front, ...(config.printAreas?.front || {}) },
      back: { ...DEFAULT_APPAREL_MOCKUP.printAreas.back, ...(config.printAreas?.back || {}) },
    },
    colors: Array.isArray(config.colors) ? config.colors : [],
    presetDesigns: Array.isArray(config.presetDesigns) ? config.presetDesigns : [],
  }
}

export function hasApparelMockupImages(config?: ApparelMockupConfig | null) {
  return Boolean(
    config?.enabled &&
      config.colors.some((color) => color.frontImageUrl || color.backImageUrl)
  )
}
