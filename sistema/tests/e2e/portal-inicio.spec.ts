// Início do Portal por áreas (F3.26; PD-01 a PD-07, PA-01, PA-02), tela aprovada em
// docs/design/aprovadas/portal-inicio-areas. O bloco Comercial é o de contatos do dia (F1.14,
// AP-06). A API é simulada.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const cid = (n: number) => `c1000000-0000-4000-8000-0000000002${String(n).padStart(2, "0")}`;
const DIEGO = { id: "a0000000-0000-4000-8000-000000000103", nome: "Diego Almeida" };
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };

const BASE = {
  id: ESC, nome: "Ribeiro & Matos", socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, cnpj: null, cidade: "São Paulo", uf: "SP",
  endereco: null, contatos: [], ultimaExportacao: null,
};
const ESC_DIEGO = { ...BASE, pessoa: "Diego Almeida", dono: false, areas: ["COMERCIAL"], funcoes: ["EQUIPE"] };
const ESC_MARINA = { ...BASE, pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"], funcoes: ["SOCIO"] };
const ESC_BIANCA = { ...BASE, pessoa: "Bianca Torres", dono: false, areas: ["CONTRATOS", "FINANCEIRO"], funcoes: ["EQUIPE"] };
const ESC_PAULA = { ...BASE, pessoa: "Paula Nunes", dono: false, areas: [], funcoes: ["EQUIPE"] };
const ESC_LARISSA = { ...BASE, pessoa: "Larissa Costa", dono: false, areas: ["JURIDICO"], funcoes: ["EQUIPE"] };

const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + n * 864e5));
const item = (n: number, nome: string, atraso: number, oque: string, resp = DIEGO) => ({
  clienteId: cid(n), tipo: "PF", nome, em: dia(-atraso), oque, vencido: atraso > 0, diasAtraso: atraso, responsavel: resp,
  contatoPrincipal: { id: `k${n}`, nome: nome.split(" ")[0], papel: n === 2 ? "filha" : null, telefone: `+55119912345${String(n).padStart(2, "0")}`, email: null },
});
const VENCIDOS = [item(1, "Hélio Batista Corrêa", 8, "Cobrar os exames da perícia"), item(2, "Antônia Ferreira Prado", 5, "Ligar para Joana sobre a carta do INSS"),
  item(3, "Daniela Rocha Mendes", 1, "Mandar a proposta de honorários")];
const HOJE = [item(4, "Rafael Moura Santos", 0, "Confirmar a reunião de sexta, às 14h"), item(5, "Lúcia Helena Barros", 0, "Pedir a carteira de trabalho digitalizada")];
const contatos = (x: Record<string, unknown> = {}) => ({
  de: "MEUS", dono: false, vencidos: VENCIDOS, hoje: HOJE, totalVencidos: 3, totalHoje: 2, maisAntigo: dia(-8), proximo: null,
  equipeVencidos: null, pedidosExclusao: null, ...x,
});
const FICHA = {
  id: cid(2), tipo: "PF", nome: "Antônia Ferreira Prado", documento: null, nacionalidade: null, estadoCivil: null, profissao: null, rg: null, rgOrgao: null,
  cep: null, endereco: null, bairro: null, cidade: null, uf: null, repNome: null, repCargo: null, repDocumento: null, repEstadoCivil: null, repProfissao: null,
  situacao: "ATIVO", inativadoEm: null, motivoInativacao: null, inativadoPor: null, criadoEm: dia(-20), criadoPor: null, versao: 3, comercial: true,
  podeInativar: true, faltando: [], alterado: null, dono: false, pedidoExclusao: null, ultimaRecusa: null, exclusao: null,
  contatos: [{ id: "k2", nome: "Joana Prado", papel: "Filha", telefone: "+5511991234567", email: null, principal: true }],
  proxContato: { em: dia(-5), oque: "Ligar para Joana sobre a carta do INSS", vencido: true, responsavel: DIEGO },
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
    const vez = pedidos.filter((p) => p.caminho === caminho && p.metodo === metodo && p.busca === url.search).length - 1;
    const x = lista[Math.min(vez, lista.length - 1)]!;
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return pedidos;
}
const bloco = (page: Page, nome = "Comercial") => page.getByRole("region", { name: nome, exact: true });
const vazioBloco = { total: 0, mostrando: 0, grupos: [] };
const resumo = (x: Record<string, unknown> = {}) => ({ areas: ["COMERCIAL"], dono: false, pedem: { COMERCIAL: 5 }, total: 5, compromissos: 2,
  proximoCompromisso: { tipo: "AUDIENCIA", tipoEscrito: null, inicio: `${dia(0)}T23:30:00-03:00` }, ...x });
