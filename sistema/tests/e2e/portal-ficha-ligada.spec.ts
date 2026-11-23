// Ficha do cliente ligada (F3.110, F3.111), tela aprovada em
// docs/design/aprovadas/portal-ficha-cliente-ligada: a coluna "Próximo passo" e "Gerar proposta"
// na lista; o âmbar "Próximo passo" com o botão que segue o estado; as abas Propostas, Contratos e
// Casos; o "No escritório"; e a assinatura que abre o caso. A API é simulada; aqui se testa a
// tela, a acessibilidade e o que ela manda ao servidor.
import { expect, test, type Page } from "@playwright/test";
import { h, semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const cid = (n: number) => `c1000000-0000-4000-8000-0000000002${String(n).padStart(2, "0")}`;
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const DIEGO = { id: "a0000000-0000-4000-8000-000000000103", nome: "Diego Almeida" };
const LARISSA = { id: "a0000000-0000-4000-8000-000000000105", nome: "Larissa Costa" };
const CT = "b2000000-0000-4000-8000-000000000031";
const PR = "b1000000-0000-4000-8000-000000000014";
const CASO = "ca000000-0000-4000-8000-000000000001";
const ANEXO = "f9000000-0000-4000-8000-000000000031";

const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};
const COM_DIEGO = { ...ESCRITORIO, pessoa: "Diego Almeida", dono: false, areas: ["COMERCIAL", "FINANCEIRO"], funcoes: ["EQUIPE"] };

const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + n * 864e5));
const br = (n: number) => dia(n).split("-").reverse().join("/");

const linha = (n: number, nome: string, passo: Record<string, unknown>) => ({
  id: cid(n), tipo: "PF", nome, situacao: "ATIVO", versao: 1, origem: "GOOGLE", proxContato: null,
  contatoPrincipal: { id: `d${cid(n).slice(1)}`, nome, papel: null, telefone: `+55119887766${String(n).padStart(2, "0")}`, email: null },
  passo: { area: "COMERCIAL", pode: true, quemPode: null, item: null, ...passo },
});
const ATIVOS = [
  linha(1, "Antônia Ferreira Prado", { tipo: "PROPOSTA_ANDAMENTO", item: { id: PR, numero: "P-2026-014", retorno: { em: dia(2), vencido: false } } }),
  linha(2, "Daniela Rocha Mendes", { tipo: "SEM_PROPOSTA" }),
  linha(3, "Gabriela Teixeira", { tipo: "CASO", area: "JURIDICO", item: { id: CASO, nome: "Teixeira x Banco Sul", etapa: { ordem: 7, nome: "Cumprimento" }, etapas: 8 } }),
];

