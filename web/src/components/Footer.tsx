import Link from "next/link";

export function Footer({ phone, legal }: { phone: string; legal: string }) {
  return (
    <footer className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 pt-16 pb-8 text-sm text-muted md:px-8">
      <Link href="/delivery">Доставка и оплата</Link>
      <Link href="/contacts">Контакты</Link>
      <Link href="/privacy">Политика конфиденциальности</Link>
      <span className="hidden flex-1 md:block" />
      {/* п. 5.4 ДС: ссылка на разработчика */}
      <a href="https://sqorapro.ru" target="_blank" rel="noopener">
        Создано студией SqoraPro
      </a>
      {phone && (
        <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="text-ink">
          {phone}
        </a>
      )}
      {legal && <p className="w-full pt-2 text-[10px] normal-case tracking-normal">{legal}</p>}
    </footer>
  );
}
