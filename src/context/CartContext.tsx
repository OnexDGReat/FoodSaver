import React, { createContext, useContext, useState, useEffect } from 'react';
import { OrderItem } from '../types';
import { useToast } from './ToastContext';

interface CartContextType {
  items: OrderItem[];
  addItem: (item: OrderItem) => void;
  removeItem: (listingId: string) => void;
  clearCart: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<OrderItem[]>(() => {
    const saved = localStorage.getItem('foodsaver_cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('foodsaver_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (newItem: OrderItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.listingId === newItem.listingId);
      if (existing) {
        return prev.map(i => i.listingId === newItem.listingId 
          ? { ...i, quantity: i.quantity + newItem.quantity }
          : i
        );
      }
      return [...prev, newItem];
    });
    
    showToast(`${newItem.name} added to cart!`, 'success');
  };

  const removeItem = (listingId: string) => {
    setItems(prev => prev.filter(i => i.listingId !== listingId));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
