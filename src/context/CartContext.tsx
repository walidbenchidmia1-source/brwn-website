"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getFormatPriceCents } from "@/utils/pricing";
export { getFormatPriceCents };

export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  image_url: string;
  flavor: string;
  format: string;
  quantity: number;
  priceUnitCents: number;
  tax_category: string;
  allergens: string[];
}

interface CartContextType {
  cartItems: CartItem[];
  addItem: (product: any, format: string, quantity: number) => void;
  removeItem: (productId: string, format: string) => void;
  updateQuantity: (productId: string, format: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotalCents: number;
  isMounted: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Load cart from localStorage only after mounting on the client
  useEffect(() => {
    const savedCart = localStorage.getItem("brwn_cart");
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (err) {
        console.error("Failed to parse cart from localStorage", err);
      }
    }
    setIsMounted(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("brwn_cart", JSON.stringify(cartItems));
    }
  }, [cartItems, isMounted]);

  const addItem = (product: any, format: string, quantity: number) => {
    setCartItems((prev) => {
      const existingItemIndex = prev.findIndex(
        (item) => item.productId === product.id && item.format === format
      );

      const priceUnitCents = getFormatPriceCents(product.price_cents, format);

      if (existingItemIndex > -1) {
        const updated = [...prev];
        updated[existingItemIndex].quantity += quantity;
        return updated;
      }

      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          slug: product.slug,
          image_url: product.image_url || "/images/tiramisu_coffee_box_cropped.png",
          flavor: product.name,
          format: format,
          quantity: quantity,
          priceUnitCents: priceUnitCents,
          tax_category: product.tax_category || "taxable",
          allergens: product.allergens || []
        },
      ];
    });
  };

  const removeItem = (productId: string, format: string) => {
    setCartItems((prev) =>
      prev.filter((item) => !(item.productId === productId && item.format === format))
    );
  };

  const updateQuantity = (productId: string, format: string, quantity: number) => {
    if (quantity < 1) return;
    setCartItems((prev) =>
      prev.map((item) =>
        item.productId === productId && item.format === format
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotalCents = cartItems.reduce((acc, item) => acc + item.quantity * item.priceUnitCents, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotalCents,
        isMounted,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
