import Link from "next/link";

type Props = { page: number; pages: number; basePath: string; params: Record<string, string | string[] | undefined> };

export function Pagination({ page, pages, basePath, params }: Props) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === "page" || v === undefined) continue;
      for (const x of Array.isArray(v) ? v : [v]) qs.append(k, x);
    }
    if (p > 1) qs.set("page", String(p));
    return qs.size ? `${basePath}?${qs}` : basePath;
  };
  // 1 … 4 5 [6] 7 8 … 12
  const nums = [...new Set([1, page - 2, page - 1, page, page + 1, page + 2, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);

  return (
    <nav aria-label="Страницы" className="flex flex-wrap items-center justify-center gap-1 pt-16">
      {nums.map((n, i) => (
        <span key={n} className="flex items-center">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-2 text-muted">…</span>}
          {n === page ? (
            <span aria-current="page" className="flex h-11 min-w-11 items-center justify-center font-semibold">
              {n}
            </span>
          ) : (
            <Link href={href(n)} className="flex h-11 min-w-11 items-center justify-center text-muted hover:text-ink">
              {n}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
