import { readFile } from "node:fs/promises";
import { resolveMedia } from "@/lib/media";

// Загруженные фото. В проде nginx может отдавать /media напрямую из того же каталога.
export async function GET(_: Request, { params }: RouteContext<"/media/[...path]">) {
  const { path } = await params;
  const file = resolveMedia(path);
  if (!file || !file.endsWith(".webp")) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(file);
    return new Response(data, {
      headers: {
        "content-type": "image/webp",
        // имя файла уникально (uuid) — можно кешировать навсегда
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
