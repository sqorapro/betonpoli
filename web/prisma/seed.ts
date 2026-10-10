// Демо-данные из Excel заказчика: 20 примеров товаров + системы из калькуляторов.
// npx prisma db seed  (полностью пересоздаёт каталог и комплекты; заявки/админов не трогает)
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { ConsumptionType, PackUnit } from "../src/generated/prisma/enums";
import { writeImageSizes } from "../src/lib/image-process";
import { slugify } from "../src/lib/slug";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const dataDir = join(__dirname, "seed-data");

type ExampleProduct = {
  category: string; name: string; sku: string; unit: string; priceFrom: number | null;
  characteristics: string; description: string;
};
type RawItem = { name: string; pricePerUnit: number | null; type: string; rate: number | null; pack: number | null };
type RawKit = { sheet: string; title: string; usesLength: boolean; defaultArea: number | null; defaultThickness: number | null; items: RawItem[] };

const CATEGORIES = [
  { name: "Готовые системы пола", shortName: "Системы пола", slug: "gotovye-sistemy-pola" },
  { name: "Полимеры и сухие смеси", shortName: "Полимеры", slug: "polimery-i-suhie-smesi" },
  { name: "Оборудование", shortName: "Оборудование", slug: "oborudovanie" },
  { name: "Расходные материалы", shortName: "Расходники", slug: "rashodnye-materialy" },
  { name: "Прочее", shortName: "Прочее", slug: "prochee" },
];

// Подкатегории по структуре от заказчика (05.10.2026); списки у него с «…» — остальное добавят в админке
const SUBCATEGORIES: { name: string; slug: string; parent: string }[] = [
  { name: "Полимеры", slug: "polimery", parent: "polimery-i-suhie-smesi" },
  { name: "Сухие смеси", slug: "suhie-smesi", parent: "polimery-i-suhie-smesi" },
  { name: "Эпоксидные материалы", slug: "epoksidnye", parent: "polimery" },
  { name: "Полиуретановые материалы", slug: "poliuretanovye", parent: "polimery" },
  { name: "Химстойкие материалы", slug: "himstoykie", parent: "polimery" },
  { name: "Лаки", slug: "laki", parent: "polimery" },
  { name: "Герметики", slug: "germetiki", parent: "polimery" },
  { name: "Топпинги", slug: "toppingi", parent: "suhie-smesi" },
  { name: "Ремонтные смеси", slug: "remontnye-smesi", parent: "suhie-smesi" },
  { name: "Декоративные смеси", slug: "dekorativnye-smesi", parent: "suhie-smesi" },
  { name: "Промышленные пылесосы", slug: "promyshlennye-pylesosy", parent: "oborudovanie" },
  { name: "Шлифовальные машины", slug: "shlifovalnye-mashiny", parent: "oborudovanie" },
  { name: "Затирочные машины", slug: "zatirochnye-mashiny", parent: "oborudovanie" },
  { name: "Пады", slug: "pady", parent: "rashodnye-materialy" },
  { name: "Франкфурты", slug: "frankfurty", parent: "rashodnye-materialy" },
  { name: "Диски", slug: "diski", parent: "rashodnye-materialy" },
];

/** Раскладка по подкатегориям по названию; top — раздел верхнего уровня */
function subcategoryFor(name: string, sku: string, top: string): string {
  const n = name.toLowerCase();
  if (top === "oborudovanie") {
    if (n.includes("пылесос")) return "promyshlennye-pylesosy";
    if (n.includes("шлифов")) return "shlifovalnye-mashiny";
    if (n.includes("затирочн")) return "zatirochnye-mashiny";
  }
  if (top === "rashodnye-materialy") {
    if (n.includes("франкфурт")) return "frankfurty";
    if (n.includes(" пад ")) return "pady";
    if (n.includes("диск")) return "diski";
  }
  if (top !== "polimery-i-suhie-smesi") return top;
  if (n.includes("лак")) return "laki";
  if (n.includes("герметик")) return "germetiki";
  if (n.includes("топпинг")) return "toppingi";
  if (/microterrazzo|microbeton/i.test(name)) return "dekorativnye-smesi";
  if (n.includes("ремонтн")) return "remontnye-smesi";
  if (/химстойк|lincrete|^up-/i.test(n) || /^UP-/.test(sku)) return "himstoykie";
  if (n.includes("эпоксид") || /^EP-/.test(sku)) return "epoksidnye";
  if (n.includes("полиуретан") || /^PU-/.test(sku)) return "poliuretanovye";
  if (/сухая смесь|стяжк|screed/i.test(name)) return "suhie-smesi";
  return "polimery";
}