const PASSO_ASSINAR = { tipo: "CONTRATO_ELABORACAO", area: "CONTRATOS", pode: true, quemPode: null, item: { id: CT, numero: "C-2026-031", objeto: "Pensão por morte", versao: 2, criadoEm: h(48) } };
const FICHA = {
  id: cid(1), tipo: "PF", nome: "Antônia Ferreira Prado", documento: "52998224725", nacionalidade: "brasileira", estadoCivil: "VIUVO", profissao: "Aposentada",
  rg: "12.345.678-9", rgOrgao: "SSP/SP", cep: "04117030", endereco: "Rua das Acácias, 418", bairro: "Vila Mariana", cidade: "São Paulo", uf: "SP",
  repNome: null, repCargo: null, repDocumento: null, repEstadoCivil: null, repProfissao: null, situacao: "ATIVO", inativadoEm: null,
  motivoInativacao: null, inativadoPor: null, criadoEm: h(24 * 22), criadoPor: MARINA, versao: 3, comercial: true, podeInativar: true, faltando: [],
  alterado: null, contatos: [{ id: "d0000000-0000-4000-8000-000000000201", nome: "Antônia Ferreira Prado", papel: null, telefone: "+5511987654321", email: null, principal: true }],
  origem: "GOOGLE", origemIndicacao: null, atendimentos: 4, primeiroAtendimento: null,
  proxContato: { em: dia(2), oque: "Confirmar a assinatura", vencido: false, responsavel: DIEGO },
  passo: PASSO_ASSINAR,
  contagens: { propostas: 2, contratos: 1, casos: 0 },
  noEscritorio: {
    proposta: { id: PR, numero: "P-2026-014", situacao: "ACEITA", servico: "Pensão por morte", em: h(24 * 10) },
    contrato: { id: CT, numero: "C-2026-031", situacao: "ELABORACAO", objeto: "Pensão por morte", assinadoEm: null },
  },
};
const OPCOES = {
  contrato: { id: CT, numero: "C-2026-031", objeto: "Pensão por morte", situacao: "ELABORACAO", versao: 2, criadoEm: h(48), area: "PREVIDENCIARIO",
              cliente: { id: cid(1), nome: "Antônia Ferreira Prado" } },
  casoLigado: null,
  sugestao: { nome: "Antônia Ferreira Prado · Pensão por morte", area: "PREVIDENCIARIO", responsavelId: LARISSA.id, papel: "AUTOR" },
  responsavelSugerido: LARISSA, escolhe: true, responsaveis: [LARISSA, MARINA],
  casos: [{ id: "ca000000-0000-4000-8000-000000000009", nome: "Prado e outros x INSS", clientes: 2 }],
};
const CONTRATOS = [{
  id: CT, numero: "C-2026-031", objeto: "Pensão por morte", situacao: "ELABORACAO", cliente: { id: cid(1), nome: "Antônia Ferreira Prado", tipo: "PF" },
  responsavel: LARISSA, condicoes: [{ tipo: "FIXO", valor: 150000, vencimento: dia(10) }], proximo: null, basePendente: null, criadoEm: h(48),
  assinadoEm: null, semCaso: false, area: "PREVIDENCIARIO", proposta: { id: PR, numero: "P-2026-014" }, caso: null,
}];

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
const ehCelular = (page: Page) => (page.viewportSize()?.width ?? 1000) <= 760;

