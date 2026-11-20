// Portal v1 (telas aprovadas em docs/design/aprovadas/portal-v1): moldura em áreas com a barra
// embaixo no celular, Equipe do escritório e área Escritório com a exportação. A API é
// simulada; aqui se testa a tela, a acessibilidade e o que ela manda ao servidor.
import { expect, test, type Page } from "@playwright/test";
import { h, semViolacoes, simular } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const pid = (n: number) => `a0000000-0000-4000-8000-00000000010${n}`;
const vid = (n: number) => `b0000000-0000-4000-8000-00000000010${n}`;

const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 1, funcoes: ["SOCIO"], cnpj: "41276839000134", cidade: "São Paulo", uf: "SP",
  endereco: "Rua Cardeal Arcoverde, 1749, sala 92, Pinheiros",
  contatos: [{ nome: "Marina Ribeiro", papel: "Sócia", telefone: "+5511988123040", email: "marina@ribeiromatos.adv.br" }],
  ultimaExportacao: { em: h(26), por: "Marina Ribeiro" },
};
const LARISSA = { ...ESCRITORIO, pessoa: "Larissa Costa", dono: false, areas: ["JURIDICO"], funcoes: ["EQUIPE"], ultimaExportacao: null, outrosEscritorios: 0 };

const pessoa = (n: number, nome: string, areas: string[], senha: string | null, convite: string, dono = false) => ({
  vinculoId: vid(n), pessoaId: pid(n), nome, email: `${nome.split(" ")[0]!.toLowerCase()}@ribeiromatos.adv.br`, dono, areas,
  desde: convite, versao: 1, senhaCriadaEm: senha, conviteEnviadoEm: convite,
});
const EQUIPE = [
  pessoa(1, "Marina Ribeiro", ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"], h(900), h(900), true),
  pessoa(2, "Bianca Torres", ["CONTRATOS", "FINANCEIRO"], h(500), h(500)),
  pessoa(3, "Diego Almeida", ["COMERCIAL"], h(400), h(400)),
  pessoa(4, "Renata Lopes", ["JURIDICO"], null, h(0.25)),
  pessoa(5, "Tiago Rocha", [], null, h(5)),
];
const ehCelular = (page: Page) => (page.viewportSize()?.width ?? 1000) <= 760;

test.describe("Portal v1: moldura em áreas (PA-01)", () => {
  test("o sócio dono vê as quatro áreas e a Equipe; no celular, a barra embaixo e o Mais", async ({ page }) => {
    await simular(page, { "/v1/escritorio": { corpo: ESCRITORIO } });
    await page.goto(`${P}/contratos/modelos`);
    await expect(page.getByRole("heading", { level: 1, name: "O Contratos está sendo preparado" })).toBeVisible();
    const secoes = page.getByRole("navigation", { name: "Seções do Contratos" });
    await expect(secoes.getByRole("link", { name: "Procurações e modelos" })).toHaveAttribute("aria-current", "page");
    await semViolacoes(page);
    if (!ehCelular(page)) {
      const nav = page.getByRole("navigation", { name: "Navegação principal" });
      for (const a of ["Comercial", "Contratos", "Financeiro", "Jurídico"]) await expect(nav.getByRole("link", { name: a })).toBeVisible();
      await expect(nav.getByRole("link", { name: "Contratos" })).toHaveAttribute("aria-current", "true");
      await expect(page.getByRole("navigation", { name: "Escritório" }).getByRole("link", { name: "Equipe" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Navegação do celular" })).toBeHidden();
      return;
    }
    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeHidden();
    const mais = page.getByRole("button", { name: "Mais" });
    await expect(mais).toHaveAttribute("aria-current", "true");
    await mais.click();
    const folha = page.getByRole("dialog", { name: "Mais" });
    await expect(folha).toBeVisible();
    await expect(folha.getByRole("button", { name: "Fechar" })).toBeFocused();
    await expect(folha.getByRole("link", { name: "Contratos" })).toHaveAttribute("aria-current", "true");
    await expect(folha.getByRole("link", { name: "Equipe" })).toBeVisible();
    await semViolacoes(page);
    await page.keyboard.press("Escape");
    await expect(folha).toBeHidden();
    await expect(mais).toBeFocused();
  });

  test("quem só tem Jurídico não vê as outras áreas nem a Equipe; área não liberada diz quem libera", async ({ page }) => {
    await simular(page, { "/v1/escritorio": { corpo: LARISSA } });
    await page.goto(`${P}/financeiro`);
    await expect(page.getByRole("heading", { level: 1, name: "Esta área não está liberada para você" })).toBeVisible();
    await expect(page.getByText("Quem libera as áreas é Marina Ribeiro, sócio dono.")).toBeVisible();
    await semViolacoes(page);
    if (ehCelular(page)) await page.getByRole("button", { name: "Mais" }).click();
    const onde = ehCelular(page) ? page.getByRole("dialog", { name: "Mais" }) : page.locator("#trilho");
    await expect(onde.getByRole("link", { name: "Jurídico" })).toBeVisible();
    for (const a of ["Comercial", "Contratos", "Financeiro", "Equipe"]) await expect(onde.getByRole("link", { name: a, exact: true })).toHaveCount(0);
    await expect(onde.getByText("Área: Jurídico")).toBeVisible();
  });

  test("seção que não existe é página não encontrada", async ({ page }) => {
    const r = await page.goto(`${P}/juridico/nada`);
    expect(r?.status()).toBe(404);
  });
});

test.describe("Portal v1: Equipe do escritório (PA-02)", () => {
  const rotas = (extra: Record<string, unknown> = {}) => ({
    "/v1/escritorio": { corpo: ESCRITORIO },
    "GET /v1/escritorio/equipe": { corpo: { pessoas: EQUIPE } },
    ...extra,
  });

  test("lista: dono primeiro, convite pendente e vencido, áreas em selos", async ({ page }) => {
    await simular(page, rotas());
    await page.goto(`${P}/equipe`);
    await expect(page.getByRole("heading", { level: 1, name: "Equipe" })).toBeVisible();
    const lista = ehCelular(page) ? page.getByRole("list", { name: "Pessoas da equipe" }) : page.locator("table");
    await expect(lista.getByText("Sócio dono: não sai da equipe")).toBeVisible();
    await expect(lista.getByText("Convite pendente")).toBeVisible();
    await expect(lista.getByText("Convite vencido")).toBeVisible();
    await expect(lista.getByText("Só as partes comuns")).toBeVisible();
    await expect(lista.getByRole("button", { name: "Cancelar convite de Renata Lopes" })).toBeVisible();
    await expect(lista.getByRole("button", { name: "Retirar Marina Ribeiro da equipe" })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("convidar: erros presos ao campo; depois manda nome, e-mail e áreas", async ({ page }) => {
    const pedidos = await simular(page, rotas({ "POST /v1/escritorio/equipe": { status: 201, corpo: { vinculoId: vid(6), contaNova: true } } }));
    await page.goto(`${P}/equipe`);
    await page.getByRole("button", { name: "Convidar pessoa" }).first().click();
    const j = page.getByRole("dialog", { name: "Convidar pessoa" });
    await expect(j.getByLabel("Nome completo")).toBeFocused();
    await j.getByLabel("E-mail").fill("gustavo@ribeiromatos");
    await j.getByRole("button", { name: "Enviar convite" }).click();
    await expect(j.getByText("Falta acertar 2 pontos, marcados abaixo.")).toBeVisible();
    await expect(j.getByLabel("Nome completo")).toHaveAttribute("aria-invalid", "true");
    await expect(j.getByLabel("Nome completo")).toBeFocused();
    await semViolacoes(page);
    await j.getByLabel("E-mail").fill("diego@ribeiromatos.adv.br");
    await j.getByLabel("Nome completo").fill("Diego A.");
    await j.getByRole("button", { name: "Enviar convite" }).click();
    await expect(j.getByText("Diego Almeida já está na equipe com este e-mail.", { exact: false })).toBeVisible();
    // O foco vai para o e-mail no quadro seguinte; espera antes de escrever em outro campo.
    await expect(j.getByLabel("E-mail")).toBeFocused();
    await j.getByLabel("Nome completo").fill("Gustavo Lima");
    await expect(j.getByLabel("Nome completo")).toHaveValue("Gustavo Lima");
    await j.getByLabel("E-mail").fill("Gustavo@RibeiroMatos.adv.br");
    await j.getByRole("checkbox", { name: /Jurídico/ }).check();
    await j.getByRole("button", { name: "Enviar convite" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Convite enviado para Gustavo Lima." })).toBeVisible();
    expect(pedidos.find((x) => x.metodo === "POST" && x.caminho === "/v1/escritorio/equipe")?.corpo).toEqual({
      nome: "Gustavo Lima", email: "gustavo@ribeiromatos.adv.br", areas: ["JURIDICO"],
    });
  });

  test("áreas: abre com as marcadas e salva a lista nova", async ({ page }) => {
    const pedidos = await simular(page, rotas({ [`PUT /v1/escritorio/equipe/${vid(2)}/areas`]: { corpo: { areas: ["FINANCEIRO"] } } }));
    await page.goto(`${P}/equipe`);
    await page.getByRole("button", { name: "Mudar áreas de Bianca Torres" }).first().click();
    const j = page.getByRole("dialog", { name: "Áreas de Bianca Torres" });
    await expect(j.getByRole("checkbox", { name: /Contratos/ })).toBeChecked();
    await j.getByRole("checkbox", { name: /Contratos/ }).uncheck();
    await j.getByRole("button", { name: "Salvar áreas" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Áreas de Bianca Torres salvas." })).toBeVisible();
    expect(pedidos.find((x) => x.metodo === "PUT")?.corpo).toEqual({ areas: ["FINANCEIRO"] });
  });

  test("retirar: exige para quem passa o que era da pessoa (EX-10) e manda a escolha", async ({ page }) => {
    const pedidos = await simular(page, rotas({ [`POST /v1/escritorio/equipe/${vid(3)}/retirar`]: { corpo: { versao: 2, passouPara: pid(2) } } }));
    await page.goto(`${P}/equipe`);
    await page.getByRole("button", { name: "Retirar Diego Almeida da equipe" }).first().click();
    const j = page.getByRole("alertdialog", { name: "Retirar Diego Almeida da equipe?" });
    const campo = j.getByLabel("Passar o que é de Diego para");
    await expect(campo).toBeFocused();
    // Só pessoas ativas: o convite pendente não recebe nada.
    await expect(campo.locator("option")).toHaveText(["Escolha uma pessoa", "Marina Ribeiro (sócio dono)", "Bianca Torres"]);
    await j.getByRole("button", { name: "Retirar Diego" }).click();
    await expect(j.getByText("Escolha para quem passa o que é de Diego. Nada pode ficar sem dono.")).toBeVisible();
    await expect(campo).toHaveAttribute("aria-invalid", "true");
    await semViolacoes(page);
    await campo.selectOption({ label: "Bianca Torres" });
    await j.getByRole("button", { name: "Retirar Diego" }).click();
    await expect(page.getByRole("status").filter({ hasText: "O que era de Diego passou para Bianca Torres." })).toBeVisible();
    expect(pedidos.find((x) => x.caminho.endsWith("/retirar"))?.corpo).toEqual({ versao: 1, passarPara: pid(2) });
  });

  test("cancelar convite: sem escolha, o foco começa no Voltar", async ({ page }) => {
    const pedidos = await simular(page, rotas({ [`POST /v1/escritorio/equipe/${vid(4)}/retirar`]: { corpo: { versao: 2 } } }));
    await page.goto(`${P}/equipe`);
    await page.getByRole("button", { name: "Cancelar convite de Renata Lopes" }).first().click();
    const j = page.getByRole("alertdialog", { name: "Cancelar o convite de Renata Lopes?" });
    await expect(j.getByRole("button", { name: "Voltar" })).toBeFocused();
    await j.getByRole("button", { name: "Cancelar o convite" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Convite de Renata Lopes cancelado." })).toBeVisible();
    expect(pedidos.find((x) => x.caminho.endsWith("/retirar"))?.corpo).toEqual({ versao: 1, passarPara: null });
  });

  test("histórico da equipe conta para quem passou o que era de quem saiu", async ({ page }) => {
    await simular(page, rotas({
      "/v1/escritorio/equipe/historico": { corpo: { eventos: [
        { id: 3, ocorridoEm: h(1), autor: { id: pid(1), nome: "Marina Ribeiro" }, acao: "equipe.retirada", entidadeId: vid(7), dados: {}, pessoa: "Caio Mendes", passouPara: "Felipe Matos" },
        { id: 2, ocorridoEm: h(2), autor: { id: pid(1), nome: "Marina Ribeiro" }, acao: "equipe.areas_mudadas", entidadeId: vid(2), dados: { antes: ["FINANCEIRO"], depois: ["CONTRATOS", "FINANCEIRO"] }, pessoa: "Bianca Torres", passouPara: null },
        { id: 1, ocorridoEm: h(30), autor: { id: pid(1), nome: "Marina Ribeiro" }, acao: "escritorio.exportado", entidadeId: ESC, dados: {}, pessoa: null, passouPara: null },
      ] } },
    }));
    await page.goto(`${P}/equipe?aba=historico`);
    await expect(page.getByText("o que era de Caio passou para", { exact: false })).toBeVisible();
    await expect(page.getByText("Entrou: Contratos · Ficou: Financeiro")).toBeVisible();
    await expect(page.getByText("Exportação", { exact: true })).toBeVisible();
    await semViolacoes(page);
  });

  test("quem não é o sócio dono vê que a página é do sócio dono", async ({ page }) => {
    await simular(page, { "/v1/escritorio": { corpo: LARISSA } });
    await page.goto(`${P}/equipe`);
    await expect(page.getByRole("heading", { level: 1, name: "Esta página é do sócio dono" })).toBeVisible();
    await semViolacoes(page);
  });
});

test.describe("Portal v1: área Escritório (F1.7, PT-15)", () => {
  test("o dono vê os dados, os seus escritórios e exporta: confirma, baixa e pode salvar de novo", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "/v1/sessao/escolha": { corpo: { escritorios: [{ id: ESC, nome: "Ribeiro & Matos", cidade: "São Paulo", uf: "SP" }, { id: "e2", nome: "Nunes Prado Advogados", cidade: "Campinas", uf: "SP" }] } },
      "/v1/sessao": { corpo: { escritorios: [{ id: ESC, funcoes: ["SOCIO"] }, { id: "e2", funcoes: ["EQUIPE"] }] } },
      "POST /v1/escritorio/exportacao": { corpo: { formato: "t3jus.exportacao.v1", geradoEm: "2026-11-18T17:22:00Z", tabelas: {} } },
    });
    await page.goto(`${P}/meu-escritorio`);
    await expect(page.getByRole("heading", { level: 1, name: "Ribeiro & Matos" })).toBeVisible();
    await expect(page.getByText("41.276.839/0001-34")).toBeVisible();
    await expect(page.getByText("Nunes Prado Advogados")).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Exportar os dados" }).click();
    const j = page.getByRole("dialog", { name: "Exportar os dados da Ribeiro & Matos?" });
    await expect(j.getByRole("button", { name: "Exportar e baixar" })).toBeFocused();
    const baixou = page.waitForEvent("download");
    await j.getByRole("button", { name: "Exportar e baixar" }).click();
    expect((await baixou).suggestedFilename()).toBe("ribeiro-matos-2026-11-18.json");
    await expect(page.getByText("Arquivo baixado.")).toBeVisible();
    const denovo = page.waitForEvent("download");
    await page.getByRole("button", { name: "Salvar de novo" }).click();
    await denovo;
    expect(pedidos.filter((x) => x.caminho === "/v1/escritorio/exportacao")).toHaveLength(1);
    await semViolacoes(page);
  });

  test("erro na exportação: nada baixado e tentar de novo", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: { ...ESCRITORIO, outrosEscritorios: 0 } },
      "POST /v1/escritorio/exportacao": { status: 500, corpo: { erro: { codigo: "INTERNAL_ERROR" } } },
    });
    await page.goto(`${P}/meu-escritorio`);
    await expect(page.getByRole("heading", { name: "Seus escritórios" })).toHaveCount(0);
    await page.getByRole("button", { name: "Exportar os dados" }).click();
    await page.getByRole("button", { name: "Exportar e baixar" }).click();
    await expect(page.getByText("Não deu para gerar o arquivo.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
    await semViolacoes(page);
  });

  test("quem não é o dono lê os dados e vê quem cuida, sem exportar", async ({ page }) => {
    await simular(page, { "/v1/escritorio": { corpo: LARISSA } });
    await page.goto(`${P}/meu-escritorio`);
    await expect(page.getByRole("heading", { name: "Quem cuida do escritório" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Exportar os dados" })).toHaveCount(0);
    await semViolacoes(page);
  });
});
