// Console v1 (telas aprovadas em docs/design/aprovadas/console-v1): moldura de celular, abas
// Ficha, Contrato e documentos, Equipe T3jus, Notas e Histórico, cadastrar escritório e a
// Equipe T3jus. A API é simulada; aqui se testa a tela, a acessibilidade e o que ela manda.
import { expect, test, type Page } from "@playwright/test";
import { C, CA, CLIENTES, d, ficha, fixarRelogio, h, IN, semViolacoes, SESSAO, simular } from "./console-dados.ts";

const TODAS = [
  "console.contrato.editar", "console.documentos.enviar", "console.documentos.ver", "console.equipe.atribuir",
  "console.estagio.mudar", "console.ficha.editar", "console.ficha.ver", "console.historico.ver", "console.notas.escrever",
  "console.notas.ver", "console.socios.convidar",
];
const SO_VER = ["console.documentos.ver", "console.ficha.ver", "console.notas.escrever", "console.notas.ver"];
const CEDRO = CLIENTES[1]!;
const RAFAEL = { pessoaId: "c0000000-0000-4000-8000-000000000003", nome: "Rafael Teles", funcoes: ["IMPLANTACAO"] };

function fichaCedro(permissoes = TODAS, extra: Record<string, unknown> = {}) {
  const f = ficha(CEDRO, permissoes);
  return {
    ...f,
    escritorio: {
      ...f.escritorio, cnpj: "22914870000109", endereco: "Rua da Aurora, 295, sala 1102, Boa Vista",
      // PA-07 (0860): a sede em partes e o tipo, que a ficha do Console também edita.
      tipo: "SOCIEDADE", razaoSocial: null, oabUf: null, oabNumero: null, oab: null, cep: "50050000", logradouro: "Rua da Aurora", numero: "295",
      complemento: "sala 1102", bairro: "Boa Vista", enderecoConfira: false, telefone: null, email: null, site: null,
      contatos: [
        { nome: "Renata Lima", papel: "Sócia", telefone: "+5581997342210", email: "renata@cedroelima.adv.br" },
        { nome: "Joana Freitas", papel: "Secretária", telefone: "+558133261180" },
      ],
    },
    equipe: [
      { vinculoId: "b0000000-0000-4000-8000-000000000001", pessoaId: CA.pessoaId, nome: CA.nome, funcao: "ADMINISTRACAO", desde: d(14), versao: 1 },
      { vinculoId: "b0000000-0000-4000-8000-000000000002", pessoaId: RAFAEL.pessoaId, nome: RAFAEL.nome, funcao: "IMPLANTACAO", desde: d(14), versao: 1 },
    ],
    ...extra,
  };
}
const R = `/v1/clientes/${CEDRO.id}`;
const ehCelular = (page: Page) => (page.viewportSize()?.width ?? 1000) <= 760;

// O relógio do navegador fica em AGORA, o mesmo instante de onde os dados contam (F3.164).
test.beforeEach(async ({ page }) => { await fixarRelogio(page); });

test.describe("Console v1: moldura", () => {
  test("no celular, o menu vira gaveta: abre, fecha com Esc e devolve o foco", async ({ page }) => {
    await simular(page, { "/v1/sessao": { corpo: SESSAO }, "/v1/clientes": { corpo: { clientes: CLIENTES } } });
    await page.goto(`${C}/`);
    const menu = page.getByRole("button", { name: "Abrir menu" });
    if (!ehCelular(page)) {
      await expect(menu).toBeHidden();
      await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
      return;
    }
    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeHidden();
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("button", { name: "Fechar menu" })).toBeFocused();
    await expect(page.getByRole("link", { name: "Equipe" })).toBeVisible();
    await semViolacoes(page);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toBeFocused();
  });

  test("o item Equipe aparece só para a Administração", async ({ page }) => {
    await simular(page, { "/v1/sessao": { corpo: { ...SESSAO, funcoes: ["IMPLANTACAO"] } }, "/v1/clientes": { corpo: { clientes: CLIENTES } } });
    await page.goto(`${C}/`);
    await expect(page.locator(".quem small")).toHaveText("Implantação");
    await expect(page.locator('a.item[href="/equipe"]')).toHaveCount(0);
  });
});

