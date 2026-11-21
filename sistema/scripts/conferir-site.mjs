// Confere o site construído (dist): serve como a Vercel (cleanUrls), roda o axe
// em cada página no computador (1440) e no celular (390), procura rolagem lateral
// e erros no console. Uso: pnpm --filter @t3jus/site build && node scripts/conferir-site.mjs [pasta-das-capturas]
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { chromium } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

const DIST = new URL("../apps/site/dist/", import.meta.url).pathname;
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain" };
const servidor = createServer(async (req, res) => {
  let caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (caminho === "/") caminho = "/index.html";
  else if (!extname(caminho)) caminho += ".html";
  try {
    const corpo = await readFile(join(DIST, caminho));
    res.writeHead(200, { "content-type": TIPOS[extname(caminho)] ?? "application/octet-stream" });
    res.end(corpo);
  } catch {
    res.writeHead(404).end("não encontrado");
  }
}).listen(0);
const base = `http://localhost:${servidor.address().port}`;
const capturas = process.argv[2];
const paginas = ["/", "/como-funciona", "/para-quem-e", "/demonstracao"];
const telas = { computador: { width: 1440, height: 900 }, celular: { width: 390, height: 844 } };

const navegador = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
let falhas = 0;
for (const [nome, viewport] of Object.entries(telas)) {
  const contexto = await navegador.newContext({ viewport });
  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on("pageerror", (e) => erros.push(e.message));
  pagina.on("console", (m) => m.type() === "error" && !m.text().startsWith("Failed to load resource") && erros.push(m.text()));
  // O medidor de visitas (/_vercel/insights) só existe na Vercel.
  pagina.on("response", (r) => r.status() >= 400 && !r.url().includes("/_vercel/") && erros.push(`${r.status()} ${r.url()}`));
  pagina.on("requestfailed", (r) => erros.push("falhou " + r.url()));
  for (const rota of paginas) {
    const r = await pagina.goto(base + rota, { waitUntil: "networkidle" });
    const lateral = await pagina.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const axe = await new AxeBuilder({ page: pagina }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    const ruins = erros.filter((e) => !e.includes("_vercel"));
    const ok = r?.status() === 200 && !lateral && axe.violations.length === 0 && ruins.length === 0;
    if (!ok) falhas++;
    console.log(`${ok ? "ok   " : "FALHA"} ${nome} ${rota} status=${r?.status()} lateral=${lateral} axe=${axe.violations.map((v) => v.id).join(",") || 0} erros=${ruins.join(" | ") || 0}`);
    erros.length = 0;
    if (capturas) await pagina.screenshot({ path: `${capturas}/${(rota.slice(1) || "inicio")}-${nome}.png`, fullPage: true });
  }
  await contexto.close();
}
await navegador.close();
servidor.close();
process.exit(falhas ? 1 : 0);
