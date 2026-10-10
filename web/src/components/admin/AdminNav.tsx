"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/admin/(panel)/actions";

const ITEMS = [
  { href: "/admin/orders", label: "Заявки" },
  { href: "/admin/products", label: "Товары" },
  { href: "/admin/categories", label: "Категории" },
  { href: "/admin/attributes", label: "Характеристики" },
  { href: "/admin/kits", label: "Комплекты" },
  { href: "/admin/pages", label: "Страницы" },
  { href: "/admin/settings", label: "Настройки" },
];

export function AdminNav({ adminName, newOrders }: { adminName: string; newOrders: number }) {
  const pathname = usePathname();
  return (
    <aside className="flex shrink-0 flex-col gap-4 border-b border-line bg-tile px-4 py-4 md:sticky md:top-0 md:h-dvh md:w-52 md:border-r md:border-b-0 md:py-6">
      <Link href="/" className="font-semibold" target="_blank">
        betonpoli.ru ↗
      </Link>
      <nav className="flex flex-wrap gap-x-4 gap-y-1 md:flex-col md:gap-1">
        {ITEMS.map((i) => {
          const active = pathname.startsWith(i.href);
          return (
            <Link key={i.href} href={i.href} className={`flex items-center justify-between py-1 ${active ? "font-semibold" : "text-muted hover:text-ink"}`}>
              {i.label}
              {i.href === "/admin/orders" && newOrders > 0 && (
                <span className="ml-2 rounded-full bg-accent px-1.5 text-[11px] font-semibold text-ink">{newOrders}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto hidden flex-col gap-1 text-muted md:flex">
        <span>{adminName}</span>
        <form action={logout}>
          <button type="submit" className="cursor-pointer hover:text-ink">
            Выйти
          </button>
        </form>
      </div>
    </aside>
  );
}
