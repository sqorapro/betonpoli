import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import type { TileProduct } from "@/lib/catalog";
import { packLabel } from "@/lib/format";

/** Сетка как на макете: 6 колонок, квадратные плитки, код + одна строка под фото */
export function ProductGrid({ products, priorityCount = 6 }: { products: TileProduct[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 xs:grid-cols-3 md:grid-cols-4 md:gap-x-6 md:gap-y-14 xl:grid-cols-6">
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductTile product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

function ProductTile({ product: p, priority }: { product: TileProduct; priority: boolean }) {
  const pack = p.packagings[0];
  const line = [p.shortDescription, pack && packLabel(pack)].filter(Boolean).join(" · ");
  return (
    <Link href={`/product/${p.slug}`} className="group flex flex-col gap-3.5">
      <ProductImage image={p.images[0]} alt={p.name} unit={pack?.unit} size="md" priority={priority} />
      <span className="flex flex-col gap-1 text-center">
        <span className="font-semibold group-hover:text-muted">{p.sku}</span>
        <span className="line-clamp-2 text-muted xs:line-clamp-1">{line || p.name}</span>
      </span>
    </Link>
  );
}
