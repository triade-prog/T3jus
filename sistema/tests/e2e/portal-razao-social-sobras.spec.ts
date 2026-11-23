// O que sobrou da razão social (F3.146; PA-07). Desenho aprovado em
// docs/design/aprovadas/razao-social-sobras (Carol, 23/11/2026, com todas as recomendações):
// D1, a prévia de Marca e timbrado com a linha da identificação no carnê e as 4 linhas no recibo,
// e o aviso quando a razão social está em branco; D2 e D3, a linha de aviso nas janelas "Gerar
// carnê" e "Registrar recebimento". O papel continua saindo com o nome curto, sem "[falta]" e sem
// o aviso. A API é simulada; aqui se testa a tela, a acessibilidade e os textos.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { semViolacoes, simular } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const CAROL = { id: "a0000000-0000-4000-8000-000000000101", nome: "Carol Santana" };
const BRUNA = { id: "a0000000-0000-4000-8000-000000000102", nome: "Bruna Teixeira" };
const CT = "f1000000-0000-4000-8000-000000000146";
const CARNE = "c4000000-0000-4000-8000-000000000146";
const pc = (n: number) => `b2000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;
const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + n * 864e5));

// O timbrado do dia (escritorio_timbrado_json, 0890), o elenco de carne-recibo-razao-social.
const COMPLETA = {
  comTimbrado: true, nome: "Santana Advocacia", tipo: "SOCIEDADE", razaoSocial: "SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS",
  cnpj: "47318552000106", oab: "OAB/BA 4.217", cep: "41820020", logradouro: "Av. Tancredo Neves", numero: "1.632", complemento: "sala 1.208",
  bairro: "Caminho das Árvores", cidade: "Salvador", uf: "BA", endereco: "Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores",
  enderecoConfira: false, telefone: "7133524180", email: "contato@santana.adv.br", site: "santana.adv.br", contatos: [], whatsapp: "+5571991874402", dona: null,
};
const VAZIA = { ...COMPLETA, razaoSocial: null };
const MIGRADO = { ...VAZIA, tipo: null };
const SEM = {
  ...COMPLETA, nome: "Carol Santana Advocacia", tipo: "SEM_SOCIEDADE", razaoSocial: null, cnpj: null, oab: null, email: "carolina@santana.adv.br", site: null,
  dona: { nome: "Carolina Soares Santana", dados: { nomeCompleto: "Carolina Soares Santana" }, inscricoes: [{ texto: "OAB/BA 63.876-S", tipo: "PRINCIPAL" }] },
};
// Os dados do escritório da sessão (escritorio_documentos_json, 0860): para quem não é a dona, sem os dados dela.
const doc = (t: typeof COMPLETA | typeof SEM | typeof MIGRADO) => ({
  ...t, oabUf: null, oabNumero: null, dona: { pessoaId: CAROL.id, nome: "Carol Santana", dados: null, inscricoes: [] },
});
const ESCRITORIO = {
  id: ESC, nome: "Santana Advocacia", pessoa: "Carol Santana", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Carol Santana"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: "47318552000106", cidade: "Salvador", uf: "BA",
  endereco: "Av. Tancredo Neves, 1.632", contatos: [], ultimaExportacao: null, oabSociedade: "OAB/BA 4.217", documentos: doc(COMPLETA),
};
const equipe = (areas: string[], t = COMPLETA as typeof COMPLETA | typeof SEM | typeof MIGRADO) =>
  ({ ...ESCRITORIO, nome: t.nome, pessoa: BRUNA.nome, dono: false, areas, funcoes: ["EQUIPE"], documentos: doc(t) });
const dona = (t: typeof COMPLETA | typeof SEM | typeof MIGRADO) => ({ ...ESCRITORIO, nome: t.nome, documentos: doc(t) });

const RECEB = {
  dono: true, socioDono: CAROL, versao: 3, pixTipo: "CNPJ", pixChave: "47318552000106", recebedor: "SANTANA LIMA OLIVEIRA ADV", cidade: "SALVADOR",
  instrucoes: null, atualizadoPor: CAROL, atualizadoEm: `${dia(-6)}T10:02:00-03:00`, sugestao: { recebedor: "Santana Advocacia", cidade: "Salvador", cnpj: "47318552000106" },
  marca: "LETRA", logoJeito: null, logoCor: "ARQUIVO", logo: null, oabUf: "BA", oabNumero: "4217", oab: "OAB/BA 4.217", timbrado: COMPLETA,
};

async function semRolagemLateral(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
}
async function alvo44(l: Locator) {
  // A janela abre com uma animação curta de escala: mede depois que ela acaba.
  await l.page().evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null))));
  expect((await l.boundingBox())!.height).toBeGreaterThanOrEqual(44);
}

test.describe("Marca e timbrado: a prévia como o papel sai (F3.146, D1)", () => {
  test("a linha da identificação embaixo da marca e as 4 linhas do recibo; sem aviso com a razão preenchida", async ({ page }) => {
    await simular(page, { "/v1/escritorio": { corpo: ESCRITORIO }, "GET /v1/escritorio/recebimento": { corpo: RECEB } });
    await page.goto(`${P}/meu-escritorio/recebimento`);
    const folha = page.getByRole("region", { name: "Marca e timbrado" });
    await expect(folha.getByRole("img", {
      name: "Prévia do alto do carnê, em cores, com o nome em letra e a identificação do escritório: SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS · "
        + "CNPJ 47.318.552/0001-06 · OAB/BA 4.217 · Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores, Salvador/BA, CEP 41820-020 · (71) 3352-4180 · contato@santana.adv.br",
    })).toBeVisible();
    await expect(folha.locator(".rz-ident").first()).toHaveText("SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS · CNPJ 47.318.552/0001-06 · OAB/BA 4.217");
    const recibo = folha.locator(".rz-ender").first();
    await expect(recibo.locator("b")).toHaveText("SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS");
    await expect(recibo).toContainText("(71) 3352-4180 · contato@santana.adv.br · santana.adv.br");
    await expect(recibo).toContainText("WhatsApp (71) 99187-4402");
    await expect(folha.locator(".rz-linha")).toHaveCount(0);
    await semRolagemLateral(page);
    await semViolacoes(page);
  });

  test("razão social em branco: a linha só com o CNPJ e o aviso com o caminho; tipo em branco tem o texto próprio", async ({ page }) => {
    await simular(page, { "/v1/escritorio": { corpo: dona(VAZIA) }, "GET /v1/escritorio/recebimento": { corpo: { ...RECEB, timbrado: VAZIA } } });
    await page.goto(`${P}/meu-escritorio/recebimento`);
    const folha = page.getByRole("region", { name: "Marca e timbrado" });
    await expect(folha.locator(".rz-ident").first()).toHaveText("CNPJ 47.318.552/0001-06 · OAB/BA 4.217");
    await expect(folha.locator(".rz-linha")).toHaveText(
      "A razão social do escritório está em branco. O carnê e o recibo saem com o nome Santana Advocacia no lugar dela.Completar em Escritório › Dados do escritório");
    const ir = folha.getByRole("link", { name: "Completar em Escritório › Dados do escritório" });
    await expect(ir).toHaveAttribute("href", "/meu-escritorio?editar=1");
    await alvo44(ir);
    await semRolagemLateral(page);
    await semViolacoes(page);

    await page.unrouteAll({ behavior: "ignoreErrors" });
    await simular(page, { "/v1/escritorio": { corpo: dona(MIGRADO) }, "GET /v1/escritorio/recebimento": { corpo: { ...RECEB, timbrado: MIGRADO } } });
    await page.goto(`${P}/meu-escritorio/recebimento`);
    await expect(page.locator(".rz-linha")).toContainText(
      "Falta dizer em Dados do escritório se ele é uma sociedade. O carnê e o recibo saem com o nome Santana Advocacia, sem razão social. Se a advogada atua sem sociedade, é só marcar isso lá, e o aviso some.");
    await semViolacoes(page);
  });

  test("150 letras: a linha em letra um pouco menor, sem rolagem lateral", async ({ page }) => {
    const razao = "SANTANA, LIMA, OLIVEIRA, ALBUQUERQUE CAVALCANTI, VASCONCELOS FIGUEIREDO, MENEZES, ANDRADE, QUEIROZ MONTEIRO E BITTENCOURT PRADO SOCIEDADE DE ADVOGADOS";
    await simular(page, { "/v1/escritorio": { corpo: ESCRITORIO }, "GET /v1/escritorio/recebimento": { corpo: { ...RECEB, timbrado: { ...COMPLETA, razaoSocial: razao } } } });
    await page.goto(`${P}/meu-escritorio/recebimento`);
    const folha = page.getByRole("region", { name: "Marca e timbrado" });
    await expect(folha.locator(".lg-cn.rz-longo").first()).toBeVisible();
    await expect(folha.locator(".rz-ident").first()).toContainText(razao);
    await semRolagemLateral(page);
    await semViolacoes(page);
  });

  test("só para ler, sem sociedade: sem Financeiro nem Contratos, sem a linha e com a frase; com Financeiro, com o nome da advogada", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: equipe([], SEM) },
      "GET /v1/escritorio/recebimento": { corpo: { ...RECEB, dono: false, timbrado: null, oabUf: null, oabNumero: null, oab: null } },
    });
    await page.goto(`${P}/meu-escritorio/recebimento`);
    await expect(page.getByRole("img", { name: "Prévia do alto do carnê com o nome em letra" })).toBeVisible();
    await expect(page.getByText("Embaixo da marca, o carnê leva o nome completo e a OAB da advogada. Essa linha aparece aqui para quem tem Financeiro ou Contratos.")).toBeVisible();
    await expect(page.locator(".rz-ident")).toHaveCount(0);
    await expect(page.getByRole("definition").filter({ hasText: "Sem registro: advogada sem sociedade" })).toBeVisible();
    await semViolacoes(page);

    await page.unrouteAll({ behavior: "ignoreErrors" });
    await simular(page, {
      "/v1/escritorio": { corpo: equipe(["CONTRATOS", "FINANCEIRO"], SEM) },
      "GET /v1/escritorio/recebimento": { corpo: { ...RECEB, dono: false, timbrado: SEM, oabUf: null, oabNumero: null, oab: null } },
    });
    await page.goto(`${P}/meu-escritorio/recebimento`);
    await expect(page.getByRole("img", {
      name: "Prévia do alto do carnê com o nome em letra e a identificação do escritório: Carolina Soares Santana · OAB/BA 63.876-S · sem CNPJ",
    })).toBeVisible();
    await expect(page.getByText(/Essa linha aparece aqui para quem tem Financeiro/)).toHaveCount(0);
    await semViolacoes(page);
  });
});

// ------------------------------------------------------------------ D2 · Gerar carnê
const fp = (n: number, d: number, situacao: string) => ({
  id: pc(60 + n), tipo: "PARCELADO", descricao: `Parcela ${n} de 6`, vencimento: dia(d), valor: 85000, recebido: situacao === "PAGA" ? 85000 : 0,
  falta: situacao === "PAGA" ? 0 : 85000, forma: "PIX", situacao, pagaEm: situacao === "PAGA" ? dia(d) : null,
  contrato: { id: CT, numero: "C-2026-014", objeto: "Ação revisional" }, cliente: { id: "c22", nome: "Hélio Batista Corrêa" }, responsavel: BRUNA,
  cobranca: null, cancelado: null, pagamentos: [], eventos: [],
});
const FICHA = {
  id: CT, numero: "C-2026-014", objeto: "Ação revisional", situacao: "ATIVO", cliente: { id: "c22", nome: "Hélio Batista Corrêa" }, responsavel: BRUNA,
  condicoes: [{ tipo: "PARCELADO", total: 510000, parcelas: 6, primeiro: dia(-24) }],
  totais: { contratado: 510000, recebido: 0, atraso: 85000, aVencer: 425000 }, aguardandoBase: 0,
  parcelas: [fp(1, -24, "VENCIDA"), fp(2, 6, "A_VENCER"), fp(3, 36, "A_VENCER")],
};
const opcoes = (timbrado: unknown, dono: boolean, pix = true) => ({
  contrato: { id: CT, numero: "C-2026-014", objeto: "Ação revisional", situacao: "ATIVO" }, cliente: { id: "c22", nome: "Hélio Batista Corrêa" },
  parcelas: [1, 2, 3].map((n) => ({ id: pc(60 + n), descricao: `Parcela ${n} de 6`, ordem: n, total: 6, vencimento: dia(-24 + 30 * (n - 1)), valor: 85000,
    situacao: n === 1 ? "VENCIDA" : "A_VENCER", pagaEm: null })),
  recebimento: pix ? { pixTipo: "CNPJ", pixChave: "47318552000106", recebedor: "SANTANA LIMA OLIVEIRA ADV", cidade: "SALVADOR", instrucoes: null }
    : { pixTipo: null, pixChave: null, recebedor: null, cidade: null, instrucoes: null },
  dono, socioDono: CAROL, carnes: [], timbrado,
});

async function janelaCarne(page: Page, esc: unknown, o: unknown) {
  await simular(page, {
    "/v1/escritorio": { corpo: esc },
    "/v1/escritorio/pessoas": { corpo: { pessoas: [CAROL, BRUNA] } },
    [`GET /v1/escritorio/financeiro/contratos/${CT}`]: { corpo: FICHA },
    [`GET /v1/escritorio/contratos/${CT}/carnes`]: { corpo: o },
  });
  await page.goto(`${P}/financeiro/a-receber/contratos/${CT}`);
  await page.getByRole("button", { name: "Gerar carnê" }).first().click();
  return page.getByRole("dialog", { name: "Gerar carnê" });
}

test.describe("Gerar carnê: a linha de aviso da razão social (F3.146, D2)", () => {
  test("a sócia dona vê o texto da razão e o caminho para completar", async ({ page }) => {
    const j = await janelaCarne(page, dona(VAZIA), opcoes(VAZIA, true));
    const l = j.locator(".rz-linha");
    await expect(l).toContainText("A razão social do escritório está em branco. O carnê sai com o nome Santana Advocacia no lugar dela.");
    const ir = l.getByRole("link", { name: "Completar em Escritório › Dados do escritório" });
    await expect(ir).toHaveAttribute("href", "/meu-escritorio?editar=1");
    await alvo44(ir);
    await semViolacoes(page);
  });

  test("quem não é a dona lê quem completa; o tipo em branco tem o texto próprio; sem Pix, o quadro do Pix vem antes", async ({ page }) => {
    const j = await janelaCarne(page, equipe(["FINANCEIRO"], MIGRADO), opcoes(MIGRADO, false, false));
    const l = j.locator(".rz-linha");
    await expect(l).toContainText("Falta dizer em Dados do escritório se ele é uma sociedade. O carnê sai com o nome Santana Advocacia, sem razão social.");
    await expect(l).toContainText("Quem completa é Carol Santana, a sócia dona.");
    await expect(l.getByRole("link", { name: "Ver em Escritório › Dados do escritório" })).toHaveAttribute("href", "/meu-escritorio");
    // O quadro do Pix vem primeiro (decisão 13).
    const pix = j.getByText("O escritório ainda não tem chave Pix no T3jus.");
    expect((await pix.boundingBox())!.y).toBeLessThan((await l.boundingBox())!.y);
    await semRolagemLateral(page);
    await semViolacoes(page);
  });

  test("sem sociedade ou com a razão preenchida, nenhuma linha", async ({ page }) => {
    let j = await janelaCarne(page, equipe(["FINANCEIRO"], SEM), opcoes(SEM, false));
    await expect(j.getByRole("radio", { name: /As que ainda vão vencer/ })).toBeVisible();
    await expect(j.locator(".rz-linha")).toHaveCount(0);
    await page.unrouteAll({ behavior: "ignoreErrors" });
    j = await janelaCarne(page, ESCRITORIO, opcoes(COMPLETA, true));
    await expect(j.getByRole("radio", { name: /As que ainda vão vencer/ })).toBeVisible();
    await expect(j.locator(".rz-linha")).toHaveCount(0);
  });
});

// ------------------------------------------------------------------ D3 · Registrar recebimento
const HELIO = { ...fp(1, -24, "VENCIDA"), id: pc(22), descricao: "Parcela 3 de 6" };
const LISTA = {
  algum: true, contratos: true,
  totais: { aberto: { valor: 85000, n: 1 }, vencidas: { valor: 85000, n: 1 }, seteDias: { valor: 0, n: 0 }, recebidoMes: { valor: 0, n: 0 } },
  responsaveis: [BRUNA], parcelas: [HELIO],
};
async function janelaRegistrar(page: Page, esc: unknown) {
  await simular(page, {
    "/v1/escritorio": { corpo: esc },
    "/v1/escritorio/pessoas": { corpo: { pessoas: [CAROL, BRUNA] } },
    "GET /v1/escritorio/financeiro/receber": { corpo: LISTA },
  });
  await page.goto(`${P}/financeiro/a-receber`);
  await page.getByRole("button", { name: /Registrar recebimento de Hélio/ }).click();
  return page.getByRole("dialog", { name: "Registrar recebimento" });
}

test.describe("Registrar recebimento: a linha de aviso embaixo de Gerar o recibo (F3.146, D3)", () => {
  test("a linha some quando desmarca Gerar o recibo e volta quando marca", async ({ page }) => {
    const j = await janelaRegistrar(page, dona(VAZIA));
    const l = j.locator(".rz-linha");
    await expect(l).toContainText("A razão social do escritório está em branco. O recibo sai com o nome Santana Advocacia no lugar dela.");
    await expect(l.getByRole("link", { name: "Completar em Escritório › Dados do escritório" })).toBeVisible();
    await semViolacoes(page);
    await j.getByRole("checkbox", { name: /Gerar o recibo/ }).uncheck();
    await expect(l).toHaveCount(0);
    await j.getByRole("checkbox", { name: /Gerar o recibo/ }).check();
    await expect(j.locator(".rz-linha")).toBeVisible();
  });

  test("quem não é a dona, com o tipo em branco: o texto do tipo e quem completa; sem sociedade, nada", async ({ page }) => {
    let j = await janelaRegistrar(page, equipe(["FINANCEIRO"], MIGRADO));
    await expect(j.locator(".rz-linha")).toContainText("Falta dizer em Dados do escritório se ele é uma sociedade. O recibo sai com o nome Santana Advocacia, sem razão social.");
    await expect(j.locator(".rz-linha")).toContainText("Quem completa é Carol Santana, a sócia dona.");
    await semRolagemLateral(page);
    await semViolacoes(page);
    await page.unrouteAll({ behavior: "ignoreErrors" });
    j = await janelaRegistrar(page, equipe(["FINANCEIRO"], SEM));
    await expect(j.getByRole("checkbox", { name: /Gerar o recibo/ })).toBeChecked();
    await expect(j.locator(".rz-linha")).toHaveCount(0);
  });
});

// ------------------------------------------------------------------ o papel não leva o aviso
test("o carnê gerado com a razão em branco sai com o nome curto, sem [falta] e sem a linha de aviso", async ({ page }) => {
  await simular(page, {
    "/v1/escritorio": { corpo: dona(VAZIA) },
    [`GET /v1/escritorio/carnes/${CARNE}`]: { corpo: {
      id: CARNE, formato: "TRES", capa: true, geradoEm: `${dia(0)}T15:32:00-03:00`, marca: null, escritorio: VAZIA,
      cliente: { nome: "Hélio Batista Corrêa", documento: "***.982.247-**", tipo: "PF" },
      contrato: { id: CT, numero: "C-2026-014", objeto: "Ação revisional" },
      pix: { tipo: "CNPJ", chave: "47318552000106", recebedor: "SANTANA LIMA OLIVEIRA ADV", cidade: "SALVADOR" }, instrucoes: null,
      parcelas: [2, 3].map((n) => ({ descricao: `Parcela ${n} de 6`, ordem: n, total: 6, vencimento: dia(6 + 30 * (n - 2)), valor: 85000, semValor: false, txid: `C2026014P0${n}`,
        pix: "00020126580014br.gov.bcb.pix0114473185520001065204000053039865802BR5925SANTANA LIMA OLIVEIRA ADV6008SALVADOR62150511C2026014P026304ABCD" })),
      mudancas: [],
    } },
  });
  await page.goto(`${P}/carnes/${CARNE}?area=financeiro`);
  await expect(page.getByRole("region", { name: /^Folha 1 de/ })).toBeVisible();
  await expect(page.getByText(/\[[^\]]*falta\]/)).toHaveCount(0);
  await expect(page.locator(".rz-linha")).toHaveCount(0);
  await expect(page.getByText("Santana Advocacia").first()).toBeVisible();
});
