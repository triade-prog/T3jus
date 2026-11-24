// Jurídico › Petições (EX-09), telas aprovadas em docs/design/aprovadas/portal-peticoes: a lista
// com a situação, "Para eu revisar", os modelos com a conferência do .docx assim que chega, a nova
// petição em 4 passos (com o que bloqueia e o que sai marcado), o envio para a revisão, a revisão
// com comentário preso ao parágrafo, decisão e "Passar a revisão", o ajuste com a versão 2 em
// .docx, a aprovada, a reprovada e as petições na ficha do caso. A API é simulada; aqui se testa a
// tela, a acessibilidade e o que ela manda.
import { expect, test, type Page } from "@playwright/test";
import { criarDocx } from "../../packages/domain/src/docx.ts";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const escritorio = (pessoa: string, dono: boolean) => ({
  id: ESC, nome: "Ribeiro & Matos", pessoa, dono, areas: dono ? ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"] : ["JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 6, outrosEscritorios: 0, funcoes: dono ? ["SOCIO"] : [], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
});

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
const BEATRIZ = { id: "b1000000-0000-4000-8000-000000000003", nome: "Beatriz Nogueira" };
const LARISSA = { id: "b1000000-0000-4000-8000-000000000004", nome: "Larissa Costa" };
const CASO = "a1000000-0000-4000-8000-000000000001";
const JOANA = "c1000000-0000-4000-8000-000000000001";
const CARLOS = "c1000000-0000-4000-8000-000000000002";
const PET = (n: number) => `d1000000-0000-4000-8000-00000000000${n}`;
const MOD_RO = "d2000000-0000-4000-8000-000000000001";
const COM = (n: number) => `d3000000-0000-4000-8000-00000000000${n}`;
const INSC = { m: "d4000000-0000-4000-8000-000000000001", f1: "d4000000-0000-4000-8000-000000000002", f2: "d4000000-0000-4000-8000-000000000003" };

const linha = (n: number, modelo: string, caso: string, por: typeof MARINA, situacao: string, extra: Record<string, unknown> = {}) => ({
  id: PET(n), modelo, arquivo: `${modelo.toLowerCase().replace(/\s+/g, "-")}.docx`, caso: { id: CASO, nome: caso }, geradoPor: por,
  geradoEm: "2026-11-18T17:42:00Z", marcados: 0, situacao, revisor: null, versao: 1, paraMim: false, ...extra,
});
const LISTA = {
  paraRevisar: 1, modelos: [],
  peticoes: [
    linha(1, "Recurso ordinário", "Pereira x Mercado Bom Preço", MARINA, "APROVADA", { marcados: 1 }),
    linha(2, "Contestação cível", "Souza x Construtora Atlas", BEATRIZ, "REVISAO", { revisor: MARINA, paraMim: true }),
    linha(3, "Pedido de prazo", "Oliveira x Banco Horizonte", BEATRIZ, "AJUSTE", { revisor: FELIPE }),
    linha(4, "Manifestação simples", "Andrade x Unimed Paulistana", BEATRIZ, "REPROVADA", { revisor: LARISSA }),
  ],
};

const modelo = (id: string, nome: string, area: string, padrao: boolean, campos: string[], extra: Record<string, unknown> = {}) => ({
  id, padrao, nome, tipo: "OUTRA", area, substitui: null, versao: padrao ? 1 : 2, versaoId: null, campos, desconhecidos: [],
  enviadoPor: padrao ? null : MARINA, atualizadoEm: "2026-11-01T12:00:00Z", usos: 3, linhaVersao: 0, ...extra,
});
const CAMPOS_RO = ["ENDERECAMENTO", "NUMERO_PROCESSO", "VALOR_CAUSA", "PARTES_QUALIFICACAO", "PARTE_CONTRARIA", "TRIBUNAL", "CIDADE_DATA", "ADVOGADOS_OAB", "ADVOGADOS_ASSINATURA"];
const CAMPOS = [
  { campo: "PARTES_QUALIFICACAO", grupo: "Clientes do caso", descricao: "Todos os clientes marcados", origem: "cadastro" },
  { campo: "ENDERECAMENTO", grupo: "Formulário e escritório", descricao: "Para quem vai a petição", origem: "formulario" },
];
const MODELOS = {
  podeEnviar: true, campos: CAMPOS,
  modelos: [
    modelo(MOD_RO, "Recurso ordinário", "TRABALHISTA", false, CAMPOS_RO),
    modelo("CONTESTACAO_TRABALHISTA", "Contestação trabalhista", "TRABALHISTA", true, ["ENDERECAMENTO", "PARTES_QUALIFICACAO"]),
    modelo("JUNTADA", "Juntada de documentos", "QUALQUER", true, ["ENDERECAMENTO", "NUMERO_PROCESSO", "PARTES_QUALIFICACAO", "CIDADE_DATA", "ADVOGADOS_ASSINATURA"]),
    modelo("CONTESTACAO_CIVEL", "Contestação cível", "CIVEL", true, ["ENDERECAMENTO"]),
  ],
};

