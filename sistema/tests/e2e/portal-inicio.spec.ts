// Início do Portal com os contatos do dia (F1.14, AP-06), tela aprovada em
// docs/design/aprovadas/portal-clientes-pendencias (estados inicio-*). A API é simulada.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const cid = (n: number) => `c1000000-0000-4000-8000-0000000002${String(n).padStart(2, "0")}`;
const DIEGO = { id: "a0000000-0000-4000-8000-000000000103", nome: "Diego Almeida" };
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const FELIPE = { id: "a0000000-0000-4000-8000-000000000105", nome: "Felipe Matos" };

const BASE = {
  id: ESC, nome: "Ribeiro & Matos", socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, cnpj: null, cidade: "São Paulo", uf: "SP",
  endereco: null, contatos: [], ultimaExportacao: null,
};
const ESC_DIEGO = { ...BASE, pessoa: "Diego Almeida", dono: false, areas: ["COMERCIAL"], funcoes: ["EQUIPE"] };
const ESC_MARINA = { ...BASE, pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"], funcoes: ["SOCIO"] };
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
const bloco = (page: Page) => page.getByRole("region", { name: "Contatos de hoje" });

test.describe("Início do Portal: contatos do dia (F1.14, AP-06)", () => {
  test("os vencidos do mais antigo e depois os de hoje, com selo escrito e o contato", async ({ page }) => {
    await simular(page, { "/v1/escritorio": { corpo: ESC_DIEGO }, "GET /v1/escritorio/inicio/contatos?de=MEUS": { corpo: contatos() } });
    await page.goto(P);
    await expect(page.getByRole("heading", { level: 1, name: /^(Bom dia|Boa tarde|Boa noite), Diego\.$/ })).toBeVisible();
    await expect(bloco(page).getByText("Os seus: 3 vencidos e 2 para hoje")).toBeVisible();
    const vencidos = page.getByRole("list", { name: "Vencidos · 3" });
    await expect(vencidos.getByRole("listitem")).toHaveCount(3);
    await expect(vencidos.getByRole("listitem").first()).toContainText("vencido há 8 dias");
    await expect(vencidos.getByRole("listitem").last()).toContainText("vencido ontem");
    await expect(page.getByRole("list", { name: "Para hoje · 2" }).getByText("Hoje", { exact: true }).first()).toBeVisible();
    await expect(vencidos.getByText(/Antônia · filha · /)).toBeVisible();
    await expect(page.getByRole("link", { name: /3 contatos vencidos/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Antônia Ferreira Prado" })).toHaveAttribute("href", `/clientes/${cid(2)}`);
    await expect(page.getByRole("link", { name: /Ver todos/ })).toHaveAttribute("href", "/clientes?filtro=vencidos");
    await semViolacoes(page);
  });

  test("registrar atendimento abre a janela da ficha e o contato sai do bloco", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESC_DIEGO },
      "GET /v1/escritorio/inicio/contatos?de=MEUS": [{ corpo: contatos() }, { corpo: contatos({ vencidos: [VENCIDOS[0], VENCIDOS[2]], totalVencidos: 2 }) }],
      [`GET /v1/escritorio/clientes/${cid(2)}`]: { corpo: FICHA },
      "GET /v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
      [`POST /v1/escritorio/clientes/${cid(2)}/atendimentos`]: { status: 201, corpo: { id: "f1" } },
    });
    await page.goto(P);
    await page.getByRole("button", { name: "Registrar atendimento de Antônia Ferreira Prado" }).click();
    const janela = page.getByRole("dialog");
    await expect(janela).toBeVisible();
    await janela.getByLabel(/Resumo/).fill("Joana vai mandar a carta amanhã.");
    await janela.getByRole("checkbox", { name: /Sem próximo contato/ }).check();
    await janela.getByRole("button", { name: /Registrar/ }).last().click();
    await expect(page.getByRole("status").filter({ hasText: "Atendimento de Antônia registrado." })).toBeVisible();
    await expect(page.getByRole("list", { name: "Vencidos · 2" })).toBeVisible();
    const post = pedidos.find((p) => p.metodo === "POST")!;
    expect((post.corpo as { resumo: string }).resumo).toBe("Joana vai mandar a carta amanhã.");
  });

  test("limite de 5 com o pé dizendo quantos faltam", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESC_DIEGO },
      "GET /v1/escritorio/inicio/contatos?de=MEUS": { corpo: contatos({ hoje: HOJE.slice(0, 2), totalVencidos: 7, totalHoje: 3 }) },
    });
    await page.goto(P);
    await expect(bloco(page).getByText("Mostrando 5 de 10. Os outros 5: 4 vencidos e 1 de hoje.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver todos os vencidos em Clientes" })).toBeVisible();
  });

  test("decisão 1: a dona vê os dela, o aviso da equipe, e “Da equipe” com o responsável", async ({ page }) => {
    const gab = item(6, "Gabriela Teixeira", 0, "Retorno sobre o acordo", MARINA);
    const ser = item(7, "Sérgio Nogueira Pires", 2, "Avisar sobre a audiência", FELIPE);
    await simular(page, {
      "/v1/escritorio": { corpo: ESC_MARINA },
      "GET /v1/escritorio/inicio/contatos?de=MEUS": { corpo: contatos({ dono: true, vencidos: [], hoje: [gab], totalVencidos: 0, totalHoje: 1, maisAntigo: null, equipeVencidos: 4, pedidosExclusao: [] }) },
      "GET /v1/escritorio/inicio/contatos?de=EQUIPE": { corpo: contatos({ de: "EQUIPE", dono: true, vencidos: [VENCIDOS[0], ser], hoje: [gab], totalVencidos: 2, totalHoje: 1 }) },
    });
    await page.goto(P);
    await expect(page.getByRole("button", { name: "Meus" })).toHaveAttribute("aria-pressed", "true");
    await expect(bloco(page).getByText(/Nenhum contato seu está vencido. Na equipe há 4 vencidos/)).toBeVisible();
    await expect(page.getByRole("link", { name: /4 vencidos na equipe/ })).toBeVisible();
    await page.getByRole("button", { name: "Da equipe" }).click();
    await expect(bloco(page).getByText("Da equipe: 2 vencidos e 1 para hoje, com o responsável de cada um")).toBeVisible();
    await expect(bloco(page).getByText("Felipe Matos")).toBeVisible();
    await semViolacoes(page);
  });

  test("vazio com o próximo contato marcado; erro dentro do bloco com tentar de novo", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESC_DIEGO },
      "GET /v1/escritorio/inicio/contatos?de=MEUS": [{ status: 500, corpo: { erro: { codigo: "INTERNAL" } } },
        { corpo: contatos({ vencidos: [], hoje: [], totalVencidos: 0, totalHoje: 0, maisAntigo: null, proximo: { em: "2026-11-20", nome: "Benedito Souza Lima" } }) }],
    });
    await page.goto(P);
    await expect(bloco(page).getByRole("alert")).toContainText("Não deu para carregar os seus contatos");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(bloco(page).getByRole("heading", { name: "Tudo em dia com os seus clientes." })).toBeVisible();
    await expect(bloco(page).getByText("sexta, 20/11")).toBeVisible();
    await semViolacoes(page);
  });

  test("PT-02: sem a área Comercial, nada de contatos; a saudação e os atalhos", async ({ page }) => {
    const pedidos = await simular(page, { "/v1/escritorio": { corpo: ESC_LARISSA } });
    await page.goto(P);
    await expect(page.getByRole("heading", { level: 2, name: "O seu Início ganha blocos com as suas áreas" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Contatos de hoje" })).toHaveCount(0);
    expect(pedidos.some((p) => p.caminho.includes("/inicio/"))).toBe(false);
    await semViolacoes(page);
  });
});
