"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { BackIcon, BagIcon, CloseIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { cartCount, useCart } from "@/lib/cart";
import { BASE_PATH } from "@/lib/format";

type MenuCategory = { id: number; name: string; shortName: string; slug: string };
type Suggestion = { sku: string; name: string; slug: string };

export function Header({ categories, phone }: { categories: MenuCategory[]; phone: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const isHome = pathname === "/";
  const activeSlug = pathname.startsWith("/catalog/") ? pathname.split("/")[2] : null;

  // Закрыть меню при переходе
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 bg-paper px-4 md:px-8">
        <div className="flex items-center gap-3 md:gap-6">
          {isHome ? (
            <button
              type="button"
              aria-label="Меню"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="flex h-11 w-11 cursor-pointer items-center justify-start"
            >
              <PlusIcon />
            </button>
          ) : (
            <BackButton />
          )}
          <Link href="/" aria-label="BETONPOLI — на главную" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE_PATH}/brand/logo.svg`} alt="BETONPOLI" width={106} height={28} className="h-7 w-auto md:h-9" />
          </Link>
        </div>

        <nav aria-label="Категории" className="hidden justify-center gap-5 whitespace-nowrap xl:flex">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/catalog/${c.slug}`}
              className={c.slug === activeSlug ? "font-semibold text-ink" : "text-muted hover:text-ink"}
            >
              {c.shortName || c.name}
            </Link>
          ))}
        </nav>
        <span className="xl:hidden" />

        <div className="flex items-center justify-end gap-2 md:gap-5">
          <div className="hidden md:block">
            <SearchBox />
          </div>
          <button
            type="button"
            aria-label="Поиск"
            className="flex h-11 w-11 cursor-pointer items-center justify-center md:hidden"
            onClick={() => setSearchOpen((v) => !v)}
          >
            <SearchIcon />
          </button>
          <CartLink />
        </div>
      </header>

      {searchOpen && (
        <div className="sticky top-16 z-30 bg-paper px-4 pb-3 md:hidden">
          <SearchBox autoFocus />
        </div>
      )}

      {menuOpen && <Menu categories={categories} phone={phone} onClose={() => setMenuOpen(false)} />}
    </>
  );
}

function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Назад"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className="flex h-11 w-11 cursor-pointer items-center justify-start"
    >
      <BackIcon />
    </button>
  );
}

function CartLink() {
  const items = useCart();
  const count = cartCount(items);
  return (
    <Link
      href="/cart"
      aria-label={count ? `Корзина, товаров: ${count}` : "Корзина"}
      className="relative flex h-11 w-11 items-center justify-end"
    >
      <BagIcon />
      {count > 0 && <span className="absolute top-2.5 -right-1 h-2 w-2 rounded-full bg-accent" />}
    </Link>
  );
}

function Menu({ categories, phone, onClose }: { categories: MenuCategory[]; phone: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Меню" className="fixed inset-0 z-50 flex flex-col bg-paper px-4 md:px-8">
      <div className="flex h-16 items-center">
        <button type="button" aria-label="Закрыть меню" onClick={onClose} className="flex h-11 w-11 cursor-pointer items-center">
          <CloseIcon />
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-10 pt-6 md:flex-row md:gap-24">
        <ul className="flex flex-col gap-4">
          <li className="text-muted">Каталог</li>
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/catalog/${c.slug}`} className="text-md">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
        <ul className="flex flex-col gap-4">
          <li className="text-muted">Покупателям</li>
          <li><Link href="/delivery" className="text-md">Доставка и оплата</Link></li>
          <li><Link href="/contacts" className="text-md">Контакты</Link></li>
          <li><Link href="/cart" className="text-md">Корзина</Link></li>
          {phone && (
            <li>
              <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="text-md">{phone}</a>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}

function SearchBox({ autoFocus }: { autoFocus?: boolean }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${BASE_PATH}/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        if (res.ok) {
          setItems(await res.json());
          setActive(-1);
        }
      } catch {
        // отменён
      }
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const shown = open && q.trim().length >= 2 ? items : [];

  return (
    <form
      ref={boxRef}
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        if (active >= 0 && shown[active]) router.push(`/product/${shown[active].slug}`);
        else if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
        setOpen(false);
      }}
    >
      <label className="flex h-9 w-full items-center gap-2 border-b border-ink md:w-[280px]">
        <SearchIcon />
        <span className="sr-only">Поиск по каталогу</span>
        <input
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, shown.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, -1));
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Грунт, топпинг, EP-C251…"
          role="combobox"
          aria-expanded={shown.length > 0}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent uppercase outline-none [&::-webkit-search-cancel-button]:hidden"
        />
      </label>
      {shown.length > 0 && (
        <ul id={listId} role="listbox" className="absolute top-full right-0 left-0 z-50 border border-line-strong bg-paper py-1 md:left-auto md:w-[360px]">
          {shown.map((s, i) => (
            <li key={s.slug} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <Link
                href={`/product/${s.slug}`}
                onClick={() => setOpen(false)}
                className={`flex gap-3 px-3 py-2 hover:bg-tile hover:text-ink ${i === active ? "bg-tile" : ""}`}
              >
                <span className="shrink-0 font-semibold">{s.sku}</span>
                <span className="truncate text-muted">{s.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
