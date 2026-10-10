import "server-only";
import { db } from "@/lib/db";

// Артикул часто набирают кириллицей: «ер-с251» → «ep-c251»
const LOOKALIKE: Record<string, string> = {
  а: "a", в: "b", е: "e", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t", у: "y", х: "x",
};
const toLatin = (s: string) => s.replace(/[авекмнорстух]/g, (c) => LOOKALIKE[c]);

/** id товаров по релевантности: сначала артикул, потом название (подстрока, затем похожие) */
export async function searchProductIds(query: string, limit = 60): Promise<number[]> {
  const q = query.trim().toLowerCase().slice(0, 100);
  if (q.length < 2) return [];
  const sku = toLatin(q).replace(/\s+/g, "");
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  const skuLike = `%${sku.replace(/[%_\\]/g, "\\$&")}%`;

  const rows = await db.$queryRaw<{ id: number }[]>`
    SELECT id FROM "Product"
    WHERE "isPublished"
      AND (
        replace(lower(sku), ' ', '') LIKE ${skuLike}
        OR lower(name) LIKE ${like}
        OR similarity(lower(name), ${q}) > 0.2
      )
    ORDER BY
      (replace(lower(sku), ' ', '') LIKE ${sku + "%"}) DESC,
      (replace(lower(sku), ' ', '') LIKE ${skuLike}) DESC,
      (lower(name) LIKE ${like}) DESC,
      similarity(lower(name), ${q}) DESC,
      sort ASC
    LIMIT ${limit}
  `;
  return rows.map((r) => r.id);
}
