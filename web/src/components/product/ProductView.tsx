"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ProductImage } from "@/components/ProductImage";
import { amountNeeded, calcKit, packsNeeded, rateLabel, type CalcRule } from "@/lib/calc";
import { addToCart } from "@/lib/cart";
import { UNIT_LABEL, formatNumber, formatPrice } from "@/lib/format";
import type { KitDTO, PackDTO } from "@/lib/product";

type Props = {
  product: { id: number; sku: string; name: string; slug: string; image: { path: string; alt: string } | null };
  header: ReactNode; // категория, код, название, описание — рендерит сервер
  gallery: ReactNode;
  specs: ReactNode;
  packs: PackDTO[];
  rule: CalcRule | null;
  defaultThickness: number | null;
  kits: KitDTO[];
  askHref: string;
};

const DEFAULT_AREA = 100;

const parse = (s: string) => {
  const n = Number(s.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function ProductView({ product, header, gallery, specs, packs, rule, defaultThickness, kits, askHref }: Props) {
  const [packId, setPackId] = useState(packs[0]?.id);
  const pack = packs.find((p) => p.id === packId) ?? packs[0];
  const kit0 = kits[0];

  const usesThickness = rule?.type === "PER_AREA_MM" || !!kit0?.usesThickness;
  const usesLength = rule?.type === "PER_LENGTH" || !!kit0?.usesLength;
  const [area, setArea] = useState(String(DEFAULT_AREA));
  const [thickness, setThickness] = useState(String(defaultThickness ?? kit0?.defaultThickness ?? 2));
  const input = { area: parse(area), thickness: parse(thickness) };

  const showCalc = !!rule && rule.type !== "NONE" && !!pack;
  const calcPacks = showCalc ? packsNeeded(rule, input, pack.amount) : 0;
  const [manualQty, setManualQty] = useState<number | null>(null);
  const qty = manualQty ?? (showCalc && calcPacks > 0 ? calcPacks : 1);

  const [added, setAdded] = useState<string | null>(null);
  const flash = (msg: string) => {
    setAdded(msg);
    setTimeout(() => setAdded(null), 2500);
  };

  const add = () => {
    if (!pack) return;
    addToCart([{ packagingId: pack.id, productId: product.id, sku: product.sku, name: product.name, slug: product.slug, packLabel: pack.label, price: pack.price, qty, image: product.image?.path }]);
    flash(`Добавлено: ${qty} шт`);
  };

  const areaLabel = usesLength ? "Длина, м.п." : "Площадь, м²";
  const unit = pack ? UNIT_LABEL[pack.unit] : "кг";

  return (
    <>
      <section className="grid grid-cols-1 gap-8 px-4 pt-6 md:px-8 md:pt-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)] lg:gap-12 xl:grid-cols-[minmax(0,820px)_minmax(400px,1fr)] xl:gap-20">
        {gallery}

        <div className="flex flex-col gap-8 lg:pt-2">
          <div className="flex flex-col gap-2.5">
            {header}
            {pack && (
              <p className="flex items-baseline gap-3">
                <span className="text-lg font-semibold">{formatPrice(pack.price)}</span>
                {pack.price > 0 && pack.unit !== "PCS" && pack.amount !== 1 && (
                  <span className="text-muted">
                    {formatPrice(pack.price / pack.amount)}/{unit}
                  </span>
                )}
              </p>
            )}
          </div>

          {packs.length > 1 && (
            <div className="flex flex-col gap-2.5">
              <span className="text-muted">Фасовка</span>
              <div className="flex flex-wrap gap-2">
                {packs.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={p.id === pack?.id}
                    onClick={() => {
                      setPackId(p.id);
                      setManualQty(null);
                    }}
                    className={`h-11 cursor-pointer border px-5 ${p.id === pack?.id ? "border-ink bg-ink text-paper" : "border-line-strong bg-paper hover:border-ink"}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showCalc && (
            <div className="flex flex-col gap-3.5 bg-tile p-5 md:p-6">
              <span className="font-semibold">Сколько нужно</span>
              <div className={`grid gap-3 ${usesThickness ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
                <NumberField label={areaLabel} value={area} onChange={(v) => { setArea(v); setManualQty(null); }} />
                {usesThickness && (
                  <NumberField label="Толщина, мм" value={thickness} onChange={(v) => { setThickness(v); setManualQty(null); }} />
                )}
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-line-strong pt-3.5">
                <span className="text-muted">Расход ~{rateLabel(rule, unit)}</span>
                <span className="text-md font-semibold" aria-live="polite">
                  {calcPacks > 0
                    ? `${calcPacks} уп. · ${formatNumber(calcPacks * pack.amount)} ${unit}`
                    : "—"}
                </span>
              </div>
              {calcPacks > 0 && (
                <span className="text-muted">
                  Нужно {formatNumber(amountNeeded(rule, input), 1)} {unit}, округлено до целых упаковок
                </span>
              )}
            </div>
          )}

          {pack && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <QtyStepper value={qty} onChange={(v) => setManualQty(v)} />
                <button type="button" onClick={add} className="btn btn-primary h-[52px] flex-1">
                  В корзину · {qty} шт
                </button>
                <a href={askHref} className="btn h-[52px] w-full sm:w-auto">
                  Спросить технолога
                </a>
              </div>
              <p className="h-5 text-muted" aria-live="polite">
                {added && (
                  <>
                    {added} — <Link href="/cart" className="text-ink underline underline-offset-4">в корзину</Link>
                  </>
                )}
              </p>
            </div>
          )}

          {specs}
        </div>
      </section>

      {kits.length > 0 && (
        <KitSection kits={kits} currentProductId={product.id} input={input} usesLength={usesLength} onAdded={flash} />
      )}
    </>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="label">
      {label}
      <input className="field" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))} />
    </label>
  );
}

function QtyStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex h-[52px] items-center border border-line-strong">
      <button type="button" aria-label="Меньше" onClick={() => onChange(Math.max(1, value - 1))} className="h-full w-10 cursor-pointer">
        −
      </button>
      <input
        aria-label="Количество"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Math.max(1, Math.min(9999, Number(e.target.value.replace(/\D/g, "")) || 1)))}
        className="w-12 bg-transparent text-center outline-none"
      />
      <button type="button" aria-label="Больше" onClick={() => onChange(Math.min(9999, value + 1))} className="h-full w-10 cursor-pointer">
        +
      </button>
    </div>
  );
}