const insc = (id: string, uf: string, numero: string, tipo: string, letra: string | null = null) => ({
  id, uf, numero, letra, tipo, versao: 1, texto: `OAB/${uf} ${numero}`, documento: `OAB/${uf} nº ${numero.replace(/(\d{3})$/, ".$1")}${letra ? `-${letra}` : ""}`,
});
const cliente = (id: string, nome: string, rg: string | null) => ({
  id, nome, tipo: "PF", papel: "AUTOR", documento: "31820457600", nacionalidade: "brasileira", estadoCivil: "SOLTEIRO", profissao: "operadora de caixa",
  rg, rgOrgao: rg ? "SSP/SP" : null, endereco: "Rua Doutor Zuquim, 1.480", bairro: "Santana", cidade: "São Paulo", uf: "SP", cep: "02035021", repNome: null, repCargo: null,
});
const dados = (revisor: typeof MARINA | null, semRevisao: string | null) => ({
  caso: {
    id: CASO, nome: "Pereira x Mercado Bom Preço", area: "TRABALHISTA", numero: "10010223320265020045", vara: "45ª Vara do Trabalho de São Paulo", tribunal: "TRT-2",
    sistema: "PJe-JT", parteContraria: "Mercado Bom Preço Ltda.", parteContrariaQualificacao: null, valorCausa: 8640000, responsavel: MARINA,
  },
  clientes: [cliente(JOANA, "Joana Pereira", "284419031"), cliente(CARLOS, "Carlos Henrique Dias", null)],
  advogados: [
    { pessoaId: MARINA.id, nome: MARINA.nome, responsavel: true, socioDono: true, inscricoes: [insc(INSC.m, "SP", "214538", "PRINCIPAL")] },
    { pessoaId: FELIPE.id, nome: FELIPE.nome, responsavel: false, socioDono: false, inscricoes: [insc(INSC.f1, "SP", "287104", "PRINCIPAL"), insc(INSC.f2, "RJ", "245880", "SUPLEMENTAR", "S")] },
  ],
  semOab: [{ id: "x", nome: "Gustavo Lima" }],
  escritorio: { nome: "Ribeiro & Matos", endereco: null, cidade: "São Paulo", uf: "SP" },
  hoje: "2026-11-18", revisor, semRevisao,
});
const seg = (t: string, texto: string) => ({ t, texto });
const PREVIA_PARAS = [
  [seg("formulario", "Excelentíssimo(a) Senhor(a) Juiz(íza) da 45ª Vara do Trabalho de São Paulo – SP")],
  [seg("fixo", "Processo nº "), seg("cadastro", "1001022-33.2026.5.02.0045")],
  [seg("cadastro", "JOANA PEREIRA, brasileira"), seg("fixo", ", e "), seg("cadastro", "CARLOS HENRIQUE DIAS, portador(a) do RG nº "), seg("falta", "[RG: falta]"), seg("fixo", ", vêm interpor")],
  [seg("fixo", "RECURSO ORDINÁRIO")],
  [seg("cadastro", "MARINA RIBEIRO\nOAB/SP nº 214.538")],
];
const previa = (revisor: typeof MARINA | null, semRevisao: string | null) => ({
  paragrafos: PREVIA_PARAS, resto: "Continua com o texto do modelo do escritório (v2). O T3jus não muda esse texto.",
  campos: { total: 9, cadastro: 6, formulario: 2, preenchidos: 8 }, marcados: ["RG de Carlos Henrique Dias"], desconhecidos: [], revisor, semRevisao,
});

const comuns = (pessoa = "Marina Ribeiro", dono = true) => ({
  "/v1/escritorio": { corpo: escritorio(pessoa, dono) },
  "GET /v1/escritorio/avisos": { corpo: { novos: 0, total: 0, itens: [] } },
});

const versao = (n: number, extra: Record<string, unknown> = {}) => ({
  id: `d5000000-0000-4000-8000-00000000000${n}`, numero: n, origem: "DADOS", arquivo: "contestacao-civel-souza-x-construtora-atlas.docx", marcados: [],
  enviadaPor: BEATRIZ, enviadaEm: "2026-11-18T17:10:00Z", recado: null, decisao: null, ...extra,
});
const ficha = (situacao: string, extra: Record<string, unknown> = {}) => ({
  id: PET(2), modelo: { id: "CONTESTACAO_CIVEL", nome: "Contestação cível", padrao: true, versao: null }, arquivo: "contestacao-civel-souza-x-construtora-atlas.docx",
  caso: { id: CASO, nome: "Souza x Construtora Atlas", numero: "08123456720268260100", prazo: { data: "2026-11-18", descricao: "Contestação" }, responsavel: FELIPE },
  situacao, versaoAtual: 1, versao: 1, geradoPor: BEATRIZ, geradoEm: "2026-11-18T17:10:00Z", revisor: FELIPE, aprovadaEm: null, aprovadaPor: null, documentoId: null,
  dados: { partes: [{ id: JOANA, nome: "Construtora Atlas Ltda." }], advogados: [{ pessoaId: FELIPE.id, nome: FELIPE.nome, frase: "OAB/SP nº 287.104" }], enderecamento: "Excelentíssimo(a) Senhor(a) Juiz(íza) de Direito da 4ª Vara Cível", cidadeData: "São Paulo, 18 de novembro de 2026", numero: null, valorCausa: null },
  previa: [
    [seg("formulario", "Excelentíssimo(a) Senhor(a) Juiz(íza) de Direito da 4ª Vara Cível do Foro Central")],
    [seg("cadastro", "CONSTRUTORA ATLAS LTDA."), seg("fixo", ", com sede na "), seg("cadastro", "Rua Tagipuru, 235"), seg("fixo", ", vem apresentar")],
    [seg("fixo", "CONTESTAÇÃO")],
  ],
  previaEditada: false, resto: "Continua com os fatos e o mérito, do jeito que estão no modelo Contestação cível (padrão do T3jus).",
  versoes: [versao(1, { recado: "O prazo vence hoje: se puder, revise até as 16h." })], comentarios: [], eventos: [],
  pode: { revisar: false, novaVersao: false, enviar: false, passar: false }, ...extra,
});

