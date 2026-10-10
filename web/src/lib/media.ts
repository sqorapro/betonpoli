import "server-only";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { IMAGE_SIZES, writeImageSizes } from "@/lib/image-process";

export const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? "./uploads");

const MAX_BYTES = 15 * 1024 * 1024;

/** Сохраняет картинку в 3 размерах WebP, возвращает путь без суффикса: products/12/uuid */
export async function saveProductImage(productId: number, file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error(`Файл ${file.name} больше 15 МБ`);
  const input = Buffer.from(await file.arrayBuffer());
  const meta = await sharp(input).metadata().catch(() => null);
  if (!meta?.width) throw new Error(`Файл ${file.name} не похож на изображение`);

  const rel = `products/${productId}/${randomUUID()}`;
  await writeImageSizes(input, join(UPLOAD_DIR, rel));
  return rel;
}

export async function deleteImageFiles(rel: string) {
  for (const size of Object.keys(IMAGE_SIZES)) {
    await rm(join(UPLOAD_DIR, `${rel}-${size}.webp`), { force: true });
  }
}

/** Безопасный путь внутри UPLOAD_DIR */
export function resolveMedia(parts: string[]): string | null {
  const p = resolve(UPLOAD_DIR, ...parts);
  return p.startsWith(UPLOAD_DIR + (process.platform === "win32" ? "\\" : "/")) ? p : null;
}
