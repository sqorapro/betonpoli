// Импорт каталога prompol.com (prisma/seed-data/prompol.json) — добавляет товары, ничего не удаляет.
// Цены не переносим (решение заказчика 08.10.2026): у фасовок цена 0 — заказчик выставляет в админке.
// npx tsx prisma/import-prompol.ts [--dry] [--no-images]
// Повторный запуск безопасен: товары с уже существующим артикулом PP-xxx пропускаются.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { PackUnit } from "../src/generated/prisma/enums";
import { writeImageSizes } from "../src/lib/image-process";
import { slugify } from "../src/lib/slug";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const DRY = process.argv.includes("--dry");
const NO_IMAGES = process.argv.includes("--no-images");

type Item = {
  title: string; url: string; brand: string; price: number | null; path: string[];
  intro: string; description: string; specs: [string, string][]; images: string[];
};

// Новые подкатегории (родитель уже есть в сиде)
const NEW_CATEGORIES = [
  { name: "Комплектующие для оборудования", slug: "komplektuyushchie-oborudovaniya", parent: "oborudovanie" },
  { name: "Резчики швов", slug: "rezchiki-shvov", parent: "oborudovanie" },
  { name: "Комплектующие для пылесосов", slug: "komplektuyushchie-pylesosov", parent: "rashodnye-materialy" },
  { name: "Рабочие блоки для бучардирования", slug: "rabochie-bloki-buchardirovanie", parent: "rashodnye-materialy" },
  { name: "Лопасти для затирочных машин", slug: "lopasti", parent: "rashodnye-materialy" },
  { name: "Фибра и уход за бетоном", slug: "fibra-i-uhod", parent: "suhie-smesi" },
];

/** Категория prompol → slug нашей категории */
function categoryFor(path: string[], title: string): string {
  const t = title.toLowerCase();
  if (/герметик|заполнитель швов/.test(t)) return "germetiki";
  if (/топпинг/.test(t)) return "toppingi";
  const p = path.join(" > ").toLowerCase();
  const rules: [RegExp, string][] = [
    [/алмазные франкфурты/, "frankfurty"],
    [/пады/, "pady"],
    [/лопасти/, "lopasti"],
    [/затирочные диски/, "diski"],
    [/комплектующие для шлифмашин/, "komplektuyushchie-oborudovaniya"],
    [/шлифовальные машины по бетону/, "shlifovalnye-mashiny"],
    [/затирочные машины/, "zatirochnye-mashiny"],
    [/кассетные мешки|переходники|трубы-штанги|турбины|фильтры|шланги|щётки|щетки/, "komplektuyushchie-pylesosov"],
    [/пылесос/, "promyshlennye-pylesosy"],
    [/ежи|бучардирован/, "rabochie-bloki-buchardirovanie"],
    [/резчики швов/, "rezchiki-shvov"],
    [/сопутствующее оборудование/, "komplektuyushchie-oborudovaniya"],
    [/топпинги/, "toppingi"],
    [/ремонтные составы/, "remontnye-smesi"],
    [/стяжки/, "suhie-smesi"],
    [/уходу|фибра/, "fibra-i-uhod"],
    [/декоративные покрытия/, "dekorativnye-smesi"],
    [/готовые решения/, "gotovye-sistemy-pola"],
    [/полиуретановые лаки/, "laki"],
    [/полиуретановый грунт/, "poliuretanovye"],
    [/эпоксидн.* грунт|эпоксидные/, "epoksidnye"],
    [/грунтовочные/, "polimery"],
    [/химстойкие/, "himstoykie"],
    [/полиуретановые краски/, "poliuretanovye"],
    [/краски/, "polimery"],
  ];
  return rules.find(([re]) => re.test(p))?.[1] ?? "prochee";
}

const norm = (s: string) => s.toLowerCase().replace(/[®™«»"'\s]/g, "");

/** Артикул-подобные коды из названия: EP-C251, AC-W100 Pro, LN 670… */
function codesOf(s: string): string[] {
  const t = s.toUpperCase().replace(/[СРАЕТОНКМВХ]/g, (c) => ({ С: "C", Р: "P", А: "A", Е: "E", Т: "T", О: "O", Н: "H", К: "K", М: "M", В: "B", Х: "X" })[c]!);
  return [...t.matchAll(/\b([A-Z]{2}-[A-Z]\d{3}(?: ?(?:AS|SL|PRO))?)\b/g)].map((m) => m[1].replace(/\s+/g, ""));
}

/** Модель Linolit по номеру + тип техники: «пылесос Linolit® 5311» == «Строительный промышленный пылесос Linolit® 5311» */
function machineKey(s: string): string | null {
  const t = s.toLowerCase();
  if (/турбин|фильтр|шланг|мешок|мешк|переходник|циклон|щетк|штанг|диск|лопаст|кожух|тележк|телега/.test(t)) return null;
  const num = t.match(/linolit®?\s*(?:cybervac®?\s*)?(\d{3,4})(?![\d.\-])/)?.[1];
  const kind = /пылесос|пылеводосос/.test(t) ? "v" : /шлифов|полиров/.test(t) ? "m" : /затирочн.*машин|машин.*затирочн/.test(t) ? "z" : null;
  return num && kind ? `${kind}${num}` : null;
}

/** Франкфурт «Коготь» PCD4: сторона left/right */
function pcdKey(s: string): string | null {
  const t = s.toLowerCase();
  if (!/франкфурт/.test(t) || !t.includes("pcd4")) return null;
  return /left|лев/.test(t) ? "pcd-l" : /right|прав/.test(t) ? "pcd-r" : null;
}

/** Фасовка из характеристик («Упаковка: 25 кг»), иначе 1 шт */
function packFor(specs: [string, string][]): { amount: number; unit: PackUnit } {
  const v = specs.find(([k]) => /^упаковка$/i.test(k))?.[1] ?? "";
  const m = v.match(/([\d.,]+)\s*(кг|л|шт|м)\b/i);
  if (!m) return { amount: 1, unit: "PCS" };
  const unit: PackUnit = /кг/i.test(m[2]) ? "KG" : /л/i.test(m[2]) ? "L" : /м/i.test(m[2]) && !/шт/i.test(m[2]) ? "M" : "PCS";
  return { amount: Number(m[1].replace(",", ".")), unit };
}

function cleanText(s: string): string {
  return s
    .replace(/\r/g, "")
    .split("\n")
    .filter((l) => !/цена указана/i.test(l))
    .join("\n")
    .replace(/\*\*/g, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function shortOf(it: Item): string {
  const base = cleanText(it.intro || it.description).split("\n")[0];
  if (base.length <= 100) return base;
  const cut = base.slice(0, 100);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:—–-]+$/, "") + "…";
}

async function download(url: string): Promise<Buffer | null> {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (r.ok) return Buffer.from(await r.arrayBuffer());
    } catch { /* повтор */ }
    await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
  }
  return null;
}

