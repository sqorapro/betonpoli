import type { MetadataRoute } from "next";

// SITE_URL берётся на сервере, не при сборке образа
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.SITE_URL ?? "http://localhost:3000";
  // демо-копия на сайте студии не должна попадать в поиск
  if (process.env.DEMO_MODE === "1") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/cart", "/checkout", "/thanks", "/search"] },
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