test.describe("Console v1: aba Ficha", () => {
  test("ver, editar com erros presos aos campos e salvar", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: SESSAO },
      [R]: { corpo: fichaCedro() },
      [`${R}/notas`]: { corpo: { notas: [] } },
      [`PUT ${R}/ficha`]: { corpo: { versao: 4 } },
    });
    await page.goto(`${C}/clientes/${CEDRO.id}/ficha`);
    await expect(page.getByRole("heading", { name: "Dados do escritório" })).toBeVisible();
    await expect(page.locator(".dados-ficha").getByText("22.914.870/0001-09")).toBeVisible();
    await expect(page.getByText("(81) 99734-2210")).toBeVisible();
    await expect(page.getByText("Sem e-mail")).toBeVisible();
    await semViolacoes(page);

    await page.getByRole("button", { name: "Editar ficha" }).click();
    await page.getByLabel(/^CNPJ/).fill("22.914.870/0001-66");
    const joana = page.getByRole("group", { name: /Contato 2/ });
    await joana.getByLabel("Telefone").fill("");
    await page.getByRole("button", { name: "Salvar ficha" }).click();
    await expect(page.getByText("Falta acertar 2 pontos, marcados abaixo.")).toBeVisible();
    await expect(page.getByText("Os dígitos do CNPJ não conferem. Confira o número no cartão do CNPJ.")).toBeVisible();
    await expect(page.getByText("Informe telefone ou e-mail de Joana.")).toBeVisible();
    await expect(page.getByLabel(/^CNPJ/)).toBeFocused();
    expect(pedidos.filter((p) => p.metodo === "PUT")).toEqual([]);
    await semViolacoes(page);

    await page.getByLabel(/^CNPJ/).fill("22.914.870/0001-09");
    await joana.getByLabel("E-mail").fill("joana@cedroelima.adv.br");
    await page.getByRole("button", { name: "Salvar ficha" }).click();
    await expect(page.getByText("Ficha salva.")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "PUT")?.corpo).toEqual({
      versao: 3, nome: CEDRO.nome, cidade: "Recife", uf: "PE", endereco: null, cnpj: "22914870000109",
      contatos: [
        { nome: "Renata Lima", papel: "Sócia", telefone: "+5581997342210", email: "renata@cedroelima.adv.br" },
        { nome: "Joana Freitas", papel: "Secretária", email: "joana@cedroelima.adv.br" },
      ],
      documentos: {
        tipo: "SOCIEDADE", razaoSocial: null, oabUf: null, oabNumero: null, cep: "50050000", logradouro: "Rua da Aurora", numero: "295", complemento: "sala 1102",
        bairro: "Boa Vista", telefone: null, email: null, site: null,
      },
    });
  });

  test("conflito: diz quem salvou antes e a hora, compara e salva a minha versão", async ({ page }) => {
    const salvoEm = "2026-11-18T17:32:00Z"; // 14h32 em Brasília
    const nova = fichaCedro(TODAS, { fichaAlteradaPor: "Rafael Teles", fichaAlteradaEm: salvoEm });
    nova.escritorio = { ...nova.escritorio, versao: 4, endereco: "Rua da Aurora, 295, sala 1104, Boa Vista", complemento: "sala 1104" };
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: SESSAO },
      [R]: [{ corpo: fichaCedro() }, { corpo: nova }],
      [`${R}/notas`]: { corpo: { notas: [] } },
      [`PUT ${R}/ficha`]: [{ status: 409, corpo: { erro: { codigo: "VERSION_CONFLICT", detalhes: { versao: 4 } } } }, { corpo: { versao: 5 } }],
    });
    await page.goto(`${C}/clientes/${CEDRO.id}/ficha?editar=1`);
    await page.getByLabel(/Complemento/).fill("sala 1102, bloco B");
    await page.getByRole("button", { name: "Salvar ficha" }).click();
    await expect(page.getByText("Rafael Teles salvou esta ficha às 14h32, enquanto você editava.")).toBeVisible();
    const tabela = page.getByRole("table", { name: "Campos que mudaram" });
    await expect(tabela).toContainText("sala 1104");
    await expect(page.getByLabel(/Complemento/)).toHaveValue("sala 1102, bloco B");
    await expect(page.locator(".mudou")).toHaveCount(1);
    await semViolacoes(page);
    await page.getByRole("button", { name: "Salvar a minha versão" }).click();
    await expect(page.getByText("Ficha salva.")).toBeVisible();
    const puts = pedidos.filter((p) => p.metodo === "PUT").map((p) => (p.corpo as { versao: number }).versao);
    expect(puts).toEqual([3, 4]);
  });

  test("Financeiro e Suporte só consultam a ficha e não veem o Histórico", async ({ page }) => {
    await simular(page, { "/v1/sessao": { corpo: { ...SESSAO, funcoes: ["SUPORTE"] } }, [R]: { corpo: fichaCedro(SO_VER) }, [`${R}/notas`]: { corpo: { notas: [] } } });
    await page.goto(`${C}/clientes/${CEDRO.id}/ficha`);
    await expect(page.getByText("Você consulta a ficha. Quem edita é a Implantação ou a Administração.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Editar ficha" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Histórico" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Passar para ativo" })).toHaveCount(0);
    await semViolacoes(page);
  });
});

