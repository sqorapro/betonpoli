"use client";

import { useActionState, useState } from "react";
import { CONSUMPTION, PACK_UNIT, STOCK } from "@/lib/admin-labels";
import { imageUrl } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { saveProduct, type FormState } from "./actions";

type Attr = { id: number; name: string; unit: string; type: "NUMBER" | "SELECT" | "TEXT" };

export type ProductFormData = {
  id?: number;
  name: string;
  sku: string;
  slug: string;
  categoryId: number | null;
  stock: keyof typeof STOCK;
  isPublished: boolean;
  sort: number;
  shortDescription: string;
  description: string;
  consumptionType: keyof typeof CONSUMPTION;
  consumptionRate: string;
  defaultThickness: string;
  seoTitle: string;
  seoDescription: string;
  packagings: { id?: number; amount: string; unit: keyof typeof PACK_UNIT; price: string }[];
  images: { id: number; path: string }[];
  attributeValues: Record<number, string>;
};

type Props = {
  product: ProductFormData;
  categories: { id: number; label: string }[];
  attributesByCategory: Record<number, Attr[]>;
  saved?: boolean;
};

export function ProductForm({ product, categories, attributesByCategory, saved }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProduct, saved ? { ok: true } : {});
  const fe = state.fieldErrors ?? {};

  const [name, setName] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [slugTouched, setSlugTouched] = useState(!!product.id);
  const [categoryId, setCategoryId] = useState(product.categoryId);
  const [consumption, setConsumption] = useState(product.consumptionType);
  const [packs, setPacks] = useState(product.packagings.length ? product.packagings : [{ amount: "", unit: "KG" as const, price: "" }]);
  const [images, setImages] = useState(product.images);
  const [removed, setRemoved] = useState<number[]>([]);

  const attrs = categoryId ? (attributesByCategory[categoryId] ?? []) : [];

  const moveImage = (i: number, dir: -1 | 1) => {
    const next = [...images];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setImages(next);
  };

  return (
    <form action={action} className="flex max-w-[960px] flex-col gap-6">
      {product.id && <input type="hidden" name="id" value={product.id} />}

      <section className="adm-card">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
          <Text label="Название *" name="name" value={name} onChange={(v) => {
            setName(v);
            if (!slugTouched) setSlug(slugify(v));
          }} error={fe.name} />
          <Text label="Артикул (код на сайте) *" name="sku" defaultValue={product.sku} error={fe.sku} />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
          <Text label="Адрес страницы (латиница)" name="slug" value={slug} onChange={(v) => {
            setSlug(v);
            setSlugTouched(true);
          }} error={fe.slug} hint={`/product/${slug || "…"}`} />
          <label className="label">
            Категория
            <select name="categoryId" value={categoryId ?? ""} onChange={(e) => setCategoryId(Number(e.target.value) || null)} className="field">
              <option value="">— без категории —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
        </div>
        <Text label="Строка под фото (тип товара)" name="shortDescription" defaultValue={product.shortDescription} hint="Коротко: «Эпоксидный покровный состав». Фасовка добавится сама." />
        <label className="label">
          Описание
          <textarea name="description" defaultValue={product.description} rows={6} className="field h-auto py-2" />
          <span className="text-[12px]">Первый абзац — под названием, остальные — под характеристиками. Абзацы разделяйте пустой строкой.</span>
        </label>
        <div className="flex flex-wrap items-end gap-6">
          <label className="label">
            Наличие
            <select name="stock" defaultValue={product.stock} className="field w-48">
              {Object.entries(STOCK).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <Text label="Порядок" name="sort" defaultValue={String(product.sort)} className="w-24" />
          <label className="flex h-11 cursor-pointer items-center gap-2">
            <input type="checkbox" name="isPublished" defaultChecked={product.isPublished} className="h-4 w-4 accent-ink" />
            Показывать на сайте
          </label>
        </div>
      </section>

      <section className="adm-card">
        <h2 className="adm-section">Фасовки и цены</h2>
        <div className="flex flex-col gap-2">
          {packs.map((p, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="pack_id" value={p.id ?? ""} />
              <input name="pack_amount" defaultValue={p.amount} placeholder="25" inputMode="decimal" aria-label="Объём" className="field w-24" />
              <select name="pack_unit" defaultValue={p.unit} aria-label="Единица" className="field w-20">
                {Object.entries(PACK_UNIT).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <input name="pack_price" defaultValue={p.price} placeholder="Цена за упаковку, ₽" inputMode="decimal" aria-label="Цена" className="field w-48" />
              <span className="text-muted">₽ за упаковку</span>
              {packs.length > 1 && (
                <button type="button" className="cursor-pointer text-muted hover:text-danger" onClick={() => setPacks(packs.filter((_, j) => j !== i))}>
                  удалить
                </button>
              )}
            </div>
          ))}
        </div>
        {fe.packagings && <p className="text-danger">{fe.packagings}</p>}
        <button type="button" className="self-start text-muted underline underline-offset-2 hover:text-ink" onClick={() => setPacks([...packs, { amount: "", unit: "KG", price: "" }])}>
          + добавить фасовку
        </button>
      </section>

      <section className="adm-card">
        <h2 className="adm-section">Калькулятор расхода</h2>
        <div className="flex flex-wrap items-start gap-4">
          <label className="label">
            Как считать
            <select name="consumptionType" value={consumption} onChange={(e) => setConsumption(e.target.value as keyof typeof CONSUMPTION)} className="field w-80">
              {Object.entries(CONSUMPTION).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          {consumption !== "NONE" && (
            <Text label="Норма расхода" name="consumptionRate" defaultValue={product.consumptionRate} error={fe.consumptionRate} className="w-36" hint={consumption === "FIXED" ? "упаковок" : CONSUMPTION[consumption]} />
          )}
          {consumption === "PER_AREA_MM" && (
            <Text label="Толщина по умолчанию, мм" name="defaultThickness" defaultValue={product.defaultThickness} className="w-48" />
          )}
        </div>
      </section>

      {attrs.length > 0 && (
        <section className="adm-card">
          <h2 className="adm-section">Характеристики</h2>
          <div className="adm-grid">
            {attrs.map((a) => (
              <Text key={a.id} label={`${a.name}${a.unit ? `, ${a.unit}` : ""}`} name={`attr_${a.id}`} defaultValue={product.attributeValues[a.id] ?? ""} hint={a.type === "NUMBER" ? "число" : undefined} />
            ))}
          </div>
        </section>
      )}

      <section className="adm-card">
        <h2 className="adm-section">Фото</h2>
        {images.length > 0 && (
          <ul className="flex flex-wrap gap-3">
            {images.map((img, i) => {
              const isRemoved = removed.includes(img.id);
              return (
                <li key={img.id} className={`flex w-32 flex-col gap-1 ${isRemoved ? "opacity-30" : ""}`}>
                  <input type="hidden" name="image_order" value={img.id} />
                  {isRemoved && <input type="hidden" name="image_remove" value={img.id} />}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(img.path, "sm")} alt="" className="aspect-square w-full bg-tile object-contain" />
                  <div className="flex justify-between text-[12px] text-muted">
                    <button type="button" onClick={() => moveImage(i, -1)} className="cursor-pointer hover:text-ink" aria-label="Левее">←</button>
                    <button type="button" onClick={() => setRemoved(isRemoved ? removed.filter((x) => x !== img.id) : [...removed, img.id])} className="cursor-pointer hover:text-danger">
                      {isRemoved ? "вернуть" : "удалить"}
                    </button>
                    <button type="button" onClick={() => moveImage(i, 1)} className="cursor-pointer hover:text-ink" aria-label="Правее">→</button>
                  </div>
                  {i === 0 && <span className="text-[12px] text-muted">главное</span>}
                </li>
              );
            })}
          </ul>
        )}
        <label className="label">
          Добавить фото (JPG/PNG/WebP, белый фон)
          <input type="file" name="images" accept="image/*" multiple className="text-ink" />
        </label>
      </section>

      <section className="adm-card">
        <h2 className="adm-section">SEO</h2>
        <Text label="Title" name="seoTitle" defaultValue={product.seoTitle} hint="Пусто — по шаблону из настроек" />
        <label className="label">
          Description
          <textarea name="seoDescription" defaultValue={product.seoDescription} rows={2} className="field h-auto py-2" />
        </label>
      </section>

      <div className="sticky bottom-0 flex items-center gap-4 border-t border-line bg-paper py-4">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Сохраняем…" : "Сохранить"}
        </button>
        {state.ok && !pending && <span className="text-muted">Сохранено</span>}
        {state.error && <span className="text-danger">{state.error}</span>}
        {Object.keys(fe).length > 0 && <span className="text-danger">Проверьте поля формы</span>}
      </div>
    </form>
  );
}

function Text({
  label, name, error, hint, className = "", value, onChange, defaultValue,
}: {
  label: string; name: string; error?: string; hint?: string; className?: string;
  value?: string; onChange?: (v: string) => void; defaultValue?: string;
}) {
  return (
    <label className={`label ${className}`}>
      {label}
      <input
        name={name}
        {...(onChange ? { value, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value) } : { defaultValue })}
        aria-invalid={!!error}
        className={`field ${error ? "border-danger" : ""}`}
      />
      {error ? <span className="text-danger">{error}</span> : hint && <span className="text-[12px]">{hint}</span>}
    </label>
  );
}
