// Clientes do Portal (telas aprovadas em docs/design/aprovadas/portal-clientes): lista com busca
// e filtros, cadastro com qualificação e possível duplicado, ficha com abas, editar com
// conflito, registrar atendimento, inativar e reativar. A API é simulada; aqui se testa a tela,
// a acessibilidade e o que ela manda ao servidor.
import { expect, test, type Page } from "@playwright/test";
import { agora, fixarRelogio, h, semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const cid = (n: number) => `c1000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;
const kid = (n: number) => `d1000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const DIEGO = { id: "a0000000-0000-4000-8000-000000000103", nome: "Diego Almeida" };

const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};
const LARISSA = { ...ESCRITORIO, pessoa: "Larissa Costa", dono: false, areas: ["JURIDICO"], funcoes: ["EQUIPE"] };

/** Data em Brasília, aaaa-mm-dd, a n dias de hoje. */
const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(agora + n * 864e5));
const linha = (n: number, nome: string, extra: Record<string, unknown> = {}) => ({
  id: cid(n), tipo: "PF", nome, situacao: "ATIVO", versao: 1, origem: "INDICACAO_CLIENTE", proxContato: null,
  contatoPrincipal: { id: kid(n), nome, papel: null, telefone: `+55119887766${String(n).padStart(2, "0")}`, email: null }, ...extra,
});
const ANTONIA = linha(1, "Antônia Ferreira Prado", {
  contatoPrincipal: { id: kid(1), nome: "Joana Prado", papel: "Filha", telefone: "+5511991234567", email: null },
  proxContato: { em: dia(-5), oque: "Ligar para Joana sobre a carta do INSS", vencido: true, responsavel: DIEGO },
});
const ATIVOS = [
  ANTONIA,
  linha(2, "Bruno Teixeira", { proxContato: { em: dia(0), oque: "Confirmar reunião", vencido: false, responsavel: MARINA } }),
  linha(3, "Construtora Vale Alto Ltda.", { tipo: "PJ", origem: "INDICACAO_PARCEIRO", proxContato: { em: dia(3), oque: "Enviar a minuta", vencido: false, responsavel: MARINA } }),
  linha(4, "Débora Nunes", { origem: "GOOGLE" }),
];
const INATIVOS = [linha(5, "João Pedro Alves", { situacao: "INATIVO", proxContato: null })];
const semComercial = (l: ReturnType<typeof linha>) => {
  const { origem: _o, proxContato: _p, ...r } = l;
  return r;
};

const FICHA = {
  id: cid(1), tipo: "PF", nome: "Antônia Ferreira Prado", documento: "52998224725", nacionalidade: "brasileira", estadoCivil: "VIUVO", profissao: null,
  rg: null, rgOrgao: null, cep: "04117030", endereco: "Rua das Acácias, 418, casa 2", bairro: "Vila Mariana", cidade: "São Paulo", uf: "SP",
  repNome: null, repCargo: null, repDocumento: null, repEstadoCivil: null, repProfissao: null, situacao: "ATIVO", inativadoEm: null,
  motivoInativacao: null, inativadoPor: null, criadoEm: h(24 * 22), criadoPor: { id: "x", nome: "Paula Nunes" }, versao: 3, comercial: true,
  podeInativar: true, faltando: ["PROFISSAO", "RG"], alterado: { em: h(30), por: "Paula Nunes" },
  contatos: [
    { id: kid(1), nome: "Joana Prado", papel: "Filha · acompanha o caso", telefone: "+5511991234567", email: "joana.prado@exemplo.com.br", principal: true },
    { id: kid(11), nome: "Antônia Ferreira Prado", papel: null, telefone: "+5511987654321", email: null, principal: false },
  ],
  origem: "INDICACAO_CLIENTE", origemIndicacao: "Rosa Almeida", atendimentos: 2, primeiroAtendimento: { em: h(24 * 22), canal: "TELEFONE" },
  proxContato: ANTONIA.proxContato,
};
const ATENDIMENTOS = [
  {
    id: "f1000000-0000-4000-8000-000000000002", ocorridoEm: h(24 * 12), canal: "WHATSAPP", comQuem: "Joana Prado (filha)", atendidoPor: DIEGO,
    resumo: "Joana mandou a certidão de óbito. Falta a carta do INSS.", registradoEm: h(24 * 12),
    proxContato: { em: dia(-5), oque: "Ligar para Joana sobre a carta do INSS", responsavel: DIEGO },
  },
  {
    id: "f1000000-0000-4000-8000-000000000001", ocorridoEm: h(24 * 22), canal: "TELEFONE", comQuem: "Joana Prado (filha)", atendidoPor: { id: "x", nome: "Paula Nunes" },
    resumo: "Ligou por indicação de Rosa Almeida pedindo horário.", registradoEm: h(24 * 22), proxContato: null,
  },
];
const PESSOAS = [DIEGO, MARINA, { id: "a0000000-0000-4000-8000-000000000104", nome: "Paula Nunes" }];