test.describe("Console v1: Contrato e documentos", () => {
  const DOCS = [
    { id: "d0000000-0000-4000-8000-000000000001", categoria: "CONTRATO_ASSINADO", nome: "contrato-assinado.pdf", tipo: "application/pdf", tamanho: 1258291,
      enviadoPor: { id: CA.pessoaId, nome: CA.nome }, enviadoEm: d(10) },
  ];

  test("lista, envia com progresso e conclui; arquivo fora da regra fica com o motivo", async ({ page }) => {
    const NOVO = "d0000000-0000-4000-8000-000000000002";
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: SESSAO },
      [R]: { corpo: fichaCedro() },
      [`${R}/notas`]: { corpo: { notas: [] } },
      [`${R}/historico`]: { corpo: { eventos: [] } },
      [`${R}/documentos`]: [{ corpo: { documentos: DOCS } }, { corpo: { documentos: [{ ...DOCS[0]!, id: NOVO, nome: "estatuto.pdf", categoria: "DOCUMENTO_ESCRITORIO", tamanho: 2048, enviadoEm: h(0) }, ...DOCS] } }],
      [`POST ${R}/documentos`]: { status: 201, corpo: { id: NOVO, enderecoDeEnvio: `${C}/arquivos-falsos/${NOVO}` } },
      [`POST ${R}/documentos/${NOVO}/concluir`]: { corpo: { ok: true } },
    });
    const enviados: string[] = [];
    await page.route("**/arquivos-falsos/**", async (r) => {
      enviados.push(`${r.request().method()} ${r.request().headers()["content-type"]}`);
      await r.fulfill({ status: 200, body: "{}" });
    });
    await page.goto(`${C}/clientes/${CEDRO.id}/contrato`);
    await expect(page.getByText("contrato-assinado.pdf")).toBeVisible();
    await expect(page.getByText("PDF · 1,2 MB")).toBeVisible();
    await expect(page.getByText("Contrato 2026/031")).toBeVisible();
    await semViolacoes(page);

    await page.locator('input[type="file"]').setInputFiles([
      { name: "estatuto.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(2048, 1) },
      { name: "planilha.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.alloc(10, 1) },
    ]);
    await expect(page.getByText("1 arquivo não foi enviado.")).toBeVisible();
    await expect(page.getByText("Tipo não aceito. Envie PDF, JPG ou PNG.")).toBeVisible();
    await expect(page.locator(".docs").getByText("estatuto.pdf")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST" && p.caminho === `${R}/documentos`)?.corpo).toEqual({
      categoria: "DOCUMENTO_ESCRITORIO", nome: "estatuto.pdf", tipo: "application/pdf", tamanho: 2048,
    });
    expect(enviados).toEqual(["PUT application/pdf"]);
    expect(pedidos.some((p) => p.caminho === `${R}/documentos/${NOVO}/concluir`)).toBe(true);
    await semViolacoes(page);
  });

  test("abrir pede o link temporário; quem não envia só vê e baixa", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: { ...SESSAO, funcoes: ["FINANCEIRO"] } },
      [R]: { corpo: fichaCedro(SO_VER) },
      [`${R}/notas`]: { corpo: { notas: [] } },
      [`${R}/documentos`]: { corpo: { documentos: DOCS } },
      [`POST ${R}/documentos/${DOCS[0]!.id}/abrir`]: { corpo: { url: `${C}/arquivos-falsos/x?token=t&download=contrato-assinado.pdf`, validadeSegundos: 60 } },
    });
    await page.route("**/arquivos-falsos/**", (r) => r.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4" }));
    await page.goto(`${C}/clientes/${CEDRO.id}/contrato`);
    await expect(page.getByText("Você vê e baixa os documentos. Quem envia é a Implantação ou a Administração.")).toBeVisible();
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.getByText("Só a Administração altera a referência do contrato.")).toBeVisible();
    await expect(page.getByText("Quem muda o estágio é a Implantação ou a Administração.")).toBeVisible();
    const aba = page.context().waitForEvent("page");
    await page.getByRole("button", { name: "Abrir contrato-assinado.pdf" }).click();
    const nova = await aba;
    expect(nova.url()).not.toContain("download=");
    expect(pedidos.some((p) => p.caminho === `${R}/documentos/${DOCS[0]!.id}/abrir`)).toBe(true);
    await semViolacoes(page);
  });

  test("sem o sócio no Portal, passar para ativo fica bloqueado e explica", async ({ page }) => {
    await simular(page, {
      "/v1/sessao": { corpo: SESSAO }, [R]: { corpo: fichaCedro() }, [`${R}/notas`]: { corpo: { notas: [] } },
      [`${R}/documentos`]: { corpo: { documentos: [] } }, [`${R}/historico`]: { corpo: { eventos: [] } },
    });
    await page.goto(`${C}/clientes/${CEDRO.id}/contrato`);
    await expect(page.getByText("Falta o sócio para passar para Ativo.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Ir para Sócio" })).toHaveAttribute("href", `/clientes/${CEDRO.id}/socio`);
    await expect(page.locator(".estagio-acao .btn-pri")).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByText("Nenhum documento ainda")).toBeVisible();
    await semViolacoes(page);
  });
});

