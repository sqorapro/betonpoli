import type { Metadata } from "next";
import { CartView } from "./CartView";

export const metadata: Metadata = { title: "Корзина", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="flex flex-col gap-8 px-4 pt-8 md:px-8 md:pt-12">
      <h1 className="text-lg font-semibold">Корзина</h1>
      <CartView />
    </div>
  );
}
