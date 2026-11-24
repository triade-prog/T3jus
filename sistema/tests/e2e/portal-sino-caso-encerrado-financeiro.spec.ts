// O aviso no sino quando o caso é encerrado no financeiro (F3.150; EX-16, EX-17, PT-02), telas
// aprovadas em docs/design/aprovadas/portal-sino-caso-fechou (NOTAS.md, os textos exatos): o aviso de
// quem encerra contratos (grupo A) e o de quem é responsável pelo caso (grupo B), o selo, o nome
// acessível do link (sempre com o trecho do selo), o número do contrato que não quebra (.si-nr), o
// clique que marca lido e abre a janela de encerrar o contrato, o "Agora:" depois e o destino pelas
// áreas da sessão. Quem recebe e quem não recebe é regra do servidor e fica no pgTAP 137. A API é
// simulada e o relógio da página fica em quarta-feira, 18/11/2026, às 16h, o "hoje" do desenho.
// As constantes da ficha de destino são copiadas (um spec não importa outro).
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const DIEGO = { id: "a0000000-0000-4000-8000-000000000102", nome: "Diego Almeida" };
const FELIPE = { id: "a0000000-0000-4000-8000-000000000103", nome: "Felipe Matos" };
const LARISSA = { id: "a0000000-0000-4000-8000-000000000104", nome: "Larissa Costa" };
const BIANCA = { id: "a0000000-0000-4000-8000-000000000105", nome: "Bianca Torres" };
const ct = (n: number) => `f1000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const cl = (n: number) => `c1000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const caso = (n: number) => `c9000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const avId = (n: number) => `a4000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;

const AGORA = new Date("2026-11-18T16:00:00-03:00");
const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};
const sessao = (pessoa: string, areas: string[]) => ({ ...ESCRITORIO, pessoa, dono: false, areas, funcoes: ["EQUIPE"] });
const SESSAO_FELIPE = sessao("Felipe Matos", ["COMERCIAL", "CONTRATOS", "JURIDICO"]);
const SESSAO_LARISSA = sessao("Larissa Costa", ["JURIDICO"]);

const dia = (n: number) => new Date(AGORA.getTime() + n * 864e5 - 3 * 36e5).toISOString().slice(0, 10);
const em = (n: number, h: string) => `${dia(n)}T${h}:00-03:00`;

// ---------------------------------------------------------- o elenco do NOTAS.md
const C = (n: number, numero: string, cliente: string) => ({ id: ct(n), numero, cliente, clienteId: cl(n) });
const C012 = C(12, "C-2026-012", "Noemi Bastos Carvalho");
const C025 = C(25, "C-2026-025", "Lúcia Nogueira");
const C026 = C(26, "C-2026-026", "Paulo Nogueira");
const VIANA = [C(28, "C-2026-028", "Clara Viana"), C(29, "C-2026-029", "Rafael Viana"), C(30, "C-2026-030", "Sônia Viana")];
const C032 = C(32, "C-2026-032", "Márcia Fontes");
const QUEM_CTR = ["Bianca Torres", "Felipe Matos", "Marina Ribeiro"];
const CARV = "Carvalho x Construtora Lume";
const NOG = "Nogueira x Transportes Serra";
const FONTES = "Fontes x Hospital São Lucas";

// ---------------------------------------------------------- a ficha do contrato de destino (a de Contratos)
const FICHA = {
  id: ct(12), numero: "C-2026-012", objeto: "Vício construtivo", situacao: "ATIVO", cliente: { id: cl(12), nome: C012.cliente, tipo: "PF" },
  responsavel: FELIPE, condicoes: [{ tipo: "PARCELADO", total: 600000, parcelas: 6, primeiro: dia(-169) }], proximo: null, basePendente: null,
  criadoEm: em(-170, "15:02"), observacoes: null, versao: 3, assinadoEm: dia(-170), assinaturaPor: FELIPE, encerradoEm: null, motivoEncerramento: null,
  proposta: null, advogados: [FELIPE], financeiro: false, inscricoes: [], recebimentos: [], historico: [],
};