const AUDIENCIAS = { de: dia(1), ate: dia(7), total: 2, seguinte: { id: "a9", inicio: `${dia(9)}T13:30:00-03:00`, titulo: "Instrução · Lima x Padaria Estrela" }, itens: [
  { id: "a2", tipo: "AUDIENCIA", tipoEscrito: null, titulo: "Instrução · Corrêa x Rota Sul", inicio: `${dia(1)}T13:30:00-03:00`, fim: `${dia(1)}T15:00:00-03:00`,
    modalidade: "PRESENCIAL", local: "TRT-2, Barra Funda", situacao: "MARCADO", lembrete: true, responsavel: MARINA, tambemVai: [{ id: "g", nome: "Gustavo Lima" }], cliente: null },
  { id: "a3", tipo: "AUDIENCIA", tipoEscrito: null, titulo: "Conciliação · Castro x Seguradora Leste", inicio: `${dia(6)}T10:30:00-03:00`, fim: `${dia(6)}T11:30:00-03:00`,
    modalidade: "VIRTUAL", local: "CEJUSC Pinheiros", situacao: "MARCADO", lembrete: true, responsavel: { id: "f", nome: "Felipe Matos" }, tambemVai: [], cliente: null }] };
const COMUNS = {
  "GET /v1/escritorio/inicio/audiencias": { corpo: AUDIENCIAS },
  [`GET /v1/escritorio/agenda?de=${dia(0)}&ate=${dia(0)}`]: { corpo: { juridico: false, algum: true, feriados: [], prazos: null, tiposEscritos: [], compromissos: [
    { id: "a1", tipo: "AUDIENCIA", tipoEscrito: null, titulo: "Conciliação · Ferreira x Banco Horizonte", inicio: `${dia(0)}T23:30:00-03:00`, fim: `${dia(0)}T23:50:00-03:00`,
      modalidade: "VIRTUAL", local: null, situacao: "MARCADO", lembrete: false, responsavel: MARINA, tambemVai: [], cliente: null }] } },
  "GET /v1/escritorio/conversas?mostrar=PRECISA": { corpo: { whatsapp: { situacao: "LIGADO", numero: null, quemLiga: null }, eu: MARINA.id,
    contagem: { precisa: 1, equipe: 0, ia: 0, resolvidas: 0 }, hoje: { resolvidas: 0, respondidas: 0, avisos: 0 }, conversas: [
      { id: "v1", nome: "Daniela Souza", telefone: "+5511999990000", cliente: null, quemEscreve: null, papel: null, situacao: "PRECISA", resolvidaEm: null,
        motivo: "CLIENTE_NOVO", responsavel: null, assumidaPor: null, esperandoDesde: new Date(Date.now() - 2 * 3600e3).toISOString(), ultimaEm: new Date().toISOString(),
        ultima: { autor: "CLIENTE", texto: "Fui demitida grávida, vocês atendem esse tipo de caso?", anexo: null } }] } },
};

