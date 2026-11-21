// Cadastrar interessado à mão (F2.5) e o sino do Console (F2.6), telas aprovadas em
// docs/design/aprovadas/console-interessado-sino. A API é simulada; aqui se testa a tela, a
// acessibilidade e o que ela manda ao servidor.
import { expect, test, type Page } from "@playwright/test";
import { C, CA, IN, SESSAO, semViolacoes, simular } from "./console-dados.ts";

const ADM = { ...SESSAO, acoes: ["console.interessados.ver"] };
const SUP = { ...SESSAO, nome: "Bruno Seixas", funcoes: ["SUPORTE"], acoes: ["console.suporte.ver"] };
const hojeBr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const dia = (n: number) => new Date(Date.parse(`${hojeBr}T12:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);
const PESSOAS = [{ id: CA.pessoaId, nome: CA.nome, funcoes: ["ADMINISTRACAO"] }, { id: IN.pessoaId, nome: IN.nome, funcoes: ["IMPLANTACAO"] }];
const LISTA = { hoje: hojeBr, podeEditar: true, interessados: [], pessoas: PESSOAS, mes: { pedidos: 0, site: 0, clientes: 0 } };
const NOVO = "f0000000-0000-4000-8000-000000000009";
const IPE = "f0000000-0000-4000-8000-000000000002";
const REPETIDO = {
  id: IPE, nome: "Henrique Moura", escritorio: "Ipê & Moura Advogados", estagio: "EM_CONTATO", origem: "SITE", cidade: "Teresina", uf: "PI",
  chegouEm: `${dia(-10)}T19:42:00Z`, email: "henrique@ipemoura.exemplo.com.br", whats: "+5586995612087", versao: 3, campo: "whats", responsavel: IN.nome,
};

async function preencher(page: Page) {
  const j = page.getByRole("dialog", { name: "Cadastrar interessado" });
  await j.getByLabel("Nome da pessoa").fill("Tomás Lins");
  await j.getByLabel("Escritório").fill("Aroeira & Lins Advogados");
  await j.getByLabel(/^WhatsApp/).fill("(86) 99561-2087");
  await j.getByRole("radio", { name: /^2 a 5/ }).check();
  await j.getByRole("radio", { name: /^Indicação/ }).check();
  await j.getByLabel("De onde veio, em detalhe").fill("Indicação de Patrícia Nóbrega, da Umbu");
  await j.getByRole("radio", { name: /^Ainda não/ }).check();
  return j;
}

test.describe("Console: cadastrar interessado à mão", () => {
  test("confere os campos na tela, sem mandar nada ao servidor", async ({ page }) => {
    const pedidos = await simular(page, { "/v1/sessao": { corpo: ADM }, "/v1/interessados": { corpo: LISTA } });
    await page.goto(`${C}/interessados`);
    await page.getByRole("button", { name: "Cadastrar interessado" }).first().click();
    const j = page.getByRole("dialog", { name: "Cadastrar interessado" });
    await expect(j).toBeVisible();
    await expect(j.getByLabel("Data do contato")).toHaveValue(br(hojeBr));
    await expect(j.getByLabel("Próximo passo")).toHaveValue("Fazer o primeiro contato");
    await expect(j.getByLabel("Responsável")).toHaveValue(CA.pessoaId);
    await semViolacoes(page);

    await j.getByLabel("Data do contato").fill(br(dia(1)));
    await j.getByRole("button", { name: "Cadastrar interessado" }).click();
    await expect(j.getByText(/Falta acertar \d+ pontos/)).toBeVisible();
    await expect(j.getByText("Preencha o e-mail ou o WhatsApp.").first()).toBeVisible();
    await expect(j.getByText("Escreva uma data até hoje, como 21/11/2026.")).toBeVisible();
    await expect(j.getByLabel("Data do contato")).toHaveAttribute("aria-invalid", "true");
    expect(pedidos.filter((p) => p.metodo === "POST")).toHaveLength(0);
    await semViolacoes(page);
  });

  test("repetido: avisa, junta ao existente e leva à ficha dele", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: ADM },
      "/v1/interessados": { corpo: LISTA },
      "POST /v1/interessados": { corpo: { repetido: REPETIDO } },
      [`POST /v1/interessados/${IPE}/juntar`]: { corpo: { id: IPE } },
      [`/v1/interessados/${IPE}`]: { status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } },
    });
    await page.goto(`${C}/interessados`);
    await page.getByRole("button", { name: "Cadastrar interessado" }).first().click();
    const j = await preencher(page);
    await j.getByRole("button", { name: "Cadastrar interessado" }).click();
    await expect(j.getByText("Já existe um interessado com este WhatsApp.")).toBeVisible();
    await expect(j.getByRole("button", { name: "É outro escritório: cadastrar mesmo assim" })).toBeVisible();
    const post = pedidos.find((p) => p.metodo === "POST")!;
    expect(post.corpo).toMatchObject({ whats: "(86) 99561-2087", origem: "INDICACAO", sabe: false, quando: hojeBr, responsavel: CA.pessoaId, passoData: expect.any(String), forcar: false });
    await semViolacoes(page);

    await j.getByRole("button", { name: "Juntar ao existente" }).click();
    await page.waitForURL(`**/interessados/${IPE}?juntado=1`);
    const juntar = pedidos.find((p) => p.caminho.endsWith("/juntar"))!;
    expect(juntar.corpo).toMatchObject({ nome: "Tomás Lins", detalhe: "Indicação de Patrícia Nóbrega, da Umbu" });
    expect(juntar.corpo).not.toHaveProperty("responsavel");
  });

  test("cadastrar mesmo assim manda forcar e abre a ficha nova", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: ADM },
      "/v1/interessados": { corpo: LISTA },
      "POST /v1/interessados": [{ corpo: { repetido: REPETIDO } }, { status: 201, corpo: { id: NOVO } }],
      [`/v1/interessados/${NOVO}`]: { status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } },
    });
    await page.goto(`${C}/interessados`);
    await page.getByRole("button", { name: "Cadastrar interessado" }).first().click();
    const j = await preencher(page);
    await j.getByLabel("Responsável").selectOption(IN.pessoaId);
    await j.getByRole("button", { name: "Cadastrar interessado" }).click();
    await j.getByRole("button", { name: "É outro escritório: cadastrar mesmo assim" }).click();
    await page.waitForURL(`**/interessados/${NOVO}?novo=1`);
    const posts = pedidos.filter((p) => p.metodo === "POST" && p.caminho === "/v1/interessados");
    expect(posts.at(-1)!.corpo).toMatchObject({ forcar: true, responsavel: IN.pessoaId });
  });

  test("o banco recusa um campo: o erro fica preso a ele", async ({ page }) => {
    await simular(page, {
      "/v1/sessao": { corpo: ADM },
      "/v1/interessados": { corpo: LISTA },
      "POST /v1/interessados": { status: 400, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { campos: ["responsavel"] } } } },
    });
    await page.goto(`${C}/interessados`);
    await page.getByRole("button", { name: "Cadastrar interessado" }).first().click();
    const j = await preencher(page);
    await j.getByRole("button", { name: "Cadastrar interessado" }).click();
    await expect(j.getByLabel("Responsável")).toHaveAttribute("aria-invalid", "true");
    await expect(j.getByText("Só quem vê Interessados pode ser responsável.")).toBeVisible();
    await semViolacoes(page);
  });
});

const AVISOS = {
  novos: 2, total: 3, veInteressados: true,
  itens: [
    { id: "a1", tipo: "INTERESSADO_NOVO", dados: { escritorio: "Jatobá Advocacia", nome: "Lívia Prado", tamanho: "DE_6_A_10", trecho: "Queremos ver o financeiro.", prazo: dia(1) },
      interessadoId: "f0000000-0000-4000-8000-000000000001", em: new Date().toISOString(), lido: false, agora: null },
    { id: "a2", tipo: "INTERESSADO_ATRIBUIDO", dados: { escritorio: "Ipê & Moura Advogados", quem: "Inês Nogueira", recado: "Você conhece a sócia." },
      interessadoId: IPE, em: new Date(Date.now() - 60_000).toISOString(), lido: false, agora: null },
    { id: "a3", tipo: "INTERESSADO_VENCIDO", dados: { escritorio: "Angico Advocacia", nome: "Débora Sales", passo: "Mandar o vídeo", data: dia(-1), responsavel: CA.nome },
      interessadoId: "f0000000-0000-4000-8000-000000000003", em: `${dia(-1)}T13:00:00Z`, lido: true, agora: null },
  ],
};

const sino = (page: Page) => page.getByRole("button", { name: /^Avisos,/ }).filter({ visible: true });

test.describe("Console: sino de avisos", () => {
  test("abre com os avisos, filtra os não lidos e marca todos como lidos", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: ADM },
      "/v1/interessados": { corpo: LISTA },
      "/v1/avisos": { corpo: AVISOS },
      "POST /v1/avisos/lidos": { corpo: { ...AVISOS, novos: 0, marcados: 2, itens: AVISOS.itens.map((a) => ({ ...a, lido: true })) } },
    });
    await page.goto(`${C}/interessados`);
    await expect(sino(page)).toHaveAccessibleName("Avisos, 2 novos");
    await sino(page).click();
    const painel = page.getByRole("dialog", { name: "Avisos" });
    await expect(painel).toBeVisible();
    await expect(painel.getByText("Pedido de demonstração pelo site:")).toBeVisible();
    await expect(painel.getByText("Você conhece a sócia.")).toBeVisible();
    await expect(painel.getByText("Sem responsável")).toBeVisible();
    await semViolacoes(page);

    await painel.getByRole("button", { name: /Não lidos/ }).click();
    await expect(painel.locator(".si-item")).toHaveCount(2);
    await painel.getByRole("button", { name: "Marcar todos como lidos" }).click();
    await expect(painel.getByText("2 avisos marcados como lidos.")).toBeVisible();
    expect(pedidos.find((p) => p.caminho === "/v1/avisos/lidos")!.corpo).toEqual({ ate: AVISOS.itens[0]!.em });
    await expect(sino(page)).toHaveAccessibleName("Avisos, nenhum novo");
    await semViolacoes(page);

    await page.keyboard.press("Escape");
    await expect(painel).toBeHidden();
    await expect(sino(page)).toBeFocused();
  });

  test("abrir um aviso marca como lido e leva à ficha", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: ADM },
      "/v1/interessados": { corpo: LISTA },
      "/v1/avisos": { corpo: AVISOS },
      "POST /v1/avisos/a2/lido": { corpo: { ...AVISOS, novos: 1 } },
      [`/v1/interessados/${IPE}`]: { status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } },
    });
    await page.goto(`${C}/interessados`);
    await sino(page).click();
    await page.getByRole("link", { name: /passou para você o interessado/ }).click();
    await page.waitForURL(`**/interessados/${IPE}`);
    expect(pedidos.some((p) => p.metodo === "POST" && p.caminho === "/v1/avisos/a2/lido")).toBe(true);
  });

  test("quem não vê Interessados: sino vazio, explicando o que entra depois", async ({ page }) => {
    await simular(page, {
      "/v1/sessao": { corpo: SUP },
      "/v1/avisos": { corpo: { novos: 0, total: 0, veInteressados: false, itens: [] } },
    });
    await page.goto(`${C}/suporte`);
    await sino(page).click();
    const painel = page.getByRole("dialog", { name: "Avisos" });
    await expect(painel.getByRole("heading", { name: "Nenhum aviso para você por enquanto." })).toBeVisible();
    await expect(painel.getByText(/Em estudo: fatura de escritório em atraso/)).toBeVisible();
    await semViolacoes(page);
  });

  test("o servidor não responde: o sino diz e deixa tentar de novo", async ({ page }) => {
    await simular(page, {
      "/v1/sessao": { corpo: ADM },
      "/v1/interessados": { corpo: LISTA },
      // Falha ao abrir a página e ao abrir o sino (que recarrega); o terceiro pedido responde.
      "/v1/avisos": [{ status: 500, corpo: { erro: { codigo: "INTERNAL" } } }, { status: 500, corpo: { erro: { codigo: "INTERNAL" } } }, { corpo: AVISOS }],
    });
    await page.goto(`${C}/interessados`);
    await sino(page).click();
    const painel = page.getByRole("dialog", { name: "Avisos" });
    await expect(painel.getByRole("heading", { name: "Não deu para carregar os avisos" })).toBeVisible();
    await semViolacoes(page);
    await painel.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(painel.getByText("Você conhece a sócia.")).toBeVisible();
  });
});
