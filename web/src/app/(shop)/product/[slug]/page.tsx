import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/product/Gallery";
import { ProductView } from "@/components/product/ProductView";
import { rateLabel, type ConsumptionType } from "@/lib/calc";
import { getSettings } from "@/lib/catalog";
import { BASE_PATH, UNIT_LABEL, formatPrice, imageUrl } from "@/lib/format";
import { getProduct, getProductKits, toPack } from "@/lib/product";
import { fillTemplate } from "@/lib/seo";

const STOCK_LABEL = { IN_STOCK: "В наличии", ON_ORDER: "Под заказ", OUT_OF_STOCK: "Нет в наличии" } as const;

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return {};
  const settings = await getSettings();
  const minPrice = p.packagings.length ? Math.min(...p.packagings.map((x) => Number(x.price))) : null;
  const vars = { name: p.name, sku: p.sku, short: p.shortDescription, price: minPrice ? formatPrice(minPrice) : "" };
  const title = p.seoTitle || fillTemplate(settings.seoProductTitle ?? "{name}", vars);
  const description = p.seoDescription || fillTemplate(settings.seoProductDescription ?? "", vars);
  const image = p.images[0] ? imageUrl(p.images[0].path, "lg") : undefined;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${BASE_PATH}/product/${slug}` },
    openGraph: { title, description, type: "website", images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  const [kits, settings] = await Promise.all([getProductKits(p.id), getSettings()]);

  const packs = p.packagings.map(toPack);
  const rule =
    p.consumptionType !== "NONE" && p.consumptionRate != null
      ? { type: p.consumptionType as ConsumptionType, rate: Number(p.consumptionRate) }
      : null;
  const unit = packs[0] ? UNIT_LABEL[packs[0].unit] : "кг";
  const phone = (settings.phone ?? "").replace(/[^\d+]/g, "");
  const askHref = settings.technologistUrl || (phone ? `tel:${phone}` : "/contacts");

  const specs: [string, string][] = [
    ["Артикул", p.sku],
    ["Наличие", STOCK_LABEL[p.stock]],
    ...p.attributeValues
      .filter((v) => v.valueText || v.valueNumber != null)
      .map((v): [string, string] => [
        v.attribute.name,
        `${v.valueNumber != null ? Number(v.valueNumber).toLocaleString("ru-RU") : v.valueText}${v.attribute.unit ? ` ${v.attribute.unit}` : ""}`,
      ]),
    ...(rule ? [["Расход", rateLabel(rule, unit)] as [string, string]] : []),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    description: p.description || p.shortDescription,
    image: p.images.map((i) => imageUrl(i.path, "lg")),
    offers: packs.length
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "RUB",
          lowPrice: Math.min(...packs.map((x) => x.price)),
          highPrice: Math.max(...packs.map((x) => x.price)),
          availability: p.stock === "OUT_OF_STOCK" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
        }
      : undefined,
  };

  const [lead, ...rest] = p.description.split(/\n{2,}/);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }} />
      <ProductView
        product={{ id: p.id, sku: p.sku, name: p.name, slug: p.slug, image: p.images[0] ?? null }}
        packs={packs}
        rule={rule}
        defaultThickness={p.defaultThickness == null ? null : Number(p.defaultThickness)}
        kits={kits}
        askHref={askHref}
        gallery={<Gallery key="gallery" images={p.images} alt={p.name} unit={packs[0]?.unit ?? "KG"} />}
        header={
          <div key="header" className="contents">
            {p.category && (
              <nav aria-label="Категория" className="text-muted">
                {p.category.parent && (
                  <span>
                    <Link href={`/catalog/${p.category.parent.slug}`}>{p.category.parent.name}</Link> /{" "}
                  </span>
                )}
                <Link href={`/catalog/${p.category.slug}`}>{p.category.name}</Link>
              </nav>
            )}
            <h1 className="flex flex-col gap-2.5">
              <span className="text-xl leading-tight font-semibold tracking-[0.02em]">{p.sku}</span>
              <span className="prose-plain">{p.name}</span>
            </h1>
            {lead && <p className="prose-plain text-muted">{lead}</p>}
          </div>
        }
        specs={
          <div key="specs" className="flex flex-col gap-6">
            <dl className="flex flex-col border-b border-line">
              {specs.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 border-t border-line py-3">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
            {rest.length > 0 && (
              <div className="prose-plain">
                {rest.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )}
          </div>
        }
      />
    </>
  );
}