const D = { id: "z", nome: "Diego Almeida" };
const contratosDados = (de = "MEUS") => ({
  de, pedem: 1, paradas: 1, assinaturas: 1, esperandoEtapa: 4, proximo: null, total: 2, mostrando: 2,
  grupos: [
    { chave: "VENCIDOS", total: 1, itens: [{ tipo: "BASE", id: "b1", em: dia(-8), pedirEm: dia(-13), responsavel: MARINA, percentual: 3000, sobre: "do benefício",
      contrato: { id: "c22", numero: "C-2026-022" }, cliente: { id: cid(1), nome: "Hélio Batista Corrêa" } }] },
    { chave: "ACOMPANHAR", total: 1, itens: [{ tipo: "ASSINATURA", id: "c33", em: dia(2), responsavel: MARINA, contrato: { id: "c33", numero: "C-2026-033" },
      cliente: { id: cid(2), nome: "Benedito Souza Lima" }, compromisso: { id: "m1", inicio: `${dia(2)}T15:00:00-03:00`, responsavel: D } }] },
  ],
});
const financeiroDados = (de = "MEUS") => ({
  de, pedem: 2,
  escritorio: { total: 1, mostrando: 1, vencidas: 1, valorVencido: 120000, escritorioVencidas: de === "MEUS" ? 4 : null, proximo: null, grupos: [
    { chave: "VENCIDOS", total: 1, itens: [{ tipo: "PARCELA", id: "p1", em: dia(-74), responsavel: MARINA, descricao: "entrada 2/5", valor: 120000, forma: "PIX",
      contrato: { id: "c9", numero: "C-2026-009" }, cliente: { id: cid(3), nome: "Daniela Rocha Mendes" },
      cobranca: { motivo: "está desempregada", proxData: dia(8), proxOque: "propor descontar do valor do acordo" } }] }] },
  terceiros: { total: 1, mostrando: 1, atrasados: 1, prazoMaisLonge: dia(-1), grupos: [
    { chave: "VENCIDOS", total: 1, itens: [{ tipo: "REPASSE", id: "d1", em: dia(-1), responsavel: MARINA, para: "CLIENTE", nome: "Gabriela Teixeira", valor: 490000,
      levantamento: { id: "l1", tipo: "ACORDO", entrouEm: dia(-6) }, caso: { id: "s1", nome: "Teixeira x Construtora" }, cliente: null }] }] },
});
const juridicoDados = (x: Record<string, unknown> = {}) => ({
  de: "MEUS", pedem: 2, atrasadas: 1, prazosHoje: 1, escritorioPrazosHoje: { n: 2, com: ["Felipe Matos", "Larissa Costa"] }, proximo: null, total: 3, mostrando: 3,
  grupos: [
    { chave: "VENCIDOS", total: 1, itens: [{ tipo: "TAREFA", id: "t1", em: dia(-1), responsavel: MARINA, titulo: "Devolver a minuta de acordo", esperando: null, esperandoDesde: null,
      caso: { id: "s2", nome: "Ferreira x Banco Horizonte" } }] },
    { chave: "HOJE", total: 1, itens: [{ tipo: "PRAZO", id: "z1", em: dia(0), responsavel: MARINA, descricao: "Recurso ordinário", fazerAte: dia(0), dataFinal: dia(1),
      caso: { id: "s3", nome: "Pereira x Mercado Bom Preço", numero: "1001022-33.2026.5.02.0045", tribunal: "TRT-2" } }] },
    { chave: "ESPERANDO", total: 1, itens: [{ tipo: "TAREFA", id: "t2", em: dia(7), responsavel: MARINA, titulo: "Assinar e protocolar a petição inicial",
      esperando: "o cliente: procuração assinada", esperandoDesde: dia(-7), caso: { id: "s4", nome: "Vale Alto x Prefeitura" } }] },
  ],
  ...x,
});
const gab = item(6, "Gabriela Teixeira", 0, "Retorno sobre o acordo", MARINA);
const marina = (x: Record<string, Resp | Resp[]> = {}) => ({
  ...COMUNS,
  "/v1/escritorio": { corpo: ESC_MARINA },
  "GET /v1/escritorio/inicio/resumo": { corpo: resumo({ areas: ESC_MARINA.areas, dono: true, pedem: { COMERCIAL: 1, CONTRATOS: 1, FINANCEIRO: 2, JURIDICO: 2 }, total: 6 }) },
  "GET /v1/escritorio/inicio/contatos?de=MEUS": { corpo: contatos({ dono: true, vencidos: [], hoje: [gab], totalVencidos: 0, totalHoje: 1, maisAntigo: null, equipeVencidos: 4,
    pedidosExclusao: [], propostasEsperando: 1, propostaMaisAntiga: { id: "pp", numero: "P-2026-016", cliente: "Gabriela Teixeira", clienteId: cid(6), retornoHoje: true } }) },
  "GET /v1/escritorio/inicio/contatos?de=EQUIPE": { corpo: contatos({ de: "EQUIPE", dono: true, vencidos: [VENCIDOS[0]], hoje: [gab], totalVencidos: 1, totalHoje: 1 }) },
  "GET /v1/escritorio/inicio/contratos?de=MEUS": { corpo: contratosDados() },
  "GET /v1/escritorio/inicio/contratos?de=EQUIPE": { corpo: contratosDados("EQUIPE") },
  "GET /v1/escritorio/inicio/financeiro?de=MEUS": { corpo: financeiroDados() },
  "GET /v1/escritorio/inicio/financeiro?de=EQUIPE": { corpo: financeiroDados("EQUIPE") },
  "GET /v1/escritorio/inicio/juridico?de=MEUS": { corpo: juridicoDados() },
  "GET /v1/escritorio/inicio/juridico?de=EQUIPE": { corpo: juridicoDados({ de: "EQUIPE", escritorioPrazosHoje: null }) },
  ...x,
});

