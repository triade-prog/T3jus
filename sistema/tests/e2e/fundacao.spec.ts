// F0.8 e F0.9: os dois apps no ar com os cabeçalhos de segurança, sem erro de acessibilidade
// e com o repasse /api fechado quando falta configuração.
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const APPS = [
  // O Início do Portal (PA-01) abre na moldura; sem a API, com o aviso e o que vem.
  { nome: "Portal do advogado", url: "http://localhost:3000", titulo: "O Início está sendo preparado" },
  // A página inicial do Console é a carteira (F1.5); aqui, sem a API, ela abre com o aviso.
  { nome: "Console T3jus", url: "http://localhost:3001", titulo: "Carteira de escritórios" },
];

for (const app of APPS) {
  test.describe(app.nome, () => {
    test("cabeçalhos de segurança e CSP com nonce", async ({ page }) => {
      // Script ou estilo barrado pela CSP aparece como erro no console.
      const erros: string[] = [];
      // O 503 do repasse sem configuração (último teste abaixo) não é erro de CSP.
      page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("status of 503")) erros.push(m.text()); });
      const resposta = await page.goto(app.url);
      await page.waitForLoadState("networkidle");
      expect(resposta?.status()).toBe(200);
      const h = resposta!.headers();
      expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
      expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
      expect(h["x-frame-options"]).toBe("DENY");
      expect(h["x-content-type-options"]).toBe("nosniff");
      expect(h["x-robots-tag"]).toBe("noindex, nofollow");
      expect(h["x-powered-by"]).toBeUndefined();
      await expect(page.getByRole("heading", { level: 1, name: app.titulo })).toBeVisible();
      expect(erros).toEqual([]);
    });

    test("o nonce muda a cada página", async ({ request }) => {
      const nonce = async () => (await request.get(app.url)).headers()["content-security-policy"]?.match(/'nonce-([^']+)'/)?.[1];
      expect(await nonce()).not.toBe(await nonce());
    });

    test("sem erro de acessibilidade (axe, WCAG 2.2 AA)", async ({ page }) => {
      await page.goto(app.url);
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(r.violations).toEqual([]);
    });

    test("o repasse /api não chama nada sem a configuração do servidor", async ({ request }) => {
      const r = await request.get(`${app.url}/api/v1/saude`);
      expect(r.status()).toBe(503);
      expect(await r.json()).toEqual({ erro: { codigo: "UPSTREAM_UNAVAILABLE" } });
    });
  });
}
