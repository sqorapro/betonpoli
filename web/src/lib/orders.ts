import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { packLabel } from "@/lib/format";
import { notifyNewOrder } from "@/lib/notify";

export type CartLine = { packagingId: number; qty: number };

// Простая защита от спама: не чаще 5 заявок в 10 минут с одного IP
const hits = new Map<string, number[]>();
export async function rateLimited() {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

export function parseItems(raw: FormDataEntryValue | null): unknown {
  try {
    return JSON.parse(String(raw ?? "[]"));
  } catch {
    return [];
  }
}

type NewOrder = {
  type: "ORDER" | "TECH_CHECK";
  name: string;
  phone: string;
  email: string;
  delivery: "PICKUP" | "DELIVERY" | null;
  comment: string;
  items: CartLine[];
};

/** Цены и названия берутся из БД, не из браузера. null — в корзине не осталось продаваемых товаров. */
export async function createOrder(o: NewOrder): Promise<number | null> {
  const packs = await db.packaging.findMany({
    where: { id: { in: o.items.map((i) => i.packagingId) }, product: { isPublished: true } },
    include: { product: { select: { id: true, sku: true, name: true } } },
  });
  const byId = new Map(packs.map((p) => [p.id, p]));
  const lines = o.items
    .filter((i) => byId.has(i.packagingId))
    .map((i) => {
      const p = byId.get(i.packagingId)!;
      return {
        productId: p.product.id,
        packagingId: p.id,
        sku: p.product.sku,
        name: p.product.name,
        packagingLabel: packLabel(p),
        unitPrice: Number(p.price),
        qty: i.qty,
      };
    });
  if (!lines.length) return null;

  const total = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const order = await db.order.create({
    data: {
      type: o.type,
      name: o.name,
      phone: o.phone,
      email: o.email,
      delivery: o.delivery,
      comment: o.comment,
      consent: true,
      total,
      items: { create: lines },
    },
  });

  await notifyNewOrder({ ...o, id: order.id, total, items: lines });
  return order.id;
}
