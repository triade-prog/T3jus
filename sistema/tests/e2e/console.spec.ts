// Console: carteira de escritórios e ficha do cliente, aba Sócio (telas aprovadas:
// docs/design/aprovadas/console-carteira.html e console-ficha.html). A API é simulada
// (page.route): aqui se testa a tela, a acessibilidade e o que ela manda para o servidor. As
// regras de quem vê o quê estão nos testes do banco e das APIs.
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const C = "http://localhost:3001";
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const agora = Date.now();
const h = (n: number) => new Date(agora - n * 3600e3).toISOString();
const d = (n: number) => h(n * 24);
const id = (n: number) => `e0000000-0000-4000-8000-00000000000${n}`;
const CA = { pessoaId: "c0000000-0000-4000-8000-000000000001", nome: "Carol Andrade", funcoes: ["ADMINISTRACAO"] };
const IN = { pessoaId: "c0000000-0000-4000-8000-000000000002", nome: "Inês Nogueira", funcoes: ["IMPLANTACAO"] };
const socio = (n: number, nome: string, desde: string, senha: string | null) => ({
  vinculoId: `f0000000-0000-4000-8000-00000000000${n}`, pessoaId: `a0000000-0000-4000-8000-00000000000${n}`, nome, desde,
  conviteEnviadoEm: desde, convidadoPor: "Carol Andrade", senhaCriadaEm: senha,
});
const base = { cidade: "Recife", uf: "PE", funcoes: ["ADMINISTRACAO"], equipe: [CA] };
const CLIENTES = [
  { ...base, id: id(1), nome: "Jatobá Advogados", estagio: "IMPLANTACAO", situacoes: ["SEM_SOCIO", "SEM_CONTATO", "SEM_CONTRATO"], criadoEm: d(3), socios: [], ultimaAtividade: d(3) },
  { ...base, id: id(2), nome: "Cedro & Lima Advocacia", estagio: "IMPLANTACAO", situacoes: [], criadoEm: d(14), socios: [socio(2, "Renata Lima", d(6), null)], equipe: [CA, IN], ultimaAtividade: d(4) },
  { ...base, id: id(3), nome: "Ribeiro & Matos Advocacia", cidade: "São Paulo", uf: "SP", estagio: "IMPLANTACAO", situacoes: [], criadoEm: d(20), socios: [socio(3, "Marina Ribeiro", d(12), d(11))], ultimaAtividade: h(3) },
  { ...base, id: id(4), nome: "Aroeira Sociedade de Advogados", cidade: "Belo Horizonte", uf: "MG", estagio: "ATIVO", situacoes: [], criadoEm: d(90), socios: [socio(4, "Paulo Aroeira", d(80), d(77))], ultimaAtividade: d(1) },
];
const SESSAO = { pessoaId: CA.pessoaId, nome: "Carol Andrade", funcoes: ["ADMINISTRACAO"], acoes: [] };
const PERMISSOES = ["console.estagio.mudar", "console.ficha.ver", "console.notas.ver", "console.socios.convidar"];

function ficha(c: (typeof CLIENTES)[number], permissoes = PERMISSOES) {
  return {
    escritorio: { id: c.id, nome: c.nome, cidade: c.cidade, uf: c.uf, cnpj: "22914870000166", criadoEm: c.criadoEm, versao: 3 },
    cliente: { estagio: c.estagio, referenciaContrato: "Contrato 2026/031", versao: 2 },
    socios: c.socios.map((s) => ({ ...s, email: "renata@cedroelima.adv.br" })),
    equipe: c.equipe.map((p) => ({ vinculoId: p.pessoaId, pessoaId: p.pessoaId, nome: p.nome, funcao: p.funcoes[0] })),
    situacoes: c.situacoes, ultimaAtividade: c.ultimaAtividade, permissoes,
  };
}