test.describe("Jurídico › Petições (EX-09)", () => {
  test("Lista: situação de cada uma, Revisar para quem espera e Para eu revisar", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/peticoes": { corpo: LISTA },
      "GET /v1/escritorio/peticoes?visao=REVISAR": { corpo: { ...LISTA, peticoes: [LISTA.peticoes[1]] } },
      [`POST /v1/escritorio/peticoes/${PET(1)}/abrir`]: { corpo: { url: `${P}/arquivo-falso.docx`, validadeSegundos: 60, rascunho: false } },
    });
    await page.route("**/arquivo-falso.docx", (r) => r.fulfill({ status: 200, body: "x", headers: { "content-disposition": "attachment" } }));
    await page.goto(`${P}/juridico/peticoes`);
    await expect(page.getByRole("heading", { level: 1, name: "Petições" })).toBeVisible();
    await expect(page.getByText("4 petições · 1 em revisão · da mais nova para a mais antiga")).toBeVisible();
    await expect(page.getByText("Sem revisão: gerada por Marina · 1 dado marcado")).toBeVisible();
    await expect(page.getByText("v1 · com você")).toBeVisible();
    await expect(page.getByText("v1 · pedido por Felipe Matos")).toBeVisible();
    await expect(page.getByRole("link", { name: "Revisar Contestação cível, Souza x Construtora Atlas" })).toHaveAttribute("href", `/juridico/peticoes/${PET(2)}`);
    await expect(page.getByRole("link", { name: "Nova petição" })).toHaveAttribute("href", "/juridico/peticoes/nova");
    await semViolacoes(page);
    // O Baixar leva o navegador ao arquivo: espera o download antes de ir para outra página (F3.164).
    const baixou = page.waitForEvent("download");
    await page.getByRole("button", { name: "Baixar Recurso ordinário, Pereira x Mercado Bom Preço" }).click();
    await expect.poll(() => pedidos.some((p) => p.metodo === "POST" && p.caminho === `/v1/escritorio/peticoes/${PET(1)}/abrir`)).toBe(true);
    await baixou;
    await page.goto(`${P}/juridico/peticoes`);
    await page.getByRole("button", { name: "Para eu revisar (1)" }).click();
    await expect(page.getByText("1 esperando a sua revisão")).toBeVisible();
    await page.getByLabel("Situação").selectOption("REPROVADA");
    await expect(page.getByText("Nada esperando a sua revisão")).toBeVisible();
  });

  test("Lista vazia: dois passos para começar", async ({ page }) => {
    await simular(page, { ...comuns(), "GET /v1/escritorio/peticoes": { corpo: { paraRevisar: 0, modelos: [], peticoes: [] } } });
    await page.goto(`${P}/juridico/peticoes`);
    await expect(page.getByRole("heading", { name: "Nenhuma petição gerada ainda" })).toBeVisible();
    await expect(page.getByText("Já vêm 8 modelos padrão do T3jus.", { exact: false })).toBeVisible();
    await semViolacoes(page);
  });

  test("Modelos: por área, conferência do .docx com campo desconhecido, e PDF bloqueado", async ({ page }) => {
    const docx = Buffer.from(await criarDocx([{ texto: "[ENDERECAMENTO]" }, { texto: "[NOME_RECLAMADA]" }]));
    const pedidos = await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/peticoes/modelos": { corpo: MODELOS },
      "POST /v1/escritorio/peticoes/modelos/conferir": [
        { corpo: { campos: ["ENDERECAMENTO", "NOME_RECLAMADA"], desconhecidos: [{ campo: "NOME_RECLAMADA", sugestao: "PARTE_CONTRARIA" }], semCampos: false, paragrafos: 2 } },
        { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", mensagem: "x", detalhes: { campos: ["arquivo"], motivo: "ARQUIVO_PDF" } } } },
      ],
      [`POST /v1/escritorio/peticoes/modelos/${MOD_RO}/versoes`]: { status: 201, corpo: { modelo: { ...MODELOS.modelos[0], versao: 3 }, conferencia: {} } },
    });
    await page.goto(`${P}/juridico/peticoes/modelos`);
    await expect(page.getByRole("heading", { level: 1, name: "Modelos de petição" })).toBeVisible();
    await expect(page.getByText("4 modelos · 1 do escritório e 3 padrão do T3jus · por área")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Trabalhista" })).toBeVisible();
    await expect(page.getByText("[PARTES_QUALIFICACAO]")).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: /^Trocar\s?: Recurso ordinário$/ }).click();
    const janela = page.getByRole("dialog", { name: "Enviar modelo" });
    await expect(janela.getByLabel("Substitui")).toHaveValue(`v:${MOD_RO}`);
    await janela.locator('input[type="file"]').setInputFiles({ name: "recurso-ordinario-v3.docx", mimeType: "application/octet-stream", buffer: docx });
    await expect(janela.getByText("Conferimos o arquivo: 2 campos, 1 desconhecido")).toBeVisible();
    await expect(janela.getByText("O T3jus não conhece o campo [NOME_RECLAMADA].")).toBeVisible();
    await expect(janela.getByText(/troque no Word por \[PARTE_CONTRARIA\]/)).toBeVisible();
    await semViolacoes(page);
    await janela.getByRole("button", { name: "Salvar como v3" }).click();
    await expect(page.getByText("Modelo salvo")).toBeVisible();
    const envio = pedidos.find((p) => p.caminho.endsWith("/versoes"))!;
    expect(new URLSearchParams(envio.busca).get("nome")).toBe("Recurso ordinário");
    expect(new URLSearchParams(envio.busca).get("arquivo")).toBe("recurso-ordinario-v3.docx");
    expect(envio.bytes).toBe(docx.length);

    await page.getByRole("button", { name: "Enviar modelo" }).click();
    const j2 = page.getByRole("dialog", { name: "Enviar modelo" });
    await j2.locator('input[type="file"]').setInputFiles({ name: "recurso.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
    await expect(j2.getByText(/Este arquivo é PDF\./)).toBeVisible();
    await j2.getByRole("button", { name: "Salvar modelo" }).click();
    await expect(j2.getByText("O modelo não foi salvo.")).toBeVisible();
    expect(pedidos.filter((p) => p.caminho === "/v1/escritorio/peticoes/modelos" && p.metodo === "POST")).toHaveLength(0);
    await semViolacoes(page);
  });

  test("Nova petição: caso, modelo, dados (com o que bloqueia), prévia e gerar sem revisão", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/juridico/casos": { corpo: { hoje: "2026-11-18", etapas: [], totais: { andamento: 1, encerrados: 0, prazoHoje: 0 }, responsaveis: [], souDono: true, casos: [
        { id: CASO, nome: "Pereira x Mercado Bom Preço", area: "TRABALHISTA", numero: "10010223320265020045", situacao: "ANDAMENTO", resultado: null, parteContraria: null,
          cliente: { id: JOANA, nome: "Joana Pereira" }, outrosClientes: 1, semContrato: false, etapa: { id: "e5", ordem: 5, nome: "Sentença", final: false }, responsavel: MARINA,
          etapaDesde: "2026-11-07T13:00:00Z", proximoPrazo: null, pendencias: 0 },
      ] } },
      "GET /v1/escritorio/peticoes/modelos": { corpo: MODELOS },
      [`GET /v1/escritorio/peticoes/casos/${CASO}/dados`]: { corpo: dados(null, "RESPONSAVEL") },
      [`POST /v1/escritorio/peticoes/casos/${CASO}/previa`]: { corpo: previa(null, "RESPONSAVEL") },
      [`POST /v1/escritorio/peticoes/casos/${CASO}/gerar`]: { status: 201, corpo: { id: PET(1), situacao: "APROVADA", arquivo: "x.docx", marcados: ["RG de Carlos Henrique Dias"], revisor: null, versao: 1 } },
      [`GET /v1/escritorio/peticoes/${PET(1)}`]: { corpo: ficha("APROVADA", {
        id: PET(1), modelo: { id: MOD_RO, nome: "Recurso ordinário", padrao: false, versao: 2 }, revisor: null, geradoPor: MARINA,
        caso: { id: CASO, nome: "Pereira x Mercado Bom Preço", numero: "10010223320265020045", prazo: null, responsavel: MARINA },
        versoes: [versao(1, { enviadaPor: MARINA, arquivo: "recurso-ordinario-pereira-x-mercado-bom-preco.docx", marcados: ["RG de Carlos Henrique Dias"] })],
        previa: PREVIA_PARAS,
      }) },
    });
    await page.goto(`${P}/juridico/peticoes/nova`);
    await expect(page.getByRole("list", { name: "Passo 1 de 4" })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Escolha o caso da petição.")).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("radio", { name: /Pereira x Mercado Bom Preço/ }).check();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByRole("list", { name: "Passo 2 de 4" })).toBeVisible();
    await expect(page.getByText("Primeiro os de Trabalhista, a área do caso.", { exact: false })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Contestação cível/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Outras áreas (1)" }).click();
    await expect(page.getByRole("radio", { name: /Contestação cível/ })).toBeVisible();
    await page.getByRole("radio", { name: /Recurso ordinário/ }).check();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByRole("list", { name: "Passo 3 de 4" })).toBeVisible();
    await expect(page.getByLabel("Endereçamento")).toHaveValue("Excelentíssimo(a) Senhor(a) Juiz(íza) da 45ª Vara do Trabalho de São Paulo – SP");
    await expect(page.getByLabel("Valor da causa")).toHaveValue("86.400,00");
    await expect(page.getByText("Falta o RG")).toBeVisible();
    await expect(page.getByText("No documento: MARINA RIBEIRO, OAB/SP nº 214.538.")).toBeVisible();
    await page.getByRole("checkbox", { name: /Felipe Matos/ }).check();
    await page.getByRole("group", { name: "Inscrições de Felipe nesta petição" }).getByRole("checkbox", { name: /OAB\/RJ/ }).uncheck();
    await expect(page.getByText("No documento: MARINA RIBEIRO, OAB/SP nº 214.538, e FELIPE MATOS, OAB/SP nº 287.104.")).toBeVisible();
    await expect(page.getByText("Sem OAB cadastrada, não aparecem aqui: Gustavo Lima.", { exact: false })).toBeVisible();
    await semViolacoes(page);
    // O que bloqueia: endereçamento vazio e ninguém assinando
    await page.getByLabel("Endereçamento").fill("");
    await page.getByRole("checkbox", { name: /Marina Ribeiro/ }).uncheck();
    await page.getByRole("checkbox", { name: /Felipe Matos/ }).uncheck();
    await page.getByRole("button", { name: "Ver a prévia" }).click();
    await expect(page.getByText("Falta acertar 2 pontos para ver a prévia.")).toBeVisible();
    await expect(page.getByLabel("Endereçamento")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Marque ao menos um advogado.", { exact: false })).toBeVisible();
    expect(pedidos.some((p) => p.caminho.endsWith("/previa"))).toBe(false);
    await semViolacoes(page);
    await page.getByLabel("Endereçamento").fill("Excelentíssimo(a) Senhor(a) Desembargador(a) do TRT da 2ª Região");
    await page.getByRole("checkbox", { name: /Marina Ribeiro/ }).check();
    await page.getByRole("button", { name: "Ver a prévia" }).click();

    await expect(page.getByRole("list", { name: "Passo 4 de 4" })).toBeVisible();
    await expect(page.getByText("8 de 9 campos preenchidos: 6 do cadastro e 2 deste formulário.")).toBeVisible();
    await expect(page.getByText("Você é a sócia dona e a responsável pelo caso: a petição sai aprovada, sem revisão.")).toBeVisible();
    await expect(page.locator(".pe-papel mark.pe-falta")).toHaveText("[RG: falta]");
    await expect(page.getByRole("link", { name: "Completar na ficha de Carlos" })).toHaveAttribute("href", `/clientes/${CARLOS}`);
    await semViolacoes(page);
    const corpoPrevia = pedidos.find((p) => p.caminho.endsWith("/previa"))!.corpo as Record<string, unknown>;
    expect(corpoPrevia).toMatchObject({ modelo: { padrao: null, modeloId: MOD_RO }, partes: [JOANA, CARLOS], valorCausa: 8640000,
      advogados: [{ pessoaId: MARINA.id, inscricoes: [INSC.m] }], enderecamento: "Excelentíssimo(a) Senhor(a) Desembargador(a) do TRT da 2ª Região" });
    await page.getByRole("button", { name: "Gerar com 1 dado marcado" }).click();

    await expect(page).toHaveURL(new RegExp(`/juridico/peticoes/${PET(1)}$`));
    await expect(page.getByRole("heading", { name: "Recurso ordinário pronto" })).toBeVisible();
    await expect(page.getByText("Petição gerada.")).toBeVisible();
    await expect(page.getByText("RG de Carlos Henrique Dias saiu marcado como falta.")).toBeVisible();
    await expect(page.getByText("O T3jus não protocola e não revisa o conteúdo jurídico.")).toBeVisible();
    await expect(page.getByText("Assinatura eletrônica: em estudo.")).toBeVisible();
    expect((pedidos.find((p) => p.caminho.endsWith("/gerar"))!.corpo as Record<string, unknown>).enviar).toBe(true);
    await semViolacoes(page);
  });

  test("Nova petição pela ficha, da estagiária: prévia e enviar para a revisão do responsável", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns("Beatriz Nogueira", false),
      "GET /v1/escritorio/juridico/casos": { corpo: { hoje: "2026-11-18", etapas: [], totais: { andamento: 0, encerrados: 0, prazoHoje: 0 }, responsaveis: [], souDono: false, casos: [] } },
      "GET /v1/escritorio/peticoes/modelos": { corpo: MODELOS },
      [`GET /v1/escritorio/peticoes/casos/${CASO}/dados`]: { corpo: dados(MARINA, null) },
      [`POST /v1/escritorio/peticoes/casos/${CASO}/previa`]: { corpo: previa(MARINA, null) },
      [`POST /v1/escritorio/peticoes/casos/${CASO}/gerar`]: { status: 201, corpo: { id: PET(2), situacao: "REVISAO", arquivo: "x.docx", marcados: [], revisor: MARINA, versao: 1 } },
      [`GET /v1/escritorio/peticoes/${PET(2)}`]: { corpo: ficha("REVISAO", { revisor: MARINA }) },
    });
    await page.goto(`${P}/juridico/peticoes/nova?caso=${CASO}`);
    await expect(page.getByRole("list", { name: "Passo 2 de 4" })).toBeVisible();
    await expect(page.getByText("Prévia e enviar")).toBeVisible();
    await page.getByRole("radio", { name: /Juntada de documentos/ }).check();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByLabel("Valor da causa")).toHaveCount(0);
    await page.getByRole("button", { name: "Ver a prévia" }).click();
    await expect(page.getByText("Vai para a revisão de Marina Ribeiro,", { exact: false })).toBeVisible();
    await expect(page.locator(".pe-timbre")).toContainText("Rascunho · em revisão");
    await page.getByLabel("Recado para Marina (opcional)").fill("O prazo vence hoje.");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Enviar para revisão de Marina Ribeiro" }).click();
    await expect(page.getByRole("heading", { name: "Enviada para revisão" })).toBeVisible();
    await expect(page.getByText("Enviada para revisão de Marina Ribeiro.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Baixar o rascunho" })).toBeVisible();
    expect(pedidos.find((p) => p.caminho.endsWith("/gerar"))!.corpo).toMatchObject({ enviar: true, recado: "O prazo vence hoje.", modelo: { padrao: "JUNTADA", modeloId: null } });
    expect((pedidos.find((p) => p.caminho.endsWith("/gerar"))!.corpo as Record<string, unknown>).valorCausa).toBeUndefined();
    await semViolacoes(page);
  });

  test("F3.106: nome completo de Sua conta, [ADVOGADOS_QUALIFICACAO] e o que falta de cada advogado", async ({ page }) => {
    const dadosAdv = (nomeCompleto: string, extra: Record<string, unknown> = {}) => ({
      nomeCompleto, tratamento: "ADVOGADO", nacionalidade: "brasileiro", estadoCivil: "CASADO", cpf: "52998224725", rg: "12.345.678-90", rgOrgao: "SSP/SP",
      enderecoDoEscritorio: false, cep: null, endereco: "Av. Paulista, 1.000", bairro: null, cidade: "São Paulo", uf: "SP",
      emailProfissional: null, telefoneProfissional: null, atualizadoEm: null, atualizadoPor: null, versao: 1, ...extra,
    });
    const base = dados(null, "SOCIO_DONO");
    const comDados = {
      ...base, eu: MARINA.id,
      advogados: [
        { ...base.advogados[0], dados: dadosAdv("Marina Ribeiro de Andrade", { tratamento: "ADVOGADA" }) },
        { ...base.advogados[1], dados: dadosAdv("Felipe Augusto Matos", { cpf: null, estadoCivil: null }) },
      ],
    };
    const MOD_Q = "d2000000-0000-4000-8000-000000000002";
    const pedidos = await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/juridico/casos": { corpo: { hoje: "2026-11-18", etapas: [], totais: { andamento: 0, encerrados: 0, prazoHoje: 0 }, responsaveis: [], souDono: true, casos: [] } },
      "GET /v1/escritorio/peticoes/modelos": { corpo: { ...MODELOS, modelos: [modelo(MOD_Q, "Inicial com qualificação", "QUALQUER", false, ["ENDERECAMENTO", "PARTES_QUALIFICACAO", "ADVOGADOS_QUALIFICACAO", "CIDADE_DATA"])] } },
      [`GET /v1/escritorio/peticoes/casos/${CASO}/dados`]: { corpo: comDados },
      [`POST /v1/escritorio/peticoes/casos/${CASO}/previa`]: { corpo: { ...previa(null, "SOCIO_DONO"), marcados: ["Estado civil de Felipe Matos", "CPF de Felipe Matos"] } },
    });
    await page.goto(`${P}/juridico/peticoes/nova?caso=${CASO}`);
    await page.getByRole("radio", { name: /Inicial com qualificação/ }).check();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("No documento: MARINA RIBEIRO DE ANDRADE, OAB/SP nº 214.538.")).toBeVisible();
    await page.getByRole("checkbox", { name: /Felipe Matos/ }).check();
    await expect(page.getByText("No documento: MARINA RIBEIRO DE ANDRADE, OAB/SP nº 214.538, e FELIPE AUGUSTO MATOS, OAB/SP nº 287.104 e OAB/RJ nº 245.880-S.")).toBeVisible();
    await expect(page.getByRole("list", { name: "O que falta no cadastro" })).toContainText("Faltam 3 dados: o RG de Carlos, o estado civil de Felipe e o CPF de Felipe.");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Ver a prévia" }).click();
    await expect(page.getByRole("list", { name: "Passo 4 de 4" })).toBeVisible();
    await expect(page.getByText("Falta CPF de Felipe Matos.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Completar os dados de Felipe na Equipe (abre numa aba nova)" }).first()).toHaveAttribute("href", `/equipe/pessoas/${FELIPE.id}`);
    await semViolacoes(page);
    expect(pedidos.find((p) => p.caminho.endsWith("/previa"))!.corpo).toMatchObject({ advogados: [{ pessoaId: MARINA.id }, { pessoaId: FELIPE.id }] });
  });

  test("Revisar: comentário no parágrafo, decisão sem comentário barrada, pedir ajuste e passar a revisão", async ({ page }) => {
    const com = { id: COM(1), versao: 1, autor: FELIPE, paragrafo: 2, trecho: "CONSTRUTORA ATLAS LTDA., com sede na Rua Tagipuru, 235", texto: "O endereço da sede mudou em setembro.",
      criadoEm: "2026-11-18T17:30:00Z", enviado: false, resolvidoEm: null, resolvidoNaVersao: null };
    const rev = ficha("REVISAO", { pode: { revisar: true, novaVersao: false, enviar: false, passar: true } });
    const pedidos = await simular(page, {
      ...comuns("Felipe Matos", false),
      [`GET /v1/escritorio/peticoes/${PET(2)}`]: [{ corpo: rev }, { corpo: { ...rev, comentarios: [com] } }, { corpo: { ...rev, comentarios: [com] } },
        { corpo: ficha("AJUSTE", { comentarios: [{ ...com, enviado: true }] }) }],
      [`POST /v1/escritorio/peticoes/${PET(2)}/comentarios`]: { status: 201, corpo: com },
      [`POST /v1/escritorio/peticoes/${PET(2)}/decisao`]: { corpo: ficha("AJUSTE") },
      [`GET /v1/escritorio/peticoes/${PET(2)}/revisores`]: { corpo: { revisores: [{ ...MARINA, frase: "OAB/SP nº 214.538" }] } },
      [`POST /v1/escritorio/peticoes/${PET(2)}/passar`]: { corpo: ficha("REVISAO", { revisor: MARINA }) },
    });
    await page.goto(`${P}/juridico/peticoes/${PET(2)}`);
    await expect(page.getByRole("heading", { level: 1, name: "Revisar petição" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Enviada por Beatriz Nogueira" })).toBeVisible();
    await expect(page.getByText("O prazo vence hoje: se puder, revise até as 16h.")).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: /Comentar o parágrafo 2: CONSTRUTORA ATLAS/ }).click();
    await page.getByLabel("Comentário sobre o parágrafo 2").fill("O endereço da sede mudou em setembro.");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Guardar comentário" }).click();
    await expect(page.getByRole("note", { name: "Comentário de Felipe Matos no parágrafo 2" })).toBeVisible();
    expect(pedidos.find((p) => p.caminho.endsWith("/comentarios"))!.corpo).toEqual({ paragrafo: 2, texto: "O endereço da sede mudou em setembro." });

    await page.getByRole("radio", { name: /Reprovar/ }).check();
    await page.getByRole("button", { name: "Reprovar" }).click();
    await expect(page.getByText("A decisão não foi enviada.")).toBeVisible();
    await expect(page.getByLabel("Motivo")).toHaveAttribute("aria-invalid", "true");
    await semViolacoes(page);
    await page.getByRole("radio", { name: /Pedir ajuste/ }).check();
    await page.getByRole("button", { name: "Pedir ajuste a Beatriz" }).click();
    await expect(page.getByText("Ajuste pedido a Beatriz.")).toBeVisible();
    expect(pedidos.find((p) => p.caminho.endsWith("/decisao"))!.corpo).toEqual({ decisao: "AJUSTE", comentario: null, versao: 1 });
  });

  test("Passar a revisão para outro advogado", async ({ page }) => {
    const rev = ficha("REVISAO", { pode: { revisar: true, novaVersao: false, enviar: false, passar: true } });
    const pedidos = await simular(page, {
      ...comuns("Felipe Matos", false),
      [`GET /v1/escritorio/peticoes/${PET(2)}`]: [{ corpo: rev }, { corpo: ficha("REVISAO", { revisor: MARINA }) }],
      [`GET /v1/escritorio/peticoes/${PET(2)}/revisores`]: { corpo: { revisores: [{ ...MARINA, frase: "OAB/SP nº 214.538" }] } },
      [`POST /v1/escritorio/peticoes/${PET(2)}/passar`]: { corpo: ficha("REVISAO", { revisor: MARINA }) },
    });
    await page.goto(`${P}/juridico/peticoes/${PET(2)}`);
    await page.getByRole("link", { name: "Passar a revisão para outro advogado" }).click();
    const j = page.getByRole("dialog", { name: "Passar a revisão" });
    await expect(j.getByLabel("Passar para")).toHaveValue(MARINA.id);
    await j.getByLabel("Por quê (opcional)").fill("Estou em audiência até as 17h.");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Passar para Marina" }).click();
    await expect(page.getByText("Revisão passada para Marina Ribeiro.")).toBeVisible();
    expect(pedidos.find((p) => p.caminho.endsWith("/passar"))!.corpo).toEqual({ pessoaId: MARINA.id, motivo: "Estou em audiência até as 17h." });
  });

  test("Ajuste pedido: os comentários, e a versão 2 em .docx editado no Word", async ({ page }) => {
    const docx = Buffer.from(await criarDocx([{ texto: "CONSTRUTORA ATLAS LTDA., com sede na Avenida Paulista, 2.100" }, { texto: "Portador do [RG: falta]" }]));
    const coms = [
      { id: COM(1), versao: 1, autor: FELIPE, paragrafo: null, trecho: null, texto: "Inclua a preliminar de ilegitimidade passiva.", criadoEm: "2026-11-18T17:40:00Z", enviado: true, resolvidoEm: null, resolvidoNaVersao: null },
      { id: COM(2), versao: 1, autor: FELIPE, paragrafo: 2, trecho: "CONSTRUTORA ATLAS LTDA., com sede na Rua Tagipuru, 235", texto: "O endereço da sede mudou.", criadoEm: "2026-11-18T17:40:00Z", enviado: true, resolvidoEm: null, resolvidoNaVersao: null },
    ];
    const aj = ficha("AJUSTE", {
      comentarios: coms, pode: { revisar: false, novaVersao: true, enviar: false, passar: false },
      versoes: [versao(1, { decisao: { tipo: "AJUSTE", por: FELIPE, em: "2026-11-18T17:40:00Z", motivo: "Inclua a preliminar de ilegitimidade passiva." } })],
    });
    const pedidos = await simular(page, {
      ...comuns("Beatriz Nogueira", false),
      [`GET /v1/escritorio/peticoes/${PET(2)}`]: [{ corpo: aj }, { corpo: aj }, { corpo: ficha("REVISAO", { versaoAtual: 2, versoes: [versao(1), versao(2, { origem: "DOCX_EDITADO" })] }) }],
      [`POST /v1/escritorio/peticoes/${PET(2)}/versoes/docx`]: { status: 201, corpo: { id: PET(2), situacao: "REVISAO", arquivo: "x", marcados: [], revisor: FELIPE, versao: 2, faltas: 1 } },
    });
    await page.goto(`${P}/juridico/peticoes/${PET(2)}`);
    await expect(page.getByRole("heading", { name: "Ajuste pedido" })).toBeVisible();
    await expect(page.getByRole("note", { name: "Comentário geral de Felipe Matos" })).toContainText("Inclua a preliminar");
    await expect(page.getByRole("note", { name: "Comentário de Felipe Matos no parágrafo 2" }).first()).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("link", { name: "Corrigir e enviar a versão 2" }).click();
    await expect(page).toHaveURL(new RegExp(`/juridico/peticoes/${PET(2)}/versao$`));
    await page.getByRole("radio", { name: /Enviar o .docx editado no Word/ }).check();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "contestacao-v2.docx", mimeType: "application/octet-stream", buffer: docx });
    await expect(page.getByText("Ainda há 1 dado marcado como falta no texto.")).toBeVisible();
    await page.getByLabel("Recado para Felipe (opcional)").fill("Incluí a preliminar.");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Enviar a v2 para Felipe Matos" }).click();
    await expect(page.getByText("Versão 2 enviada.")).toBeVisible();
    const envio = pedidos.find((p) => p.caminho.endsWith("/versoes/docx"))!;
    const q = new URLSearchParams(envio.busca);
    expect(q.get("recado")).toBe("Incluí a preliminar.");
    expect(q.get("resolvidos")).toBe(`${COM(1)},${COM(2)}`);
    expect(envio.bytes).toBe(docx.length);
  });

  test("Aprovada e reprovada, e as petições na ficha do caso", async ({ page }) => {
    const aprov = ficha("APROVADA", {
      aprovadaPor: FELIPE, aprovadaEm: "2026-11-18T18:20:00Z", versaoAtual: 2,
      versoes: [versao(1, { decisao: { tipo: "AJUSTE", por: FELIPE, em: "2026-11-18T17:40:00Z", motivo: "x" } }), versao(2, { decisao: { tipo: "APROVADA", por: FELIPE, em: "2026-11-18T18:20:00Z", motivo: "Ótimo. Pode protocolar hoje." } })],
    });
    const reprov = ficha("REPROVADA", { id: PET(4), revisor: LARISSA, versoes: [versao(1, { decisao: { tipo: "REPROVADA", por: LARISSA, em: "2026-11-18T18:00:00Z", motivo: "O laudo ainda não saiu." } })] });
    await simular(page, {
      ...comuns("Beatriz Nogueira", false),
      [`GET /v1/escritorio/peticoes/${PET(2)}`]: { corpo: aprov },
      [`GET /v1/escritorio/peticoes/${PET(4)}`]: { corpo: reprov },
    });
    await page.goto(`${P}/juridico/peticoes/${PET(2)}`);
    await expect(page.getByRole("heading", { name: "Pronta para protocolar" })).toBeVisible();
    await expect(page.getByText("Ótimo. Pode protocolar hoje.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Baixar o .docx" })).toBeVisible();
    await semViolacoes(page);
    await page.goto(`${P}/juridico/peticoes/${PET(4)}`);
    await expect(page.getByRole("heading", { name: "Reprovada" })).toBeVisible();
    await expect(page.getByText("O laudo ainda não saiu.")).toBeVisible();
    await expect(page.getByText("Fica guardada, mas não sai como pronta.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Baixar o rascunho" })).toBeVisible();
    await semViolacoes(page);
  });

  test("Ficha do caso: Petições do caso e Gerar petição", async ({ page }) => {
    const etapa = (n: number, nome: string) => ({ id: `e${n}`, ordem: n, nome, descricao: null, textoCliente: "x", avisaFinanceiro: false, final: n === 8, casos: 0 });
    const FICHA = {
      id: CASO, nome: "Pereira x Mercado Bom Preço", area: "TRABALHISTA", numero: "10010223320265020045", situacao: "ANDAMENTO", resultado: null,
      parteContraria: "Mercado Bom Preço", cliente: { id: JOANA, nome: "Joana Pereira" }, outrosClientes: 0, semContrato: false, etapa: { id: "e5", ordem: 5, nome: "Sentença", final: false },
      responsavel: MARINA, etapaDesde: "2026-11-07T13:00:00Z", proximoPrazo: null, pendencias: 0,
      tribunal: "TRT-2", vara: null, sistema: "PJe-JT", distribuidoEm: null, valorCausa: null, avisarCliente: true, encerradoEm: null, versao: 1,
      criadoEm: "2026-03-03T13:00:00Z", veHonorarios: true, quemTemContratos: [], mudancas: [],
      clientes: [{ id: JOANA, nome: "Joana Pereira", papel: "AUTOR", telefone: "+5511985521034", contrato: null }],
      etapas: [etapa(5, "Sentença"), etapa(8, "Encerrado")], hoje: "2026-11-19", prazos: [], tarefas: [], escritorio: "Ribeiro & Matos", faltam: [], documentos: [],
    };
    await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/pessoas": { corpo: { pessoas: [MARINA] } },
      [`GET /v1/escritorio/juridico/casos/${CASO}`]: { corpo: FICHA },
      "GET /v1/escritorio/peticoes": { corpo: { paraRevisar: 1, modelos: [], peticoes: [LISTA.peticoes[1], LISTA.peticoes[0]] } },
    });
    await page.goto(`${P}/juridico/casos/${CASO}`);
    const folha = page.getByRole("region", { name: "Petições do caso" });
    await expect(folha.getByRole("link", { name: "Revisar Contestação cível" })).toBeVisible();
    await expect(folha.getByRole("button", { name: "Baixar Recurso ordinário" })).toBeVisible();
    await expect(folha.getByRole("link", { name: "Gerar petição" })).toHaveAttribute("href", `/juridico/peticoes/nova?caso=${CASO}`);
    await expect(page.getByRole("region", { name: "Documentos" }).getByRole("link", { name: "Gerar petição" })).toHaveAttribute("href", `/juridico/peticoes/nova?caso=${CASO}`);
    await semViolacoes(page);
  });

  test("Sino: o pedido de revisão leva à petição", async ({ page }) => {
    await simular(page, {
      ...comuns("Felipe Matos", false),
      "GET /v1/escritorio/avisos": { corpo: { novos: 1, total: 1, itens: [
        { id: "av1", tipo: "PETICAO_REVISAR", dados: { quem: "Beatriz Nogueira", modelo: "Contestação cível", caso: "Souza x Construtora Atlas", versao: 1 }, origem: "peticoes", origemId: PET(2), em: new Date().toISOString(), lido: false },
      ] } },
      "GET /v1/escritorio/peticoes": { corpo: LISTA },
    });
    await page.goto(`${P}/juridico/peticoes`);
    await page.getByRole("button", { name: "Avisos, 1 novo" }).first().click();
    await expect(page.getByRole("link", { name: "Novo: Beatriz Nogueira mandou a petição “Contestação cível” de Souza x Construtora Atlas para você revisar" }))
      .toHaveAttribute("href", `/juridico/peticoes/${PET(2)}`);
    await expect(page.getByText("Revisar a petição")).toBeVisible();
  });
});
