import { marked } from "marked";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export async function getPage(slug: string) {
  return db.page.findUnique({ where: { slug } });
}

/** Служебная страница из админки (markdown) */
export async function ContentPage({ slug }: { slug: string }) {
  const page = await getPage(slug);
  if (!page) notFound();
  const html = await marked.parse(page.content, { gfm: true, breaks: true });
  return (
    <article className="flex max-w-[720px] flex-col gap-8 px-4 pt-8 md:px-8 md:pt-12">
      <h1 className="text-lg font-semibold">{page.title}</h1>
      <div className="prose-plain" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}

export async function pageMetadata(slug: string) {
  const page = await getPage(slug);
  return page ? { title: page.seoTitle || page.title, description: page.seoDescription || undefined } : {};
}
