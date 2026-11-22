// Contratos do Portal (telas aprovadas em docs/design/aprovadas/portal-comercial-contratos):
// lista, novo contrato (direto e da proposta aceita), ficha com assinatura, recebimentos e
// encerrar, mudar condição de contrato ativo e Honorários com a base do mês. A API é
// simulada; aqui se testa a tela, a acessibilidade e o que ela manda ao servidor.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const FELIPE = { id: "a0000000-0000-4000-8000-000000000103", nome: "Felipe Matos" };
const DIEGO = { id: "a0000000-0000-4000-8000-000000000102", nome: "Diego Almeida" };
const cli = (n: number) => `c1000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;
const ct = (n: number) => `f1000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;
const prop = (n: number) => `d1000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;
const rc = (n: number) => `b1000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;

// A OAB de cada advogado (EX-12): Marina com uma, Felipe com duas, Diego sem.
const oab = (id: string, uf: string, numero: string, letra: string | null, tipo: string) => ({
  id, uf, numero: numero.replace(".", ""), letra, tipo, versao: 1,
  texto: `OAB/${uf} ${numero}${letra ? `-${letra}` : ""}`, documento: `OAB/${uf} nº ${numero}${letra ? `-${letra}` : ""}`,
});
const OAB_MA = oab("0ab00000-0000-4000-8000-000000000001", "SP", "214.538", null, "PRINCIPAL");
const OAB_FSP = oab("0ab00000-0000-4000-8000-000000000002", "SP", "287.104", null, "PRINCIPAL");
const OAB_FRJ = oab("0ab00000-0000-4000-8000-000000000003", "RJ", "245.880", "S", "SUPLEMENTAR");
const PESSOAS_OAB = [{ ...DIEGO, oab: [] }, { ...MARINA, oab: [OAB_MA] }, { ...FELIPE, oab: [OAB_FSP, OAB_FRJ] }];

const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};
const SEM_AREA = { ...ESCRITORIO, pessoa: "Diego Almeida", dono: false, areas: ["COMERCIAL"], funcoes: ["EQUIPE"] };

const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + n * 864e5));
const br = (n: number) => dia(n).split("-").reverse().join("/");
const em = (n: number, h: string) => `${dia(n)}T${h}:00-03:00`;

const PARC = { tipo: "PARCELADO", total: 200000, parcelas: 3, primeiro: dia(20) };
const EXITO = { tipo: "EXITO", percentual: 3000, sobre: "Atrasados que o cliente receber", etapa: "Pagamento da RPV ou precatório", dias: 15 };
const MENSAL = { tipo: "MENSAL", valor: 180000, primeiro: dia(-70), meses: null, reajuste: "IPCA, todo setembro" };
const REC = { tipo: "RECORRENTE", percentual: 3000, sobre: "Benefício mensal do cliente", etapa: null, primeiro: dia(-30), dia: 10, meses: 12, diaLembrete: 5, quemLembrete: null, pedirWhats: false };

const linha = (n: number, nome: string, objeto: string, situacao: string, condicoes: unknown[], resp: typeof MARINA, extra = {}) => ({
  id: ct(n), numero: `C-2026-0${n}`, objeto, situacao, cliente: { id: cli(n), nome, tipo: "PF" }, responsavel: resp, condicoes,
  proximo: null, basePendente: null, criadoEm: em(-1, "15:02"), ...extra,
});
const L33 = linha(33, "Benedito Souza Lima", "Aposentadoria por idade", "ELABORACAO", [PARC, EXITO], MARINA);
const L19 = linha(19, "Farmácia Bom Jesus Ltda.", "Cobranças e consultivo", "ATIVO", [MENSAL], FELIPE,
  { proximo: { em: dia(10), valor: 180000, aDefinir: 0, itens: ["Mensalidade 4"] } });
const L22 = linha(22, "Hélio Batista Corrêa", "Aposentadoria especial", "ATIVO", [REC], MARINA, { basePendente: { vencimento: dia(-8), parada: true } });
const LISTA = { algum: true, contagem: { ativos: 2, elaboracao: 1, encerrados: 4, base: 1 }, contratos: [L33, L19, L22] };

