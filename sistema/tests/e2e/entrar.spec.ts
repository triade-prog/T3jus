// Tela de entrar do Portal e do Console (tela aprovada: docs/design/aprovadas/entrar.html).
// A API é simulada aqui (page.route): o que se testa é a tela, a acessibilidade e o que ela
// manda para o servidor. As regras de login estão nos testes Deno das APIs.
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const APPS = [
  { nome: "Portal do advogado", url: "http://localhost:3000", destaque: "num só lugar." },
  { nome: "Console T3jus", url: "http://localhost:3001", destaque: "num só lugar." },
];

async function simular(page: Page, caminho: string, status: number, corpo: unknown, pedidos?: unknown[]) {
  await page.route(`**/api${caminho}`, async (rota) => {
    pedidos?.push(rota.request().postDataJSON());
    await rota.fulfill({ status, contentType: "application/json", body: JSON.stringify(corpo) });
  });
}

for (const app of APPS) {
  test.describe(`${app.nome}: entrar`, () => {
    test("a tela aprovada abre, sem erro de CSP nem de acessibilidade", async ({ page }) => {
      const erros: string[] = [];
      page.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });
      const r = await page.goto(`${app.url}/entrar`);
      expect(r?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: "Entrar" })).toBeVisible();
      await expect(page.getByText(app.nome, { exact: true })).toBeVisible();
      await expect(page.getByLabel("E-mail")).toBeVisible();
      await expect(page.getByRole("checkbox", { name: "Manter conectado" })).toBeChecked();
      await expect(page.getByRole("button", { name: /Receber link de acesso por e.mail/ })).toBeVisible();
      // As fontes da identidade vêm do próprio app (a CSP só aceita fonte de 'self').
      expect(await page.evaluate(() => document.fonts.check('500 48px "Alegreya"'))).toBe(true);
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(axe.violations).toEqual([]);
      // Nada passa da largura da tela (sem rolagem lateral).
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(erros).toEqual([]);
    });

    test("senha errada mostra o texto do erro, sem dizer se a conta existe", async ({ page }) => {
      await simular(page, "/v1/auth/entrar", 401, { erro: { codigo: "INVALID_CREDENTIALS" } });
      await page.goto(`${app.url}/entrar`);
      await page.getByLabel("E-mail").fill("ana@exemplo.invalid");
      await page.getByLabel("Senha", { exact: true }).fill("errada");
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await expect(page.locator(".ac-aviso-erro")).toHaveText("O e-mail ou a senha não conferem. Confira e tente de novo.");
    });

    test("mostrar a senha e manter conectado vão como a pessoa escolheu", async ({ page }) => {
      const pedidos: unknown[] = [];
      await simular(page, "/v1/auth/entrar", 200, { etapa: "CODIGO" }, pedidos);
      await page.goto(`${app.url}/entrar`);
      const senha = page.getByLabel("Senha", { exact: true });
      await page.getByLabel("E-mail").fill("ana@exemplo.invalid");
      await senha.fill("minha-senha");
      await page.getByRole("button", { name: /Mostrar/ }).click();
      await expect(senha).toHaveAttribute("type", "text");
      await page.getByRole("checkbox", { name: "Manter conectado" }).uncheck();
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Código do autenticador" })).toBeFocused();
      expect(pedidos).toEqual([{ email: "ana@exemplo.invalid", senha: "minha-senha", manterConectado: false }]);
    });

    test("link de acesso pede o e-mail antes e responde sem dizer se a conta existe", async ({ page }) => {
      const pedidos: unknown[] = [];
      await simular(page, "/v1/auth/link", 200, { mensagem: "Se este e-mail tiver acesso, enviamos um link para entrar." }, pedidos);
      await page.goto(`${app.url}/entrar`);
      await page.getByRole("button", { name: /Receber link de acesso por e.mail/ }).click();
      await expect(page.getByLabel("E-mail")).toBeFocused();
      await expect(page.getByText("Digite o e-mail para receber o link de acesso.")).toBeVisible();
      await page.getByLabel("E-mail").fill("ana@exemplo.invalid");
      await page.getByRole("button", { name: /Receber link de acesso por e.mail/ }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Confira o e-mail" })).toBeVisible();
      await expect(page.getByRole("status")).toContainText("Se este e-mail tiver acesso");
      expect(pedidos).toEqual([{ email: "ana@exemplo.invalid", manterConectado: true }]);
    });

    test("esqueci a senha, no mesmo cartão", async ({ page }) => {
      await simular(page, "/v1/auth/recuperar", 200, { mensagem: "Se este e-mail tiver acesso ao T3jus, enviamos um link." });
      await page.goto(`${app.url}/entrar`);
      await page.getByRole("button", { name: "Esqueci a senha" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Criar senha nova" })).toBeVisible();
      await page.getByLabel("E-mail").fill("ana@exemplo.invalid");
      await page.getByRole("button", { name: "Enviar link" }).click();
      await expect(page.getByRole("status")).toContainText("enviamos um link");
      await page.getByRole("button", { name: "Voltar para entrar" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Entrar" })).toBeVisible();
    });

    test("link vencido volta para entrar com o aviso", async ({ page }) => {
      await simular(page, "/v1/auth/link/usar", 410, { erro: { codigo: "TOKEN_INVALID" } });
      await page.goto(`${app.url}/entrar/link?token_hash=token-vencido-0000000001`);
      await expect(page.locator(".ac-aviso-erro")).toHaveText("Este link já foi usado ou venceu. Peça um novo.");
      await expect(page).toHaveURL(`${app.url}/entrar`);
    });
  });
}

test("Console: primeiro acesso mostra o QR code do autenticador", async ({ page }) => {
  await simular(page, "/v1/auth/entrar", 200, { etapa: "CADASTRAR_AUTENTICADOR" });
  await simular(page, "/v1/auth/autenticador/cadastrar", 200, { factorId: "4f1a7d4c-9b5e-4a6f-9c2d-5e6f7a8b9c0d", qrCode: "<svg xmlns='http://www.w3.org/2000/svg'/>", segredo: "SEGREDO123" });
  await page.goto("http://localhost:3001/entrar");
  await page.getByLabel("E-mail").fill("carol@t3jus.exemplo");
  await page.getByLabel("Senha", { exact: true }).fill("senha-forte");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Cadastrar o autenticador" })).toBeVisible();
  await expect(page.getByRole("img", { name: "QR code para cadastrar o autenticador" })).toBeVisible();
  await expect(page.getByText("SEGREDO123")).toBeVisible();
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(axe.violations).toEqual([]);
});
