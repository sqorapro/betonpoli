// Нарезка фото товара в WebP. Без server-only — используется и в сиде (tsx).
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import sharp from "sharp";

// Квадрат на белом — фото товаров у заказчика на белом фоне
export const IMAGE_SIZES = { sm: 240, md: 640, lg: 1000 } as const;

/** Пишет base-sm/md/lg.webp. base — абсолютный путь без суффикса. */
export async function writeImageSizes(input: Buffer, base: string) {
  await mkdir(dirname(base), { recursive: true });
  for (const [size, px] of Object.entries(IMAGE_SIZES)) {
    await sharp(input)
      .rotate()
      .resize(px, px, { fit: "contain", background: "#ffffff" })
      .flatten({ background: "#ffffff" })
      .webp({ quality: 82 })
      .toFile(`${base}-${size}.webp`);
  }
}
