import type { Metadata } from "next";
import Link from "next/link";
import { ClearCart } from "./ClearCart";

export const metadata: Metadata = { title: "Спасибо за заявку", robots: { index: false } };

export default async function ThanksPage({ searchParams }: PageProps<"/thanks">) {
  const { order, check } = await searchParams;
  const id = typeof order === "string" && /^\d+$/.test(order) ? order : null;
  return (
    <div className="flex flex-col items-center gap-6 px-4 py-32 text-center">
      <ClearCart />
      <h1 className="text-lg font-semibold">Спасибо!</h1>
      <p>
        {check === "1"
          ? `Запрос${id ? ` №${id}` : ""} на проверку отправлен технологу. Он перезвонит в рабочее время (пн–пт, 9:00–18:00).`
          : `Заявка${id ? ` №${id}` : ""} принята. Менеджер свяжется с вами в ближайшее время.`}
      </p>
      <Link href="/" className="btn">
        В каталог
      </Link>
    </div>
  );
}