// Кириллица, похожая на латиницу, встречается в артикулах (EP-С150)
const LOOKALIKE: Record<string, string> = { С: "C", Р: "P", А: "A", Е: "E", Т: "T", О: "O", Н: "H", К: "K", М: "M", В: "B", Х: "X" };
const normSku = (s: string) => s.replace(/[СРАЕТОНКМВХ]/g, (c) => LOOKALIKE[c]).replace(/\s+/g, " ").trim().toUpperCase();

function skuFromName(name: string): string | null {
  const m = normSku(name).match(/\b([A-Z]{2}-[A-Z]\d{3}(?: ?(?:AS|SL|PRO))?)\b/);
  return m ? m[1].replace(/ /g, " ") : null;
}

/** «Грунтовочный состав Praspan EP-P150» без RAL и хвостов — имя товара для каталога */
function cleanName(name: string): string {
  return name.replace(/\s+RAL\s*\d+/i, "").replace(/\s+СР\b/, "").replace(/\s{2,}/g, " ").trim();
}

function unitFor(name: string): PackUnit {
  if (/лента|стеклоткань|шнур/i.test(name)) return "M";
  return "KG";
}

function categoryFor(name: string): string {
  if (/песок|лента|стеклоткань|флоки|шнур/i.test(name)) return "prochee";
  return "polimery-i-suhie-smesi";
}

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