// ---------------------------------------------------------------- os avisos
const fechou = (n: number, nomeCaso: string, dados: Record<string, unknown>, quando: string, extra: Record<string, unknown> = {}) => ({
  id: avId(n), tipo: "CASO_ENCERRADO_FINANCEIRO", origem: "casos", origemId: caso(n), em: quando, lido: false,
  dados: { caso: nomeCaso, quem: "Diego Almeida", ...dados }, ...extra,
});
const carvA = (extra: Record<string, unknown> = {}) =>
  fechou(1, CARV, { papel: "CONTRATOS", cliente: C012.cliente, clienteId: C012.clienteId, abertos: [C012],
    jaEncerrados: [{ numero: "C-2026-013", cliente: "Cláudio Carvalho" }] }, em(0, "10:05"), extra);
const nogA = (extra: Record<string, unknown> = {}) =>
  fechou(2, NOG, { papel: "CONTRATOS", cliente: "Rui Nogueira", clienteId: cl(10), abertos: [C025, C026] }, em(0, "10:40"), extra);
const VIANA_A = fechou(3, "Inventário de Augusto Viana", { papel: "CONTRATOS", cliente: "Clara Viana", clienteId: cl(28), abertos: VIANA },
  em(-1, "16:20"), { lido: true });
const fontes = (n: number, dados: Record<string, unknown>, quando: string, extra: Record<string, unknown> = {}) =>
  fechou(n, FONTES, { papel: "RESPONSAVEL", cliente: C032.cliente, clienteId: C032.clienteId, ...dados }, quando, extra);
const FONTES_JUNTO = fontes(4, { quem: "Marina Ribeiro", juntos: [{ numero: "C-2026-032", cliente: "Márcia Fontes" }] }, em(0, "10:12"));
const FONTES_FALTA = (extra: Record<string, unknown> = {}) => fontes(5, { abertos: [C032], quemContratos: QUEM_CTR }, em(-1, "16:10"), extra);
const SEGUE_B = fechou(6, "Martins x INSS · auxílio-doença", { papel: "RESPONSAVEL", cliente: "Ivone Martins", clienteId: cl(7),
  seguem: [{ id: ct(7), numero: "C-2026-007", cliente: "Ivone Martins", outroCaso: "Martins x INSS · aposentadoria" }] }, em(0, "10:30"));

const CARV_DET = "Diego Almeida encerrou o caso no financeiro, e o C-2026-012, de Noemi Bastos Carvalho, continua aberto.";
const NOG_DET = "Diego Almeida encerrou o caso no financeiro, e continuam abertos o C-2026-025, de Lúcia Nogueira, e o C-2026-026, de Paulo Nogueira.";
const FALTA_DET = "Diego Almeida encerrou o caso no financeiro. Quem encerra o C-2026-032, de Márcia Fontes, é a área Contratos (Bianca Torres, Felipe Matos e Marina Ribeiro).";
const titulo = (c: string) => `O caso ${c} foi encerrado no financeiro`;
// O trecho para o leitor de tela fica num span .sr à parte; o Chromium pode pôr um espaço antes do ponto.
const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const nome = (t: string, trecho: string) => new RegExp(`^${esc(t)} ?\\. ${esc(trecho)}$`);
const lista = (...itens: unknown[]) => ({ novos: itens.filter((i) => !(i as { lido: boolean }).lido).length, total: itens.length, itens });

