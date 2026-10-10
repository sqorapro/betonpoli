"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { FilterDef } from "@/lib/filters";

type Props = {
  filters: FilterDef[];
  sorts: { key: string; label: string }[];
  sort: string;
  activeCount: number;
};

/** Сортировка + панель фильтров. Форма GET — работает и без JS. */
export function CatalogControls({ filters, sorts, sort, activeCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(activeCount > 0);

  const submit = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const qs = new URLSearchParams();
    for (const [k, v] of data) if (typeof v === "string" && v.trim() !== "" && !(k === "sort" && v === "default")) qs.append(k, v.trim());
    router.push(qs.size ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <form
      method="get"
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      onChange={(e) => {
        // чекбоксы и сортировка применяются сразу, числа — по Enter / кнопке
        const t = e.target as unknown as HTMLInputElement;
        if (t.type === "checkbox" || t.tagName === "SELECT") submit(e.currentTarget);
      }}
      className="flex flex-col gap-6"
    >
      <div className="flex items-center justify-between gap-4">
        {filters.length > 0 ? (
          <button type="button" onClick={() => setOpen((v) => !v)} className="cursor-pointer" aria-expanded={open}>
            Фильтры{activeCount > 0 && ` · ${activeCount}`} {open ? "−" : "+"}
          </button>
        ) : (
          <span />
        )}
        <label className="flex items-center gap-2">
          <span className="sr-only">Сортировка</span>
          <select name="sort" defaultValue={sort} className="cursor-pointer appearance-none bg-transparent pr-1 text-right uppercase outline-none">
            {sorts.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <span aria-hidden>↓</span>
        </label>
      </div>

      {open && filters.length > 0 && (
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 border-t border-line pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {filters.map((f) => (
            <fieldset key={f.code} className="flex flex-col gap-2.5">
              <legend className="mb-2.5 text-muted">
                {f.name}
                {f.unit && `, ${f.unit}`}
              </legend>
              {f.kind === "options" ? (
                f.options.map((o) => (
                  <label key={o} className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      name={`f_${f.code}`}
                      value={o}
                      defaultChecked={params.getAll(`f_${f.code}`).includes(o)}
                      className="h-4 w-4 cursor-pointer accent-ink"
                    />
                    {o}
                  </label>
                ))
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    name={`f_${f.code}_min`}
                    inputMode="decimal"
                    placeholder={`от ${f.min.toLocaleString("ru-RU")}`}
                    defaultValue={params.get(`f_${f.code}_min`) ?? ""}
                    className="field h-9 w-0 flex-1 text-base"
                    aria-label={`${f.name} от`}
                  />
                  <input
                    name={`f_${f.code}_max`}
                    inputMode="decimal"
                    placeholder={`до ${f.max.toLocaleString("ru-RU")}`}
                    defaultValue={params.get(`f_${f.code}_max`) ?? ""}
                    className="field h-9 w-0 flex-1 text-base"
                    aria-label={`${f.name} до`}
                  />
                </div>
              )}
            </fieldset>
          ))}
          <div className="flex items-end gap-4 sm:col-span-2 lg:col-span-4">
            <button type="submit" className="btn h-9">
              Применить
            </button>
            {activeCount > 0 && (
              <button type="button" className="cursor-pointer text-muted hover:text-ink" onClick={() => router.push(pathname, { scroll: false })}>
                Сбросить
              </button>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
