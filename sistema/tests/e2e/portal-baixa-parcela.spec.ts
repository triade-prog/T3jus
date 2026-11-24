// "Dar baixa sem receber" na parcela vencida (F3.139: FI-24, FI-25, FI-08, EX-16), telas aprovadas
// em docs/design/aprovadas/portal-baixa-parcela-motivo: o botão na coluna "Recibo e ações", a
// janela com o motivo, a explicação e as custas, os erros, o envio sem segundo clique, o conflito,
// a linha baixada com "Desfazer a baixa sem receber" e o que Contratos vê sem o Financeiro.
// A API é simulada; aqui se testa a tela, o foco, a acessibilidade e o que ela manda.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const DIEGO = { id: "a0000000-0000-4000-8000-000000000102", nome: "Diego Almeida" };
const FELIPE = { id: "a0000000-0000-4000-8000-000000000103", nome: "Felipe Matos" };
const CT = "f1000000-0000-4000-8000-000000000012";
const CASO = "c9000000-0000-4000-8000-000000000001";
const NOEMI = { id: "c1000000-0000-4000-8000-000000000001", nome: "Noemi Bastos Carvalho" };
const pc = (n: number) => `b2000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;

const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};
const FELIPE_ESC = { ...ESCRITORIO, pessoa: "Felipe Matos", dono: false, areas: ["COMERCIAL", "CONTRATOS", "JURIDICO"], funcoes: ["EQUIPE"] };

const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + n * 864e5));
const em = (n: number, h: string) => `${dia(n)}T${h}:00-03:00`;

const pago = (n: number, d: number) => ({
  id: pc(n), tipo: "PARCELADO", descricao: `Parcela ${n} de 6`, vencimento: dia(d), valor: 100000, recebido: 100000, falta: 0, forma: "PIX", situacao: "PAGA", pagaEm: dia(d),
  contrato: { id: CT, numero: "C-2026-012", objeto: "Vício construtivo" }, cliente: NOEMI, responsavel: FELIPE, cobranca: null, cancelado: null,
  pagamentos: [{ id: `pg${n}`, valor: 100000, multaJuros: null, recebidoEm: dia(d), forma: "PIX", autor: DIEGO, em: em(d, "11:05"), recibo: null }], eventos: [],
});
const SEXTA = {
  ...pago(6, -8), recebido: 0, falta: 100000, situacao: "VENCIDA", pagaEm: null, pagamentos: [],
  cobranca: { tipo: "ANOTACAO", texto: "Noemi disse que não vai pagar porque perdeu a ação.", motivo: null, motivoDesde: null, proxData: dia(0), proxOque: "Falar com Marina",
    proxResponsavel: DIEGO, autor: DIEGO, em: em(-5, "15:40") },
};
const BAIXA = {
  id: "bx1", motivo: "INADIMPLENCIA", explicacao: "Noemi recusou pagar depois da perda; não vamos cobrar na Justiça.", valor: 100000, recebidoAntes: 0,
  por: MARINA, em: em(0, "10:14"), reembolsos: [{ contaId: "cp1", descricao: "Custas iniciais e diligência do oficial", valor: 41230, categoria: "CUSTAS" }], desfeita: null,
};
const BAIXADA = { ...SEXTA, situacao: "BAIXADA", falta: 0, cobranca: null, cancelado: { em: em(0, "10:14"), motivo: "Baixa sem receber" }, baixa: BAIXA };
const FICHA = {
  id: CT, numero: "C-2026-012", objeto: "Vício construtivo", situacao: "ATIVO", cliente: NOEMI, responsavel: FELIPE,
  condicoes: [{ tipo: "PARCELADO", total: 600000, parcelas: 6, primeiro: dia(-169) }],
  totais: { contratado: 600000, recebido: 500000, atraso: 100000, aVencer: 0, baixado: 0, renegociado: 0 }, aguardandoBase: 0,
  parcelas: [pago(1, -161), pago(2, -131), pago(3, -100), pago(4, -69), pago(5, -39), SEXTA], adiantados: [], fechamentos: [],
};
const FICHA_BAIXADA = {
  ...FICHA, totais: { contratado: 600000, recebido: 500000, atraso: 0, aVencer: 0, baixado: 100000, renegociado: 0 },
  parcelas: [...FICHA.parcelas.slice(0, 5), BAIXADA],
};
const CASO_DA_BAIXA = { id: CASO, nome: "Carvalho x Construtora Lume", pronto: false, espera: true, fechado: null };
const PREVIA = {
  parcela: SEXTA, recebido: 0, falta: 100000, diasAtraso: 8, contrato: { id: CT, numero: "C-2026-012", situacao: "ATIVO" }, recibos: [],
  custas: [{ contaId: "cp1", descricao: "Custas iniciais e diligência do oficial", categoria: "CUSTAS", valor: 41230, depois: null }], custasVoltam: [],
  casos: [CASO_DA_BAIXA], podeRenegociar: true, temContratos: true, quemContratos: [FELIPE, MARINA], proximaAcaoCom: MARINA, condicoesMudaramEm: null,
};
const PREVIA_BAIXADA = { ...PREVIA, parcela: BAIXADA, custas: [], custasVoltam: PREVIA.custas.map(({ depois: _d, ...c }) => c), casos: [{ ...CASO_DA_BAIXA, pronto: true, espera: false }] };

type Resp = { status?: number; corpo: unknown; espera?: number };
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
    if (x.espera) await new Promise((ok) => setTimeout(ok, x.espera));
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return pedidos;
}

const carnes = { [`GET /v1/escritorio/contratos/${CT}/carnes`]: { corpo: {
  contrato: { id: CT, numero: "C-2026-012", objeto: "Vício construtivo", situacao: "ATIVO" }, cliente: NOEMI,
  parcelas: [], recebimento: { pixTipo: null, pixChave: null, recebedor: null, cidade: null, instrucoes: null }, dono: true, socioDono: null, carnes: [],
} } };
const comuns = (escritorio: unknown = ESCRITORIO) => ({
  "/v1/escritorio": { corpo: escritorio },
  "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA, FELIPE] } },
  ...carnes,
});
const linha6 = (page: Page) => page.locator("table.fi-tab tbody tr").filter({ hasText: "Parcela 6 de 6" });
const BASE = `/v1/escritorio/financeiro/parcelas/${pc(6)}/baixa`;

test.describe("Dar baixa sem receber (F3.139: FI-24, FI-25)", () => {
  test("decisões 1 a 15: erros no topo, motivo, explicação e custas; o aviso diz \"sem receber\" e o foco vai ao desfazer", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/financeiro/contratos/${CT}`]: [{ corpo: FICHA }, { corpo: FICHA_BAIXADA }],
      [`GET ${BASE}`]: { corpo: PREVIA },
      [`POST ${BASE}`]: { status: 201, espera: 400, corpo: { ...BAIXADA, casos: [{ ...CASO_DA_BAIXA, pronto: true, espera: false }], reembolsosBaixados: 1 } },
    });
    await page.goto(`${P}/financeiro/a-receber/contratos/${CT}`);
    await expect(page.getByRole("columnheader", { name: "Recibo e ações" })).toBeVisible();
    // Decisão 1: só a vencida tem o botão; a paga, não.
    await expect(page.getByRole("button", { name: /^Dar baixa sem receber/ })).toHaveCount(1);
    await linha6(page).getByRole("button", { name: /Dar baixa sem receber ?: parcela 6\/6/ }).click();
    const j = page.getByRole("dialog", { name: "Dar baixa sem receber" });
    await expect(j).toContainText("Falta receber");
    await expect(j).toContainText("R$ 1.000,00");
    await expect(j).toContainText("há 8 dias");
    await expect(j).toContainText("Noemi disse que não vai pagar porque perdeu a ação.");
    await expect(j).toContainText("O caso Carvalho x Construtora Lume deixa de esperar por ela.");
    await expect(j).toContainText("As custas de R$ 412,30 ficam a reembolsar, em A pagar: não há outra parcela de Noemi para elas irem junto.");
    const custas = j.getByRole("checkbox", { name: /Dar baixa sem receber também no reembolso das custas \(R\$ 412,30\)/ });
    await expect(custas).not.toBeChecked();
    await semViolacoes(page);
    // Decisão 13: sem motivo e sem explicação, o resumo no topo e nada vai ao servidor.
    const enviar = j.getByRole("button", { name: "Dar baixa sem receber na parcela 6/6" });
    await enviar.click();
    await expect(j).toContainText("Faltam 2 coisas para dar baixa sem receber.");
    expect(pedidos.filter((p) => p.metodo === "POST" && p.caminho === BASE)).toHaveLength(0);
    await j.getByRole("radio", { name: /Inadimplência/ }).check();
    await expect(j.getByLabel("O que aconteceu")).toBeVisible();
    await j.getByLabel("O que aconteceu").fill("Noemi recusou pagar depois da perda; não vamos cobrar na Justiça.");
    await custas.check();
    // Nota 13: o segundo clique, enquanto envia, não manda de novo.
    await enviar.click();
    await expect(j.getByRole("button", { name: "Dando baixa sem receber…" })).toHaveAttribute("aria-busy", "true");
    await j.getByRole("button", { name: "Dando baixa sem receber…" }).click({ force: true });
    await expect(page.getByRole("status").filter({ hasText: "A parcela 6/6 de Noemi saiu de Em atraso sem receber." })).toBeVisible();
    const posts = pedidos.filter((p) => p.metodo === "POST" && p.caminho === BASE);
    expect(posts).toHaveLength(1);
    expect(posts[0]!.corpo).toEqual({ motivo: "INADIMPLENCIA", explicacao: "Noemi recusou pagar depois da perda; não vamos cobrar na Justiça.", falta: 100000, reembolso: true });
    await expect(page.getByRole("status").filter({ hasText: "O caso Carvalho x Construtora Lume já pode ser encerrado no financeiro." })).toBeVisible();
    // Decisões 15 e 25: a linha fica, com o selo neutro, o motivo e quem; o foco no desfazer.
    await expect(linha6(page)).toContainText("Baixa sem receber");
    await expect(linha6(page)).toContainText("Inadimplência · por Marina Ribeiro em");
    await expect(linha6(page).getByRole("button", { name: /Desfazer a baixa sem receber/ })).toBeFocused();
    await expect(page.locator(".fi-quatro")).toContainText("Baixado sem receber");
    await semViolacoes(page);
  });

  test("decisão 14: outra pessoa registrou um recebimento com a janela aberta; nada foi baixado", async ({ page }) => {
    await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/financeiro/contratos/${CT}`]: { corpo: FICHA },
      [`GET ${BASE}`]: { corpo: PREVIA },
      [`POST ${BASE}`]: { status: 409, corpo: { erro: { codigo: "VERSION_CONFLICT", detalhes: {
        motivo: "PARCELA_MUDOU", por: DIEGO, em: em(0, "10:13"), valor: 50000, faltaAntes: 100000, falta: 50000 } } } },
    });
    await page.goto(`${P}/financeiro/a-receber/contratos/${CT}`);
    await linha6(page).getByRole("button", { name: /Dar baixa sem receber/ }).click();
    const j = page.getByRole("dialog", { name: "Dar baixa sem receber" });
    await j.getByRole("radio", { name: /Perdoada/ }).check();
    await j.getByLabel("Por que e quem decidiu").fill("A sócia decidiu não cobrar.");
    await j.getByRole("button", { name: "Dar baixa sem receber na parcela 6/6" }).click();
    await expect(j).toContainText("Diego Almeida registrou R$ 500,00 nesta parcela às 10h13.");
    await expect(j).toContainText("A baixa sem receber não foi feita. Veja como ficou antes de decidir. O que você escreveu não foi salvo.");
    await expect(j).toContainText("Faltam R$ 500,00, ainda em atraso");
    await expect(j.getByRole("button", { name: "Ver como ficou" })).toBeFocused();
    await semViolacoes(page);
  });

  test("decisões 16 a 19: desfazer pede o porquê, avisa das custas e põe a próxima ação", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/financeiro/contratos/${CT}`]: [{ corpo: FICHA_BAIXADA }, { corpo: FICHA }],
      [`GET ${BASE}`]: { corpo: PREVIA_BAIXADA },
      [`POST ${BASE}/desfazer`]: { corpo: { ...SEXTA, casos: [CASO_DA_BAIXA], proximaAcao: { com: MARINA, data: dia(1), cliente: NOEMI.nome } } },
    });
    await page.goto(`${P}/financeiro/a-receber/contratos/${CT}`);
    await linha6(page).getByRole("button", { name: /Desfazer a baixa sem receber/ }).click();
    const j = page.getByRole("dialog", { name: "Desfazer a baixa sem receber" });
    await expect(j).toContainText("A parcela 6/6 volta para Em atraso, com R$ 1.000,00 a receber. Você fica com a próxima ação: falar com Noemi amanhã.");
    await expect(j).toContainText("As custas de R$ 412,30 voltam a ir junto com esta parcela.");
    await expect(j).toContainText("Felipe Matos cuida do contrato, mas não tem a área Financeiro.");
    await j.getByRole("button", { name: "Desfazer a baixa sem receber" }).click();
    await expect(j).toContainText("Escreva por que desfazer, com pelo menos 3 letras.");
    await j.getByLabel("Por que desfazer").fill("Noemi ligou e prometeu pagar em dezembro");
    await j.getByRole("button", { name: "Desfazer a baixa sem receber" }).click();
    await expect(page.getByRole("status").filter({ hasText: "A parcela 6/6 voltou para Em atraso." })).toContainText("A próxima ação é falar com Noemi amanhã, com você.");
    expect(pedidos.find((p) => p.metodo === "POST" && p.caminho.endsWith("/desfazer"))!.corpo).toEqual({ explicacao: "Noemi ligou e prometeu pagar em dezembro" });
    await expect(linha6(page).getByRole("button", { name: /Dar baixa sem receber/ })).toBeFocused();
    await semViolacoes(page);
  });

  test("pergunta 2: em Contratos, sem o Financeiro, só \"Fora da cobrança, por decisão do Financeiro.\"", async ({ page }) => {
    const rec = (n: number, extra = {}) => ({ id: pc(n), tipo: "PARCELADO", descricao: `Parcela ${n} de 6`, vencimento: dia(-200 + n * 30), valor: 100000, origem: "PROGRAMADO",
      criadoEm: em(-200, "10:00"), cancelado: null, base: null, ...extra });
    await simular(page, {
      ...comuns(FELIPE_ESC),
      [`GET /v1/escritorio/contratos/${CT}`]: { corpo: {
        id: CT, numero: "C-2026-012", objeto: "Vício construtivo", situacao: "ATIVO", cliente: { ...NOEMI, tipo: "PF" }, responsavel: FELIPE,
        condicoes: [{ tipo: "PARCELADO", total: 600000, parcelas: 6, primeiro: dia(-170) }], proximo: null, basePendente: null, criadoEm: em(-200, "10:00"),
        observacoes: null, versao: 3, assinadoEm: dia(-200), assinaturaPor: MARINA, encerradoEm: null, motivoEncerramento: null, proposta: null, advogados: [MARINA],
        financeiro: false, historico: [], mudancasPagoAntes: [], importacao: null,
        recebimentos: [rec(1), rec(2), rec(3), rec(4), rec(5), { ...rec(6), cancelado: undefined, foraDaCobranca: true }],
      } },
    });
    await page.goto(`${P}/contratos/contratos/${CT}?aba=recebimentos`);
    await expect(page.getByText("Fora da cobrança, por decisão do Financeiro.")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Inadimplência");
    await expect(page.locator("body")).not.toContainText("Cancelado: Baixa sem receber");
    await semViolacoes(page);
  });
});
