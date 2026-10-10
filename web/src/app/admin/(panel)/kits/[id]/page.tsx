import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { packLabel } from "@/lib/format";
import { deleteKit } from "../actions";
import { KitForm } from "../KitForm";

const num = (v: unknown) => (v == null ? "" : String(Number(v)));

export const metadata = { title: "Комплект" };

export default async function KitEditPage({ params, searchParams }: PageProps<"/admin/kits/[id]">) {
  await requireAdmin();
  const { id: idParam } = await params;
  const { saved } = await searchParams;
  const k = idParam === "new" ? null : await db.kit.findUnique({ where: { id: Number(idParam) }, include: { items: { orderBy: { sort: "asc" } } } });
  if (idParam !== "new" && !k) notFound();

  const products = await db.product.findMany({
    orderBy: { sku: "asc" },
    select: { id: true, sku: true, name: true, packagings: { orderBy: { sort: "asc" } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/kits" className="text-muted">← Комплекты</Link>
      <h1 className="adm-h1">{k ? k.name : "Новый комплект"}</h1>
      <KitForm
        key={k ? `${k.id}-${saved}` : "new"}
        saved={saved === "1"}
        products={products.map((p) => ({
          id: p.id,
          label: `${p.sku} — ${p.name}`,
          packs: p.packagings.map((x) => ({ id: x.id, label: packLabel(x), amount: Number(x.amount), price: Number(x.price) })),
        }))}
        kit={
          k
            ? {
                id: k.id, name: k.name, slug: k.slug, description: k.description, isPublished: k.isPublished, usesLength: k.usesLength,
                defaultArea: num(k.defaultArea), defaultThickness: num(k.defaultThickness), sort: k.sort,
                items: k.items.map((i) => ({ productId: i.productId, packagingId: i.packagingId, type: i.consumptionType, rate: num(i.rate), role: i.role })),
              }
            : { name: "", slug: "", description: "", isPublished: true, usesLength: false, defaultArea: "100", defaultThickness: "", sort: 0, items: [] }
        }
      />
      {k && (
        <form action={deleteKit} className="border-t border-line pt-6">
          <input type="hidden" name="id" value={k.id} />
          <button type="submit" className="cursor-pointer text-muted hover:text-danger">Удалить комплект</button>
        </form>
      )}
    </div>
  );
}
