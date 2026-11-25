// Prazo do comprovante de residência (F3.134, AP-08), desenho aprovado em
// docs/design/aprovadas/portal-prazo-comprovante: a folha "Prazo do comprovante" em Jurídico ›
// Documentos para começar, a prévia do efeito, salvar, o erro, a falha, a equipe e o reflexo na
// ficha do cliente. A API é simulada; aqui se testa a tela, a acessibilidade e o que vai ao servidor.
import { expect, test, type Page } from "@playwright/test";
import { agora, fixarRelogio, h, semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const CLI = "c1000000-0000-4000-8000-000000000201";
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};
const LARISSA = { ...ESCRITORIO, pessoa: "Larissa Costa", dono: false, areas: ["JURIDICO"], funcoes: ["EQUIPE"] };
const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(agora + n * 864e5));
const DOCS_URL = "/v1/escritorio/juridico/documentos-inicio";
const PRAZO_URL = "/v1/escritorio/juridico/documentos-inicio/prazo-comprovante";

const item = (n: number, nome: string, x: Record<string, unknown> = {}) => ({
  id: `d2000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`, ordem: n, nome, comoPedir: null, pessoal: null, seHouver: false, versao: 1, ...x,
});
const prev = (dias: number) => [
  item(1, "RG e CPF, ou CNH", { pessoal: "RG_CPF", comoPedir: "Documento com foto e o CPF." }),
  item(2, "Comprovante de residência", { pessoal: "COMPROVANTE_RESIDENCIA", comoPedir: `Conta de luz, água ou telefone dos últimos ${dias} dias.` }),
  item(3, "Extrato do CNIS", { comoPedir: "Pelo Meu INSS. Se não conseguir, a gente ajuda." }),
];
const LISTAS = (x: Record<string, unknown> = {}) => {
  const dias = (x.validadeDias as number | undefined) ?? 90;
  return {
    podeEditar: true, podeMudarPrazo: true, sociosDonos: ["Marina Ribeiro"], validadeDias: dias,
    comprovantesTotal: 41, comprovantesVencidos: 3, listasComFrase: 4,
    areas: [
      { area: "PREVIDENCIARIO", itens: prev(dias), sugestao: [] },
      { area: "TRABALHISTA", itens: [], sugestao: [] },
    ],
    ...x,
  };
};
const PREVIA = (x: Record<string, unknown> = {}) => ({
  dias: 60, atual: 90, totalComComprovante: 41, vencidosAgora: 3, vencidosCom: 7,
  passamAQtd: 4,
  passamA: [["Eduardo Nascimento", 84], ["Gabriela Teixeira", 77], ["Benedito Souza", 71], ["Sílvia Ramos", 64]]
    .map(([nome, dias], i) => ({ clienteId: `c1000000-0000-4000-8000-00000000030${i}`, nome, dias })),
  voltamAEmDiaQtd: 0, voltamAEmDia: [], listasComFrase: 4, itensComFrase: 4, ...x,
});
const PREVIA_180 = PREVIA({
  dias: 180, vencidosCom: 0, passamAQtd: 0, passamA: [], voltamAEmDiaQtd: 3,
  voltamAEmDia: [
    { clienteId: CLI, nome: "Antônia Ferreira Prado", dias: 139, dataDocumento: "2026-07-02",
      pedidos: [{ casoId: "ca000000-0000-4000-8000-000000000001", caso: "Ferreira Prado x INSS", pedidoEm: dia(0), contato: { nome: "Joana Prado", papel: "Filha" }, peloWhatsapp: true }] },
    { clienteId: "c1000000-0000-4000-8000-000000000311", nome: "Irene Castro", dias: 118, dataDocumento: "2026-07-23", pedidos: [] },
    { clienteId: "c1000000-0000-4000-8000-000000000312", nome: "Hélio Batista", dias: 97, dataDocumento: "2026-08-13", pedidos: [] },
  ],
});

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
const folhaPrazo = (page: Page) => page.getByRole("region", { name: "Prazo do comprovante" });

// O relógio do navegador fica em AGORA, o mesmo instante de onde os dados contam (F3.164).
test.beforeEach(async ({ page }) => { await fixarRelogio(page); });

