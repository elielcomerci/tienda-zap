import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  name: string
  price: number
  catalogType: 'COSA' | 'DESARROLLO'
  modality: 'CONFIGURABLE' | 'DIRECTO' | 'CONSULTAR'
  creditDownPaymentPercent?: number
  image: string
  quantity: number
  notes?: string
  briefType?: 'NONE' | 'DESIGN' | 'MUSIC' | 'VIDEO'
  briefResponses?: Record<string, string>
  briefReferenceLinks?: string[]
  briefReferenceFiles?: Array<{
    url: string
    objectKey?: string
    fileName: string
    contentType?: string
    sizeBytes?: number
  }>
  fileUrl?: string
  designRequested?: boolean
  selectedOptions?: { name: string; value: string }[]
  /** Original machine-readable keys used to re-quote active semantic configurators on the server. */
  configuratorSelection?: Record<string, string | number | boolean | string[]>
  cartItemId?: string // Generated on add to uniquely identify configurations
}

interface CartStore {
  items: CartItem[]
  /** The code is persisted, but its amount is always recalculated by the API. */
  couponCode: string | null
  addItem: (item: CartItem) => void
  removeItem: (cartItemId: string) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  updateNotes: (cartItemId: string, notes: string) => void
  updateBrief: (
    cartItemId: string,
    brief: Pick<CartItem, 'briefType' | 'briefResponses' | 'briefReferenceLinks' | 'briefReferenceFiles'>
  ) => void
  updateItemOptions: (cartItemId: string, options: { fileUrl?: string; designRequested?: boolean }) => void
  clearCart: () => void
  setCouponCode: (couponCode: string | null) => void
  clearCouponCode: () => void
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,

      addItem: (item) => {
        set((state) => {
          // Keep distinct configurations separate even when their display labels happen to match.
          const optionsHash = JSON.stringify({
            options: [...(item.selectedOptions || [])].sort((a, b) => a.name.localeCompare(b.name)),
            selection: item.configuratorSelection
              ? Object.fromEntries(Object.entries(item.configuratorSelection).sort(([a], [b]) => a.localeCompare(b)))
              : null,
          })
          const cartItemId = item.cartItemId || `${item.productId}-${optionsHash}`

          const itemWithId = { ...item, cartItemId }

          const existing = state.items.find((i) => i.cartItemId === cartItemId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.cartItemId === cartItemId
                  ? {
                      ...i,
                      price: item.price,
                      selectedOptions: item.selectedOptions,
                      configuratorSelection: item.configuratorSelection,
                      quantity: i.quantity + item.quantity,
                    }
                  : i
              ),
            }
          }
          return { items: [...state.items, itemWithId] }
        })
      },

      removeItem: (cartItemId) =>
        set((state) => ({
          items: state.items.filter((i) => i.cartItemId !== cartItemId),
        })),

      updateQuantity: (cartItemId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.cartItemId === cartItemId ? { ...i, quantity } : i
          ),
        })),

      updateNotes: (cartItemId, notes) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.cartItemId === cartItemId ? { ...i, notes } : i
          ),
        })),

      updateBrief: (cartItemId, brief) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.cartItemId === cartItemId ? { ...i, ...brief } : i
          ),
        })),

      updateItemOptions: (cartItemId, options) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.cartItemId === cartItemId ? { ...i, ...options } : i
          ),
        })),

      clearCart: () => set({ items: [] }),

      setCouponCode: (couponCode) =>
        set({ couponCode: couponCode?.trim() || null }),

      clearCouponCode: () => set({ couponCode: null }),

      total: () =>
        get().items.reduce((acc, i) => acc + i.price * i.quantity, 0),

      itemCount: () =>
        get().items.reduce((acc, i) => acc + i.quantity, 0),
    }),
    {
      name: 'zap-cart',
    }
  )
)
