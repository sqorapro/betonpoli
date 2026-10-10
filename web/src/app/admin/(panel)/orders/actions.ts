"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { ORDER_STATUS } from "@/lib/admin-labels";
import { db } from "@/lib/db";
import type { OrderStatus } from "@/generated/prisma/enums";

export async function updateOrder(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const status = String(form.get("status"));
  if (!Number.isInteger(id) || !(status in ORDER_STATUS)) return;
  await db.order.update({
    where: { id },
    data: { status: status as OrderStatus, adminNote: String(form.get("adminNote") ?? "").slice(0, 5000) },
  });
  revalidatePath("/admin", "layout");
}