test.describe("Prazo do comprovante (F3.134, AP-08)", () => {
  test("a sócia dona muda para 60 dias: vê o efeito antes, salva e a lista diz o prazo novo", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      [`GET ${DOCS_URL}`]: [{ corpo: LISTAS() }, { corpo: LISTAS({ validadeDias: 60, comprovantesVencidos: 7 }) }],
      [`GET ${PRAZO_URL}/previa?dias=60`]: { corpo: PREVIA() },
      [`PUT ${PRAZO_URL}`]: { corpo: { validadeDias: 60, de: 90, mudou: true, passaramA: 4, voltaramAEmDia: 0, textosTrocados: 4, listasTrocadas: 4, naoCouberam: 0 } },
    });
    await page.goto(`${P}/juridico/casos/documentos`);
    const folha = folhaPrazo(page);
    await expect(folha).toContainText("90 dias");
    await expect(folha).toContainText("contados da data que está no papel · o padrão do T3jus");
    await expect(folha).toContainText("Hoje, 3 dos 41 comprovantes nas fichas dos clientes têm mais de 90 dias e estão em “Precisa de atenção”.");
    await expect(folha).toContainText("Só você, como sócia dona, muda. Cada mudança fica no histórico do escritório.");
    await expect(page.getByRole("complementary", { name: "Prazo do comprovante e como funcionam os documentos para começar" })).toBeVisible();
    await expect(page.getByText("O prazo fica no quadro “Prazo do comprovante”, acima.")).toBeVisible();
    await semViolacoes(page);

    // O link no item do comprovante abre a folha em edição, com o foco no rádio marcado.
    const lista = page.getByRole("region", { name: "Documentos de previdenciário" });
    await expect(lista).toContainText("O prazo vale para todas as áreas.");
    await lista.getByRole("link", { name: "Mudar o prazo" }).click();
    const grupo = folha.getByRole("group", { name: "Quanto tempo o comprovante vale" });
    await expect(grupo.getByRole("radio", { name: /90 dias · o padrão/ })).toBeFocused();
    await grupo.getByRole("radio", { name: /^60 dias/ }).check();
    const efeito = folha.getByRole("status").filter({ hasText: "Com 60 dias" });
    await expect(efeito).toContainText("4 comprovantes passam a ficar com “Mais de 60 dias” e sobem para “Precisa de atenção” na ficha. Com os 3 que já tinham mais de 90, são 7 de 41.");
    await expect(efeito.getByRole("list", { name: "Passam a ter mais de 60 dias" }).getByRole("listitem")).toHaveCount(4);
    await expect(efeito).toContainText("Eduardo Nascimento84 dias");
    const caixa = folha.getByRole("checkbox", { name: /Trocar também no texto que vai ao cliente/ });
    await expect(caixa).toBeChecked();
    await expect(folha).toContainText("“dos últimos 90 dias” passa a “dos últimos 60 dias” no comprovante das 4 listas que dizem o prazo.");
    await semViolacoes(page);

    await folha.getByRole("button", { name: "Salvar o prazo" }).click();
    await expect(folha.getByText("O prazo agora é de 60 dias.")).toBeVisible();
    await expect(folha).toContainText("Os selos das fichas já mudaram: 4 comprovantes passaram a “Mais de 60 dias”. O texto ao cliente passou a dizer “dos últimos 60 dias” em 4 listas. Nenhum pedido saiu agora");
    await expect(folha).toContainText(/Mudado por você hoje, às \d\dh\d\d: de 90 para 60 dias\./);
    await expect(lista).toContainText("Vale 60 dias");
    await expect(lista).toContainText("“Conta de luz, água ou telefone dos últimos 60 dias.”");
    const put = pedidos.filter((p) => p.metodo === "PUT");
    expect(put).toHaveLength(1);
    expect(put[0]!.corpo).toEqual({ validadeDias: 60, trocarTexto: true });
    expect(pedidos.filter((p) => p.caminho.endsWith("/previa") && p.metodo === "GET").map((p) => p.busca)).toEqual(["?dias=60"]);
    await semViolacoes(page);
  });

  test("com 180 dias, 3 voltam a em dia e o pedido aberto continua", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      [`GET ${DOCS_URL}`]: { corpo: LISTAS() },
      [`GET ${PRAZO_URL}/previa?dias=180`]: { corpo: PREVIA_180 },
    });
    await page.goto(`${P}/juridico/casos/documentos`);
    const folha = folhaPrazo(page);
    await folha.getByRole("button", { name: "Mudar o prazo" }).click();
    await folha.getByRole("radio", { name: /^180 dias/ }).check();
    const efeito = folha.getByRole("status").filter({ hasText: "Com 180 dias" });
    await expect(efeito).toContainText("3 comprovantes voltam a “Em dia”. Nenhum comprovante fica com mais de 180 dias.");
    await expect(efeito).toContainText("O pedido de comprovante novo para o caso de Antônia, feito hoje pelo WhatsApp a Joana Prado, filha de Antônia, continua aberto. Se o de 02/07 servir, marque “Já chegou” no caso.");
    await semViolacoes(page);
    // Cancelar volta ao botão.
    await folha.getByRole("button", { name: "Cancelar" }).click();
    await expect(folha.getByRole("button", { name: "Mudar o prazo" })).toBeFocused();
  });

  test("outro prazo fora de 30 a 365: nada vai ao servidor e o foco vai ao campo", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      [`GET ${DOCS_URL}`]: { corpo: LISTAS() },
    });
    await page.goto(`${P}/juridico/casos/documentos`);
    const folha = folhaPrazo(page);
    await folha.getByRole("button", { name: "Mudar o prazo" }).click();
    await folha.getByRole("radio", { name: /Outro prazo/ }).check();
    await folha.getByLabel("Quantos dias").fill("400");
    await expect(folha.getByRole("status").filter({ hasText: "Com outro prazo" })).toContainText("Escreva de 30 a 365 dias para ver quantos comprovantes mudam.");
    await folha.getByRole("button", { name: "Salvar o prazo" }).click();
    await expect(folha.getByRole("alert").filter({ hasText: "O prazo não foi salvo." })).toContainText("O prazo vai de 30 a 365 dias. Ele continua em 90 dias.");
    await expect(folha.getByLabel("Quantos dias")).toBeFocused();
    await expect(folha.getByLabel("Quantos dias")).toHaveAttribute("aria-invalid", "true");
    await expect(folha).toContainText("Escreva de 30 a 365 dias. O padrão é 90.");
    expect(pedidos.filter((p) => p.metodo === "PUT" || p.caminho.endsWith("/previa"))).toHaveLength(0);
    await semViolacoes(page);
  });

  test("falha do servidor: nada mudou, a escolha continua e o código vai ao suporte", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      [`GET ${DOCS_URL}`]: { corpo: LISTAS() },
      [`GET ${PRAZO_URL}/previa?dias=60`]: { corpo: PREVIA() },
      [`PUT ${PRAZO_URL}`]: { status: 500, corpo: { erro: { codigo: "INTERNAL_ERROR" } } },
    });
    await page.goto(`${P}/juridico/casos/documentos`);
    const folha = folhaPrazo(page);
    await folha.getByRole("button", { name: "Mudar o prazo" }).click();
    await folha.getByRole("radio", { name: /^60 dias/ }).check();
    await folha.getByRole("button", { name: "Salvar o prazo" }).click();
    const aviso = folha.getByRole("alert").filter({ hasText: "Não deu para salvar o prazo." });
    await expect(aviso).toContainText("Nada mudou: o prazo continua em 90 dias, e os selos também.");
    await expect(aviso).toContainText("diga o código INTERNAL_ERROR");
    await expect(folha.getByRole("radio", { name: /^60 dias/ })).toBeChecked();
    await semViolacoes(page);
  });

  test("a equipe vê o prazo e quem muda, sem botão; com dois sócios donos, os dois nomes", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: LARISSA },
      [`GET ${DOCS_URL}`]: [
        { corpo: LISTAS({ podeEditar: false, podeMudarPrazo: false }) },
        { corpo: LISTAS({ podeEditar: false, podeMudarPrazo: false, sociosDonos: ["Marina Ribeiro", "Felipe Matos"] }) },
      ],
    });
    await page.goto(`${P}/juridico/casos/documentos`);
    const folha = folhaPrazo(page);
    await expect(folha).toContainText("Hoje, 3 dos 41 comprovantes");
    await expect(folha).toContainText("Quem muda é Marina Ribeiro, a sócia dona.");
    await expect(folha.getByRole("button")).toHaveCount(0);
    await expect(page.getByText("Jurídico · você vê; quem edita é a sócia dona")).toBeVisible();
    const lista = page.getByRole("region", { name: "Documentos de previdenciário" });
    await expect(lista).toContainText("O prazo vale para todas as áreas. Quem muda é Marina Ribeiro, a sócia dona.");
    await expect(lista).toContainText("Quem muda as listas e o prazo é Marina Ribeiro, a sócia dona.");
    await expect(page.getByRole("link", { name: "Mudar o prazo" })).toHaveCount(0);
    await semViolacoes(page);
    await page.reload();
    await expect(folha).toContainText("Quem muda são os sócios donos: Marina Ribeiro e Felipe Matos.");
    await expect(lista).toContainText("Quem muda as listas e o prazo são os sócios donos: Marina Ribeiro e Felipe Matos.");
  });

  test("sem comprovante nas fichas: nenhum selo muda; sem a frase nas listas, a caixa some", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      [`GET ${DOCS_URL}`]: [{ corpo: LISTAS({ comprovantesTotal: 0, comprovantesVencidos: 0 }) }, { corpo: LISTAS({ listasComFrase: 0 }) }],
      [`GET ${PRAZO_URL}/previa?dias=60`]: { corpo: PREVIA() },
    });
    await page.goto(`${P}/juridico/casos/documentos`);
    const folha = folhaPrazo(page);
    await expect(folha).toContainText("Ainda não há comprovante de residência nas fichas dos clientes. O prazo passa a contar quando o primeiro for anexado, pela data do papel.");
    await folha.getByRole("button", { name: "Mudar o prazo" }).click();
    await folha.getByRole("radio", { name: /^60 dias/ }).check();
    await expect(folha.getByRole("status").filter({ hasText: "Com 60 dias" })).toContainText("Nenhum selo muda agora: ainda não há comprovante de residência nas fichas dos clientes.");
    await semViolacoes(page);
    expect(pedidos.filter((p) => p.caminho.endsWith("/previa"))).toHaveLength(0);

    await page.reload();
    await folha.getByRole("button", { name: "Mudar o prazo" }).click();
    await folha.getByRole("radio", { name: /^60 dias/ }).check();
    await expect(folha.getByRole("checkbox")).toHaveCount(0);
    await expect(folha).toContainText("Nenhuma lista diz “dos últimos 90 dias” no texto que vai ao cliente, então não há texto para trocar.");
  });

  test("a ficha do cliente diz o prazo e leva até ele; a equipe lê quem muda", async ({ page }) => {
    const FICHA = {
      id: CLI, tipo: "PF", nome: "Antônia Ferreira Prado", documento: "52998224725", nacionalidade: "brasileira", estadoCivil: "VIUVO", profissao: "Aposentada",
      rg: "12.345.678-9", rgOrgao: "SSP/SP", cep: "04117030", endereco: "Rua das Acácias, 418", bairro: "Vila Mariana", cidade: "São Paulo", uf: "SP",
      repNome: null, repCargo: null, repDocumento: null, repEstadoCivil: null, repProfissao: null, situacao: "ATIVO", inativadoEm: null,
      motivoInativacao: null, inativadoPor: null, criadoEm: h(24 * 22), criadoPor: MARINA, versao: 3, comercial: true, podeInativar: true, faltando: [],
      alterado: null, contatos: [{ id: "d0000000-0000-4000-8000-000000000201", nome: "Joana Prado", papel: "Filha", telefone: "+5511987654321", email: null, principal: true }],
      origem: "GOOGLE", origemIndicacao: null, atendimentos: 4, primeiroAtendimento: null, proxContato: null, passo: null,
      contagens: { propostas: 1, contratos: 1, casos: 1 }, noEscritorio: null,
    };
    const comp = (x: Record<string, unknown>) => ({
      id: "f1000000-0000-4000-8000-000000000003", tipo: "COMPROVANTE_RESIDENCIA", descricao: null, dataDocumento: dia(-139), nome: "conta.pdf",
      arquivoTipo: "application/pdf", tamanho: 380000, fotos: null, enviadoPor: MARINA, enviadoEm: `${dia(-21)}T15:00:00Z`, dias: 139, vencido: true, anteriores: 0, ...x,
    });
    const docs = (x: Record<string, unknown>) => ({ hoje: dia(0), validadeDias: 60, podeAnexar: true, podeMudarPrazo: true, sociosDonos: ["Marina Ribeiro"], documentos: [comp({})], pedidos: [], ...x });
    await simular(page, {
      "/v1/escritorio": [{ corpo: ESCRITORIO }],
      [`GET /v1/escritorio/clientes/${CLI}`]: { corpo: FICHA },
      "/v1/escritorio/pessoas": { corpo: { pessoas: [MARINA] } },
      [`GET /v1/escritorio/clientes/${CLI}/documentos`]: [
        { corpo: docs({}) },
        { corpo: docs({ podeMudarPrazo: false, podeAnexar: false }) },
        { corpo: docs({ documentos: [comp({ dataDocumento: dia(-20), dias: 20, vencido: false })] }) },
      ],
    });
    await page.goto(`${P}/clientes/${CLI}`);
    const folha = page.getByRole("region", { name: "Documentos pessoais" });
    await expect(folha).toContainText("Mais de 60 dias");
    await expect(folha).toContainText("O escritório aceita até 60 dias. Mudar o prazo");
    await expect(folha.getByRole("link", { name: "Mudar o prazo" })).toHaveAttribute("href", "/juridico/casos/documentos#prazo");
    await semViolacoes(page);
    await page.reload();
    await expect(folha).toContainText("O escritório aceita até 60 dias; quem muda o prazo é Marina Ribeiro, a sócia dona.");
    await expect(folha.getByRole("link", { name: "Mudar o prazo" })).toHaveCount(0);
    await page.reload();
    await expect(folha).toContainText("Em dia · 20 dias");
    await expect(folha.getByRole("link", { name: "Mudar o prazo" })).toBeVisible();
  });
});