function KitSection({
  kits, currentProductId, input, usesLength, onAdded,
}: {
  kits: KitDTO[];
  currentProductId: number;
  input: { area: number; thickness: number };
  usesLength: boolean;
  onAdded: (msg: string) => void;
}) {
  const [kitId, setKitId] = useState(kits[0].id);
  const kit = kits.find((k) => k.id === kitId) ?? kits[0];
  const result = calcKit(
    kit.items.map((it) => ({ key: String(it.id), rule: it.rule, packAmount: it.pack.amount, packPrice: it.pack.price })),
    input,
  );
  const packsById = new Map(result.items.map((r) => [r.key, r.packs]));
  const amountLabel = `${formatNumber(input.area)} ${usesLength || kit.usesLength ? "м.п." : "м²"}`;

  const addAll = () => {
    const lines = kit.items
      .map((it) => ({ it, qty: packsById.get(String(it.id)) ?? 0 }))
      .filter((x) => x.qty > 0)
      .map(({ it, qty }) => ({
        packagingId: it.pack.id, productId: it.product.id, sku: it.product.sku, name: it.product.name, slug: it.product.slug,
        packLabel: it.pack.label, price: it.pack.price, qty, image: it.product.image?.path,
      }));
    addToCart(lines);
    onAdded(`Добавлен комплект «${kit.name}»`);
  };

  return (
    <section className="flex flex-col gap-6 px-4 pt-20 md:px-8" aria-labelledby="kit-title">
      <div className="flex flex-col gap-4 md:flex-row md:items-baseline md:justify-between">
        <div className="flex flex-col gap-2">
          <h2 id="kit-title" className="font-semibold">
            Весь пирог пола на {amountLabel}
          </h2>
          {kits.length > 1 ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {kits.map((k) => (
                <button key={k.id} type="button" onClick={() => setKitId(k.id)} className={`cursor-pointer ${k.id === kit.id ? "text-ink" : "text-muted hover:text-ink"}`} aria-pressed={k.id === kit.id}>
                  {k.name}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-muted">{kit.name}</span>
          )}
        </div>
        <button type="button" onClick={addAll} disabled={result.total <= 0} className="btn btn-accent">
          Добавить всё · {formatPrice(result.total)}
        </button>
      </div>
      <ul className="grid grid-cols-2 gap-6 xs:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {kit.items.map((it) => {
          const n = packsById.get(String(it.id)) ?? 0;
          const current = it.product.id === currentProductId;
          return (
            <li key={it.id} className={current ? "outline outline-1 outline-offset-[6px] outline-ink" : ""}>
              <Link href={`/product/${it.product.slug}`} className="flex flex-col gap-3">
                <ProductImage image={it.product.image} alt={it.product.name} unit={it.pack.unit} size="sm" />
                <span className="text-center">
                  <span className="font-semibold">{it.product.sku}</span>{" "}
                  <span className="text-muted">
                    · {n} × {it.pack.label}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
