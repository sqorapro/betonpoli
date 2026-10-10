// Нагрузочный каталог: npx tsx prisma/seed-bulk.ts 1000   |   удалить: npx tsx prisma/seed-bulk.ts --clean
// Товары с артикулом TST-xxxx раскладываются по всем категориям, получают фасовки и характеристики.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const WORDS = ["Эпоксидный", "Полиуретановый", "Акриловый", "Химстойкий", "Износостойкий", "Антистатичный", "Матовый", "Глянцевый"];
const KINDS = ["покровный состав", "грунт", "лак", "топпинг", "ремонтная смесь", "краска по бетону", "герметик", "пропитка"];
const pick = <T,>(a: T[], i: number) => a[i % a.length];

async function main() {
  if (process.argv.includes("--clean")) {
    const r = await db.product.deleteMany({ where: { sku: { startsWith: "TST-" } } });
    console.log(`удалено: ${r.count}`);
    return;
  }
  const n = Number(process.argv[2] ?? 1000);
  const cats = await db.category.findMany({ include: { attributes: { include: { attribute: true } } } });
  const parentOf = new Map(cats.map((c) => [c.id, c.parentId]));
  const attrsFor = (id: number) => {
    const out = [];
    for (let cur: number | null = id; cur != null; cur = parentOf.get(cur) ?? null) {
      out.push(...cats.find((c) => c.id === cur)!.attributes.map((a) => a.attribute));
    }
    return out;
  };

  for (let i = 0; i < n; i++) {
    const cat = cats[i % cats.length];
    const name = `${pick(WORDS, i)} ${pick(KINDS, i * 7)} тест ${i + 1}`;
    const amount = pick([5, 10, 20, 25, 30], i);
    const perUnit = 50 + ((i * 37) % 1500);
    await db.product.create({
      data: {
        sku: `TST-${String(i + 1).padStart(4, "0")}`,
        name,
        slug: `test-${i + 1}`,
        shortDescription: `${pick(WORDS, i)} ${pick(KINDS, i * 7)}`,
        description: "Тестовый товар для нагрузочной проверки каталога.",
        categoryId: cat.id,
        sort: 1000 + i,
        priceFrom: perUnit * amount,
        consumptionType: i % 3 === 0 ? "PER_AREA_MM" : "PER_AREA",
        consumptionRate: i % 3 === 0 ? 1.8 : 0.3 + (i % 10) / 10,
        packagings: { create: [{ amount, unit: "KG", price: perUnit * amount, sort: 0 }] },
        attributeValues: {
          create: attrsFor(cat.id).map((a, k) =>
            a.type === "NUMBER"
              ? { attributeId: a.id, valueText: String(((i + k) * 13) % 500), valueNumber: ((i + k) * 13) % 500 }
              : { attributeId: a.id, valueText: pick(["вариант А", "вариант Б", "вариант В"], i + k) },
          ),
        },
      },
    });
  }
  console.log(`создано: ${n}`);
}

main().finally(() => db.$disconnect());
