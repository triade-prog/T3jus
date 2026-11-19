// Jurídico do Portal, parte 1 (telas aprovadas em docs/design/aprovadas/portal-juridico,
// estados casos, casos-vazio, novo-caso, ficha, ficha-sem-financeiro, mudar-etapa,
// mudar-etapa-erro e etapa-final): lista com a contagem por etapa, cadastro com vários
// clientes, ficha com a etapa no âmbar e a janela de mudar etapa com motivo e a prévia do
// aviso. A API é simulada; aqui se testa a tela, a acessibilidade e o que ela manda.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";

const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};
const SEM_AREA = { ...ESCRITORIO, pessoa: "Paula Nunes", dono: false, areas: ["CONTRATOS"], funcoes: ["EQUIPE"] };

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

const eid = (n: number) => `e1000000-0000-4000-8000-00000000000${n}`;
const NOMES = ["Preparação", "Petição inicial", "Citação e defesa", "Instrução", "Sentença", "Recurso", "Cumprimento", "Encerrado"];
const TEXTOS = [
  "estamos reunindo os documentos e preparando o seu caso. Se pedirmos algum papel, é para isso.",
  "entramos com a ação na Justiça. Agora o juiz vai chamar a outra parte para responder.",
  "a outra parte foi chamada e vai apresentar a defesa dela. É normal levar algumas semanas.",
  "é a fase das provas: perícias, testemunhas e audiências. Avisamos a data de cada uma.",
  "o juiz decidiu o caso. Vamos explicar a decisão e o que dá para fazer agora.",
  "vamos pedir para o tribunal rever a decisão. Essa fase costuma levar alguns meses.",
  "a decisão é definitiva e agora é hora de receber. Avisamos quando o valor for liberado.",
  "o seu caso terminou. Obrigado pela confiança; seguimos à disposição.",
];
const CASOS_POR_ETAPA = [1, 1, 2, 2, 2, 0, 1, 0];
const ETAPAS = NOMES.map((nome, i) => ({
  id: eid(i + 1), ordem: i + 1, nome, descricao: null, textoCliente: TEXTOS[i], avisaFinanceiro: i === 6, final: i === 7, casos: CASOS_POR_ETAPA[i],
}));
const MARINA = { id: "p1000000-0000-4000-8000-000000000001", nome: "Marina Ribeiro" };
const LARISSA = { id: "p1000000-0000-4000-8000-000000000002", nome: "Larissa Costa" };
const JOANA = { id: "c1000000-0000-4000-8000-000000000001", nome: "Joana Pereira" };
const CARLOS = { id: "c1000000-0000-4000-8000-000000000002", nome: "Carlos Henrique Dias" };
const DANIELA = { id: "c1000000-0000-4000-8000-000000000003", nome: "Daniela Souza" };
const CASO = "a1000000-0000-4000-8000-000000000001";
const etapa = (n: number) => ({ id: eid(n), ordem: n, nome: NOMES[n - 1], final: n === 8 });

const LINHA = {
  id: CASO, nome: "Pereira x Mercado Bom Preço", area: "TRABALHISTA", numero: "10010225120265020045", situacao: "ANDAMENTO", resultado: null,
  parteContraria: "Mercado Bom Preço", cliente: JOANA, outrosClientes: 1, semContrato: false, etapa: etapa(5), responsavel: MARINA,
  etapaDesde: "2026-11-07T13:00:00Z", proximoPrazo: null, pendencias: 0,
};
const LISTA = {
  hoje: "2026-11-18", etapas: ETAPAS, totais: { andamento: 9, encerrados: 14, prazoHoje: 0 }, responsaveis: [LARISSA, MARINA], souDono: true,
  casos: [
    LINHA,
    { ...LINHA, id: "a1000000-0000-4000-8000-000000000002", nome: "Ferreira Prado x INSS", area: "PREVIDENCIARIO", numero: null, cliente: { id: "c9", nome: "Antônia Ferreira Prado" },
      outrosClientes: 0, semContrato: true, etapa: etapa(1), responsavel: LARISSA },
  ],
};
const VAZIA = { ...LISTA, totais: { andamento: 0, encerrados: 0, prazoHoje: 0 }, casos: [], responsaveis: [], etapas: ETAPAS.map((e) => ({ ...e, casos: 0 })) };

