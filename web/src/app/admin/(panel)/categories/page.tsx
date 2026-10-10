import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { categoryOptions } from "@/lib/admin-data";
import { db } from "@/lib/db";

export const metadata = { title: "Категории" };

export default async function CategoriesPage() {
  await requireAdmin();
  const [options, counts] = await Promise.all([
    categoryOptions(),
    db.product.groupBy({ by: ["categoryId"], _count: true }),
  ]);
  const countOf = (id: number) => counts.find((c) => c.categoryId === id)?._count ?? 0;

  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="adm-h1">Категории</h1>
        <Link href="/admin/categories/new" className="btn btn-primary">+ Новая категория</Link>
      </div>
      <table className="adm-table">
        <thead>
          <tr><th>Название</th><th className="text-right">Товаров</th></tr>
        </thead>
        <tbody>
          {options.map((c) => (
            <tr key={c.id}>
              <td style={{ paddingLeft: c.depth * 24 }}>
                <Link href={`/admin/categories/${c.id}`} className="underline underline-offset-2">
                  {c.label.split(" / ").at(-1)}
                </Link>
              </td>
              <td className="text-right">{countOf(c.id)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
