// Documentos para começar, parte 4b (EX-18; F3.131), desenho aprovado em
// docs/design/aprovadas/portal-jornada-fechamento (grupo 9, decisões 43 a 48): a lista da área na
// abertura do caso, com "Já temos"; "Juntar os documentos" no próximo passo da ficha do cliente; e
// a ficha do caso com "Antes de seguir" e a folha "Documentos para começar" em primeiro. A API é
// simulada; aqui se testa a tela, a acessibilidade e o que ela manda ao servidor.
import { expect, test, type Page } from "@playwright/test";
import { h, semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const CLI = "c1000000-0000-4000-8000-000000000201";
const CT = "c2000000-0000-4000-8000-000000000031";
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const LARISSA = { id: "a0000000-0000-4000-8000-000000000102", nome: "Larissa Costa" };
const CASO = { id: "ca000000-0000-4000-8000-000000000001", nome: "Ferreira Prado x INSS" };
const it = (n: number) => `d2000000-0000-4000-8000-00000000000${n}`;
const pd = (n: number) => `d3000000-0000-4000-8000-00000000000${n}`;

const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};
const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + n * 864e5));

const FICHA = {
  id: CLI, tipo: "PF", nome: "Antônia Ferreira Prado", documento: "52998224725", nacionalidade: "brasileira", estadoCivil: "VIUVO", profissao: "Aposentada",
  rg: "12.345.678-9", rgOrgao: "SSP/SP", cep: "04117030", endereco: "Rua das Acácias, 418", bairro: "Vila Mariana", cidade: "São Paulo", uf: "SP",
  repNome: null, repCargo: null, repDocumento: null, repEstadoCivil: null, repProfissao: null, situacao: "ATIVO", inativadoEm: null,
  motivoInativacao: null, inativadoPor: null, criadoEm: h(24 * 22), criadoPor: MARINA, versao: 3, comercial: true, podeInativar: true, faltando: [],
  alterado: null, contatos: [{ id: "d0000000-0000-4000-8000-000000000201", nome: "Joana Prado", papel: "Filha", telefone: "+5511987654321", email: null, principal: true }],
  origem: "GOOGLE", origemIndicacao: null, atendimentos: 4, primeiroAtendimento: null, proxContato: null,
  passo: { tipo: "CONTRATO_SEM_CASO", area: "JURIDICO", pode: true, quemPode: null, item: { id: CT, numero: "C-2026-031", objeto: "Pensão por morte", assinadoEm: dia(0) } },
  contagens: { propostas: 1, contratos: 1, casos: 0 },
  noEscritorio: null,
};
const DOCS = { hoje: dia(0), validadeDias: 90, podeAnexar: true, documentos: [], pedidos: [] };
const OPCOES = {
  contrato: { id: CT, numero: "C-2026-031", objeto: "Pensão por morte", situacao: "ATIVO", versao: 3, criadoEm: h(48), area: "PREVIDENCIARIO",
              cliente: { id: CLI, nome: "Antônia Ferreira Prado" } },
  casoLigado: null,
  sugestao: { nome: CASO.nome, area: "PREVIDENCIARIO", responsavelId: LARISSA.id, papel: "AUTOR" },
  responsavelSugerido: LARISSA, escolhe: true, responsaveis: [LARISSA, MARINA], casos: [],
};
const doc = (x: Record<string, unknown>) => ({
  id: "f1000000-0000-4000-8000-000000000001", tipo: "RG_CPF", descricao: null, dataDocumento: null, nome: "rg.pdf", arquivoTipo: "application/pdf",
  tamanho: 380000, fotos: null, enviadoPor: MARINA, enviadoEm: `${dia(-12)}T15:00:00Z`, dias: null, vencido: false, anteriores: 0, ...x,
});
const item = (n: number, nome: string, como: string | null, x: Record<string, unknown> = {}) => ({
  itemId: it(n), nome, comoPedir: como, pessoal: null, seHouver: false, situacao: "PEDIR", doc: null,
  noAviso: `${nome.charAt(0).toLowerCase()}${nome.slice(1)}${como ? ` (${como.charAt(0).toLowerCase()}${como.slice(1).replace(/\.$/, "")})` : ""}`, ...x,
});
const PREVIA = {
  area: "PREVIDENCIARIO", cliente: { id: CLI, nome: "Antônia Ferreira Prado" }, contato: { nome: "Joana Prado", celular: true, semAvisos: false },
  whatsappLigado: true, escritorio: "Ribeiro & Matos", podeConferir: true,
  modelo: "Olá, {nome}. Aqui é do escritório {nome do escritório}. Para o caso {caso} andar, ainda precisamos de: {documento}. Pode mandar uma foto ou o arquivo por aqui mesmo. Se já mandou, agradecemos e pode desconsiderar esta mensagem.",
  itens: [
    { ...item(1, "RG e CPF, ou CNH", "Documento com foto e o CPF.", { pessoal: "RG_CPF", situacao: "JA_TEMOS", doc: doc({}) }), noAviso: "RG e CPF, ou CNH (documento com foto e o CPF)" },
    item(2, "Comprovante de residência", "Conta de luz, água ou telefone dos últimos 90 dias.",
         { pessoal: "COMPROVANTE_RESIDENCIA", situacao: "VENCIDO", doc: doc({ id: "f1000000-0000-4000-8000-000000000003", tipo: "COMPROVANTE_RESIDENCIA", dataDocumento: dia(-139), dias: 139, vencido: true }) }),
    item(3, "Extrato do CNIS", "Pelo Meu INSS"),
    item(4, "Laudos e exames médicos", null, { seHouver: true }),
  ],
};

