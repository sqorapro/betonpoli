import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export const getMenuCategories = cache(() =>
  db.category.findMany({
    where: { parentId: null },
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    select: { id: true, name: true, shortName: true, slug: true },
  }),
);

export const getSettings = cache(async () => {
  const rows = await db.setting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;
});

// Для сетки: код, строка описания, фасовка, цена «от», фото
export const tileSelect = {
  id: true,
  sku: true,
  slug: true,
  name: true,
  shortDescription: true,
  stock: true,
  images: { orderBy: { sort: "asc" }, take: 1, select: { path: true, alt: true } },
  packagings: { orderBy: { sort: "asc" }, select: { amount: true, unit: true, price: true } },
} satisfies Prisma.ProductSelect;

export type TileProduct = Prisma.ProductGetPayload<{ select: typeof tileSelect }>;

export function minPrice(p: TileProduct): number | null {
  if (!p.packagings.length) return null;
  return Math.min(...p.packagings.map((x) => Number(x.price)));
}

/** id категории и всех её потомков */
const allCategoryLinks = cache(() => db.category.findMany({ select: { id: true, parentId: true } }));

export async function categoryTreeIds(rootId: number): Promise<number[]> {
  const all = await allCategoryLinks();
  const ids = [rootId];
  for (let i = 0; i < ids.length; i++) {
    for (const c of all) if (c.parentId === ids[i]) ids.push(c.id);
  }
  return ids;
}