const FICHA = {
  ...LINHA, tribunal: "TRT-2", vara: "45ª Vara do Trabalho de São Paulo", sistema: "PJe-JT", distribuidoEm: "2026-03-03", valorCausa: 8640000,
  avisarCliente: true, encerradoEm: null, versao: 4, criadoEm: "2026-03-03T13:00:00Z", veHonorarios: true,
  clientes: [
    { ...JOANA, papel: "AUTOR", telefone: "+5511985521034",
      contrato: { id: "k1", numero: "C-2026-014", situacao: "ATIVO", assinadoEm: "2026-02-20", condicoes: [{ tipo: "EXITO", percentual: 3000, sobre: "Valor da condenação", etapa: "Cumprimento", dias: 15 }] } },
    { ...CARLOS, papel: "AUTOR", telefone: "+5511971084426", contrato: null },
  ],
  etapas: ETAPAS,
  mudancas: [
    { para: { ordem: 5, nome: "Sentença" }, de: { ordem: 4, nome: "Instrução" }, motivo: "Sentença publicada: procedente em parte.", resultado: null,
      aviso: "Olá, Joana. Aqui é do escritório Ribeiro & Matos. Novidade no seu processo contra Mercado Bom Preço: o juiz decidiu o caso. Vamos explicar a decisão e o que dá para fazer agora. Qualquer dúvida, é só responder esta mensagem.",
      avisoEnviadoEm: null, por: MARINA, em: "2026-11-07T13:00:00Z" },
    { para: { ordem: 1, nome: "Preparação" }, de: null, motivo: "Caso cadastrado.", resultado: null, aviso: null, avisoEnviadoEm: null, por: LARISSA, em: "2026-03-03T13:00:00Z" },
  ],
  quemTemContratos: ["Marina Ribeiro", "Paula Nunes"],
  hoje: "2026-11-18", prazos: [], tarefas: [], escritorio: "Ribeiro & Matos", faltam: [], documentos: [],
};
const SEM_HONORARIOS = {
  ...FICHA, veHonorarios: false,
  clientes: FICHA.clientes.map((c) => ({ ...c, contrato: c.contrato ? { ...c.contrato, condicoes: null } : null })),
};

const comuns = (escritorio: unknown = ESCRITORIO) => ({
  "/v1/escritorio": { corpo: escritorio },
  "GET /v1/escritorio/juridico/casos": { corpo: LISTA },
  "GET /v1/escritorio/juridico/opcoes": { corpo: { etapas: ETAPAS, contratos: [{ id: "k1", numero: "C-2026-014", clienteId: JOANA.id, situacao: "ATIVO", assinadoEm: "2026-02-20" }] } },
  "GET /v1/escritorio/clientes": { corpo: { clientes: [JOANA, CARLOS, DANIELA], total: 3 } },
  "GET /v1/escritorio/pessoas": { corpo: { pessoas: [MARINA, LARISSA] } },
  [`GET /v1/escritorio/juridico/casos/${CASO}`]: { corpo: FICHA },
});