type Resp = { status?: number; corpo: unknown };
type Pedido = { metodo: string; caminho: string; busca: string; corpo: unknown };

/** API simulada que olha também a busca do endereço ("GET /v1/escritorio/clientes?situacao=ATIVO"). */
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

const listas = (comercial = true) => ({
  "GET /v1/escritorio/clientes?situacao=ATIVO": { corpo: { comercial, clientes: comercial ? ATIVOS : ATIVOS.map(semComercial) } },
  "GET /v1/escritorio/clientes?situacao=INATIVO": { corpo: { comercial, clientes: comercial ? INATIVOS : INATIVOS.map(semComercial) } },
});
const ehCelular = (page: Page) => (page.viewportSize()?.width ?? 1000) <= 760;
const lista = (page: Page) => (ehCelular(page) ? page.getByRole("list", { name: "Clientes" }) : page.locator("table.cl-tab"));

// O relógio do navegador fica em AGORA, o mesmo instante de onde os dados contam (F3.164).
test.beforeEach(async ({ page }) => { await fixarRelogio(page); });

test.describe("Clientes do Portal: lista (AP-01, AP-06)", () => {
  test("ativos com origem e próximo contato; vencido e hoje com selo escrito", async ({ page }) => {
    await simular(page, { "/v1/escritorio": { corpo: ESCRITORIO }, ...listas() });
    await page.goto(`${P}/clientes`);
    await expect(page.getByRole("heading", { level: 1, name: "Clientes" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "4 clientes ativos · 1 com o próximo contato vencido" })).toBeVisible();
    await expect(lista(page).getByText("vencido há 5 dias")).toBeVisible();
    await expect(lista(page).getByText("Hoje", { exact: true })).toBeVisible();
    await expect(lista(page).getByText("Joana Prado")).toBeVisible();
    await expect(page.getByRole("button", { name: /Contato vencido \(1\)/ })).toBeVisible();
    await semViolacoes(page);
  });

  test("nome longo quebra em linhas sem cobrir o tipo do cliente", async ({ page }) => {
    const LONGO = linha(9, "CAROLINA SOARES SANTANA DE ALBUQUERQUE MONTEIRO CAVALCANTI");
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/clientes?situacao=ATIVO": { corpo: { comercial: true, clientes: [LONGO] } },
      "GET /v1/escritorio/clientes?situacao=INATIVO": { corpo: { comercial: true, clientes: [] } },
    });
    await page.goto(`${P}/clientes`);
    const nome = lista(page).getByRole("link", { name: LONGO.nome });
    const tipo = lista(page).getByText("Pessoa física", { exact: true });
    await expect(tipo).toBeVisible();
    const a = (await nome.boundingBox())!;
    const b = (await tipo.boundingBox())!;
    expect(a.y + a.height).toBeLessThanOrEqual(b.y + 1);
  });

  test("filtros: vencidos e inativos; a busca vai ao servidor e realça o termo", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO }, ...listas(),
      "GET /v1/escritorio/clientes?q=Prado": { corpo: { comercial: true, clientes: [ANTONIA] } },
      "GET /v1/escritorio/clientes?q=Pardo": { corpo: { comercial: true, clientes: [] } },
    });
    await page.goto(`${P}/clientes`);
    await page.getByRole("button", { name: /Contato vencido/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "1 cliente com o próximo contato vencido" })).toBeVisible();
    await page.getByRole("button", { name: /Inativos/ }).click();
    await expect(lista(page).getByRole("link", { name: "João Pedro Alves" })).toBeVisible();
    await expect(page).toHaveURL(/filtro=inativos/);
    await page.getByLabel("Buscar por nome, CPF, CNPJ ou telefone").fill("Prado");
    await expect(page.getByRole("status").filter({ hasText: "1 cliente para “Prado”" })).toBeVisible();
    await expect(lista(page).locator("mark.cl-m").first()).toHaveText("Prado");
    expect(pedidos.some((p) => p.busca === "?q=Prado")).toBe(true);
    await page.getByLabel("Buscar por nome, CPF, CNPJ ou telefone").fill("Pardo");
    await expect(page.getByRole("heading", { name: "Nenhum cliente para “Pardo”" })).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Limpar busca" }).click();
    await expect(page.getByLabel("Buscar por nome, CPF, CNPJ ou telefone")).toBeFocused();
  });

  test("sem a área Comercial: sem origem, sem próximo contato, e diz quem libera", async ({ page }) => {
    await simular(page, { "/v1/escritorio": { corpo: LARISSA }, ...listas(false) });
    await page.goto(`${P}/clientes`);
    await expect(page.getByText("Origem, próximo contato e histórico de atendimento ficam na área Comercial", { exact: false })).toBeVisible();
    await expect(page.getByText("Quem libera as áreas é Marina Ribeiro.", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: /Contato vencido/ })).toHaveCount(0);
    await expect(page.getByText("vencido há", { exact: false })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("lista vazia convida a cadastrar o primeiro; erro oferece tentar de novo", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/clientes?situacao=ATIVO": [{ status: 500, corpo: { erro: { codigo: "INTERNAL_ERROR" } } }, { corpo: { comercial: true, clientes: [] } }],
      "GET /v1/escritorio/clientes?situacao=INATIVO": { corpo: { comercial: true, clientes: [] } },
    });
    await page.goto(`${P}/clientes`);
    await expect(page.getByRole("heading", { name: "Não deu para carregar os clientes" })).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(page.getByRole("link", { name: "Cadastrar o primeiro cliente" })).toBeVisible();
    // F3.115 (estado clientes-vazio): os atalhos de onde importar; Astrea e ADVBOX só para a sócia dona.
    const atalhos = page.getByRole("list", { name: "De onde importar" });
    await expect(atalhos.getByRole("link", { name: /^Planilha/ })).toHaveAttribute("href", "/clientes/importar?origem=planilha");
    await expect(atalhos.getByRole("link", { name: /^Backup do Astrea/ })).toHaveAttribute("href", "/clientes/importar/astrea");
    await expect(atalhos.getByRole("link", { name: /^ADVBOX/ })).toContainText("Pela planilha exportada do ADVBOX.");
    await expect(page.getByText("Usa outro sistema? Quase todos exportam planilha.")).toBeVisible();
    await semViolacoes(page);
  });

  test("F3.115: na lista vazia, a equipe vê só o atalho da planilha", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: LARISSA },
      "GET /v1/escritorio/clientes?situacao=ATIVO": { corpo: { comercial: false, clientes: [] } },
      "GET /v1/escritorio/clientes?situacao=INATIVO": { corpo: { comercial: false, clientes: [] } },
    });
    await page.goto(`${P}/clientes`);
    const atalhos = page.getByRole("list", { name: "De onde importar" });
    await expect(atalhos.getByRole("link")).toHaveCount(1);
    await expect(atalhos.getByRole("link", { name: /^Planilha/ })).toBeVisible();
  });
});

