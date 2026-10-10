import type { NextConfig } from "next";

// Демо на sqorapro.ru живёт под /demos/betonpoli/live — задаётся при сборке
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Боевой сайт нельзя встраивать в чужие фреймы; демо показывается во фрейме на странице sqorapro.ru
const frameAncestors = basePath ? "'self' https://sqorapro.ru" : "'self'";

const nextConfig: NextConfig = {
  basePath,
  output: "standalone",
  serverExternalPackages: ["sharp"],
  experimental: {
    // фото товаров грузятся через server action
    serverActions: { bodySizeLimit: "30mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: `frame-ancestors ${frameAncestors}` },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
