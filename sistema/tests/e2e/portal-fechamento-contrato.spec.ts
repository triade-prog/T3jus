// Fechamento do caso sem levantamento na ficha do contrato (F3.132: EX-16, EX-17, FI-08), telas
// aprovadas em docs/design/aprovadas/portal-fechamento-sem-levantamento (estados 5 a 14 e 16): a
// folha "Fechamento do caso" logo depois do âmbar, a janela de pendência com o atalho, encerrar o
// caso e o contrato juntos, o contrato de outro cliente do caso, o só de êxito, o caso com
// levantamento, o já encerrado, o êxito a vencer e o caso encerrado pelo outro lado. A API é
// simulada; aqui se testa a tela, o foco, a acessibilidade e o que ela manda.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const DIEGO = { id: "a0000000-0000-4000-8000-000000000102", nome: "Diego Almeida" };
const FELIPE = { id: "a0000000-0000-4000-8000-000000000103", nome: "Felipe Matos" };
const CT_N = "f1000000-0000-4000-8000-000000000012";
const CT_C = "f1000000-0000-4000-8000-000000000013";
const CASO = "c9000000-0000-4000-8000-000000000001";
const CASO2 = "c9000000-0000-4000-8000-000000000002";
const NOEMI = { id: "c1000000-0000-4000-8000-000000000001", nome: "Noemi Bastos Carvalho" };
const CLAUDIO = { id: "c1000000-0000-4000-8000-000000000002", nome: "Cláudio Carvalho" };
const pc = (n: number) => `b2000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;

const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};

const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + n * 864e5));
const curto = (n: number) => `${dia(n).slice(8, 10)}/${dia(n).slice(5, 7)}`;
const em = (n: number, h: string) => `${dia(n)}T${h}:00-03:00`;

// ---------------------------------------------------------------- o caso A: Carvalho x Construtora Lume
const ctrN = { id: CT_N, numero: "C-2026-012" };
const contratosA = [
  { ...ctrN, cliente: NOEMI, situacao: "ATIVO", encerradoEm: null, encerradoPor: null, comCaso: false, exitoPercentual: 2000,
    parcelas: { total: 6, pagas: 5 }, recebido: 500000, falta: 100000, ultimaRecebidaEm: dia(-39), seguePor: [] },
  { id: CT_C, numero: "C-2026-013", cliente: CLAUDIO, situacao: "ENCERRADO", encerradoEm: em(-6, "09:30"), encerradoPor: FELIPE, comCaso: false, exitoPercentual: null,
    parcelas: { total: 1, pagas: 1 }, recebido: 150000, falta: 0, ultimaRecebidaEm: dia(-169), seguePor: [] },
];
const P6 = { tipo: "PARCELA", nome: "Noemi Bastos Carvalho · Parcela 6 de 6", valor: 100000, vencimento: dia(-8), contratoId: CT_N, parcelaId: pc(6),
  descricao: "Parcela 6 de 6", cliente: NOEMI.nome, clienteId: NOEMI.id, exito: false };
const CUSTAS = { tipo: "REEMBOLSO", nome: "Custas iniciais e diligência do oficial", valor: 41230, contaId: "cp1", categoria: "CUSTAS", cliente: NOEMI.nome, clienteId: NOEMI.id,
  parcela: { id: pc(6), descricao: "Parcela 6 de 6", vencimento: dia(-8), contrato: ctrN } };
const ACERTO = {
  casoId: CASO, entrou: 0, destinadoPago: 0, faltaPagar: 0, prestacoesPendentes: 0, falta: 141230, fechado: null, comLevantamento: false,
  parcelas: { total: 7, pagas: 6, ultima: dia(-39), falta: 100000 }, pendencias: [P6, CUSTAS],
  caso: { id: CASO, nome: "Carvalho x Construtora Lume", resultado: "PERDA", encerradoEm: em(-12, "17:10"), encerradoPor: FELIPE },
  exitos: [], aVencer: null, contratos: contratosA, reembolsos: { adiantado: 41230, reembolsado: 0 }, recebidoNoCaso: 650000, contratosNoRecebido: 2,
  contratosLigados: [{ ...ctrN, objeto: "Vício construtivo", versao: 3, cliente: NOEMI }], podeEncerrarContratos: true,
  motivoContratos: "Caso Carvalho x Construtora Lume encerrado no financeiro.",
  contratosJaEncerrados: [{ id: CT_C, numero: "C-2026-013", cliente: CLAUDIO, encerradoEm: em(-6, "09:30"), encerradoPor: FELIPE }],
  quemContratos: ["Felipe Matos", "Marina Ribeiro"],
};
const ORIGEM = [
  { acao: "contrato.encerrado", em: em(-6, "09:30"), por: FELIPE, dados: { deste: false, contrato: "C-2026-013", cliente_contrato: CLAUDIO.nome, motivo: "Tudo recebido." } },
  { acao: "juridico.etapa", em: em(-12, "17:10"), por: FELIPE, dados: { resultado: "PERDA" } },
];
const PRONTO = {
  ...ACERTO, pendencias: [], falta: 0, recebidoNoCaso: 750000, reembolsos: { adiantado: 41230, reembolsado: 41230 },
  contratos: [{ ...contratosA[0]!, parcelas: { total: 6, pagas: 6 }, recebido: 600000, falta: 0, ultimaRecebidaEm: dia(-1) }, contratosA[1]!],
};

const pago = (n: number, d: number) => ({
  id: pc(n), tipo: "PARCELADO", descricao: `Parcela ${n} de 6`, vencimento: dia(d), valor: 100000, recebido: 100000, falta: 0, forma: "PIX", situacao: "PAGA", pagaEm: dia(d),
  contrato: { id: CT_N, numero: "C-2026-012", objeto: "Vício construtivo" }, cliente: NOEMI, responsavel: DIEGO, cobranca: null, cancelado: null,
  pagamentos: [{ id: `pg${n}`, valor: 100000, multaJuros: null, recebidoEm: dia(d), forma: "PIX", autor: DIEGO, em: em(d, "11:05"), recibo: null }], eventos: [],
});
const SEXTA = { ...pago(6, -8), recebido: 0, falta: 100000, situacao: "VENCIDA", pagaEm: null, pagamentos: [],
  reembolso: { valor: 41230, contas: [{ id: "cp1", descricao: "Custas iniciais e diligência do oficial", valor: 41230 }] } };
const FICHA_N = {
  id: CT_N, numero: "C-2026-012", objeto: "Vício construtivo", situacao: "ATIVO", cliente: NOEMI, responsavel: FELIPE,
  condicoes: [{ tipo: "PARCELADO", total: 600000, parcelas: 6, primeiro: dia(-169) }, { tipo: "EXITO", percentual: 2000 }],
  totais: { contratado: 600000, recebido: 500000, atraso: 100000, aVencer: 0 }, aguardandoBase: 0,
  parcelas: [pago(1, -161), pago(2, -131), pago(3, -100), pago(4, -69), pago(5, -39), SEXTA],
  adiantados: [], fechamentos: [{ casoId: CASO, comLevantamento: false, acerto: ACERTO, origem: ORIGEM }],
};
const FICHA_PRONTA = {
  ...FICHA_N, totais: { contratado: 600000, recebido: 600000, atraso: 0, aVencer: 0 },
  parcelas: [pago(1, -161), pago(2, -131), pago(3, -100), pago(4, -69), pago(5, -39), pago(6, -1)],
  fechamentos: [{ casoId: CASO, comLevantamento: false, acerto: PRONTO, origem: ORIGEM }],
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

const carnes = (id: string) => ({
  [`GET /v1/escritorio/contratos/${id}/carnes`]: { corpo: {
    contrato: { id, numero: "C-2026-012", objeto: "Vício construtivo", situacao: "ATIVO" }, cliente: NOEMI,
    parcelas: [], recebimento: { pixTipo: null, pixChave: null, recebedor: null, cidade: null, instrucoes: null }, dono: true, socioDono: null, carnes: [],
  } },
});
const comuns = (escritorio: unknown = ESCRITORIO) => ({
  "/v1/escritorio": { corpo: escritorio },
  "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA, FELIPE] } },
  ...carnes(CT_N), ...carnes(CT_C),
});
const folha = (page: Page) => page.locator("section.fs-folha").first();

test.describe("Fechamento do caso na ficha do contrato (F3.132: EX-16, EX-17, FI-08)", () => {
  test("estado 5: a folha logo depois do âmbar, com o que falta, os números e De onde veio", async ({ page }) => {
    await simular(page, { ...comuns(), [`GET /v1/escritorio/financeiro/contratos/${CT_N}`]: { corpo: FICHA_N } });
    await page.goto(`${P}/financeiro/a-receber/contratos/${CT_N}`);
    const f = folha(page);
    await expect(f.getByRole("heading", { name: "Fechamento do caso", level: 2 })).toBeVisible();
    await expect(f).toContainText(`Carvalho x Construtora Lume · encerrado com perda em ${curto(-12)}, por Felipe Matos`);
    // Decisão 1: a folha vem antes das parcelas.
    expect(await page.evaluate(() => {
      const a = document.querySelector(".fs-folha")!, b = document.querySelector("#t-parc")!;
      return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    })).toBe(true);
    await expect(f.getByRole("heading", { name: "Resultado e êxito", level: 3 })).toBeVisible();
    await expect(f).toContainText("Sem êxito a cobrar: o caso terminou com perda");
    await expect(f.locator("li.falta").first()).toContainText("Parcela 6/6: falta R$ 1.000,00 (pendente)");
    await expect(f).toContainText("C-2026-013 · Cláudio: tudo recebido");
    await expect(f.getByRole("link", { name: "Abrir o contrato de Cláudio" })).toHaveAttribute("href", `/financeiro/a-receber/contratos/${CT_C}#t-fecha-${CASO}`);
    await expect(f).toContainText("falta o reembolso de R$ 412,30");
    await expect(f).toContainText("Nenhum valor de terceiros entrou neste caso");
    await expect(f).toContainText("No Jurídico, o caso fica Encerrado · acerto pendente até este fechamento.");
    await expect(f.locator(".fs-nums")).toContainText("Recebido no caso · 2 contratos");
    await expect(f.locator(".fs-nums .falta")).toContainText("R$ 1.412,30parcela 6/6 e custas");
    // Decisão 7: o botão nunca fica desabilitado.
    await expect(f.getByRole("button", { name: "Encerrar o caso no financeiro" })).toBeEnabled();
    const orig = page.getByRole("region", { name: "De onde veio" });
    await expect(orig).toContainText("Felipe Matos encerrou o caso com perda");
    await expect(orig).toContainText("Felipe Matos encerrou o contrato C-2026-013, de Cláudio");
    await expect(orig.getByRole("link", { name: "Ver o caso no Jurídico" })).toHaveAttribute("href", `/juridico/casos/${CASO}`);
    await expect(page.getByRole("complementary", { name: "Origem, fechamento, carnê e cobrança" })).toBeVisible();
    await semViolacoes(page);
  });

  test("decisão 12: chegar por \"Ver o acerto\" foca o título da folha do caso", async ({ page }) => {
    await simular(page, { ...comuns(), [`GET /v1/escritorio/financeiro/contratos/${CT_N}`]: { corpo: FICHA_N } });
    await page.goto(`${P}/financeiro/a-receber/contratos/${CT_N}#t-fecha-${CASO}`);
    await expect(page.locator("#t-fecha")).toBeFocused();
  });

  test("estado 6 (decisão 8): com pendência, a janela diz o que falta e o atalho registra a parcela; o foco volta ao botão", async ({ page }) => {
    await simular(page, { ...comuns(), [`GET /v1/escritorio/financeiro/contratos/${CT_N}`]: { corpo: FICHA_N } });
    await page.goto(`${P}/financeiro/a-receber/contratos/${CT_N}`);
    await folha(page).getByRole("button", { name: "Encerrar o caso no financeiro" }).click();
    const j = page.getByRole("alertdialog", { name: "Ainda não dá para encerrar" });
    await expect(j.getByRole("button", { name: "Voltar ao contrato" })).toBeFocused();
    await expect(j).toContainText("Ainda falta receber neste caso.");
    await expect(j).toContainText("O financeiro do caso só encerra com tudo recebido. Faltam R$ 1.412,30.");
    await expect(j.locator("li.falta").first()).toContainText(`Parcela 6/6 · R$ 1.000,00 · venceu ${curto(-8)} (pendente)`);
    await expect(j.locator("li.falta").nth(1)).toContainText("Custas · R$ 412,30 · vai junto com a parcela 6/6");
    await expect(j).toContainText("Se Noemi não vai pagar, ainda não dá para dar baixa na parcela sem receber");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Registrar recebimento da parcela 6/6" }).click();
    const r = page.getByRole("dialog", { name: "Registrar recebimento" });
    await expect(r).toBeVisible();
    await expect(r.getByRole("checkbox", { name: /O reembolso também foi pago/ })).not.toBeChecked();
    await r.getByRole("button", { name: "Fechar" }).click();
    await expect(folha(page).getByRole("button", { name: "Encerrar o caso no financeiro" })).toBeFocused();
  });

  test("estados 7 e 8 (EX-17): tudo recebido, Encerrar sobe ao âmbar e encerra o caso e o contrato juntos", async ({ page }) => {
    const fechado = { ...PRONTO, fechado: { em: em(0, "16:20"), por: MARINA }, contratosEncerrados: [ctrN] };
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/financeiro/contratos/${CT_N}`]: [{ corpo: FICHA_PRONTA }, { corpo: { ...FICHA_PRONTA, situacao: "ENCERRADO", fechamentos: [{ casoId: CASO, comLevantamento: false, acerto: fechado,
        origem: [{ acao: "financeiro.caso_encerrado", em: em(0, "16:20"), por: MARINA, dados: {} }, { acao: "contrato.encerrado_com_caso", em: em(0, "16:20"), por: MARINA, dados: { deste: true, contrato: "C-2026-012" } }, ...ORIGEM] }] } }],
      [`POST /v1/escritorio/financeiro/casos/${CASO}/encerrar`]: { corpo: fechado },
    });
    await page.goto(`${P}/financeiro/a-receber/contratos/${CT_N}`);
    const dir = page.getByRole("region", { name: "Fechamento do caso" }).filter({ has: page.locator("#t-dir") });
    await expect(dir).toContainText("Nada falta");
    await expect(dir).toContainText("Tudo recebido e reembolsado.");
    // O botão aparece uma vez só: no âmbar.
    await expect(folha(page).getByRole("button", { name: "Encerrar o caso no financeiro" })).toHaveCount(0);
    await expect(folha(page).locator(".fs-nums")).toContainText("nadatudo recebido e reembolsado");
    await dir.getByRole("button", { name: "Encerrar o caso no financeiro" }).click();
    const j = page.getByRole("dialog", { name: "Encerrar o caso no financeiro" });
    await expect(j.getByRole("checkbox", { name: /Encerrar também este contrato/ })).toBeChecked();
    await expect(j.getByRole("checkbox", { name: /Encerrar também este contrato/ })).toBeFocused();
    await expect(j).toContainText("Noemi Bastos Carvalho e Cláudio Carvalho · Carvalho x Construtora Lume. Tudo foi recebido.");
    await expect(j.locator(".fl-ja")).toContainText("Recebido no caso");
    await expect(j.locator("li.fs-ja")).toContainText("Já encerrado em");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Encerrar o caso e o contrato" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Caso e contrato encerrados." })).toBeVisible();
    const post = pedidos.find((x) => x.metodo === "POST" && x.caminho.endsWith("/encerrar"))!;
    expect(post.corpo).toEqual({ contratos: [{ id: CT_N, versao: 3 }] });
    // Estado 11: a folha volta para a lateral, o âmbar diz que o caso está encerrado.
    await expect(page.locator("section.fs-folha")).toHaveCount(0);
    const lado = page.getByRole("complementary").locator("[data-caso]");
    await expect(lado).toContainText("Encerrado no financeiro em");
    await expect(lado).toContainText("C-2026-012 encerrado junto");
    await expect(page.getByRole("region", { name: "Contrato encerrado" })).toContainText("Caso encerrado");
    await expect(page.getByRole("link", { name: "Ver a ficha de Noemi" })).toHaveAttribute("href", `/clientes/${NOEMI.id}`);
    await semViolacoes(page);
  });

  test("estado 9 (decisão 10): sem Contratos, a seção dos contratos diz quem encerra, sem a caixa", async ({ page }) => {
    const diego = { ...ESCRITORIO, pessoa: "Diego Almeida", dono: false, areas: ["FINANCEIRO"], funcoes: ["EQUIPE"] };
    const sem = { ...PRONTO, podeEncerrarContratos: false };
    await simular(page, { ...comuns(diego), [`GET /v1/escritorio/financeiro/contratos/${CT_N}`]: { corpo: { ...FICHA_PRONTA, fechamentos: [{ casoId: CASO, comLevantamento: false, acerto: sem, origem: ORIGEM }] } } });
    await page.goto(`${P}/financeiro/a-receber/contratos/${CT_N}`);
    await page.locator("#t-dir").locator("..").getByRole("button", { name: "Encerrar o caso no financeiro" }).click();
    const j = page.getByRole("dialog", { name: "Encerrar o caso no financeiro" });
    await expect(j.getByRole("checkbox")).toHaveCount(0);
    await expect(j.getByRole("group", { name: "Contratos ligados ao caso" })).toContainText("O C-2026-012 fica aberto. Quem encerra é a área Contratos (Felipe e Marina)");
    await expect(j.getByRole("button", { name: "Encerrar o caso" })).toBeFocused();
    // Sem Jurídico, De onde veio não leva ao caso.
    await j.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("link", { name: "Ver o caso no Jurídico" })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("estado 12 (EX-01): o contrato de Cláudio mostra o caso inteiro e leva ao de Noemi", async ({ page }) => {
    const fixo = { ...pago(1, -169), descricao: "Fixo", valor: 150000, recebido: 150000, contrato: { id: CT_C, numero: "C-2026-013", objeto: "Vício construtivo" }, cliente: CLAUDIO };
    const ficha = {
      ...FICHA_N, id: CT_C, numero: "C-2026-013", situacao: "ENCERRADO", cliente: CLAUDIO, condicoes: [{ tipo: "FIXO", valor: 150000 }],
      totais: { contratado: 150000, recebido: 150000, atraso: 0, aVencer: 0 }, parcelas: [fixo],
    };
    await simular(page, { ...comuns(), [`GET /v1/escritorio/financeiro/contratos/${CT_C}`]: { corpo: ficha } });
    await page.goto(`${P}/financeiro/a-receber/contratos/${CT_C}`);
    const dir = page.getByRole("region", { name: "Nada a receber" });
    await expect(dir).toContainText("Tudo recebido");
    await expect(dir).toContainText("O que falta no caso está no contrato de Noemi.");
    await expect(dir.getByRole("button")).toHaveCount(0);
    const f = folha(page);
    await expect(f.getByRole("heading", { name: "Deste contrato · C-2026-013, Cláudio" })).toBeVisible();
    await expect(f.getByRole("link", { name: "Abrir o contrato de Noemi" })).toHaveAttribute("href", `/financeiro/a-receber/contratos/${CT_N}#t-fecha-${CASO}`);
    await f.getByRole("button", { name: "Encerrar o caso no financeiro" }).click();
    const j = page.getByRole("alertdialog", { name: "Ainda não dá para encerrar" });
    await expect(j.getByRole("link", { name: "Abrir o contrato de Noemi" })).toHaveAttribute("href", `/financeiro/a-receber/contratos/${CT_N}#t-fecha-${CASO}`);
    await semViolacoes(page);
  });

  test("estado 13: o contrato só de êxito, no caso perdido, não tem parcela", async ({ page }) => {
    const acerto = { ...ACERTO, pendencias: [], falta: 0, recebidoNoCaso: 0, contratosNoRecebido: 1, reembolsos: { adiantado: 0, reembolsado: 0 },
      contratos: [{ ...contratosA[0]!, parcelas: { total: 0, pagas: 0 }, recebido: 0, falta: 0, ultimaRecebidaEm: null }], contratosJaEncerrados: [] };
    const ficha = { ...FICHA_N, condicoes: [{ tipo: "EXITO", percentual: 3000 }], totais: { contratado: 0, recebido: 0, atraso: 0, aVencer: 0 }, parcelas: [],
      fechamentos: [{ casoId: CASO, comLevantamento: false, acerto, origem: ORIGEM.slice(1) }] };
    await simular(page, { ...comuns(), [`GET /v1/escritorio/financeiro/contratos/${CT_N}`]: { corpo: ficha } });
    await page.goto(`${P}/financeiro/a-receber/contratos/${CT_N}`);
    await expect(page.getByRole("heading", { name: "Nenhuma parcela" })).toBeVisible();
    await expect(page.getByText("O contrato era só de êxito e o caso terminou com perda.")).toBeVisible();
    await expect(folha(page)).toContainText("Nada a receber neste caso. Ele já pode ser encerrado no financeiro.");
    await expect(page.locator("#t-dir").locator("..")).toContainText("Nada a receber");
    await semViolacoes(page);
  });

  test("estado 14: com levantamento, a ficha do contrato só aponta para a do repasse", async ({ page }) => {
    const ficha = { ...FICHA_PRONTA, fechamentos: [{ casoId: CASO, comLevantamento: true, levantamentoId: "lv1", caso: { nome: "Ferreira Prado x INSS", resultado: "GANHO", encerradoEm: em(-10, "15:00") },
      fechado: null, falta: 381840, origem: [] }] };
    await simular(page, { ...comuns(), [`GET /v1/escritorio/financeiro/contratos/${CT_N}`]: { corpo: ficha } });
    await page.goto(`${P}/financeiro/a-receber/contratos/${CT_N}`);
    await expect(page.locator("section.fs-folha")).toHaveCount(0);
    const lado = page.getByRole("complementary").locator(`[data-caso="${CASO}"]`);
    await expect(lado).toContainText("Ferreira Prado x INSS · só para ler");
    await expect(lado).toContainText("O fechamento deste caso fica na ficha do repasse");
    await expect(lado.getByRole("link", { name: "Ver o fechamento" })).toHaveAttribute("href", "/financeiro/repasses/lv1");
    await expect(page.locator("#t-dir").locator("..")).toContainText("o fechamento fica na ficha do repasse");
    await semViolacoes(page);
  });

  test("estado 16 (pergunta 1): o êxito a vencer, sem tom de atraso", async ({ page }) => {
    const exito = { ...P6, nome: "Noemi Bastos Carvalho · Êxito", descricao: "Êxito", valor: 840000, vencimento: dia(27), exito: true };
    const acerto = { ...ACERTO, pendencias: [exito], falta: 840000, aVencer: { vencimento: dia(27), descricao: "Êxito", cliente: NOEMI.nome, exito: true },
      reembolsos: { adiantado: 0, reembolsado: 0 } };
    const ficha = { ...FICHA_PRONTA, fechamentos: [{ casoId: CASO, comLevantamento: false, acerto, origem: ORIGEM }] };
    await simular(page, { ...comuns(), [`GET /v1/escritorio/financeiro/contratos/${CT_N}`]: { corpo: ficha } });
    await page.goto(`${P}/financeiro/a-receber/contratos/${CT_N}`);
    const f = folha(page);
    await expect(f.locator(".fs-pronto")).toContainText(`Pronto para encerrar depois do êxito de Noemi, em ${curto(27)}.`);
    await expect(f.locator("li.fs-espera")).toContainText("(a vencer)");
    await expect(f.locator(".fs-nums .fs-aguarda")).toContainText("nada em atraso");
    await f.getByRole("button", { name: "Encerrar o caso no financeiro" }).click();
    const j = page.getByRole("alertdialog", { name: "Ainda não dá para encerrar" });
    await expect(j).toContainText("Ainda falta receber neste caso, a vencer.");
    await expect(j).toContainText(`O êxito ainda não venceu: o caso fica pronto para encerrar depois de ${curto(27)}.`);
    await semViolacoes(page);
  });

  test("decisão 12: o caso encerrado pelo outro lado é anunciado, com quem e a hora", async ({ page }) => {
    const fechado = { ...PRONTO, fechado: { em: `${dia(0)}T10:05:00-03:00`, por: DIEGO } };
    await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/financeiro/contratos/${CT_N}`]: [{ corpo: FICHA_PRONTA }, { corpo: { ...FICHA_PRONTA, fechamentos: [{ casoId: CASO, comLevantamento: false, acerto: fechado, origem: ORIGEM }] } }],
      [`POST /v1/escritorio/financeiro/casos/${CASO}/encerrar`]: { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { motivo: "CASO_JA_ENCERRADO" } } } },
    });
    await page.goto(`${P}/financeiro/a-receber/contratos/${CT_N}`);
    await page.locator("#t-dir").locator("..").getByRole("button", { name: "Encerrar o caso no financeiro" }).click();
    await page.getByRole("dialog", { name: "Encerrar o caso no financeiro" }).getByRole("button", { name: "Encerrar o caso e o contrato" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: "Este caso já foi encerrado no financeiro por Diego Almeida, às 10h05." })).toBeVisible();
    await semViolacoes(page);
  });

  test("a confirmar (b): dois casos no mesmo contrato, uma folha por caso, sem id repetido", async ({ page }) => {
    const outro = { ...ACERTO, casoId: CASO2, caso: { ...ACERTO.caso, id: CASO2, nome: "Carvalho x Vizinho" } };
    const ficha = { ...FICHA_N, fechamentos: [{ casoId: CASO, comLevantamento: false, acerto: ACERTO, origem: ORIGEM }, { casoId: CASO2, comLevantamento: false, acerto: outro, origem: ORIGEM }] };
    await simular(page, { ...comuns(), [`GET /v1/escritorio/financeiro/contratos/${CT_N}`]: { corpo: ficha } });
    await page.goto(`${P}/financeiro/a-receber/contratos/${CT_N}#t-fecha-${CASO2}`);
    await expect(page.locator("section.fs-folha")).toHaveCount(2);
    await expect(page.locator(`#t-fecha-${CASO2}`)).toBeFocused();
    await expect(page.locator(`#t-orig-${CASO2}`)).toHaveCount(1);
    expect(await page.evaluate(() => { const ids = [...document.querySelectorAll("[id]")].map((e) => e.id); return ids.length === new Set(ids).size; })).toBe(true);
    await semViolacoes(page);
  });

  test("sem a 0901 no banco, a ficha sai como antes, sem a folha", async ({ page }) => {
    const { fechamentos: _, ...antiga } = FICHA_N;
    await simular(page, { ...comuns(), [`GET /v1/escritorio/financeiro/contratos/${CT_N}`]: { corpo: antiga } });
    await page.goto(`${P}/financeiro/a-receber/contratos/${CT_N}`);
    await expect(page.getByRole("heading", { name: "Parcelas", level: 2 })).toBeVisible();
    await expect(page.locator("section.fs-folha")).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: "Carnê e cobrança" })).toBeVisible();
  });
});
