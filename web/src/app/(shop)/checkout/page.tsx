import type { Metadata } from "next";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Оформление заявки", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="flex flex-col gap-8 px-4 pt-8 md:px-8 md:pt-12">
      <h1 className="text-lg font-semibold">Оформление заявки</h1>
      <CheckoutForm />
    </div>
  );
}
