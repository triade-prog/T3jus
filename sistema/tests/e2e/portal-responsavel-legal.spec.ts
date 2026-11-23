// Quem assina pelo cliente menor ou sob curatela (F3.98; tela aprovada em
// docs/design/aprovadas/portal-responsavel-legal): o cadastro do menor com a data de nascimento,
// a ficha com "Quem assina por…" e a linha do tempo, a faixa e a janela dos 18 anos, e o quadro
// em Gerar documentos, e o termo de curatela (F3.118): o arquivo opcional no cadastro e na edição,
// "Baixar o termo" na ficha e Gerar documentos da curatela como no estado gerar-curatela. A API é
// simulada; aqui se testa a tela, a acessibilidade e o que ela manda.
import { expect, test, type Page } from "@playwright/test";
import { h, semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const CLI = "c1000000-0000-4000-8000-000000000201";
const CT = "f1000000-0000-4000-8000-000000000233";
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};

type Resp = { status?: number; corpo: unknown };
type Pedido = { metodo: string; caminho: string; corpo: unknown };
async function simular(page: Page, rotas: Record<string, Resp | Resp[]>) {
  const pedidos: Pedido[] = [];
  await page.route("**/api/v1/**", async (rota) => {
    const url = new URL(rota.request().url());
    const caminho = url.pathname.replace(/^\/api/, "");
    const metodo = rota.request().method();
    pedidos.push({ metodo, caminho, corpo: rota.request().postDataJSON() });
    const r = rotas[`${metodo} ${caminho}${url.search}`] ?? rotas[`${metodo} ${caminho}`] ?? rotas[caminho];
    const lista = Array.isArray(r) ? r : r ? [r] : [{ status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } }];
    const vez = pedidos.filter((p) => p.caminho === caminho && p.metodo === metodo).length - 1;
    const x = lista[Math.min(vez, lista.length - 1)]!;
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  await page.route("**/envio-falso/**", (rota) => rota.fulfill({ status: 200, body: "{}" }));
  await page.route("**/leitura-falsa/**", (rota) => rota.fulfill({
    status: 200, contentType: "application/pdf", headers: { "content-disposition": 'attachment; filename="termo.pdf"' }, body: "%PDF-1.4",
  }));
  return pedidos;
}

/** Hoje em Brasília, e a data de quem faz n anos daqui a d dias. */
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const nasceu = (anos: number, dias: number) => {
  const x = new Date(`${hoje}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + dias);
  x.setUTCFullYear(x.getUTCFullYear() - anos);
  return x.toISOString().slice(0, 10);
};
const br = (iso: string) => iso.split("-").reverse().join("/");
const mais = (iso: string, anos: number) => `${Number(iso.slice(0, 4)) + anos}${iso.slice(4)}`;

const PEDRO_NASC = nasceu(12, 40);
const BASE = {
  id: CLI, tipo: "PF", nome: "Pedro Alves Souza", documento: "48821390730", nacionalidade: "brasileiro", estadoCivil: null, profissao: null,
  rg: null, rgOrgao: null, cep: "04117030", endereco: "Rua das Acácias, 418", bairro: "Vila Mariana", cidade: "São Paulo", uf: "SP",
  repNome: null, repCargo: null, repDocumento: null, repEstadoCivil: null, repProfissao: null, situacao: "ATIVO", inativadoEm: null,
  motivoInativacao: null, inativadoPor: null, criadoEm: h(24 * 30), criadoPor: MARINA, versao: 4, comercial: false,
  podeInativar: true, faltando: ["RL_RG"], totalQualificacao: 6, alterado: null, contatos: [], origem: null, atendimentos: 0, proxContato: null,
  capacidade: "MENOR", nascimento: PEDRO_NASC, rlPapel: "MAE", rlNome: "Joana Alves Souza", rlDocumento: "37764021563", rlRg: null, rlRgOrgao: null,
  rlNacionalidade: "brasileira", rlEstadoCivil: "DIVORCIADO", rlProfissao: "auxiliar administrativa", rlMoraJunto: true,
  rlCep: null, rlEndereco: null, rlBairro: null, rlCidade: null, rlUf: null, curModo: null, curProcesso: null, curVara: null,
  assina: { situacao: "REPRESENTADO", idade: 11, faz16: mais(PEDRO_NASC, 16), faz18: mais(PEDRO_NASC, 18), modo: null },
  quemAssinava: null,
};
const comuns = (ficha: unknown) => ({
  "/v1/escritorio": { corpo: ESCRITORIO },
  "GET /v1/escritorio/avisos": { corpo: { novos: 0, total: 0, itens: [] } },
  [`GET /v1/escritorio/clientes/${CLI}`]: { corpo: ficha },
});

test.describe("Quem assina pelo cliente (F3.98)", () => {
  test("cadastro: menor pede a data e quem assina, faz a conta e manda os campos", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(BASE),
      "GET /v1/escritorio/clientes/duplicados": { corpo: { duplicados: [] } },
      "POST /v1/escritorio/clientes": { status: 201, corpo: { id: CLI, versao: 1 } },
    });
    await page.goto(`${P}/clientes/novo`);
    await page.getByLabel(/^Nome completo/).fill("Pedro Alves Souza");
    await page.getByLabel(/^Telefone ou WhatsApp/).fill("(11) 98877-6601");
    await page.getByRole("radio", { name: /Não: é menor de 18 anos/ }).check();
    const menor = page.getByRole("group", { name: /Menor de 18 anos/ });
    await expect(menor).toBeVisible();
    await page.getByRole("button", { name: "Cadastrar cliente" }).click();
    await expect(menor.getByLabel(/^Data de nascimento/)).toHaveAttribute("aria-invalid", "true");
    await menor.getByLabel(/^Data de nascimento/).fill(br(PEDRO_NASC));
    await expect(menor.getByText(/tem 11 anos hoje: é representado\(a\)/)).toBeVisible();
    await menor.getByLabel(/^É/).selectOption("MAE");
    await menor.getByLabel(/^Nome completo/).fill("Joana Alves Souza");
    await menor.getByLabel(/^CPF/).fill("377.640.215-63");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Cadastrar cliente" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Pedro Alves Souza" })).toBeVisible();
    const corpo = pedidos.find((p) => p.metodo === "POST" && p.caminho === "/v1/escritorio/clientes")?.corpo as Record<string, unknown>;
    expect(corpo).toMatchObject({ capacidade: "MENOR", nascimento: PEDRO_NASC, rlPapel: "MAE", rlNome: "Joana Alves Souza", rlDocumento: "37764021563", rlMoraJunto: true });
  });

  test("ficha: selo, quem assina com a regra dos 16 e a linha do tempo", async ({ page }) => {
    await simular(page, comuns(BASE));
    await page.goto(`${P}/clientes/${CLI}`);
    await expect(page.getByRole("heading", { level: 1, name: "Pedro Alves Souza" })).toBeVisible();
    await expect(page.getByText("Menor · assina a mãe")).toBeVisible();
    const folha = page.getByRole("region", { name: "Quem assina por Pedro" });
    await expect(folha.getByText("Joana Alves Souza")).toBeVisible();
    await expect(folha.getByText("Representa · Pedro tem menos de 16 anos")).toBeVisible();
    await expect(folha.getByText("Divorciada")).toBeVisible();
    await expect(folha.getByText(`Em ${br(mais(PEDRO_NASC, 16))}, aos 16 anos`, { exact: false })).toBeVisible();
    await expect(page.getByRole("list", { name: "Quem assina por Pedro, por idade" }).getByRole("listitem")).toHaveCount(3);
    await expect(page.getByText(`${br(PEDRO_NASC)} · 11 anos`)).toBeVisible();
    await expect(page.getByText("Não tem · opcional para menor")).toBeVisible();
    await expect(page.getByText("Estado civil", { exact: true })).toHaveCount(1);
    await expect(page.getByText("5 de 6", { exact: true })).toBeVisible();
    await semViolacoes(page);
  });

  test("fez 18: a faixa avisa e a janela confirma, guardando quem assinava", async ({ page }) => {
    const nasc = nasceu(18, -3);
    const fez = { ...BASE, nome: "Rafaela Lima Torres", nascimento: nasc, assina: { situacao: "FEZ_18", idade: 18, faz16: mais(nasc, 16), faz18: mais(nasc, 18), modo: null } };
    const depois = { ...fez, versao: 5, capacidade: "PLENA", rlNome: null, rlPapel: null, assina: { situacao: "PROPRIO", idade: null, faz16: null, faz18: null, modo: null },
      estadoCivil: "SOLTEIRO", profissao: "estudante", quemAssinava: { papel: "MAE", nome: "Joana Alves Souza", documento: "37764021563", ate: hoje, contratos: ["C-2026-012"] } };
    const pedidos = await simular(page, {
      ...comuns(fez),
      [`GET /v1/escritorio/clientes/${CLI}`]: [{ corpo: fez }, { corpo: depois }],
      [`POST /v1/escritorio/clientes/${CLI}/assina-por-si`]: { corpo: { versao: 5 } },
    });
    await page.goto(`${P}/clientes/${CLI}`);
    await expect(page.getByText(`Fez 18 anos em ${br(mais(nasc, 18)).slice(0, 5)}`, { exact: true })).toBeVisible();
    const faixa = page.locator(".rl-faixa");
    await expect(faixa).toContainText("Rafaela fez 18 anos");
    await expect(faixa.getByRole("link", { name: "Gerar procuração nova" })).toHaveAttribute("href", "/contratos/modelos/gerar");
    await semViolacoes(page);
    await faixa.getByRole("button", { name: "Atualizar a ficha de Rafaela" }).click();
    const janela = page.getByRole("dialog", { name: "Rafaela agora assina por si" });
    await expect(janela).toBeVisible();
    await janela.getByLabel(/^Estado civil/).selectOption("SOLTEIRO");
    await janela.getByLabel(/^Profissão/).fill("estudante");
    await semViolacoes(page);
    await janela.getByRole("button", { name: "Salvar: Rafaela assina por si" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Rafaela agora assina por si." })).toBeVisible();
    await expect(page.getByRole("region", { name: "Quem assinava com Rafaela" })).toContainText("Documentos do contrato C-2026-012");
    await expect(page.locator(".rl-faixa")).toHaveCount(0);
    expect(pedidos.find((p) => p.metodo === "POST")?.corpo).toEqual({ versao: 4, estadoCivil: "SOLTEIRO", profissao: "estudante" });
  });

  test("curatela: quem assina é a curadora, como diz o termo", async ({ page }) => {
    const cur = { ...BASE, nome: "Lucas Moreira Dantas", capacidade: "CURATELA", nascimento: null, rlPapel: "CURADORA", rlNome: "Cleusa Moreira Dantas",
      rlDocumento: "12750839432", curModo: "REPRESENTA", curProcesso: "1012345-67.2024.8.26.0100", curVara: "2ª Vara da Família de São Paulo",
      assina: { situacao: "CURATELA", idade: null, faz16: null, faz18: null, modo: "REPRESENTA" } };
    await simular(page, comuns(cur));
    await page.goto(`${P}/clientes/${CLI}`);
    await expect(page.getByText("Sob curatela · assina a curadora")).toBeVisible();
    const folha = page.getByRole("region", { name: "Quem assina por Lucas" });
    await expect(folha.getByText("Representa · como diz o termo")).toBeVisible();
    await expect(folha.getByText("1012345-67.2024.8.26.0100")).toBeVisible();
    await expect(folha.getByText("Ao gerar, lembre de juntar o termo de curatela à procuração.")).toBeVisible();
    await expect(page.getByRole("list", { name: /por idade/ })).toHaveCount(0);
    // Curatela sem termo na ficha: nada a mais na folha (F3.118).
    await expect(folha.getByRole("button", { name: "Baixar o termo" })).toHaveCount(0);
    await semViolacoes(page);
  });
});

// ------------------------------------------------------------------------------- F3.142

// Gerar documentos do menor como no desenho aprovado (D25): gerar-representado, gerar-assistido,
// gerar-falta e gerar-fez-18. A idade é a do dia, então os textos usam a data calculada.
test.describe("Gerar documentos do menor (F3.142)", () => {
  const OAB = { id: "0ab00000-0000-4000-8000-000000000001", uf: "SP", numero: "214538", letra: null, tipo: "PRINCIPAL", versao: 1, texto: "OAB/SP 214.538", documento: "OAB/SP nº 214.538" };
  const MODELOS = [
    { tipo: "CONTRATO", modeloId: null, nome: "Contrato de honorários", numero: null, padrao: "CONTRATO", emRevisao: true },
    { tipo: "PROCURACAO", modeloId: null, nome: "Procuração", numero: null, padrao: "PROCURACAO", emRevisao: true },
    { tipo: "HIPOSSUFICIENCIA", modeloId: null, nome: "Declaração de hipossuficiência", numero: null, padrao: "HIPOSSUFICIENCIA_PF", emRevisao: true },
  ];
  const seg = (t: string, texto: string) => ({ t, texto });
  /** A prévia simulada, com os documentos completos: só mudam os marcados e a frase. */
  const previa = (n: number, marcados: string[], frase: string) => ({
    documentos: MODELOS.slice(0, n).map((m) => ({ tipo: m.tipo, modeloId: null, nome: m.nome, marcados, desconhecidos: [],
      paragrafos: [[seg("fixo", m.nome.toUpperCase())], [seg("fixo", "OUTORGANTE: "), seg("cadastro", "PEDRO ALVES SOUZA")]] })),
    frase,
  });
  const dadosGerarMenor = (cliente: unknown, prev: unknown, n = 3) => ({
    "/v1/escritorio": { corpo: ESCRITORIO },
    "GET /v1/escritorio/avisos": { corpo: { novos: 0, total: 0, itens: [] } },
    "GET /v1/escritorio/pessoas/oab": { corpo: { pessoas: [{ ...MARINA, oab: [OAB] }] } },
    [`GET /v1/escritorio/contratos/${CT}/documentos-dados`]: { corpo: {
      contrato: { id: CT, numero: "C-2026-040", objeto: "Pensão por morte", estado: "ELABORACAO", assinadoEm: null, versao: 1 },
      cliente, condicoes: [], casos: [],
      advogados: [{ pessoaId: MARINA.id, nome: MARINA.nome, noContrato: true, responsavel: true, inscricoes: [OAB], escolhidas: [OAB.id] }],
      semOab: [], escritorio: { nome: "Ribeiro & Matos", cnpj: "41207338000105", endereco: "Rua Tabapuã, 1.123", cidade: "São Paulo", uf: "SP", oab: null },
      marca: null, hoje, modelos: MODELOS.slice(0, n), atuais: [], ultima: null, mudancas: [], poderesIniciais: [],
    } },
    [`POST /v1/escritorio/contratos/${CT}/documentos/previa`]: { corpo: prev },
  });
  const gerar = (page: Page) => page.goto(`${P}/contratos/modelos/gerar?contrato=${CT}`);
  const faixa = (page: Page) => page.getByRole("region", { name: "Gerar", exact: true });
  const COM_RG = { rlRg: "28.441.903-7", rlRgOrgao: "SSP/SP" };

  test("representado: o aviso do dia e “Em todos, Joana assina por Pedro”", async ({ page }) => {
    await simular(page, dadosGerarMenor({ ...BASE, ...COM_RG }, previa(3, [], "Nenhum dado sai marcado.")));
    await gerar(page);
    await expect(page.getByText("Quem assina por Pedro")).toBeVisible();
    await expect(page.getByText("Mãe · CPF 377.640.215-63")).toBeVisible();
    const aviso = page.getByRole("status").filter({ hasText: "Pedro tem 11 anos hoje: é representado(a)." });
    await expect(aviso).toContainText(`Só Joana assina, em nome de Pedro, os três documentos. Em ${br(mais(PEDRO_NASC, 16))}, aos 16 anos, Pedro passa a ser assistido(a), e os dois assinam. O T3jus faz a conta pela data de nascimento, no dia de gerar.`);
    await expect(faixa(page)).toContainText("Nenhum dado sai marcado. Em todos, Joana assina por Pedro. Cada geração fica registrada");
    await expect(page.getByText(/tem menos de 16 anos: a procuração e o contrato saem com/)).toHaveCount(0);
    await expect(page.getByText(/Faltam? \d dados? de quem assina/)).toHaveCount(0);
    await semViolacoes(page);
  });

  test("assistido: os dois assinam, com o pai", async ({ page }) => {
    const nasc = nasceu(16, -60);
    await simular(page, dadosGerarMenor({ ...BASE, ...COM_RG, nascimento: nasc, rlPapel: "PAI", rlNome: "Marcos Alves Souza" }, previa(1, [], "Nenhum dado sai marcado."), 1));
    await gerar(page);
    await expect(page.getByText("Pai · CPF 377.640.215-63")).toBeVisible();
    const aviso = page.getByRole("status").filter({ hasText: "Pedro tem 16 anos hoje: é assistido(a)." });
    await expect(aviso).toContainText(`Os dois assinam o documento: Pedro e o pai, Marcos, que o(a) assiste. Em ${br(mais(nasc, 18))}, aos 18 anos, Pedro passa a assinar sozinho(a).`);
    await expect(faixa(page)).toContainText("Nenhum dado sai marcado. Em todos, Pedro e Marcos assinam.");
    await semViolacoes(page);
  });

  test("falta dado de quem assina: o aviso em atenção, o quadro tracejado e a lista na faixa", async ({ page }) => {
    const marcados = ["CPF de quem assina de Pedro Alves Souza", "RG de quem assina de Pedro Alves Souza"];
    await simular(page, dadosGerarMenor({ ...BASE, rlDocumento: null, rlRg: null }, previa(3, marcados, "2 dados saem marcados em cada um.")));
    await gerar(page);
    const aviso = page.getByRole("status").filter({ hasText: "Faltam 2 dados de quem assina por Pedro: o CPF e o RG de Joana." });
    await expect(aviso).toContainText("Dá para gerar assim: os três documentos saem com [CPF DE QUEM ASSINA: falta] e [RG DE QUEM ASSINA: falta], para preencher à mão ou no Word. Ou complete a ficha antes.");
    const completar = aviso.getByRole("link", { name: "Completar na ficha (abre numa aba nova)" });
    await expect(completar).toHaveAttribute("href", `/clientes/${CLI}`);
    await expect(completar).toHaveAttribute("target", "_blank");
    await expect(page.getByText(/é representado\(a\)/)).toHaveCount(0);
    await expect(page.getByText("Faltam o CPF e o RG dela")).toBeVisible();
    await expect(page.locator(".pe-dado.rl-falta")).toHaveCount(1);
    await expect(faixa(page)).toContainText("2 dados saem marcados em cada um: o CPF e o RG de Joana. Cada geração");
    await expect(faixa(page)).not.toContainText("Em todos");
    // Um aviso de falta só: o genérico não repete as de quem assina.
    await expect(page.getByText(/^Faltam? \d dados? de Pedro/)).toHaveCount(0);
    await semViolacoes(page);
  });

  test("fez 18: o aviso no lugar do quadro e do aviso genérico", async ({ page }) => {
    const nasc = nasceu(18, -3);
    const marcados = ["Estado civil de Pedro Alves Souza", "Profissão de Pedro Alves Souza"];
    await simular(page, dadosGerarMenor({ ...BASE, ...COM_RG, nascimento: nasc, rlPapel: "TUTORA", rlNome: "Cleusa Nunes", rg: "41.207.338-0", rgOrgao: "SSP/SP" },
      previa(1, marcados, "2 dados saem marcados."), 1));
    await gerar(page);
    const aviso = page.getByRole("status").filter({ hasText: `Pedro fez 18 anos em ${br(mais(nasc, 18))}: agora assina por si.` });
    await expect(aviso).toContainText("A tutora, Cleusa, que assinava com Pedro, não entra mais. Faltam 2 dados de Pedro, que antes não iam no documento: o estado civil e a profissão. Dá para gerar assim: saem marcados, para completar no Word. Ou complete a ficha antes.");
    await expect(aviso.getByRole("link", { name: "Completar na ficha (abre numa aba nova)" })).toHaveAttribute("href", `/clientes/${CLI}`);
    await expect(page.getByText("Quem assina por Pedro")).toHaveCount(0);
    await expect(page.getByText("Faltam 2 dados de Pedro: o estado civil e a profissão.")).toHaveCount(0);
    await expect(faixa(page)).toContainText("2 dados saem marcados: o estado civil e a profissão de Pedro.");
    await expect(faixa(page)).not.toContainText("Em todos");
    await semViolacoes(page);
  });

  test("falta misturada: o aviso genérico com a do cliente e o de quem assina com a de Joana", async ({ page }) => {
    const marcados = ["Nacionalidade de Pedro Alves Souza", "RG de quem assina de Pedro Alves Souza"];
    await simular(page, dadosGerarMenor({ ...BASE, nacionalidade: null }, previa(3, marcados, "2 dados saem marcados em cada um.")));
    await gerar(page);
    await expect(page.getByRole("status").filter({ hasText: "Falta 1 dado de Pedro: a nacionalidade." })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Falta 1 dado de quem assina por Pedro: o RG de Joana." })).toContainText("os três documentos saem com [RG DE QUEM ASSINA: falta]");
    await expect(page.getByText("Falta o RG dela")).toBeVisible();
    await expect(faixa(page)).toContainText("2 dados saem marcados em cada um. Cada geração");
    await semViolacoes(page);
  });
});

// ------------------------------------------------------------------------------- F3.118

const TERMO = "d1180000-0000-4000-8000-000000000001";
const TERMO2 = "d1180000-0000-4000-8000-000000000002";
const PDF = { name: "termo-curatela.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 termo de curatela") };
const CURATELA = {
  ...BASE, nome: "Sebastião Ramos Filho", capacidade: "CURATELA", nascimento: null, rlPapel: "CURADORA", rlNome: "Helena Ramos Castro",
  rlDocumento: "12750839432", curModo: "REPRESENTA", curProcesso: "1004587-22.2025.8.26.0100", curVara: "2ª Vara da Família de São Paulo",
  assina: { situacao: "CURATELA", idade: null, faz16: null, faz18: null, modo: "REPRESENTA" }, termoCuratela: null,
  contatos: [{ id: "c2000000-0000-4000-8000-000000000001", nome: "Helena Ramos Castro", papel: "Filha e curadora", telefone: "+5511991827364", email: null, principal: true }],
};
const termoNaFicha = (id = TERMO, nome = "termo-curatela-sebastiao.pdf") => ({
  id, tipo: "TERMO_CURATELA", nome, arquivoTipo: "application/pdf", tamanho: 389120, fotos: null,
  enviadoPor: { id: "a0000000-0000-4000-8000-000000000102", nome: "Paula Nunes" }, enviadoEm: "2026-11-05T15:00:00Z", anteriores: 0,
});
const envioDoTermo = (id = TERMO) => ({
  [`POST /v1/escritorio/clientes/${CLI}/termo-curatela`]: { status: 201, corpo: { id, enderecoDeEnvio: `${P}/envio-falso/${id}` } },
  [`POST /v1/escritorio/clientes/documentos/${id}/concluir`]: { corpo: termoNaFicha(id, PDF.name) },
});
const ordem = (pedidos: Pedido[]) => pedidos.filter((p) => p.metodo !== "GET").map((p) => `${p.metodo} ${p.caminho}`);

async function cadastrarCuratela(page: Page) {
  await page.goto(`${P}/clientes/novo`);
  await page.getByLabel(/^Nome completo/).first().fill("Sebastião Ramos Filho");
  await page.getByLabel(/^Telefone ou WhatsApp/).fill("(11) 98877-6601");
  await page.getByRole("radio", { name: /Não: está sob curatela/ }).check();
  const painel = page.getByRole("group", { name: /Sob curatela: quem assina e o termo/ });
  await painel.getByLabel(/^É/).selectOption("CURADORA");
  await painel.getByLabel(/^Nome completo/).fill("Helena Ramos Castro");
  return painel;
}
async function escolher(page: Page, botao: string, arquivo: { name: string; mimeType: string; buffer: Buffer }) {
  const [seletor] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: botao }).click()]);
  await seletor.setFiles(arquivo);
}

test.describe("Termo de curatela (F3.118)", () => {
  test("cadastro: curatela com o termo, salva a ficha e depois envia", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns({ ...CURATELA, termoCuratela: termoNaFicha(TERMO, PDF.name) }),
      "GET /v1/escritorio/clientes/duplicados": { corpo: { duplicados: [] } },
      "POST /v1/escritorio/clientes": { status: 201, corpo: { id: CLI, versao: 1 } },
      ...envioDoTermo(),
    });
    const painel = await cadastrarCuratela(page);
    await expect(painel.getByText("PDF ou foto, até 10 MB. Fica guardado na ficha, só para o escritório.")).toBeVisible();
    await escolher(page, "Escolher arquivo: termo de curatela", PDF);
    const arq = painel.getByRole("group", { name: PDF.name });
    await expect(arq.getByText(/^PDF · \d+ KB$/)).toBeVisible();
    await expect(arq.getByRole("button", { name: "Trocar arquivo: termo de curatela" })).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Cadastrar cliente" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Sebastião Ramos Filho cadastrado." })).toBeVisible();
    expect(ordem(pedidos)).toEqual([
      "POST /v1/escritorio/clientes", `POST /v1/escritorio/clientes/${CLI}/termo-curatela`, `POST /v1/escritorio/clientes/documentos/${TERMO}/concluir`,
    ]);
    expect(pedidos.find((p) => p.caminho.endsWith("/termo-curatela"))?.corpo).toEqual({ nome: PDF.name, arquivoTipo: "application/pdf", tamanho: PDF.buffer.length });
    await expect(page.getByRole("region", { name: "Quem assina por Sebastião" }).getByText("Termo de curatela", { exact: true })).toBeVisible();
  });

  test("cadastro: o envio do termo cai depois de salvar e a ficha avisa, em atenção, com a frase do caso", async ({ page }) => {
    await simular(page, {
      ...comuns(CURATELA),
      "GET /v1/escritorio/clientes/duplicados": { corpo: { duplicados: [] } },
      "POST /v1/escritorio/clientes": { status: 201, corpo: { id: CLI, versao: 1 } },
      ...envioDoTermo(),
      [`POST /v1/escritorio/clientes/documentos/${TERMO}/concluir`]: { status: 400, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { campos: ["arquivo"], motivo: "ARQUIVO_NAO_CHEGOU" } } } },
    });
    await cadastrarCuratela(page);
    await escolher(page, "Escolher arquivo: termo de curatela", PDF);
    await page.getByRole("button", { name: "Cadastrar cliente" }).click();
    // Docs/design/aprovadas/portal-termo-curatela, item 1 (caso sem conexão: o envio caiu no meio).
    const aviso = page.getByRole("status").filter({ hasText: "Sebastião Ramos Filho cadastrado." });
    await expect(aviso).toHaveText("Sebastião Ramos Filho cadastrado.O termo de curatela não foi guardado: não deu para falar com o T3jus. "
      + "Mande de novo em “Mudar”, na folha Quem assina por Sebastião.");
    await expect(aviso).toHaveClass(/aviso-atencao/);
    await expect(aviso).not.toHaveClass(/aviso-sucesso/);
    await expect(aviso.getByRole("button", { name: "Fechar aviso" })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/clientes/${CLI}$`));
    // Sem termo guardado, a folha fica sem o bloco do termo.
    const folha = page.getByRole("region", { name: "Quem assina por Sebastião" });
    await expect(folha).toBeVisible();
    await expect(folha.getByRole("group", { name: "Termo de curatela" })).toHaveCount(0);
    await semViolacoes(page);
    await aviso.getByRole("button", { name: "Fechar aviso" }).click();
    await expect(page.getByText("O termo de curatela não foi guardado", { exact: false })).toHaveCount(0);
  });

  test("ficha: a área do aviso de feito já está na página antes do texto", async ({ page }) => {
    // O leitor de tela só lê o que muda numa área role="status" que ele já conhece.
    await page.addInitScript(() => {
      const w = window as unknown as { vazioAntes?: boolean };
      new MutationObserver(() => {
        for (const el of document.querySelectorAll(".toast")) {
          if (el.getAttribute("role") === "status" && w.vazioAntes === undefined) w.vazioAntes = el.getAttribute("data-vazio") === "1";
        }
        for (const el of document.querySelectorAll("[role=status].sr")) if (!el.textContent) el.setAttribute("data-vazio", "1");
      }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
    });
    await simular(page, comuns(CURATELA));
    await page.goto(`${P}/clientes/${CLI}?cadastrado=1&termo=UPSTREAM_UNAVAILABLE`);
    await expect(page.getByRole("status").filter({ hasText: "Sebastião Ramos Filho cadastrado." })).toContainText("não deu para falar com o T3jus");
    expect(await page.evaluate(() => (window as unknown as { vazioAntes?: boolean }).vazioAntes)).toBe(true);
  });

  test("editar: salvou a ficha, mas o arquivo foi recusado: “Ficha salva.” em atenção", async ({ page }) => {
    await simular(page, {
      ...comuns(CURATELA),
      [`PUT /v1/escritorio/clientes/${CLI}`]: { corpo: { id: CLI, versao: 5 } },
      [`POST /v1/escritorio/clientes/${CLI}/termo-curatela`]: { status: 400, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { campos: ["tamanho"] } } } },
    });
    await page.goto(`${P}/clientes/${CLI}`);
    await page.getByRole("button", { name: "Mudar quem assina por Sebastião" }).click();
    await escolher(page, "Escolher arquivo: termo de curatela", PDF);
    await page.getByRole("button", { name: "Salvar ficha" }).click();
    const aviso = page.getByRole("status").filter({ hasText: "Ficha salva." });
    await expect(aviso).toHaveText("Ficha salva.O termo de curatela não foi guardado: o arquivo precisa ser PDF ou foto, até 10 MB. "
      + "Mande de novo em “Mudar”, na folha Quem assina por Sebastião.");
    await expect(aviso).toHaveClass(/aviso-atencao/);
    // Saiu do formulário (a versão mudou com o PUT).
    await expect(page.getByRole("button", { name: "Salvar ficha" })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("cadastro: arquivo de tipo errado não sai", async ({ page }) => {
    const pedidos = await simular(page, comuns(CURATELA));
    const painel = await cadastrarCuratela(page);
    await escolher(page, "Escolher arquivo: termo de curatela", { name: "termo.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: Buffer.from("x") });
    await expect(painel.getByText("Tipo não aceito. Envie PDF, JPG ou PNG.")).toBeVisible();
    await expect(painel.getByRole("button", { name: "Escolher arquivo: termo de curatela" })).toBeVisible();
    await semViolacoes(page);
    expect(pedidos.some((p) => p.caminho.endsWith("/termo-curatela"))).toBe(false);
  });

  test("ficha: o termo para baixar, fora de Documentos pessoais", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns({ ...CURATELA, termoCuratela: termoNaFicha() }),
      [`GET /v1/escritorio/clientes/${CLI}/documentos`]: { corpo: { hoje, validadeDias: 90, podeAnexar: true, documentos: [], pedidos: [] } },
      [`POST /v1/escritorio/clientes/documentos/${TERMO}/abrir`]: { corpo: { url: `${P}/leitura-falsa/${TERMO}?download=termo.pdf`, validadeSegundos: 60 } },
    });
    await page.goto(`${P}/clientes/${CLI}`);
    const folha = page.getByRole("region", { name: "Quem assina por Sebastião" });
    const termo = folha.getByRole("group", { name: "Termo de curatela" });
    await expect(termo.getByText("termo-curatela-sebastiao.pdf · enviado por Paula Nunes em 05/11")).toBeVisible();
    await expect(folha.getByText("Ao gerar, lembre de juntar o termo de curatela à procuração.")).toBeVisible();
    await semViolacoes(page);
    const [baixado] = await Promise.all([page.waitForEvent("download"), termo.getByRole("button", { name: "Baixar o termo" }).click()]);
    expect(baixado.suggestedFilename()).toBe("termo.pdf");
    expect(pedidos.some((p) => p.metodo === "POST" && p.caminho === `/v1/escritorio/clientes/documentos/${TERMO}/abrir`)).toBe(true);
    await expect(page.getByRole("region", { name: /Documentos pessoais/ })).not.toContainText("termo");
  });

  test("ficha: o erro ao baixar o termo, logo abaixo da linha do arquivo, a cada falha", async ({ page }) => {
    const falha = { status: 503, corpo: { erro: { codigo: "UPSTREAM_UNAVAILABLE" } } };
    await simular(page, {
      ...comuns({ ...CURATELA, termoCuratela: termoNaFicha() }),
      [`GET /v1/escritorio/clientes/${CLI}/documentos`]: { corpo: { hoje, validadeDias: 90, podeAnexar: true, documentos: [], pedidos: [] } },
      [`POST /v1/escritorio/clientes/documentos/${TERMO}/abrir`]: [falha, falha, { corpo: { url: `${P}/leitura-falsa/${TERMO}?download=termo.pdf`, validadeSegundos: 60 } }],
    });
    await page.goto(`${P}/clientes/${CLI}`);
    const folha = page.getByRole("region", { name: "Quem assina por Sebastião" });
    const botao = folha.getByRole("button", { name: "Baixar o termo" });
    await expect(folha.getByRole("alert")).toHaveCount(0);
    await botao.click();
    const erro = folha.getByRole("alert");
    await expect(erro).toHaveText("Não deu para baixar o termo.Não deu para falar com o T3jus agora. Confira a sua internet e tente de novo em instantes.");
    await expect(erro).toHaveClass(/aviso-urgencia/);
    // Logo abaixo da linha do arquivo, e o botão continua e aponta para o erro.
    expect(await erro.evaluate((el) => el.previousElementSibling?.matches(".rl-arq") ?? false)).toBe(true);
    await expect(botao).toBeEnabled();
    await expect(botao).toHaveAttribute("aria-describedby", (await erro.getAttribute("id"))!);
    await expect(botao).toHaveAccessibleDescription(/Não deu para baixar o termo/);
    await semViolacoes(page);
    // Na segunda falha o aviso é outro elemento, para o leitor de tela ler de novo.
    await erro.evaluate((el) => el.setAttribute("data-primeiro", "1"));
    await botao.click();
    await expect(folha.getByRole("alert")).toHaveCount(1);
    await expect(folha.locator("[role=alert][data-primeiro]")).toHaveCount(0);
    // Tentar de novo é clicar outra vez: baixa e o erro sai.
    const [baixado] = await Promise.all([page.waitForEvent("download"), botao.click()]);
    expect(baixado.suggestedFilename()).toBe("termo.pdf");
    await expect(folha.getByRole("alert")).toHaveCount(0);
    await expect(botao).not.toHaveAttribute("aria-describedby");
  });

  test("editar: trocar o termo e salvar só com ele", async ({ page }) => {
    const depois = { ...CURATELA, versao: 5, termoCuratela: termoNaFicha(TERMO2, PDF.name) };
    const pedidos = await simular(page, {
      ...comuns({ ...CURATELA, termoCuratela: termoNaFicha() }),
      [`GET /v1/escritorio/clientes/${CLI}`]: [{ corpo: { ...CURATELA, termoCuratela: termoNaFicha() } }, { corpo: depois }],
      [`PUT /v1/escritorio/clientes/${CLI}`]: { corpo: { id: CLI, versao: 5 } },
      ...envioDoTermo(TERMO2),
    });
    await page.goto(`${P}/clientes/${CLI}`);
    await page.getByRole("button", { name: "Mudar quem assina por Sebastião" }).click();
    const painel = page.getByRole("group", { name: /Sob curatela: quem assina e o termo/ });
    await expect(painel.getByRole("group", { name: "termo-curatela-sebastiao.pdf" })).toBeVisible();
    await escolher(page, "Trocar arquivo: termo de curatela", PDF);
    await expect(painel.getByRole("group", { name: PDF.name })).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Salvar ficha" }).click();
    const aviso = page.getByRole("status").filter({ hasText: "Ficha salva." });
    await expect(aviso).toContainText("O termo de curatela ficou guardado na ficha.");
    await expect(aviso).not.toContainText("A mudança ficou no histórico");
    expect(ordem(pedidos)).toEqual([
      `PUT /v1/escritorio/clientes/${CLI}`, `POST /v1/escritorio/clientes/${CLI}/termo-curatela`, `POST /v1/escritorio/clientes/documentos/${TERMO2}/concluir`,
    ]);
  });

  test("editar: sem arquivo novo, ou passando a assinar por si, o termo não sobe", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(CURATELA),
      [`PUT /v1/escritorio/clientes/${CLI}`]: { corpo: { id: CLI, versao: 5 } },
      ...envioDoTermo(),
    });
    await page.goto(`${P}/clientes/${CLI}`);
    await page.getByRole("button", { name: "Mudar quem assina por Sebastião" }).click();
    await escolher(page, "Escolher arquivo: termo de curatela", PDF);
    await page.getByRole("radio", { name: /Sim, assina por si/ }).check();
    await page.getByRole("button", { name: "Salvar ficha" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Ficha salva." })).toContainText("A mudança ficou no histórico");
    expect(ordem(pedidos)).toEqual([`PUT /v1/escritorio/clientes/${CLI}`]);
  });

  const dadosGerar = (termo: unknown) => ({
    contrato: { id: CT, numero: "C-2026-037", objeto: "Revisão da aposentadoria", estado: "ELABORACAO", assinadoEm: null, versao: 1 },
    cliente: CURATELA, condicoes: [], casos: [],
    advogados: [{ pessoaId: MARINA.id, nome: MARINA.nome, noContrato: true, responsavel: true, inscricoes: [OAB_M], escolhidas: [OAB_M.id] }],
    semOab: [], escritorio: { nome: "Ribeiro & Matos", cnpj: "41207338000105", endereco: "Rua Tabapuã, 1.123", cidade: "São Paulo", uf: "SP", oab: null },
    marca: null, hoje,
    modelos: [{ tipo: "PROCURACAO", modeloId: null, nome: "Procuração", numero: null, padrao: "PROCURACAO", emRevisao: true }],
    atuais: [], ultima: null, mudancas: [], poderesIniciais: [], termoCuratela: termo,
  });
  const OAB_M = { id: "0ab00000-0000-4000-8000-000000000001", uf: "SP", numero: "214538", letra: null, tipo: "PRINCIPAL", versao: 1, texto: "OAB/SP 214.538", documento: "OAB/SP nº 214.538" };
  const rotasGerar = (termo: unknown) => ({
    "/v1/escritorio": { corpo: ESCRITORIO },
    "GET /v1/escritorio/avisos": { corpo: { novos: 0, total: 0, itens: [] } },
    "GET /v1/escritorio/pessoas/oab": { corpo: { pessoas: [{ ...MARINA, oab: [OAB_M] }] } },
    [`GET /v1/escritorio/contratos/${CT}/documentos-dados`]: { corpo: dadosGerar(termo) },
    [`POST /v1/escritorio/contratos/${CT}/documentos/previa`]: { corpo: { documentos: [], frase: "" } },
    [`POST /v1/escritorio/clientes/documentos/${TERMO}/abrir`]: { corpo: { url: `${P}/leitura-falsa/${TERMO}?download=termo.pdf`, validadeSegundos: 60 } },
  });

  test("Gerar documentos da curatela: o aviso com Baixar o termo e a faixa", async ({ page }) => {
    const pedidos = await simular(page, rotasGerar(termoNaFicha()));
    await page.goto(`${P}/contratos/modelos/gerar?contrato=${CT}`);
    await expect(page.getByText("Termo de curatela na ficha · processo 1004587-22.2025.8.26.0100")).toBeVisible();
    const aviso = page.getByRole("status").filter({ hasText: "Sebastião está sob curatela: Helena assina por Sebastião." });
    await expect(aviso).toContainText("Ela assina sozinha o documento, como diz o termo. A qualificação cita o processo da curatela.");
    await expect(aviso).toContainText("Junte uma cópia do termo à procuração: ele está na ficha, para baixar.");
    await expect(page.getByRole("region", { name: "Gerar", exact: true })).toContainText("Em todos, Helena assina por Sebastião. Junte o termo de curatela à procuração.");
    await semViolacoes(page);
    const [baixado] = await Promise.all([page.waitForEvent("download"), aviso.getByRole("button", { name: "Baixar o termo" }).click()]);
    expect(baixado.suggestedFilename()).toBe("termo.pdf");
    expect(pedidos.some((p) => p.metodo === "POST" && p.caminho === `/v1/escritorio/clientes/documentos/${TERMO}/abrir`)).toBe(true);
  });

  test("Gerar documentos da curatela: o erro ao baixar o termo", async ({ page }) => {
    await simular(page, {
      ...rotasGerar(termoNaFicha()),
      [`POST /v1/escritorio/clientes/documentos/${TERMO}/abrir`]: { status: 503, corpo: { erro: { codigo: "UPSTREAM_UNAVAILABLE" } } },
    });
    await page.goto(`${P}/contratos/modelos/gerar?contrato=${CT}`);
    const aviso = page.getByRole("status").filter({ hasText: "Sebastião está sob curatela: Helena assina por Sebastião." });
    const botao = aviso.getByRole("button", { name: "Baixar o termo" });
    await botao.click();
    const erro = page.getByRole("alert").filter({ hasText: "Não deu para baixar o termo." });
    await expect(erro).toHaveText("Não deu para baixar o termo.Não deu para falar com o T3jus agora. Confira a sua internet e tente de novo em instantes.");
    await expect(botao).toBeEnabled();
    await expect(botao).toHaveAttribute("aria-describedby", (await erro.getAttribute("id"))!);
    await semViolacoes(page);
  });

  test("Gerar documentos da curatela sem termo na ficha: o aviso sem o botão", async ({ page }) => {
    await simular(page, rotasGerar(null));
    await page.goto(`${P}/contratos/modelos/gerar?contrato=${CT}`);
    const aviso = page.getByRole("status").filter({ hasText: "Sebastião está sob curatela" });
    await expect(aviso).toContainText("Junte uma cópia do termo à procuração.");
    await expect(aviso).not.toContainText("para baixar");
    await expect(page.getByRole("button", { name: "Baixar o termo" })).toHaveCount(0);
    await expect(page.getByText(/Termo de curatela na ficha/)).toHaveCount(0);
    await semViolacoes(page);
  });
});