const recebimento = (n: number, desc: string, d: number, valor: number | null, extra = {}) => ({
  id: rc(n), tipo: "MENSAL", descricao: desc, vencimento: dia(d), valor, origem: "PROGRAMADO", criadoEm: em(-70, "10:00"), cancelado: null, base: null, ...extra,
});
const F19 = {
  ...L19, observacoes: "Custas ficam por conta do cliente.", versao: 4, assinadoEm: dia(-72), assinaturaPor: FELIPE, encerradoEm: null, motivoEncerramento: null,
  proposta: { id: prop(6), numero: "P-2026-006" }, advogados: [FELIPE], financeiro: false,
  inscricoes: [{ pessoaId: FELIPE.id, frase: "OAB/SP nº 287.104 e OAB/RJ nº 245.880-S", usaTodas: false,
                 inscricoes: [{ ...OAB_FSP, escolhida: true }, { ...OAB_FRJ, escolhida: true }] }],
  recebimentos: [
    recebimento(1, "Mensalidade 1", -70, 180000), recebimento(2, "Mensalidade 2", -40, 180000), recebimento(3, "Mensalidade 3", -10, 180000),
    recebimento(4, "Mensalidade 4", 10, 180000), recebimento(5, "Mensalidade 5", 40, 180000),
    recebimento(6, "Mensalidade 6", 70, 200000, { cancelado: { em: em(-2, "10:00"), motivo: "Condição mudada: reajuste" } }),
  ],
  historico: [
    { em: em(-2, "10:00"), acao: "contrato.editado", autor: "Felipe Matos", dados: { motivo: "Reajuste combinado", cancelados: 1, novos: 1, condicoes_antes: [] } },
    { em: em(-72, "11:00"), acao: "contrato.assinado", autor: "Felipe Matos", dados: { em: dia(-72), recebimentos: 12 } },
    { em: em(-73, "15:00"), acao: "contrato.criado", autor: "Felipe Matos", dados: { numero: "C-2026-019", proposta: "P-2026-006" } },
  ],
};
// F3.73: contrato importado da planilha, 10 parcelas, 8 pagas antes do T3jus (a folha mostra 6 e "as outras 2").
const L41 = linha(41, "Rosa Almeida", "Aposentadoria por idade", "ATIVO", [{ tipo: "PARCELADO", total: 800000, parcelas: 10, primeiro: dia(-240) }], MARINA);
const F41 = {
  ...L41, observacoes: null, versao: 1, assinadoEm: dia(-250), assinaturaPor: MARINA, encerradoEm: null, motivoEncerramento: null,
  proposta: null, advogados: [MARINA], financeiro: true, historico: [], podeMarcarNaoPaga: true,
  recebimentos: Array.from({ length: 10 }, (_, i) => recebimento(40 + i, `Parcela ${i + 1} de 10`, -240 + i * 30, 80000, {
    tipo: "PARCELADO",
    ...(i < 8 ? { pagoAntes: true, cancelado: { em: em(-1, "15:42"), motivo: "Paga antes do T3jus (importação)" } } : { pagoAntes: false }),
  })),
  importacao: { id: "e4000000-0000-4000-8000-000000000041", arquivo: "clientes-e-contratos-2026.xlsx", linha: 2, por: MARINA, em: em(-1, "15:42"),
    desfazerAte: `${dia(6)}T15:42:00-03:00`, desfeita: false },
};
const F33 = {
  ...L33, observacoes: null, versao: 1, assinadoEm: null, assinaturaPor: null, encerradoEm: null, motivoEncerramento: null,
  proposta: { id: prop(14), numero: "P-2026-014" }, advogados: [MARINA, FELIPE], financeiro: true, recebimentos: [],
  inscricoes: [
    { pessoaId: FELIPE.id, frase: "OAB/SP nº 287.104", usaTodas: false, inscricoes: [{ ...OAB_FSP, escolhida: true }, { ...OAB_FRJ, escolhida: false }] },
    { pessoaId: MARINA.id, frase: "OAB/SP nº 214.538", usaTodas: false, inscricoes: [{ ...OAB_MA, escolhida: true }] },
  ],
  historico: [{ em: em(0, "15:02"), acao: "contrato.criado", autor: "Marina Ribeiro", dados: { numero: "C-2026-033", proposta: "P-2026-014" } }],
};
const PROPOSTA14 = {
  id: prop(14), numero: "P-2026-014", respondidaEm: dia(-1), servico: "Aposentadoria por idade", escopo: "Pedido no INSS.",
  responsavel: DIEGO, cliente: { id: cli(33), nome: "Benedito Souza Lima", tipo: "PF" }, condicoes: [PARC, EXITO],
};
const CLIENTES = {
  comercial: true,
  clientes: [
    { id: cli(40), tipo: "PF", nome: "Eduardo Nascimento", situacao: "ATIVO", versao: 1, contatoPrincipal: null, origem: "GOOGLE" },
  ],
};
const HONORARIOS = {
  bases: [{
    recebimentoId: rc(9), vencimento: dia(-8), pedirEm: dia(-13), mes: 2, de: 12, parada: true, contrato: { id: ct(22), numero: "C-2026-022" },
    cliente: "Hélio Batista Corrêa", responsavel: MARINA, percentual: 3000, sobre: "Benefício mensal do cliente",
  }],
  informadas: [{ contrato: { id: ct(22), numero: "C-2026-022" }, cliente: "Hélio Batista Corrêa", descricao: "Percentual recorrente: mês 1 de 12", base: 291000, valor: 87300, vencimento: dia(-38), por: DIEGO, em: em(-40, "10:00") }],
  etapas: [{ contrato: { id: ct(33), numero: "C-2026-033" }, cliente: "Benedito Souza Lima", condicao: EXITO, etapa: "Pagamento da RPV ou precatório" }],
  noMes: 0,
  tipos: [{ tipo: "MENSAL", n: 1 }, { tipo: "RECORRENTE", n: 1 }],
  ativos: 2,
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
    const vez = pedidos.filter((p) => p.caminho === caminho && p.metodo === metodo).length - 1;
    const x = lista[Math.min(vez, lista.length - 1)]!;
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return pedidos;
}

