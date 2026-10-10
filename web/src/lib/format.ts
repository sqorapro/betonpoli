// Общие хелперы для сервера и браузера
import type { PackUnit } from "@/generated/prisma/enums";

export const UNIT_LABEL: Record<PackUnit, string> = { KG: "кг", L: "л", PCS: "шт", M: "м" };

export function packLabel(p: { amount: { toString(): string } | number; unit: PackUnit }): string {
  const n = Number(p.amount);
  if (p.unit === "PCS" && n === 1) return "1 шт";
  return `${n.toLocaleString("ru-RU", { maximumFractionDigits: 3 })} ${UNIT_LABEL[p.unit]}`;
}

/** Префикс для «сырых» URL (img, fetch, form). Link и redirect добавляют его сами. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function imageUrl(path: string, size: "sm" | "md" | "lg" = "md") {
  return `${BASE_PATH}/media/${path}-${size}.webp`;
}

export { formatPrice, formatNumber } from "@/lib/calc";
