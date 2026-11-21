// Site comercial do T3jus (F2.1), publicado em https://t3jus.pro.
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://t3jus.pro",
  trailingSlash: "never",
  build: { format: "file", inlineStylesheets: "always" },
  compressHTML: true,
});
