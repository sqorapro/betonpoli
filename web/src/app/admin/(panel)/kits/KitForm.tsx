"use client";

import { useActionState, useState } from "react";
import { CONSUMPTION } from "@/lib/admin-labels";
import { calcKit, formatPrice } from "@/lib/calc";
import { saveKit, type KitState } from "./actions";

type ProductOpt = { id: number; label: string; packs: { id: number; label: string; amount: number; price: number }[] };
type Item = { productId: number | null; packagingId: number | null; type: string; rate: string; role: string };

type Props = {
  kit: {
    id?: number; name: string; slug: string; description: string; isPublished: boolean; usesLength: boolean;
    defaultArea: string; defaultThickness: string; sort: number; items: Item[];
  };
  products: ProductOpt[];
  saved?: boolean;
};

const ITEM_TYPES = Object.entries(CONSUMPTION).filter(([k]) => k !== "NONE");
const emptyItem = (): Item => ({ productId: null, packagingId: null, type: "PER_AREA", rate: "", role: "" });
const num = (s: string) => Number(s.replace(",", ".")) || 0;

export function KitForm({ kit, products, saved }: Props) {
  const [state, action, pending] = useActionState<KitState, FormData>(saveKit, {});
  const [items, setItems] = useState<Item[]>(kit.items.length ? kit.items : [emptyItem(), emptyItem()]);
  const [area, setArea] = useState(kit.defaultArea);
  const [thickness, setThickness] = useState(kit.defaultThickness || "5");
  const update = (i: number, patch: Partial<Item>) => setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const byId = new Map(products.map((p) => [p.id, p]));

  // Предпросмотр расчёта прямо в форме
  const lines = items.flatMap((it, i) => {
    const p = it.productId ? byId.get(it.productId) : null;
    const pack = p?.packs.find((x) => x.id === it.packagingId) ?? p?.packs[0];
    if (!p || !pack || !(num(it.rate) > 0)) return [];
    return [{ key: String(i), rule: { type: it.type as "PER_AREA", rate: num(it.rate) }, packAmount: pack.amount, packPrice: pack.price }];
  });
  const preview = calcKit(lines, { area: num(area), thickness: num(thickness) });
  const packsOf = new Map(preview.items.map((r) => [r.key, r.packs]));
  const usesThickness = items.some((i) => i.type === "PER_AREA_MM");

  return (
    <form action={action} className="flex max-w-[1100px] flex-col gap-6">
      {kit.id && <input type="hidden" name="id" value={kit.id} />}
      <section className="adm-card">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="label">Название *<input name="name" defaultValue={kit.name} required className="field" /></label>
          <label className="label">Адрес (латиница)<input name="slug" defaultValue={kit.slug} placeholder="заполнится из названия" className="field" /></label>
        </div>
        <label className="label">
          Описание
          <textarea name="description" defaultValue={kit.description} rows={2} className="field h-auto py-2" />
        </label>
        <div className="flex flex-wrap items-end gap-6">
          <label className="label">
            Площадь по умолчанию
            <input name="defaultArea" value={area} onChange={(e) => setArea(e.target.value)} className="field w-28" />
          </label>
          {usesThickness && (
            <label className="label">
              Толщина по умолчанию, мм
              <input name="defaultThickness" value={thickness} onChange={(e) => setThickness(e.target.value)} className="field w-28" />
            </label>
          )}
          <label className="label">Порядок<input name="sort" defaultValue={kit.sort} className="field w-20" /></label>
          <label className="flex h-11 cursor-pointer items-center gap-2">
            <input type="checkbox" name="usesLength" defaultChecked={kit.usesLength} className="accent-ink" /> ввод в погонных метрах
          </label>
          <label className="flex h-11 cursor-pointer items-center gap-2">
            <input type="checkbox" name="isPublished" defaultChecked={kit.isPublished} className="accent-ink" /> показывать на сайте
          </label>
        </div>
      </section>

      <section className="adm-card">
        <h2 className="adm-section">Состав (слои пирога по порядку)</h2>
        <div className="overflow-x-auto">
          <table className="adm-table min-w-[900px]">
            <thead>
              <tr>
                <th>Товар</th><th>Фасовка</th><th>Как считать</th><th>Расход</th><th>Подпись</th><th className="text-right">Упак.</th><th />
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const p = it.productId ? byId.get(it.productId) : null;
                return (
                  <tr key={i}>
                    <td>
                      <select name="item_product" value={it.productId ?? ""} onChange={(e) => update(i, { productId: Number(e.target.value) || null, packagingId: null })} className="field h-9 w-72">
                        <option value="">— товар —</option>
                        {products.map((o) => (
                          <option key={o.id} value={o.id}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select name="item_pack" value={it.packagingId ?? ""} onChange={(e) => update(i, { packagingId: Number(e.target.value) || null })} className="field h-9 w-28">
                        <option value="">крупная</option>
                        {p?.packs.map((x) => (
                          <option key={x.id} value={x.id}>{x.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select name="item_type" value={it.type} onChange={(e) => update(i, { type: e.target.value })} className="field h-9 w-56">
                        {ITEM_TYPES.map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </td>
                    <td><input name="item_rate" value={it.rate} onChange={(e) => update(i, { rate: e.target.value })} inputMode="decimal" className="field h-9 w-20" /></td>
                    <td><input name="item_role" value={it.role} onChange={(e) => update(i, { role: e.target.value })} placeholder="грунт" className="field h-9 w-28" /></td>
                    <td className="text-right">{packsOf.get(String(i)) ?? "—"}</td>
                    <td>
                      <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="cursor-pointer text-muted hover:text-danger" aria-label="Удалить строку">✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button type="button" onClick={() => setItems([...items, emptyItem()])} className="text-muted underline underline-offset-2 hover:text-ink">
            + добавить позицию
          </button>
          <span>
            На {area || 0} {usesThickness && `× ${thickness} мм`}: <b>{formatPrice(preview.total)}</b>
          </span>
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Сохраняем…" : "Сохранить"}</button>
        {saved && !state.error && <span className="text-muted">Сохранено</span>}
        {state.error && <span className="text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
