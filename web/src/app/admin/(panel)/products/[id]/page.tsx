import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { attributesByCategory, categoryOptions } from "@/lib/admin-data";
import { db } from "@/lib/db";
import { deleteProduct } from "../actions";
import { ProductForm, type ProductFormData } from "../ProductForm";

const num = (v: unknown) => (v == null ? "" : String(Number(v)));

export const metadata = { title: "Товар" };

// /admin/products/new — создание, /admin/products/12 — редактирование
export default async function ProductEditPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const { id: idParam } = await params;
  const { saved } = await searchParams;
  const isNew = idParam === "new";
  const id = Number(idParam);

  const p = isNew
    ? null
    : await db.product.findUnique({
        where: { id },
        include: { packagings: { orderBy: { sort: "asc" } }, images: { orderBy: { sort: "asc" } }, attributeValues: true },
      });
  if (!isNew && !p) notFound();

  const [categories, attrs] = await Promise.all([categoryOptions(), attributesByCategory()]);

  const data: ProductFormData = p
    ? {
        id: p.id,
        name: p.name,
        sku: p.sku,
        slug: p.slug,
        categoryId: p.categoryId,
        stock: p.stock,
        isPublished: p.isPublished,
        sort: p.sort,
        shortDescription: p.shortDescription,
        description: p.description,
        consumptionType: p.consumptionType,
        consumptionRate: num(p.consumptionRate),
        defaultThickness: num(p.defaultThickness),
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        packagings: p.packagings.map((x) => ({ id: x.id, amount: num(x.amount), unit: x.unit, price: num(x.price) })),
        images: p.images.map((i) => ({ id: i.id, path: i.path })),
        attributeValues: Object.fromEntries(p.attributeValues.map((v) => [v.attributeId, v.valueText || num(v.valueNumber)])),
      }
    : {
        name: "", sku: "", slug: "", categoryId: null, stock: "IN_STOCK", isPublished: true, sort: 0,
        shortDescription: "", description: "", consumptionType: "NONE", consumptionRate: "", defaultThickness: "",
        seoTitle: "", seoDescription: "", packagings: [], images: [], attributeValues: {},
      };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin/products" className="text-muted">
          ← Товары
        </Link>
        {p && (
          <Link href={`/product/${p.slug}`} target="_blank" className="text-muted underline underline-offset-2">
            Открыть на сайте ↗
          </Link>
        )}
      </div>
      <h1 className="adm-h1">{p ? `${p.sku} — ${p.name}` : "Новый товар"}</h1>
      <ProductForm key={p ? p.updatedAt.getTime() : "new"} product={data} categories={categories} attributesByCategory={attrs} saved={saved === "1"} />
      {p && (
        <form action={deleteProduct} className="border-t border-line pt-6">
          <input type="hidden" name="id" value={p.id} />
          <button type="submit" className="cursor-pointer text-muted hover:text-danger">
            Удалить товар
          </button>
          <span className="ml-3 text-[12px] text-muted">Чтобы скрыть временно — снимите «Показывать на сайте»</span>
        </form>
      )}
    </div>
  );
}