test.describe("Início do Portal por áreas (F3.26)", () => {
  test("a dona vê a faixa com as 4 áreas, os blocos na ordem do menu e a parte comum", async ({ page }) => {
    await simular(page, marina());
    await page.goto(P);
    await expect(page.getByRole("heading", { level: 1, name: /^(Bom dia|Boa tarde|Boa noite), Marina\.$/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /6 pedem você hoje nas suas 4 áreas/ })).toBeVisible();
    const faixa = page.getByRole("region", { name: "Hoje nas suas áreas" });
    const cartoes = faixa.getByRole("link");
    await expect(cartoes).toHaveCount(4);
    await expect(cartoes.nth(2)).toContainText("1 parcela vencida");
    await expect(cartoes.nth(2)).toContainText("De terceiros: 1 repasse atrasado");
    await expect(cartoes.nth(3)).toHaveAttribute("href", "#area-juridico");
    const titulos = page.locator(".ar-bloco h2");
    await expect(titulos).toHaveText(["Comercial", "Contratos", "Financeiro", "Jurídico"]);
    // Contratos: a cobrança parada e a assinatura de sexta, cada uma levando ao registro.
    await expect(bloco(page, "Contratos").getByRole("link", { name: "Hélio Batista Corrêa · C-2026-022" })).toHaveAttribute("href", "/contratos/honorarios");
    await expect(bloco(page, "Contratos")).toContainText("cobrança parada há 8 dias");
    await expect(bloco(page, "Contratos")).toContainText("4 condições esperam uma etapa do caso");
    // Financeiro: do escritório e, à parte, de terceiros (FI-06).
    await expect(bloco(page, "Financeiro")).toContainText("Próxima ação em");
    await expect(bloco(page, "Financeiro")).toContainText("R$ 1.200,00");
    await expect(bloco(page, "Financeiro")).toContainText("No escritório todo, 4 parcelas estão vencidas");
    const terc = page.getByRole("region", { name: "Repasses pendentes" });
    await expect(terc).toContainText("De terceiros · não é do escritório");
    await expect(terc.getByRole("link", { name: "Gabriela Teixeira · cliente" })).toHaveAttribute("href", "/financeiro/repasses/l1");
    // Jurídico: atrasado, para hoje e esperando alguém (PD-04, PD-05).
    await expect(page.getByRole("list", { name: "Esperando alguém · 1" })).toContainText("Esperando o cliente: procuração assinada");
    await expect(bloco(page, "Jurídico")).toContainText("Fazer até hoje: o prazo final é amanhã");
    await expect(bloco(page, "Jurídico")).toContainText("No escritório, 2 prazos vencem hoje: com Felipe e Larissa.");
    // Comercial: o bloco de contatos aprovado, com a proposta esperando no rodapé.
    await expect(bloco(page).getByText(/Nenhum contato seu está vencido. Na equipe há 4 vencidos/)).toBeVisible();
    await expect(bloco(page)).toContainText("Proposta sua esperando resposta: P-2026-016, de Gabriela Teixeira. O retorno dela é um contato de hoje.");
    // A parte comum.
    const comum = page.getByRole("complementary", { name: "Parte comum do escritório" });
    await expect(comum.getByRole("region", { name: "Agenda de hoje" })).toContainText("Conciliação · Ferreira x Banco Horizonte");
    await expect(comum.getByRole("region", { name: "Esperando alguém" })).toContainText("Possível cliente novo");
    await semViolacoes(page);
  });

  test("decisão 9: “Da equipe” troca a página inteira e mostra o responsável", async ({ page }) => {
    const pedidos = await simular(page, marina());
    await page.goto(P);
    await expect(page.getByRole("button", { name: "Os meus" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Da equipe" }).click();
    await expect(page.getByRole("heading", { name: "Hoje nas áreas da equipe" })).toBeVisible();
    await expect(bloco(page, "Contratos").getByText("Marina Ribeiro").first()).toBeVisible();
    await expect(bloco(page).getByText("Diego Almeida")).toBeVisible();
    for (const a of ["contatos", "contratos", "financeiro", "juridico"]) {
      expect(pedidos.some((p) => p.caminho === `/v1/escritorio/inicio/${a}` && p.busca === "?de=EQUIPE")).toBe(true);
    }
    await semViolacoes(page);
  });

  test("decisão 12: Bianca vê só Contratos e Financeiro, sem o botão da equipe", async ({ page }) => {
    const pedidos = await simular(page, {
      ...COMUNS,
      "/v1/escritorio": { corpo: ESC_BIANCA },
      "GET /v1/escritorio/inicio/resumo": { corpo: resumo({ areas: ["CONTRATOS", "FINANCEIRO"], pedem: { CONTRATOS: 0, FINANCEIRO: 2 }, total: 2 }) },
      "GET /v1/escritorio/inicio/contratos?de=MEUS": { corpo: { ...contratosDados(), ...vazioBloco, pedem: 0, assinaturas: 0, esperandoEtapa: 0,
        proximo: { em: dia(5), cliente: "Hélio Batista Corrêa", descricao: "x" } } },
      "GET /v1/escritorio/inicio/financeiro?de=MEUS": { corpo: financeiroDados() },
    });
    await page.goto(P);
    await expect(page.locator(".ar-bloco h2")).toHaveText(["Contratos", "Financeiro"]);
    await expect(page.getByRole("button", { name: "Da equipe" })).toHaveCount(0);
    await expect(bloco(page, "Contratos").getByRole("status")).toContainText("Nada seu em Contratos hoje.");
    await expect(page.getByRole("link", { name: /Registrar recebimento/ })).toBeVisible();
    expect(pedidos.some((p) => p.caminho.includes("/inicio/juridico") || p.caminho.includes("/inicio/contatos"))).toBe(false);
    await semViolacoes(page);
  });

  test("decisão 12: com uma área só (Larissa) a faixa sai; sem área (Paula) só a parte comum", async ({ page }) => {
    await simular(page, {
      ...COMUNS,
      "/v1/escritorio": { corpo: ESC_LARISSA },
      "GET /v1/escritorio/inicio/resumo": { corpo: resumo({ areas: ["JURIDICO"], pedem: { JURIDICO: 2 }, total: 2 }) },
      "GET /v1/escritorio/inicio/juridico?de=MEUS": { corpo: juridicoDados({ escritorioPrazosHoje: null }) },
    });
    await page.goto(P);
    await expect(bloco(page, "Jurídico")).toBeVisible();
    await expect(page.getByRole("region", { name: "Hoje nas suas áreas" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Novo prazo/ })).toBeVisible();
    await semViolacoes(page);

    const pedidos = await simular(page, { ...COMUNS, "/v1/escritorio": { corpo: ESC_PAULA },
      "GET /v1/escritorio/inicio/resumo": { corpo: resumo({ areas: [], pedem: {}, total: 0 }) } });
    await page.goto(P);
    await expect(page.getByText("O seu Início mostra o que é de todo o escritório.")).toBeVisible();
    await expect(page.locator(".ar-bloco")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Agenda de hoje" })).toBeVisible();
    expect(pedidos.some((p) => /inicio\/(contatos|contratos|financeiro|juridico)/.test(p.caminho))).toBe(false);
    await semViolacoes(page);
  });

  test("decisão 14: um bloco que falha fica com o erro dentro; o resto do Início continua", async ({ page }) => {
    await simular(page, marina({
      "GET /v1/escritorio/inicio/juridico?de=MEUS": [{ status: 500, corpo: { erro: { codigo: "INTERNAL" } } }, { corpo: juridicoDados() }],
    }));
    await page.goto(P);
    await expect(bloco(page, "Jurídico").getByRole("alert")).toContainText("Não deu para carregar o Jurídico");
    await expect(page.getByRole("region", { name: "Hoje nas suas áreas" }).getByRole("link").nth(3)).toContainText("Não carregou");
    await expect(bloco(page, "Contratos")).toContainText("Hélio Batista Corrêa");
    await bloco(page, "Jurídico").getByRole("button", { name: "Tentar de novo" }).click();
    await expect(bloco(page, "Jurídico")).toContainText("Recurso ordinário");
    await semViolacoes(page);
  });

  test("limite de 5: o rodapé diz quantos faltam e de que tipo", async ({ page }) => {
    const j = juridicoDados();
    await simular(page, marina({ "GET /v1/escritorio/inicio/juridico?de=MEUS": { corpo: { ...j, total: 9, mostrando: 3,
      grupos: [{ ...j.grupos[0], total: 1 }, { ...j.grupos[1], total: 4 }, { ...j.grupos[2], total: 4 }] } } }));
    await page.goto(P);
    await expect(bloco(page, "Jurídico")).toContainText("Mostrando 3 de 9. Os outros 6: 3 para hoje e 3 esperando alguém.");
  });
});

test.describe("Início: bloco Comercial com os contatos do dia (F1.14, AP-06)", () => {
  const diego = (x: Record<string, Resp | Resp[]> = {}) => ({ ...COMUNS, "/v1/escritorio": { corpo: ESC_DIEGO },
    "GET /v1/escritorio/inicio/resumo": { corpo: resumo() }, ...x });

  test("os vencidos do mais antigo e depois os de hoje, com selo escrito e o contato", async ({ page }) => {
    await simular(page, diego({ "GET /v1/escritorio/inicio/contatos?de=MEUS": { corpo: contatos() } }));
    await page.goto(P);
    await expect(page.getByRole("heading", { level: 1, name: /^(Bom dia|Boa tarde|Boa noite), Diego\.$/ })).toBeVisible();
    await expect(bloco(page).getByText("Os seus: 3 contatos vencidos e 2 contatos para hoje")).toBeVisible();
    const vencidos = page.getByRole("list", { name: "Contatos vencidos · 3" });
    await expect(vencidos.getByRole("listitem")).toHaveCount(3);
    await expect(vencidos.getByRole("listitem").first()).toContainText("vencido há 8 dias");
    await expect(vencidos.getByRole("listitem").last()).toContainText("vencido ontem");
    await expect(vencidos.getByText(/Antônia · filha · /)).toBeVisible();
    await expect(page.getByRole("link", { name: "Antônia Ferreira Prado" })).toHaveAttribute("href", `/clientes/${cid(2)}`);
    await expect(page.getByRole("region", { name: "Hoje nas suas áreas" })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("registrar atendimento abre a janela da ficha e o contato sai do bloco", async ({ page }) => {
    const pedidos = await simular(page, diego({
      "GET /v1/escritorio/inicio/contatos?de=MEUS": [{ corpo: contatos() }, { corpo: contatos({ vencidos: [VENCIDOS[0], VENCIDOS[2]], totalVencidos: 2 }) }],
      [`GET /v1/escritorio/clientes/${cid(2)}`]: { corpo: FICHA },
      "GET /v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
      [`POST /v1/escritorio/clientes/${cid(2)}/atendimentos`]: { status: 201, corpo: { id: "f1" } },
    }));
    await page.goto(P);
    await page.getByRole("button", { name: "Registrar atendimento de Antônia Ferreira Prado" }).click();
    const janela = page.getByRole("dialog");
    await expect(janela).toBeVisible();
    await janela.getByLabel(/Resumo/).fill("Joana vai mandar a carta amanhã.");
    await janela.getByRole("checkbox", { name: /Sem próximo contato/ }).check();
    await janela.getByRole("button", { name: /Registrar/ }).last().click();
    await expect(page.getByRole("status").filter({ hasText: "Atendimento de Antônia registrado." })).toBeVisible();
    await expect(page.getByRole("list", { name: "Contatos vencidos · 2" })).toBeVisible();
    const post = pedidos.find((p) => p.metodo === "POST")!;
    expect((post.corpo as { resumo: string }).resumo).toBe("Joana vai mandar a carta amanhã.");
  });

  test("limite de 5 com o pé dizendo quantos faltam", async ({ page }) => {
    await simular(page, diego({ "GET /v1/escritorio/inicio/contatos?de=MEUS": { corpo: contatos({ hoje: HOJE.slice(0, 2), totalVencidos: 7, totalHoje: 3 }) } }));
    await page.goto(P);
    await expect(bloco(page).getByText("Mostrando 5 de 10. Os outros 5: 4 vencidos e 1 de hoje.")).toBeVisible();
  });

  test("em dia com o próximo contato; erro dentro do bloco com tentar de novo", async ({ page }) => {
    await simular(page, diego({
      "GET /v1/escritorio/inicio/contatos?de=MEUS": [{ status: 500, corpo: { erro: { codigo: "INTERNAL" } } },
        { corpo: contatos({ vencidos: [], hoje: [], totalVencidos: 0, totalHoje: 0, maisAntigo: null, proximo: { em: "2026-11-20", nome: "Benedito Souza Lima" } }) }],
    }));
    await page.goto(P);
    await expect(bloco(page).getByRole("alert")).toContainText("Não deu para carregar os contatos");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await bloco(page).getByRole("button", { name: "Tentar de novo" }).click();
    await expect(bloco(page).getByRole("status")).toContainText("Nada seu em Comercial hoje.");
    await expect(bloco(page).getByText("Próximo contato: Benedito Souza Lima, 20/11.")).toBeVisible();
    await semViolacoes(page);
  });
});

test.describe("Início completo: cobrança do dia, prazo em 2 dias e petição para revisar", () => {
  test("F3.38 e F3.76: o prazo com o lembrete em A acompanhar e a petição em Para hoje, no Jurídico de Larissa", async ({ page }) => {
    const LARISSA = { id: "a0000000-0000-4000-8000-000000000104", nome: "Larissa Costa" };
    await simular(page, {
      ...COMUNS,
      "/v1/escritorio": { corpo: ESC_LARISSA },
      "GET /v1/escritorio/inicio/resumo": { corpo: resumo({ areas: ["JURIDICO"], pedem: { JURIDICO: 1 }, total: 1 }) },
      "GET /v1/escritorio/inicio/juridico?de=MEUS": { corpo: juridicoDados({ escritorioPrazosHoje: null, pedem: 1, atrasadas: 0, prazosHoje: 0, total: 2, mostrando: 2, grupos: [
        { chave: "HOJE", total: 1, itens: [{ tipo: "PETICAO", id: "x1", em: dia(0), responsavel: LARISSA, modelo: "Contestação", versao: 1, enviadaEm: dia(-1),
          por: { id: "f", nome: "Felipe Matos" }, caso: { id: "s5", nome: "Souza x Construtora Atlas" },
          prazo: { id: "z9", descricao: "Contestação", em: dia(2), dataFinal: dia(2) } }] },
        { chave: "ACOMPANHAR", total: 1, itens: [{ tipo: "PRAZO", id: "z2", em: dia(2), responsavel: LARISSA, descricao: "Memoriais", fazerAte: null, dataFinal: dia(2),
          lembrete: true, caso: { id: "s6", nome: "Castro x Banco Horizonte", numero: null, tribunal: null } }] },
      ] }) },
    });
    await page.goto(P);
    const j = bloco(page, "Jurídico");
    await expect(page.getByRole("list", { name: "Para hoje · 1" })).toContainText("Revisar a petição que Felipe mandou ontem");
    await expect(j.getByRole("link", { name: "Contestação · Souza x Construtora Atlas" })).toHaveAttribute("href", "/juridico/peticoes/x1");
    const acompanhar = page.getByRole("list", { name: "A acompanhar · 1" });
    await expect(acompanhar).toContainText("Preparar");
    await expect(acompanhar).toContainText("em 2 dias");
    await semViolacoes(page);
  });

  test("F3.21: a cobrança com a ação de hoje, antes do vencimento, aparece para cobrar", async ({ page }) => {
    const f = financeiroDados();
    const item = { tipo: "PARCELA", id: "p9", em: dia(20), responsavel: MARINA, descricao: "parcela 1/2", valor: 100000, forma: "PIX",
      contrato: { id: "c9", numero: "C-2026-009" }, cliente: { id: "k9", nome: "Gabriela Teixeira" },
      cobranca: { motivo: null, proxData: dia(0), proxOque: "mandar o Pix da primeira parcela" } };
    await simular(page, marina({ "GET /v1/escritorio/inicio/financeiro?de=MEUS": { corpo: { ...f, escritorio: { ...f.escritorio, total: 1, mostrando: 1, vencidas: 0, valorVencido: 0,
      grupos: [{ chave: "HOJE", total: 1, itens: [item] }] } } } }));
    await page.goto(P);
    const fin = bloco(page, "Financeiro").getByRole("list", { name: "Para hoje · 1" });
    await expect(fin).toContainText("Próxima ação hoje: mandar o Pix da primeira parcela");
    await expect(fin.getByRole("link", { name: "Gabriela Teixeira · parcela 1/2" })).toHaveAttribute("href", "/financeiro/a-receber/contratos/c9");
    await semViolacoes(page);
  });
});

test.describe("Próximas audiências no Início (F3.2, EX-06)", () => {
  test("dentro da Agenda de hoje, para todos (Paula, sem área), cada uma leva ao compromisso", async ({ page }) => {
    await simular(page, { ...COMUNS, "/v1/escritorio": { corpo: ESC_PAULA }, "GET /v1/escritorio/inicio/resumo": { corpo: resumo({ areas: [], pedem: {}, total: 0 }) } });
    await page.goto(P);
    const lista = page.getByRole("list", { name: "Próximas audiências" });
    await expect(lista.getByRole("listitem")).toHaveCount(2);
    await expect(lista.getByRole("listitem").first()).toContainText("amanhã");
    await expect(lista.getByRole("listitem").first()).toContainText("Presencial · TRT-2, Barra Funda · Marina e Gustavo");
    await expect(lista.getByRole("link").first()).toHaveAttribute("href", "/agenda/a2");
    await expect(page.getByText(/^Nenhuma outra até .+ A seguinte é .+: Instrução · Lima x Padaria Estrela\.$/)).toBeVisible();
    // o título tem o mesmo recuo do da Agenda de hoje e o fio em cima (a regra .pa-cab chegou a sumir do CSS)
    const recuo = (sel: string) => page.locator(sel).evaluate((e) => Math.round(e.getBoundingClientRect().left));
    expect(await recuo("#t-aud")).toBe(await recuo("#t-agenda"));
    await expect(page.locator(".pa-cab")).toHaveCSS("border-top-style", "solid");
    await semViolacoes(page);
  });

  test("vazio: a linha fica, com a próxima depois da janela", async ({ page }) => {
    await simular(page, { ...COMUNS, "/v1/escritorio": { corpo: ESC_PAULA }, "GET /v1/escritorio/inicio/resumo": { corpo: resumo({ areas: [], pedem: {}, total: 0 }) },
      "GET /v1/escritorio/inicio/audiencias": { corpo: { ...AUDIENCIAS, total: 0, itens: [] } } });
    await page.goto(P);
    await expect(page.getByText("Nenhuma audiência nos próximos 7 dias.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Próximas audiências" })).toHaveCount(0);
    await semViolacoes(page);
  });
});
