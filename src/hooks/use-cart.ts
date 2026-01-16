// src/hooks/use-cart.tsx
'use client';

import React, {
  type ReactNode,
  createContext,
  useContext,
  useReducer,
  useEffect,
} from 'react';
import { toast } from 'sonner';

// ======================== 1. 購物車商品型別 ========================
export type CartItem = {
  id: string;
  title: string;
  price: number;
  image?: string | null;
  size?: string | null;
  quantity: number;
  stock: number;
  slug?: string;
};

// ======================== 2. State & Action ========================
type CartState = {
  items: CartItem[];
};

type CartAction =
  | { type: 'LOAD_FROM_STORAGE'; payload: CartItem[] }
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; payload: { id: string; size?: string | null } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; size?: string | null; quantity: number } }
  | { type: 'CLEAR_CART' };

// ======================== 3. Reducer ========================
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'LOAD_FROM_STORAGE':
      return { items: action.payload };

    case 'ADD_ITEM': {
      const newItem = action.payload;
      const existing = state.items.find(
        (i) => i.id === newItem.id && i.size === newItem.size
      );

      if (existing) {
        if (existing.quantity >= existing.stock) {
          toast.error('庫存不足，無法再增加');
          return state;
        }
        toast.success('已增加數量');
        return {
          items: state.items.map((i) =>
            i.id === newItem.id && i.size === newItem.size
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }

      toast.success('已加入購物車');
      return {
        items: [...state.items, { ...newItem, quantity: 1 }],
      };
    }

    case 'REMOVE_ITEM': {
      toast.success('已從購物車移除');
      return {
        items: state.items.filter(
          (i) => !(i.id === action.payload.id && i.size === action.payload.size)
        ),
      };
    }

    case 'UPDATE_QUANTITY': {
      const { id, size, quantity } = action.payload;

      if (quantity <= 0) {
        toast.success('已從購物車移除');
        return {
          items: state.items.filter((i) => !(i.id === id && i.size === size)),
        };
      }

      const item = state.items.find((i) => i.id === id && i.size === size);
      if (item && quantity > item.stock) {
        toast.error('超過庫存數量');
        return state;
      }

      return {
        items: state.items.map((i) =>
          i.id === id && i.size === size ? { ...i, quantity } : i
        ),
      };
    }

    case 'CLEAR_CART':
      return { items: [] };

    default:
      return state;
  }
}

// ======================== 4. Context ========================
interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string, size?: string | null) => void;
  updateQuantity: (id: string, size: string | null | undefined, quantity: number) => void; // 修正：quantity 是必需的
  clearCart: () => void;
  totalAmount: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// ======================== 5. Provider ========================
function CartProviderComponent({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  // 啟動時從 localStorage 讀取
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cart');
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[];
        dispatch({ type: 'LOAD_FROM_STORAGE', payload: parsed });
      }
    } catch (error) {
      console.error('載入購物車失敗', error);
    }
  }, []);

  // 每次 items 變動就存回 localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(state.items));
    } catch (error) {
      console.error('儲存購物車失敗', error);
    }
  }, [state.items]);

  const addItem = (item: Omit<CartItem, 'quantity'>) =>
    dispatch({ type: 'ADD_ITEM', payload: item });

  const removeItem = (id: string, size?: string | null) =>
    dispatch({ type: 'REMOVE_ITEM', payload: { id, size } });

  const updateQuantity = (id: string, size: string | null | undefined, quantity: number) =>
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, size, quantity } });

  const clearCart = () => dispatch({ type: 'CLEAR_CART' });

  const totalAmount = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);

  const contextValue: CartContextType = {
    items: state.items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalAmount,
    totalItems,
  };

  return React.createElement(
    CartContext.Provider,
    { value: contextValue },
    children
  );
}

export const CartProvider = CartProviderComponent;

// ======================== 6. Hook ========================
export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart 必須在 CartProvider 內使用');
  }
  return context;
}