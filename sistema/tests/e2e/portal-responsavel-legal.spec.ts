// Quem assina pelo cliente menor ou sob curatela (F3.98; tela aprovada em
// docs/design/aprovadas/portal-responsavel-legal): o cadastro do menor com a data de nascimento,
// a ficha com "Quem assina por…" e a linha do tempo, a faixa e a janela dos 18 anos, e o quadro
// em Gerar documentos. A API é simulada; aqui se testa a tela, a acessibilidade e o que ela manda.
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
    await semViolacoes(page);
  });

  test("Gerar documentos: o quadro diz quem assina pelo menor", async ({ page }) => {
    const OAB = { id: "0ab00000-0000-4000-8000-000000000001", uf: "SP", numero: "214538", letra: null, tipo: "PRINCIPAL", versao: 1, texto: "OAB/SP 214.538", documento: "OAB/SP nº 214.538" };
    const assistido = nasceu(16, -60);
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/avisos": { corpo: { novos: 0, total: 0, itens: [] } },
      "GET /v1/escritorio/pessoas/oab": { corpo: { pessoas: [{ ...MARINA, oab: [OAB] }] } },
      [`GET /v1/escritorio/contratos/${CT}/documentos-dados`]: { corpo: {
        contrato: { id: CT, numero: "C-2026-040", objeto: "Pensão por morte", estado: "ELABORACAO", assinadoEm: null, versao: 1 },
        cliente: { ...BASE, nascimento: assistido }, condicoes: [], casos: [],
        advogados: [{ pessoaId: MARINA.id, nome: MARINA.nome, noContrato: true, responsavel: true, inscricoes: [OAB], escolhidas: [OAB.id] }],
        semOab: [], escritorio: { nome: "Ribeiro & Matos", cnpj: "41207338000105", endereco: "Rua Tabapuã, 1.123", cidade: "São Paulo", uf: "SP", oab: null },
        marca: null, hoje,
        modelos: [{ tipo: "PROCURACAO", modeloId: null, nome: "Procuração", numero: null, padrao: "PROCURACAO", emRevisao: true }],
        atuais: [], ultima: null, mudancas: [], poderesIniciais: [],
      } },
      [`POST /v1/escritorio/contratos/${CT}/documentos/previa`]: { corpo: { documentos: [], frase: "" } },
    });
    await page.goto(`${P}/contratos/modelos/gerar?contrato=${CT}`);
    await expect(page.getByText("Quem assina por Pedro")).toBeVisible();
    await expect(page.getByText("Joana Alves Souza")).toBeVisible();
    await expect(page.getByText("Mãe · CPF 377.640.215-63")).toBeVisible();
    await expect(page.getByText(/Pedro tem 16 ou 17 anos: os documentos saem com “neste ato assistido\(a\) por…”/)).toBeVisible();
    await semViolacoes(page);
  });
});
