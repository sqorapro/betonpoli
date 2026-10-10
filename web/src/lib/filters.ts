import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export const PAGE_SIZE = 48;

export const SORTS = {
  default: { label: "По умолчанию", orderBy: [{ sort: "asc" }, { id: "asc" }] },
  price_asc: { label: "Сначала дешевле", orderBy: [{ priceFrom: { sort: "asc", nulls: "last" } }, { id: "asc" }] },
  price_desc: { label: "Сначала дороже", orderBy: [{ priceFrom: { sort: "desc", nulls: "last" } }, { id: "asc" }] },
  name: { label: "По названию", orderBy: [{ name: "asc" }] },
} satisfies Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput[] }>;

export type SortKey = keyof typeof SORTS;

export type FilterDef =
  | { kind: "options"; code: string; name: string; unit: string; options: string[] }
  | { kind: "range"; code: string; name: string; unit: string; min: number; max: number };

type Params = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const num = (v: string | string[] | undefined) => {
  const s = Array.isArray(v) ? v[0] : v;
  if (!s) return undefined;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};

/** Фильтры категории со списком значений, которые реально есть у товаров */
export async function getCategoryFilters(categoryId: number, productWhere: Prisma.ProductWhereInput): Promise<FilterDef[]> {
  // Набор: характеристики предков (наследуются), самой категории и подкатегорий (их товары тоже в выдаче)
  const all = await db.category.findMany({ select: { id: true, parentId: true } });
  const parentOf = new Map(all.map((c) => [c.id, c.parentId]));
  const ancestors: number[] = [];
  for (let cur = parentOf.get(categoryId) ?? null; cur != null; cur = parentOf.get(cur) ?? null) ancestors.unshift(cur);
  const descendants = [categoryId];
  for (let i = 0; i < descendants.length; i++) for (const c of all) if (c.parentId === descendants[i]) descendants.push(c.id);
  const order = [...ancestors, ...descendants];

  const links = await db.categoryAttribute.findMany({
    where: { categoryId: { in: order }, filterable: true },
    include: { attribute: true },
  });
  links.sort((x, y) => order.indexOf(x.categoryId) - order.indexOf(y.categoryId) || x.sort - y.sort);
  const seen = new Set<number>();
  const attrs = links.filter((l) => !seen.has(l.attributeId) && seen.add(l.attributeId));

  if (!attrs.length) return [];
  const ids = attrs.map((l) => l.attributeId);
  // Два запроса на все характеристики: диапазоны чисел и списки значений
  const [ranges, options] = await Promise.all([
    db.productAttributeValue.groupBy({
      by: ["attributeId"],
      where: { attributeId: { in: ids }, valueNumber: { not: null }, product: productWhere },
      _min: { valueNumber: true },
      _max: { valueNumber: true },
    }),
    db.productAttributeValue.findMany({
      where: { attributeId: { in: ids }, valueText: { not: "" }, product: productWhere },
      distinct: ["attributeId", "valueText"],
      select: { attributeId: true, valueText: true },
    }),
  ]);

  const defs: FilterDef[] = [];
  for (const { attribute: a } of attrs) {
    if (a.type === "NUMBER") {
      const r = ranges.find((x) => x.attributeId === a.id);
      const min = Number(r?._min.valueNumber);
      const max = Number(r?._max.valueNumber);
      if (Number.isFinite(min) && Number.isFinite(max) && min !== max) defs.push({ kind: "range", code: a.code, name: a.name, unit: a.unit, min, max });
    } else {
      const list = options.filter((o) => o.attributeId === a.id).map((o) => o.valueText).sort((x, y) => x.localeCompare(y, "ru"));
      if (list.length > 1) defs.push({ kind: "options", code: a.code, name: a.name, unit: a.unit, options: list });
    }
  }
  return defs;
}

/** URL-параметры f_<code>=знач (повторяется) и f_<code>_min / f_<code>_max → условие Prisma */
export function filtersToWhere(defs: FilterDef[], params: Params): Prisma.ProductWhereInput[] {
  const and: Prisma.ProductWhereInput[] = [];
  for (const d of defs) {
    if (d.kind === "options") {
      const selected = list(params[`f_${d.code}`]).filter((v) => d.options.includes(v));
      if (selected.length) {
        and.push({ attributeValues: { some: { attribute: { code: d.code }, valueText: { in: selected } } } });
      }
    } else {
      const min = num(params[`f_${d.code}_min`]);
      const max = num(params[`f_${d.code}_max`]);
      if (min !== undefined || max !== undefined) {
        and.push({
          attributeValues: {
            some: { attribute: { code: d.code }, valueNumber: { ...(min !== undefined && { gte: min }), ...(max !== undefined && { lte: max }) } },
          },
        });
      }
    }
  }
  return and;
}

export function activeFilterCount(defs: FilterDef[], params: Params): number {
  return filtersToWhere(defs, params).length;
}

export function parseSort(v: string | string[] | undefined): SortKey {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s in SORTS ? (s as SortKey) : "default";
}

export function parsePage(v: string | string[] | undefined): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n > 1 ? n : 1;
}
