"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { Prisma } from "@/generated/prisma/client";

export type CategoryState = { error?: string };

export async function saveCategory(_: CategoryState, form: FormData): Promise<CategoryState> {
  await requireAdmin();
  const id = Number(form.get("id")) || null;
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Укажите название" };
  const slug = slugify(String(form.get("slug") ?? "") || name);
  const parentId = Number(form.get("parentId")) || null;

  // нельзя сделать категорию потомком самой себя
  if (id && parentId) {
    const all = await db.category.findMany({ select: { id: true, parentId: true } });
    for (let cur: number | null = parentId; cur; cur = all.find((c) => c.id === cur)?.parentId ?? null) {
      if (cur === id) return { error: "Родитель не может быть вложенной категорией" };
    }
  }

  const data = {
    name,
    slug,
    parentId,
    shortName: String(form.get("shortName") ?? "").trim(),
    sort: Number(form.get("sort")) || 0,
    description: String(form.get("description") ?? "").trim(),
    seoTitle: String(form.get("seoTitle") ?? "").trim(),
    seoDescription: String(form.get("seoDescription") ?? "").trim(),
  };

  // Набор характеристик: attr (id, в порядке) + filterable_<id>
  const attrIds = form.getAll("attr").map(Number).filter(Boolean);

  let categoryId: number;
  try {
    categoryId = await db.$transaction(async (tx) => {
      const c = id ? await tx.category.update({ where: { id }, data }) : await tx.category.create({ data });
      await tx.categoryAttribute.deleteMany({ where: { categoryId: c.id } });
      await tx.categoryAttribute.createMany({
        data: attrIds.map((attributeId, sort) => ({ categoryId: c.id, attributeId, sort, filterable: form.get(`filterable_${attributeId}`) === "on" })),
      });
      return c.id;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "Такой адрес уже занят" };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(`/admin/categories/${categoryId}?saved=1`);
}

export async function deleteCategory(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  // товары и подкатегории не удаляются — остаются без категории / поднимаются на уровень вверх
  await db.category.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/admin/categories");
}
