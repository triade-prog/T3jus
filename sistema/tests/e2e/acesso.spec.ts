// Nova senha, convite e escolha do escritório (telas aprovadas em 18/11/2026:
// docs/design/aprovadas/acesso/). A API é simulada (page.route): aqui se testa a tela, a
// acessibilidade e o que ela manda para o servidor. As regras estão nos testes Deno das APIs.
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { agora, fixarRelogio } from "./console-dados.ts";

const APPS = [
  { nome: "Portal do advogado", url: "http://localhost:3000", trocada: "A partir de agora, entre com a senha nova." },
  { nome: "Console T3jus", url: "http://localhost:3001", trocada: "use a senha nova e o código do autenticador" },
];
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const TOKEN = "token-de-teste-0000000001";

async function simular(page: Page, caminho: string, respostas: { status: number; corpo: unknown }[], pedidos?: unknown[]) {
  let i = 0;
  await page.route(`**/api${caminho}`, async (rota) => {
    pedidos?.push(rota.request().postDataJSON());
    const r = respostas[Math.min(i++, respostas.length - 1)]!;
    await rota.fulfill({ status: r.status, contentType: "application/json", body: JSON.stringify(r.corpo) });
  });
}

async function semViolacoes(page: Page) {
  const axe = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(axe.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

for (const app of APPS) {
  test.describe(`${app.nome}: nova senha e convite`, () => {
    test("nova senha: abre o link, mostra as regras e confere antes de salvar", async ({ page }) => {
      const abrir: unknown[] = [];
      const salvar: unknown[] = [];
      await simular(page, "/v1/auth/redefinir/abrir", [{ status: 200, corpo: { email: "ana@exemplo.invalid" } }], abrir);
      await simular(page, "/v1/auth/redefinir", [
        { status: 422, corpo: { erro: { codigo: "PASSWORD_WEAK" } } },
        { status: 200, corpo: { ok: true } },
      ], salvar);
      await page.goto(`${app.url}/redefinir?token_hash=${TOKEN}`);
      await expect(page.getByRole("heading", { level: 1, name: "Nova senha" })).toBeFocused();
      await expect(page.getByText("ana@exemplo.invalid")).toBeVisible();
      // O token sai do endereço assim que a tela abre o link.
      await expect(page).toHaveURL(`${app.url}/redefinir`);
      expect(abrir).toEqual([{ tokenHash: TOKEN }]);
      await semViolacoes(page);

      const senha = page.getByLabel("Senha nova", { exact: true });
      await senha.fill("Gabinete7");
      await expect(page.locator('[data-regra="tamanho"]')).toHaveAttribute("data-estado", "falta");
      await expect(page.locator('[data-regra="tamanho"]')).toContainText("faltam 3");
      await page.getByRole("button", { name: "Salvar senha nova" }).click();
      // Curta: o ponto é a senha (a repetição vazia só conta depois).
      await expect(page.locator(".ac-aviso-erro")).toHaveText("Falta acertar 1 ponto, marcado abaixo.");
      await expect(page.locator('[data-regra="tamanho"]')).toHaveAttribute("data-estado", "erro");
      expect(salvar).toEqual([]);

      await senha.fill("advocacia2024");
      await page.getByLabel("Repita a senha nova").fill("advocacia2025");
      await page.getByRole("button", { name: "Salvar senha nova" }).click();
      await expect(page.getByText("As duas senhas não são iguais.")).toBeVisible();
      await expect(page.getByLabel("Repita a senha nova")).toHaveAttribute("aria-invalid", "true");
      await semViolacoes(page);

      await page.getByLabel("Repita a senha nova").fill("advocacia2024");
      await page.getByRole("button", { name: "Salvar senha nova" }).click();
      await expect(page.locator('[data-regra="vazada"]')).toHaveAttribute("data-estado", "erro");
      await expect(page.locator('[data-regra="vazada"]')).toContainText("escolha outra");

      await senha.fill("marfim-ponte-42");
      await page.getByLabel("Repita a senha nova").fill("marfim-ponte-42");
      await page.getByRole("button", { name: "Salvar senha nova" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Senha trocada" })).toBeFocused();
      await expect(page.getByText(app.trocada)).toBeVisible();
      await expect(page.getByRole("status")).toContainText("saímos da sua conta nos outros aparelhos");
      expect(salvar).toEqual([{ novaSenha: "advocacia2024" }, { novaSenha: "marfim-ponte-42" }]);
      await semViolacoes(page);
    });

    test("nova senha: link vencido pede um novo ali mesmo", async ({ page }) => {
      await simular(page, "/v1/auth/redefinir/abrir", [{ status: 410, corpo: { erro: { codigo: "TOKEN_INVALID" } } }]);
      const pedidos: unknown[] = [];
      await simular(page, "/v1/auth/recuperar", [{ status: 200, corpo: { mensagem: "Se este e-mail tiver acesso ao T3jus, enviamos um link." } }], pedidos);
      await page.goto(`${app.url}/redefinir?token_hash=${TOKEN}`);
      await expect(page.getByRole("heading", { level: 1, name: "Link vencido" })).toBeVisible();
      await expect(page.getByText(/prazo de 1\u00a0hora/)).toBeVisible();
      await semViolacoes(page);
      await page.getByLabel("E-mail de acesso").fill("ana@exemplo.invalid");
      await page.getByRole("button", { name: "Pedir novo link" }).click();
      await expect(page.getByRole("status")).toContainText("enviamos um link");
      expect(pedidos).toEqual([{ email: "ana@exemplo.invalid" }]);
    });

    test("convite vencido diz para pedir outro a quem convidou", async ({ page }) => {
      await simular(page, "/v1/auth/criar-senha/abrir", [{ status: 410, corpo: { erro: { codigo: "TOKEN_INVALID" } } }]);
      await page.goto(`${app.url}/criar-senha?token_hash=${TOKEN}`);
      await expect(page.getByRole("heading", { level: 1, name: "Convite vencido" })).toBeFocused();
      await expect(page.locator(".ac-aviso-erro")).toContainText("Peça um novo a quem convidou você.");
      await semViolacoes(page);
    });
  });
}

// O relógio do navegador fica em AGORA, o mesmo instante de onde os dados contam (F3.164).
test.beforeEach(async ({ page }) => { await fixarRelogio(page); });

test("Portal: convite mostra quem convidou, pede nome e Termos, e entra", async ({ page }) => {
  const pedidos: unknown[] = [];
  await simular(page, "/v1/auth/criar-senha/abrir", [{
    status: 200, corpo: { email: "marina@exemplo.invalid", nome: "Marina", escritorio: "Almeida & Prado Advogados", quem: "Ricardo Almeida", papel: "ESCRITORIO" },
  }]);
  await simular(page, "/v1/auth/criar-senha", [{ status: 200, corpo: { etapa: "PRONTO" } }], pedidos);
  await simular(page, "/v1/sessao/escolha", [{ status: 200, corpo: { email: "marina@exemplo.invalid", escritorios: [] } }]);
  await page.goto(`http://localhost:3000/criar-senha?token_hash=${TOKEN}`);
  await expect(page.getByRole("heading", { level: 1, name: "Criar senha" })).toBeFocused();
  const painel = page.locator(".ac-convite");
  await expect(painel).toContainText("Convite de Ricardo Almeida, sócio");
  await expect(painel).toContainText("Almeida & Prado Advogados");
  await expect(painel).toContainText("para marina@exemplo.invalid");
  await expect(page.getByLabel("Seu nome")).toHaveValue("Marina");
  await semViolacoes(page);

  await page.getByLabel("Seu nome").fill("Marina Souza Lima");
  await page.getByLabel("Senha", { exact: true }).fill("marfim-ponte-42");
  await page.getByLabel("Repita a senha").fill("marfim-ponte-42");
  await page.getByRole("button", { name: "Criar senha e entrar" }).click();
  await expect(page.getByText("Aceite os Termos para continuar.")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Li e aceito/ })).toHaveAttribute("aria-invalid", "true");
  await semViolacoes(page);
  expect(pedidos).toEqual([]);

  await page.getByRole("checkbox", { name: /Li e aceito os Termos de uso/ }).check();
  await page.getByRole("button", { name: "Criar senha e entrar" }).click();
  await expect(page).toHaveURL("http://localhost:3000/escritorio");
  expect(pedidos).toEqual([{ novaSenha: "marfim-ponte-42", nome: "Marina Souza Lima", aceiteTermos: true }]);
});

test("Console: convite da equipe segue para o autenticador, com as etapas", async ({ page }) => {
  await simular(page, "/v1/auth/criar-senha/abrir", [{ status: 200, corpo: { email: "rafael@t3jus.exemplo", nome: "Rafael Teixeira" } }]);
  await simular(page, "/v1/auth/criar-senha", [{ status: 200, corpo: { etapa: "CADASTRAR_AUTENTICADOR" } }]);
  await simular(page, "/v1/auth/autenticador/cadastrar", [{
    status: 200, corpo: { factorId: "4f1a7d4c-9b5e-4a6f-9c2d-5e6f7a8b9c0d", qrCode: "<svg xmlns='http://www.w3.org/2000/svg'/>", segredo: "SEGREDO123" },
  }]);
  await page.goto(`http://localhost:3001/criar-senha?token_hash=${TOKEN}`);
  await expect(page.locator(".ac-convite")).toContainText("Convite da Equipe T3jus");
  await expect(page.locator(".ac-convite")).toContainText("Console T3jus");
  await expect(page.getByRole("list", { name: "Etapas do primeiro acesso" }).locator('[aria-current="step"]')).toContainText("Senha");
  await semViolacoes(page);
  await page.getByLabel("Senha", { exact: true }).fill("marfim-ponte-42");
  await page.getByLabel("Repita a senha").fill("marfim-ponte-42");
  await page.getByRole("checkbox", { name: /Li e aceito/ }).check();
  await page.getByRole("button", { name: "Criar senha e seguir" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Cadastrar o autenticador" })).toBeFocused();
  await expect(page.getByRole("list", { name: "Etapas do primeiro acesso" }).locator('[aria-current="step"]')).toContainText("Autenticador");
  await expect(page.getByRole("img", { name: "QR code para cadastrar o autenticador" })).toBeVisible();
  await semViolacoes(page);
});

const NOMES = [
  ["Almeida & Prado Advogados", "São Paulo", "SP"],
  ["Souza Lima Advocacia", "Campinas", "SP"],
  ["Ferraz Moura Sociedade de Advogados", "Belo Horizonte", "MG"],
  ["Castro & Nunes Advocacia Trabalhista", "Curitiba", "PR"],
  ["Ribeiro Tavares Advogados Associados", "Recife", "PE"],
  ["Mendes & Vasconcelos", "Porto Alegre", "RS"],
  ["Oliveira Barros Advocacia", "Salvador", "BA"],
  ["Duarte & Freitas Advogados", "Goiânia", "GO"],
  ["Pacheco Lins Advogados", "Fortaleza", "CE"],
] as const;
const escritorios = (n: number) =>
  NOMES.slice(0, n).map(([nome, cidade, uf], i) => ({
    id: `0000000${i}-0000-4000-8000-000000000000`, nome, cidade, uf,
    ultimaEntrada: i === n - 1 ? null : new Date(agora - i * 26 * 3600 * 1000).toISOString(),
  }));

test.describe("Portal: escolha do escritório", () => {
  test("poucos: o último usado vem primeiro, sem busca", async ({ page }) => {
    await simular(page, "/v1/sessao/escolha", [{ status: 200, corpo: { email: "marina@exemplo.invalid", escritorios: escritorios(4) } }]);
    await page.goto("http://localhost:3000/escritorio");
    await expect(page.getByRole("heading", { level: 1, name: "Qual escritório?" })).toBeFocused();
    await expect(page.getByText("Você tem acesso a 4 escritórios.", { exact: false })).toBeVisible();
    await expect(page.getByLabel("Buscar escritório")).toHaveCount(0);
    const primeiro = page.locator(".ac-esc").first();
    await expect(primeiro).toContainText("Último usado");
    await expect(primeiro).toContainText("Almeida & Prado Advogados");
    await expect(page.locator(".ac-esc").last()).toContainText("Sem entrada nos últimos 30 dias");
    await expect(page.getByText("marina@exemplo.invalid")).toBeVisible();
    await semViolacoes(page);
  });

  test("muitos: a busca filtra por nome ou cidade e a escolha vai para a sessão", async ({ page }) => {
    const pedidos: unknown[] = [];
    await simular(page, "/v1/sessao/escolha", [{ status: 200, corpo: { email: "marina@exemplo.invalid", escritorios: escritorios(9) } }]);
    await simular(page, "/v1/sessao/escritorio", [{ status: 200, corpo: { escritorioAtual: "x" } }], pedidos);
    await page.goto("http://localhost:3000/escritorio");
    const busca = page.getByLabel("Buscar escritório");
    await expect(busca).toBeVisible();
    await expect(page.getByText("Do mais recente ao mais antigo")).toBeVisible();
    await semViolacoes(page);
    await busca.fill("goiania");
    await expect(page.getByText("1 de 9 escritórios")).toBeVisible();
    await busca.fill("brasília");
    await expect(page.getByText("Nenhum escritório com “brasília”.")).toBeVisible();
    await semViolacoes(page);
    await busca.fill("recife");
    await page.getByRole("button", { name: /Ribeiro Tavares Advogados Associados/ }).click();
    await expect(page).toHaveURL("http://localhost:3000/");
    expect(pedidos).toEqual([{ escritorioId: "00000004-0000-4000-8000-000000000000" }]);
  });

  test("um escritório só: entra direto, sem perguntar", async ({ page }) => {
    const pedidos: unknown[] = [];
    await simular(page, "/v1/sessao/escolha", [{ status: 200, corpo: { email: "marina@exemplo.invalid", escritorios: escritorios(1) } }]);
    await simular(page, "/v1/sessao/escritorio", [{ status: 200, corpo: { escritorioAtual: "x" } }], pedidos);
    await page.goto("http://localhost:3000/escritorio");
    await expect(page).toHaveURL("http://localhost:3000/");
    expect(pedidos).toEqual([{ escritorioId: "00000000-0000-4000-8000-000000000000" }]);
  });

  test("sem sessão volta para entrar", async ({ page }) => {
    await simular(page, "/v1/sessao/escolha", [{ status: 401, corpo: { erro: { codigo: "UNAUTHORIZED" } } }]);
    await page.goto("http://localhost:3000/escritorio");
    await expect(page).toHaveURL("http://localhost:3000/entrar");
  });
});
