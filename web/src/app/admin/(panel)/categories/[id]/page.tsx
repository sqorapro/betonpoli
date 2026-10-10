import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { categoryOptions } from "@/lib/admin-data";
import { db } from "@/lib/db";
import { deleteCategory } from "../actions";
import { CategoryForm } from "../CategoryForm";

export const metadata = { title: "Категория" };

export default async function CategoryEditPage({ params, searchParams }: PageProps<"/admin/categories/[id]">) {
  await requireAdmin();
  const { id: idParam } = await params;
  const { saved } = await searchParams;
  const c = idParam === "new" ? null : await db.category.findUnique({ where: { id: Number(idParam) }, include: { attributes: { orderBy: { sort: "asc" } }, _count: { select: { products: true } } } });
  if (idParam !== "new" && !c) notFound();
  const [parents, allAttributes] = await Promise.all([
    categoryOptions(),
    db.attribute.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, unit: true } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/categories" className="text-muted">← Категории</Link>
      <h1 className="adm-h1">{c ? c.name : "Новая категория"}</h1>
      <CategoryForm
        key={c ? `${c.id}-${saved}` : "new"}
        category={c ?? { name: "", shortName: "", slug: "", parentId: null, sort: 0, description: "", seoTitle: "", seoDescription: "" }}
        parents={parents}
        allAttributes={allAttributes}
        selected={c?.attributes.map((a) => ({ attributeId: a.attributeId, filterable: a.filterable })) ?? []}
        saved={saved === "1"}
      />
      {c && (
        <form action={deleteCategory} className="border-t border-line pt-6">
          <input type="hidden" name="id" value={c.id} />
          <button type="submit" className="cursor-pointer text-muted hover:text-danger">Удалить категорию</button>
          <span className="ml-3 text-[12px] text-muted">
            Товары ({c._count.products}) останутся, но без категории
          </span>
        </form>
      )}
    </div>
  );
}
