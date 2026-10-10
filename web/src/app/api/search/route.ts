import { db } from "@/lib/db";
import { searchProductIds } from "@/lib/search";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const ids = await searchProductIds(q, 8);
  if (!ids.length) return Response.json([]);
  const products = await db.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, sku: true, name: true, slug: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  return Response.json(ids.map((id) => byId.get(id)).filter(Boolean).map((p) => ({ sku: p!.sku, name: p!.name, slug: p!.slug })));
}
