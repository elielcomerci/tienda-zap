import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  name: string
  price: number
  image: string
  quantity: number
  notes?: string
  fileUrl?: string
  designRequested?: boolean
  selectedOptions?: { name: string; value: string }[]
  cartItemId?: string // Generated on add to uniquely identify configurations
}

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (cartItemId: string) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  updateNotes: (cartItemId: string, notes: string) => void
  updateItemOptions: (cartItemId: string, options: { fileUrl?: string; designRequested?: boolean }) => void
  clearCart: () => void
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          // Generate a unique identifier based on product ID and its exact configuration
          const optionsHash = item.selectedOptions 
            ? JSON.stringify(item.selectedOptions.sort((a, b) => a.name.localeCompare(b.name)))
            : ''
          const cartItemId = item.cartItemId || `${item.productId}-${optionsHash}`

          const itemWithId = { ...item, cartItemId }

          const existing = state.items.find((i) => i.cartItemId === cartItemId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.cartItemId === cartItemId
                  ? { ...i, quantity: i.quantity + item.quantity }
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

      updateItemOptions: (cartItemId, options) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.cartItemId === cartItemId ? { ...i, ...options } : i
          ),
        })),

      clearCart: () => set({ items: [] }),

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
