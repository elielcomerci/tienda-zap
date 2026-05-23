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
