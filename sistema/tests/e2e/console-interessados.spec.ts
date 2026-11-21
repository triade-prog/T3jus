// Comercial › Interessados no Console (F2.3, SC-05), tela aprovada em
// docs/design/aprovadas/site-comercial/interessados.html. A API é simulada; aqui se testa a
// tela, a acessibilidade e o que ela manda ao servidor.
import { expect, test } from "@playwright/test";
import { C, CA, IN, SESSAO, semViolacoes, simular } from "./console-dados.ts";

const ADM = { ...SESSAO, acoes: ["console.interessados.ver"], interessadosAtencao: 2 };
const SUP = { ...SESSAO, nome: "Bruno Seixas", funcoes: ["SUPORTE"], acoes: ["console.suporte.ver"] };
const hojeBr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const dia = (n: number) => new Date(Date.parse(`${hojeBr}T12:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);
const JAT = "f0000000-0000-4000-8000-000000000001";
const IPE = "f0000000-0000-4000-8000-000000000002";
const ANG = "f0000000-0000-4000-8000-000000000003";
const PESSOAS = [{ id: CA.pessoaId, nome: CA.nome, funcoes: ["ADMINISTRACAO"] }, { id: IN.pessoaId, nome: IN.nome, funcoes: ["IMPLANTACAO"] }];
const base = {
  prazoResposta: dia(1), origem: "SITE", tamanho: "DE_6_A_10", area: "Trabalhista", uf: "PI", fim: null, clienteEscritorio: null, ultimoContatoEm: `${dia(-1)}T19:42:00Z`, versao: 3,
};
const jatoba = { ...base, id: JAT, estagio: "NOVO", nome: "Lívia Prado", escritorio: "Jatobá Advocacia Previdenciária", email: "livia@jatoba.exemplo.com.br", whats: "+5586998124410",
  cidade: null, uf: null, chegouEm: `${hojeBr}T12:14:00Z`, responsavel: null, proximo: null, versao: 1 };
const ipe = { ...base, id: IPE, estagio: "EM_CONTATO", nome: "Henrique Moura", escritorio: "Ipê & Moura Advogados", email: "henrique@ipemoura.exemplo.com.br", whats: "+5586997340921",
  cidade: "Teresina", chegouEm: `${dia(-1)}T19:42:00Z`, responsavel: { id: IN.pessoaId, nome: IN.nome },
  proximo: { passo: "Marcar a demonstração", data: hojeBr, hora: null, quem: { id: IN.pessoaId, nome: IN.nome } } };
const angico = { ...ipe, id: ANG, escritorio: "Angico Advocacia Trabalhista", nome: "Débora Sales", email: "debora@angico.exemplo.com.br", origem: "EVENTO", cidade: "Parnaíba",
  proximo: { passo: "Mandar o vídeo do Financeiro", data: dia(-3), hora: null, quem: { id: IN.pessoaId, nome: IN.nome } } };
const LISTA = { hoje: hojeBr, podeEditar: true, interessados: [jatoba, ipe, angico], pessoas: PESSOAS, mes: { pedidos: 3, site: 2, clientes: 0 } };
const fichaIpe = (extra: Record<string, unknown> = {}) => ({
  ...ipe, hoje: hojeBr, mensagem: "Somos 7 e as parcelas dos acordos estão numa planilha.", cidadeCompletadaEm: null,
  autorizacao: { texto: "Autorizo o T3jus a usar estes dados para responder ao meu pedido de demonstração, como diz a Política de privacidade.", versao: 1, aceita_em: `${dia(-1)}T19:42:00Z`, pagina: "/demonstracao" },
  origemDetalhe: { pagina: "/demonstracao" }, responsavelDesde: `${dia(-1)}T19:55:00Z`, responsavelPor: CA.nome, clienteNome: null, prazoResposta: dia(1), apagarEm: dia(365),
  podeEditar: true, pessoas: PESSOAS,
  notas: [{ id: "n1", texto: "Prefere conversar depois das 18h.", criadoEm: `${dia(-1)}T20:20:00Z`, autor: { id: IN.pessoaId, nome: IN.nome } }],
  historico: [
    { id: 3, ocorridoEm: `${dia(-1)}T20:18:00Z`, acao: "estagio.mudou", dados: { de: "NOVO", para: "EM_CONTATO", motivo: "Respondi por WhatsApp." }, autor: { id: IN.pessoaId, nome: IN.nome } },
    { id: 2, ocorridoEm: `${dia(-1)}T19:42:10Z`, acao: "resposta.enviada", dados: {}, autor: null },
    { id: 1, ocorridoEm: `${dia(-1)}T19:42:00Z`, acao: "pedido.recebido", dados: { origem: "SITE" }, autor: null },
  ],
  ...extra,
});

test.describe("Console: Comercial › Interessados", () => {
  test("lista: números, funil, filtros e Comercial no menu com o contador", async ({ page }) => {
    await simular(page, { "/v1/sessao": { corpo: ADM }, "/v1/interessados": { corpo: LISTA } });
    await page.goto(`${C}/interessados`);
    await expect(page.getByRole("heading", { level: 1, name: "Interessados" })).toBeVisible();
    await expect(page.getByLabel("2 interessados pedem atenção")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Em andamento (3)" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Angico (3 dias)")).toBeVisible();
    await semViolacoes(page);

    await page.getByRole("searchbox", { name: "Buscar interessado" }).fill("jatoba");
    await expect(page.locator(".so-pc tbody tr, .so-cel li").filter({ visible: true })).toHaveCount(1);
    await page.getByRole("searchbox", { name: "Buscar interessado" }).fill("cajueiro");
    await expect(page.getByRole("heading", { name: "Nenhum interessado com “cajueiro”" })).toBeVisible();
    await page.getByRole("button", { name: "Limpar a busca" }).click();
    await page.getByRole("button", { name: "Vencidos (1)" }).click();
    await expect(page.getByText("venceu em").filter({ visible: true })).toHaveCount(1);
    await semViolacoes(page);
  });

  test("quem não é da Administração nem da Implantação vê a página fechada", async ({ page }) => {
    await simular(page, { "/v1/sessao": { corpo: SUP }, "/v1/interessados": { status: 403, corpo: { erro: { codigo: "FORBIDDEN" } } } });
    await page.goto(`${C}/interessados`);
    await expect(page.getByRole("heading", { level: 1, name: "Esta página é da Administração e da Implantação" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Comercial" })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("ficha: pedido como chegou, autorização, histórico e mudar estágio com motivo", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: ADM },
      [`/v1/interessados/${IPE}`]: [{ corpo: fichaIpe() }, { corpo: fichaIpe({ estagio: "DEMONSTRACAO", versao: 4 }) }],
      [`PUT /v1/interessados/${IPE}/estagio`]: [{ status: 400, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { campos: ["motivo"] } } } }, { corpo: { versao: 4 } }],
    });
    await page.goto(`${C}/interessados/${IPE}`);
    await expect(page.getByRole("heading", { level: 1, name: "Ipê & Moura Advogados" })).toBeVisible();
    await expect(page.getByText("(86) 99734-0921")).toBeVisible();
    await expect(page.getByText("Autorizou")).toBeVisible();
    await expect(page.getByText("mandou a resposta automática por e-mail")).toBeVisible();
    await semViolacoes(page);

    await page.getByRole("button", { name: "Mudar estágio" }).click();
    const janela = page.getByRole("dialog", { name: "Mudar o estágio do Ipê & Moura Advogados" });
    await expect(janela).toBeVisible();
    await janela.getByRole("radio", { name: /Demonstração marcada/ }).check();
    await janela.getByRole("button", { name: "Mudar estágio" }).click();
    await expect(janela.getByText("Falta acertar 3 pontos, marcados abaixo.")).toBeVisible();
    expect(pedidos.filter((p) => p.metodo === "PUT")).toHaveLength(0);
    await semViolacoes(page);

    await janela.getByLabel("Data da demonstração").fill("26/11/2026");
    await janela.getByRole("textbox", { name: "Hora" }).fill("18h00");
    await janela.getByLabel("Motivo").fill("Confirmou por WhatsApp.");
    await expect(janela.getByText("O próximo passo vira “Demonstração por vídeo, 26/11 às 18h00”, com Inês Nogueira.")).toBeVisible();
    await janela.getByRole("button", { name: "Mudar estágio" }).click();
    // O banco recusou o motivo (o primeiro envio simulado): o erro fica preso ao campo.
    await expect(janela.getByLabel("Motivo")).toHaveAttribute("aria-invalid", "true");
    await janela.getByRole("button", { name: "Mudar estágio" }).click();
    await expect(page.getByText("Estágio mudado.")).toBeVisible();
    const put = pedidos.filter((p) => p.metodo === "PUT").at(-1)!;
    expect(put.corpo).toEqual({ versao: 3, estagio: "DEMONSTRACAO", motivo: "Confirmou por WhatsApp.", data: "2026-11-26", hora: "18:00" });
  });

  test("pedido novo: ficar com ele; virar escritório cliente já preenchido", async ({ page }) => {
    const fichaJat = fichaIpe({ ...jatoba, mensagem: null, notas: [], historico: [], responsavelDesde: null, responsavelPor: null });
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: ADM },
      [`/v1/interessados/${JAT}`]: [{ corpo: fichaJat }, { corpo: { ...fichaJat, responsavel: { id: CA.pessoaId, nome: CA.nome }, versao: 2, cidade: "Teresina", uf: "PI",
        proximo: { passo: "Responder o pedido", data: dia(1), hora: null, quem: { id: CA.pessoaId, nome: CA.nome } } } }],
      [`PUT /v1/interessados/${JAT}/responsavel`]: { corpo: { versao: 2 } },
      [`POST /v1/interessados/${JAT}/converter`]: { status: 201, corpo: { escritorioId: "e0000000-0000-4000-8000-000000000001" } },
    });
    await page.goto(`${C}/interessados/${JAT}`);
    await expect(page.getByText("Ninguém cuida deste pedido ainda.").first()).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Ficar com ele" }).first().click();
    await expect(page.getByText("Agora o pedido é seu.")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "PUT")!.corpo).toEqual({ versao: 1, pessoaId: CA.pessoaId });

    await page.getByRole("button", { name: "Virar escritório cliente" }).click();
    const janela = page.getByRole("dialog", { name: "Cadastrar escritório" });
    await expect(janela.getByLabel(/Nome do escritório/)).toHaveValue("Jatobá Advocacia Previdenciária");
    await expect(janela.getByText("livia@jatoba.exemplo.com.br")).toBeVisible();
    await janela.getByLabel("Como fechou").fill("Contrato assinado.");
    await semViolacoes(page);
    await janela.getByRole("button", { name: "Cadastrar escritório" }).click();
    expect(pedidos.find((p) => p.caminho.endsWith("/converter"))!.corpo).toEqual({ versao: 2, nome: "Jatobá Advocacia Previdenciária", cidade: "Teresina", uf: "PI", motivo: "Contrato assinado." });
    await expect(page.getByText("Jatobá Advocacia Previdenciária agora é escritório cliente.")).toBeVisible();
  });

  test("encerrar como perdido pede o motivo", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: ADM },
      [`/v1/interessados/${IPE}`]: { corpo: fichaIpe() },
      [`POST /v1/interessados/${IPE}/encerrar`]: { corpo: { versao: 4 } },
    });
    await page.goto(`${C}/interessados/${IPE}`);
    await page.getByRole("button", { name: "Perdido ou descartado" }).click();
    const janela = page.getByRole("alertdialog", { name: "Encerrar o Ipê & Moura Advogados?" });
    await janela.getByRole("button", { name: "Encerrar como perdido" }).click();
    await expect(janela.getByText("Escreva o motivo. Ele fica no histórico.")).toBeVisible();
    await semViolacoes(page);
    await janela.getByLabel("Motivo").fill("Fechou com outro sistema.");
    await janela.getByLabel(/Lembrar de procurar de novo em/).fill("01/03/2027");
    await janela.getByRole("button", { name: "Encerrar como perdido" }).click();
    expect(pedidos.find((p) => p.caminho.endsWith("/encerrar"))!.corpo).toEqual({ versao: 3, como: "PERDIDO", porque: "Escolheu outro sistema", motivo: "Fechou com outro sistema.", procurarEm: "2027-03-01" });
  });
});
