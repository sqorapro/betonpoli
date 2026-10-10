import { connection } from "next/server";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Metrika } from "@/components/Metrika";
import { getMenuCategories, getSettings } from "@/lib/catalog";

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  // Каталог меняется из админки — всё рендерим по запросу, без статики на этапе сборки
  await connection();
  const [categories, settings] = await Promise.all([getMenuCategories(), getSettings()]);
  return (
    <>
      <Header categories={categories} phone={settings.phone ?? ""} />
      <main className="flex-1">{children}</main>
      <Footer phone={settings.phone ?? ""} legal={settings.legal ?? ""} />
      <Metrika id={settings.metrikaId ?? ""} />
    </>
  );
}
