import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-40 text-center">
      <p className="font-semibold">404</p>
      <p>Страница не найдена</p>
      <Link href="/" className="mt-6 text-muted hover:text-ink">
        В каталог
      </Link>
    </div>
  );
}
