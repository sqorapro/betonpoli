"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cartTotalLabel, useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { submitOrder, type CheckoutState } from "./actions";

export function CheckoutForm() {
  const items = useCart();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(submitOrder, {});
  const e = state.errors ?? {};
  const v = state.values ?? {};

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
    <form action={action} className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,560px)_360px] lg:justify-between lg:gap-20" noValidate>
      <div className="flex flex-col gap-5">
        <Field label="Имя *" name="name" error={e.name} defaultValue={v.name} autoComplete="name" />
        <Field label="Телефон *" name="phone" error={e.phone} defaultValue={v.phone} type="tel" autoComplete="tel" placeholder="+7 900 000-00-00" />
        <Field label="E-mail" name="email" error={e.email} defaultValue={v.email} type="email" autoComplete="email" />

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-muted">Способ получения</legend>
          {[
            ["PICKUP", "Самовывоз"],
            ["DELIVERY", "Доставка по договорённости"],
          ].map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-2.5">
              <input type="radio" name="delivery" value={value} defaultChecked={(v.delivery ?? "PICKUP") === value} className="h-4 w-4 accent-ink" />
              {label}
            </label>
          ))}
        </fieldset>

        <label className="label">
          Комментарий
          <textarea name="comment" rows={4} defaultValue={v.comment} className="field h-auto py-3" />
        </label>

        {/* honeypot */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ packagingId: i.packagingId, qty: i.qty })))} />

        <label className="flex cursor-pointer items-start gap-2.5">
          <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 shrink-0 accent-ink" />
          <span className="prose-plain text-base">
            Согласен на обработку персональных данных в соответствии с{" "}
            <Link href="/privacy" target="_blank">
              политикой конфиденциальности
            </Link>
          </span>
        </label>
        {e.consent && <p className="text-danger">{e.consent}</p>}
        {(e.items || state.message) && <p className="text-danger">{e.items ?? state.message}</p>}
      </div>

      <aside className="flex h-fit flex-col gap-5 bg-tile p-6 lg:sticky lg:top-24">
        <ul className="flex flex-col gap-2">
          {items.map((i) => (
            <li key={i.packagingId} className="flex justify-between gap-4">
              <span className="min-w-0 truncate">
                {i.sku} · {i.packLabel} × {i.qty}
              </span>
              <span className="shrink-0">{formatPrice(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between border-t border-line-strong pt-4">
          <span className="text-muted">Итого</span>
          <span className="text-lg font-semibold">{cartTotalLabel(items, formatPrice)}</span>
        </div>
        <button type="submit" disabled={pending} className="btn btn-primary h-[52px]">
          {pending ? "Отправляем…" : "Отправить заявку"}
        </button>
        <p className="prose-plain text-base text-muted">Оплата после подтверждения заявки менеджером.</p>
      </aside>
    </form>
  );
}

function Field({ label, name, error, ...rest }: { label: string; name: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="label">
      {label}
      <input name={name} aria-invalid={!!error} className={`field ${error ? "border-danger" : ""}`} {...rest} />
      {error && <span className="text-danger normal-case">{error}</span>}
    </label>
  );
}
