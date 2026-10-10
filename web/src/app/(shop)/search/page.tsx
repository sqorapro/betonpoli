import type { Metadata } from "next";
import Form from "next/form";
import { ProductGrid } from "@/components/ProductGrid";
import { tileSelect } from "@/lib/catalog";
import { db } from "@/lib/db";
import { searchProductIds } from "@/lib/search";

export const metadata: Metadata = { title: "Поиск", robots: { index: false } };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";
  const ids = await searchProductIds(query);
  const found = ids.length ? await db.product.findMany({ where: { id: { in: ids } }, select: tileSelect }) : [];
  const byId = new Map(found.map((p) => [p.id, p]));
  const products = ids.map((id) => byId.get(id)!).filter(Boolean);

  return (
    <div className="flex flex-col gap-8 px-4 pt-8 md:px-8 md:pt-12">
      <h1 className="text-lg font-semibold">
        {query ? (
          <>
            Поиск: «{query}» <span className="font-normal text-muted">{products.length}</span>
          </>
        ) : (
          "Поиск"
        )}
      </h1>
      <Form action="/search" className="md:hidden">
        <input name="q" defaultValue={query} placeholder="Название или артикул" className="field" />
      </Form>
      {products.length ? (
        <ProductGrid products={products} />
      ) : (
        query && <p className="py-24 text-center text-muted">Ничего не найдено. Попробуйте артикул или часть названия.</p>
      )}
    </div>
  );
}