const comuns = (escritorio: unknown = ESCRITORIO) => ({
  "/v1/escritorio": { corpo: escritorio },
  "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA, FELIPE] } },
  "/v1/escritorio/pessoas/oab": { corpo: { pessoas: PESSOAS_OAB } },
  "GET /v1/escritorio/clientes": { corpo: CLIENTES },
  "GET /v1/escritorio/contratos": { corpo: LISTA },
  [`GET /v1/escritorio/contratos/${ct(19)}`]: { corpo: F19 },
  // A folha "Carnê" (FI-23) da aba Recebimentos: os detalhes ficam em portal-carne.spec.ts.
  [`GET /v1/escritorio/contratos/${ct(19)}/carnes`]: { corpo: {
    contrato: { id: ct(19), numero: "C-2026-019", objeto: "Assessoria", situacao: "ATIVO" }, cliente: { id: "c19", nome: "Cliente" },
    parcelas: [{ id: rc(1), descricao: "Mensalidade 1", ordem: 1, total: 12, vencimento: dia(10), valor: 87300, situacao: "A_VENCER", pagaEm: null }],
    recebimento: { pixTipo: null, pixChave: null, recebedor: null, cidade: null, instrucoes: null }, dono: true, socioDono: null,
    carnes: [{ id: "c4000000-0000-4000-8000-000000000019", formato: "TRES", capa: true, geradoPor: { id: "x", nome: "Marina Ribeiro" }, geradoEm: em(-2, "15:32"), comPix: false,
      parcelas: [{ descricao: "Mensalidade 1", ordem: 1, total: 12, vencimento: dia(10), valor: 87300, semValor: false }], mudancas: [] }],
  } },
  [`GET /v1/escritorio/contratos/${ct(33)}`]: { corpo: F33 },
  [`GET /v1/escritorio/contratos/${ct(41)}`]: { corpo: F41 },
  [`GET /v1/escritorio/contratos/da-proposta/${prop(14)}`]: { corpo: PROPOSTA14 },
  "GET /v1/escritorio/contratos/honorarios": { corpo: HONORARIOS },
});

