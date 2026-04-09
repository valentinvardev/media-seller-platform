"use client";

import { createContext, useCallback, useContext, useState } from "react";

type CartCtx = {
  cart: Set<string>;
  toggle: (bib: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartCtx>({
  cart: new Set(),
  toggle: () => undefined,
  clear: () => undefined,
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Set<string>>(new Set());

  const toggle = useCallback((bib: string) => {
    setCart((prev) => {
      const next = new Set(prev);
      next.has(bib) ? next.delete(bib) : next.add(bib);
      return next;
    });
  }, []);

  const clear = useCallback(() => setCart(new Set()), []);

  return (
    <CartContext.Provider value={{ cart, toggle, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
