import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogControls } from "@/components/CatalogControls";
import { Pagination } from "@/components/Pagination";
import { ProductGrid } from "@/components/ProductGrid";
import { categoryTreeIds, getSettings, tileSelect } from "@/lib/catalog";
import { db } from "@/lib/db";
import { PAGE_SIZE, SORTS, activeFilterCount, filtersToWhere, getCategoryFilters, parsePage, parseSort } from "@/lib/filters";
import { BASE_PATH } from "@/lib/format";
import { fillTemplate } from "@/lib/seo";

async function getCategory(slug: string) {
  return db.category.findUnique({
    where: { slug },
    include: {
      parent: { select: { name: true, slug: true } },
      children: { orderBy: [{ sort: "asc" }, { id: "asc" }], select: { id: true, name: true, slug: true } },
    },
  });
}

export async function generateMetadata({ params }: PageProps<"/catalog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return {};
  const settings = await getSettings();
  const count = await db.product.count({ where: { isPublished: true, categoryId: { in: await categoryTreeIds(category.id) } } });
  const vars = { name: category.name, count };
  return {
    title: { absolute: category.seoTitle || fillTemplate(settings.seoCategoryTitle ?? "{name}", vars) },
    description: category.seoDescription || fillTemplate(settings.seoCategoryDescription ?? "", vars),
    alternates: { canonical: `${BASE_PATH}/catalog/${slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/catalog/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await getCategory(slug);
  if (!category) notFound();

  const base = { isPublished: true, categoryId: { in: await categoryTreeIds(category.id) } };
  const filters = await getCategoryFilters(category.id, base);
  const where = { AND: [base, ...filtersToWhere(filters, sp)] };
  const sort = parseSort(sp.sort);
  const page = parsePage(sp.page);

  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, orderBy: SORTS[sort].orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: tileSelect }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > pages) notFound();

  return (
    <div className="flex flex-col gap-8 px-4 pt-8 md:px-8 md:pt-12">
      <div className="flex flex-col gap-3">
        {category.parent && (
          <Link href={`/catalog/${category.parent.slug}`} className="text-muted">
            {category.parent.name}
          </Link>
        )}
        <h1 className="text-lg font-semibold">
          {category.name} <span className="font-normal text-muted">{total}</span>
        </h1>
        {category.children.length > 0 && (
          <nav aria-label="Подкатегории" className="flex flex-wrap gap-x-5 gap-y-2">
            {category.children.map((c) => (
              <Link key={c.id} href={`/catalog/${c.slug}`} className="text-muted hover:text-ink">
                {c.name}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <Suspense>
        <CatalogControls
          filters={filters}
          sorts={Object.entries(SORTS).map(([key, s]) => ({ key, label: s.label }))}
          sort={sort}
          activeCount={activeFilterCount(filters, sp)}
        />
      </Suspense>

      {products.length ? (
        <ProductGrid products={products} />
      ) : (
        <p className="py-24 text-center text-muted">Ничего не найдено. Попробуйте изменить фильтры.</p>
      )}

      <Pagination page={page} pages={pages} basePath={`/catalog/${slug}`} params={sp} />
    </div>
  );
}