test.describe("Contratos do Portal (CH-01 a CH-04, CH-06, IN-01)", () => {
  test("Lista: honorários, próximo recebimento, base a pedir e situação; filtro e busca vão ao servidor", async ({ page }) => {
    const pedidos = await simular(page, comuns());
    await page.goto(`${P}/contratos`);
    await expect(page.getByRole("heading", { level: 1, name: "Contratos" })).toBeVisible();
    await expect(page.locator(".hn-cont")).toContainText("3 contratos · 2 ativos e 1 em elaboração");
    const tabela = page.getByRole("table", { name: "Contratos" });
    await expect(tabela.getByRole("row", { name: /Benedito/ })).toContainText("depois da assinatura");
    await expect(tabela.getByRole("row", { name: /Farmácia/ })).toContainText("R$ 1.800,00");
    await expect(tabela.getByRole("row", { name: /Hélio/ })).toContainText("base do mês a pedir");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Base do mês a pedir (1)" }).click();
    await expect.poll(() => pedidos.some((p) => p.caminho === "/v1/escritorio/contratos" && p.busca === "?mostrar=BASE")).toBe(true);
    await page.getByLabel("Buscar por cliente, número ou objeto").fill("farm");
    await expect.poll(() => pedidos.some((p) => p.busca === "?mostrar=BASE&q=farm")).toBe(true);
  });

  test("IN-01: pedidos de contrato do Comercial no alto da lista, do mais antigo ao mais novo, com o link para gerar", async ({ page }) => {
    const PEDIDOS = [
      { proposta: { id: prop(14), numero: "P-2026-014", servico: "Aposentadoria por idade", aceitaEm: dia(-1) }, cliente: { id: cli(33), nome: "Benedito Souza Lima" },
        condicoes: [PARC, EXITO], pedidoPor: DIEGO, pedidoEm: em(0, "11:40") },
      { proposta: { id: prop(15), numero: "P-2026-015", servico: "Revisão de contrato bancário", aceitaEm: dia(0) }, cliente: { id: cli(40), nome: "Daniela Rocha Mendes" },
        condicoes: [{ tipo: "FIXO", valor: 150000, vencimento: dia(20) }, EXITO], pedidoPor: DIEGO, pedidoEm: em(0, "14:05") },
    ];
    await simular(page, { ...comuns(), "GET /v1/escritorio/contratos/pedidos": { corpo: PEDIDOS } });
    await page.goto(`${P}/contratos/contratos`);
    const bloco = page.getByRole("region", { name: /Pedidos de contrato/ });
    await expect(bloco.getByRole("heading", { level: 2 })).toContainText("Pedidos de contrato");
    await expect(bloco.getByLabel("2 pedidos")).toBeVisible();
    const itens = bloco.getByRole("listitem");
    await expect(itens.nth(0)).toContainText("Benedito Souza Lima");
    await expect(itens.nth(0)).toContainText(`P-2026-014 · Aposentadoria por idade · aceita em ${br(-1).slice(0, 5)}`);
    await expect(itens.nth(0)).toContainText("R$ 2.000,00 mais êxito");
    await expect(itens.nth(0)).toContainText("Pedido por Diego Almeida");
    await expect(itens.nth(0)).toContainText("hoje, às 11h40 · pelo Comercial");
    await expect(itens.nth(1)).toContainText("Daniela Rocha Mendes");
    await expect(bloco.getByRole("link", { name: "Gerar o contrato de Benedito Souza Lima" })).toHaveAttribute("href", `/contratos/contratos/novo?proposta=${prop(14)}`);
    await expect(page.getByRole("table", { name: "Contratos" })).toBeVisible();
    await semViolacoes(page);
  });

  test("IN-01: o aviso do pedido no sino leva ao Novo contrato da proposta", async ({ page }) => {
    await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/avisos": { corpo: { novos: 1, total: 1, itens: [
        { id: "av1", tipo: "PEDIDO_CONTRATO", origem: "propostas", origemId: prop(14), em: new Date().toISOString(), lido: false,
          dados: { quem: "Diego Almeida", cliente: "Benedito Souza Lima", proposta: "P-2026-014", servico: "Aposentadoria por idade", aceita: dia(-1), condicoes: [PARC, EXITO] } },
      ] } },
    });
    await page.goto(`${P}/contratos/contratos`);
    await page.getByRole("button", { name: "Avisos, 1 novo" }).first().click();
    await expect(page.getByRole("link", { name: "Novo: Diego Almeida pediu o contrato de Benedito Souza Lima" }))
      .toHaveAttribute("href", `/contratos/contratos/novo?proposta=${prop(14)}`);
    await expect(page.getByText(`Proposta P-2026-014, aposentadoria por idade, aceita em ${br(-1).slice(0, 5)}: R$ 2.000,00 mais êxito.`)).toBeVisible();
    await semViolacoes(page);
  });

  test("IN-01: sem pedido de contrato, a lista fica como antes, sem bloco", async ({ page }) => {
    await simular(page, { ...comuns(), "GET /v1/escritorio/contratos/pedidos": { corpo: [] } });
    await page.goto(`${P}/contratos/contratos`);
    await expect(page.getByRole("table", { name: "Contratos" })).toBeVisible();
    await expect(page.getByRole("region", { name: /Pedidos de contrato/ })).toHaveCount(0);
  });

  test("Lista no primeiro uso leva às propostas aceitas e ao primeiro contrato", async ({ page }) => {
    await simular(page, { ...comuns(), "GET /v1/escritorio/contratos": { corpo: { algum: false, contagem: { ativos: 0, elaboracao: 0, encerrados: 0, base: 0 }, contratos: [] } } });
    await page.goto(`${P}/contratos/contratos`);
    await expect(page.getByRole("heading", { name: "Nenhum contrato ainda" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Criar o primeiro contrato" })).toHaveAttribute("href", "/contratos/contratos/novo");
    await semViolacoes(page);
  });

  test("Novo contrato da proposta aceita: vem preenchido, pede o advogado e manda a proposta", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      "POST /v1/escritorio/contratos": [
        { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { campos: ["advogados"] } } } },
        { status: 201, corpo: { id: ct(33), numero: "C-2026-033", versao: 1 } },
      ],
    });
    await page.goto(`${P}/contratos/contratos/novo?proposta=${prop(14)}`);
    await expect(page.getByRole("heading", { level: 1, name: "Novo contrato" })).toBeVisible();
    await expect(page.getByText(/Veio da proposta P-2026-014/)).toBeVisible();
    await expect(page.getByRole("group", { name: "Cliente" })).toContainText("Benedito Souza Lima");
    await expect(page.getByLabel("Objeto do contrato")).toHaveValue("Aposentadoria por idade");
    await expect(page.getByLabel("Responsável pelo contrato")).toHaveValue(DIEGO.id);
    await expect(page.getByRole("group", { name: "Condição 1: Parcelado" })).toBeVisible();
    const resumo = page.locator(page.viewportSize()!.width < 760 ? ".hn-res-dentro" : ".hn-resumo");
    await expect(resumo).toContainText("R$ 2.000,00");
    await expect(resumo).toContainText("Parcela 1 de 3");
    await semViolacoes(page);

    await page.getByRole("button", { name: "Criar contrato" }).click();
    const erro = page.getByRole("alert").filter({ hasText: "Falta acertar 1 ponto" });
    await expect(erro).toBeVisible();
    await erro.getByRole("link", { name: /Advogados no contrato/ }).click();
    await expect(page.locator("#nv-adv")).toBeFocused();
    await semViolacoes(page);
    await page.getByRole("group", { name: "Advogados no contrato e na procuração" }).getByText("Marina Ribeiro (você)").click();
    await page.getByRole("button", { name: "Criar contrato" }).click();
    await page.waitForURL(`**/contratos/contratos/${ct(33)}`);
    await expect(page.getByRole("status").filter({ hasText: "Contrato criado" })).toBeVisible();
    const corpo = pedidos.filter((p) => p.metodo === "POST" && p.caminho === "/v1/escritorio/contratos").at(-1)?.corpo as Record<string, unknown>;
    expect([corpo.clienteId, corpo.propostaId, corpo.advogados, corpo.responsavelId]).toEqual([cli(33), prop(14), [MARINA.id], DIEGO.id]);
    expect(corpo.inscricoes).toEqual({ [MARINA.id]: [OAB_MA.id] });
    expect(corpo.condicoes).toEqual([PARC, EXITO]);
  });

  test("Novo contrato direto: escolhe o cliente e os tipos; o resumo soma o valor certo", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/contratos/contratos/novo`);
    await page.getByLabel("Cliente", { exact: true }).selectOption(cli(40));
    await expect(page.getByRole("group", { name: "Cliente" })).toContainText("Eduardo Nascimento");
    const tipos = page.getByRole("group", { name: /Tipos de honorário/ });
    await tipos.getByText("Fixo", { exact: true }).click();
    const fixo = page.getByRole("group", { name: "Condição 1: Fixo" });
    await fixo.getByLabel("Valor").fill("1.500,00");
    await fixo.getByLabel("Vencimento").fill(br(6));
    const resumo = page.locator(page.viewportSize()!.width < 760 ? ".hn-res-dentro" : ".hn-resumo");
    await expect(resumo).toContainText("R$ 1.500,00");
    await expect(resumo).toContainText(br(6));
    await semViolacoes(page);
  });

  test("Ficha em elaboração: registrar a assinatura com o arquivo assinado ativa e conta os recebimentos (CH-01)", async ({ page }) => {
    const ANEXO = "f9000000-0000-4000-8000-000000000033";
    const envios: string[] = [];
    await page.route("**/arquivos-falsos/**", async (rota) => {
      envios.push(`${rota.request().method()} ${new URL(rota.request().url()).pathname}`);
      await rota.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    const pedidos = await simular(page, {
      ...comuns(),
      "POST /v1/escritorio/anexos": { status: 201, corpo: { id: ANEXO, enderecoDeEnvio: `${P}/arquivos-falsos/${ESC}/${ANEXO}?token=uso-unico` } },
      [`POST /v1/escritorio/anexos/${ANEXO}/concluir`]: { corpo: { id: ANEXO, categoria: "CONTRATO_ASSINADO", nome: "contrato-assinado.pdf" } },
      // Quem assina aqui não tem a área Jurídico: o caso abre com os dados do contrato (F3.111, decisão 19).
      [`GET /v1/escritorio/contratos/${ct(33)}/caso`]: { corpo: {
        contrato: { id: ct(33), numero: "C-2026-033", objeto: "Aposentadoria por idade", situacao: "ELABORACAO", versao: 1, criadoEm: dia(-3), area: "PREVIDENCIARIO",
                    cliente: { id: "c0", nome: "Benedito Souza Lima" } },
        casoLigado: null, sugestao: { nome: "Benedito Souza Lima · Aposentadoria por idade", area: "PREVIDENCIARIO", responsavelId: FELIPE.id, papel: "AUTOR" },
        responsavelSugerido: FELIPE, escolhe: false, responsaveis: null, casos: null,
      } },
      [`POST /v1/escritorio/contratos/${ct(33)}/assinatura`]: [
        { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { campos: ["assinadoEm"] } } } },
        { corpo: { id: ct(33), versao: 2, recebimentos: 3, casoId: "ca000000-0000-4000-8000-000000000033", podeVerCaso: false } },
      ],
    });
    await page.goto(`${P}/contratos/contratos/${ct(33)}`);
    await expect(page.getByRole("heading", { level: 1, name: "Benedito Souza Lima" })).toBeVisible();
    await expect(page.locator(".dir")).toContainText("Assinatura");
    await expect(page.getByRole("heading", { name: "Responsáveis" })).toBeVisible();
    await expect(page.locator(".hn-pessoas")).toContainText("Felipe Matos");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Registrar assinatura" }).click();
    const j = page.getByRole("dialog", { name: "Registrar assinatura" });
    await expect(j.getByText("O caso abre em Jurídico", { exact: true })).toBeVisible();
    await expect(j).toContainText("Felipe recebe o aviso no sino");
    await j.getByLabel("Data da assinatura").fill(br(-1));
    // Sem o arquivo assinado, nada vai ao servidor.
    await j.getByRole("button", { name: "Registrar assinatura" }).click();
    await expect(j.getByLabel(/Contrato assinado/)).toHaveAttribute("aria-invalid", "true");
    await expect(j).toContainText("Anexe o contrato assinado");
    expect(pedidos.some((p) => p.caminho.endsWith("/assinatura"))).toBe(false);
    await j.getByLabel(/Contrato assinado/).setInputFiles({ name: "contrato-assinado.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(1200, 1) });
    await expect(j.getByRole("button", { name: "Tirar o anexo contrato-assinado.pdf" })).toBeVisible();
    await j.getByRole("button", { name: "Registrar assinatura" }).click();
    await expect(j.getByLabel("Data da assinatura")).toHaveAttribute("aria-invalid", "true");
    await expect(j).toContainText("O arquivo assinado já está guardado.");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Registrar assinatura" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Assinatura registrada" })).toContainText("3 recebimentos foram programados. O caso abriu em Jurídico, com Felipe Matos.");
    const corpo = pedidos.filter((p) => p.caminho === `/v1/escritorio/contratos/${ct(33)}/assinatura`).at(-1)?.corpo;
    expect(corpo).toEqual({ versao: 1, assinadoEm: dia(-1), caso: { modo: "NOVO" } });
    // O arquivo foi uma vez só, antes da assinatura, ligado ao contrato.
    expect(envios).toEqual([`PUT /arquivos-falsos/${ESC}/${ANEXO}`]);
    expect(pedidos.filter((p) => p.caminho === "/v1/escritorio/anexos").map((p) => p.corpo)).toEqual([
      { dono: "CONTRATO", donoId: ct(33), categoria: null, nome: "contrato-assinado.pdf", tipo: "application/pdf", tamanho: 1200 },
    ]);
  });

  test("Recebimentos sem Financeiro: programação dos 3 meses, cancelado riscado e quem libera", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/contratos/contratos/${ct(19)}?aba=recebimentos`);
    const tab = page.getByRole("table", { name: "Programação dos recebimentos" });
    await expect(tab.getByRole("row")).toHaveCount(7);
    await expect(tab.getByRole("row", { name: /Mensalidade 6/ })).toContainText("Cancelado: Condição mudada: reajuste");
    await expect(page.getByText("que não está liberado para você. Quem libera é Marina Ribeiro, sócio dono.")).toBeVisible();
    await expect(page.getByRole("link", { name: /Recebimentos/ })).toHaveAttribute("aria-current", "page");
    const carne = page.getByRole("region", { name: "Carnê" });
    await expect(carne).toContainText("Parcela 1/12 · com capa · 1 folha A4");
    await expect(carne.getByRole("link", { name: "Abrir para imprimir" })).toHaveAttribute("href", "/carnes/c4000000-0000-4000-8000-000000000019?area=contratos");
    await semViolacoes(page);
  });

  test("Recebimentos com Financeiro: grade com a coluna Situação e o recebido até hoje (0750, desenho aprovado)", async ({ page }) => {
    const F19F = {
      ...F19, financeiro: true, recebidoAteHoje: 360000, recebimentos: [
        recebimento(1, "Mensalidade 1", -70, 180000, { situacao: "PAGA", recebido: 180000, falta: 0, pagaEm: dia(-69) }),
        recebimento(2, "Mensalidade 2", -40, 180000, { situacao: "PAGA", recebido: 180000, falta: 0, pagaEm: dia(-40) }),
        recebimento(3, "Mensalidade 3", -10, 180000, { situacao: "VENCIDA", recebido: 0, falta: 180000, pagaEm: null }),
        recebimento(4, "Mensalidade 4", 10, 180000, { situacao: "A_VENCER", recebido: 0, falta: 180000, pagaEm: null }),
        recebimento(5, "Êxito da ação", 40, null, { tipo: "EXITO", situacao: "A_VENCER", recebido: 0, falta: 0, pagaEm: null }),
      ],
      condicoes: [MENSAL, EXITO],
    };
    await simular(page, { ...comuns(), [`GET /v1/escritorio/contratos/${ct(19)}`]: { corpo: F19F } });
    await page.goto(`${P}/contratos/contratos/${ct(19)}?aba=recebimentos`);
    const tab = page.getByRole("table", { name: "Programação dos recebimentos" });
    await expect(tab.getByRole("columnheader")).toHaveText(["Vencimento", "O quê", "Condição", "Valor", "Situação"]);
    await expect(tab.getByRole("row", { name: /Mensalidade 1/ })).toContainText(`Paga em ${br(-69).slice(0, 5)}`);
    await expect(tab.getByRole("row", { name: /Mensalidade 3/ })).toContainText("Vencida há 10 dias");
    await expect(tab.getByRole("row", { name: /Mensalidade 4/ })).toContainText("A vencer");
    await expect(tab.getByRole("row", { name: /Êxito da ação/ })).toContainText("Esperando a etapa");
    // O selo da condição fica só com o nome: o valor já está na coluna ao lado.
    await expect(tab.getByRole("row", { name: /Mensalidade 4/ }).locator(".hn-selo")).toHaveText("Mensal");
    await expect(page.getByText("Recebido até hoje")).toBeVisible();
    await expect(page.getByText("R$ 3.600,00")).toBeVisible();
    await expect(page.getByText("Depois dos 3 meses")).toHaveCount(0);
    // A grade da tabela vem do estilo da página (antes a ficha ficava sem ele).
    const cab = tab.locator("thead th").first();
    expect(await cab.evaluate((e) => getComputedStyle(e).textTransform)).toBe("uppercase");
    await semViolacoes(page);
  });

  test("F3.73: as parcelas pagas antes do T3jus ficam numa folha só de informação, com a origem e o caminho de desfazer", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/contratos/contratos/${ct(41)}?aba=recebimentos`);
    const prog = page.getByRole("table", { name: "Programação dos recebimentos" });
    await expect(prog).toBeVisible();
    await expect(prog.getByText("Parcela 8 de 10")).toHaveCount(0);
    await expect(prog.getByText("Parcela 9 de 10")).toBeVisible();
    await expect(page.getByRole("link", { name: /Recebimentos/ })).toContainText("2");
    await expect(page.getByText("Só o que passa pelo T3jus.")).toBeVisible();
    await expect(page.getByRole("link", { name: "R$ 6.400,00 pagos antes" })).toHaveAttribute("href", "#pago-antes");
    const folha = page.getByRole("region", { name: "Pago antes do T3jus" });
    await expect(folha).toContainText("8 parcelas que a planilha trouxe como já pagas.");
    await expect(folha).toContainText("Só informação. Não entram nos totais acima, nem em A receber, nem no Caixa, e não geram recibo");
    const tab = folha.getByRole("table", { name: "Parcelas pagas antes do T3jus" });
    await expect(tab.getByRole("row")).toHaveCount(7);
    await expect(tab.getByRole("row").nth(1)).toContainText("Parcela 8 de 10");
    await expect(tab.getByText("Paga antes do T3jus").first()).toBeVisible();
    await expect(folha).toContainText("R$ 6.400,00");
    await expect(folha).toContainText("clientes-e-contratos-2026.xlsx");
    await expect(folha).toContainText("linha 2");
    await expect(folha).toContainText("“Parcelas pagas: 8”");
    await expect(folha).toContainText("as 8 primeiras de 10");
    await expect(folha).toContainText(`Até ${br(6).slice(0, 5)} dá para desfazer a importação, corrigir a planilha e importar de novo.`);
    await expect(folha.getByRole("link", { name: "Ver a importação" })).toHaveAttribute("href", "/clientes/importacoes/e4000000-0000-4000-8000-000000000041");
    await semViolacoes(page);
    await folha.getByRole("button", { name: "Mostrar as outras 2" }).click();
    await expect(tab.getByRole("row")).toHaveCount(9);
    await expect(folha.getByRole("button", { name: /Mostrar as outras/ })).toHaveCount(0);
  });

  test("F3.73: sem parcela paga antes, a folha não aparece", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/contratos/contratos/${ct(19)}?aba=recebimentos`);
    await expect(page.getByRole("table", { name: "Programação dos recebimentos" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Pago antes do T3jus" })).toHaveCount(0);
  });

  test("Ficha ativa: histórico com motivo e encerrar pede o motivo", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`POST /v1/escritorio/contratos/${ct(19)}/encerrar`]: { corpo: { id: ct(19), versao: 5, cancelados: 2 } },
    });
    await page.goto(`${P}/contratos/contratos/${ct(19)}`);
    await expect(page.locator(".dir")).toContainText("Próximo recebimento");
    await expect(page.getByText("Motivo: “Reajuste combinado”.", { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: "P-2026-006" })).toHaveAttribute("href", `/comercial/propostas/${prop(6)}`);
    await page.getByRole("button", { name: "Encerrar contrato" }).click();
    const j = page.getByRole("alertdialog", { name: "Encerrar contrato" });
    await j.getByRole("button", { name: "Encerrar contrato" }).click();
    await expect(j.getByLabel("Motivo")).toHaveAttribute("aria-invalid", "true");
    await semViolacoes(page);
    await j.getByLabel("Motivo").fill("Serviço concluído");
    await j.getByRole("button", { name: "Encerrar contrato" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Contrato encerrado" })).toBeVisible();
    expect(pedidos.find((p) => p.caminho.endsWith("/encerrar"))?.corpo).toEqual({ versao: 4, motivo: "Serviço concluído" });
  });

  test("Mudar contrato ativo pede o motivo e manda a versão lida", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`PUT /v1/escritorio/contratos/${ct(19)}`]: [
        { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { campos: ["motivo"] } } } },
        { corpo: { id: ct(19), versao: 5, cancelados: 1, novos: 1 } },
      ],
    });
    await page.goto(`${P}/contratos/contratos/${ct(19)}/mudar`);
    await expect(page.getByRole("heading", { level: 1, name: "Mudar contrato" })).toBeVisible();
    await expect(page.getByText("Este contrato está ativo.")).toBeVisible();
    await page.getByRole("button", { name: "Salvar as mudanças" }).click();
    await expect(page.getByLabel("Motivo da mudança")).toHaveAttribute("aria-invalid", "true");
    await semViolacoes(page);
    await page.getByLabel("Motivo da mudança").fill("Reajuste pelo IPCA");
    await page.getByRole("button", { name: "Salvar as mudanças" }).click();
    await page.waitForURL(`**/contratos/contratos/${ct(19)}`);
    const corpo = pedidos.filter((p) => p.metodo === "PUT").at(-1)?.corpo as Record<string, unknown>;
    expect([corpo.versao, corpo.motivo, corpo.advogados, corpo.condicoes]).toEqual([4, "Reajuste pelo IPCA", [FELIPE.id], [MENSAL]]);
  });

  test("EX-12: só quem tem OAB é advogado; de quem tem duas se escolhem as que vão, pelo menos uma", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      "POST /v1/escritorio/contratos": [
        { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { campos: [`inscricoes.${FELIPE.id}`], motivos: { [`inscricoes.${FELIPE.id}`]: "INSCRICAO_OBRIGATORIA" } } } } },
        { status: 201, corpo: { id: ct(33), numero: "C-2026-033", versao: 1 } },
      ],
    });
    await page.goto(`${P}/contratos/contratos/novo?proposta=${prop(14)}`);
    const adv = page.getByRole("group", { name: "Advogados no contrato e na procuração" });
    await expect(adv).toContainText("Sem OAB cadastrada: Diego Almeida.");
    await expect(adv.getByRole("link", { name: "Cadastrar a OAB na Equipe" })).toHaveAttribute("href", "/equipe");
    await adv.getByRole("checkbox", { name: /^Felipe Matos/ }).check();
    const insc = page.getByRole("group", { name: "Inscrições de Felipe que vão no documento" });
    await expect(insc.getByRole("checkbox")).toHaveCount(2);
    await expect(insc.getByRole("checkbox", { name: /OAB\/RJ 245.880-S/ })).toBeChecked();
    await expect(adv.locator(".oe-previa")).toContainText("No contrato e na procuração: Felipe Matos, OAB/SP nº 287.104 e OAB/RJ nº 245.880-S.");
    await insc.getByRole("checkbox", { name: /OAB\/RJ/ }).uncheck();
    await insc.getByRole("checkbox", { name: /OAB\/SP/ }).uncheck();
    await expect(adv.locator(".oe-previa")).toContainText("[falta escolher a inscrição]");
    await page.getByRole("button", { name: "Criar contrato" }).click();
    const erro = page.getByRole("alert").filter({ hasText: "Falta acertar 1 ponto" });
    await erro.getByRole("link", { name: "Advogados: marque pelo menos uma inscrição de Felipe Matos" }).click();
    await expect(insc.getByRole("checkbox", { name: /OAB\/SP/ })).toBeFocused();
    await expect(insc.getByRole("checkbox", { name: /OAB\/SP/ })).toHaveAttribute("aria-invalid", "true");
    await semViolacoes(page);
    await insc.getByRole("checkbox", { name: /OAB\/SP/ }).check();
    await page.getByRole("button", { name: "Criar contrato" }).click();
    await page.waitForURL(`**/contratos/contratos/${ct(33)}`);
    const corpo = pedidos.filter((p) => p.metodo === "POST" && p.caminho === "/v1/escritorio/contratos").at(-1)?.corpo as Record<string, unknown>;
    expect([corpo.advogados, corpo.inscricoes]).toEqual([[FELIPE.id], { [FELIPE.id]: [OAB_FSP.id] }]);
  });

  test("EX-12: a ficha mostra a inscrição que fica fora e Mudar inscrições manda a versão", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`PUT /v1/escritorio/contratos/${ct(33)}/advogados/${FELIPE.id}/inscricoes`]: { corpo: { id: ct(33), versao: 2, frase: "OAB/SP nº 287.104 e OAB/RJ nº 245.880-S" } },
    });
    await page.goto(`${P}/contratos/contratos/${ct(33)}`);
    const rs = page.locator(".hn-pessoas");
    await expect(rs).toContainText("No documento: OAB/SP 287.104");
    await expect(rs).toContainText("OAB/RJ 245.880-S fica fora deste contrato");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Mudar inscrições deste contrato" }).click();
    const j = page.getByRole("dialog", { name: "Inscrições no contrato e na procuração" });
    await j.getByRole("checkbox", { name: /OAB\/SP/ }).uncheck();
    await j.getByRole("button", { name: "Salvar inscrições" }).click();
    await expect(j.getByRole("checkbox", { name: /OAB\/SP/ })).toHaveAttribute("aria-invalid", "true");
    await semViolacoes(page);
    await j.getByRole("checkbox", { name: /OAB\/RJ/ }).check();
    await j.getByRole("checkbox", { name: /OAB\/SP/ }).check();
    await j.getByRole("button", { name: "Salvar inscrições" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Inscrições salvas" })).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "PUT")?.corpo).toEqual({ versao: 1, inscricoes: [OAB_FSP.id, OAB_FRJ.id] });
  });

  test("Honorários: base parada em destaque; informar a base faz a conta e manda os centavos", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`POST /v1/escritorio/recebimentos/${rc(9)}/base`]: { corpo: { id: rc(9), valor: 87300, vencimento: dia(5) } },
    });
    await page.goto(`${P}/contratos/honorarios`);
    await expect(page.getByRole("heading", { level: 1, name: "Honorários" })).toBeVisible();
    await expect(page.locator(".ct-parado")).toContainText("parada");
    await expect(page.getByRole("table", { name: "Condições esperando etapa" })).toContainText("Pagamento da RPV ou precatório");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Informar a base de Hélio Batista Corrêa" }).click();
    const j = page.getByRole("dialog", { name: /Informar a base de/ });
    await expect(j.getByLabel("Vencimento")).toHaveValue(br(5));
    await j.getByLabel(/Valor do benefício/).fill("2.910,00");
    await expect(j).toContainText("30% de R$ 2.910,00 = R$ 873,00");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Informar a base" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Base informada" })).toContainText("R$ 873,00");
    expect(pedidos.find((p) => p.caminho.endsWith("/base"))?.corpo).toEqual({ valor: 291000, fonte: "EXTRATO", vencimento: dia(5) });
  });

  test("Quem não tem a área Contratos vê quem libera", async ({ page }) => {
    await simular(page, comuns(SEM_AREA));
    await page.goto(`${P}/contratos/honorarios`);
    await expect(page.getByRole("heading", { name: "Esta área não está liberada para você" })).toBeVisible();
  });
});