async function main() {
  const examples: ExampleProduct[] = JSON.parse(readFileSync(join(dataDir, "products.json"), "utf-8"));
  const rawKits: RawKit[] = JSON.parse(readFileSync(join(dataDir, "kits.raw.json"), "utf-8"));

  await db.$transaction([
    db.kitItem.deleteMany(), db.kit.deleteMany(), db.productAttributeValue.deleteMany(),
    db.packaging.deleteMany(), db.productImage.deleteMany(), db.product.deleteMany(),
    db.categoryAttribute.deleteMany(), db.attribute.deleteMany(), db.category.deleteMany(),
  ]);

  const cats = new Map<string, number>();
  for (const [i, c] of CATEGORIES.entries()) {
    const row = await db.category.create({ data: { ...c, sort: i } });
    cats.set(c.slug, row.id);
  }
  for (const [i, c] of SUBCATEGORIES.entries()) {
    const row = await db.category.create({ data: { name: c.name, slug: c.slug, parentId: cats.get(c.parent)!, sort: i } });
    cats.set(c.slug, row.id);
  }
  const catByExampleName = (n: string) =>
    CATEGORIES.find((c) => c.name.toLowerCase().replace(/ и /, "\\") === n.toLowerCase() || c.name.toLowerCase() === n.toLowerCase())?.slug
    ?? (n.includes("ПОЛИМЕРЫ") ? "polimery-i-suhie-smesi" : "prochee");

  // ── Характеристики для фильтров ──
  // Значения: из характеристик в Excel заказчика (re) или из названия товара (fromName)
  type AttrDef = {
    code: string; name: string; type: "NUMBER" | "SELECT" | "TEXT"; unit: string;
    re?: RegExp; fromName?: (name: string) => string | null;
  };
  const num = (s: string) => s.replace(/\s/g, "").replace(",", ".");
  const attrDefs: AttrDef[] = [
    { code: "base", name: "Основа", type: "SELECT", unit: "", fromName: (n) =>
        /полиуретан-цемент/i.test(n) ? "полиуретан-цементная" : /эпоксид/i.test(n) ? "эпоксидная"
        : /полиуретан/i.test(n) ? "полиуретановая" : /акрил/i.test(n) ? "акриловая" : null },
    { code: "finish", name: "Поверхность", type: "SELECT", unit: "", re: /^(матовая|полуматовая|матовый|глянцевая)/i },
    { code: "density", name: "Плотность", type: "NUMBER", unit: "кг/м³", re: /плотность\s*([\d.,]+)/i },
    { code: "viscosity", name: "Вязкость", type: "NUMBER", unit: "мПа·с", re: /вязкость\s*([\d.,]+)/i },
    { code: "strength", name: "Прочность на сжатие", type: "NUMBER", unit: "МПа", re: /прочность на сжатие[^\d]*([\d.,]+)/i },
    { code: "filler", name: "Заполнитель", type: "SELECT", unit: "", fromName: (n) =>
        /кварц/i.test(n) && /топпинг/i.test(n) ? "кварцевый" : /корунд/i.test(n) ? "корундовый" : null },
    { code: "power", name: "Мощность", type: "NUMBER", unit: "кВт", re: /([\d.,]+)\s*кВт/i },
    { code: "voltage", name: "Напряжение", type: "SELECT", unit: "В", re: /(\d{3})\s*В(?![А-Яа-яЁё])/ }, // \b в JS не работает с кириллицей
    { code: "width", name: "Ширина обработки", type: "NUMBER", unit: "мм", re: /ширина\s*([\d.,]+)\s*мм/i },
    { code: "weight", name: "Вес", type: "NUMBER", unit: "кг", re: /вес\s*([\d.,]+)\s*кг/i },
    { code: "tank", name: "Объём бака", type: "NUMBER", unit: "л", re: /(\d+)\s*л;/ },
    { code: "vacuum", name: "Разрежение", type: "NUMBER", unit: "мБар", re: /([\d.,]+)\s*мБар/i },
    { code: "airflow", name: "Производительность", type: "NUMBER", unit: "м³/ч", re: /([\d.,]+)\s*м³\/ч/i },
    { code: "rotation", name: "Вращение", type: "SELECT", unit: "", fromName: (n) =>
        /left/i.test(n) ? "левое" : /right/i.test(n) ? "правое" : null },
    { code: "resource", name: "Ресурс", type: "NUMBER", unit: "м²", re: /ресурс\s*([\d\s]+)\s*м²/i },
  ];
  const attrs = new Map<string, number>();
  for (const a of attrDefs) {
    const row = await db.attribute.create({ data: { code: a.code, name: a.name, type: a.type, unit: a.unit } });
    attrs.set(a.code, row.id);
  }
  // Подкатегории наследуют набор родителя (см. admin-data.attributesByCategory и фильтры каталога)
  const catAttrs: Record<string, string[]> = {
    "gotovye-sistemy-pola": ["base", "finish", "strength", "density", "viscosity"],
    polimery: ["base", "finish", "density", "viscosity"],
    "suhie-smesi": ["filler", "strength"],
    oborudovanie: ["power", "voltage", "weight"],
    "shlifovalnye-mashiny": ["width"],
    "zatirochnye-mashiny": ["width"],
    "promyshlennye-pylesosy": ["tank", "vacuum", "airflow"],
    "rashodnye-materialy": ["rotation", "resource"],
  };
  for (const [slug, codes] of Object.entries(catAttrs)) {
    for (const [i, code] of codes.entries()) {
      await db.categoryAttribute.create({ data: { categoryId: cats.get(slug)!, attributeId: attrs.get(code)!, sort: i } });
    }
  }

  // ── Сбор товаров: примеры + компоненты систем ──
  type Draft = {
    sku: string; name: string; category: string; description: string; characteristics: string;
    pricePerUnit: number | null; unit: PackUnit; packs: Set<number>; fixedPrice?: { amount: number; price: number };
    rule?: { type: ConsumptionType; rate: number };
  };
  // ключ без пробелов: «EP-C201 AS» в примерах = «EP-C201AS» в калькуляторах
  const drafts = new Map<string, Draft>();
  const key = (sku: string) => sku.replace(/\s+/g, "");

  for (const e of examples) {
    const sku = normSku(e.sku);
    const unit: PackUnit = e.unit === "шт" ? "PCS" : e.unit === "литр" ? "L" : "KG";
    const d: Draft = {
      sku, name: e.name, category: catByExampleName(e.category), description: e.description,
      characteristics: e.characteristics, pricePerUnit: e.priceFrom, unit, packs: new Set(),
    };
    if (e.unit === "шт") d.fixedPrice = { amount: 1, price: e.priceFrom ?? 0 };
    if (e.unit === "мешок") d.fixedPrice = { amount: 25, price: e.priceFrom ?? 0 };
    const rate = e.characteristics.match(/расход\s*([\d,]+)/i);
    if (rate) d.rule = { type: "PER_AREA", rate: Number(rate[1].replace(",", ".")) };
    drafts.set(key(sku), d);
  }

  let autoSku = 1;
  const skuByComponentName = new Map<string, string>();
  const kits = rawKits.filter(
    (k, i, all) =>
      k.items.every((it) => it.type !== "UNKNOWN" && it.pack && it.rate != null) &&
      all.findIndex((x) => x.title === k.title) === i,
  );

  for (const k of kits) {
    for (const it of k.items) {
      const name = cleanName(it.name);
      let sku = skuFromName(name) ?? skuByComponentName.get(name);
      if (!sku) {
        sku = `BP-${String(autoSku++).padStart(3, "0")}`;
        skuByComponentName.set(name, sku);
      }
      let d = drafts.get(key(sku));
      if (!d) {
        d = {
          sku, name, category: categoryFor(name), description: "", characteristics: "",
          pricePerUnit: it.pricePerUnit, unit: unitFor(name), packs: new Set(),
        };
        drafts.set(key(sku), d);
      }
      if (!d.fixedPrice) d.packs.add(round(it.pack!, 3));
      // заглушка до наполнения: минимальная цена за кг из всех листов калькулятора
      if (it.pricePerUnit != null && !d.fixedPrice) d.pricePerUnit = Math.min(d.pricePerUnit ?? Infinity, it.pricePerUnit);
      if (!d.rule && it.type !== "FIXED") d.rule = { type: it.type as ConsumptionType, rate: it.rate! };
    }
  }

  // ── Запись товаров ──
  const productIds = new Map<string, { id: number; packIds: Map<number, number>; biggest: number }>();
  const usedSlugs = new Set<string>();
  for (const [i, d] of [...drafts.values()].entries()) {
    let slug = slugify(d.name) || slugify(d.sku);
    if (usedSlugs.has(slug)) slug = `${slug}-${slugify(d.sku)}`;
    usedSlugs.add(slug);

    const packs = d.fixedPrice
      ? [{ amount: d.fixedPrice.amount, price: d.fixedPrice.price }]
      : (d.packs.size ? [...d.packs] : [d.unit === "L" ? 10 : 20]).sort((a, b) => b - a)
          .map((amount) => ({ amount, price: Math.round((d.pricePerUnit ?? 0) * amount) }));

    // «Эпоксидный покровный состав «PRASPAN® EP-C251»» → «Эпоксидный покровный состав»
    let short = d.name.replace(/«.*?»/g, "").split(/\s+/).filter((w) => !/[A-Za-z®#]/.test(w)).join(" ").replace(/["“”]/g, "").trim();
    if (!/[а-яё]{3}/i.test(short)) short = d.name; // «Refloor Screed 100» — описать нечем, берём название
    const product = await db.product.create({
      data: {
        sku: d.sku, name: d.name, slug, sort: i,
        priceFrom: Math.min(...packs.map((x) => x.price)),
        shortDescription: short,
        description: [d.description, d.characteristics].filter(Boolean).join("\n\n"),
        categoryId: cats.get(subcategoryFor(d.name, d.sku, d.category)),
        consumptionType: d.rule?.type ?? "NONE",
        consumptionRate: d.rule?.rate,
        defaultThickness: d.rule?.type === "PER_AREA_MM" ? 5 : undefined,
        packagings: { create: packs.map((p, j) => ({ amount: p.amount, unit: d.fixedPrice?.amount === 25 ? "KG" : d.unit, price: p.price, sort: j })) },
      },
      include: { packagings: true },
    });
    productIds.set(key(d.sku), {
      id: product.id,
      packIds: new Map(product.packagings.map((p) => [Number(p.amount), p.id])),
      biggest: product.packagings[0].id,
    });

    for (const a of attrDefs) {
      let raw: string | null = null;
      if (a.fromName) raw = a.fromName(d.name);
      else if (a.re) {
        const m = d.characteristics.match(a.re);
        if (m) raw = a.type === "NUMBER" ? num(m[1]) : m[1].toLowerCase().replace(/ый$/, "ая");
      }
      if (!raw) continue;
      await db.productAttributeValue.create({
        data: {
          productId: product.id, attributeId: attrs.get(a.code)!, valueText: raw,
          valueNumber: a.type === "NUMBER" ? Number(raw) : undefined,
        },
      });
    }
  }

  // ── Фото от заказчика ──
  const uploadDir = resolve(process.env.UPLOAD_DIR ?? "./uploads");
  await rm(join(uploadDir, "products"), { recursive: true, force: true }); // каталог пересоздан — старые фото не нужны
  const imageMap: Record<string, { sku?: string; nameIncludes?: string }> = JSON.parse(readFileSync(join(dataDir, "images.json"), "utf-8"));
  for (const [file, match] of Object.entries(imageMap)) {
    if (file === "_") continue;
    const target = [...drafts.values()].find((d) =>
      match.sku ? key(d.sku) === key(match.sku) : d.name.toLowerCase().includes(match.nameIncludes!.toLowerCase()),
    );
    if (!target) {
      console.warn(`фото ${file}: товар не найден`);
      continue;
    }
    const productId = productIds.get(key(target.sku))!.id;
    const rel = `products/${productId}/${randomUUID()}`;
    await writeImageSizes(readFileSync(join(dataDir, "images", file)), join(uploadDir, rel));
    await db.productImage.create({ data: { productId, path: rel, alt: target.name, sort: 0 } });
  }

  // ── Комплекты ──
  for (const [i, k] of kits.entries()) {
    const usesThickness = k.items.some((it) => it.type === "PER_AREA_MM");
    await db.kit.create({
      data: {
        name: k.title, slug: slugify(k.title), sort: i,
        usesThickness, usesLength: k.usesLength,
        defaultArea: 100,
        defaultThickness: usesThickness ? (k.defaultThickness ?? 5) : undefined,
        items: {
          create: k.items.map((it, j) => {
            const name = cleanName(it.name);
            const sku = skuFromName(name) ?? skuByComponentName.get(name)!;
            const p = productIds.get(key(sku))!;
            return {
              productId: p.id, packagingId: p.packIds.get(round(it.pack!, 3)) ?? p.biggest,
              consumptionType: it.type as ConsumptionType, rate: it.rate!, sort: j,
            };
          }),
        },
      },
    });
  }

  // ── Служебные страницы и настройки (тексты в seed-data/pages/*.md) ──
  const pages = [
    { slug: "delivery", title: "Доставка и оплата" },
    { slug: "contacts", title: "Контакты" },
    { slug: "privacy", title: "Политика конфиденциальности" },
  ];
  for (const p of pages) {
    const content = readFileSync(join(dataDir, "pages", `${p.slug}.md`), "utf-8");
    await db.page.upsert({ where: { slug: p.slug }, update: { title: p.title, content }, create: { ...p, content } });
  }
  // Контакты от заказчика (05.10.2026)
  const settings = {
    phone: "+7 (938) 499-50-03",
    email: "expert.polimer@yandex.ru",
    address: "350000, г. Краснодар, ул. им. Гоголя, д. 80",
    hours: "Пн–Пт, 9:00–18:00",
    legal: "ООО НСТ «Полимер Эксперт» · ИНН 2308285521 · ОГРН 1222300022340",
    seoProductTitle: "{name} — купить по цене от {price} | betonpoli.ru",
    seoProductDescription: "{name} ({sku}). {short} Расчёт расхода, доставка.",
    seoCategoryTitle: "{name} — купить в интернет-магазине | betonpoli.ru",
    seoCategoryDescription: "{name}: {count} товаров. Материалы и оборудование для промышленного пола.",
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  // ── Админ для разработки ──
  if (!(await db.adminUser.count())) {
    await db.adminUser.create({
      data: { login: "admin", name: "Администратор", passwordHash: await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? "admin", 10) },
    });
  }

  console.log(`товаров: ${drafts.size}, комплектов: ${kits.length}`);
}

main().finally(() => db.$disconnect());
