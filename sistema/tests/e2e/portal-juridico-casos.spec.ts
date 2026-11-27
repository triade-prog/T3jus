// Jurídico do Portal, parte 1 (telas aprovadas em docs/design/aprovadas/portal-juridico,
// estados casos, casos-vazio, novo-caso, ficha, ficha-sem-financeiro, mudar-etapa,
// mudar-etapa-erro e etapa-final): lista com a contagem por etapa, cadastro com vários
// clientes, ficha com a etapa no âmbar e a janela de mudar etapa com motivo e a prévia do
// aviso. A API é simulada; aqui se testa a tela, a acessibilidade e o que ela manda.
import { expect, test, type Page } from "@playwright/test";
import { agora, fixarRelogio, semViolacoes } from "./console-dados.ts";

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
      aviso: "Olá, Joana. Aqui é do escritório Ribeiro & Matos. Novidade no caso Pereira x Mercado Bom Preço: o juiz decidiu o caso. Vamos explicar a decisão e o que dá para fazer agora. Qualquer dúvida, é só responder esta mensagem.",
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

// O relógio do navegador fica em AGORA, o mesmo instante de onde os dados contam (F3.164).
test.beforeEach(async ({ page }) => { await fixarRelogio(page); });

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

  test("F3.37: com o WhatsApp ligado, o aviso de etapa sai para cada cliente e a ficha diz como está cada um", async ({ page }) => {
    const mudanca = {
      ...FICHA.mudancas[0],
      envios: [
        { cliente: { id: JOANA.id, nome: JOANA.nome }, situacao: "CONCLUIDA", motivo: null, mensagem: { envio: "LIDA", em: "2026-11-07T13:10:00Z", envioEm: "2026-11-07T15:00:00Z", motivo: null } },
        { cliente: { id: CARLOS.id, nome: CARLOS.nome }, situacao: "FICOU_DE_FORA", motivo: "Sem WhatsApp no contato principal da ficha.", mensagem: null },
      ],
    };
    const ficha = { ...FICHA, avisoEtapa: { whatsappLigado: true, automacaoLigada: true }, mudancas: [mudanca, FICHA.mudancas[1]] };
    await simular(page, { ...comuns(), [`GET /v1/escritorio/juridico/casos/${CASO}`]: { corpo: ficha } });
    await page.goto(`${P}/juridico/casos/${CASO}`);
    await expect(page.getByRole("region", { name: "Aviso ao cliente" })).toContainText("Sai pela automação “Etapa do caso”");
    const mud = page.getByRole("region", { name: "Mudanças de etapa" });
    await mud.getByRole("button", { name: "Ver o aviso preparado" }).click();
    await expect(mud).toContainText(`${JOANA.nome}: lido`);
    await expect(mud).toContainText(`${CARLOS.nome}: não saiu: sem WhatsApp no contato principal da ficha.`);
    await page.getByRole("button", { name: "Mudar etapa" }).click();
    await page.getByRole("dialog", { name: "Mudar etapa" }).getByRole("radio", { name: /Recurso/ }).check();
    await expect(page.getByRole("dialog", { name: "Mudar etapa" })).toContainText("Sai pela automação “Etapa do caso”, pelo WhatsApp do escritório");
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
    await expect(j.getByText("Olá, Joana. Aqui é do escritório Ribeiro & Matos. Novidade no caso Pereira x Mercado Bom Preço: vamos pedir para o tribunal rever a decisão.")).toBeVisible();
    await expect(j).toContainText("O WhatsApp do escritório ainda não está ligado ao T3jus");
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
      textoAviso: "vamos recorrer da parte das horas extras. Avisamos a cada novidade.", resultado: null, valores: null, previstoEm: null });
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
    // Com acordo, quem tem contrato informa o valor e o pagamento previsto (F3.14, EX-08).
    await j.getByRole("button", { name: "Encerrar o caso" }).click();
    await expect(j.getByLabel("Valor do acordo para Joana")).toBeFocused();
    await expect(j).toContainText("Diga o valor de Joana, em reais.");
    await expect(j.getByLabel("Valor do acordo para Carlos")).toHaveCount(0);
    await j.getByLabel("Valor do acordo para Joana").fill("28.000,00");
    await expect(j.getByRole("table", { name: /êxito calculado/ })).toContainText("Joana · 30% de R$ 28.000,00");
    await expect(j.getByRole("table", { name: /êxito calculado/ })).toContainText("R$ 8.400,00");
    await j.getByLabel("Pagamento previsto").fill("15/12/2026");
    await expect(j).toContainText("A receber em 15/12/2026");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Encerrar o caso" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Caso encerrado" })).toBeVisible();
    expect(pedidos.find((x) => x.metodo === "POST" && x.caminho.endsWith("/etapa"))!.corpo).toMatchObject({
      etapaId: eid(8), resultado: "ACORDO", avisar: false, valores: { [JOANA.id]: 2800000 }, previstoEm: "2026-12-15" });
  });

  test("EX-17: encerrado com acerto pendente, o selo, o âmbar com Ver o acerto e o quadro do Financeiro", async ({ page }) => {
    const LEV = "1e000000-0000-4000-8000-000000000001";
    const acerto = {
      pendente: true, fechado: null, comValores: true, levantamentoId: LEV,
      entrou: { tipo: "ALVARA", em: "2026-11-12", valor: 2800000 },
      exitos: [{ cliente: JOANA.nome, feito: true, naoCobrado: false, em: "2026-11-13T13:00:00Z", por: MARINA, valor: 840000 }],
      repasses: [{ cliente: JOANA.nome, feito: false, em: null, prazo: "2026-11-25", valor: 1960000 }],
      outros: [{ nome: "Dr. Paulo (perito)", valor: 120000, prazo: "2026-11-28" }], faltaOutros: true,
      contratos: [{ id: "k1", numero: "C-2026-014", situacao: "ATIVO", cliente: JOANA.nome, assinadoEm: "2026-02-20" }],
    };
    const ficha = { ...FICHA, situacao: "ENCERRADO", resultado: "ACORDO", encerradoEm: "2026-11-10T13:00:00Z", etapa: etapa(8), acerto };
    await simular(page, { ...comuns(), [`GET /v1/escritorio/juridico/casos/${CASO}`]: { corpo: ficha } });
    await page.goto(`${P}/juridico/casos/${CASO}`);
    await expect(page.getByText("Encerrado · acerto pendente")).toBeVisible();
    await expect(page.getByText(/Encerrado com acordo em 10\/11\. Falta o acerto no Financeiro: pagar Dr\. Paulo \(perito\) e encerrar\./)).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver o acerto" })).toHaveAttribute("href", `/financeiro/repasses/${LEV}`);
    const q = page.getByRole("region", { name: "Acerto no Financeiro" });
    await expect(q).toContainText("Êxito conferido");
    await expect(q).toContainText("Joana: falta repassar R$ 19.600,00");
    await expect(q).toContainText("Depois: encerrar no financeiro e o contrato C-2026-014");
    await semViolacoes(page);
  });

  // F3.191 (CH-07; PT-02), desenho D40, estados 10 e 10b (enc-acerto, enc-acerto-larissa).
  const COBRADO = { em: "2026-11-18T13:14:00Z", por: { id: "a0000000-0000-4000-8000-000000000102", nome: "Diego Almeida" } };
  const exitoCobrado = (comValores: boolean) => ({
    cliente: JOANA.nome, feito: true, naoCobrado: true, em: "2026-11-10T19:40:00Z", por: MARINA, valor: null,
    cobradoNoAlvara: comValores ? { ...COBRADO, levantamentoId: "1e000000-0000-4000-8000-000000000001", tipo: "ALVARA", entrouEm: "2026-11-18", valor: 300000 }
      : { ...COBRADO, levantamentoId: null, tipo: null, entrouEm: null, valor: null },
  });
  test("enc-acerto: o êxito não cobrado e cobrado no alvará, com o valor para quem tem o Financeiro", async ({ page }) => {
    const acerto = {
      pendente: true, fechado: null, comValores: true, levantamentoId: "1e000000-0000-4000-8000-000000000001",
      entrou: { tipo: "ALVARA", em: "2026-11-18", valor: 1500000 }, exitos: [exitoCobrado(true)],
      repasses: [{ cliente: JOANA.nome, feito: false, em: null, prazo: "2026-11-23", valor: 1200000 }], outros: [], faltaOutros: false, contratos: [],
    };
    const ficha = { ...FICHA, situacao: "ENCERRADO", resultado: "ACORDO", encerradoEm: "2026-11-10T19:30:00Z", etapa: etapa(8), acerto };
    await simular(page, { ...comuns(), [`GET /v1/escritorio/juridico/casos/${CASO}`]: { corpo: ficha } });
    await page.goto(`${P}/juridico/casos/${CASO}`);
    const q = page.getByRole("region", { name: "Acerto no Financeiro" });
    await expect(q).toContainText("Êxito não cobrado · cobrado no alvará");
    expect(((await q.textContent()) ?? "").replace(/\u00a0/g, " ")).toContain("Não cobrado por Marina em 10/11 · R$ 3.000,00 cobrados por Diego em 18/11");
    await semViolacoes(page);
  });

  test("enc-acerto-larissa: sem o Financeiro, o mesmo acerto sem valores", async ({ page }) => {
    const acerto = {
      pendente: true, fechado: null, comValores: false, levantamentoId: null, entrou: { tipo: "ALVARA", em: "2026-11-18", valor: null }, exitos: [exitoCobrado(false)],
      repasses: [{ cliente: JOANA.nome, feito: false, em: null, prazo: "2026-11-23", valor: null }], outros: null, faltaOutros: false, contratos: [],
      quemCuida: ["Marina Ribeiro"],
    };
    const ficha = { ...FICHA, situacao: "ENCERRADO", resultado: "ACORDO", encerradoEm: "2026-11-10T19:30:00Z", etapa: etapa(8), acerto };
    await simular(page, { ...comuns(), [`GET /v1/escritorio/juridico/casos/${CASO}`]: { corpo: ficha } });
    await page.goto(`${P}/juridico/casos/${CASO}`);
    const q = page.getByRole("region", { name: "Acerto no Financeiro" });
    // Revisão, M2: sem o Financeiro, o tipo do levantamento não vem (o desenho dizia "no alvará").
    await expect(q).toContainText("Êxito não cobrado · cobrado num levantamento");
    await expect(q).toContainText("Não cobrado por Marina em 10/11 · cobrado por Diego em 18/11");
    await expect(q).not.toContainText("R$");
    await semViolacoes(page);
  });

  test("EX-17: sem a área Financeiro, o quadro mostra o que falta sem valores e quem cuida", async ({ page }) => {
    const acerto = {
      pendente: true, fechado: null, comValores: false, levantamentoId: null,
      entrou: { tipo: "ALVARA", em: "2026-11-12", valor: null }, exitos: [],
      repasses: [{ cliente: JOANA.nome, feito: false, em: null, prazo: "2026-11-25", valor: null }],
      outros: null, faltaOutros: true, contratos: [], quemCuida: ["Marina Ribeiro"],
    };
    const ficha = { ...FICHA, situacao: "ENCERRADO", resultado: "GANHO", encerradoEm: "2026-11-10T13:00:00Z", etapa: etapa(8), acerto };
    await simular(page, { ...comuns(), [`GET /v1/escritorio/juridico/casos/${CASO}`]: { corpo: ficha } });
    await page.goto(`${P}/juridico/casos/${CASO}`);
    await expect(page.getByText(/O acerto está com o Financeiro\./)).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver o acerto" })).toHaveCount(0);
    const q = page.getByRole("region", { name: "Acerto no Financeiro" });
    await expect(q).toContainText("Quem cuida: Marina, da área Financeiro");
    await expect(q).toContainText("Faltam pagamentos a terceiros");
    await expect(q).not.toContainText("R$");
  });

  // F3.132 (EX-17): o caso sem levantamento, desenho aprovado em
  // docs/design/aprovadas/portal-fechamento-sem-levantamento (estados 3 e 4).
  const ACERTO_L = {
    pendente: true, fechado: null, comValores: true, levantamentoId: null, entrou: null, exitos: [], repasses: [], faltaOutros: true, quemCuida: null,
    contratoId: "k1", semTerceiros: true, semExito: true,
    outros: [
      { nome: "Joana Pereira · Parcela 6 de 6", tipo: "PARCELA", valor: 100000, prazo: "2026-11-10", cliente: JOANA.nome, descricao: "Parcela 6 de 6", vencimento: "2026-11-10", junto: null },
      { nome: "Custas iniciais", tipo: "REEMBOLSO", valor: 41230, prazo: null, cliente: JOANA.nome, categoria: "CUSTAS", vencimento: "2026-11-10", junto: "Parcela 6 de 6" },
    ],
    contratos: [{ id: "k1", numero: "C-2026-014", situacao: "ATIVO", cliente: JOANA.nome, assinadoEm: "2026-02-20", encerradoEm: null, encerradoPor: null,
      recebido: 500000, falta: 100000, ultimaRecebidaEm: "2026-10-10", tudoRecebido: false }],
  };

  test("F3.132, estado 3: sem levantamento, Ver o acerto leva à folha do contrato e o quadro diz o que receber", async ({ page }) => {
    const ficha = { ...FICHA, situacao: "ENCERRADO", resultado: "PERDA", encerradoEm: "2026-11-06T20:10:00Z", etapa: etapa(8), acerto: ACERTO_L };
    await simular(page, { ...comuns(), [`GET /v1/escritorio/juridico/casos/${CASO}`]: { corpo: ficha } });
    await page.goto(`${P}/juridico/casos/${CASO}`);
    await expect(page.getByText(/Encerrado com perda em 06\/11\. Falta o acerto no Financeiro: receber a parcela 6\/6 de Joana e as custas, e encerrar\./)).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver o acerto" })).toHaveAttribute("href", `/financeiro/a-receber/contratos/k1#t-fecha-${CASO}`);
    const q = page.getByRole("region", { name: "Acerto no Financeiro" });
    await expect(q).toContainText("Nenhum valor de terceiros entrou");
    await expect(q).toContainText("Sem êxito a cobrar");
    await expect(q).toContainText("Joana: falta a parcela 6/6, R$ 1.000,00");
    await expect(q).toContainText("Custas adiantadas: falta o reembolso de R$ 412,30");
    await expect(q).toContainText("Depois: encerrar no financeiro e o contrato C-2026-014");
    await expect(page.getByRole("region", { name: "Contratos ligados" })).toContainText("ativo até o acerto");
    await semViolacoes(page);
  });

  test("F3.132, estado 4 (PT-02): sem o Financeiro, sem valores nem link", async ({ page }) => {
    const acerto = { ...ACERTO_L, comValores: false, contratoId: null, outros: null, quemCuida: ["Marina Ribeiro"],
      contratos: [{ id: "k1", numero: "C-2026-014", situacao: "ATIVO", cliente: JOANA.nome, assinadoEm: "2026-02-20", encerradoEm: null, encerradoPor: null }] };
    const ficha = { ...FICHA, situacao: "ENCERRADO", resultado: "PERDA", encerradoEm: "2026-11-06T20:10:00Z", etapa: etapa(8), acerto };
    await simular(page, { ...comuns(), [`GET /v1/escritorio/juridico/casos/${CASO}`]: { corpo: ficha } });
    await page.goto(`${P}/juridico/casos/${CASO}`);
    await expect(page.getByRole("link", { name: "Ver o acerto" })).toHaveCount(0);
    const q = page.getByRole("region", { name: "Acerto no Financeiro" });
    await expect(q).toContainText("O acerto está com o Financeiro");
    await expect(q).toContainText("Depois: encerrar no financeiro");
    await expect(q).not.toContainText("R$");
    await expect(q).not.toContainText("C-2026-014");
    await semViolacoes(page);
  });

  test("F3.132: encerrar com perda avisa que o caso espera o Financeiro", async ({ page }) => {
    await simular(page, comuns());
    await page.goto(`${P}/juridico/casos/${CASO}`);
    await page.getByRole("button", { name: "Mudar etapa" }).click();
    await page.getByRole("radio", { name: /Encerrado/ }).check();
    const j = page.getByRole("dialog", { name: "Encerrar o caso" });
    await j.getByRole("radio", { name: /Perda/ }).check();
    await expect(j).toContainText("O caso fica “Encerrado · acerto pendente” até o Financeiro encerrar.");
    await semViolacoes(page);
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

  // F3.143, F3.148 (docs/design/aprovadas/portal-importacao-sobras, estados encerrados e
  // encerrado-importado; rodada 2, resultado, resultado-erro, resultado-feito e encerrados-desfeitos).
  const ORIGEM = { sistema: "ASTREA", arquivadoEm: null, importadoEm: "2026-11-21T19:52:00Z", desfeitaEm: null };
  const QUEIROZ = "a1000000-0000-4000-8000-000000000009";
  const ENCERRADOS = {
    ...LISTA, totais: { andamento: 246, encerrados: 88, prazoHoje: 0 }, total: 88, pular: 0,
    como: { resultado: 14, importados: 71, desfeitos: 3 }, origensImportados: ["ASTREA"],
    casos: [
      { ...LINHA, id: "a1000000-0000-4000-8000-000000000007", nome: "Souza x Telecom Aurora", situacao: "ENCERRADO", etapa: etapa(8), encerradoPor: "IMPORTACAO_DESFEITA",
        origem: { ...ORIGEM, importadoEm: "2026-11-20T15:00:00Z", desfeitaEm: "2026-11-21T15:00:00Z" }, acerto: null },
      { ...LINHA, id: "a1000000-0000-4000-8000-000000000008", nome: "Castro x Banco Horizonte", situacao: "ENCERRADO", resultado: "GANHO", etapa: etapa(8),
        etapaDesde: "2026-10-30T15:00:00Z", encerradoPor: "RESULTADO", origem: null, acerto: "FEITO" },
      { ...LINHA, id: QUEIROZ, nome: "Queiroz x Construtora Lume", situacao: "ENCERRADO", etapa: etapa(8), encerradoPor: "IMPORTADO_ENCERRADO", origem: ORIGEM, acerto: null },
    ],
  };
  const FICHA_IMP = {
    ...FICHA, id: QUEIROZ, nome: "Queiroz x Construtora Lume", situacao: "ENCERRADO", etapa: etapa(8), encerradoPor: "IMPORTADO_ENCERRADO", versao: 2,
    clientes: [{ ...JOANA, nome: "Renata Queiroz", papel: "AUTOR", telefone: "+5511988412073", contrato: null }],
    mudancas: [{ para: { ordem: 8, nome: "Encerrado" }, de: null, motivo: "Importado do Astrea", resultado: null, aviso: null, avisoEnviadoEm: null, por: MARINA, em: "2026-11-21T19:52:00Z" }],
    origem: { importacaoId: "f1000000-0000-4000-8000-000000000001", sistema: "ASTREA", em: "2026-11-21T19:52:00Z", por: MARINA, desfeitaEm: null, etapaOrigem: "Arquivado",
      linhaOrigem: 203, abaOrigem: "Processos", registroOrigem: null, arquivadoEm: null, veioEncerrado: true, etapaLigada: { ordem: 8, nome: "Encerrado" } },
    resultadoRegistrado: null, lembretes: [], podeRegistrarResultado: true, acerto: null,
  };

  test("F3.143: Encerrados com \"Como encerrou\", os selos, a contagem, o filtro pela URL e a página de 25", async ({ page }) => {
    const pedidos = await simular(page, { ...comuns(), "GET /v1/escritorio/juridico/casos": { corpo: ENCERRADOS } });
    await page.goto(`${P}/juridico/casos?situacao=ENCERRADO&como=importado`);
    await expect.poll(() => pedidos.find((p) => p.caminho === "/v1/escritorio/juridico/casos")?.busca).toContain("como=importado");
    await expect(page.getByRole("combobox", { name: "Como encerrou" })).toHaveValue("IMPORTADO");
    await page.getByRole("combobox", { name: "Como encerrou" }).selectOption("");
    await expect(page.getByRole("status").filter({ hasText: "casos encerrados" }))
      .toContainText("88 casos encerrados · 14 com resultado, 71 que vieram encerrados do Astrea e 3 com a importação desfeita · do mais recente para o mais antigo");
    const tab = page.getByRole("table", { name: "Casos" });
    await expect(tab.getByRole("columnheader", { name: "Como encerrou" })).toBeVisible();
    await expect(tab.getByRole("row", { name: /Queiroz/ })).toContainText("Veio encerrado");
    await expect(tab.getByRole("row", { name: /Queiroz/ })).toContainText("sem resultado · importado do Astrea em 21/11/2026");
    await expect(tab.getByRole("row", { name: /Souza/ })).toContainText("Importação desfeita");
    await expect(tab.getByRole("row", { name: /Souza/ })).toContainText("sem resultado · importação do Astrea de 20/11 desfeita em 21/11/2026");
    await expect(tab.getByRole("row", { name: /Castro/ })).toContainText("encerrado em 30/10/2026 · acerto feito");
    await expect(page.getByText("O de importação desfeita também fica, sem resultado.")).toBeVisible();
    await expect(page.getByText("Mostrando 3 de 88")).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Mostrar mais 25" }).click();
    await expect.poll(() => pedidos.filter((p) => p.caminho === "/v1/escritorio/juridico/casos").at(-1)?.busca).toContain("pular=3");
  });

  test("F3.143, F3.148: o caso que veio encerrado, a linha da importação e registrar o resultado", async ({ page }) => {
    const feito = { ...FICHA_IMP, encerradoPor: "RESULTADO", resultado: "GANHO", versao: 3, podeRegistrarResultado: false,
      resultadoRegistrado: { em: new Date(agora).toISOString(), por: MARINA },
      mudancas: [{ para: { ordem: 8, nome: "Encerrado" }, de: { ordem: 8, nome: "Encerrado" }, motivo: "Sentença procedente, confirmada pelo TRT.", resultado: "GANHO", aviso: null, avisoEnviadoEm: null, por: MARINA, em: new Date(agora).toISOString() },
        ...FICHA_IMP.mudancas] };
    const pedidos = await simular(page, {
      ...comuns(),
      [`GET /v1/escritorio/juridico/casos/${QUEIROZ}`]: [{ corpo: FICHA_IMP }, { corpo: feito }],
      [`POST /v1/escritorio/juridico/casos/${QUEIROZ}/resultado`]: { corpo: { id: QUEIROZ, versao: 3, resultado: "GANHO" } },
    });
    await page.goto(`${P}/juridico/casos/${QUEIROZ}`);
    await expect(page.getByRole("heading", { level: 1, name: "Queiroz x Construtora Lume" })).toBeVisible();
    const origem = page.getByRole("region", { name: "Origem do caso" });
    await expect(origem).toContainText("Veio da importação do Astrea");
    await expect(origem).toContainText("21/11/2026, 16h52");
    await expect(origem).toContainText("“Arquivado”, ligada a 8. Encerrado");
    await expect(origem).toContainText("Linha P203 da aba Processos");
    await expect(origem.getByRole("link", { name: "Ver o resultado da importação" })).toHaveAttribute("href", "/clientes/importacoes/f1000000-0000-4000-8000-000000000001");
    await expect(page.getByText("Entrou encerrado, sem resultado e sem acerto.")).toBeVisible();
    const res = page.getByRole("region", { name: "Resultado" });
    await expect(res).toContainText("Sem resultado");
    await semViolacoes(page);
    await res.getByRole("button", { name: "Registrar o resultado" }).click();
    const j = page.getByRole("dialog", { name: "Registrar o resultado de Queiroz x Construtora Lume" });
    await expect(j).toContainText("O Astrea não diz como o caso terminou. Registre aqui o que aconteceu.");
    await expect(j).toContainText("Nenhuma mensagem vai para Renata.");
    await j.getByRole("textbox", { name: "Motivo" }).fill("ok");
    await j.getByRole("button", { name: "Registrar o resultado" }).click();
    await expect(j).toContainText("Falta acertar 2 pontos, marcados abaixo.");
    await expect(j).toContainText("Nada foi registrado: o caso continua encerrado e sem resultado, como veio do Astrea.");
    await expect(j).toContainText("Escolha o resultado: ganho, perda ou acordo.");
    await expect(j).toContainText("O motivo está curto.");
    await expect(j.getByRole("radio", { name: /Ganho/ })).toBeFocused();
    await semViolacoes(page);
    await j.getByRole("radio", { name: /Ganho/ }).check();
    await j.getByRole("textbox", { name: "Motivo" }).fill("Sentença procedente, confirmada pelo TRT.");
    await j.getByRole("button", { name: "Registrar o resultado" }).click();
    await expect(page.getByText("Resultado registrado: ganho.")).toBeVisible();
    await expect(page.getByText("Nenhum aviso foi a Renata.")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")?.corpo).toEqual({ versao: 2, resultado: "GANHO", motivo: "Sentença procedente, confirmada pelo TRT." });
    await expect(page.getByRole("region", { name: "Resultado" })).toContainText("Registrado hoje por Marina Ribeiro.");
    await expect(page.getByText("Resultado registrado hoje, por Marina Ribeiro.")).toBeVisible();
    await expect(page.getByRole("region", { name: "Origem do caso" })).toBeVisible();
  });
});
