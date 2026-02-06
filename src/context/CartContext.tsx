'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Item } from '@/types/order';

interface CartContextType {
  items: Item[];
  addToCart: (item: Omit<Item, 'quantity'>) => void;
  // When applicable, provide `lensOption` to target a specific variant of the item.
  removeFromCart: (id: string, lensOption?: string | null) => void;
  updateQuantity: (id: string, quantity: number, lensOption?: string | null) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>(() => {
    if (typeof window === 'undefined') return [];
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        return JSON.parse(savedCart);
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }
    return [];
  });
  // Save to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (item: Omit<Item, 'quantity'>) => {
    setItems(prev => {
      // Check for existing item with same id AND lens option
      const existing = prev.find(i => i.id === item.id && i.lensOption === item.lensOption);
      if (existing) {
        return prev.map(i => 
          i.id === item.id && i.lensOption === item.lensOption
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string, lensOption?: string | null) => {
    setItems(prev => {
      if (lensOption !== undefined) {
        return prev.filter(i => !(i.id === id && i.lensOption === lensOption));
      }
      // If no lensOption provided, remove all items matching the id
      return prev.filter(i => i.id !== id);
    });
  };

  const updateQuantity = (id: string, quantity: number, lensOption?: string | null) => {
    if (quantity <= 0) {
      removeFromCart(id, lensOption);
      return;
    }
    setItems(prev => prev.map(i => 
      i.id === id && (lensOption === undefined || i.lensOption === lensOption) ? { ...i, quantity } : i
    ));
  };
;

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
