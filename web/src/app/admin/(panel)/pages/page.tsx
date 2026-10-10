import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Страницы" };

async function savePage(form: FormData) {
  "use server";
  await requireAdmin();
  const slug = String(form.get("slug"));
  await db.page.update({
    where: { slug },
    data: {
      title: String(form.get("title") ?? "").trim(),
      content: String(form.get("content") ?? ""),
      seoTitle: String(form.get("seoTitle") ?? "").trim(),
      seoDescription: String(form.get("seoDescription") ?? "").trim(),
    },
  });
  revalidatePath(`/${slug}`);
  redirect(`/admin/pages?edit=${slug}&saved=1`);
}

export default async function PagesPage({ searchParams }: PageProps<"/admin/pages">) {
  await requireAdmin();
  const { edit, saved } = await searchParams;
  const pages = await db.page.findMany({ orderBy: { slug: "asc" } });
  const current = pages.find((p) => p.slug === edit) ?? pages[0];

  return (
    <div className="flex max-w-[960px] flex-col gap-6">
      <h1 className="adm-h1">Страницы</h1>
      <nav className="flex gap-4">
        {pages.map((p) => (
          <Link key={p.slug} href={`/admin/pages?edit=${p.slug}`} className={p.slug === current?.slug ? "font-semibold" : "text-muted"}>
            {p.title}
          </Link>
        ))}
      </nav>
      {current && (
        <form key={current.slug + current.updatedAt.getTime()} action={savePage} className="adm-card">
          <input type="hidden" name="slug" value={current.slug} />
          <label className="label">Заголовок<input name="title" defaultValue={current.title} className="field" /></label>
          <label className="label">
            Текст
            <textarea name="content" defaultValue={current.content} rows={20} className="field h-auto py-2 font-mono text-[13px]" />
            <span className="text-[12px]">
              Markdown: пустая строка — новый абзац, <code>## Подзаголовок</code>, <code>- пункт списка</code>, <code>**жирный**</code>, <code>[ссылка](https://…)</code>
            </span>
          </label>
          <label className="label">SEO title<input name="seoTitle" defaultValue={current.seoTitle} className="field" /></label>
          <label className="label">SEO description<input name="seoDescription" defaultValue={current.seoDescription} className="field" /></label>
          <div className="flex items-center gap-4">
            <button className="btn btn-primary">Сохранить</button>
            <Link href={`/${current.slug}`} target="_blank" className="text-muted underline underline-offset-2">Открыть на сайте ↗</Link>
            {saved === "1" && <span className="text-muted">Сохранено</span>}
          </div>
        </form>
      )}
    </div>
  );
}