type Resposta = { status?: number; corpo: unknown };
async function simular(page: Page, rotas: Record<string, Resposta | Resposta[]>, pedidos: { metodo: string; caminho: string; corpo: unknown }[] = []) {
  await page.route("**/api/v1/**", async (rota) => {
    const url = new URL(rota.request().url());
    const caminho = url.pathname.replace(/^\/api/, "");
    const metodo = rota.request().method();
    pedidos.push({ metodo, caminho, corpo: rota.request().postDataJSON() });
    const r = rotas[`${metodo} ${caminho}`] ?? rotas[caminho];
    const lista = Array.isArray(r) ? r : r ? [r] : [{ status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } }];
    const vez = pedidos.filter((p) => p.caminho === caminho && p.metodo === metodo).length - 1;
    const x = lista[Math.min(vez, lista.length - 1)]!;
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return pedidos;
}

async function semViolacoes(page: Page) {
  const axe = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(axe.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test.describe("Console: carteira de escritórios", () => {
  test("mostra só a carteira da pessoa, com resumo, o que pede agora, filtro e busca", async ({ page }) => {
    await simular(page, { "/v1/sessao": { corpo: SESSAO }, "/v1/clientes": { corpo: { clientes: CLIENTES } } });
    await page.goto(`${C}/`);
    await expect(page.getByRole("heading", { level: 1, name: "Carteira de escritórios" })).toBeVisible();
    await expect(page.locator(".quem strong")).toHaveText("Carol Andrade");
    await expect(page.getByRole("button", { name: /Todos os escritórios/ })).toContainText("4");
    await expect(page.getByRole("button", { name: /Com pendência/ })).toContainText("2");
    const pedem = page.getByRole("region", { name: /Pedem você agora/ });
    await expect(pedem.getByRole("link")).toHaveCount(3);
    await expect(pedem.getByRole("link").first()).toContainText("Passar para ativo");
    await expect(pedem.getByRole("link").first()).toHaveAttribute("href", `/clientes/${id(3)}/socio`);
    // Pendências primeiro: Jatobá (3) vem antes.
    const linhas = page.locator("tbody tr");
    await expect(linhas).toHaveCount(4);
    await expect(linhas.first()).toContainText("Jatobá Advogados");
    await expect(linhas.first()).toContainText("Ainda não convidado");
    await expect(page.locator("tbody tr", { hasText: "Cedro" })).toContainText("Link do convite venceu");
    await semViolacoes(page);

    await page.getByRole("button", { name: /Ativos/ }).click();
    await expect(linhas).toHaveCount(1);
    await expect(linhas.first()).toContainText("Aroeira");
    await page.getByRole("button", { name: /Todos os escritórios/ }).click();
    await page.getByLabel("Buscar na carteira").fill("sao paulo");
    await expect(linhas).toHaveCount(1);
    await expect(linhas.first()).toContainText("Ribeiro");
    await page.getByLabel("Buscar na carteira").fill("nada disso");
    await expect(page.getByText("Nenhum escritório encontrado")).toBeVisible();
  });

  test("carteira vazia explica o que fazer", async ({ page }) => {
    await simular(page, { "/v1/sessao": { corpo: SESSAO }, "/v1/clientes": { corpo: { clientes: [] } } });
    await page.goto(`${C}/`);
    await expect(page.getByText("Nenhum escritório com você ainda")).toBeVisible();
    await expect(page.getByText("Nenhuma implantação esperando por você.")).toBeVisible();
    await semViolacoes(page);
  });

  test("sem sessão, volta para a tela de entrar", async ({ page }) => {
    await simular(page, { "/v1/sessao": { status: 401, corpo: { erro: { codigo: "UNAUTHORIZED" } } }, "/v1/clientes": { status: 401, corpo: { erro: { codigo: "UNAUTHORIZED" } } } });
    await page.goto(`${C}/`);
    await expect(page).toHaveURL(`${C}/entrar`);
  });
});

test.describe("Console: ficha do cliente, aba Sócio", () => {
  test("convite pendente: caminho do convite e reenviar", async ({ page }) => {
    const c = CLIENTES[1]!;
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: SESSAO },
      [`/v1/clientes/${c.id}`]: { corpo: ficha(c) },
      [`/v1/clientes/${c.id}/notas`]: { corpo: { notas: [{ id: "n1", texto: "Prefere WhatsApp depois das 17h.", criadoEm: d(2), autor: { id: IN.pessoaId, nome: "Inês Nogueira" } }] } },
      [`POST /v1/clientes/${c.id}/socios/${c.socios[0]!.vinculoId}/reenviar`]: { corpo: { enviado: true } },
    });
    await page.goto(`${C}/clientes/${c.id}`);
    await expect(page).toHaveURL(`${C}/clientes/${c.id}/socio`);
    await expect(page.getByRole("heading", { level: 1, name: c.nome })).toBeVisible();
    await expect(page.getByText("3 de 4")).toBeVisible();
    await expect(page.getByRole("link", { name: /Sócio/ })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "Renata Lima" })).toBeVisible();
    await expect(page.getByText("Link do convite venceu")).toBeVisible();
    await expect(page.getByText("renata@cedroelima.adv.br")).toBeVisible();
    await expect(page.getByText("Prefere WhatsApp depois das 17h.")).toBeVisible();
    const ativar = page.getByRole("button", { name: "Passar para ativo" });
    await expect(ativar).toHaveAttribute("aria-disabled", "true");
    await semViolacoes(page);

    await page.getByRole("button", { name: "Reenviar convite por e-mail" }).click();
    await expect(page.getByText("Convite reenviado para renata@cedroelima.adv.br. O link novo vale por 1 hora.")).toBeVisible();
    expect(pedidos.filter((p) => p.metodo === "POST").map((p) => p.caminho)).toEqual([`/v1/clientes/${c.id}/socios/${c.socios[0]!.vinculoId}/reenviar`]);
  });

  test("sem sócio: confere o formulário antes de mandar o convite", async ({ page }) => {
    const c = CLIENTES[0]!;
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: SESSAO },
      [`/v1/clientes/${c.id}`]: { corpo: ficha(c) },
      [`/v1/clientes/${c.id}/notas`]: { corpo: { notas: [] } },
      [`POST /v1/clientes/${c.id}/socios`]: { status: 201, corpo: { vinculoId: "v", contaNova: true } },
    });
    await page.goto(`${C}/clientes/${c.id}/socio`);
    await expect(page.getByRole("heading", { name: "Convidar o sócio dono" })).toBeVisible();
    await page.getByLabel("Nome completo").fill("Marcos Jatobá");
    await page.getByLabel("E-mail").fill("marcos@jatoba");
    await page.getByRole("button", { name: "Enviar convite" }).click();
    await expect(page.getByText(/Confira o e-mail/)).toBeVisible();
    await expect(page.getByLabel("E-mail")).toHaveAttribute("aria-invalid", "true");
    expect(pedidos.filter((p) => p.metodo === "POST")).toEqual([]);
    await semViolacoes(page);

    await page.getByLabel("E-mail").fill("marcos@jatoba.adv.br");
    await page.getByRole("button", { name: "Enviar convite" }).click();
    await expect(page.getByText("Convite enviado para marcos@jatoba.adv.br. O link vale por 1 hora.")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")?.corpo).toEqual({ nome: "Marcos Jatobá", email: "marcos@jatoba.adv.br" });
  });

  test("implantação pronta: passar para ativo manda a versão lida", async ({ page }) => {
    const c = CLIENTES[2]!;
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: SESSAO },
      [`/v1/clientes/${c.id}`]: [{ corpo: ficha(c) }, { corpo: { ...ficha(c), cliente: { estagio: "ATIVO", referenciaContrato: "Contrato 2026/031", versao: 3 } } }],
      [`/v1/clientes/${c.id}/notas`]: { corpo: { notas: [] } },
      [`PUT /v1/clientes/${c.id}/estagio`]: { corpo: { versao: 3 } },
    });
    await page.goto(`${C}/clientes/${c.id}/socio`);
    await expect(page.getByText("4 de 4")).toBeVisible();
    await expect(page.getByText("Entrou no Portal")).toBeVisible();
    await page.getByRole("button", { name: "Passar para ativo" }).click();
    await expect(page.getByText("Concluída")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "PUT")?.corpo).toEqual({ versao: 2, estagio: "ATIVO" });
  });

  test("abas sem tela aprovada avisam; aba inexistente não existe", async ({ page }) => {
    const c = CLIENTES[3]!;
    await simular(page, { "/v1/sessao": { corpo: SESSAO }, [`/v1/clientes/${c.id}`]: { corpo: ficha(c, ["console.ficha.ver"]) } });
    await page.goto(`${C}/clientes/${c.id}/historico`);
    await expect(page.getByRole("heading", { level: 2, name: "Histórico" })).toBeVisible();
    await expect(page.getByText(/chega depois da aprovação/)).toBeVisible();
    await semViolacoes(page);
    const r = await page.goto(`${C}/clientes/${c.id}/qualquer`);
    expect(r?.status()).toBe(404);
  });

  test("cliente fora da carteira: aviso sem detalhes", async ({ page }) => {
    await simular(page, { "/v1/sessao": { corpo: SESSAO }, [`/v1/clientes/${id(9)}`]: { status: 403, corpo: { erro: { codigo: "FORBIDDEN" } } } });
    await page.goto(`${C}/clientes/${id(9)}/socio`);
    await expect(page.getByText("Este escritório não está na sua carteira, ou o endereço está errado.")).toBeVisible();
  });
});