test.describe("Console v1: equipe do cliente, notas e histórico", () => {
  test("atribuir só com as funções da pessoa e retirar com confirmação", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: SESSAO },
      [R]: { corpo: fichaCedro() },
      [`${R}/notas`]: { corpo: { notas: [] } },
      "/v1/equipe": { corpo: { pessoas: [
        { id: CA.pessoaId, nome: CA.nome, ativa: true, funcoes: ["ADMINISTRACAO"] },
        { id: RAFAEL.pessoaId, nome: RAFAEL.nome, ativa: true, funcoes: ["IMPLANTACAO"] },
        { id: IN.pessoaId, nome: IN.nome, ativa: true, funcoes: ["IMPLANTACAO", "SUPORTE"] },
      ] } },
      [`POST ${R}/equipe`]: { status: 201, corpo: { vinculoId: "x" } },
      [`POST ${R}/equipe/b0000000-0000-4000-8000-000000000002/retirar`]: { corpo: { versao: 2 } },
    });
    await page.goto(`${C}/clientes/${CEDRO.id}/equipe`);
    await expect(page.getByText("você", { exact: true })).toBeVisible();
    await page.getByLabel("Pessoa").selectOption({ label: RAFAEL.nome });
    await page.getByLabel("Função neste cliente").selectOption({ label: "Implantação" });
    await page.getByRole("button", { name: "Atribuir" }).click();
    await expect(page.getByText("Rafael Teles já atende este cliente como Implantação.")).toBeVisible();
    await page.getByLabel("Pessoa").selectOption({ label: IN.nome });
    await expect(page.getByLabel("Função neste cliente").locator("option")).toHaveCount(3);
    await page.getByLabel("Função neste cliente").selectOption({ label: "Suporte" });
    await page.getByRole("button", { name: "Atribuir" }).click();
    await expect(page.getByText(`Inês Nogueira agora atende ${CEDRO.nome} como Suporte.`)).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")?.corpo).toEqual({ pessoaId: IN.pessoaId, funcao: "SUPORTE" });

    await page.getByRole("button", { name: "Retirar Rafael Teles (Implantação) deste cliente" }).click();
    const janela = page.getByRole("alertdialog", { name: `Retirar Rafael Teles da ${CEDRO.nome}?` });
    await expect(janela).toBeVisible();
    await expect(janela.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await semViolacoes(page);
    await janela.getByRole("button", { name: "Retirar Rafael" }).click();
    await expect(page.getByText("Rafael Teles foi retirado deste cliente.")).toBeVisible();
    expect(pedidos.find((p) => p.caminho.endsWith("/retirar"))?.corpo).toEqual({ versao: 1 });
  });

  test("nota vazia não sai; a nota nova vai para o topo", async ({ page }) => {
    const nota = { id: "n2", texto: "Contrato assinado.", criadoEm: h(1), autor: { id: CA.pessoaId, nome: CA.nome } };
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: SESSAO }, [R]: { corpo: fichaCedro() },
      [`${R}/notas`]: [{ corpo: { notas: [] } }, { corpo: { notas: [nota] } }],
      [`POST ${R}/notas`]: { status: 201, corpo: { id: "n2" } },
    });
    await page.goto(`${C}/clientes/${CEDRO.id}/notas`);
    await expect(page.getByText("Nenhuma nota ainda")).toBeVisible();
    await page.getByRole("button", { name: "Salvar nota" }).click();
    await expect(page.getByText("Escreva a nota antes de salvar.")).toBeVisible();
    await expect(page.getByLabel("Nota interna")).toBeFocused();
    await semViolacoes(page);
    await page.getByLabel("Nota interna").fill("Contrato assinado.");
    await expect(page.getByText("18 de 2.000 caracteres")).toBeVisible();
    await page.getByRole("button", { name: "Salvar nota" }).click();
    await expect(page.locator(".notas blockquote")).toHaveText("“Contrato assinado.”");
    expect(pedidos.find((p) => p.metodo === "POST")?.corpo).toEqual({ texto: "Contrato assinado." });
  });

  test("histórico por dia, com o selo Só equipe e Carregar mais antigos", async ({ page }) => {
    const ev = (n: number, acao: string, interno: boolean, dados: Record<string, unknown> = {}) => ({
      id: n, ocorridoEm: d(30 - n), autor: { id: CA.pessoaId, nome: CA.nome }, acao, entidade: "escritorio", entidadeId: CEDRO.id, dados, interno,
    });
    const primeira = Array.from({ length: 20 }, (_, i) => ev(40 - i, i % 2 ? "nota.escrita" : "ficha.alterada", i % 2 === 1, { campos: ["endereco", "contatos"] }));
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: SESSAO }, [R]: { corpo: fichaCedro() }, [`${R}/notas`]: { corpo: { notas: [] } },
      [`${R}/historico`]: [{ corpo: { eventos: primeira } }, { corpo: { eventos: [ev(3, "escritorio.cadastrado", false)] } }],
    });
    await page.goto(`${C}/clientes/${CEDRO.id}/historico`);
    await expect(page.getByText("Mostrando os 20 mais recentes")).toBeVisible();
    await expect(page.getByText("Campos: endereço, contatos").first()).toBeVisible();
    await expect(page.getByText("Só equipe").first()).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Carregar mais antigos" }).click();
    await expect(page.getByText("cadastrou o escritório em implantação")).toBeVisible();
    await expect(page.getByRole("button", { name: "Carregar mais antigos" })).toHaveCount(0);
    expect(pedidos.filter((p) => p.caminho === `${R}/historico`)).toHaveLength(2);
  });
});

