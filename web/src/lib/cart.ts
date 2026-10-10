"use client";

import { useSyncExternalStore } from "react";

// Корзина живёт в localStorage. Цены здесь — для показа; при оформлении сервер берёт цены из БД.
export type CartItem = {
  packagingId: number;
  productId: number;
  sku: string;
  name: string;
  slug: string;
  packLabel: string;
  price: number;
  qty: number;
  image?: string | null;
};

const KEY = "betonpoli.cart.v1";
const listeners = new Set<() => void>();
let cache: CartItem[] | null = null;
const EMPTY: CartItem[] = [];

function read(): CartItem[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(items: CartItem[]) {
  cache = items;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // приватный режим — корзина живёт до перезагрузки
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function addToCart(items: CartItem[]) {
  const next = [...read()];
  for (const it of items) {
    if (it.qty <= 0) continue;
    const existing = next.findIndex((x) => x.packagingId === it.packagingId);
    if (existing >= 0) next[existing] = { ...next[existing], ...it, qty: next[existing].qty + it.qty };
    else next.push(it);
  }
  write(next);
}

export function setQty(packagingId: number, qty: number) {
  write(
    read()
      .map((x) => (x.packagingId === packagingId ? { ...x, qty: Math.max(0, Math.floor(qty)) } : x))
      .filter((x) => x.qty > 0),
  );
}

export function removeFromCart(packagingId: number) {
  write(read().filter((x) => x.packagingId !== packagingId));
}

export function clearCart() {
  write([]);
}

/** В корзине есть позиции без цены («по запросу») — итог неполный */
export const hasOnRequest = (items: CartItem[]) => items.some((i) => i.price <= 0);
export const cartTotalLabel = (items: CartItem[], fmt: (n: number) => string) => {
  const total = cartTotal(items);
  if (!hasOnRequest(items)) return fmt(total);
  return total > 0 ? `${fmt(total)} + по запросу` : "По запросу";
};
export const cartTotal = (items: CartItem[]) => items.reduce((s, i) => s + i.price * i.qty, 0);
export const cartCount = (items: CartItem[]) => items.reduce((s, i) => s + i.qty, 0);