type Resp = { status?: number; corpo: unknown };
type Rota = Resp | Resp[] | (() => Resp);
type Pedido = { metodo: string; caminho: string; corpo: unknown };

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
const comuns = (escritorio: unknown, avisos: Rota) => ({
  "/v1/escritorio": { corpo: escritorio },
  "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA, FELIPE, LARISSA, BIANCA] } },
  "/v1/escritorio/pessoas/oab": { corpo: { pessoas: [] } },
  "GET /v1/escritorio/clientes": { corpo: { comercial: true, clientes: [] } },
  "GET /v1/escritorio/avisos": avisos,
});
const botaoSino = (page: Page) => page.getByRole("button", { name: /^Avisos,/ }).filter({ visible: true });
async function abrirSino(page: Page) {
  await botaoSino(page).click();
  return page.getByRole("dialog", { name: "Avisos" });
}
const itemDe = (page: Page, texto: string) => page.getByRole("dialog", { name: "Avisos" }).getByRole("listitem").filter({ hasText: texto });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA);
});

test.describe("Aviso de caso encerrado no financeiro (F3.150: EX-16, EX-17, PT-02)", () => {
  test("sf-contrato, o clique e sf-agora-encerrado: Felipe encerra o contrato pela janela; depois o Agora conta", async ({ page }) => {
    let encerrou = false;
    const NOVO = carvA();
    const pedidos = await simular(page, {
      ...comuns(SESSAO_FELIPE, () => ({ corpo: encerrou
        ? lista(carvA({ lido: true, agoraFechou: { saiu: [{ numero: "C-2026-012", em: em(0, "15:40"), por: FELIPE, voce: true }],
          encerrados: { em: em(0, "15:40"), por: FELIPE, voce: true } } }))
        : lista(NOVO) })),
      [`POST /v1/escritorio/avisos/${NOVO.id}/lido`]: { corpo: lista({ ...NOVO, lido: true }) },
      [`GET /v1/escritorio/contratos/${ct(12)}`]: { corpo: FICHA },
    });
    await page.goto(`${P}/clientes`);
    await expect(botaoSino(page)).toHaveAccessibleName("Avisos, 1 novo");
    const d = await abrirSino(page);
    const item = itemDe(page, CARV);
    await expect(item.locator(".si-tit")).toHaveText(`Novo: ${titulo(CARV)}. Falta encerrar o C-2026-012.`);
    await expect(item.locator(".si-det")).toHaveText(`${CARV_DET} Encerre o contrato.`);
    await expect(item.locator(".si-nv")).toHaveText("Novo");
    await expect(item.locator(".selo")).toHaveText("Falta o contrato");
    await expect(item.locator(".si-onde")).toHaveText("Encerrar o C-2026-012");
    await expect(item).not.toContainText("Agora:");
    await expect(item.locator(".si-det .si-nr")).toHaveText("C-2026-012");
    await expect(item.locator(".si-det .si-nr")).toHaveCSS("white-space", "nowrap");
    await expect(item).not.toContainText("R$");
    const link = d.getByRole("link", { name: nome(`Novo: ${titulo(CARV)}`, "Falta encerrar o C-2026-012.") });
    await expect(link).toHaveAttribute("href", `/contratos/contratos/${ct(12)}?encerrar=1`);
    await semViolacoes(page);

    // O clique marca lido e abre a janela de encerrar o contrato.
    await link.click();
    await page.waitForURL(`**/contratos/contratos/${ct(12)}?encerrar=1`);
    expect(pedidos.some((p) => p.metodo === "POST" && p.caminho === `/v1/escritorio/avisos/${NOVO.id}/lido`)).toBe(true);
    await expect(page.getByRole("alertdialog", { name: "Encerrar contrato" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("alertdialog", { name: "Encerrar contrato" })).toBeHidden();

    // Felipe encerrou o contrato: a segunda leitura do sino traz agoraFechou.encerrados.
    encerrou = true;
    const d2 = await abrirSino(page);
    const item2 = itemDe(page, CARV);
    await expect(item2.locator(".si-det").nth(0)).toHaveText(CARV_DET);
    await expect(item2.locator(".si-det").nth(1)).toHaveText("Agora: você encerrou o C-2026-012 hoje.");
    await expect(item2).not.toContainText("Encerre o contrato.");
    await expect(item2.locator(".selo")).toHaveText("Contrato encerrado");
    await expect(item2.locator(".si-onde")).toHaveText("Ver o C-2026-012");
    await expect(d2.getByRole("link", { name: nome(titulo(CARV), "Agora: contrato encerrado.") })).toHaveAttribute("href", `/contratos/contratos/${ct(12)}`);
    await semViolacoes(page);
  });

  test("grupo A com vários contratos: sf-varios, sf-agora-parcial e Nogueira com tudo encerrado (o Viana não muda)", async ({ page }) => {
    let vez = 0;
    const leituras = [
      lista(nogA(), VIANA_A),
      lista(nogA({ lido: true, agoraFechou: { abertos: [{ id: ct(26), numero: "C-2026-026" }],
        saiu: [{ numero: "C-2026-025", em: em(0, "14:10"), por: FELIPE, voce: true }] } }), VIANA_A),
      lista(nogA({ lido: true, agoraFechou: { saiu: [{ numero: "C-2026-025", em: em(0, "14:10"), por: FELIPE, voce: true },
        { numero: "C-2026-026", em: em(0, "15:20"), por: FELIPE, voce: true }], encerrados: { em: em(0, "15:20"), por: FELIPE, voce: true } } }), VIANA_A),
    ];
    await simular(page, comuns(SESSAO_FELIPE, () => ({ corpo: leituras[vez]! })));
    await page.goto(`${P}/clientes`);
    let d = await abrirSino(page);
    // sf-varios: dois de hoje e três de ontem.
    const nog = itemDe(page, NOG);
    await expect(nog.locator(".si-det")).toHaveText(`${NOG_DET} Encerre os contratos.`);
    await expect(nog.locator(".selo")).toHaveText("Faltam os contratos");
    await expect(nog.locator(".si-onde")).toHaveText("Encerrar o C-2026-025");
    await expect(nog.locator(".si-det .si-nr")).toHaveCount(2);
    await expect(d.getByRole("link", { name: nome(`Novo: ${titulo(NOG)}`, "Falta encerrar 2 contratos.") }))
      .toHaveAttribute("href", `/contratos/contratos/${ct(25)}?encerrar=1`);
    const viana = itemDe(page, "Augusto Viana");
    await expect(viana.locator(".si-det")).toHaveText("Diego Almeida encerrou o caso no financeiro, e continuam abertos o C-2026-028, de Clara Viana, o C-2026-029, de Rafael Viana, e mais 1 contrato. Encerre os contratos.");
    await expect(viana.locator(".selo")).toHaveText("Faltam os contratos");
    await expect(d.getByRole("heading", { name: /^Ontem/ })).toBeVisible();
    await expect(d.getByRole("link", { name: nome(titulo("Inventário de Augusto Viana"), "Falta encerrar 3 contratos.") })).toBeVisible();
    await semViolacoes(page);

    // sf-agora-parcial.
    await d.getByRole("button", { name: "Fechar os avisos" }).click();
    vez = 1;
    d = await abrirSino(page);
    await expect(nog.locator(".si-det").nth(1)).toHaveText("Agora: você encerrou o C-2026-025 hoje; falta o C-2026-026.");
    await expect(nog.locator(".selo")).toHaveText("Falta o contrato");
    await expect(nog.locator(".si-onde")).toHaveText("Encerrar o C-2026-026");
    await expect(d.getByRole("link", { name: nome(titulo(NOG), "Agora: falta o C-2026-026.") })).toHaveAttribute("href", `/contratos/contratos/${ct(26)}?encerrar=1`);
    await semViolacoes(page);

    // sf-agora-encerrado (Nogueira): os dois encerrados; o Viana continua como estava.
    await d.getByRole("button", { name: "Fechar os avisos" }).click();
    vez = 2;
    d = await abrirSino(page);
    await expect(nog.locator(".si-det").nth(0)).toHaveText(NOG_DET);
    await expect(nog.locator(".si-det").nth(1)).toHaveText("Agora: você encerrou os contratos hoje.");
    await expect(nog.locator(".selo")).toHaveText("Contratos encerrados");
    await expect(nog.locator(".si-onde")).toHaveText("Ver o C-2026-025");
    await expect(d.getByRole("link", { name: nome(titulo(NOG), "Agora: contratos encerrados.") })).toBeVisible();
    await expect(viana.locator(".selo")).toHaveText("Faltam os contratos");
    await expect(viana).not.toContainText("Agora:");
    await semViolacoes(page);
  });

  test("sf-socia: Marina vê o aviso novo e o de \"pronto\" do mesmo caso", async ({ page }) => {
    const PRONTO = {
      id: avId(9), tipo: "CASO_PRONTO_FECHAR", origem: "casos", origemId: caso(1), em: em(-1, "11:05"), lido: true,
      dados: { caso: CARV, contrato: "C-2026-012", contratoId: ct(12), clientes: [C012.cliente, "Cláudio Carvalho"], motivo: "PAGAMENTO", quem: "Diego Almeida", parcelas: 7 },
      agora: { encerrado: { em: em(0, "10:05"), por: DIEGO } },
    };
    await simular(page, comuns(ESCRITORIO, { corpo: lista(carvA(), PRONTO) }));
    await page.goto(`${P}/clientes`);
    const d = await abrirSino(page);
    await expect(d.getByRole("link", { name: nome(`Novo: ${titulo(CARV)}`, "Falta encerrar o C-2026-012.") })).toBeVisible();
    const pronto = itemDe(page, "ficou pronto");
    await expect(pronto.locator(".si-det").nth(1)).toHaveText("Agora: Diego Almeida encerrou no financeiro hoje, às 10h05.");
    await expect(pronto.locator(".selo")).toHaveText("Encerrado");
    await expect(pronto.locator(".si-onde")).toHaveText("Ver o fechamento no C-2026-012");
    await semViolacoes(page);
  });

  test("grupo B: sf-responsavel, sf-responsavel-falta, sf-segue e sf-agora-terminou", async ({ page }) => {
    const TERMINOU = { ...FONTES_FALTA(), id: avId(7), origemId: caso(7),
      agoraFechou: { saiu: [{ numero: "C-2026-032", em: em(0, "14:30"), por: FELIPE, voce: false }], encerrados: { em: em(0, "14:30"), por: FELIPE, voce: false } } };
    await simular(page, comuns(SESSAO_LARISSA, { corpo: lista(FONTES_JUNTO, SEGUE_B, TERMINOU, FONTES_FALTA()) }));
    await page.goto(`${P}/clientes`);
    const d = await abrirSino(page);
    const lis = d.getByRole("listitem");
    await expect(lis).toHaveCount(4);
    // sf-responsavel.
    await expect(lis.nth(0).locator(".si-det")).toHaveText("Marina Ribeiro encerrou o caso no financeiro e, junto, o C-2026-032, de Márcia Fontes. O fechamento do caso terminou.");
    await expect(lis.nth(0).locator(".selo")).toHaveText("Fechamento feito");
    await expect(lis.nth(0).locator(".si-onde")).toHaveText("Ver o caso");
    await expect(lis.nth(0).getByRole("link", { name: nome(`Novo: ${titulo(FONTES)}`, "O fechamento terminou.") })).toHaveAttribute("href", `/juridico/casos/${caso(4)}`);
    // sf-segue.
    await expect(lis.nth(1).locator(".si-det")).toHaveText("Diego Almeida encerrou o caso no financeiro. O C-2026-007, de Ivone Martins, fica aberto, porque as parcelas seguem com o caso Martins x INSS · aposentadoria.");
    await expect(lis.nth(1).locator(".selo")).toHaveText("Segue com outro caso");
    await expect(lis.nth(1).getByRole("link", { name: nome(`Novo: ${titulo("Martins x INSS · auxílio-doença")}`, "O contrato segue com outro caso.") }))
      .toHaveAttribute("href", `/juridico/casos/${caso(6)}`);
    // sf-agora-terminou: continua novo (Larissa não abriu), o detalhe não muda e o Agora conta.
    await expect(lis.nth(2).locator(".si-det").nth(0)).toHaveText(FALTA_DET);
    await expect(lis.nth(2).locator(".si-det").nth(1)).toHaveText("Agora: Felipe Matos encerrou o C-2026-032 hoje, e o fechamento do caso terminou.");
    await expect(lis.nth(2).locator(".selo")).toHaveText("Fechamento feito");
    await expect(lis.nth(2).getByRole("link", { name: nome(`Novo: ${titulo(FONTES)}`, "Agora: fechamento terminou.") })).toHaveAttribute("href", `/juridico/casos/${caso(7)}`);
    // sf-responsavel-falta (ontem, 16h10).
    await expect(lis.nth(3).locator(".si-det")).toHaveText(FALTA_DET);
    await expect(lis.nth(3).locator(".selo")).toHaveText("Falta o contrato");
    await expect(lis.nth(3).locator(".si-onde")).toHaveText("Ver o caso");
    await expect(lis.nth(3).getByRole("link", { name: nome(`Novo: ${titulo(FONTES)}`, "Falta encerrar o C-2026-032, com a área Contratos.") })).toBeVisible();
    await expect(d).not.toContainText("R$");
    await semViolacoes(page);
  });

  test("sem a área: a ficha do cliente (Felipe só com Comercial; Larissa sem áreas)", async ({ page }) => {
    await simular(page, comuns(sessao("Felipe Matos", ["COMERCIAL"]), { corpo: lista(carvA()) }));
    await page.goto(`${P}/clientes`);
    let d = await abrirSino(page);
    let item = itemDe(page, CARV);
    await expect(item.locator(".si-onde")).toHaveText("Ver a ficha de Noemi Bastos Carvalho");
    await expect(item.locator(".selo")).toHaveText("Falta o contrato");
    await expect(d.getByRole("link", { name: nome(`Novo: ${titulo(CARV)}`, "Falta encerrar o C-2026-012.") })).toHaveAttribute("href", `/clientes/${cl(12)}`);
    await semViolacoes(page);

    await page.unrouteAll({ behavior: "ignoreErrors" });
    await simular(page, comuns(sessao("Larissa Costa", []), { corpo: lista(FONTES_FALTA()) }));
    await page.goto(`${P}/clientes`);
    d = await abrirSino(page);
    item = itemDe(page, FONTES);
    await expect(item.locator(".si-onde")).toHaveText("Ver a ficha de Márcia Fontes");
    await expect(d.getByRole("link", { name: nome(`Novo: ${titulo(FONTES)}`, "Falta encerrar o C-2026-032, com a área Contratos.") }))
      .toHaveAttribute("href", `/clientes/${cl(32)}`);
    await semViolacoes(page);
  });

  test("sf-lido: sem o destaque e sem \"Novo\" no nome do link, com o trecho do selo", async ({ page }) => {
    await simular(page, comuns(SESSAO_FELIPE, { corpo: lista(carvA({ lido: true })) }));
    await page.goto(`${P}/clientes`);
    await expect(botaoSino(page)).toHaveAccessibleName("Avisos, nenhum novo");
    const d = await abrirSino(page);
    const item = itemDe(page, CARV);
    await expect(item).not.toHaveClass(/si-novo/);
    await expect(item.locator(".si-nv")).toHaveCount(0);
    await expect(item.locator(".si-det")).toHaveText(`${CARV_DET} Encerre o contrato.`);
    await expect(item.locator(".selo")).toHaveText("Falta o contrato");
    await expect(d.getByRole("link", { name: nome(titulo(CARV), "Falta encerrar o C-2026-012.") })).toHaveAttribute("href", `/contratos/contratos/${ct(12)}?encerrar=1`);
    await semViolacoes(page);
  });
});
