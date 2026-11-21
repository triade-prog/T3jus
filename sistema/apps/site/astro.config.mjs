// Site comercial do T3jus (F2.1), publicado em https://t3jus.pro.
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";

export default defineConfig({
  site: "https://t3jus.pro",
  trailingSlash: "never",
  build: { format: "file", inlineStylesheets: "always" },
  compressHTML: true,
  // As páginas continuam estáticas; só /api/pedido-demonstracao roda no servidor (F2.2).
  adapter: vercel({ webAnalytics: { enabled: false } }),
});
