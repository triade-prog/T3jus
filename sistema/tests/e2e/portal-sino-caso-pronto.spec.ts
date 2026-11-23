// O aviso no sino quando o caso sem levantamento fica pronto para encerrar no financeiro (F3.147;
// EX-16, EX-17, PT-02), telas aprovadas em docs/design/aprovadas/portal-sino-caso-encerrado: o
// aviso novo, o clique que marca lido e abre a folha do caso na ficha do contrato, o "Agora:" depois
// que Marina encerra, o nome acessível nos quatro estados e os estados sp-denovo, sp-varios e
// sp-outro-caso. Quem recebe é regra do servidor e fica no pgTAP 135. A API é simulada e o relógio
// da página fica em quarta-feira, 18/11/2026, às 16h, o "hoje" do desenho.
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
const NOEMI = { id: "c1000000-0000-4000-8000-000000000001", nome: "Noemi Bastos Carvalho" };
const CLAUDIO = { id: "c1000000-0000-4000-8000-000000000002", nome: "Cláudio Carvalho" };
const pc = (n: number) => `b2000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;

const AGORA = new Date("2026-11-18T16:00:00-03:00");
const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};

const dia = (n: number) => new Date(AGORA.getTime() + n * 864e5 - 3 * 36e5).toISOString().slice(0, 10);
const em = (n: number, h: string) => `${dia(n)}T${h}:00-03:00`;

// ---------------------------------------------------------- a folha de destino (a do fechamento aprovado)
const ctrN = { id: CT_N, numero: "C-2026-012" };
const contratos = [
  { ...ctrN, cliente: NOEMI, situacao: "ATIVO", encerradoEm: null, encerradoPor: null, comCaso: false, exitoPercentual: 2000,
    parcelas: { total: 6, pagas: 6 }, recebido: 600000, falta: 0, ultimaRecebidaEm: dia(-1), seguePor: [] },
  { id: CT_C, numero: "C-2026-013", cliente: CLAUDIO, situacao: "ENCERRADO", encerradoEm: em(-6, "09:30"), encerradoPor: FELIPE, comCaso: false, exitoPercentual: null,
    parcelas: { total: 1, pagas: 1 }, recebido: 150000, falta: 0, ultimaRecebidaEm: dia(-169), seguePor: [] },
];
const PRONTO = {
  casoId: CASO, entrou: 0, destinadoPago: 0, faltaPagar: 0, prestacoesPendentes: 0, falta: 0, fechado: null, comLevantamento: false,
  parcelas: { total: 7, pagas: 7, ultima: dia(-1), falta: 0 }, pendencias: [],
  caso: { id: CASO, nome: "Carvalho x Construtora Lume", resultado: "PERDA", encerradoEm: em(-12, "17:10"), encerradoPor: FELIPE },
  exitos: [], aVencer: null, contratos, reembolsos: { adiantado: 41230, reembolsado: 41230 }, recebidoNoCaso: 750000, contratosNoRecebido: 2,
  contratosLigados: [{ ...ctrN, objeto: "Vício construtivo", versao: 3, cliente: NOEMI }], podeEncerrarContratos: true,
  motivoContratos: "Caso Carvalho x Construtora Lume encerrado no financeiro.",
  contratosJaEncerrados: [{ id: CT_C, numero: "C-2026-013", cliente: CLAUDIO, encerradoEm: em(-6, "09:30"), encerradoPor: FELIPE }],
  quemContratos: ["Felipe Matos", "Marina Ribeiro"],
};
const ORIGEM = [
  { acao: "contrato.encerrado", em: em(-6, "09:30"), por: FELIPE, dados: { deste: false, contrato: "C-2026-013", cliente_contrato: CLAUDIO.nome, motivo: "Tudo recebido." } },
  { acao: "juridico.etapa", em: em(-12, "17:10"), por: FELIPE, dados: { resultado: "PERDA" } },
];
const pago = (n: number, d: number) => ({
  id: pc(n), tipo: "PARCELADO", descricao: `Parcela ${n} de 6`, vencimento: dia(d), valor: 100000, recebido: 100000, falta: 0, forma: "PIX", situacao: "PAGA", pagaEm: dia(d),
  contrato: { id: CT_N, numero: "C-2026-012", objeto: "Vício construtivo" }, cliente: NOEMI, responsavel: DIEGO, cobranca: null, cancelado: null,
  pagamentos: [{ id: `pg${n}`, valor: 100000, multaJuros: null, recebidoEm: dia(d), forma: "PIX", autor: DIEGO, em: em(d, "11:05"), recibo: null }], eventos: [],
});
const FICHA = {
  id: CT_N, numero: "C-2026-012", objeto: "Vício construtivo", situacao: "ATIVO", cliente: NOEMI, responsavel: FELIPE,
  condicoes: [{ tipo: "PARCELADO", total: 600000, parcelas: 6, primeiro: dia(-169) }, { tipo: "EXITO", percentual: 2000 }],
  totais: { contratado: 600000, recebido: 600000, atraso: 0, aVencer: 0 }, aguardandoBase: 0,
  parcelas: [pago(1, -161), pago(2, -131), pago(3, -100), pago(4, -69), pago(5, -39), pago(6, -1)],
  adiantados: [], fechamentos: [{ casoId: CASO, comLevantamento: false, acerto: PRONTO, origem: ORIGEM }],
};
const FECHADO = { ...PRONTO, fechado: { em: em(0, "10:05"), por: MARINA }, contratosEncerrados: [ctrN] };
const FICHA_ENCERRADA = {
  ...FICHA, situacao: "ENCERRADO", fechamentos: [{ casoId: CASO, comLevantamento: false, acerto: FECHADO,
    origem: [{ acao: "financeiro.caso_encerrado", em: em(0, "10:05"), por: MARINA, dados: {} }, ...ORIGEM] }],
};

// ---------------------------------------------------------------- os avisos
const av = (n: number, caso: string, dados: Record<string, unknown>, quando: string, extra: Record<string, unknown> = {}) => ({
  id: `a3000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`, tipo: "CASO_PRONTO_FECHAR", origem: "casos", origemId: caso, em: quando, lido: false,
  dados: { caso: "Carvalho x Construtora Lume", contrato: "C-2026-012", contratoId: CT_N, clientes: [NOEMI.nome, CLAUDIO.nome], ...dados }, ...extra,
});
const NOVO = av(1, CASO, { motivo: "PAGAMENTO", quem: "Diego Almeida", parcelas: 7 }, em(-1, "11:05"));
const TITULO = "O caso Carvalho x Construtora Lume ficou pronto para encerrar no financeiro";
// O trecho para o leitor de tela fica num span .sr à parte; o Chromium põe um espaço antes do ponto.
const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const nome = (titulo: string, agora: string) => new RegExp(`^${esc(titulo)} ?\\. Agora: ${esc(agora)}$`);
const lista = (...itens: unknown[]) => ({ novos: itens.filter((i) => !(i as { lido: boolean }).lido).length, total: itens.length, itens });

type Resp = { status?: number; corpo: unknown };
type Rota = Resp | Resp[] | (() => Resp);
type Pedido = { metodo: string; caminho: string; corpo: unknown };

// O simular do sino (respostas em sequência), que também aceita uma função: a resposta muda com o
// que a tela já mandou (o sino depois que Marina encerra).
async function simular(page: Page, rotas: Record<string, Rota>) {
  const pedidos: Pedido[] = [];
  await page.route("**/api/v1/**", async (rota) => {
    const url = new URL(rota.request().url());
    const caminho = url.pathname.replace(/^\/api/, "");
    const metodo = rota.request().method();
    pedidos.push({ metodo, caminho, corpo: rota.request().postDataJSON() });
    const r = rotas[`${metodo} ${caminho}`] ?? rotas[caminho];
    let x: Resp;
    if (typeof r === "function") x = r();
    else {
      const l = Array.isArray(r) ? r : r ? [r] : [{ status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } }];
      const vez = pedidos.filter((p) => p.caminho === caminho && p.metodo === metodo).length - 1;
      x = l[Math.min(vez, l.length - 1)]!;
    }
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
const comuns = (avisos: Rota) => ({
  "/v1/escritorio": { corpo: ESCRITORIO },
  "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA, FELIPE] } },
  "GET /v1/escritorio/clientes": { corpo: { comercial: true, clientes: [] } },
  "GET /v1/escritorio/avisos": avisos,
  ...carnes(CT_N), ...carnes(CT_C),
});
const botaoSino = (page: Page) => page.getByRole("button", { name: /^Avisos,/ }).filter({ visible: true });
async function abrirSino(page: Page) {
  await botaoSino(page).click();
  return page.getByRole("dialog", { name: "Avisos" });
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA);
});

test.describe("Aviso de caso pronto para encerrar no financeiro (F3.147: EX-16, EX-17, PT-02)", () => {
  test("sp-novo, o clique e sp-encerrado: o aviso leva à folha do caso; depois que Marina encerra, o Agora conta", async ({ page }) => {
    let encerrou = false;
    const pedidos = await simular(page, {
      ...comuns(() => ({ corpo: encerrou
        ? lista({ ...NOVO, lido: true, agora: { encerrado: { em: em(0, "10:05"), por: MARINA } } })
        : lista(NOVO) })),
      [`POST /v1/escritorio/avisos/${NOVO.id}/lido`]: { corpo: lista({ ...NOVO, lido: true }) },
      [`GET /v1/escritorio/financeiro/contratos/${CT_N}`]: () => ({ corpo: encerrou ? FICHA_ENCERRADA : FICHA }),
      [`POST /v1/escritorio/financeiro/casos/${CASO}/encerrar`]: () => { encerrou = true; return { corpo: FECHADO }; },
    });
    await page.goto(`${P}/clientes`);
    await expect(botaoSino(page)).toHaveAccessibleName("Avisos, 1 novo");
    const d = await abrirSino(page);
    await expect(d.getByRole("heading", { name: /^Ontem/ })).toBeVisible();
    const item = d.getByRole("listitem").filter({ hasText: "Carvalho x Construtora Lume" });
    await expect(item.locator(".si-tit")).toHaveText(`Novo: ${TITULO}`);
    await expect(item).toContainText("Diego Almeida registrou a última parcela. As 7 parcelas de Noemi Bastos Carvalho e Cláudio Carvalho foram pagas. Confira o acerto e encerre.");
    await expect(item.locator(".si-nv")).toHaveText("Novo");
    await expect(item.locator(".selo")).toHaveText("Pronto");
    await expect(item.locator(".si-onde")).toHaveText("Ver o acerto no C-2026-012");
    await expect(item).not.toContainText("Agora:");
    // PT-02: nenhum valor em reais no aviso.
    await expect(item).not.toContainText("R$");
    const link = d.getByRole("link", { name: `Novo: ${TITULO}` });
    await expect(link).toHaveAttribute("href", `/financeiro/a-receber/contratos/${CT_N}#t-fecha-${CASO}`);
    await semViolacoes(page);

    // O clique marca lido e abre a folha do caso, com o título focado (decisão 12 do fechamento).
    await link.click();
    await page.waitForURL(`**/financeiro/a-receber/contratos/${CT_N}#t-fecha-${CASO}`);
    expect(pedidos.some((p) => p.metodo === "POST" && p.caminho === `/v1/escritorio/avisos/${NOVO.id}/lido`)).toBe(true);
    await expect(page.locator("#t-fecha")).toBeFocused();

    // Marina encerra o caso e o contrato juntos.
    const dir = page.getByRole("region", { name: "Fechamento do caso" }).filter({ has: page.locator("#t-dir") });
    await dir.getByRole("button", { name: "Encerrar o caso no financeiro" }).click();
    await page.getByRole("dialog", { name: "Encerrar o caso no financeiro" }).getByRole("button", { name: "Encerrar o caso e o contrato" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Caso e contrato encerrados." })).toBeVisible();

    // A segunda leitura do sino traz agora.encerrado: o aviso não muda, o Agora conta.
    const d2 = await abrirSino(page);
    const item2 = d2.getByRole("listitem").filter({ hasText: "Carvalho x Construtora Lume" });
    await expect(item2.locator(".si-det").nth(1)).toHaveText("Agora: Marina Ribeiro encerrou no financeiro hoje, às 10h05.");
    await expect(item2).toContainText("Diego Almeida registrou a última parcela. As 7 parcelas de Noemi Bastos Carvalho e Cláudio Carvalho foram pagas.");
    await expect(item2).not.toContainText("Confira o acerto e encerre.");
    await expect(item2.locator(".selo")).toHaveText("Encerrado");
    await expect(item2.locator(".si-onde")).toHaveText("Ver o fechamento no C-2026-012");
    await expect(d2.getByRole("link", { name: nome(TITULO, "encerrado.") })).toBeVisible();
    await semViolacoes(page);
  });

  test("o nome acessível do link nos quatro estados de agora", async ({ page }) => {
    const CASO_F = "c9000000-0000-4000-8000-000000000004";
    const itens = [
      av(1, CASO, { motivo: "PAGAMENTO", quem: "Diego Almeida", parcelas: 7 }, em(0, "11:05"), { agora: { encerrado: { em: em(0, "10:05"), por: MARINA } } }),
      av(2, CASO, { motivo: "PAGAMENTO", quem: "Diego Almeida", parcelas: 7 }, em(0, "09:00"), { lido: true, agora: { pendente: true } }),
      av(3, CASO, { motivo: "ROTINA" }, em(-2, "07:00"), { lido: true, agora: { depois: true } }),
      av(4, CASO_F, { motivo: "ROTINA", caso: "Rocha x INSS · aposentadoria rural", contrato: "C-2026-004", contratoId: CT_C, clientes: ["Antônio Rocha"] },
        em(-6, "07:00"), { lido: true, agora: { fora: true } }),
    ];
    await simular(page, comuns({ corpo: lista(...itens) }));
    await page.goto(`${P}/clientes`);
    const d = await abrirSino(page);
    await expect(d.getByRole("link", { name: nome(`Novo: ${TITULO}`, "encerrado.") })).toBeVisible();
    await expect(d.getByRole("link", { name: nome(TITULO, "voltou a ter pendência.") })).toBeVisible();
    await expect(d.getByRole("link", { name: nome(TITULO, "aviso antigo, há um mais novo.") })).toBeVisible();
    await expect(d.getByRole("link", { name: nome("O caso Rocha x INSS · aposentadoria rural ficou pronto para encerrar no financeiro", "fecha no repasse.") }))
      .toHaveAttribute("href", `/financeiro/a-receber/contratos/${CT_C}#t-fecha-${CASO_F}`);
    const pend = d.getByRole("listitem").filter({ has: page.getByText("Voltou a ter pendência", { exact: true }) });
    await expect(pend).toContainText("Agora: depois deste aviso, o acerto voltou a ter pendência.");
    await expect(pend.locator(".si-onde")).toHaveText("Ver o acerto no C-2026-012");
    const fora = d.getByRole("listitem").filter({ hasText: "Rocha x INSS" });
    await expect(fora).toContainText("Agora: entrou RPV ou alvará neste caso, e o fechamento passou para a ficha do repasse.");
    await expect(fora.locator(".selo")).toHaveText("Fecha no repasse");
    await expect(fora.locator(".si-onde")).toHaveText("Ver o fechamento no C-2026-004");
    await semViolacoes(page);
  });

  test("sp-denovo, sp-varios e sp-outro-caso", async ({ page }) => {
    const LIMA = "c9000000-0000-4000-8000-000000000009";
    const CT_L = "f1000000-0000-4000-8000-000000000009";
    const lima = { caso: "Lima x Condomínio Solar", contrato: "C-2026-009", contratoId: CT_L, clientes: ["Regina Souza"] };
    const itens = [
      av(1, LIMA, { ...lima, motivo: "REEMBOLSO", quem: "Bianca Torres", denovo: true, reembolso: "Cópia do processo" }, em(0, "14:30")),
      av(2, "c9000000-0000-4000-8000-000000000021", { motivo: "PAGAMENTO", quem: "Marina Ribeiro", parcelas: 9, caso: "Nogueira x Banco Faro",
        contrato: "C-2026-021", contratoId: "f1000000-0000-4000-8000-000000000021", clientes: ["Lúcia Nogueira", "Paulo Nogueira"], maisClientes: 1 }, em(0, "13:10")),
      av(3, "c9000000-0000-4000-8000-000000000022", { motivo: "PAGAMENTO", quem: "Bianca Torres", parcelas: 10, caso: "Freitas x Seguradora Norte",
        contrato: "C-2026-022", contratoId: "f1000000-0000-4000-8000-000000000022", clientes: ["Helena Freitas"] }, em(0, "12:00")),
      av(4, "c9000000-0000-4000-8000-000000000007", { motivo: "OUTRO_CASO", quem: "Felipe Matos", caso: "Martins x Banco Cedro", contrato: "C-2026-007",
        contratoId: "f1000000-0000-4000-8000-000000000007", clientes: ["Ivone Martins"], contratoSegue: "C-2026-007", outroCaso: "Martins x INSS · aposentadoria" },
        em(0, "11:00")),
      av(5, LIMA, { ...lima, motivo: "REEMBOLSO", quem: "Bianca Torres" }, em(-2, "15:40"), { lido: true, agora: { depois: true } }),
    ];
    await simular(page, comuns({ corpo: lista(...itens) }));
    await page.goto(`${P}/clientes`);
    const d = await abrirSino(page);
    const lis = d.getByRole("listitem");
    // sp-denovo: "de novo" no título e a frase da pendência que tinha voltado; o antigo diz que há um mais novo.
    await expect(lis.nth(0).locator(".si-tit")).toHaveText("Novo: O caso Lima x Condomínio Solar ficou pronto de novo para encerrar no financeiro");
    await expect(lis.nth(0)).toContainText("Bianca Torres marcou o reembolso da cópia do processo, e a pendência que tinha voltado foi resolvida. Confira o acerto e encerre.");
    const antigo = lis.filter({ has: page.getByText("Aviso antigo", { exact: true }) });
    await expect(antigo).toContainText("Agora: o caso ficou pronto de novo; veja o aviso mais novo.");
    await expect(antigo.locator(".si-onde")).toHaveText("Ver o acerto no C-2026-009");
    await expect(antigo.locator(".si-tit b")).toHaveText("Lima x Condomínio Solar");
    await expect(antigo.locator(".si-tit")).not.toContainText("de novo");
    // sp-varios: três clientes e um cliente.
    await expect(lis.nth(1)).toContainText("Marina Ribeiro registrou a última parcela. As 9 parcelas de Lúcia Nogueira, Paulo Nogueira e mais 1 cliente foram pagas. Confira o acerto e encerre.");
    await expect(lis.nth(2)).toContainText("Bianca Torres registrou a última parcela. As 10 parcelas de Helena Freitas foram pagas. Confira o acerto e encerre.");
    // sp-outro-caso.
    await expect(lis.nth(3)).toContainText("Felipe Matos ligou o C-2026-007 ao caso Martins x INSS · aposentadoria, em andamento. As parcelas que faltam seguem com ele, e nada falta receber de Ivone Martins. Confira o acerto e encerre.");
    await expect(lis.nth(3).locator(".si-onde")).toHaveText("Ver o acerto no C-2026-007");
    await expect(d).not.toContainText("R$");
    await semViolacoes(page);
  });
});
