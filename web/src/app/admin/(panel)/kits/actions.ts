"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { Prisma } from "@/generated/prisma/client";
import type { ConsumptionType } from "@/generated/prisma/enums";

export type KitState = { error?: string };

const TYPES = ["PER_AREA", "PER_AREA_MM", "PER_LENGTH", "PER_AREA_UNITS", "FIXED"];
const dec = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

export async function saveKit(_: KitState, form: FormData): Promise<KitState> {
  await requireAdmin();
  const id = Number(form.get("id")) || null;
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Укажите название" };

  const productIds = form.getAll("item_product").map(Number);
  const packIds = form.getAll("item_pack").map((v) => Number(v) || null);
  const types = form.getAll("item_type").map(String);
  const rates = form.getAll("item_rate").map(dec);
  const roles = form.getAll("item_role").map((v) => String(v).trim());

  const items: { productId: number; packagingId: number | null; consumptionType: ConsumptionType; rate: number; role: string; sort: number }[] = [];
  for (let i = 0; i < productIds.length; i++) {
    if (!productIds[i]) continue;
    if (!TYPES.includes(types[i])) return { error: `Позиция ${i + 1}: выберите способ расчёта` };
    if (!(rates[i] > 0)) return { error: `Позиция ${i + 1}: укажите расход` };
    items.push({ productId: productIds[i], packagingId: packIds[i], consumptionType: types[i] as ConsumptionType, rate: rates[i], role: roles[i] ?? "", sort: items.length });
  }
  if (items.length < 2) return { error: "В комплекте нужно минимум 2 позиции" };

  const usesThickness = items.some((i) => i.consumptionType === "PER_AREA_MM");
  const data = {
    name,
    slug: slugify(String(form.get("slug") ?? "") || name),
    description: String(form.get("description") ?? "").trim(),
    isPublished: form.get("isPublished") === "on",
    usesThickness,
    usesLength: form.get("usesLength") === "on",
    defaultArea: dec(form.get("defaultArea")) > 0 ? dec(form.get("defaultArea")) : 100,
    defaultThickness: usesThickness && dec(form.get("defaultThickness")) > 0 ? dec(form.get("defaultThickness")) : null,
    sort: Number(form.get("sort")) || 0,
  };

  let kitId: number;
  try {
    kitId = await db.$transaction(async (tx) => {
      const k = id ? await tx.kit.update({ where: { id }, data }) : await tx.kit.create({ data });
      await tx.kitItem.deleteMany({ where: { kitId: k.id } });
      await tx.kitItem.createMany({ data: items.map((i) => ({ ...i, kitId: k.id })) });
      return k.id;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "Такой адрес уже занят" };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(`/admin/kits/${kitId}?saved=1`);
}

export async function deleteKit(form: FormData) {
  await requireAdmin();
  await db.kit.delete({ where: { id: Number(form.get("id")) } });
  revalidatePath("/", "layout");
  redirect("/admin/kits");
}
