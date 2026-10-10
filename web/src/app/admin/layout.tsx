import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Админка", template: "%s · Админка betonpoli" }, robots: { index: false, follow: false } };

// В админке обычный регистр — удобнее читать таблицы и формы
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex min-h-dvh flex-col text-[13px] tracking-normal normal-case">{children}</div>;
}
