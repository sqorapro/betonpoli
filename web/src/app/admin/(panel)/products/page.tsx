import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { STOCK } from "@/lib/admin-labels";
import { categoryOptions } from "@/lib/admin-data";
import { formatPrice } from "@/lib/calc";
import { db } from "@/lib/db";
import { imageUrl } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Товары" };

const PAGE = 100;

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const cat = Number(sp.cat) || null;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.ProductWhereInput = {
    ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] }),
    ...(cat && { categoryId: cat }),
  };
  const [categories, total, products] = await Promise.all([
    categoryOptions(),
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: { category: { select: { name: true } }, images: { take: 1, orderBy: { sort: "asc" } } },
    }),
  ]);
  const pages = Math.ceil(total / PAGE);
  const qs = (p: number) => new URLSearchParams({ ...(q && { q }), ...(cat && { cat: String(cat) }), ...(p > 1 && { page: String(p) }) }).toString();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="adm-h1">
          Товары <span className="font-normal text-muted">{total}</span>
        </h1>
        <Link href="/admin/products/new" className="btn btn-primary">
          + Новый товар
        </Link>
      </div>

      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Название или артикул" className="field w-64" />
        <select name="cat" defaultValue={cat ?? ""} className="field w-64">
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <button className="btn">Найти</button>
      </form>

      <div className="overflow-x-auto">
        <table className="adm-table min-w-[760px]">
          <thead>
            <tr>
              <th />
              <th>Артикул</th>
              <th>Название</th>
              <th>Категория</th>
              <th className="text-right">Цена от</th>
              <th>Наличие</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className={p.isPublished ? "" : "opacity-50"}>
                <td className="w-12">
                  {p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl(p.images[0].path, "sm")} alt="" className="h-10 w-10 bg-tile object-contain" />
                  ) : (
                    <div className="h-10 w-10 bg-tile" title="Нет фото" />
                  )}
                </td>
                <td className="whitespace-nowrap">
                  <Link href={`/admin/products/${p.id}`} className="font-semibold underline underline-offset-2">
                    {p.sku}
                  </Link>
                </td>
                <td>
                  {p.name}
                  {!p.isPublished && <span className="badge ml-2">скрыт</span>}
                </td>
                <td className="text-muted">{p.category?.name ?? "—"}</td>
                <td className="text-right whitespace-nowrap">{p.priceFrom != null ? formatPrice(Number(p.priceFrom)) : "—"}</td>
                <td className="whitespace-nowrap">{STOCK[p.stock]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="flex gap-3">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={`/admin/products?${qs(n)}`} className={n === page ? "font-semibold" : "text-muted"}>
              {n}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
