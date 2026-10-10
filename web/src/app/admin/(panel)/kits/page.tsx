import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Комплекты" };

export default async function KitsPage() {
  await requireAdmin();
  const kits = await db.kit.findMany({
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    include: { items: { orderBy: { sort: "asc" }, include: { product: { select: { sku: true } } } } },
  });
  return (
    <div className="flex max-w-[960px] flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="adm-h1">
          Комплекты <span className="font-normal text-muted">{kits.length}</span>
        </h1>
        <Link href="/admin/kits/new" className="btn btn-primary">+ Новый комплект</Link>
      </div>
      <p className="text-muted">
        Комплект показывается в карточке каждого входящего в него товара — блок «Весь пирог пола» с кнопкой «Добавить всё».
      </p>
      <table className="adm-table">
        <thead>
          <tr><th>Название</th><th>Состав</th></tr>
        </thead>
        <tbody>
          {kits.map((k) => (
            <tr key={k.id} className={k.isPublished ? "" : "opacity-50"}>
              <td>
                <Link href={`/admin/kits/${k.id}`} className="underline underline-offset-2">{k.name}</Link>
              </td>
              <td className="text-muted">{k.items.map((i) => i.product.sku).join(" · ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
