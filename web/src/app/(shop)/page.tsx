import { notFound } from "next/navigation";
import { Pagination } from "@/components/Pagination";
import { ProductGrid } from "@/components/ProductGrid";
import { tileSelect } from "@/lib/catalog";
import { db } from "@/lib/db";
import { PAGE_SIZE, parsePage } from "@/lib/filters";

// Главная — сразу каталог, без баннеров
export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const where = { isPublished: true };
  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: [{ category: { sort: "asc" } }, { sort: "asc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: tileSelect,
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > pages) notFound();

  return (
    <div className="px-4 pt-8 md:px-8 md:pt-[88px]">
      <h1 className="sr-only">Материалы и оборудование для промышленного пола</h1>
      <ProductGrid products={products} />
      <Pagination page={page} pages={pages} basePath="/" params={sp} />
    </div>
  );
}