test.describe("Ficha do cliente ligada (F3.110, F3.111)", () => {
  test("lista: coluna Próximo passo, e Gerar proposta só na linha sem proposta", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/clientes?situacao=ATIVO": { corpo: { comercial: true, clientes: ATIVOS } },
      "GET /v1/escritorio/clientes?situacao=INATIVO": { corpo: { comercial: true, clientes: [] } },
    });
    await page.goto(`${P}/clientes`);
    const lista = ehCelular(page) ? page.getByRole("list", { name: "Clientes" }) : page.locator("table.cl-tab");
    if (!ehCelular(page)) await expect(lista.getByRole("columnheader", { name: "Próximo passo" })).toBeVisible();
    await expect(lista.getByText("Resposta da proposta")).toBeVisible();
    await expect(lista.getByText(`P-2026-014 · retorno ${br(2).slice(0, 5)}`)).toBeVisible();
    await expect(lista.getByText("Caso em andamento")).toBeVisible();
    const gerar = lista.getByRole("link", { name: /^Gerar proposta/ });
    await expect(gerar).toHaveCount(1);
    await expect(gerar).toHaveAccessibleName("Gerar proposta para Daniela Rocha Mendes");
    await expect(gerar).toHaveAttribute("href", `/comercial/propostas/nova?cliente=${cid(2)}`);
    await semViolacoes(page);
  });

  test("ficha: o âmbar é o próximo passo, as abas trazem a contagem e o No escritório substitui o quadro", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      [`GET /v1/escritorio/clientes/${cid(1)}`]: { corpo: FICHA },
      "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
    });
    await page.goto(`${P}/clientes/${cid(1)}`);
    const ambar = page.getByRole("region", { name: "Próximo passo" });
    await expect(ambar.getByText("Colher a assinatura")).toBeVisible();
    await expect(ambar.getByRole("list", { name: "Caminho do cliente no escritório" })).toContainText("Assinatura: é o próximo passo");
    await expect(ambar.getByRole("button", { name: "Registrar assinatura" })).toBeVisible();
    await expect(ambar.getByRole("button", { name: "Registrar atendimento" })).toBeVisible();
    await expect(ambar).toContainText(`Próximo contato ${br(2).slice(0, 5)}, com Diego`);
    const abas = page.getByRole("navigation", { name: "Seções da ficha" });
    await expect(abas.getByRole("link")).toHaveText(["Ficha", "Atendimentos4", "Propostas2", "Contratos1", "Casos0"]);
    const resumo = page.getByRole("region", { name: "No escritório" });
    await expect(resumo).toContainText("P-2026-014 · aceita · Pensão por morte");
    await expect(resumo.getByRole("link", { name: "Ver a aba Contratos" })).toHaveAttribute("href", `/clientes/${cid(1)}?aba=contratos`);
    await expect(page.getByText("Contratos de honorários deste cliente aparecem aqui")).toHaveCount(0);
    await semViolacoes(page);
  });

  test("F3.56 parte 3: o financeiro do Astrea na ficha, com o pago antes e o lembrete de criar o contrato", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      [`GET /v1/escritorio/clientes/${cid(1)}`]: { corpo: FICHA },
      "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
      [`GET /v1/escritorio/clientes/${cid(1)}/anterior`]: { corpo: { anterior: {
        origem: "ASTREA", importacao: { id: "f1", arquivo: "backup-astrea.xlsx", em: "2026-11-22T19:50:00Z" }, pago: 230000, total: 3,
        lembretes: [{ id: "l1", valor: 125000, lancamentos: 1, caso: { id: CASO, nome: "Prado x INSS" } }],
        lancamentos: [
          { data: "2026-11-15", descricao: "Honorários · parcela 2 de 4", valor: 125000, situacao: "EM_ABERTO", caso: "Prado x INSS" },
          { data: "2026-10-10", descricao: "Honorários · parcela 1 de 4", valor: 150000, situacao: "PAGO", caso: "Prado x INSS" },
          { data: null, descricao: "Consulta", valor: 80000, situacao: "PAGO", caso: null },
        ],
      } } },
    });
    await page.goto(`${P}/clientes/${cid(1)}`);
    const antigo = page.getByRole("region", { name: "Do Astrea" });
    await expect(antigo).toContainText("Só informação: fora do Caixa");
    await expect(antigo).toContainText("R$ 1.250,00 em aberto no Astrea, no caso Prado x INSS.");
    await expect(antigo.getByRole("link", { name: "Criar o contrato" })).toHaveAttribute("href", `/contratos/contratos/novo?cliente=${cid(1)}`);
    await expect(antigo).toContainText("R$ 2.300,00 pagos antes do T3jus");
    await expect(antigo.getByRole("list", { name: "Lançamentos do Astrea" }).getByRole("listitem")).toHaveCount(3);
    await semViolacoes(page);
  });

  test("assinatura na ficha: abre o caso junto e leva à ficha do caso (CH-10)", async ({ page }) => {
    await page.route("**/arquivos-falsos/**", (rota) => rota.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      [`GET /v1/escritorio/clientes/${cid(1)}`]: { corpo: FICHA },
      [`GET /v1/escritorio/clientes/${cid(1)}/contratos`]: { corpo: { contratos: CONTRATOS } },
      "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
      [`GET /v1/escritorio/contratos/${CT}/caso`]: { corpo: OPCOES },
      "POST /v1/escritorio/anexos": { status: 201, corpo: { id: ANEXO, enderecoDeEnvio: `${P}/arquivos-falsos/${ESC}/${ANEXO}?token=uso-unico` } },
      [`POST /v1/escritorio/anexos/${ANEXO}/concluir`]: { corpo: { id: ANEXO, categoria: "CONTRATO_ASSINADO", nome: "assinado.pdf" } },
      [`POST /v1/escritorio/contratos/${CT}/assinatura`]: [
        { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { campos: ["caso.nome"] } } } },
        { corpo: { id: CT, versao: 3, recebimentos: 1, casoId: CASO, podeVerCaso: true } },
      ],
    });
    await page.goto(`${P}/clientes/${cid(1)}?aba=contratos`);
    const tab = ehCelular(page) ? page.getByRole("list", { name: "Contratos de Antônia Ferreira Prado" }) : page.getByRole("table", { name: "Contratos de Antônia Ferreira Prado" });
    await expect(tab).toContainText("veio da P-2026-014");
    await expect(page.getByRole("navigation", { name: "Seções da ficha" }).getByRole("link", { name: /^Contratos/ })).toHaveAttribute("aria-current", "page");
    await semViolacoes(page);
    await page.getByRole("region", { name: "Próximo passo" }).getByRole("button", { name: "Registrar assinatura" }).click();
    const j = page.getByRole("dialog", { name: "Registrar assinatura" });
    await expect(j.getByLabel("Nome do caso")).toHaveValue("Antônia Ferreira Prado · Pensão por morte");
    await expect(j.getByLabel("Área")).toHaveValue("PREVIDENCIARIO");
    await expect(j.getByLabel("Responsável")).toHaveValue(LARISSA.id);
    await expect(j.getByRole("radio", { name: /Este contrato não tem caso/ })).toBeVisible();
    await semViolacoes(page);
    await j.getByLabel("Data da assinatura").fill(br(0));
    await j.getByLabel(/Contrato assinado/).setInputFiles({ name: "assinado.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(900, 1) });
    await j.getByRole("button", { name: "Registrar e abrir o caso" }).click();
    // O servidor recusou o caso: nem a assinatura nem o caso ficam, e o campo diz o que acertar.
    await expect(j.getByLabel("Nome do caso")).toHaveAttribute("aria-invalid", "true");
    await expect(j).toContainText("os dois andam juntos");
    await j.getByLabel("Nome do caso").fill("Ferreira Prado x INSS");
    await j.getByRole("button", { name: "Registrar e abrir o caso" }).click();
    await expect(page).toHaveURL(new RegExp(`/juridico/casos/${CASO}`));
    const corpo = pedidos.filter((p) => p.caminho === `/v1/escritorio/contratos/${CT}/assinatura`).at(-1)?.corpo;
    expect(corpo).toEqual({ versao: 2, assinadoEm: dia(0), caso: { modo: "NOVO", nome: "Ferreira Prado x INSS", area: "PREVIDENCIARIO", responsavelId: LARISSA.id, papel: "AUTOR" } });
    expect(pedidos.filter((p) => p.caminho === "/v1/escritorio/anexos")).toHaveLength(1);
  });

  test("sem a área do passo: diz quem pode e o botão vira Registrar atendimento; só as abas da pessoa", async ({ page }) => {
    const passo = { ...PASSO_ASSINAR, pode: false, quemPode: ["Marina Ribeiro", "Felipe Matos"], item: null };
    await simular(page, {
      "/v1/escritorio": { corpo: COM_DIEGO },
      [`GET /v1/escritorio/clientes/${cid(1)}`]: { corpo: { ...FICHA, passo, contagens: { propostas: 2 }, noEscritorio: { proposta: FICHA.noEscritorio.proposta } } },
      "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
    });
    await page.goto(`${P}/clientes/${cid(1)}`);
    const ambar = page.getByRole("region", { name: "Próximo passo" });
    await expect(ambar).toContainText("Quem registra a assinatura tem a área Contratos: Marina e Felipe.");
    await expect(ambar.getByRole("button", { name: "Registrar atendimento" })).toHaveClass(/btn-pri/);
    await expect(ambar.getByRole("button", { name: "Registrar assinatura" })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Seções da ficha" }).getByRole("link")).toHaveText(["Ficha", "Atendimentos4", "Propostas2"]);
    await expect(page.getByRole("region", { name: "No escritório" }).getByRole("listitem")).toHaveCount(1);
    await semViolacoes(page);
  });

  test("abas: Propostas com erro e tentar de novo; Casos vazio diz que o caso abre na assinatura", async ({ page }) => {
    const sem = { ...FICHA, passo: { tipo: "SEM_PROPOSTA", area: "COMERCIAL", pode: true, quemPode: null, item: null } };
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      [`GET /v1/escritorio/clientes/${cid(1)}`]: { corpo: sem },
      [`GET /v1/escritorio/clientes/${cid(1)}/propostas`]: [{ status: 500, corpo: { erro: { codigo: "INTERNAL_ERROR" } } }, { corpo: { propostas: [] } }],
      [`GET /v1/escritorio/clientes/${cid(1)}/casos`]: { corpo: { casos: [] } },
      "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
    });
    await page.goto(`${P}/clientes/${cid(1)}?aba=propostas`);
    await expect(page.getByRole("heading", { name: "Não deu para carregar as propostas de Antônia" })).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(page.getByRole("heading", { name: "Nenhuma proposta para Antônia ainda" })).toBeVisible();
    const gerar = page.getByRole("link", { name: "Gerar proposta" });
    await expect(gerar.first()).toHaveAttribute("href", `/comercial/propostas/nova?cliente=${cid(1)}`);
    await page.goto(`${P}/clientes/${cid(1)}?aba=casos`);
    await expect(page.getByText("O caso abre em Jurídico quando a assinatura do contrato for registrada", { exact: false })).toBeVisible();
    await semViolacoes(page);
  });
});

