import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const CartContext = createContext(null);

const TAX_PERCENT = Number(import.meta.env.VITE_RESTAURANT_TAX_PERCENT) || 5;

export function CartProvider({ children }) {
  const [tableInfo, setTableInfo] = useState(() => {
    try {
      const saved = sessionStorage.getItem('gourmet_table_info');
      return saved ? JSON.parse(saved) : { tableId: null, tableNumber: null };
    } catch {
      return { tableId: null, tableNumber: null };
    }
  });

  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = sessionStorage.getItem('gourmet_cart_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save to sessionStorage only when changed
  useEffect(() => {
    try {
      sessionStorage.setItem('gourmet_cart_items', JSON.stringify(cartItems));
    } catch (e) {
      console.error('Error saving cart to sessionStorage:', e);
    }
  }, [cartItems]);

  useEffect(() => {
    try {
      sessionStorage.setItem('gourmet_table_info', JSON.stringify(tableInfo));
    } catch (e) {
      console.error('Error saving table info to sessionStorage:', e);
    }
  }, [tableInfo]);

  const setTable = useCallback((tableId, tableNumber) => {
    setTableInfo((prev) => {
      if (prev.tableId === tableId && prev.tableNumber === tableNumber) {
        return prev; // Prevent unnecessary state update if identical
      }
      return { tableId, tableNumber };
    });
  }, []);

  const addItem = useCallback((item, quantity = 1, notes = '') => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.itemId === item.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: updated[existingIndex].qty + quantity,
          notes: notes || updated[existingIndex].notes,
        };
        return updated;
      }
      return [
        ...prev,
        {
          itemId: item.id,
          name: item.name,
          price: item.price,
          qty: quantity,
          notes: notes || '',
          isVeg: item.isVeg,
          imageUrl: item.imageUrl,
          category: item.category,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((itemId, delta) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.itemId === itemId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  }, []);

  const updateItemNotes = useCallback((itemId, notes) => {
    setCartItems((prev) =>
      prev.map((item) => (item.itemId === itemId ? { ...item, notes } : item))
    );
  }, []);

  const removeItem = useCallback((itemId) => {
    setCartItems((prev) => prev.filter((item) => item.itemId !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    sessionStorage.removeItem('gourmet_cart_items');
  }, []);

  const getItemQuantity = useCallback(
    (itemId) => {
      const item = cartItems.find((i) => i.itemId === itemId);
      return item ? item.qty : 0;
    },
    [cartItems]
  );

  const calculations = useMemo(() => {
    const totalItems = cartItems.reduce((acc, item) => acc + item.qty, 0);
    const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
    const taxAmount = (subtotal * TAX_PERCENT) / 100;
    const grandTotal = Math.round(subtotal + taxAmount);

    return {
      totalItems,
      subtotal,
      taxPercent: TAX_PERCENT,
      taxAmount,
      grandTotal,
    };
  }, [cartItems]);

  const value = useMemo(
    () => ({
      cartItems,
      tableInfo,
      setTable,
      addItem,
      updateQuantity,
      updateItemNotes,
      removeItem,
      clearCart,
      getItemQuantity,
      ...calculations,
    }),
    [
      cartItems,
      tableInfo,
      setTable,
      addItem,
      updateQuantity,
      updateItemNotes,
      removeItem,
      clearCart,
      getItemQuantity,
      calculations,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
