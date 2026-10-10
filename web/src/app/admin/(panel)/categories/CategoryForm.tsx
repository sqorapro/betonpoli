"use client";

import { useActionState, useState } from "react";
import { saveCategory, type CategoryState } from "./actions";

type Props = {
  category: {
    id?: number; name: string; shortName: string; slug: string; parentId: number | null; sort: number;
    description: string; seoTitle: string; seoDescription: string;
  };
  parents: { id: number; label: string }[];
  allAttributes: { id: number; name: string; unit: string }[];
  selected: { attributeId: number; filterable: boolean }[];
  saved?: boolean;
};

export function CategoryForm({ category: c, parents, allAttributes, selected, saved }: Props) {
  const [state, action, pending] = useActionState<CategoryState, FormData>(saveCategory, {});
  const [attrs, setAttrs] = useState(selected);
  const available = allAttributes.filter((a) => !attrs.some((s) => s.attributeId === a.id));
  const nameOf = (id: number) => {
    const a = allAttributes.find((x) => x.id === id);
    return a ? `${a.name}${a.unit ? `, ${a.unit}` : ""}` : "?";
  };
  const move = (i: number, d: -1 | 1) => {
    const n = [...attrs];
    if (i + d < 0 || i + d >= n.length) return;
    [n[i], n[i + d]] = [n[i + d], n[i]];
    setAttrs(n);
  };

  return (
    <form action={action} className="flex max-w-[760px] flex-col gap-6">
      {c.id && <input type="hidden" name="id" value={c.id} />}
      <section className="adm-card">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="label">Название *<input name="name" defaultValue={c.name} required className="field" /></label>
          <label className="label">Короткое название для шапки<input name="shortName" defaultValue={c.shortName} className="field" /></label>
          <label className="label">
            Адрес (латиница)
            <input name="slug" defaultValue={c.slug} placeholder="заполнится из названия" className="field" />
          </label>
          <label className="label">
            Родительская категория
            <select name="parentId" defaultValue={c.parentId ?? ""} className="field">
              <option value="">— верхний уровень —</option>
              {parents.filter((p) => p.id !== c.id).map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
          <label className="label">Порядок<input name="sort" defaultValue={c.sort} inputMode="numeric" className="field w-24" /></label>
        </div>
        <label className="label">
          Описание
          <textarea name="description" defaultValue={c.description} rows={3} className="field h-auto py-2" />
        </label>
      </section>

      <section className="adm-card">
        <h2 className="adm-section">Характеристики товаров этой категории</h2>
        <p className="text-muted">Эти поля появятся в карточке товара в админке. Отмеченные «в фильтре» — в фильтрах каталога. Подкатегории наследуют набор.</p>
        {attrs.length > 0 && (
          <ul className="flex flex-col gap-1">
            {attrs.map((a, i) => (
              <li key={a.attributeId} className="flex items-center gap-4 border-b border-line py-1.5">
                <input type="hidden" name="attr" value={a.attributeId} />
                <span className="flex-1">{nameOf(a.attributeId)}</span>
                <label className="flex cursor-pointer items-center gap-1.5 text-muted">
                  <input type="checkbox" name={`filterable_${a.attributeId}`} defaultChecked={a.filterable} className="accent-ink" />
                  в фильтре
                </label>
                <button type="button" onClick={() => move(i, -1)} className="cursor-pointer text-muted hover:text-ink" aria-label="Выше">↑</button>
                <button type="button" onClick={() => move(i, 1)} className="cursor-pointer text-muted hover:text-ink" aria-label="Ниже">↓</button>
                <button type="button" onClick={() => setAttrs(attrs.filter((x) => x.attributeId !== a.attributeId))} className="cursor-pointer text-muted hover:text-danger">
                  убрать
                </button>
              </li>
            ))}
          </ul>
        )}
        {available.length > 0 && (
          <select
            value=""
            onChange={(e) => e.target.value && setAttrs([...attrs, { attributeId: Number(e.target.value), filterable: true }])}
            className="field w-72"
            aria-label="Добавить характеристику"
          >
            <option value="">+ добавить характеристику…</option>
            {available.map((a) => (
              <option key={a.id} value={a.id}>{a.name}{a.unit ? `, ${a.unit}` : ""}</option>
            ))}
          </select>
        )}
      </section>

      <section className="adm-card">
        <h2 className="adm-section">SEO</h2>
        <label className="label">Title<input name="seoTitle" defaultValue={c.seoTitle} placeholder="Пусто — по шаблону" className="field" /></label>
        <label className="label">
          Description
          <textarea name="seoDescription" defaultValue={c.seoDescription} rows={2} className="field h-auto py-2" />
        </label>
      </section>

      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Сохраняем…" : "Сохранить"}</button>
        {saved && !state.error && <span className="text-muted">Сохранено</span>}
        {state.error && <span className="text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
