import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { ConsumptionType } from "@/lib/calc";
import { packLabel } from "@/lib/format";
import type { PackUnit } from "@/generated/prisma/enums";

// Данные для клиентских компонентов карточки — только примитивы, без Decimal

export type PackDTO = { id: number; label: string; amount: number; unit: PackUnit; price: number };

export type KitDTO = {
  id: number;
  name: string;
  usesThickness: boolean;
  usesLength: boolean;
  defaultArea: number;
  defaultThickness: number | null;
  items: {
    id: number;
    role: string;
    rule: { type: ConsumptionType; rate: number };
    product: { id: number; sku: string; name: string; slug: string; image: { path: string; alt: string } | null };
    pack: PackDTO;
  }[];
};

const toPack = (p: { id: number; amount: unknown; unit: PackUnit; price: unknown }): PackDTO => ({
  id: p.id,
  amount: Number(p.amount),
  unit: p.unit,
  price: Number(p.price),
  label: packLabel({ amount: Number(p.amount), unit: p.unit }),
});

export const getProduct = cache(async (slug: string) => {
  const p = await db.product.findUnique({
    where: { slug },
    include: {
      category: { include: { parent: { select: { name: true, slug: true } } } },
      images: { orderBy: { sort: "asc" } },
      packagings: { orderBy: { sort: "asc" } },
      attributeValues: { include: { attribute: true }, orderBy: { attribute: { name: "asc" } } },
    },
  });
  if (!p || !p.isPublished) return null;
  return p;
});

/** Комплекты, куда входит товар — для блока «Весь пирог пола» */
export async function getProductKits(productId: number): Promise<KitDTO[]> {
  const kits = await db.kit.findMany({
    where: { isPublished: true, items: { some: { productId } } },
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    include: {
      items: {
        where: { product: { isPublished: true } },
        orderBy: { sort: "asc" },
        include: {
          packaging: true,
          product: {
            select: {
              id: true, sku: true, name: true, slug: true,
              images: { orderBy: { sort: "asc" }, take: 1, select: { path: true, alt: true } },
              packagings: { orderBy: { sort: "asc" } },
            },
          },
        },
      },
    },
  });

  // «Пирог» — это 2+ слоя; полные системы показываем первыми
  return kits
    .filter((k) => k.items.length > 1)
    .sort((a, b) => b.items.length - a.items.length)
    .map((k) => ({
    id: k.id,
    name: k.name,
    usesThickness: k.usesThickness,
    usesLength: k.usesLength,
    defaultArea: Number(k.defaultArea),
    defaultThickness: k.defaultThickness == null ? null : Number(k.defaultThickness),
    items: k.items
      .map((it) => {
        const pack = it.packaging ?? it.product.packagings[0];
        if (!pack) return null;
        return {
          id: it.id,
          role: it.role,
          rule: { type: it.consumptionType as ConsumptionType, rate: Number(it.rate) },
          product: { id: it.product.id, sku: it.product.sku, name: it.product.name, slug: it.product.slug, image: it.product.images[0] ?? null },
          pack: toPack(pack),
        };
      })
      .filter((x) => x !== null),
  }));
}

export { toPack };
