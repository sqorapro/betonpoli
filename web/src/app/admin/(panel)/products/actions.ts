"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteImageFiles, saveProductImage } from "@/lib/media";
import { slugify } from "@/lib/slug";
import { Prisma } from "@/generated/prisma/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const decimal = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/\s/g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

const base = z.object({
  name: z.string().trim().min(2, "Название обязательно").max(300),
  sku: z.string().trim().min(1, "Артикул обязателен").max(60),
  slug: z.string().trim().max(100),
  categoryId: z.coerce.number().int().positive().nullable(),
  stock: z.enum(["IN_STOCK", "ON_ORDER", "OUT_OF_STOCK"]),
  isPublished: z.boolean(),
  sort: z.coerce.number().int(),
  shortDescription: z.string().trim().max(120),
  description: z.string().trim().max(20000),
  consumptionType: z.enum(["NONE", "PER_AREA", "PER_AREA_MM", "PER_LENGTH", "PER_AREA_UNITS", "FIXED"]),
  seoTitle: z.string().trim().max(200),
  seoDescription: z.string().trim().max(400),
});

export async function saveProduct(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = Number(form.get("id")) || null;

  const parsed = base.safeParse({
    name: form.get("name"),
    sku: form.get("sku"),
    slug: form.get("slug") ?? "",
    categoryId: form.get("categoryId") ? form.get("categoryId") : null,
    stock: form.get("stock"),
    isPublished: form.get("isPublished") === "on",
    sort: form.get("sort") || 0,
    shortDescription: form.get("shortDescription") ?? "",
    description: form.get("description") ?? "",
    consumptionType: form.get("consumptionType"),
    seoTitle: form.get("seoTitle") ?? "",
    seoDescription: form.get("seoDescription") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { fieldErrors };
  }
  const d = parsed.data;
  const slug = slugify(d.slug || `${d.name}`) || slugify(d.sku);

  const rate = decimal(form.get("consumptionRate"));
  const thickness = decimal(form.get("defaultThickness"));
  if (d.consumptionType !== "NONE" && !(rate && rate > 0)) {
    return { fieldErrors: { consumptionRate: "Укажите норму расхода или выберите «Без калькулятора»" } };
  }

  // Фасовки: строки pack_*[]; пустая строка = удалить
  const packIds = form.getAll("pack_id").map((v) => Number(v) || null);
  const amounts = form.getAll("pack_amount").map(decimal);
  const units = form.getAll("pack_unit").map(String);
  const prices = form.getAll("pack_price").map(decimal);
  const packs: { id: number | null; amount: number; unit: "KG" | "L" | "PCS" | "M"; price: number; sort: number }[] = [];
  for (let i = 0; i < amounts.length; i++) {
    if (amounts[i] == null && prices[i] == null) continue;
    if (!(amounts[i]! > 0) || !(prices[i]! >= 0) || Number.isNaN(prices[i])) {
      return { fieldErrors: { packagings: `Фасовка ${i + 1}: проверьте объём и цену` } };
    }
    const unit = ["KG", "L", "PCS", "M"].includes(units[i]) ? (units[i] as "KG") : "KG";
    packs.push({ id: packIds[i], amount: amounts[i]!, unit, price: prices[i]!, sort: packs.length });
  }
  if (!packs.length) return { fieldErrors: { packagings: "Нужна хотя бы одна фасовка с ценой" } };

  const data = {
    name: d.name,
    sku: d.sku,
    slug,
    categoryId: d.categoryId,
    stock: d.stock,
    isPublished: d.isPublished,
    sort: d.sort,
    shortDescription: d.shortDescription,
    description: d.description,
    consumptionType: d.consumptionType,
    consumptionRate: d.consumptionType === "NONE" ? null : rate,
    defaultThickness: d.consumptionType === "PER_AREA_MM" && thickness && thickness > 0 ? thickness : null,
    seoTitle: d.seoTitle,
    seoDescription: d.seoDescription,
    priceFrom: Math.min(...packs.map((p) => p.price)),
  };

  let productId: number;
  try {
    productId = await db.$transaction(async (tx) => {
      const product = id ? await tx.product.update({ where: { id }, data }) : await tx.product.create({ data });

      // фасовки: обновить существующие, создать новые, удалить пропавшие (если не в заявках — там снимок)
      const keep = packs.filter((p) => p.id).map((p) => p.id!);
      await tx.packaging.deleteMany({ where: { productId: product.id, id: { notIn: keep } } });
      for (const p of packs) {
        const row = { amount: p.amount, unit: p.unit, price: p.price, sort: p.sort };
        if (p.id) await tx.packaging.update({ where: { id: p.id, productId: product.id }, data: row });
        else await tx.packaging.create({ data: { ...row, productId: product.id } });
      }

      // характеристики: attr_<id>
      for (const [key, value] of form.entries()) {
        const m = key.match(/^attr_(\d+)$/);
        if (!m) continue;
        const attributeId = Number(m[1]);
        const text = String(value).trim();
        if (!text) {
          await tx.productAttributeValue.deleteMany({ where: { productId: product.id, attributeId } });
          continue;
        }
        const num = decimal(text);
        const valueNumber = num != null && !Number.isNaN(num) ? num : null;
        await tx.productAttributeValue.upsert({
          where: { productId_attributeId: { productId: product.id, attributeId } },
          create: { productId: product.id, attributeId, valueText: text, valueNumber },
          update: { valueText: text, valueNumber },
        });
      }
      return product.id;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = String(e.meta?.target ?? "");
      return { fieldErrors: target.includes("slug") ? { slug: "Такой адрес уже занят" } : { sku: "Такой артикул уже есть" } };
    }
    throw e;
  }

  // Фото: удаление, порядок, новые файлы
  const removeIds = form.getAll("image_remove").map(Number);
  if (removeIds.length) {
    const toRemove = await db.productImage.findMany({ where: { id: { in: removeIds }, productId } });
    await db.productImage.deleteMany({ where: { id: { in: toRemove.map((i) => i.id) } } });
    for (const img of toRemove) await deleteImageFiles(img.path);
  }
  const order = form.getAll("image_order").map(Number);
  for (const [i, imgId] of order.entries()) {
    if (!removeIds.includes(imgId)) await db.productImage.updateMany({ where: { id: imgId, productId }, data: { sort: i } });
  }
  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  let sort = order.length;
  const errors: string[] = [];
  for (const file of files) {
    try {
      const path = await saveProductImage(productId, file);
      await db.productImage.create({ data: { productId, path, alt: d.name, sort: sort++ } });
    } catch (e) {
      errors.push((e as Error).message);
    }
  }

  revalidatePath("/", "layout");
  if (errors.length) return { error: `Товар сохранён, но фото не загружены: ${errors.join("; ")}` };
  // redirect перемонтирует форму со свежими данными (key = updatedAt)
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function deleteProduct(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const images = await db.productImage.findMany({ where: { productId: id } });
  await db.product.delete({ where: { id } });
  for (const img of images) await deleteImageFiles(img.path);
  revalidatePath("/", "layout");
  redirect("/admin/products");
}
