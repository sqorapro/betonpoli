"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createOrder, parseItems, rateLimited } from "@/lib/orders";

const phone = z
  .string()
  .trim()
  .refine((v) => v.replace(/\D/g, "").length >= 10, "Укажите телефон")
  .pipe(z.string().max(30));
const items = z
  .array(z.object({ packagingId: z.number().int().positive(), qty: z.number().int().min(1).max(9999) }))
  .min(1, "Корзина пуста")
  .max(100);
const consent = z.literal("on", { error: "Нужно согласие на обработку персональных данных" });

const orderSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя").max(100),
  phone,
  email: z.union([z.literal(""), z.email("Проверьте e-mail").max(120)]),
  delivery: z.enum(["PICKUP", "DELIVERY"]),
  comment: z.string().trim().max(2000),
  consent,
  items,
});

const checkSchema = z.object({ phone, comment: z.string().trim().max(2000), consent, items });

export type CheckoutState = { errors?: Record<string, string>; message?: string; values?: Record<string, string> };

function fieldErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) errors[String(issue.path[0] ?? "form")] ??= issue.message;
  return errors;
}

const str = (form: FormData, key: string, fallback = "") => String(form.get(key) ?? fallback);

export async function submitOrder(_: CheckoutState, form: FormData): Promise<CheckoutState> {
  const values = {
    name: str(form, "name"),
    phone: str(form, "phone"),
    email: str(form, "email"),
    delivery: str(form, "delivery", "PICKUP"),
    comment: str(form, "comment"),
  };
  if (form.get("website")) return { message: "Заявка отправлена" }; // honeypot

  const parsed = orderSchema.safeParse({ ...values, consent: form.get("consent") ?? undefined, items: parseItems(form.get("items")) });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  if (await rateLimited()) return { message: "Слишком много заявок. Позвоните нам или попробуйте позже.", values };

  const id = await createOrder({ type: "ORDER", ...parsed.data });
  if (!id) return { errors: { items: "Товары из корзины больше не продаются" }, values };
  redirect(`/thanks?order=${id}`);
}

/** «Проверка технолога»: корзина + телефон, технолог перезвонит и проверит расчёт */
export async function submitTechCheck(_: CheckoutState, form: FormData): Promise<CheckoutState> {
  const values = { phone: str(form, "phone"), comment: str(form, "comment") };
  if (form.get("website")) return { message: "Заявка отправлена" };

  const parsed = checkSchema.safeParse({ ...values, consent: form.get("consent") ?? undefined, items: parseItems(form.get("items")) });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  if (await rateLimited()) return { message: "Слишком много заявок. Позвоните нам или попробуйте позже.", values };

  const id = await createOrder({ type: "TECH_CHECK", name: "", email: "", delivery: null, ...parsed.data });
  if (!id) return { errors: { items: "Товары из корзины больше не продаются" }, values };
  redirect(`/thanks?order=${id}&check=1`);
}