test.describe("Clientes do Portal: cadastro (AP-01, AP-04)", () => {
  test("erros presos ao campo, CPF conferido, duplicado avisa sem bloquear; depois cadastra", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/clientes/duplicados": { corpo: { duplicados: [{ id: cid(1), nome: "Antônia Ferreira Prado", situacao: "ATIVO", desde: h(24 * 22), por: "TELEFONE" }] } },
      "POST /v1/escritorio/clientes": { status: 201, corpo: { id: cid(9), versao: 1 } },
      [`GET /v1/escritorio/clientes/${cid(9)}`]: { corpo: { ...FICHA, id: cid(9), nome: "Marcos Duarte", proxContato: null, atendimentos: 0, faltando: ["NACIONALIDADE", "ESTADO_CIVIL", "PROFISSAO", "RG", "ENDERECO"] } },
      "/v1/escritorio/pessoas": { corpo: { pessoas: PESSOAS } },
    });
    await page.goto(`${P}/clientes/novo`);
    await expect(page.getByRole("heading", { level: 1, name: "Novo cliente" })).toBeVisible();
    await expect(page.getByLabel(/^Nome completo/)).toBeFocused();
    await semViolacoes(page);
    await page.getByLabel(/^CPF/).fill("529.982.247-24");
    await page.getByRole("button", { name: "Cadastrar cliente" }).click();
    await expect(page.getByText("Falta acertar 3 pontos, marcados abaixo.")).toBeVisible();
    await expect(page.getByLabel(/^Nome completo/)).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel(/^Nome completo/)).toBeFocused();
    await expect(page.getByText("Confira o CPF: o último dígito não bate", { exact: false })).toBeVisible();
    await semViolacoes(page);
    await page.getByLabel(/^Nome completo/).fill("Marcos Duarte");
    await page.getByLabel(/^Telefone ou WhatsApp/).fill("(11) 98877-6601");
    await page.getByLabel(/^Telefone ou WhatsApp/).blur();
    await expect(page.getByText("Já existe um cliente com este telefone: Antônia Ferreira Prado.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir a ficha de Antônia" })).toHaveAttribute("href", `/clientes/${cid(1)}`);
    await page.getByLabel(/^CPF/).fill("529.982.247-25");
    await page.getByLabel(/^CPF/).blur();
    await expect(page.getByText("Dígitos conferidos")).toBeVisible();
    await page.getByLabel(/^Origem/).selectOption("INDICACAO_CLIENTE");
    await page.getByLabel(/^Quem indicou/).fill("Rosa Almeida");
    await page.getByText("Preencher agora").click();
    await page.getByLabel(/^Estado civil/).selectOption("CASADO");
    await page.getByLabel(/^CEP/).fill("04117-030");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Cadastrar cliente" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Marcos Duarte" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Marcos Duarte cadastrado." })).toBeVisible();
    const corpo = pedidos.find((p) => p.metodo === "POST" && p.caminho === "/v1/escritorio/clientes")?.corpo as Record<string, unknown>;
    expect(corpo).toMatchObject({
      tipo: "PF", nome: "Marcos Duarte", documento: "52998224725", estadoCivil: "CASADO", cep: "04117030", origem: "INDICACAO_CLIENTE",
      origemIndicacao: "Rosa Almeida", contatos: [{ nome: "Marcos Duarte", telefone: "+5511988776601", principal: true }],
    });
  });

  test("pessoa jurídica pede com quem falar e o CNPJ; sem Comercial, não há origem", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: LARISSA },
      "POST /v1/escritorio/clientes": { status: 201, corpo: { id: cid(8), versao: 1 } },
      [`GET /v1/escritorio/clientes/${cid(8)}`]: { corpo: { ...FICHA, id: cid(8), tipo: "PJ", nome: "Oficina Irmãos Dias Ltda.", comercial: false, podeInativar: false } },
    });
    await page.goto(`${P}/clientes/novo`);
    await page.getByRole("radio", { name: /Pessoa jurídica/ }).check();
    await expect(page.getByLabel(/^Origem/)).toHaveCount(0);
    await page.getByLabel(/^Razão social/).fill("Oficina Irmãos Dias Ltda.");
    await page.getByLabel(/^Com quem falar/).fill("Rogério Dias");
    await page.getByLabel(/^Papel/).fill("Sócio");
    await page.getByLabel(/^E-mail/).fill("rogerio@oficina.exemplo.com.br");
    await page.getByLabel(/^CNPJ/).fill("11.222.333/0001-81");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Cadastrar cliente" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Oficina Irmãos Dias Ltda." })).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")?.corpo).toMatchObject({
      tipo: "PJ", documento: "11222333000181", contatos: [{ nome: "Rogério Dias", papel: "Sócio", email: "rogerio@oficina.exemplo.com.br", principal: true }],
    });
  });
});