test.describe("Console v1: cadastrar escritório", () => {
  test("confere os campos e abre a ficha nova com o aviso", async ({ page }) => {
    const NOVO = "e0000000-0000-4000-8000-000000000009";
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: { ...SESSAO, acoes: ["console.escritorios.criar"] } },
      "/v1/clientes": { corpo: { clientes: CLIENTES } },
      "POST /v1/clientes": { status: 201, corpo: { id: NOVO } },
      [`/v1/clientes/${NOVO}`]: { corpo: { ...ficha({ ...CLIENTES[0]!, id: NOVO, nome: "Jacarandá Advocacia" }, TODAS), situacoes: ["SEM_SOCIO", "SEM_CONTATO", "SEM_CONTRATO"] } },
      [`/v1/clientes/${NOVO}/notas`]: { corpo: { notas: [] } },
    });
    await page.goto(`${C}/`);
    await page.getByRole("button", { name: "Cadastrar escritório" }).click();
    const janela = page.getByRole("dialog", { name: "Cadastrar escritório" });
    await expect(janela.getByLabel("Nome do escritório")).toBeFocused();
    await janela.getByLabel("Cidade").fill("T");
    await janela.getByRole("button", { name: "Cadastrar escritório" }).click();
    await expect(janela.getByText("Falta acertar 3 pontos, marcados abaixo.")).toBeVisible();
    await expect(janela.getByText("O nome da cidade precisa de ao menos 2 letras.")).toBeVisible();
    await semViolacoes(page);
    await janela.getByLabel("Nome do escritório").fill("Jacarandá Advocacia");
    await janela.getByLabel("Cidade").fill("Teresina");
    await janela.getByLabel("UF").selectOption("PI");
    await janela.getByRole("button", { name: "Cadastrar escritório" }).click();
    await expect(page).toHaveURL(`${C}/clientes/${NOVO}/ficha?cadastrado=1`);
    await expect(page.getByText("Escritório cadastrado.")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")?.corpo).toEqual({ nome: "Jacarandá Advocacia", cidade: "Teresina", uf: "PI" });
  });

  test("sem a ação de cadastrar, o botão não aparece", async ({ page }) => {
    await simular(page, { "/v1/sessao": { corpo: SESSAO }, "/v1/clientes": { corpo: { clientes: CLIENTES } } });
    await page.goto(`${C}/`);
    await expect(page.getByRole("heading", { level: 1, name: "Carteira de escritórios" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cadastrar escritório" })).toHaveCount(0);
  });
});

test.describe("Console v1: Equipe T3jus", () => {
  const BRUNO = "c0000000-0000-4000-8000-000000000004";
  const LIA = "c0000000-0000-4000-8000-000000000005";
  const PESSOAS = [
    { id: CA.pessoaId, nome: CA.nome, email: "carol@t3jus.pro", ativa: true, funcoes: ["ADMINISTRACAO"], desde: d(200), convitePendente: false },
    { id: BRUNO, nome: "Bruno Seixas", email: "bruno@t3jus.pro", ativa: true, funcoes: ["SUPORTE"], desde: d(50), convitePendente: false },
    { id: "c0000000-0000-4000-8000-000000000006", nome: "Helena Prado", email: "helena@t3jus.pro", ativa: true, funcoes: ["FINANCEIRO"], desde: h(2), convitePendente: true },
    { id: LIA, nome: "Lia Moura", email: "lia@t3jus.pro", ativa: false, funcoes: [], desde: d(150), convitePendente: false },
  ];

  test("mostra e-mail e convite pendente; reativar abre com as funções em branco", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: SESSAO },
      "/v1/equipe": { corpo: { pessoas: PESSOAS } },
      "POST /v1/equipe": { status: 201, corpo: { pessoaId: LIA, contaNova: false } },
    });
    await page.goto(`${C}/equipe`);
    await expect(page.getByRole("heading", { level: 1, name: "Equipe T3jus" })).toBeVisible();
    await expect(page.getByText("helena@t3jus.pro").locator("visible=true")).toBeVisible();
    await expect(page.getByText("Convite pendente").locator("visible=true")).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Reativar Lia Moura" }).locator("visible=true").click();
    const janela = page.getByRole("dialog", { name: "Reativar Lia Moura" });
    await expect(janela.getByLabel("Nome completo")).toHaveAttribute("readonly", "");
    await expect(janela.getByLabel("E-mail")).toHaveValue("lia@t3jus.pro");
    await expect(janela.getByRole("checkbox", { checked: true })).toHaveCount(0);
    await janela.getByRole("button", { name: "Reativar Lia" }).click();
    await expect(janela.getByText("Escolha ao menos uma função.")).toBeVisible();
    await semViolacoes(page);
    await janela.getByRole("checkbox", { name: /Suporte/ }).check();
    await janela.getByRole("button", { name: "Reativar Lia" }).click();
    await expect(page.getByText("Lia Moura voltou para a equipe.")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")?.corpo).toEqual({ nome: "Lia Moura", email: "lia@t3jus.pro", funcoes: ["SUPORTE"] });
  });

  test("cadastrar recusa quem já está na equipe; desativar pede confirmação", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: SESSAO },
      "/v1/equipe": { corpo: { pessoas: PESSOAS } },
      [`POST /v1/equipe/${BRUNO}/desativar`]: { corpo: { ok: true } },
    });
    await page.goto(`${C}/equipe`);
    await page.getByRole("button", { name: "Cadastrar pessoa" }).click();
    const janela = page.getByRole("dialog", { name: "Cadastrar pessoa" });
    await janela.getByLabel("Nome completo").fill("Bruno S.");
    await janela.getByLabel("E-mail").fill("bruno@t3jus.pro");
    await janela.getByRole("checkbox", { name: /Suporte/ }).check();
    await janela.getByRole("button", { name: "Enviar convite" }).click();
    await expect(janela.getByText("Esta pessoa já está na equipe: Bruno Seixas.")).toBeVisible();
    await janela.getByRole("button", { name: "Cancelar" }).click();

    await expect(page.getByRole("button", { name: "Desativar Carol Andrade" })).toHaveCount(0);
    await page.getByRole("button", { name: "Desativar Bruno Seixas" }).locator("visible=true").click();
    const alerta = page.getByRole("alertdialog", { name: "Desativar Bruno Seixas?" });
    await expect(alerta.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await alerta.getByRole("button", { name: "Desativar Bruno" }).click();
    await expect(page.getByText(/Bruno Seixas foi desativado/)).toBeVisible();
    expect(pedidos.filter((p) => p.metodo === "POST").map((p) => p.caminho)).toEqual([`/v1/equipe/${BRUNO}/desativar`]);
  });

  test("quem não é da Administração vê que a página não é sua", async ({ page }) => {
    await simular(page, {
      "/v1/sessao": { corpo: { ...SESSAO, funcoes: ["SUPORTE"] } },
      "/v1/equipe": { status: 403, corpo: { erro: { codigo: "FORBIDDEN" } } },
    });
    await page.goto(`${C}/equipe`);
    await expect(page.getByText("Esta página é da Administração.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cadastrar pessoa" })).toHaveCount(0);
    await semViolacoes(page);
  });
});