// Jornada do cliente, parte 2 (EX-16, CH-13; F3.127, F3.129, F3.130), tela aprovada em
// docs/design/aprovadas/portal-jornada-fechamento (grupos 4, 6 e 8).
test.describe("Jornada do cliente: o fechamento e o contrato sem caso", () => {
  const CASO_F = { id: CASO, nome: "Ferreira Prado x INSS", resultado: "GANHO", encerradoEm: "2026-10-30T15:00:00-03:00" };
  const PASSOS = [
    { tipo: "EXITO", area: "FINANCEIRO", feito: true, em: "2026-11-10T12:00:00-03:00", por: DIEGO, valor: 1159200, percentual: 3000 },
    { tipo: "REPASSE", area: "FINANCEIRO", feito: true, em: "2026-11-13", valor: 0, levantamentoId: "lv000000-0000-4000-8000-000000000001" },
    { tipo: "FINANCEIRO", area: "FINANCEIRO", feito: false, em: null, valor: 381840, pendentes: ["Parceiro", "Perito"], levantamentoId: "lv000000-0000-4000-8000-000000000001" },
    { tipo: "CONTRATO", area: "CONTRATOS", feito: false, em: null, contratos: [{ id: CT, numero: "C-2025-047" }] },
  ];
  const FECHA = { tipo: "FECHAMENTO", area: "FINANCEIRO", pode: true, quemPode: null, quemFaz: ["Marina Ribeiro", "Diego Almeida"], item: { caso: CASO_F, passos: PASSOS } };

  test("Fechar o caso: os passos no lugar da trilha e o botão da próxima coisa (EX-16)", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      [`GET /v1/escritorio/clientes/${cid(1)}`]: { corpo: { ...FICHA, passo: FECHA } },
      "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
    });
    await page.goto(`${P}/clientes/${cid(1)}`);
    const ambar = page.getByRole("region", { name: "Próximo passo · fechamento" });
    await expect(ambar.getByText("Fechar o caso", { exact: true })).toBeVisible();
    await expect(ambar.getByRole("list", { name: "Caminho do cliente no escritório" })).toHaveCount(0);
    const lista = ambar.getByRole("list", { name: "Fechamento do caso, em 4 passos" });
    await expect(lista.getByRole("listitem")).toHaveText([
      "Conferir o êxito: feitoConferido por Diego em 10/11",
      "Repassar a Antônia: feitoRepassado em 13/11",
      "3Encerrar no financeiro: é o próximo passoFaltam R$ 3.818,40: Parceiro e Perito",
      "4Encerrar o contrato: depoisC-2025-047, junto com o financeiro",
    ]);
    await expect(ambar.getByRole("link", { name: "Ver o acerto" })).toHaveAttribute("href", "/financeiro/repasses/lv000000-0000-4000-8000-000000000001");
    await expect(ambar).toContainText("Quem faz: a área Financeiro (Marina e Diego).");
    await semViolacoes(page);
  });

  test("sem a área do passo: quem faz e Ver o caso, sem valores (decisão 16)", async ({ page }) => {
    const semValor = PASSOS.map((x) => ({ ...x, valor: null, pendentes: null, levantamentoId: null }));
    await simular(page, {
      "/v1/escritorio": { corpo: { ...ESCRITORIO, pessoa: "Larissa Costa", dono: false, areas: ["JURIDICO"], funcoes: ["EQUIPE"] } },
      [`GET /v1/escritorio/clientes/${cid(1)}`]: { corpo: { ...FICHA, comercial: false, passo: { ...FECHA, pode: false, quemPode: ["Marina Ribeiro", "Diego Almeida"], quemFaz: null, item: { caso: CASO_F, passos: semValor } } } },
      "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
    });
    await page.goto(`${P}/clientes/${cid(1)}`);
    const ambar = page.getByRole("region", { name: "Próximo passo · fechamento" });
    await expect(ambar).toContainText("Quem faz: a área Financeiro, que não está liberada para você. Marina e Diego.");
    await expect(ambar).toContainText("Falta pagar terceiros");
    await expect(ambar.getByRole("link", { name: "Ver o acerto" })).toHaveCount(0);
    await expect(ambar.getByRole("link", { name: "Ver o caso" })).toHaveAttribute("href", `/juridico/casos/${CASO}`);
    await semViolacoes(page);
  });

  // F3.132 (EX-16, FI-08): o caso sem levantamento, desenho aprovado em
  // docs/design/aprovadas/portal-fechamento-sem-levantamento (estados 1, 2 e 15).
  const CASO_L = { id: CASO, nome: "Carvalho x Construtora Lume", resultado: "PERDA", encerradoEm: "2026-11-06T17:10:00-03:00" };
  const FIN_L = { tipo: "FINANCEIRO", area: "FINANCEIRO", feito: false, em: null, valor: 141230, pendentes: ["parcela 6 de 6", "custas"],
    contratoId: CT, casoId: CASO, aVencer: null, comLevantamento: false };
  const CTR_L = { tipo: "CONTRATO", area: "CONTRATOS", feito: false, em: null, contratos: [{ id: CT, numero: "C-2026-012" }] };
  const FECHA_L = { ...FECHA, quemFaz: ["Marina Ribeiro", "Diego Almeida", "Bianca Lopes"], item: { caso: CASO_L, passos: [FIN_L, CTR_L] } };

  test("F3.132, estado 1: sem levantamento, \"Ver o acerto\" leva à folha do contrato", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      [`GET /v1/escritorio/clientes/${cid(1)}`]: { corpo: { ...FICHA, passo: FECHA_L } },
      "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
    });
    await page.goto(`${P}/clientes/${cid(1)}`);
    const ambar = page.getByRole("region", { name: "Próximo passo · fechamento" });
    await expect(ambar).toContainText("Carvalho x Construtora Lume terminou com perda em 06/11. Falta o acerto no financeiro e encerrar o contrato.");
    await expect(ambar.getByRole("list", { name: "Fechamento do caso, em 2 passos" }).getByRole("listitem")).toHaveText([
      "1Encerrar no financeiro: é o próximo passoFaltam R$ 1.412,30: parcela 6/6 e custas",
      "2Encerrar o contrato: depoisC-2026-012, junto com o financeiro",
    ]);
    await expect(ambar.getByRole("link", { name: "Ver o acerto" })).toHaveAttribute("href", `/financeiro/a-receber/contratos/${CT}#t-fecha-${CASO}`);
    await expect(ambar).toContainText("Quem faz: a área Financeiro (Marina, Diego e Bianca). O contrato pode ser encerrado junto.");
    await semViolacoes(page);
  });

  test("F3.132, estado 2 (PT-02): sem o Financeiro, \"Com o Financeiro\" e Ver o caso, sem valores", async ({ page }) => {
    const semValor = { ...FIN_L, valor: null, pendentes: null, contratoId: null, casoId: null };
    await simular(page, {
      "/v1/escritorio": { corpo: { ...ESCRITORIO, pessoa: "Larissa Costa", dono: false, areas: ["JURIDICO"], funcoes: ["EQUIPE"] } },
      [`GET /v1/escritorio/clientes/${cid(1)}`]: { corpo: { ...FICHA, comercial: false, passo: { ...FECHA_L, pode: false, quemPode: ["Marina Ribeiro", "Diego Almeida"], quemFaz: null,
        item: { caso: CASO_L, passos: [semValor, { ...CTR_L, contratos: undefined }] } } } },
      "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
    });
    await page.goto(`${P}/clientes/${cid(1)}`);
    const ambar = page.getByRole("region", { name: "Próximo passo · fechamento" });
    await expect(ambar).toContainText("O acerto do caso está com o Financeiro.");
    await expect(ambar).toContainText("Com o Financeiro");
    await expect(ambar).not.toContainText("R$");
    await expect(ambar.getByRole("link", { name: "Ver o acerto" })).toHaveCount(0);
    await expect(ambar.getByRole("link", { name: "Ver o caso" })).toHaveAttribute("href", `/juridico/casos/${CASO}`);
    await semViolacoes(page);
  });

  test("F3.132, estado 15 (pergunta 1): esperando o êxito, sem atraso", async ({ page }) => {
    const espera = { ...FIN_L, valor: 840000, pendentes: ["êxito de Joana"], aVencer: { vencimento: "2026-12-15", descricao: "Êxito", cliente: "Joana Pereira", exito: true } };
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      [`GET /v1/escritorio/clientes/${cid(1)}`]: { corpo: { ...FICHA, passo: { ...FECHA_L, item: { caso: { ...CASO_L, nome: "Pereira x Mercado Bom Preço", resultado: "ACORDO", encerradoEm: "2026-11-18T14:50:00-03:00" }, passos: [espera, CTR_L] } } } },
      "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
    });
    await page.goto(`${P}/clientes/${cid(1)}`);
    const ambar = page.getByRole("region", { name: "Próximo passo · fechamento" });
    await expect(ambar).toContainText("Nada está atrasado: o fechamento espera o êxito de Joana.");
    await expect(ambar).toContainText("Esperando o êxito de Joana, em 15/12");
    await semViolacoes(page);
  });

  test("Cliente atendido: Gerar proposta secundário e Ver o caso ao lado (decisão 18)", async ({ page }) => {
    const feitos = PASSOS.map((x) => ({ ...x, feito: true, em: "2026-11-18T12:00:00-03:00" }));
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      [`GET /v1/escritorio/clientes/${cid(1)}`]: { corpo: { ...FICHA, passo: { tipo: "ATENDIDO", area: "COMERCIAL", pode: true, quemPode: null,
        item: { caso: CASO_F, passos: feitos, fim: "2026-11-18T12:00:00-03:00" } } } },
      "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
    });
    await page.goto(`${P}/clientes/${cid(1)}`);
    const ambar = page.getByRole("region", { name: "Próximo passo" });
    await expect(ambar.getByText("Cliente atendido", { exact: true })).toBeVisible();
    await expect(ambar.getByRole("link", { name: "Gerar proposta" })).toHaveClass(/btn-sec/);
    await expect(ambar.getByRole("link", { name: "Ver o caso" })).toBeVisible();
    await semViolacoes(page);
  });

  test("Contrato ativo (CH-13): Ver o contrato, e a trilha termina em Sem caso", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      [`GET /v1/escritorio/clientes/${cid(1)}`]: { corpo: { ...FICHA, passo: { tipo: "CONTRATO_ATIVO", area: "CONTRATOS", pode: true, quemPode: null,
        item: { id: CT, numero: "C-2026-040", objeto: "Consultoria trabalhista mensal", proximo: { vencimento: "2026-12-10", descricao: "Mensalidade 3", valor: 120000 } } } } },
      "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
    });
    await page.goto(`${P}/clientes/${cid(1)}`);
    const ambar = page.getByRole("region", { name: "Próximo passo" });
    await expect(ambar.getByText("Contrato ativo", { exact: true })).toBeVisible();
    await expect(ambar.getByRole("list", { name: "Caminho do cliente no escritório" })).toContainText("Sem caso");
    await expect(ambar.getByRole("link", { name: "Ver o contrato" })).toHaveAttribute("href", `/contratos/contratos/${CT}`);
    await expect(ambar.getByRole("link", { name: "Gerar proposta" })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("o botão do passo uma vez só: no Histórico, só Registrar atendimento (decisão 33)", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      [`GET /v1/escritorio/clientes/${cid(1)}`]: { corpo: FICHA },
      [`GET /v1/escritorio/clientes/${cid(1)}/atendimentos`]: { corpo: { atendimentos: [] } },
      "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
    });
    await page.goto(`${P}/clientes/${cid(1)}?aba=atendimentos`);
    await expect(page.getByRole("button", { name: "Registrar assinatura" })).toHaveCount(1);
    await expect(page.getByRole("region", { name: "Próximo passo" }).getByRole("button", { name: "Registrar assinatura" })).toBeVisible();
  });
});