type Resp = { status?: number; corpo: unknown };
type Pedido = { metodo: string; caminho: string; busca: string; corpo: unknown };
async function simular(page: Page, rotas: Record<string, Resp | Resp[]>) {
  const pedidos: Pedido[] = [];
  await page.route("**/api/v1/**", async (rota) => {
    const url = new URL(rota.request().url());
    const caminho = url.pathname.replace(/^\/api/, "");
    const metodo = rota.request().method();
    pedidos.push({ metodo, caminho, busca: url.search, corpo: rota.request().postDataJSON() });
    const r = rotas[`${metodo} ${caminho}${url.search}`] ?? rotas[`${metodo} ${caminho}`] ?? rotas[caminho];
    const lista = Array.isArray(r) ? r : r ? [r] : [{ status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } }];
    const vez = pedidos.filter((p) => p.caminho === caminho && p.metodo === metodo && p.busca === url.search).length - 1;
    const x = lista[Math.min(vez, lista.length - 1)]!;
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return pedidos;
}
const comuns = (ficha: unknown = FICHA) => ({
  "/v1/escritorio": { corpo: ESCRITORIO },
  [`GET /v1/escritorio/clientes/${CLI}`]: { corpo: ficha },
  "/v1/escritorio/pessoas": { corpo: { pessoas: [MARINA, LARISSA] } },
  [`GET /v1/escritorio/clientes/${CLI}/documentos`]: { corpo: DOCS },
});

test.describe("Documentos para começar na abertura do caso (EX-18)", () => {
  test("Abrir o caso: a lista vem pronta com o que já temos, e o que vai ao servidor", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/contratos/${CT}/caso`]: { corpo: OPCOES },
      "GET /v1/escritorio/juridico/documentos-inicio/previa": { corpo: PREVIA },
      [`POST /v1/escritorio/contratos/${CT}/caso`]: [
        { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { campos: ["caso.documentos.mais"] } } } },
        { corpo: { casoId: CASO.id, semCaso: false } },
      ],
    });
    await page.goto(`${P}/clientes/${CLI}`);
    await page.getByRole("region", { name: "Próximo passo" }).getByRole("button", { name: "Abrir o caso" }).click();
    const j = page.getByRole("dialog", { name: "Abrir o caso" });
    const lista = j.getByRole("group", { name: /^Documentos para começar/ });
    await expect(lista).toContainText("A lista de previdenciário, com o que já está na ficha.");
    await expect(lista).toContainText("RG e CPF, ou CNHJá temos");
    await expect(lista.getByRole("checkbox", { name: /RG e CPF/ })).toHaveCount(0);
    await expect(lista.getByRole("checkbox", { name: /Comprovante de residência/ })).toBeChecked();
    await expect(lista).toContainText("com 139 dias. Pedir um novo.");
    await expect(lista.getByRole("checkbox", { name: /Laudos/ })).toBeChecked();
    await expect(lista).toContainText("Do caso · se houver");
    const avisar = lista.getByRole("checkbox", { name: /Avisar Joana Prado pelo WhatsApp com a lista/ });
    await expect(avisar).toBeChecked();
    await expect(lista).toContainText("Para o caso Ferreira Prado x INSS andar, ainda precisamos de: comprovante de residência (conta de luz, água ou telefone dos últimos 90 dias), extrato do CNIS (pelo Meu INSS) e laudos e exames médicos.");
    await semViolacoes(page);
    // Os laudos não servem à pensão por morte; e pede mais um.
    await lista.getByRole("checkbox", { name: /Laudos/ }).uncheck();
    await lista.getByLabel(/Pedir mais um documento/).fill("Certidão de nascimento de Joana");
    await expect(lista).toContainText("extrato do CNIS (pelo Meu INSS) e certidão de nascimento de Joana.");
    await j.getByRole("button", { name: "Abrir o caso" }).click();
    // O servidor recusou o documento a mais: o campo diz o que acertar.
    await expect(lista.getByLabel(/Pedir mais um documento/)).toHaveAttribute("aria-invalid", "true");
    await j.getByRole("button", { name: "Abrir o caso" }).click();
    await expect(page).toHaveURL(new RegExp(`/juridico/casos/${CASO.id}`));
    const corpo = pedidos.filter((p) => p.metodo === "POST" && p.caminho === `/v1/escritorio/contratos/${CT}/caso`).at(-1)?.corpo;
    expect(corpo).toEqual({ caso: { modo: "NOVO", nome: CASO.nome, area: "PREVIDENCIARIO", responsavelId: LARISSA.id, papel: "AUTOR",
      documentos: { pedir: [it(2), it(3)], mais: ["Certidão de nascimento de Joana"], avisar: true } } });
    expect(pedidos.find((p) => p.caminho === "/v1/escritorio/juridico/documentos-inicio/previa")?.busca).toBe(`?area=PREVIDENCIARIO&cliente=${CLI}`);
  });

  test("área sem lista: nada é pedido sozinho; sem o WhatsApp ligado, os pedidos ficam registrados", async ({ page }) => {
    await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/contratos/${CT}/caso`]: { corpo: { ...OPCOES, sugestao: { ...OPCOES.sugestao, area: "FAMILIA" } } },
      "GET /v1/escritorio/juridico/documentos-inicio/previa": { corpo: { ...PREVIA, area: "FAMILIA", itens: [], whatsappLigado: false } },
    });
    await page.goto(`${P}/clientes/${CLI}`);
    await page.getByRole("region", { name: "Próximo passo" }).getByRole("button", { name: "Abrir o caso" }).click();
    const lista = page.getByRole("dialog", { name: "Abrir o caso" }).getByRole("group", { name: /^Documentos para começar/ });
    await expect(lista).toContainText("Família ainda não tem lista.");
    await expect(lista.getByRole("link", { name: "monte a lista de família" })).toHaveAttribute("href", "/juridico/casos/documentos");
    await lista.getByLabel(/Pedir mais um documento/).fill("Certidão de óbito de Jorge Castro");
    await expect(lista).toContainText("O WhatsApp do escritório ainda não está ligado ao T3jus");
    await semViolacoes(page);
  });

  test("ficha do cliente: “Juntar os documentos, 1 de 4” com o que falta", async ({ page }) => {
    const passo = {
      tipo: "DOCUMENTOS", area: "JURIDICO", pode: true, quemPode: null,
      item: { id: CASO.id, nome: CASO.nome, responsavel: LARISSA, etapa: { ordem: 1, nome: "Preparação" }, etapas: 8, chegaram: 1, total: 4,
        faltam: [{ id: pd(1), descricao: "Comprovante de residência", tipoPessoal: "COMPROVANTE_RESIDENCIA" },
                 { id: pd(2), descricao: "Extrato do CNIS", tipoPessoal: null }, { id: pd(3), descricao: "Certidão de nascimento de Joana", tipoPessoal: null }],
        aviso: { id: "m1", envio: "ENVIADA", em: `${dia(0)}T13:00:00Z`, envioEm: null, motivo: null, para: "Joana Prado", telefone: null } },
    };
    await simular(page, comuns({ ...FICHA, passo, contagens: { propostas: 1, contratos: 1, casos: 1 } }));
    await page.goto(`${P}/clientes/${CLI}`);
    const ambar = page.getByRole("region", { name: /Próximo passo · antes de seguir o caso/ });
    await expect(ambar).toContainText("Juntar os documentos");
    await expect(ambar).toContainText(`1 de 4chegaram para começar ${CASO.nome}`);
    await expect(ambar.getByRole("listitem").filter({ hasText: "Extrato do CNIS" })).toBeVisible();
    await expect(ambar).toContainText("Joana recebeu a lista em");
    await expect(ambar.getByRole("link", { name: "Anexar o que chegou" })).toHaveAttribute("href", `/juridico/casos/${CASO.id}#t-docs`);
    await semViolacoes(page);
    await ambar.getByRole("button", { name: "Pedir de novo" }).click();
    const j = page.getByRole("dialog", { name: "Pedir pelo WhatsApp" });
    await expect(j).toContainText("precisamos de: comprovante de residência, extrato do CNIS e certidão de nascimento de Joana.");
    await expect(j.getByRole("link", { name: "Abrir no WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/5511987654321\?text=/);
  });
});

// ------------------------------------------------------------------------- a ficha do caso
const NOMES = ["Preparação", "Petição inicial", "Citação e defesa", "Instrução", "Sentença", "Recurso", "Cumprimento", "Encerrado"];
const ETAPAS = NOMES.map((nome, i) => ({ id: `e1000000-0000-4000-8000-00000000000${i + 1}`, ordem: i + 1, nome, final: i === 7, avisaFinanceiro: false, texto: null, casos: 0 }));
const falta = (n: number, descricao: string, tipoPessoal: string | null) => ({
  id: pd(n), descricao, pedidoEm: dia(0), repedidoEm: null, tipoPessoal, inicio: true,
  cliente: { id: CLI, nome: "Antônia Ferreira Prado", telefone: "+5511987654321", contato: "Joana Prado", celular: true }, pedidoPor: MARINA,
});
const FICHA_CASO = {
  id: CASO.id, nome: CASO.nome, area: "PREVIDENCIARIO", numero: null, situacao: "ANDAMENTO", resultado: null, parteContraria: "INSS",
  cliente: { id: CLI, nome: "Antônia Ferreira Prado" }, outrosClientes: 0, semContrato: false, etapa: { ...ETAPAS[0] }, responsavel: LARISSA,
  etapaDesde: `${dia(0)}T13:00:00Z`, proximoPrazo: null, pendencias: 0,
  tribunal: null, vara: null, sistema: null, distribuidoEm: null, valorCausa: null, avisarCliente: true, encerradoEm: null, versao: 1,
  criadoEm: `${dia(0)}T13:00:00Z`, veHonorarios: true,
  clientes: [{ id: CLI, nome: "Antônia Ferreira Prado", papel: "AUTOR", telefone: "+5511987654321", contrato: null }],
  etapas: ETAPAS, mudancas: [], quemTemContratos: ["Marina Ribeiro"], hoje: dia(0), prazos: [], tarefas: [], escritorio: "Ribeiro & Matos",
  faltam: [falta(1, "Comprovante de residência", "COMPROVANTE_RESIDENCIA"), falta(2, "Extrato do CNIS", null), falta(3, "Certidão de nascimento de Joana", null)],
  documentos: [],
  inicio: {
    total: 4, chegaram: 1, area: "PREVIDENCIARIO", faltam: [], aviso: null,
    temos: [{ id: pd(4), descricao: "RG e CPF, ou CNH", tipoPessoal: "RG_CPF", chegouEm: `${dia(0)}T13:00:00Z`, chegouPor: MARINA, daFicha: true }],
  },
};

test.describe("A ficha do caso com documentos para começar (EX-18)", () => {
  test("“Antes de seguir”, a folha em primeiro, e “Já chegou” de pessoal vai para a ficha do cliente", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      [`GET /v1/escritorio/juridico/casos/${CASO.id}`]: { corpo: FICHA_CASO },
      [`GET /v1/escritorio/juridico/casos/${CASO.id}/peticoes`]: { corpo: { peticoes: [] } },
      [`GET /v1/escritorio/clientes/${CLI}/documentos`]: { corpo: { ...DOCS, pedidos: [{ id: pd(1), tipoPessoal: "COMPROVANTE_RESIDENCIA", descricao: "Comprovante de residência", pedidoEm: dia(0), caso: CASO }] } },
    });
    await page.goto(`${P}/juridico/casos/${CASO.id}`);
    const etapa = page.getByRole("region", { name: "Etapa do caso" });
    await expect(etapa).toContainText("Antes de seguir: juntar os documentos, 1 de 4.");
    await expect(etapa.getByRole("link", { name: "Ver o que falta" })).toHaveAttribute("href", "#t-docs");
    await expect(etapa.getByRole("button", { name: "Mudar etapa" })).toHaveClass(/btn-sec/);
    const folha = page.getByRole("region", { name: "Documentos para começar" });
    await expect(folha).toContainText("1 de 4 · a lista de previdenciário, conferida na abertura");
    await expect(folha).toContainText("Pessoal · Com Antônia");
    await expect(folha).toContainText("Do caso · Com Antônia");
    await expect(folha.getByRole("heading", { name: "Já temos · 1" })).toBeVisible();
    await expect(folha).toContainText("Da ficha");
    // A folha vem antes de "Dados do caso".
    const ordem = await page.locator("section.folha h2").allInnerTexts();
    expect(ordem.indexOf("Documentos para começar")).toBeLessThan(ordem.findIndex((t) => /Dados/.test(t)));
    await semViolacoes(page);
    await folha.getByRole("button", { name: "Já chegou: Comprovante de residência" }).click();
    const j = page.getByRole("dialog", { name: "Anexar documento" });
    await expect(j.getByLabel("Qual documento")).toHaveValue("COMPROVANTE_RESIDENCIA");
    await expect(j.getByRole("checkbox", { name: new RegExp(`^Marcar como chegou em ${CASO.nome}`) })).toBeChecked();
  });
});
