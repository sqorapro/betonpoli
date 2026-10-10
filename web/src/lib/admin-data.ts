import "server-only";
import { db } from "@/lib/db";

/** Категории деревом: «Полимеры / Эпоксидные» — для выпадающих списков */
export async function categoryOptions() {
  const all = await db.category.findMany({ orderBy: [{ sort: "asc" }, { id: "asc" }], select: { id: true, name: true, parentId: true } });
  const out: { id: number; label: string; depth: number }[] = [];
  const walk = (parentId: number | null, prefix: string, depth: number) => {
    for (const c of all.filter((x) => x.parentId === parentId)) {
      const label = prefix ? `${prefix} / ${c.name}` : c.name;
      out.push({ id: c.id, label, depth });
      walk(c.id, label, depth + 1);
    }
  };
  walk(null, "", 0);
  return out;
}

/** Набор характеристик категории с учётом родителей */
export async function attributesByCategory() {
  const [cats, links] = await Promise.all([
    db.category.findMany({ select: { id: true, parentId: true } }),
    db.categoryAttribute.findMany({ orderBy: { sort: "asc" }, include: { attribute: true } }),
  ]);
  const parentOf = new Map(cats.map((c) => [c.id, c.parentId]));
  const result: Record<number, { id: number; name: string; unit: string; type: "NUMBER" | "SELECT" | "TEXT" }[]> = {};
  for (const c of cats) {
    const chain: number[] = [];
    for (let cur: number | null = c.id; cur != null; cur = parentOf.get(cur) ?? null) chain.unshift(cur);
    const seen = new Set<number>();
    result[c.id] = chain
      .flatMap((cid) => links.filter((l) => l.categoryId === cid))
      .filter((l) => !seen.has(l.attributeId) && seen.add(l.attributeId))
      .map((l) => ({ id: l.attribute.id, name: l.attribute.name, unit: l.attribute.unit, type: l.attribute.type }));
  }
  return result;
}