async function main() {
  const items: Item[] = JSON.parse(readFileSync(join(__dirname, "seed-data", "prompol.json"), "utf-8"));

  // категории
  const cats = new Map((await db.category.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]));
  for (const [i, c] of NEW_CATEGORIES.entries()) {
    if (cats.has(c.slug)) continue;
    const parentId = cats.get(c.parent);
    if (!parentId) throw new Error(`нет родительской категории ${c.parent} — сначала сид`);
    if (DRY) { cats.set(c.slug, -1); continue; }
    cats.set(c.slug, (await db.category.create({ data: { name: c.name, slug: c.slug, parentId, sort: 100 + i } })).id);
  }
  if (!cats.has("prochee")) cats.set("prochee", (await db.category.create({ data: { name: "Прочее", shortName: "Прочее", slug: "prochee" } })).id);

  // дубли с товарами из Excel заказчика
  const existing = await db.product.findMany({ select: { sku: true, name: true, slug: true } });
  const existingNames = new Set(existing.map((e) => norm(e.name)));
  const existingCodes = new Set(existing.flatMap((e) => [...codesOf(e.sku), ...codesOf(e.name)]));
  const existingKeys = new Set(existing.flatMap((e) => [machineKey(e.name), pcdKey(e.name)]).filter(Boolean));
  const existingSkus = new Set(existing.map((e) => e.sku));
  const usedSlugs = new Set(existing.map((e) => e.slug));

  const uploadDir = resolve(process.env.UPLOAD_DIR ?? "./uploads");
  let created = 0, skippedDup = 0, skippedDone = 0, imgOk = 0, imgFail = 0;
  const dupLog: string[] = [];

  for (const [i, it] of items.entries()) {
    const sku = `PP-${String(i + 1).padStart(3, "0")}`;
    if (existingSkus.has(sku)) { skippedDone++; continue; }

    const codes = codesOf(it.title);
    const nt = norm(it.title);
    const keys = [machineKey(it.title), pcdKey(it.title)].filter(Boolean);
    if (
      existingNames.has(nt) || codes.some((c) => existingCodes.has(c)) || keys.some((k) => existingKeys.has(k)) ||
      [...existingNames].some((n) => n.length >= 12 && nt.includes(n))
    ) {
      skippedDup++; dupLog.push(`${sku} ${it.title}`);
      continue;
    }

    const name = it.title.replace(/\s{2,}/g, " ");
    let slug = slugify(name) || slugify(sku);
    if (usedSlugs.has(slug)) slug = `${slug}-${sku.toLowerCase()}`;
    usedSlugs.add(slug);

    const specsText = it.specs.length ? "Характеристики\n" + it.specs.map(([k, v]) => `${k}: ${v}`).join("\n") : "";
    const description = [cleanText(it.description), specsText].filter(Boolean).join("\n\n");
    const slugCat = categoryFor(it.path, it.title);
    const pack = packFor(it.specs);

    if (DRY) { created++; console.log(`${sku} [${slugCat}] ${name}`); continue; }

    const product = await db.product.create({
      data: {
        sku, name, slug, sort: 1000 + i, priceFrom: 0,
        shortDescription: shortOf(it), description,
        categoryId: cats.get(slugCat),
        packagings: { create: [{ amount: pack.amount, unit: pack.unit, price: 0 }] },
      },
    });
    created++;

    if (NO_IMAGES) continue;
    for (const [j, url] of it.images.slice(0, 5).entries()) {
      const buf = await download(url);
      if (!buf) { imgFail++; console.warn(`фото не скачалось: ${sku} ${url}`); continue; }
      try {
        const rel = `products/${product.id}/${randomUUID()}`;
        await writeImageSizes(buf, join(uploadDir, rel));
        await db.productImage.create({ data: { productId: product.id, path: rel, alt: name, sort: j } });
        imgOk++;
      } catch (e) {
        imgFail++; console.warn(`фото не обработалось: ${sku} ${url}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  console.log(`создано: ${created}, дубли с Excel: ${skippedDup}, уже были: ${skippedDone}, фото: ${imgOk} (ошибок ${imgFail})`);
  if (dupLog.length) console.log("пропущены как дубли:\n" + dupLog.join("\n"));
}

main().finally(() => db.$disconnect());
