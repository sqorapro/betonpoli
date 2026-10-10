"use client";

import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { cartTotalLabel, removeFromCart, setQty, useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { TechCheckForm } from "./TechCheckForm";

export function CartView() {
  const items = useCart();

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-6 py-32 text-center">
        <p>Корзина пуста</p>
        <Link href="/" className="btn">
          В каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-20">
      <ul className="flex flex-col border-b border-line">
        {items.map((it) => (
          <li key={it.packagingId} className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 border-t border-line py-4 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center sm:gap-6">
            <Link href={`/product/${it.slug}`} className="row-span-2 sm:row-span-1">
              <ProductImage image={it.image ? { path: it.image, alt: it.name } : null} alt={it.name} size="sm" />
            </Link>
            <div className="flex min-w-0 flex-col gap-1">
              <Link href={`/product/${it.slug}`} className="font-semibold">
                {it.sku}
              </Link>
              <span className="prose-plain truncate text-base">{it.name}</span>
              <span className="text-muted">
                {it.packLabel} · {formatPrice(it.price)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6 sm:justify-end">
              <div className="flex h-9 items-center border border-line-strong">
                <button type="button" aria-label="Меньше" className="h-full w-8 cursor-pointer" onClick={() => setQty(it.packagingId, it.qty - 1)}>
                  −
                </button>
                <input
                  aria-label={`Количество ${it.sku}`}
                  inputMode="numeric"
                  value={it.qty}
                  onChange={(e) => setQty(it.packagingId, Number(e.target.value.replace(/\D/g, "")) || 1)}
                  className="w-10 bg-transparent text-center outline-none"
                />
                <button type="button" aria-label="Больше" className="h-full w-8 cursor-pointer" onClick={() => setQty(it.packagingId, it.qty + 1)}>
                  +
                </button>
              </div>
              <span className="w-28 text-right font-semibold">{formatPrice(it.price * it.qty)}</span>
              <button type="button" aria-label={`Удалить ${it.sku}`} className="cursor-pointer text-muted hover:text-ink" onClick={() => removeFromCart(it.packagingId)}>
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      <aside className="flex h-fit flex-col gap-5 bg-tile p-6 lg:sticky lg:top-24">
        <div className="flex items-baseline justify-between">
          <span className="text-muted">Итого</span>
          <span className="text-lg font-semibold">{cartTotalLabel(items, formatPrice)}</span>
        </div>
        <p className="prose-plain text-base text-muted">
          Онлайн-оплаты нет. Менеджер свяжется с вами, подтвердит наличие и рассчитает доставку.
        </p>
        <Link href="/checkout" className="btn btn-primary h-[52px]">
          Оформить заявку
        </Link>
        <TechCheckForm />
      </aside>
    </div>
  );
}