test.describe("Clientes do Portal: ficha (AP-01, AP-02, AP-06)", () => {
  const rotas = (extra: Record<string, Resp | Resp[]> = {}) => ({
    "/v1/escritorio": { corpo: ESCRITORIO },
    [`GET /v1/escritorio/clientes/${cid(1)}`]: { corpo: FICHA },
    [`GET /v1/escritorio/clientes/${cid(1)}/atendimentos`]: { corpo: { atendimentos: ATENDIMENTOS } },
    "/v1/escritorio/pessoas": { corpo: { pessoas: PESSOAS } },
    ...extra,
  });

  test("ficha: próximo contato vencido no âmbar, qualificação com o que falta, contatos e origem", async ({ page }) => {
    await simular(page, rotas());
    await page.goto(`${P}/clientes/${cid(1)}`);
    await expect(page.getByRole("heading", { level: 1, name: "Antônia Ferreira Prado" })).toBeVisible();
    await expect(page.getByText("vencido há 5 dias")).toBeVisible();
    await expect(page.getByText("4 de 6")).toBeVisible();
    await expect(page.getByText("pede para a procuração").first()).toBeVisible();
    await expect(page.getByText("Principal", { exact: true })).toBeVisible();
    await expect(page.getByText("Rosa Almeida")).toBeVisible();
    await expect(page.getByRole("link", { name: "Atendimentos 2" })).toBeVisible();
    await semViolacoes(page);
  });

  test("sem a área Comercial: âmbar da procuração, sem aba Atendimentos nem inativar", async ({ page }) => {
    const { origem: _o, origemIndicacao: _i, proxContato: _p, atendimentos: _a, primeiroAtendimento: _pa, ...semCom } = FICHA;
    await simular(page, { ...rotas(), "/v1/escritorio": { corpo: LARISSA }, [`GET /v1/escritorio/clientes/${cid(1)}`]: { corpo: { ...semCom, comercial: false, podeInativar: false } } });
    await page.goto(`${P}/clientes/${cid(1)}?aba=atendimentos`);
    await expect(page.getByText("Para a procuração", { exact: true })).toBeVisible();
    await expect(page.getByText("Falta: profissão e rg")).toBeVisible();
    await expect(page.getByRole("link", { name: /Atendimentos/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Inativar cliente" })).toHaveCount(0);
    await expect(page.getByText("Quem libera as áreas é Marina Ribeiro.", { exact: false })).toBeVisible();
    await semViolacoes(page);
  });

  test("atendimentos: aviso do vencido e histórico; registrar confere a data e manda o próximo contato", async ({ page }) => {
    const pedidos = await simular(page, rotas({ [`POST /v1/escritorio/clientes/${cid(1)}/atendimentos`]: { status: 201, corpo: { id: "f1000000-0000-4000-8000-000000000003" } } }));
    await page.goto(`${P}/clientes/${cid(1)}?aba=atendimentos`);
    await expect(page.getByText("O próximo contato venceu há 5 dias.")).toBeVisible();
    await expect(page.getByText("“Joana mandou a certidão de óbito. Falta a carta do INSS.”")).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Registrar atendimento" }).last().click();
    const j = page.getByRole("dialog", { name: "Registrar atendimento" });
    await expect(j.getByLabel("Data", { exact: true }).first()).toBeFocused();
    await j.getByLabel("Canal").selectOption("TELEFONE");
    const [a, m, d] = dia(-1).split("-");
    await j.getByRole("group", { name: /Próximo contato/ }).getByLabel("Data", { exact: true }).fill(`${d}/${m}/${a}`);
    await j.getByRole("button", { name: "Registrar" }).click();
    await expect(j.getByText("Esta data já passou. Escolha hoje ou um dia depois.")).toBeVisible();
    await expect(j.getByLabel("Resumo")).toHaveAttribute("aria-invalid", "true");
    await semViolacoes(page);
    await j.getByLabel("Resumo").fill("Liguei para Joana. A carta chegou.");
    const [a2, m2, d2] = dia(2).split("-");
    await j.getByRole("group", { name: /Próximo contato/ }).getByLabel("Data", { exact: true }).fill(`${d2}/${m2}/${a2}`);
    await j.getByLabel("Responsável").selectOption({ label: "Paula Nunes" });
    await j.getByLabel("O que fazer").fill("Receber os documentos no escritório");
    await j.getByRole("button", { name: "Registrar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Atendimento registrado." })).toBeVisible();
    const corpo = pedidos.find((p) => p.metodo === "POST")?.corpo as Record<string, unknown>;
    expect(corpo).toMatchObject({
      canal: "TELEFONE", resumo: "Liguei para Joana. A carta chegou.", comQuem: "Joana Prado (filha · acompanha o caso)", atendidoPor: MARINA.id,
      proxEm: dia(2), proxResponsavel: "a0000000-0000-4000-8000-000000000104", proxOque: "Receber os documentos no escritório",
    });
  });

  test("AP-03: a ficha mostra o cliente no funil; encerrar sem proposta entra no histórico e deixa voltar", async ({ page }) => {
    const saida = { id: "f1000000-0000-4000-8000-000000000077", motivo: "NAO_VOLTOU", nota: "Liguei duas vezes.", marcadoPor: MARINA, marcadoEm: new Date(agora).toISOString() };
    const pedidos = await simular(page, rotas({
      [`GET /v1/escritorio/clientes/${cid(1)}/funil`]: [
        { corpo: { situacao: "PRIMEIRO", podeEncerrar: true, rascunho: false, saida: null, eventos: [] } },
        { corpo: { situacao: "FORA", podeEncerrar: false, rascunho: false, saida, eventos: [saida] } },
      ],
      [`PUT /v1/escritorio/clientes/${cid(1)}/funil`]: { corpo: saida },
    }));
    await page.goto(`${P}/clientes/${cid(1)}?aba=atendimentos`);
    const folha = page.getByRole("region", { name: "No funil do Comercial" });
    await expect(folha).toContainText("Primeiro contato, sem proposta");
    await semViolacoes(page);
    await folha.getByRole("button", { name: "Encerrar sem proposta" }).click();
    const j = page.getByRole("dialog", { name: "Encerrar sem proposta" });
    await j.getByRole("radio", { name: /O cliente não voltou/ }).check();
    await j.getByLabel("Anotação (opcional)").fill("Liguei duas vezes.");
    await j.getByRole("button", { name: "Tirar do funil" }).click();
    await expect(page.getByRole("status").filter({ hasText: "saiu do funil." })).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "PUT" && p.caminho.endsWith("/funil"))?.corpo).toEqual({ motivo: "NAO_VOLTOU", nota: "Liguei duas vezes." });
    await expect(folha).toContainText("Saiu sem proposta");
    await expect(folha.getByRole("button", { name: "Voltar ao funil" })).toBeVisible();
    await expect(page.getByText(/Marina Ribeiro tirou \S+ do funil/)).toBeVisible();
    await semViolacoes(page);
  });

  test("editar: conflito mostra quem salvou antes e os campos que mudaram; salvar a minha versão", async ({ page }) => {
    const nova = { ...FICHA, versao: 4, profissao: "Aposentada", alterado: { em: "2026-11-18T17:52:00Z", por: "Felipe Matos" } };
    const pedidos = await simular(page, rotas({
      [`GET /v1/escritorio/clientes/${cid(1)}`]: [{ corpo: FICHA }, { corpo: nova }, { corpo: nova }],
      [`PUT /v1/escritorio/clientes/${cid(1)}`]: [{ status: 409, corpo: { erro: { codigo: "VERSION_CONFLICT" } } }, { corpo: { id: cid(1), versao: 5 } }],
    }));
    await page.goto(`${P}/clientes/${cid(1)}`);
    await page.getByRole("button", { name: "Editar" }).click();
    await expect(page.getByRole("heading", { name: "Editar ficha" })).toBeVisible();
    await page.getByLabel(/^Profissão/).fill("Do lar");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Salvar ficha" }).click();
    await expect(page.getByText("Felipe Matos salvou esta ficha às 14h52, enquanto você editava.")).toBeVisible();
    const tabela = page.locator("table.comparar");
    await expect(tabela.getByRole("row", { name: /Profissão/ })).toContainText("Aposentada");
    await expect(tabela.getByRole("row", { name: /Profissão/ })).toContainText("Do lar");
    await expect(page.getByLabel(/^Profissão/)).toHaveValue("Do lar");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Salvar a minha versão" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Ficha salva." })).toBeVisible();
    const puts = pedidos.filter((p) => p.metodo === "PUT").map((p) => (p.corpo as { versao: number; profissao: string }));
    expect(puts.map((p) => [p.versao, p.profissao])).toEqual([[3, "Do lar"], [4, "Do lar"]]);
  });

  test("inativar pede motivo e não apaga; o inativo mostra quem, quando e o motivo, e reativa", async ({ page }) => {
    const inativa = { ...FICHA, situacao: "INATIVO", versao: 4, inativadoEm: h(1), inativadoPor: DIEGO, motivoInativacao: "Desistiu da ação", proxContato: null };
    const pedidos = await simular(page, rotas({
      [`GET /v1/escritorio/clientes/${cid(1)}`]: [{ corpo: FICHA }, { corpo: inativa }, { corpo: { ...FICHA, versao: 5, proxContato: null } }],
      [`POST /v1/escritorio/clientes/${cid(1)}/inativar`]: { corpo: { versao: 4 } },
      [`POST /v1/escritorio/clientes/${cid(1)}/reativar`]: { corpo: { versao: 5 } },
    }));
    await page.goto(`${P}/clientes/${cid(1)}`);
    await page.getByRole("button", { name: "Inativar cliente" }).click();
    const j = page.getByRole("alertdialog", { name: "Inativar Antônia Ferreira Prado?" });
    await expect(j.getByLabel("Motivo")).toBeFocused();
    await j.getByRole("button", { name: "Inativar Antônia" }).click();
    await expect(j.getByText("Escreva o motivo. Ele fica no histórico e ajuda quem for reativar.")).toBeVisible();
    await semViolacoes(page);
    await j.getByLabel("Motivo").fill("Desistiu da ação");
    await j.getByRole("button", { name: "Inativar Antônia" }).click();
    await expect(page.getByText("Diego Almeida inativou: “Desistiu da ação”", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrar atendimento" })).toHaveCount(0);
    await semViolacoes(page);
    await page.getByRole("button", { name: "Reativar" }).click();
    const r = page.getByRole("dialog", { name: "Reativar Antônia Ferreira Prado?" });
    await r.getByRole("button", { name: "Reativar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Antônia Ferreira Prado reativado." })).toBeVisible();
    expect(pedidos.filter((p) => p.metodo === "POST").map((p) => p.corpo)).toEqual([
      { versao: 3, motivo: "Desistiu da ação" },
      { versao: 4, motivo: null },
    ]);
  });

  test("cliente de outro escritório (ou que não existe) é não encontrado", async ({ page }) => {
    await simular(page, { "/v1/escritorio": { corpo: ESCRITORIO } });
    await page.goto(`${P}/clientes/${cid(77)}`);
    await expect(page.getByRole("heading", { level: 1, name: "Cliente não encontrado" })).toBeVisible();
    await semViolacoes(page);
    const r = await page.goto(`${P}/clientes/abc`);
    expect(r?.status()).toBe(404);
  });
});
