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
  proposta: null, advogados: [MARINA], financeiro: true, historico: [],
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

  test("Ficha em elaboração: registrar a assinatura ativa e conta os recebimentos", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`POST /v1/escritorio/contratos/${ct(33)}/assinatura`]: [
        { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { campos: ["assinadoEm"] } } } },
        { corpo: { id: ct(33), versao: 2, recebimentos: 3 } },
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
    await j.getByLabel("Data da assinatura").fill(br(-1));
    await j.getByRole("button", { name: "Registrar e ativar" }).click();
    await expect(j.getByLabel("Data da assinatura")).toHaveAttribute("aria-invalid", "true");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Registrar e ativar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Assinatura registrada" })).toContainText("3 recebimentos foram programados");
    const corpo = pedidos.filter((p) => p.caminho === `/v1/escritorio/contratos/${ct(33)}/assinatura`).at(-1)?.corpo;
    expect(corpo).toEqual({ versao: 1, assinadoEm: dia(-1) });
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
