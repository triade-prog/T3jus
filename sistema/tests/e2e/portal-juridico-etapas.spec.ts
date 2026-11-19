// Jurídico do Portal, parte 3a (telas aprovadas em docs/design/aprovadas/portal-juridico,
// estados etapas e peticoes): as etapas do escritório editadas no lugar, com a prévia do
// WhatsApp, subir e descer, a final fixa e tirar com os casos indo para outra etapa; a equipe só
// vê; e a pergunta de Petições. A API é simulada; aqui se testa a tela, a acessibilidade e o que
// ela manda.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESCRITORIO = {
  id: "e0000000-0000-4000-8000-0000000000a1", nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
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

const NOMES = ["Preparação", "Petição inicial", "Citação e defesa", "Instrução", "Sentença", "Recurso", "Cumprimento", "Encerrado"];
const DESC = ["Juntar documentos e preparar o caso", "A ação foi distribuída", "A outra parte responde", "Provas, perícias e audiências", "O juiz decidiu", "O tribunal revê a decisão", "Hora de receber", "Fim do caso: pede o resultado"];
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
const CASOS = [1, 1, 2, 2, 2, 0, 1, 0];
const eid = (n: number) => `e1000000-0000-4000-8000-00000000000${n}`;
const ETAPAS = NOMES.map((nome, i) => ({
  id: eid(i + 1), ordem: i + 1, nome, descricao: DESC[i], textoCliente: TEXTOS[i], avisaFinanceiro: i === 6, final: i === 7, casos: CASOS[i],
  versao: 1, encerrados: i === 7 ? 14 : null,
}));
const LISTA = { podeEditar: true, escritorio: "Ribeiro & Matos", etapas: ETAPAS };

const comuns = (escritorio: unknown = ESCRITORIO, lista: unknown = LISTA) => ({
  "/v1/escritorio": { corpo: escritorio },
  "GET /v1/escritorio/juridico/etapas": { corpo: lista },
  "GET /v1/escritorio/juridico/peticoes": { corpo: { minhaResposta: null } },
});

