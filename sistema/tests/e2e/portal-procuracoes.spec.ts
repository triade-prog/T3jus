// Contratos › Procurações e modelos (CH-08, F3.16), telas aprovadas em
// docs/design/aprovadas/portal-procuracoes: a lista com o que falta anexar primeiro, os modelos
// de documento com a conferência do .docx, a página de gerar (com o que bloqueia, a prévia em
// abas e o resultado com "Baixar todos (.zip)" recebendo o foco), a janela de anexar os assinados
// (anexar o contrato registra a assinatura) e a aba Documentos da ficha do contrato. A API é
// simulada; aqui se testa a tela, a acessibilidade e o que ela manda.
import { expect, test, type Page } from "@playwright/test";
import { criarDocx } from "../../packages/domain/src/docx.ts";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 7, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};

type Resp = { status?: number; corpo: unknown };
type Pedido = { metodo: string; caminho: string; busca: string; corpo: unknown; bytes: number };

async function simular(page: Page, rotas: Record<string, Resp | Resp[]>) {
  const pedidos: Pedido[] = [];
  await page.route("**/api/v1/**", async (rota) => {
    const url = new URL(rota.request().url());
    const caminho = url.pathname.replace(/^\/api/, "");
    const metodo = rota.request().method();
    let corpo: unknown = null;
    try { corpo = rota.request().postDataJSON(); } catch { corpo = null; }
    pedidos.push({ metodo, caminho, busca: url.search, corpo, bytes: rota.request().postDataBuffer()?.length ?? 0 });
    const r = rotas[`${metodo} ${caminho}${url.search}`] ?? rotas[`${metodo} ${caminho}`] ?? rotas[caminho];
    const lista = Array.isArray(r) ? r : r ? [r] : [{ status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } }];
    const vez = pedidos.filter((p) => p.caminho === caminho && p.metodo === metodo).length - 1;
    const x = lista[Math.min(vez, lista.length - 1)]!;
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return pedidos;
}

const MARINA = { id: "b1000000-0000-4000-8000-000000000001", nome: "Marina Ribeiro" };
const FELIPE = { id: "b1000000-0000-4000-8000-000000000002", nome: "Felipe Matos" };
const LARISSA = { id: "b1000000-0000-4000-8000-000000000003", nome: "Larissa Costa" };
const DIEGO = { id: "b1000000-0000-4000-8000-000000000004", nome: "Diego Almeida" };
const CT = "f1000000-0000-4000-8000-000000000133";
const CT19 = "f1000000-0000-4000-8000-000000000119";
const CLI = "c1000000-0000-4000-8000-000000000133";
const DOC = (n: number) => `d6000000-0000-4000-8000-00000000000${n}`;
const GER = "d7000000-0000-4000-8000-000000000001";
const MOD_CT = "d8000000-0000-4000-8000-000000000001";

const oab = (id: string, uf: string, numero: string, letra: string | null, tipo: string) => ({
  id, uf, numero: numero.replace(".", ""), letra, tipo, versao: 1,
  texto: `OAB/${uf} ${numero}${letra ? `-${letra}` : ""}`, documento: `OAB/${uf} nº ${numero}${letra ? `-${letra}` : ""}`,
});
const OAB_MA = oab("0ab00000-0000-4000-8000-000000000001", "SP", "214.538", null, "PRINCIPAL");
const OAB_FSP = oab("0ab00000-0000-4000-8000-000000000002", "SP", "287.104", null, "PRINCIPAL");
const OAB_FRJ = oab("0ab00000-0000-4000-8000-000000000003", "RJ", "245.880", "S", "SUPLEMENTAR");
const OAB_LA = oab("0ab00000-0000-4000-8000-000000000004", "SP", "401.226", null, "PRINCIPAL");

const linhaDoc = (n: number, tipo: string, nome: string, situacao: string, extra: Record<string, unknown> = {}) => ({
  id: DOC(n), chave: tipo, tipo, nome, numero: 1, arquivo: `${tipo.toLowerCase()}-benedito-lima.docx`, geradoPor: MARINA, geradoEm: "2026-11-21T18:10:00Z",
  marcados: 1, cliente: { id: CLI, nome: "Benedito Souza Lima" }, contrato: { id: CT, numero: "C-2026-033", estado: "ELABORACAO" }, situacao, assinado: null, ...extra,
});
const LISTA = {
  documentos: [
    linhaDoc(1, "CONTRATO", "Contrato de honorários", "FALTA"),
    linhaDoc(2, "PROCURACAO", "Procuração", "FALTA"),
    linhaDoc(3, "HIPOSSUFICIENCIA", "Declaração de hipossuficiência", "FALTA"),
    linhaDoc(4, "PROCURACAO", "Procuração", "ASSINADO", {
      marcados: 0, cliente: { id: "c1000000-0000-4000-8000-000000000131", nome: "Antônia Ferreira Prado" }, contrato: { id: CT19, numero: "C-2026-031", estado: "ATIVO" },
      assinado: { anexoId: "f9000000-0000-4000-8000-000000000001", nome: "procuracao.pdf", assinadoEm: "2026-10-30", enviadoPor: MARINA, enviadoEm: "2026-10-30T15:00:00Z" },
    }),
  ],
  contagem: { todos: 4, falta: 3, assinados: 1 },
  esperandoContrato: [{ id: CT, numero: "C-2026-033", cliente: "Benedito Souza Lima" }],
  podeGerar: true,
};

const campo = (c: string, grupo: string, descricao: string) => ({ campo: c, grupo, descricao, origem: "cadastro" });
const MODELOS = {
  podeEnviar: true,
  campos: [campo("CLIENTE_QUALIFICACAO", "Cliente", "Nacionalidade, estado civil, profissão, RG, CPF e endereço"), campo("PODERES_ESPECIAIS", "Advogados e poderes", "Os poderes marcados na hora")],
  modelos: [
    { id: MOD_CT, padrao: false, tipo: "CONTRATO", nome: "Contrato de honorários", versao: 2, versaoId: "d9000000-0000-4000-8000-000000000002", campos: ["CLIENTE_QUALIFICACAO", "HONORARIOS_CONDICOES"],
      desconhecidos: [], enviadoPor: MARINA, atualizadoEm: "2026-11-10T12:00:00Z", usos: 4, linhaVersao: 0, emRevisao: false,
      anteriores: [{ numero: 1, versaoId: "d9000000-0000-4000-8000-000000000001", nomeArquivo: "contrato-v1.docx", enviadoPor: MARINA, enviadoEm: "2026-09-01T12:00:00Z", usos: 9 }] },
    { id: "PROCURACAO", padrao: true, tipo: "PROCURACAO", nome: "Procuração", versao: 1, versaoId: null, campos: ["CLIENTE_QUALIFICACAO", "PODERES_ESPECIAIS"], desconhecidos: [],
      enviadoPor: null, atualizadoEm: "2026-11-21T00:00:00Z", usos: 3, linhaVersao: 0, emRevisao: true, anteriores: [] },
    { id: "HIPOSSUFICIENCIA_PF", codigos: [{ codigo: "HIPOSSUFICIENCIA_PF", nome: "Declaração de hipossuficiência, pessoa física" }, { codigo: "HIPOSSUFICIENCIA_PJ", nome: "Declaração de hipossuficiência, pessoa jurídica" }],
      padrao: true, tipo: "HIPOSSUFICIENCIA", nome: "Declaração de hipossuficiência", versao: 1, versaoId: null, campos: ["CLIENTE_QUALIFICACAO"], desconhecidos: [],
      enviadoPor: null, atualizadoEm: "2026-11-21T00:00:00Z", usos: 3, linhaVersao: 0, emRevisao: true, anteriores: [] },
  ],
};

const CLIENTE = {
  id: CLI, nome: "Benedito Souza Lima", tipo: "PF", documento: "27461593846", nacionalidade: "brasileiro", estadoCivil: "CASADO", profissao: "pedreiro",
  rg: null, rgOrgao: null, endereco: "Rua Coronel Melo, 212", bairro: "Jardim Japão", cidade: "São Paulo", uf: "SP", cep: "02124010",
  repNome: null, repCargo: null, repDocumento: null, repEstadoCivil: null, repProfissao: null, versao: 3,
};
const modeloEmUso = (tipo: string, nome: string, padrao: string | null, numero: number | null) => ({ tipo, modeloId: padrao ? null : MOD_CT, nome, numero, padrao, emRevisao: !!padrao });
const DADOS = {
  contrato: { id: CT, numero: "C-2026-033", objeto: "Aposentadoria por idade", estado: "ELABORACAO", assinadoEm: null, versao: 1 },
  cliente: CLIENTE,
  condicoes: [{ tipo: "PARCELADO", total: 200000, parcelas: 3, primeiro: "2026-12-10" }],
  casos: [],
  advogados: [
    { pessoaId: MARINA.id, nome: MARINA.nome, noContrato: true, responsavel: true, inscricoes: [OAB_MA], escolhidas: [OAB_MA.id] },
    { pessoaId: FELIPE.id, nome: FELIPE.nome, noContrato: true, responsavel: false, inscricoes: [OAB_FSP, OAB_FRJ], escolhidas: [OAB_FSP.id, OAB_FRJ.id] },
    { pessoaId: LARISSA.id, nome: LARISSA.nome, noContrato: false, responsavel: false, inscricoes: [OAB_LA], escolhidas: [OAB_LA.id] },
  ],
  semOab: [DIEGO],
  escritorio: { nome: "Ribeiro & Matos", cnpj: "41207338000105", endereco: "Rua Tabapuã, 1.123", cidade: "São Paulo", uf: "SP", oab: "OAB/SP 31.874" },
  marca: null,
  hoje: "2026-11-21",
  modelos: [
    { ...modeloEmUso("CONTRATO", "Contrato de honorários", null, 2), emRevisao: false },
    modeloEmUso("PROCURACAO", "Procuração", "PROCURACAO", null),
    modeloEmUso("HIPOSSUFICIENCIA", "Declaração de hipossuficiência", "HIPOSSUFICIENCIA_PF", null),
  ],
  atuais: [], ultima: null, mudancas: [],
  poderesIniciais: ["RECEBER_QUITAR", "ACORDO", "SUBSTABELECER"],
};
const seg = (t: string, texto: string) => ({ t, texto });
const PREVIA = {
  documentos: [
    { tipo: "CONTRATO", modeloId: MOD_CT, nome: "Contrato de honorários", marcados: ["RG de Benedito Souza Lima"], desconhecidos: [],
      paragrafos: [[seg("fixo", "CONTRATO DE HONORÁRIOS")], [seg("fixo", "CONTRATANTE: "), seg("cadastro", "BENEDITO SOUZA LIMA, brasileiro, casado"), seg("fixo", ", portador do RG nº "), seg("falta", "[RG: falta]")]] },
    { tipo: "PROCURACAO", modeloId: null, nome: "Procuração", marcados: ["RG de Benedito Souza Lima"], desconhecidos: [],
      paragrafos: [[seg("fixo", "PROCURAÇÃO")], [seg("fixo", "OUTORGADOS: "), seg("formulario", "MARINA RIBEIRO, OAB/SP nº 214.538")]] },
    { tipo: "HIPOSSUFICIENCIA", modeloId: null, nome: "Declaração de hipossuficiência", marcados: ["RG de Benedito Souza Lima"], desconhecidos: [],
      paragrafos: [[seg("fixo", "DECLARAÇÃO DE HIPOSSUFICIÊNCIA")]] },
  ],
  frase: "1 dado sai marcado em cada um.",
};
const USADO = {
  geracaoId: GER, em: "2026-11-21T18:10:00Z", por: MARINA, contrato: { id: CT, numero: "C-2026-033" },
  documentos: [
    { id: DOC(1), tipo: "CONTRATO", nome: "Contrato de honorários", arquivo: "contrato-honorarios-benedito-lima.docx", numero: 1, modelo: "Modelo do escritório, v2", marcados: ["RG de Benedito Souza Lima"] },
    { id: DOC(2), tipo: "PROCURACAO", nome: "Procuração", arquivo: "procuracao-benedito-lima.docx", numero: 1, modelo: "Padrão T3jus, de 21/11/2026", marcados: ["RG de Benedito Souza Lima"] },
  ],
  outorgados: [{ pessoaId: MARINA.id, nome: MARINA.nome, frase: "OAB/SP nº 214.538" }],
  poderes: ["RECEBER_QUITAR", "ACORDO"], outroPoder: null, cidadeData: "São Paulo, 21 de novembro de 2026", representante: null,
};
const RESULTADO = {
  geracaoId: GER, usado: USADO,
  documentos: USADO.documentos.map(({ modelo: _m, ...d }) => d),
};
const versao = (id: string, tipo: string, arquivo: string, n: number, assinados: unknown[] = []) => ({
  id, numero: n, arquivo, geracaoId: GER, modelo: { nome: tipo, padrao: tipo !== "CONTRATO", numero: tipo === "CONTRATO" ? 2 : null },
  geradoPor: MARINA, geradoEm: "2026-11-21T18:10:00Z", marcados: ["RG de Benedito Souza Lima"], assinados,
});
const DOCS_CT = {
  contrato: { id: CT, numero: "C-2026-033", estado: "ELABORACAO", assinadoEm: null, versao: 1, cliente: { id: CLI, nome: "Benedito Souza Lima" } },
  documentos: [
    { chave: "CONTRATO", tipo: "CONTRATO", nome: "Contrato de honorários", situacao: "FALTA", atual: versao(DOC(5), "CONTRATO", "contrato-honorarios-benedito-lima-v2.docx", 2),
      anteriores: [versao(DOC(1), "CONTRATO", "contrato-honorarios-benedito-lima.docx", 1)] },
    { chave: "PROCURACAO", tipo: "PROCURACAO", nome: "Procuração", situacao: "FALTA", atual: versao(DOC(2), "PROCURACAO", "procuracao-benedito-lima.docx", 1), anteriores: [] },
  ],
  faltam: 2, ultima: USADO, podeGerar: true,
};
const FICHA = {
  id: CT, numero: "C-2026-033", objeto: "Aposentadoria por idade", situacao: "ELABORACAO", cliente: { id: CLI, nome: "Benedito Souza Lima", tipo: "PF" }, responsavel: MARINA,
  condicoes: DADOS.condicoes, proximo: null, basePendente: null, criadoEm: "2026-11-21T15:02:00Z", observacoes: null, versao: 1, assinadoEm: null, assinaturaPor: null,
  encerradoEm: null, motivoEncerramento: null, proposta: null, advogados: [MARINA, FELIPE], financeiro: true, recebimentos: [], historico: [],
  inscricoes: [
    { pessoaId: MARINA.id, frase: "OAB/SP nº 214.538", usaTodas: false, inscricoes: [{ ...OAB_MA, escolhida: true }] },
    { pessoaId: FELIPE.id, frase: "OAB/SP nº 287.104 e OAB/RJ nº 245.880-S", usaTodas: false, inscricoes: [{ ...OAB_FSP, escolhida: true }, { ...OAB_FRJ, escolhida: true }] },
  ],
};

const comuns = () => ({
  "/v1/escritorio": { corpo: ESCRITORIO },
  "GET /v1/escritorio/avisos": { corpo: { novos: 0, total: 0, itens: [] } },
  "GET /v1/escritorio/documentos/modelos": { corpo: MODELOS },
  "GET /v1/escritorio/pessoas/oab": { corpo: { pessoas: [{ ...MARINA, oab: [OAB_MA] }, { ...FELIPE, oab: [OAB_FSP, OAB_FRJ] }, { ...DIEGO, oab: [] }] } },
});

test.describe("Contratos › Procurações e modelos (CH-08, F3.16)", () => {
  test("Lista: o que falta anexar primeiro, filtros, baixar e os quadros de apoio", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/documentos?situacao=TODOS": { corpo: LISTA },
      "GET /v1/escritorio/documentos?situacao=ASSINADOS": { corpo: { ...LISTA, documentos: [LISTA.documentos[3]] } },
      [`POST /v1/escritorio/documentos/${DOC(1)}/abrir`]: { corpo: { url: `${P}/arquivo-falso.docx`, validadeSegundos: 60 } },
    });
    await page.route("**/arquivo-falso.docx", (r) => r.fulfill({ status: 200, body: "x", headers: { "content-disposition": "attachment" } }));
    await page.goto(`${P}/contratos/modelos`);
    await expect(page.getByRole("heading", { level: 1, name: "Procurações e modelos" })).toBeVisible();
    await expect(page.getByText("3 documentos esperam o assinado.")).toBeVisible();
    await expect(page.getByText(/O contrato de Benedito Souza Lima só fica ativo/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Anexar o assinado\s?: o contrato de Benedito$/ })).toBeVisible();
    await expect(page.getByText("Assinada em 30/10")).toBeVisible();
    await expect(page.getByText("O assinado ativa o contrato")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Advogados nos documentos" })).toBeVisible();
    await expect(page.getByText("Diego Almeida não tem OAB na Equipe", { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: "Gerar documentos" })).toHaveAttribute("href", "/contratos/modelos/gerar");
    await semViolacoes(page);
    await expect(page.getByRole("group", { name: "Baixar o contrato de Benedito" })).toBeVisible();
    await page.getByRole("button", { name: "Baixar em Word (.docx, para editar): o contrato de Benedito" }).click();
    await expect.poll(() => pedidos.some((p) => p.metodo === "POST" && p.caminho === `/v1/escritorio/documentos/${DOC(1)}/abrir`)).toBe(true);
    await page.goto(`${P}/contratos/modelos`);
    await page.getByRole("button", { name: "Assinados (1)" }).click();
    await expect(page.getByRole("button", { name: /Anexar o assinado/ })).toHaveCount(0);
    await expect(page.getByText("1 documento", { exact: false }).first()).toBeVisible();
  });

  test("Lista vazia: dois passos para começar", async ({ page }) => {
    await simular(page, { ...comuns(), "GET /v1/escritorio/documentos": { corpo: { documentos: [], contagem: { todos: 0, falta: 0, assinados: 0 }, esperandoContrato: [], podeGerar: true } } });
    await page.goto(`${P}/contratos/modelos`);
    await expect(page.getByRole("heading", { name: "Nenhum documento gerado ainda" })).toBeVisible();
    await expect(page.getByText("Já vêm os três padrão do T3jus.", { exact: false })).toBeVisible();
    await semViolacoes(page);
  });

  test("Modelos de documento: versões, conferência com campo desconhecido e o esperado que falta, e PDF bloqueado", async ({ page }) => {
    const docx = Buffer.from(await criarDocx([{ texto: "[QUALIFICACAO_CLIENTE]" }, { texto: "[CLIENTE_NOME]" }]));
    const pedidos = await simular(page, {
      ...comuns(),
      "POST /v1/escritorio/documentos/modelos/conferir": [
        { corpo: { campos: ["QUALIFICACAO_CLIENTE", "CLIENTE_NOME"], desconhecidos: [{ campo: "QUALIFICACAO_CLIENTE", sugestao: "CLIENTE_QUALIFICACAO", peticao: false }],
          faltaEsperado: { campo: "PODERES_ESPECIAIS", sem: "os poderes especiais marcados na hora de gerar não entram" }, semCampos: false, paragrafos: 2 } },
        { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", mensagem: "x", detalhes: { campos: ["arquivo"], motivo: "ARQUIVO_PDF" } } } },
      ],
      "POST /v1/escritorio/documentos/modelos": { status: 201, corpo: { modelo: { ...MODELOS.modelos[1], id: MOD_CT, padrao: false, nome: "Procuração do escritório", versao: 1 }, conferencia: {} } },
    });
    await page.goto(`${P}/contratos/modelos/modelos`);
    await expect(page.getByRole("heading", { level: 1, name: "Modelos de documento" })).toBeVisible();
    await expect(page.getByText("Versões anteriores (1)")).toBeVisible();
    await expect(page.getByRole("button", { name: "Baixar PJ o modelo Declaração de hipossuficiência, pessoa jurídica" })).toBeVisible();
    await expect(page.getByText("[PODERES_ESPECIAIS]")).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: /^Usar o do escritório\s?: Procuração$/ }).click();
    const janela = page.getByRole("dialog", { name: "Enviar modelo" });
    await expect(janela.getByLabel("Documento")).toHaveValue("PROCURACAO");
    await janela.locator('input[type="file"]').setInputFiles({ name: "procuracao.docx", mimeType: "application/octet-stream", buffer: docx });
    await expect(janela.getByText("Conferimos o arquivo: 2 campos, 1 desconhecido")).toBeVisible();
    await expect(janela.getByText(/troque no Word por \[CLIENTE_QUALIFICACAO\]/)).toBeVisible();
    await expect(janela.getByText("Falta o campo [PODERES_ESPECIAIS].")).toBeVisible();
    await semViolacoes(page);
    await janela.getByRole("button", { name: "Salvar modelo" }).click();
    await expect(page.getByText("Modelo salvo")).toBeVisible();
    const envio = pedidos.find((p) => p.metodo === "POST" && p.caminho === "/v1/escritorio/documentos/modelos")!;
    expect(new URLSearchParams(envio.busca).get("tipo")).toBe("PROCURACAO");
    expect(envio.bytes).toBe(docx.length);

    await page.getByRole("button", { name: "Enviar modelo" }).click();
    const j2 = page.getByRole("dialog", { name: "Enviar modelo" });
    await j2.locator('input[type="file"]').setInputFiles({ name: "contrato.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
    await expect(j2.getByText(/Este arquivo é PDF\./)).toBeVisible();
    await j2.getByRole("button", { name: "Salvar modelo" }).click();
    await expect(j2.getByText("O modelo não foi salvo.")).toBeVisible();
    expect(pedidos.filter((p) => p.caminho === "/v1/escritorio/documentos/modelos" && p.metodo === "POST")).toHaveLength(1);
  });

  test("Gerar: escolher o contrato, o que bloqueia, a prévia em abas e o resultado com o .zip em foco", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/contratos?mostrar=ATIVOS": { corpo: { algum: true, contagem: { ativos: 1, elaboracao: 1, encerrados: 0, base: 0 }, contratos: [
        { id: CT19, numero: "C-2026-019", objeto: "Cobranças", situacao: "ATIVO", cliente: { id: "c1", nome: "Farmácia Bom Jesus Ltda.", tipo: "PJ" }, responsavel: FELIPE, condicoes: [], proximo: null, basePendente: null, criadoEm: "2026-09-01T12:00:00Z" },
        { id: CT, numero: "C-2026-033", objeto: "Aposentadoria por idade", situacao: "ELABORACAO", cliente: { id: CLI, nome: "Benedito Souza Lima", tipo: "PF" }, responsavel: MARINA, condicoes: [], proximo: null, basePendente: null, criadoEm: "2026-11-21T12:00:00Z" },
      ] } },
      [`GET /v1/escritorio/contratos/${CT}/documentos-dados`]: { corpo: DADOS },
      [`POST /v1/escritorio/contratos/${CT}/documentos/previa`]: { corpo: PREVIA },
      [`POST /v1/escritorio/contratos/${CT}/documentos`]: { status: 201, corpo: RESULTADO },
      [`POST /v1/escritorio/documentos/geracoes/${GER}/zip`]: { corpo: { url: `${P}/arquivo-falso.zip`, validadeSegundos: 60 } },
    });
    await page.route("**/arquivo-falso.zip", (r) => r.fulfill({ status: 200, body: "x", headers: { "content-disposition": "attachment" } }));
    await page.goto(`${P}/contratos/modelos/gerar`);
    await expect(page.getByRole("heading", { name: "De qual contrato?" })).toBeVisible();
    // Os em elaboração vêm primeiro.
    await expect(page.locator(".pe-escolhas li").first()).toContainText("Benedito Souza Lima");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Escolha o contrato.")).toBeVisible();
    await page.getByRole("radio", { name: /Benedito Souza Lima/ }).check();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL(new RegExp(`/contratos/modelos/gerar\\?contrato=${CT}`));
    await expect(page.getByText("Falta 1 dado de Benedito: o RG.")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Larissa Costa/ })).not.toBeChecked();
    await expect(page.getByText(/Sem OAB na Equipe, não aparecem: Diego Almeida/)).toBeVisible();
    await expect(page.locator(".pe-sai")).toContainText("MARINA RIBEIRO, OAB/SP nº 214.538");
    await expect(page.getByRole("checkbox", { name: /^Receber e dar quitação/ })).toBeChecked();
    const abas = page.getByRole("tablist", { name: "Documentos da prévia" });
    await expect(abas.getByRole("tab")).toHaveCount(3);
    await expect(abas.getByRole("tab", { name: /Contrato/ })).toHaveAttribute("aria-selected", "true");
    await abas.getByRole("tab", { name: /Contrato/ }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(abas.getByRole("tab", { name: /Procuração/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toContainText("MARINA RIBEIRO");
    await expect(page.getByText("1 dado sai marcado em cada um.", { exact: false })).toBeVisible();
    await semViolacoes(page);

    // Sem documento nem outorgado, nada vai ao servidor, e o resumo diz o que acertar.
    for (const n of ["Contrato de honorários", "Procuração", "Declaração de hipossuficiência"]) await page.getByRole("checkbox", { name: new RegExp(`^${n}`) }).uncheck();
    await page.getByRole("checkbox", { name: /^Marina Ribeiro/ }).uncheck();
    await page.getByRole("checkbox", { name: /^Felipe Matos/ }).uncheck();
    await page.getByRole("button", { name: /^Gerar/ }).click();
    await expect(page.getByText("Nada foi gerado.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Nenhum documento marcado" })).toBeVisible();
    await expect(page.getByText(/Marque ao menos um advogado/)).toBeVisible();
    expect(pedidos.some((p) => p.metodo === "POST" && p.caminho === `/v1/escritorio/contratos/${CT}/documentos`)).toBe(false);
    await semViolacoes(page);

    await page.getByRole("checkbox", { name: /^Contrato de honorários/ }).check();
    await page.getByRole("checkbox", { name: /^Procuração/ }).check();
    await page.getByRole("checkbox", { name: /^Marina Ribeiro/ }).check();
    await page.getByRole("button", { name: "Gerar 2 documentos" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Documentos gerados" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Baixar todos (.zip)" })).toBeFocused();
    await expect(page.getByText("Saiu marcado: RG de Benedito Souza Lima.")).toBeVisible();
    await expect(page.getByText("Fica guardado como estava hoje", { exact: false })).toBeVisible();
    const corpo = pedidos.find((p) => p.metodo === "POST" && p.caminho === `/v1/escritorio/contratos/${CT}/documentos`)!.corpo as Record<string, unknown>;
    expect(corpo).toEqual({
      documentos: [{ tipo: "CONTRATO", modeloId: null }, { tipo: "PROCURACAO", modeloId: null }],
      outorgados: [{ pessoaId: MARINA.id, inscricoes: [OAB_MA.id] }],
      poderes: ["RECEBER_QUITAR", "ACORDO", "SUBSTABELECER"], outroPoder: null, cidadeData: "São Paulo, 21 de novembro de 2026",
    });
    await semViolacoes(page);
    await page.getByRole("button", { name: "Baixar todos (.zip)" }).click();
    await expect.poll(() => pedidos.some((p) => p.caminho === `/v1/escritorio/documentos/geracoes/${GER}/zip`)).toBe(true);
  });

  test("Ficha do contrato, aba Documentos: anexar os assinados registra a assinatura", async ({ page }) => {
    const ANEXO = (n: number) => `f9000000-0000-4000-8000-00000000003${n}`;
    const envios: string[] = [];
    await page.route("**/arquivos-falsos/**", async (rota) => {
      envios.push(`${rota.request().method()} ${new URL(rota.request().url()).pathname}`);
      await rota.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/contratos/${CT}`]: { corpo: FICHA },
      [`GET /v1/escritorio/contratos/${CT}/anexos`]: { corpo: { anexos: [] } },
      [`GET /v1/escritorio/contratos/${CT}/documentos`]: { corpo: DOCS_CT },
      "POST /v1/escritorio/anexos": [
        { status: 201, corpo: { id: ANEXO(1), enderecoDeEnvio: `${P}/arquivos-falsos/${ESC}/${ANEXO(1)}?token=x` } },
        { status: 201, corpo: { id: ANEXO(2), enderecoDeEnvio: `${P}/arquivos-falsos/${ESC}/${ANEXO(2)}?token=x` } },
      ],
      [`POST /v1/escritorio/anexos/${ANEXO(1)}/concluir`]: { corpo: {} },
      [`POST /v1/escritorio/anexos/${ANEXO(2)}/concluir`]: { corpo: {} },
      [`POST /v1/escritorio/contratos/${CT}/assinatura`]: { corpo: { id: CT, versao: 2, recebimentos: 3 } },
    });
    await page.goto(`${P}/contratos/contratos/${CT}?aba=documentos`);
    await expect(page.getByRole("heading", { name: "Documentos deste contrato" })).toBeVisible();
    await expect(page.locator(".dir")).toContainText("Os 2 documentos esperam o assinado.");
    await expect(page.getByText("Versão anterior (1)")).toBeVisible();
    await expect(page.getByRole("link", { name: "Gerar de novo" })).toHaveAttribute("href", `/contratos/modelos/gerar?contrato=${CT}`);
    await semViolacoes(page);

    await page.locator(".dir").getByRole("button", { name: "Anexar os assinados" }).click();
    const j = page.getByRole("dialog", { name: "Anexar os assinados" });
    await expect(j.getByText("Anexar o contrato assinado registra a assinatura.")).toBeVisible();
    // O .docx gerado no lugar do assinado e a data depois de hoje são barrados.
    await j.locator('input[type="file"]').first().setInputFiles({ name: "contrato.docx", mimeType: "application/octet-stream", buffer: Buffer.alloc(500, 1) });
    await j.getByLabel("Assinado em").first().fill("01/01/2099");
    await j.getByRole("button", { name: "Anexar e ativar o contrato" }).click();
    await expect(j.getByText("Nada foi anexado.")).toBeVisible();
    await expect(j.getByText(/Este arquivo é o .docx gerado/)).toBeVisible();
    await expect(j.getByText(/A data da assinatura é depois de hoje/)).toBeVisible();
    expect(pedidos.some((p) => p.caminho === "/v1/escritorio/anexos")).toBe(false);
    await semViolacoes(page);

    await j.locator('input[type="file"]').first().setInputFiles({ name: "contrato-assinado.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(1200, 1) });
    await j.getByLabel("Assinado em").first().fill("21/11/2026");
    await j.locator('input[type="file"]').nth(1).setInputFiles({ name: "procuracao.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(800, 1) });
    // A data fixa: o padrão é hoje, e o teste não pode depender do dia em que roda.
    await j.getByLabel("Assinado em").nth(1).fill("21/11/2026");
    await j.getByRole("button", { name: "Anexar e ativar o contrato" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Contrato assinado anexado." })).toContainText("está ativo");
    const anexos = pedidos.filter((p) => p.caminho === "/v1/escritorio/anexos").map((p) => p.corpo);
    expect(anexos).toEqual([
      { dono: "CONTRATO", donoId: CT, categoria: null, nome: "contrato-assinado.pdf", tipo: "application/pdf", tamanho: 1200, documentoId: DOC(5), assinadoEm: "2026-11-21" },
      { dono: "CONTRATO", donoId: CT, categoria: null, nome: "procuracao.jpg", tipo: "image/jpeg", tamanho: 800, documentoId: DOC(2), assinadoEm: "2026-11-21" },
    ]);
    expect(pedidos.find((p) => p.caminho === `/v1/escritorio/contratos/${CT}/assinatura`)?.corpo).toEqual({ versao: 1, assinadoEm: "2026-11-21" });
    expect(envios).toHaveLength(2);
  });

  test("Anexar os assinados: várias fotos viram um PDF só, até 10 por documento (F3.99)", async ({ page }) => {
    const ANEXO = "f9000000-0000-4000-8000-000000000041";
    const corpos: Buffer[] = [];
    await page.route("**/arquivos-falsos/**", async (rota) => {
      corpos.push(rota.request().postDataBuffer() ?? Buffer.alloc(0));
      await rota.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/contratos/${CT}`]: { corpo: FICHA },
      [`GET /v1/escritorio/contratos/${CT}/anexos`]: { corpo: { anexos: [] } },
      [`GET /v1/escritorio/contratos/${CT}/documentos`]: { corpo: DOCS_CT },
      "POST /v1/escritorio/anexos": { status: 201, corpo: { id: ANEXO, enderecoDeEnvio: `${P}/arquivos-falsos/${ESC}/${ANEXO}?token=x` } },
      [`POST /v1/escritorio/anexos/${ANEXO}/concluir`]: { corpo: {} },
    });
    const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAQAAAAGCAIAAABrW6giAAAAEElEQVR4nGNoUHCAIwZKOQA5exUBQmxPsAAAAABJRU5ErkJggg==", "base64");
    const foto = (nome: string) => ({ name: nome, mimeType: "image/png", buffer: PNG });
    await page.goto(`${P}/contratos/contratos/${CT}?aba=documentos`);
    await page.locator(".dir").getByRole("button", { name: "Anexar os assinados" }).click();
    const j = page.getByRole("dialog", { name: "Anexar os assinados" });
    await expect(j.getByText("Várias páginas: um PDF só ou até 10 fotos.").first()).toBeVisible();
    const proc = j.locator('input[type="file"]').nth(1);

    // Mais de 10 fotos é barrado antes de enviar.
    await proc.setInputFiles(Array.from({ length: 11 }, (_, i) => foto(`pagina-${i + 1}.png`)));
    await j.getByRole("button", { name: "Anexar", exact: true }).click();
    await expect(j.getByText("Nada foi anexado.")).toBeVisible();
    await expect(j.getByText(/São 11 fotos, e o limite é 10 por documento/)).toBeVisible();
    expect(pedidos.some((p) => p.caminho === "/v1/escritorio/anexos")).toBe(false);

    // Três fotos: a ordem é a do nome, e viram um PDF só.
    await proc.setInputFiles([foto("pagina-3.png"), foto("pagina-1.png"), foto("pagina-2.png")]);
    await expect(j.getByText("3 fotos: pagina-1.png, pagina-2.png, pagina-3.png")).toBeVisible();
    await expect(j.getByText(/Viram um PDF só, uma foto por página, na ordem do nome/)).toBeVisible();
    await semViolacoes(page);
    await j.getByRole("button", { name: "Anexar", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Assinado anexado." })).toBeVisible();
    const anexos = pedidos.filter((p) => p.caminho === "/v1/escritorio/anexos").map((p) => p.corpo as Record<string, unknown>);
    expect(anexos).toHaveLength(1);
    expect(anexos[0]).toMatchObject({ dono: "CONTRATO", donoId: CT, nome: "pagina-1-3-fotos.pdf", tipo: "application/pdf", documentoId: DOC(2) });
    expect(corpos).toHaveLength(1);
    const pdf = corpos[0]!.toString("latin1");
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("/Count 3");
    expect(anexos[0]!.tamanho).toBe(corpos[0]!.length);
  });

  test("D23: na aba Documentos, cada documento baixa em Word e em PDF; preparando, erro, leiaute simples e o assinado", async ({ page }) => {
    const ASS = "f9000000-0000-4000-8000-000000000051";
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/contratos/${CT}`]: { corpo: FICHA },
      [`GET /v1/escritorio/contratos/${CT}/anexos`]: { corpo: { anexos: [] } },
      [`GET /v1/escritorio/contratos/${CT}/documentos`]: [
        { corpo: DOCS_CT },
        { corpo: { ...DOCS_CT, faltam: 1, documentos: [{ ...DOCS_CT.documentos[0], situacao: "ASSINADO",
          atual: versao(DOC(5), "CONTRATO", "contrato-honorarios-benedito-lima-v2.docx", 2,
            [{ anexoId: ASS, nome: "contrato-assinado-benedito.pdf", assinadoEm: "2026-11-21", enviadoPor: MARINA, enviadoEm: "2026-11-21T20:20:00Z" }]) }, DOCS_CT.documentos[1]] } },
      ],
      [`POST /v1/escritorio/documentos/${DOC(5)}/abrir`]: { corpo: { url: `${P}/arquivo-falso.docx`, validadeSegundos: 60 } },
    });
    await page.route("**/arquivo-falso.*", (r) => r.fulfill({ status: 200, body: "x", headers: { "content-disposition": "attachment" } }));
    // O PDF do contrato: a primeira vez demora e falha; a segunda sai, num leiaute simples.
    let soltar: () => void = () => {};
    const segura = new Promise<void>((r) => { soltar = r; });
    let vezPdf = 0;
    await page.route((u) => u.pathname.endsWith(`/documentos/${DOC(5)}/abrir`) && u.searchParams.get("formato") === "pdf", async (rota) => {
      vezPdf++;
      if (vezPdf === 1) {
        await segura;
        return rota.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ erro: { codigo: "UPSTREAM_UNAVAILABLE", detalhes: { motivo: "PDF_INDISPONIVEL" } } }) });
      }
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: `${P}/arquivo-falso.pdf`, validadeSegundos: 60, complexo: true }) });
    });

    await page.goto(`${P}/contratos/contratos/${CT}?aba=documentos`);
    await expect(page.getByRole("heading", { name: "Documentos deste contrato" })).toBeVisible();
    const grupo = page.getByRole("group", { name: "Baixar o contrato", exact: true });
    await expect(grupo.getByRole("button", { name: "Baixar em Word (.docx, para editar): o contrato" })).toBeVisible();
    await expect(grupo.getByRole("button", { name: "Baixar em PDF (para mandar ou imprimir): o contrato" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Baixar a procuração", exact: true })).toBeVisible();
    await expect(page.getByText("contrato-honorarios-benedito-lima-v2 ·", { exact: false })).toBeVisible();
    await expect(page.getByText("PDF é para mandar ao cliente ou imprimir como está.", { exact: false })).toBeVisible();
    await expect(page.getByText("O PDF sai do documento gerado.", { exact: false })).toBeVisible();
    await semViolacoes(page);

    await grupo.getByRole("button", { name: /^Baixar em PDF/ }).click();
    const prep = page.getByRole("button", { name: /^Preparando o PDF\s?: o contrato$/ });
    await expect(prep).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByRole("status").filter({ hasText: "Preparando o PDF do contrato." })).toContainText("o arquivo baixa sozinho");
    // O Word e os outros documentos seguem livres.
    await expect(grupo.getByRole("button", { name: /^Baixar em Word/ })).toBeEnabled();
    await semViolacoes(page);
    soltar();
    const erro = page.getByRole("alert").filter({ hasText: "Não deu para preparar o PDF do contrato." });
    await expect(erro).toContainText("Nada mudou no documento, e o Word continua para baixar.");
    await expect(page.getByText("PDF_INDISPONIVEL")).toBeVisible();
    await semViolacoes(page);
    await erro.getByRole("button", { name: "Baixar o Word (.docx, para editar): o contrato" }).click();
    await expect.poll(() => pedidos.some((p) => p.metodo === "POST" && p.caminho === `/v1/escritorio/documentos/${DOC(5)}/abrir` && p.busca === "")).toBe(true);
    await erro.getByRole("button", { name: /^Tentar de novo\s?: PDF do contrato$/ }).click();
    await expect(page.getByText("O PDF sai num leiaute simples, no timbrado.")).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Não deu para preparar o PDF" })).toHaveCount(0);
    expect(vezPdf).toBe(2);

    // Versão anterior também tem Word e PDF.
    await page.getByText("Versão anterior (1)").click();
    await expect(page.getByRole("group", { name: "Baixar o contrato, versão 1" })).toBeVisible();

    // Assinado: baixa o assinado como foi anexado; o sem-assinatura fica numa lista que abre.
    await page.reload();
    await expect(page.getByRole("button", { name: /^Baixar o assinado \(PDF\)\s?: o contrato$/ })).toBeVisible();
    await expect(page.getByRole("group", { name: "Baixar o contrato", exact: true })).toBeHidden();
    await page.getByText("Sem assinatura (v2): Word e PDF").click();
    await expect(page.getByText("O que vale é o assinado.", { exact: false })).toBeVisible();
    await expect(page.getByRole("group", { name: "Baixar o contrato, sem assinatura" })).toBeVisible();
    await semViolacoes(page);
  });
  test("D29: o contrato baixa em Word e PDF no cabeçalho da ficha, em todas as abas; assinado, sem documento e a trilha sem repetição", async ({ page }) => {
    const ASS = "f9000000-0000-4000-8000-000000000052";
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/contratos/${CT}`]: { corpo: FICHA },
      [`GET /v1/escritorio/contratos/${CT}/anexos`]: { corpo: { anexos: [] } },
      [`GET /v1/escritorio/contratos/${CT}/documentos`]: [
        { corpo: DOCS_CT },
        { corpo: { ...DOCS_CT, faltam: 1, documentos: [{ ...DOCS_CT.documentos[0], situacao: "ASSINADO",
          atual: versao(DOC(5), "CONTRATO", "contrato-honorarios-benedito-lima-v2.docx", 2,
            [{ anexoId: ASS, nome: "contrato-assinado-benedito.pdf", assinadoEm: "2026-11-21", enviadoPor: MARINA, enviadoEm: "2026-11-21T20:20:00Z" }]) }, DOCS_CT.documentos[1]] } },
      ],
      [`POST /v1/escritorio/documentos/${DOC(5)}/abrir`]: { corpo: { url: `${P}/arquivo-falso.docx`, validadeSegundos: 60 } },
      [`POST /v1/escritorio/anexos/${ASS}/abrir`]: { corpo: { url: `${P}/arquivo-falso.pdf`, validadeSegundos: 60 } },
    });
    await page.route("**/arquivo-falso.*", (r) => r.fulfill({ status: 200, body: "x", headers: { "content-disposition": "attachment" } }));
    let soltar: () => void = () => {};
    const segura = new Promise<void>((r) => { soltar = r; });
    let vezPdf = 0;
    await page.route((u) => u.pathname.endsWith(`/documentos/${DOC(5)}/abrir`) && u.searchParams.get("formato") === "pdf", async (rota) => {
      vezPdf++;
      if (vezPdf === 1) {
        await segura;
        return rota.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ erro: { codigo: "UPSTREAM_UNAVAILABLE", detalhes: { motivo: "PDF_INDISPONIVEL" } } }) });
      }
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: `${P}/arquivo-falso.pdf`, validadeSegundos: 60, complexo: true }) });
    });

    // Na aba Contrato (a que abre primeiro), o cabeçalho já tem o contrato em Word e PDF.
    await page.goto(`${P}/contratos/contratos/${CT}`);
    await expect(page.getByRole("heading", { name: "Benedito Souza Lima" })).toBeVisible();
    if (test.info().project.name === "computador") {
      // A trilha só aparece no computador: "Contratos › C-2026-033", sem o "Contratos" repetido.
      const trilha = page.getByRole("navigation", { name: "Você está em" });
      await expect(trilha.getByRole("link")).toHaveCount(1);
      await expect(trilha.getByRole("link", { name: "Contratos", exact: true })).toHaveAttribute("href", "/contratos/contratos");
      await expect(trilha).toHaveText(/^\s*Contratos\W*C-2026-033\s*$/);
    }
    const grupo = page.getByRole("group", { name: "Baixar o contrato v2 · gerado em 21/11/2026" });
    await expect(grupo.getByRole("button", { name: "Baixar o contrato em Word (.docx, para editar)" })).toBeVisible();
    await expect(grupo.getByRole("button", { name: "Baixar o contrato em PDF (para mandar ou imprimir)" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver todos os documentos" })).toHaveAttribute("href", `/contratos/contratos/${CT}?aba=documentos`);
    await semViolacoes(page);

    await grupo.getByRole("button", { name: /^Baixar o contrato em Word/ }).click();
    await expect.poll(() => pedidos.some((p) => p.metodo === "POST" && p.caminho === `/v1/escritorio/documentos/${DOC(5)}/abrir` && p.busca === "")).toBe(true);

    await grupo.getByRole("button", { name: /^Baixar o contrato em PDF/ }).click();
    await expect(grupo.getByRole("button", { name: "Preparando o PDF do contrato" })).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByRole("status").filter({ hasText: "Preparando o PDF do contrato." })).toContainText("o arquivo baixa sozinho");
    await semViolacoes(page);
    soltar();
    const erro = page.getByRole("alert").filter({ hasText: "Não deu para preparar o PDF do contrato." });
    await expect(erro).toContainText("Nada mudou no contrato, e o Word continua para baixar.");
    await expect(erro.getByRole("button", { name: /^Tentar de novo\s?: PDF do contrato$/ })).toBeFocused();
    await expect(page.getByText("PDF_INDISPONIVEL")).toBeVisible();
    await semViolacoes(page);
    await erro.getByRole("button", { name: /^Tentar de novo/ }).click();
    await expect(page.getByText("O PDF sai num leiaute simples, no timbrado.")).toBeVisible();
    expect(vezPdf).toBe(2);

    // Também na aba Recebimentos.
    await page.goto(`${P}/contratos/contratos/${CT}?aba=recebimentos`);
    await expect(page.getByRole("navigation", { name: "Seções do contrato" }).getByRole("link", { name: /^Recebimentos/ })).toHaveAttribute("aria-current", "page");
    await expect(page.locator(".fp").getByText("Contrato assinado", { exact: true })).toBeVisible();
    // Assinado: só o assinado, com o nome e o dia.
    await expect(page.getByRole("button", { name: "Baixar o assinado (PDF)", exact: true })).toBeVisible();
    await expect(page.getByText("contrato-assinado-benedito.pdf · anexado em 21/11/2026")).toBeVisible();
    await expect(page.getByRole("group", { name: /^Baixar o contrato v/ })).toHaveCount(0);
    await semViolacoes(page);
    await page.getByRole("button", { name: "Baixar o assinado (PDF)", exact: true }).click();
    await expect.poll(() => pedidos.some((p) => p.metodo === "POST" && p.caminho === `/v1/escritorio/anexos/${ASS}/abrir`)).toBe(true);
  });

  test("D29: sem contrato gerado, o cabeçalho oferece Gerar o contrato; o assinado da folha Assinatura também baixa", async ({ page }) => {
    const ANX = "f9000000-0000-4000-8000-000000000053";
    await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/contratos/${CT}`]: { corpo: { ...FICHA, situacao: "ATIVO" } },
      [`GET /v1/escritorio/contratos/${CT}/anexos`]: [
        { corpo: { anexos: [] } },
        { corpo: { anexos: [{ id: ANX, categoria: "CONTRATO_ASSINADO", nome: "assinado-papel.jpg", tipo: "IMAGEM", tamanho: 1000, donoId: CT, enviadoPor: MARINA, enviadoEm: "2026-11-20T13:00:00Z" }] } },
      ],
      [`GET /v1/escritorio/contratos/${CT}/documentos`]: { corpo: { ...DOCS_CT, documentos: [], faltam: 0, ultima: null } },
    });
    await page.goto(`${P}/contratos/contratos/${CT}`);
    await expect(page.getByText("O contrato ainda não foi gerado no T3jus.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Gerar o contrato" })).toHaveAttribute("href", `/contratos/modelos/gerar?contrato=${CT}`);
    await semViolacoes(page);
    await page.reload();
    await expect(page.getByRole("button", { name: "Baixar o assinado (foto)", exact: true })).toBeVisible();
    await expect(page.getByText("assinado-papel.jpg · anexado em 20/11/2026")).toBeVisible();
  });
});
