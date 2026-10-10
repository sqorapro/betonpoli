"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useCart } from "@/lib/cart";
import { submitTechCheck, type CheckoutState } from "../checkout/actions";

/** «Проверка технолога»: корзина уходит технологу, клиент оставляет только телефон */
export function TechCheckForm() {
  const items = useCart();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CheckoutState, FormData>(submitTechCheck, {});
  const e = state.errors ?? {};
  const v = state.values ?? {};

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => setOpen(true)} className="btn h-[52px]">
          Проверка технолога
        </button>
        <p className="prose-plain text-base text-muted">Не уверены в расчёте? Технолог проверит состав корзины и перезвонит.</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 border-t border-line-strong pt-5" noValidate>
      <span className="font-semibold">Проверка технолога</span>
      <p className="prose-plain text-base text-muted">
        Отправим технологу состав корзины. Он проверит расход и совместимость материалов и перезвонит в рабочее время.
      </p>
      <label className="label">
        Телефон *
        <input name="phone" type="tel" autoComplete="tel" placeholder="+7 900 000-00-00" defaultValue={v.phone} aria-invalid={!!e.phone} className={`field ${e.phone ? "border-danger" : ""}`} />
        {e.phone && <span className="text-danger normal-case">{e.phone}</span>}
      </label>
      <label className="label">
        Что уточнить
        <textarea name="comment" rows={3} defaultValue={v.comment} placeholder="Площадь, основание, условия эксплуатации…" className="field h-auto py-2" />
      </label>
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
      {(e.consent || e.items || state.message) && <p className="text-danger">{e.consent ?? e.items ?? state.message}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary h-[52px]">
        {pending ? "Отправляем…" : "Отправить технологу"}
      </button>
    </form>
  );
}