test.describe("Jurídico do Portal, etapas do escritório e Petições (EX-07, EX-09)", () => {
  test("Etapas: lista com casos, final fixa, editar no lugar com a prévia e o que vai ao servidor", async ({ page }) => {
    const pedidos = await simular(page, { ...comuns(), [`PUT /v1/escritorio/juridico/etapas/${eid(5)}`]: { corpo: { id: eid(5), versao: 2 } } });
    await page.goto(`${P}/juridico/casos/etapas`);
    await expect(page.getByRole("heading", { level: 1, name: "Etapas do escritório" })).toBeVisible();
    await expect(page.getByText("8 etapas · valem para todos os casos do escritório · a última é sempre a final")).toBeVisible();
    const final = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: /Encerrado/ }) });
    await expect(final).toContainText("Etapa final · pede o resultado");
    await expect(final).toContainText("14 casos encerrados");
    await expect(final.getByRole("button", { name: "Subir Encerrado" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Descer Cumprimento" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Subir Preparação" })).toBeDisabled();
    await expect(page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: /Cumprimento/ }) })).toContainText("Avisa o Financeiro");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Editar Sentença" }).click();
    const form = page.getByRole("form", { name: "Editar a etapa Sentença" });
    await expect(form.getByLabel("Nome da etapa")).toBeFocused();
    await expect(form).toContainText("76 de 240");
    await expect(form).toContainText("Olá, Joana. Aqui é do escritório Ribeiro & Matos. Novidade no seu processo contra Mercado Bom Preço: o juiz decidiu o caso.");
    await form.getByLabel("Texto para o cliente").fill("curto");
    await form.getByRole("button", { name: "Salvar etapa" }).click();
    await expect(form.getByText("Falta acertar 1 ponto, marcado abaixo.")).toBeVisible();
    await expect(form.getByLabel("Texto para o cliente")).toBeFocused();
    await semViolacoes(page);
    await form.getByLabel("Texto para o cliente").fill("o juiz decidiu. Vamos explicar a decisão.");
    await form.getByRole("button", { name: "Salvar etapa" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Etapa salva" })).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "PUT")!.corpo).toEqual({
      nome: "Sentença", descricao: "O juiz decidiu", textoCliente: "o juiz decidiu. Vamos explicar a decisão.", avisaFinanceiro: false, versao: 1,
    });
  });

  test("Adicionar entra antes da final; subir manda a direção", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      "POST /v1/escritorio/juridico/etapas": { status: 201, corpo: { id: "e9", versao: 1 } },
      [`POST /v1/escritorio/juridico/etapas/${eid(3)}/mover`]: { corpo: ETAPAS },
    });
    await page.goto(`${P}/juridico/casos/etapas`);
    await page.getByRole("button", { name: "Subir Citação e defesa" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Citação e defesa subiu" })).toBeVisible();
    expect(pedidos.find((p) => p.caminho.endsWith("/mover"))!.corpo).toEqual({ direcao: "SOBE" });
    await page.getByRole("button", { name: "Adicionar etapa" }).click();
    const form = page.getByRole("form", { name: "Nova etapa" });
    const itens = page.getByRole("listitem");
    await expect(itens.nth(7)).toContainText("Nome da etapa");
    await form.getByLabel("Nome da etapa").fill("Acordo");
    await form.getByLabel("Texto para o cliente").fill("estamos negociando um acordo com a outra parte.");
    await form.getByLabel("Avisar o Financeiro ao entrar nesta etapa").check();
    await form.getByRole("button", { name: "Salvar etapa" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Etapa adicionada" })).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST" && p.caminho === "/v1/escritorio/juridico/etapas")!.corpo).toEqual({
      nome: "Acordo", descricao: null, textoCliente: "estamos negociando um acordo com a outra parte.", avisaFinanceiro: true,
    });
  });

  test("Tirar uma etapa com casos pede para onde eles vão", async ({ page }) => {
    const pedidos = await simular(page, { ...comuns(), [`POST /v1/escritorio/juridico/etapas/${eid(4)}/remover`]: { corpo: { casosMovidos: 2, para: "Sentença" } } });
    await page.goto(`${P}/juridico/casos/etapas`);
    await page.getByRole("button", { name: "Editar Instrução" }).click();
    await page.getByRole("button", { name: "Tirar esta etapa" }).click();
    const j = page.getByRole("alertdialog", { name: "Tirar a etapa Instrução?" });
    await expect(j).toContainText("2 casos estão nesta etapa");
    await j.getByRole("button", { name: "Tirar a etapa" }).click();
    await expect(j.getByText("Escolha para qual etapa os casos vão.")).toBeVisible();
    await expect(j.getByRole("option", { name: "8. Encerrado" })).toHaveCount(0);
    await semViolacoes(page);
    await j.getByLabel("Os casos vão para").selectOption(eid(5));
    await j.getByRole("button", { name: "Tirar a etapa" }).click();
    await expect(page.getByRole("status").filter({ hasText: "A etapa Instrução saiu da lista" })).toContainText("2 casos foram para Sentença");
    expect(pedidos.find((p) => p.caminho.endsWith("/remover"))!.corpo).toEqual({ moverPara: eid(5) });
  });

  test("A equipe vê as etapas, sem editar", async ({ page }) => {
    await simular(page, comuns({ ...ESCRITORIO, pessoa: "Larissa Costa", dono: false, areas: ["JURIDICO"], funcoes: ["EQUIPE"] }, { ...LISTA, podeEditar: false }));
    await page.goto(`${P}/juridico/casos/etapas`);
    await expect(page.getByRole("heading", { name: /Preparação/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Editar/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Adicionar etapa" })).toHaveCount(0);
    await expect(page.getByText("Só a sócia dona muda esta lista. A equipe vê as etapas aqui")).toBeVisible();
    await semViolacoes(page);
  });

  test("Petições: lugar reservado, a pergunta e a resposta enviada", async ({ page }) => {
    const pedidos = await simular(page, {
      ...comuns(),
      "GET /v1/escritorio/juridico/peticoes": [{ corpo: { minhaResposta: null } }, { corpo: { minhaResposta: { resposta: "AS_VEZES", comoFazHoje: "Copio a última inicial.", em: "2026-11-19T22:00:00Z" } } }],
      "POST /v1/escritorio/juridico/peticoes": { status: 201, corpo: { resposta: "AS_VEZES", comoFazHoje: "Copio a última inicial.", em: "2026-11-19T22:00:00Z" } },
    });
    await page.goto(`${P}/juridico/peticoes`);
    await expect(page.getByRole("heading", { level: 1, name: "Petições" })).toBeVisible();
    await expect(page.getByText("Em estudo: o gerador de petições.")).toBeVisible();
    await expect(page.getByText("Vai para a equipe T3jus.")).toBeVisible();
    await page.getByRole("button", { name: "Enviar resposta" }).click();
    await expect(page.getByText("Escolha uma das três respostas.")).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("radio", { name: /Usaria às vezes/ }).check();
    await page.getByLabel("Como você faz hoje?").fill("Copio a última inicial.");
    await page.getByRole("button", { name: "Enviar resposta" }).click();
    await expect(page.getByText("Resposta enviada. Obrigado!")).toBeVisible();
    await expect(page.getByText(/Você respondeu “Usaria às vezes”/)).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")!.corpo).toEqual({ resposta: "AS_VEZES", comoFazHoje: "Copio a última inicial." });
  });

  test("Casos e processos: a sócia dona vê o botão das etapas", async ({ page }) => {
    await simular(page, { ...comuns(), "GET /v1/escritorio/juridico/casos": { corpo: { hoje: "2026-11-18", etapas: ETAPAS, totais: { andamento: 0, encerrados: 0, prazoHoje: 0 }, responsaveis: [], souDono: true, casos: [] } } });
    await page.goto(`${P}/juridico/casos`);
    await expect(page.getByRole("link", { name: "Etapas do escritório" })).toHaveAttribute("href", "/juridico/casos/etapas");
  });
});