// O arquivo assinado na ficha do contrato ativo (F3.12, CH-01).
test.describe("Contratos do Portal, arquivo assinado (CH-01)", () => {
  const ASSINADO = { id: "f9000000-0000-4000-8000-000000000019", categoria: "CONTRATO_ASSINADO", nome: "contrato-assinado.pdf", tipo: "application/pdf",
    tamanho: 86000, donoId: ct(19), enviadoPor: FELIPE, enviadoEm: em(-72, "16:00") };
  const NOVO = "f9000000-0000-4000-8000-000000000020";

  test("Com o assinado: mostra o arquivo, quem anexou e abre numa aba nova", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/contratos/${ct(19)}/anexos`]: { corpo: { anexos: [ASSINADO] } },
      [`POST /v1/escritorio/anexos/${ASSINADO.id}/abrir`]: { corpo: { url: `${P}/arquivos-falsos/ler?download=contrato.pdf`, validadeSegundos: 60 } },
    });
    await page.route("**/arquivos-falsos/**", (rota) => rota.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF" }));
    await page.goto(`${P}/contratos/contratos/${ct(19)}`);
    const as = page.getByRole("region", { name: "Assinatura" });
    await expect(as).toContainText("Arquivo assinado");
    await expect(as).toContainText("anexado por Felipe Matos");
    await expect(as.getByRole("button", { name: "Anexar outro assinado" })).toBeVisible();
    await semViolacoes(page);
    const aba = page.waitForEvent("popup");
    await as.getByRole("button", { name: /contrato-assinado\.pdf/ }).click();
    await aba;
    expect(pedidos.some((p) => p.caminho === `/v1/escritorio/anexos/${ASSINADO.id}/abrir`)).toBe(true);
  });

  test("Ativo sem o assinado: o selo diz que falta, e anexar guarda o arquivo no contrato", async ({ page }) => {
    const envios: string[] = [];
    await page.route("**/arquivos-falsos/**", async (rota) => {
      envios.push(`${rota.request().method()} ${new URL(rota.request().url()).pathname}`);
      await rota.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/contratos/${ct(19)}/anexos`]: [{ corpo: { anexos: [] } }, { corpo: { anexos: [{ ...ASSINADO, id: NOVO }] } }],
      "POST /v1/escritorio/anexos": { status: 201, corpo: { id: NOVO, enderecoDeEnvio: `${P}/arquivos-falsos/${ESC}/${NOVO}?token=uso-unico` } },
      [`POST /v1/escritorio/anexos/${NOVO}/concluir`]: { corpo: { ...ASSINADO, id: NOVO } },
    });
    await page.goto(`${P}/contratos/contratos/${ct(19)}`);
    const as = page.getByRole("region", { name: "Assinatura" });
    await expect(as).toContainText("Falta anexar o assinado");
    await as.getByRole("button", { name: "Anexar o assinado" }).click();
    const j = page.getByRole("dialog", { name: "Anexar o contrato assinado" });
    await j.getByRole("button", { name: "Anexar" }).click();
    await expect(j.getByText("Escolha o arquivo do contrato assinado.")).toBeVisible();
    await j.getByLabel(/Contrato assinado/).setInputFiles({ name: "contrato-assinado.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(900, 1) });
    await semViolacoes(page);
    await j.getByRole("button", { name: "Anexar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Contrato assinado anexado" })).toBeVisible();
    await expect(as).toContainText("anexado por Felipe Matos");
    expect(pedidos.find((p) => p.caminho === "/v1/escritorio/anexos")?.corpo).toMatchObject({ dono: "CONTRATO", donoId: ct(19) });
    expect(envios).toEqual([`PUT /arquivos-falsos/${ESC}/${NOVO}`]);
  });
});
