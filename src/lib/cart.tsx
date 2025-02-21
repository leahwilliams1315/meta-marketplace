"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  paymentStyle: 'INSTANT' | 'REQUEST';
  sellerId: string;
  priceId: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

type CartAction =
  | { type: "ADD_ITEM"; payload: Omit<CartItem, "quantity"> }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "TOGGLE_CART" }
  | { type: "CLEAR_CART" };

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

const cartReducer = (state: CartState, action: CartAction): CartState => {
  const validateQuantity = (items: CartItem[]) => {
    // Group items by payment style
    const requestItems = items.filter(item => item.paymentStyle === 'REQUEST');
    const instantItems = items.filter(item => item.paymentStyle === 'INSTANT');
    
    // If there are both types, only keep one type
    if (requestItems.length > 0 && instantItems.length > 0) {
      return requestItems.length > instantItems.length ? requestItems : instantItems;
    }
    
    return items;
  };
  switch (action.type) {
    case "ADD_ITEM": {
      const existingItem = state.items.find(
        (item) => item.id === action.payload.id
      );
      if (existingItem) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      const newItems = validateQuantity([
        ...state.items,
        { ...action.payload, quantity: 1 },
      ]);
      return {
        ...state,
        items: newItems,
      };
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      };
    case "UPDATE_QUANTITY":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    case "TOGGLE_CART":
      return {
        ...state,
        isOpen: !state.isOpen,
      };
    case "CLEAR_CART":
      return {
        ...state,
        items: [],
      };
    default:
      return state;
  }
};

const CART_STORAGE_KEY = "cart_items";

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    isOpen: false,
  });

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        const { items } = JSON.parse(savedCart);
        // Validate items have the required fields
        const validItems = items.filter((item: CartItem) => {
          return (
            item.id &&
            item.name &&
            item.price &&
            item.image &&
            item.paymentStyle &&
            item.sellerId &&
            item.priceId
          );
        });

        if (validItems.length !== items.length) {
          // Some items were invalid, clear the cart
          localStorage.removeItem(CART_STORAGE_KEY);
          return;
        }

        validItems.forEach((item: CartItem) => {
          dispatch({ type: "ADD_ITEM", payload: item });
        });
      } catch {
        // Invalid JSON or other error, clear the cart
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    }
  }, []);

  // Save cart to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ items: state.items })
    );
  }, [state.items]);

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price / 100);
}