test.describe("Jurídico do Portal, casos (EX-01, EX-03, EX-07, EX-14, CH-05)", () => {
  test("Lista: contagem por etapa, número no padrão do CNJ, cliente, etapa e filtros", async ({ page }) => {
    const pedidos = await simular(page, comuns());
    await page.goto(`${P}/juridico/casos`);
    await expect(page.getByRole("heading", { level: 1, name: "Casos e processos" })).toBeVisible();
    await expect(page.getByText("Onde estão os 9 casos em andamento")).toBeVisible();
    const tab = page.getByRole("table", { name: "Casos" });
    const pereira = tab.getByRole("row", { name: /Pereira x Mercado/ });
    await expect(pereira).toContainText("1001022-51.2026.5.02.0045 · Trabalhista");
    await expect(pereira).toContainText("e mais 1 cliente");
    await expect(pereira).toContainText("Sentença");
    await expect(pereira).toContainText("5 de 8");
    const inss = tab.getByRole("row", { name: /Ferreira Prado/ });
    await expect(inss).toContainText("Sem número ainda · Previdenciário");
    await expect(inss).toContainText("sem contrato");
    await semViolacoes(page);
    await page.getByRole("button", { name: /^2\s*Instrução/ }).click();
    await expect.poll(() => pedidos.filter((p) => p.caminho === "/v1/escritorio/juridico/casos").at(-1)?.busca).toContain(`etapa=${eid(4)}`);
    await page.getByRole("button", { name: "Encerrados (14)" }).click();
    await expect.poll(() => pedidos.filter((p) => p.caminho === "/v1/escritorio/juridico/casos").at(-1)?.busca).toContain("situacao=ENCERRADO");
  });

  test("Primeiro uso: lista vazia convida a cadastrar", async ({ page }) => {
    await simular(page, { ...comuns(), "GET /v1/escritorio/juridico/casos": { corpo: VAZIA } });
    await page.goto(`${P}/juridico/casos`);
    await expect(page.getByRole("heading", { name: "Nenhum caso ainda" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cadastrar o primeiro caso" })).toHaveAttribute("href", "/juridico/casos/novo");
    await semViolacoes(page);
  });

  test("Sem a área Jurídico: diz quem libera", async ({ page }) => {
    await simular(page, comuns(SEM_AREA));
    await page.goto(`${P}/juridico/casos`);
    await expect(page.getByRole("heading", { name: "Esta área não está liberada para você" })).toBeVisible();
  });

  test("Novo caso: erros presos ao campo, número do CNJ conferido, sem contrato avisa, dois clientes", async ({ page }) => {
    const pedidos = await simular(page, { ...comuns(), "POST /v1/escritorio/juridico/casos": { status: 201, corpo: { id: CASO, versao: 1 } } });
    await page.goto(`${P}/juridico/casos/novo`);
    await expect(page.getByRole("heading", { level: 1, name: "Novo caso" })).toBeVisible();
    await expect(page.getByLabel("Etapa", { exact: true })).toHaveValue(eid(1));
    await expect(page.getByLabel("Responsável", { exact: true })).toHaveValue(MARINA.id);
    await page.getByLabel("Número do processo").fill("1001022-52.2026.5.02.0045");
    await page.getByRole("button", { name: "Cadastrar caso" }).click();
    const resumo = page.getByRole("alert").filter({ hasText: "O caso ainda não foi cadastrado" });
    await expect(resumo).toContainText("Nome do caso");
    await expect(resumo).toContainText("Clientes do caso");
    await expect(resumo).toContainText("Número do processo");
    await expect(page.getByRole("link", { name: /^Nome do caso/ })).toBeFocused();
    await semViolacoes(page);

    await page.getByLabel("Nome do caso").fill("Souza x Clínica Bem Viver");
    await page.getByLabel("Área").selectOption("SAUDE");
    await page.getByLabel("Parte contrária").fill("Clínica Bem Viver Ltda.");
    await page.getByLabel("Cliente", { exact: true }).selectOption(DANIELA.id);
    await expect(page.getByText("Daniela ainda não tem contrato de honorários ligado.")).toBeVisible();
    await page.getByRole("button", { name: "Adicionar outro cliente" }).click();
    await page.locator("#nc-cli-2").selectOption(JOANA.id);
    await page.locator("#nc-ct-2").selectOption("k1");
    await page.getByLabel("Número do processo").fill("1001022-51.2026.5.02.0045");
    await page.getByLabel("Valor da causa").fill("86.400,00");
    await page.getByRole("button", { name: "Cadastrar caso" }).click();
    await expect(page).toHaveURL(new RegExp(`/juridico/casos/${CASO}$`));
    const p = pedidos.find((x) => x.metodo === "POST" && x.caminho === "/v1/escritorio/juridico/casos")!.corpo as Record<string, unknown>;
    expect(p).toMatchObject({
      nome: "Souza x Clínica Bem Viver", area: "SAUDE", numero: "1001022-51.2026.5.02.0045", valorCausa: 8640000, etapaId: eid(1), responsavelId: MARINA.id, avisarCliente: true,
      clientes: [{ clienteId: DANIELA.id, papel: "AUTOR", contratoId: null }, { clienteId: JOANA.id, papel: "AUTOR", contratoId: "k1" }],
    });
    await expect(page.getByRole("status").filter({ hasText: "Caso cadastrado" })).toBeVisible();
  });

  test("Ficha: etapa no âmbar, dados do processo, clientes com honorários, contratos e mudanças", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/juridico/casos/${CASO}`);
    await expect(page.getByRole("heading", { level: 1, name: "Pereira x Mercado Bom Preço" })).toBeVisible();
    const et = page.getByRole("region", { name: "Etapa do caso" });
    await expect(et).toContainText("5 de 8 Sentença");
    await expect(et).toContainText("Próxima: Recurso");
    const dados = page.getByRole("region", { name: "Dados do processo" });
    await expect(dados).toContainText("R$ 86.400,00");
    await expect(dados).toContainText("1001022-51.2026.5.02.0045");
    const cli = page.getByRole("region", { name: "Clientes do caso" });
    await expect(cli).toContainText("(11) 98552-1034");
    await expect(cli).toContainText("30%");
    await expect(cli).toContainText("sem contrato");
    await expect(page.getByRole("region", { name: "Contratos ligados" })).toContainText("C-2026-014 · Joana Pereira");
    const mud = page.getByRole("region", { name: "Mudanças de etapa" });
    await expect(mud).toContainText("Sentença publicada");
    await mud.getByRole("button", { name: "Ver o aviso preparado" }).click();
    await expect(mud).toContainText("Olá, Joana.");
    await semViolacoes(page);
  });

  test("Ficha sem Contratos nem Financeiro: sem os valores e diz quem vê", async ({ page }) => {
    await simular(page, { ...comuns(), [`GET /v1/escritorio/juridico/casos/${CASO}`]: { corpo: SEM_HONORARIOS } });
    await page.goto(`${P}/juridico/casos/${CASO}`);
    const cli = page.getByRole("region", { name: "Clientes do caso" });
    await expect(cli).toContainText("Contrato C-2026-014");
    await expect(cli).not.toContainText("30%");
    await expect(cli).toContainText("Contratos ou Financeiro (Marina Ribeiro e Paula Nunes)");
  });

  test("Mudar etapa: motivo obrigatório, prévia do aviso, ajustar só desta vez e o que vai ao servidor", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`POST /v1/escritorio/juridico/casos/${CASO}/etapa`]: { corpo: { id: CASO, versao: 5, encerrado: false, aviso: "x" } },
    });
    await page.goto(`${P}/juridico/casos/${CASO}`);
    await page.getByRole("button", { name: "Mudar etapa" }).click();
    const j = page.getByRole("dialog", { name: "Mudar etapa" });
    await expect(j).toContainText("Agora: 5. Sentença, desde 07/11/2026, por Marina Ribeiro.");
    await expect(j.getByRole("radio", { name: /Sentença/ })).toBeDisabled();
    await j.getByRole("radio", { name: /Recurso/ }).check();
    await expect(j.getByText("Olá, Joana. Aqui é do escritório Ribeiro & Matos. Novidade no seu processo contra Mercado Bom Preço: vamos pedir para o tribunal rever a decisão.")).toBeVisible();
    await j.getByRole("button", { name: "Mudar para Recurso e avisar" }).click();
    await expect(j.getByLabel("Motivo")).toBeFocused();
    await expect(j).toContainText("Escreva o motivo");
    await semViolacoes(page);
    await j.getByLabel("Motivo").fill("Sentença procedente em parte. Joana quer recorrer.");
    await j.getByRole("button", { name: "Ajustar só desta vez" }).click();
    await j.getByLabel("O meio do aviso, só desta vez").fill("vamos recorrer da parte das horas extras. Avisamos a cada novidade.");
    await j.getByRole("button", { name: "Mudar para Recurso e avisar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Etapa mudada para Recurso" })).toBeVisible();
    const p = pedidos.find((x) => x.metodo === "POST" && x.caminho.endsWith("/etapa"))!.corpo;
    expect(p).toEqual({ versao: 4, etapaId: eid(6), motivo: "Sentença procedente em parte. Joana quer recorrer.", avisar: true,
      textoAviso: "vamos recorrer da parte das horas extras. Avisamos a cada novidade.", resultado: null });
  });

  test("Etapa final: pede o resultado e encerra", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      [`POST /v1/escritorio/juridico/casos/${CASO}/etapa`]: { corpo: { id: CASO, versao: 5, encerrado: true, aviso: null } },
    });
    await page.goto(`${P}/juridico/casos/${CASO}`);
    await page.getByRole("button", { name: "Mudar etapa" }).click();
    await page.getByRole("radio", { name: /Encerrado/ }).check();
    const j = page.getByRole("dialog", { name: "Encerrar o caso" });
    await j.getByLabel("Motivo").fill("Acordo homologado em audiência.");
    await j.getByLabel(/Avisar Joana Pereira e Carlos Henrique Dias/).uncheck();
    await j.getByRole("button", { name: "Encerrar o caso" }).click();
    await expect(j).toContainText("Diga como o caso terminou.");
    await j.getByRole("radio", { name: /Acordo/ }).check();
    await semViolacoes(page);
    await j.getByRole("button", { name: "Encerrar o caso" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Caso encerrado" })).toBeVisible();
    expect(pedidos.find((x) => x.metodo === "POST" && x.caminho.endsWith("/etapa"))!.corpo).toMatchObject({ etapaId: eid(8), resultado: "ACORDO", avisar: false });
  });

  test("Celular: lista e ficha cabem na tela", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await simular(page, comuns());
    await page.goto(`${P}/juridico/casos`);
    await expect(page.getByRole("heading", { level: 1, name: "Casos e processos" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.goto(`${P}/juridico/casos/${CASO}`);
    await expect(page.getByRole("heading", { level: 1, name: "Pereira x Mercado Bom Preço" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await semViolacoes(page);
  });
});
