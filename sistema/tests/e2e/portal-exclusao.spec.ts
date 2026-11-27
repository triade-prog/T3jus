// Pedido de exclusão do titular (F1.15, PT-11), tela aprovada em
// docs/design/aprovadas/portal-clientes-pendencias (estados excluir-* e excluido-*), com as
// decisões da Carol de 18/11/2026. A API é simulada.
// F3.155: a linha dos arquivos em "O que é apagado", pelo desenho aprovado em
// docs/design/aprovadas/portal-exclusao-arquivos (Carol, 24/11/2026).
// F3.156: a despesa adiantada ao cliente e o quadro "O que a lei obriga a guardar", pelo desenho
// aprovado em docs/design/aprovadas/portal-exclusao-despesas (Carol, 24/11/2026, alternativa A).
// F3.177 (F3.184): a descrição dos lançamentos do sistema antigo no quadro "O que a lei obriga a
// guardar", pelo desenho aprovado em docs/design/aprovadas/portal-exclusao-historico (Carol,
// 26/11/2026, alternativa A).
// F3.181, F3.186, F3.190, C9, F3.179 e F3.193: as linhas, as dicas e o aviso novos, pelo desenho
// aprovado em docs/design/aprovadas/portal-exclusao-contratos-conversas (Carol, 27/11/2026).
import { expect, test, type Page } from "@playwright/test";
import { agora, fixarRelogio, h, semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const CLI = "c1000000-0000-4000-8000-000000000301";
const DIEGO = { id: "a0000000-0000-4000-8000-000000000103", nome: "Diego Almeida" };
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };

const BASE = {
  id: ESC, nome: "Ribeiro & Matos", socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, cnpj: null, cidade: "São Paulo", uf: "SP",
  endereco: null, contatos: [], ultimaExportacao: null,
};
const ESC_MARINA = { ...BASE, pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"], funcoes: ["SOCIO"] };
const ESC_DIEGO = { ...BASE, pessoa: "Diego Almeida", dono: false, areas: ["COMERCIAL"], funcoes: ["EQUIPE"] };
const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(agora + n * 864e5));
const br = (iso: string) => iso.split("-").reverse().join("/");

const FICHA = {
  id: CLI, tipo: "PF", nome: "Antônia Ferreira Prado", documento: "52998224725", nacionalidade: "brasileira", estadoCivil: "VIUVO", profissao: null,
  rg: null, rgOrgao: null, cep: null, endereco: null, bairro: null, cidade: "São Paulo", uf: "SP", repNome: null, repCargo: null, repDocumento: null,
  repEstadoCivil: null, repProfissao: null, situacao: "ATIVO", inativadoEm: null, motivoInativacao: null, inativadoPor: null, criadoEm: h(24 * 22),
  criadoPor: { id: "x", nome: "Paula Nunes" }, versao: 3, comercial: true, podeInativar: true, faltando: ["PROFISSAO", "RG"], alterado: null,
  contatos: [
    { id: "k1", nome: "Joana Prado", papel: "Filha", telefone: "+5511991234567", email: null, principal: true },
    { id: "k2", nome: "Antônia Ferreira Prado", papel: null, telefone: "+5511987654321", email: null, principal: false },
  ],
  origem: "INDICACAO_CLIENTE", origemIndicacao: "Rosa Almeida", atendimentos: 3, primeiroAtendimento: { em: h(24 * 22), canal: "TELEFONE" },
  proxContato: { em: dia(-5), oque: "Ligar para Joana", vencido: true, responsavel: DIEGO },
  dono: true, pedidoExclusao: null, ultimaRecusa: null, exclusao: null,
};
const PEDIDO = { id: "p1", estado: "PENDENTE", pedidoEm: dia(0), canal: "WHATSAPP", observacao: "Pediu por mensagem, do número da ficha", registradoPor: DIEGO, registradoEm: h(1) };
const EXCLUIDA = {
  ...FICHA, nome: "Cliente excluído", documento: null, nacionalidade: null, estadoCivil: null, cidade: null, uf: null, contatos: [], origemIndicacao: null,
  proxContato: null, situacao: "EXCLUIDO", podeInativar: false, faltando: [], versao: 4,
  exclusao: { id: "p1", estado: "ATENDIDO", pedidoEm: dia(0), canal: "EMAIL", quemPediu: "TITULAR", registradoPor: MARINA, registradoEm: h(0.1),
    resolvidoPor: MARINA, resolvidoEm: h(0.1), protocolo: "EXC-2026-0007", em: h(0.1) },
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
const ficha = `/v1/escritorio/clientes/${CLI}`;

// O relógio do navegador fica em AGORA, o mesmo instante de onde os dados contam (F3.164).
test.beforeEach(async ({ page }) => { await fixarRelogio(page); });

test.describe("Pedido de exclusão do titular (F1.15, PT-11)", () => {
  test("a dona exclui: confere o pedido e o nome; a ficha vira “Cliente excluído”", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESC_MARINA }, [`GET ${ficha}`]: [{ corpo: FICHA }, { corpo: EXCLUIDA }],
      "GET /v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
      [`POST ${ficha}/exclusao`]: { corpo: { protocolo: "EXC-2026-0007", versao: 4, pedido: EXCLUIDA.exclusao } },
    });
    await page.goto(`${P}/clientes/${CLI}`);
    await page.getByRole("button", { name: "Atender pedido de exclusão" }).click();
    const j = page.getByRole("alertdialog", { name: "Excluir os dados de Antônia Ferreira Prado?" });
    await expect(j).toBeVisible();
    await expect(j.getByText("Os 2 contatos")).toBeVisible();
    await expect(j.getByText("Rosa Almeida")).toBeVisible();
    await expect(j.getByText(/Data, canal, quem atendeu e o resumo, nos 3 atendimentos/)).toBeVisible();
    // F3.155: sem o campo arquivosParaApagar, a lista é a aprovada antes, sem a linha dos arquivos.
    await expect(j.locator(".pd-some li")).toHaveCount(5);
    await expect(j.locator(".pd-some li").filter({ hasText: "do T3jus" })).toHaveCount(0);
    await semViolacoes(page);
    await j.getByLabel("Para confirmar, escreva o nome do cliente").fill("Antonia Prado");
    await j.getByRole("button", { name: "Excluir os dados para sempre" }).click();
    await expect(j.getByText("Falta acertar 3 pontos, marcados abaixo.")).toBeVisible();
    await expect(j.getByText("Escolha por onde o pedido chegou.")).toBeVisible();
    await expect(j.getByText(/O nome não confere/)).toBeVisible();
    expect(pedidos.some((p) => p.metodo === "POST")).toBe(false);
    await j.getByLabel("Como o pedido chegou").selectOption("EMAIL");
    await j.getByRole("checkbox", { name: /Conferi que o pedido veio do cliente/ }).check();
    await j.getByLabel("Para confirmar, escreva o nome do cliente").fill(" antônia ferreira  PRADO ");
    await expect(j.getByText("O nome confere")).toBeVisible();
    await j.getByRole("button", { name: "Excluir os dados para sempre" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Dados excluídos." })).toContainText("EXC-2026-0007");
    await expect(page.getByRole("heading", { level: 1, name: "Cliente excluído" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Registro da exclusão" }).getByText("EXC-2026-0007")).toBeVisible();
    await expect(page.getByRole("button", { name: "Atender pedido de exclusão" })).toHaveCount(0);
    const post = pedidos.find((p) => p.metodo === "POST")!;
    expect(post.corpo).toMatchObject({ versao: 3, pedidoEm: dia(0), canal: "EMAIL", quemPediu: "TITULAR", conferido: true });
    await semViolacoes(page);
  });

  test("decisão 2: quem não é a dona pede a exclusão a ela, e a faixa avisa", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESC_DIEGO },
      [`GET ${ficha}`]: [{ corpo: { ...FICHA, dono: false } }, { corpo: { ...FICHA, dono: false, pedidoExclusao: PEDIDO } }],
      "GET /v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
      [`POST ${ficha}/exclusao/pedido`]: { status: 201, corpo: PEDIDO },
    });
    await page.goto(`${P}/clientes/${CLI}`);
    await expect(page.getByRole("button", { name: "Atender pedido de exclusão" })).toHaveCount(0);
    await expect(page.getByText(/Quem atende o pedido \(LGPD\) é Marina Ribeiro/)).toBeVisible();
    await page.getByRole("button", { name: "Pedir a exclusão à sócia dona" }).click();
    const j = page.getByRole("dialog", { name: "Pedir a exclusão à sócia dona" });
    await j.getByRole("button", { name: "Enviar o pedido" }).click();
    await expect(j.getByText("Escolha por onde o pedido chegou.")).toBeVisible();
    await j.getByLabel("Como o pedido chegou").selectOption("WHATSAPP");
    await j.getByLabel(/Observação/).fill("Pediu por mensagem, do número da ficha");
    await semViolacoes(page);
    await j.getByRole("button", { name: "Enviar o pedido" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Pedido enviado a Marina Ribeiro." })).toBeVisible();
    await expect(page.getByText(/Exclusão pedida em .* por Diego Almeida, aguardando a sócia dona\./)).toBeVisible();
    await expect(page.getByRole("button", { name: "Excluir os dados" })).toHaveCount(0);
    await expect(page.getByText("Pedido de exclusão enviado")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")!.corpo).toEqual({ pedidoEm: dia(0), canal: "WHATSAPP", observacao: "Pediu por mensagem, do número da ficha" });
  });

  test("a dona recusa o pedido com o motivo; a faixa mostra a recusa", async ({ page }) => {
    const recusado = { ...PEDIDO, estado: "RECUSADO", resolvidoPor: MARINA, resolvidoEm: h(0.1), motivoRecusa: "Não deu para confirmar que veio da cliente." };
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESC_MARINA },
      [`GET ${ficha}`]: [{ corpo: { ...FICHA, pedidoExclusao: PEDIDO } }, { corpo: { ...FICHA, ultimaRecusa: recusado } }],
      "GET /v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
      [`POST ${ficha}/exclusao/recusar`]: { corpo: recusado },
    });
    await page.goto(`${P}/clientes/${CLI}`);
    await expect(page.getByText(/Quem decide é você/)).toBeVisible();
    await expect(page.getByText("Há um pedido esperando você, no alto da ficha.")).toBeVisible();
    await page.getByRole("button", { name: "Recusar o pedido" }).click();
    const j = page.getByRole("alertdialog", { name: "Recusar o pedido de exclusão?" });
    await j.getByRole("button", { name: "Recusar o pedido" }).click();
    await expect(j.getByText(/Escreva o motivo/)).toBeVisible();
    await j.getByLabel("Motivo").fill("Não deu para confirmar que veio da cliente.");
    await j.getByRole("button", { name: "Recusar o pedido" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Pedido de exclusão recusado." })).toBeVisible();
    await expect(page.getByText(/Pedido de exclusão recusado em .* por Marina Ribeiro\./)).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")!.corpo).toEqual({ motivo: "Não deu para confirmar que veio da cliente." });
  });

  test("a janela da dona vem com a data e o canal do pedido", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESC_MARINA }, [`GET ${ficha}`]: { corpo: { ...FICHA, pedidoExclusao: PEDIDO } },
      "GET /v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
    });
    await page.goto(`${P}/clientes/${CLI}`);
    await page.getByRole("button", { name: "Excluir os dados", exact: true }).click();
    const j = page.getByRole("alertdialog");
    await expect(j.getByText(/Pedido registrado por Diego Almeida/)).toBeVisible();
    await expect(j.getByLabel("Data do pedido")).toHaveValue(br(dia(0)));
    await expect(j.getByLabel("Como o pedido chegou")).toHaveValue("WHATSAPP");
  });

  test("decisões 3 e 4: o excluído mostra os resumos sem com quem se falou, e fica em Inativos", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESC_MARINA }, [`GET ${ficha}`]: { corpo: EXCLUIDA },
      "GET /v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
      [`GET ${ficha}/atendimentos`]: { corpo: { atendimentos: [{ id: "f1", ocorridoEm: h(24 * 12), canal: "WHATSAPP", comQuem: null, atendidoPor: DIEGO,
        resumo: "Mandou a certidão; falta a carta do INSS.", registradoEm: h(24 * 12), proxContato: null }] } },
      "GET /v1/escritorio/clientes?situacao=ATIVO": { corpo: { comercial: true, clientes: [] } },
      "GET /v1/escritorio/clientes?situacao=INATIVO": { corpo: { comercial: true, clientes: [{ id: CLI, tipo: "PF", nome: "Cliente excluído", situacao: "EXCLUIDO", versao: 4,
        contatoPrincipal: null, origem: "INDICACAO_CLIENTE", proxContato: null, exclusao: { em: h(0.1), protocolo: "EXC-2026-0007" } }] } },
    });
    await page.goto(`${P}/clientes/${CLI}?aba=atendimentos`);
    await expect(page.getByText("“Mandou a certidão; falta a carta do INSS.”")).toBeVisible();
    await expect(page.getByText("Com quem se falou e o próximo contato excluídos a pedido do titular (LGPD).")).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrar atendimento" })).toHaveCount(0);
    await semViolacoes(page);
    await page.goto(`${P}/clientes?filtro=inativos`);
    await expect(page.getByText(/1 deles excluído a pedido \(LGPD\)/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Cliente excluído" }).first()).toBeVisible();
    await semViolacoes(page);
  });

  test("decisão 2: o Início da dona avisa o pedido esperando e leva à ficha", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESC_MARINA },
      "GET /v1/escritorio/inicio/contatos?de=MEUS": { corpo: { de: "MEUS", dono: true, vencidos: [], hoje: [], totalVencidos: 0, totalHoje: 0, maisAntigo: null,
        proximo: null, equipeVencidos: 0, pedidosExclusao: [{ id: "p1", clienteId: CLI, nome: "Antônia Ferreira Prado", pedidoEm: dia(0), por: "Diego Almeida" }] } },
    });
    await page.goto(P);
    const aviso = page.getByRole("link", { name: /1 pedido de exclusão esperando você/ });
    await expect(aviso).toHaveAttribute("href", `/clientes/${CLI}`);
    await expect(aviso).toContainText("Antônia Ferreira Prado · pedido em");
    await semViolacoes(page);
  });

  // F1.16 (decisão 5): com contrato ou processo, não exclui, arquiva a pedido.
  test("F1.16: com contrato, a dona arquiva a pedido; nada é apagado e a ficha fica só leitura", async ({ page }) => {
    const VINC = { contratos: [{ id: "ct1", numero: "C-2026-031" }], processos: [{ id: "cs1", nome: "Aposentadoria", numeroCnj: "0812345-67.2026.8.26.0100" }] };
    const arquivamento = { id: "p1", estado: "ARQUIVADO", pedidoEm: dia(0), canal: "WHATSAPP", quemPediu: "TITULAR", registradoPor: DIEGO, registradoEm: h(1),
      resolvidoPor: MARINA, resolvidoEm: h(0.1), protocolo: "EXC-2026-0008", em: h(0.1) };
    const ARQUIVADA = { ...FICHA, situacao: "ARQUIVADO", podeInativar: false, proxContato: null, versao: 4, pedidoExclusao: null, vinculosLgpd: null, arquivamento };
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESC_MARINA },
      [`GET ${ficha}`]: [{ corpo: { ...FICHA, pedidoExclusao: PEDIDO, vinculosLgpd: VINC } }, { corpo: ARQUIVADA }],
      "GET /v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
      [`POST ${ficha}/arquivar-lgpd`]: { corpo: { protocolo: "EXC-2026-0008", versao: 4, pedido: arquivamento } },
    });
    await page.goto(`${P}/clientes/${CLI}`);
    await expect(page.getByText(/Há contrato ou processo, então o pedido se atende arquivando/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Excluir os dados" })).toHaveCount(0);
    await page.getByRole("button", { name: "Arquivar a pedido (LGPD)" }).click();
    const j = page.getByRole("alertdialog", { name: "Arquivar Antônia Ferreira Prado a pedido (LGPD)?" });
    await expect(j).toBeVisible();
    await expect(j.getByText("Contrato de honorários C-2026-031")).toBeVisible();
    await expect(j.getByText("Processo 0812345-67.2026.8.26.0100")).toBeVisible();
    await expect(j.getByText("Nada é apagado")).toBeVisible();
    await expect(j.getByLabel("Para confirmar, escreva o nome do cliente")).toHaveCount(0);
    await semViolacoes(page);
    await j.getByRole("button", { name: "Arquivar a pedido (LGPD)" }).click();
    await expect(j.getByText("Confirme quem pediu antes de arquivar.")).toBeVisible();
    expect(pedidos.some((p) => p.metodo === "POST")).toBe(false);
    await j.getByRole("checkbox", { name: /Conferi que o pedido veio do cliente/ }).check();
    await j.getByRole("button", { name: "Arquivar a pedido (LGPD)" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Cliente arquivado a pedido (LGPD)." })).toContainText("EXC-2026-0008");
    await expect(page.getByRole("heading", { level: 1, name: "Antônia Ferreira Prado" })).toBeVisible();
    await expect(page.getByText("Arquivado (LGPD)")).toBeVisible();
    await expect(page.getByRole("region", { name: "Registro do arquivamento" }).getByText("EXC-2026-0008")).toBeVisible();
    await expect(page.getByRole("button", { name: /Editar|Inativar cliente|Registrar atendimento|Atender pedido de exclusão/ })).toHaveCount(0);
    const post = pedidos.find((p) => p.metodo === "POST")!;
    expect(post.corpo).toMatchObject({ versao: 3, pedidoEm: dia(0), canal: "WHATSAPP", quemPediu: "TITULAR", conferido: true });
    await semViolacoes(page);
  });

  test("F1.16: o arquivado fica em Inativos, com a data e o protocolo", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESC_MARINA },
      "GET /v1/escritorio/clientes?situacao=ATIVO": { corpo: { comercial: true, clientes: [] } },
      "GET /v1/escritorio/clientes?situacao=INATIVO": { corpo: { comercial: true, clientes: [
        { id: CLI, tipo: "PF", nome: "Antônia Ferreira Prado", situacao: "ARQUIVADO", contatoPrincipal: null, versao: 4, origem: "GOOGLE", proxContato: null,
          arquivamento: { em: h(0.1), protocolo: "EXC-2026-0008" } },
      ] } },
    });
    await page.goto(`${P}/clientes?filtro=inativos`);
    await expect(page.getByText(/1 deles arquivado a pedido \(LGPD\)/)).toBeVisible();
    await expect(page.getByText(/Arquivado a pedido \(LGPD\) em/).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/protocolo EXC-2026-0008/).first()).toBeAttached();
    await semViolacoes(page);
  });
});

// F3.155 (PT-11): "O que é apagado" cita os arquivos do cliente, logo depois da qualificação, só
// quando há arquivo; "O que fica" não muda (alternativa A).
const VARIOS = "os arquivos são apagados do T3jus. Fica só que existiram: tipo, tamanho e datas, sem o nome dos arquivos.";
const UM = "o arquivo é apagado do T3jus. Fica só que existiu: tipo, tamanho e datas, sem o nome do arquivo.";
const DOCS = { hoje: dia(0), validadeDias: 90, podeAnexar: true, podeMudarPrazo: true, sociosDonos: ["Marina Ribeiro"], documentos: [], pedidos: [] };
const NOVO = "f9000000-0000-4000-8000-000000000155";
// Uma foto PNG mínima de verdade (1 × 1), para o canvas conseguir ler e juntar num PDF.
const FOTO = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function abrirExcluir(page: Page) {
  await page.getByRole("button", { name: "Atender pedido de exclusão" }).click();
  const j = page.getByRole("alertdialog", { name: "Excluir os dados de Antônia Ferreira Prado?" });
  await expect(j).toBeVisible();
  return j;
}

test.describe("Os arquivos do cliente na janela de exclusão (F3.155, PT-11)", () => {
  test("documentos, termo de curatela e proposta: a linha vem logo depois da qualificação, no plural", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESC_MARINA },
      [`GET ${ficha}`]: { corpo: { ...FICHA, arquivosParaApagar: { documentos: 3, curatela: true, tutela: false, propostas: 1 } } },
      "GET /v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
    });
    await page.goto(`${P}/clientes/${CLI}`);
    const j = await abrirExcluir(page);
    const some = j.locator(".pd-some li");
    await expect(some).toHaveCount(6);
    await expect(some.nth(0)).toContainText("Nome, CPF, RG e a qualificação");
    await expect(some.nth(1)).toHaveText(`Os 3 documentos pessoais, o termo de curatela e o arquivo Word da proposta${VARIOS}`);
    await expect(some.nth(1).locator("small")).toHaveText(VARIOS);
    await expect(some.nth(2)).toContainText("Os 2 contatos");
    // "O que fica" não muda.
    const fica = j.locator(".pd-fica li");
    await expect(fica).toHaveCount(3);
    await expect(fica.nth(0)).toContainText("O registro da exclusão");
    await expect(fica.filter({ hasText: "existiram" })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("um documento só: a linha no singular", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESC_MARINA },
      [`GET ${ficha}`]: { corpo: { ...FICHA, arquivosParaApagar: { documentos: 1, curatela: false, tutela: false, propostas: 0 } } },
      "GET /v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
    });
    await page.goto(`${P}/clientes/${CLI}`);
    const j = await abrirExcluir(page);
    await expect(j.locator(".pd-some li")).toHaveCount(6);
    await expect(j.locator(".pd-some li").nth(1)).toHaveText(`O documento pessoal${UM}`);
    await semViolacoes(page);
  });

  test("a dona anexa um documento: a ficha recarrega, o aviso fica e a janela conta o documento novo", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESC_MARINA },
      [`GET ${ficha}`]: [
        { corpo: { ...FICHA, arquivosParaApagar: { documentos: 0, curatela: false, tutela: false, propostas: 0 } } },
        { corpo: { ...FICHA, arquivosParaApagar: { documentos: 1, curatela: false, tutela: false, propostas: 0 } } },
      ],
      "GET /v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
      [`GET ${ficha}/documentos`]: { corpo: DOCS },
      [`POST ${ficha}/documentos`]: { status: 201, corpo: { id: NOVO, enderecoDeEnvio: `${P}/envio-falso/${NOVO}` } },
      [`POST /v1/escritorio/clientes/documentos/${NOVO}/concluir`]: { corpo: {
        id: NOVO, tipo: "RG_CPF", descricao: null, dataDocumento: null, nome: "rg.pdf", arquivoTipo: "application/pdf", tamanho: 380000, fotos: 1,
        enviadoPor: MARINA, enviadoEm: h(0), dias: null, vencido: false, anteriores: 0 } },
    });
    await page.route("**/envio-falso/**", (rota) => rota.fulfill({ status: 200, body: "{}" }));
    await page.goto(`${P}/clientes/${CLI}`);
    const fichas = () => pedidos.filter((p) => p.metodo === "GET" && p.caminho === ficha).length;
    await expect.poll(fichas).toBe(1);
    await page.getByRole("region", { name: "Documentos pessoais" }).getByRole("button", { name: "Anexar documento" }).click();
    const a = page.getByRole("dialog", { name: "Anexar documento" });
    await a.getByLabel("Qual documento").selectOption("RG_CPF");
    const [seletor] = await Promise.all([page.waitForEvent("filechooser"), a.getByRole("button", { name: "Escolher arquivo" }).click()]);
    await seletor.setFiles([{ name: "IMG_0001.png", mimeType: "image/png", buffer: FOTO }]);
    await a.getByRole("button", { name: "Guardar na ficha" }).click();
    const aviso = page.getByRole("status").filter({ hasText: "guardado na ficha" });
    await expect(aviso).toBeVisible();
    await expect.poll(fichas).toBe(2);
    await expect(aviso).toBeVisible();
    // No celular, o aviso cobre o botão da exclusão: fecha antes de abrir a janela.
    await aviso.getByRole("button", { name: "Fechar aviso" }).click();
    const j = await abrirExcluir(page);
    await expect(j.locator(".pd-some li").nth(1)).toHaveText(`O documento pessoal${UM}`);
    await semViolacoes(page);
  });

  test("quem não é a dona anexa: a ficha não recarrega", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESC_DIEGO },
      [`GET ${ficha}`]: { corpo: { ...FICHA, dono: false } },
      "GET /v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
      [`GET ${ficha}/documentos`]: { corpo: { ...DOCS, podeMudarPrazo: false } },
      [`POST ${ficha}/documentos`]: { status: 201, corpo: { id: NOVO, enderecoDeEnvio: `${P}/envio-falso/${NOVO}` } },
      [`POST /v1/escritorio/clientes/documentos/${NOVO}/concluir`]: { corpo: {
        id: NOVO, tipo: "RG_CPF", descricao: null, dataDocumento: null, nome: "rg.pdf", arquivoTipo: "application/pdf", tamanho: 380000, fotos: 1,
        enviadoPor: DIEGO, enviadoEm: h(0), dias: null, vencido: false, anteriores: 0 } },
    });
    await page.route("**/envio-falso/**", (rota) => rota.fulfill({ status: 200, body: "{}" }));
    await page.goto(`${P}/clientes/${CLI}`);
    await page.getByRole("region", { name: "Documentos pessoais" }).getByRole("button", { name: "Anexar documento" }).click();
    const a = page.getByRole("dialog", { name: "Anexar documento" });
    await a.getByLabel("Qual documento").selectOption("RG_CPF");
    const [seletor] = await Promise.all([page.waitForEvent("filechooser"), a.getByRole("button", { name: "Escolher arquivo" }).click()]);
    await seletor.setFiles([{ name: "IMG_0001.png", mimeType: "image/png", buffer: FOTO }]);
    await a.getByRole("button", { name: "Guardar na ficha" }).click();
    await expect(page.getByRole("status").filter({ hasText: "guardado na ficha" })).toBeVisible();
    expect(pedidos.some((p) => p.metodo === "POST" && p.caminho.endsWith("/concluir"))).toBe(true);
    expect(pedidos.filter((p) => p.metodo === "GET" && p.caminho === ficha)).toHaveLength(1);
    await semViolacoes(page);
  });
});

// F3.156 (PT-11): a descrição da despesa adiantada em "O que é apagado" e o quadro à parte "O que a
// lei obriga a guardar" (alternativa A); "O que fica, sem dado pessoal" não muda; só a frase em
// negrito da faixa do escudo muda. Os estados do desenho aprovado.
const ARQ = { documentos: 3, curatela: true, tutela: false, propostas: 1 };
const DESC_UM = "vira “Despesa adiantada a cliente excluído”. O valor, as datas e o reembolso continuam no Financeiro.";
const LEI = "O que a lei obriga a guardar";
const PE = "Ficam pela obrigação fiscal do escritório, que vale mesmo com o pedido do titular (LGPD, art. 16, I).";

async function abrirComDespesa(page: Page, arquivosQueFicam: Record<string, unknown> | undefined) {
  await simular(page, {
    "/v1/escritorio": { corpo: ESC_MARINA },
    [`GET ${ficha}`]: { corpo: { ...FICHA, arquivosParaApagar: ARQ, ...(arquivosQueFicam ? { arquivosQueFicam } : {}) } },
    "GET /v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
  });
  await page.goto(`${P}/clientes/${CLI}`);
  return await abrirExcluir(page);
}

test.describe("A despesa adiantada na janela de exclusão (F3.156, PT-11)", () => {
  test("sem despesa: a janela é a aprovada da F3.155 (o estado despesa-nenhuma)", async ({ page }) => {
    const j = await abrirComDespesa(page, { despesas: 0, comArquivo: 0, arquivos: 0, pastas: 0, ate: null });
    await expect(j.locator(".pd-some li")).toHaveCount(6);
    await expect(j.locator(".pd-some li").filter({ hasText: "despesa" })).toHaveCount(0);
    await expect(j.getByRole("heading", { name: LEI })).toHaveCount(0);
    await expect(j.getByRole("heading", { name: "O que fica, sem dado pessoal" })).toBeVisible();
    await expect(j.locator(".pt-comuns b")).toHaveText("Nada aqui precisa ser guardado por lei.");
    await semViolacoes(page);
  });

  test("uma despesa paga com a nota: a descrição, o quadro com a data e a faixa (o estado despesa-paga-nota)", async ({ page }) => {
    const j = await abrirComDespesa(page, { despesas: 1, comArquivo: 1, arquivos: 1, pastas: 0, ate: "2033-01-01" });
    const some = j.locator(".pd-some li");
    await expect(some).toHaveCount(7);
    await expect(some.nth(1)).toContainText("Os 3 documentos pessoais");
    await expect(some.nth(2)).toHaveText(`A descrição da despesa adiantada${DESC_UM}`);
    // "O que fica, sem dado pessoal" não muda.
    await expect(j.getByRole("heading", { name: "O que fica, sem dado pessoal" })).toBeVisible();
    await expect(j.locator(".pd-fica li")).toHaveCount(3);
    const lei = j.locator(".pd-guarda");
    await expect(lei.getByRole("heading", { name: LEI })).toBeVisible();
    await expect(lei.locator("li")).toHaveCount(1);
    await expect(lei.locator("li").nth(0)).toHaveText("O arquivo da despesa adiantada"
      + "a nota, guia, boleto ou comprovante, com o nome trocado pelo tipo, como “Nota fiscal.pdf”. O T3jus apaga sozinho em 01/01/2033.");
    await expect(lei.locator(".pd-arq-nota")).toHaveText(PE);
    // O quadro vem logo depois de "O que fica" e antes da faixa do escudo.
    await expect(j.locator(".pd-fica + .pd-guarda + .pt-comuns")).toHaveCount(1);
    await expect(j.locator(".pt-comuns b")).toHaveText("Fora esse arquivo, nada aqui precisa ser guardado por lei.");
    await expect(j.locator(".pt-comuns")).toContainText("Este cliente não tem contrato nem processo no T3jus");
    await semViolacoes(page);
  });

  test("duas despesas, uma em aberto: sem data, com a regra (o estado despesa-em-aberto)", async ({ page }) => {
    const j = await abrirComDespesa(page, { despesas: 2, comArquivo: 2, arquivos: 2, pastas: 0, ate: null });
    await expect(j.locator(".pd-some li").nth(2)).toContainText("A descrição das 2 despesas adiantadas");
    const linha = j.locator(".pd-guarda li").nth(0);
    await expect(linha).toContainText("Os 2 arquivos das 2 despesas adiantadas");
    await expect(linha.locator("small")).toHaveText("notas, guias, boletos ou comprovantes, com o nome trocado pelo tipo, como “Nota fiscal.pdf”. "
      + "Enquanto houver despesa em aberto, não há data: o T3jus apaga sozinho em 1º de janeiro do 7º ano depois do pagamento.");
    await expect(j.locator(".pt-comuns b")).toHaveText("Fora esses arquivos, nada aqui precisa ser guardado por lei.");
    await semViolacoes(page);
  });

  test("a despesa que já foi na pasta do contador (o estado despesa-pasta-contador)", async ({ page }) => {
    const j = await abrirComDespesa(page, { despesas: 1, comArquivo: 1, arquivos: 2, pastas: 1, ate: "2033-01-01" });
    const lei = j.locator(".pd-guarda li");
    await expect(lei).toHaveCount(2);
    await expect(lei.nth(0)).toContainText("Os 2 arquivos da despesa adiantada");
    await expect(lei.nth(0)).toContainText("O T3jus apaga sozinho em 01/01/2033.");
    await expect(lei.nth(1)).toHaveText("A pasta mandada ao contador"
      + "fica como foi montada, com a descrição antiga no nome dos arquivos. A cópia do T3jus sai pela regra do mês da pasta; a que o contador recebeu fica fora do T3jus.");
    await expect(j.getByText(/avis/i).filter({ hasText: "contador" })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("despesa sem arquivo: só a linha da descrição; sem quadro e com a faixa aprovada (o estado despesa-sem-arquivo)", async ({ page }) => {
    const j = await abrirComDespesa(page, { despesas: 1, comArquivo: 0, arquivos: 0, pastas: 0, ate: null });
    await expect(j.locator(".pd-some li")).toHaveCount(7);
    await expect(j.locator(".pd-some li").nth(2)).toHaveText(`A descrição da despesa adiantada${DESC_UM}`);
    await expect(j.locator(".pd-guarda")).toHaveCount(0);
    await expect(j.locator(".pt-comuns b")).toHaveText("Nada aqui precisa ser guardado por lei.");
    await semViolacoes(page);
  });
});

// F3.177 (F3.184; PT-11): a descrição dos lançamentos do sistema antigo fica guardada até o marco
// fiscal; a linha entra no fim do quadro "O que a lei obriga a guardar" (sem arquivo, o quadro vem só
// com ela) e a frase em negrito da faixa a cita. Os estados do desenho aprovado.
const SEM_DESPESA = { despesas: 0, comArquivo: 0, arquivos: 0, pastas: 0, ate: null };
const FIM_H = "A data, o valor e se foi pago não mudam.";
const hist = (lancamentos: number, detalhes: number, semData: number, ate: string) => ({ lancamentos, detalhes, semData, origem: "ASTREA", ate });

test.describe("O histórico do sistema antigo na janela de exclusão (F3.177, PT-11)", () => {
  test("sem lançamento do sistema antigo: a janela da F3.156 (o estado historico-nenhum)", async ({ page }) => {
    const j = await abrirComDespesa(page, SEM_DESPESA);
    await expect(j.locator(".pd-guarda")).toHaveCount(0);
    await expect(j.locator(".pt-comuns b")).toHaveText("Nada aqui precisa ser guardado por lei.");
    await semViolacoes(page);
  });

  test("só o histórico: o quadro vem só com a linha dele (o estado historico-so)", async ({ page }) => {
    const j = await abrirComDespesa(page, { ...SEM_DESPESA, historico: hist(12, 1, 0, "2033-01-01") });
    await expect(j.locator(".pd-some li")).toHaveCount(6);
    const lei = j.locator(".pd-guarda");
    await expect(lei.getByRole("heading", { name: LEI })).toBeVisible();
    await expect(lei.locator("li")).toHaveCount(1);
    await expect(lei.locator("li").nth(0)).toHaveText("A descrição dos 12 lançamentos do Astrea"
      + `fica como veio na importação, com o detalhe escrito ao dispensar o lembrete de contrato. O T3jus troca sozinho por um texto fixo em 01/01/2033. ${FIM_H}`);
    await expect(lei.locator(".pd-arq-nota")).toHaveText(PE);
    await expect(j.locator(".pd-fica + .pd-guarda + .pt-comuns")).toHaveCount(1);
    await expect(j.locator(".pt-comuns b")).toHaveText("Fora essas descrições, nada aqui precisa ser guardado por lei.");
    await semViolacoes(page);
  });

  test("o histórico e a despesa com a nota: a linha no fim do quadro (o estado historico-e-despesas)", async ({ page }) => {
    const j = await abrirComDespesa(page, { despesas: 1, comArquivo: 1, arquivos: 1, pastas: 0, ate: "2033-01-01", historico: hist(1, 0, 0, "2031-01-01") });
    const lei = j.locator(".pd-guarda li");
    await expect(lei).toHaveCount(2);
    await expect(lei.nth(0)).toContainText("O arquivo da despesa adiantada");
    await expect(lei.nth(1)).toHaveText(`A descrição do lançamento do Astreafica como veio na importação. O T3jus troca sozinho por um texto fixo em 01/01/2031. ${FIM_H}`);
    await expect(j.locator(".pt-comuns b")).toHaveText("Fora esse arquivo e essa descrição, nada aqui precisa ser guardado por lei.");
    await semViolacoes(page);
  });

  test("despesas em aberto e lançamentos com detalhe (o estado historico-em-aberto)", async ({ page }) => {
    const j = await abrirComDespesa(page, { despesas: 2, comArquivo: 2, arquivos: 2, pastas: 0, ate: null, historico: hist(4, 1, 0, "2032-01-01") });
    const lei = j.locator(".pd-guarda li");
    await expect(lei).toHaveCount(2);
    await expect(lei.nth(0)).toContainText("Enquanto houver despesa em aberto, não há data");
    await expect(lei.nth(1)).toContainText("A descrição dos 4 lançamentos do Astrea");
    await expect(lei.nth(1).locator("small")).toHaveText(
      `fica como veio na importação, com o detalhe escrito ao dispensar o lembrete de contrato. O T3jus troca sozinho por um texto fixo em 01/01/2032. ${FIM_H}`);
    await expect(j.locator(".pt-comuns b")).toHaveText("Fora esses arquivos e essas descrições, nada aqui precisa ser guardado por lei.");
    await semViolacoes(page);
  });

  test("um lançamento sem data conta pela importação (o estado historico-sem-data)", async ({ page }) => {
    const j = await abrirComDespesa(page, { ...SEM_DESPESA, historico: hist(3, 0, 1, "2033-01-01") });
    const linha = j.locator(".pd-guarda li");
    await expect(linha).toHaveCount(1);
    await expect(linha.nth(0).locator("small")).toHaveText("fica como veio na importação. Um deles veio sem data e conta pela data da importação. "
      + `O T3jus troca sozinho por um texto fixo em 01/01/2033. ${FIM_H}`);
    await expect(j.locator(".pt-comuns b")).toHaveText("Fora essas descrições, nada aqui precisa ser guardado por lei.");
    await semViolacoes(page);
  });
});

const CHAVES_181 = {
  arquivosParaApagar: { documentos: 0, curatela: false, tutela: false, propostas: 0 },
  saiDeContratos: { pedidos: ["P-2026-014"], lembretes: { n: 1, valor: 184000, lancamentos: 3, origem: "ASTREA" } },
  conversasParaApagar: { conversas: 1, naFila: 1, automacoes: 0, ficam: 1, ficamCom: [{ id: "r", nome: "Rosa Alves Coelho" }], ficamComMais: 0 },
  assinaPorOutro: [{ id: "j", nome: "João Coelho", tipo: "PF", papel: "como mãe e responsável legal", feminino: true }],
  basesDeCondicao: ["P-2026-014"],
  baixasComExplicacao: 0,
};

test.describe("O que sobra da exclusão (F3.181, F3.186, F3.190, PT-11)", () => {
  test("conversas, quem ela assina, o sobre, o pedido de contrato e o valor em aberto (o estado exc-tudo)", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESC_MARINA },
      [`GET ${ficha}`]: { corpo: { ...FICHA, ...CHAVES_181 } },
      "GET /v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
    });
    await page.goto(`${P}/clientes/${CLI}`);
    const j = await abrirExcluir(page);
    await expect(j.getByRole("status").filter({ hasText: "Há R$ 1.840,00 em aberto no Astrea." }))
      .toContainText("É o lembrete de contrato de Antônia, com 3 lançamentos.");
    const some = j.locator(".pd-some > ul > li");
    await expect(some.nth(0).locator(".pd-dica")).toHaveText(
      "Antônia também assina por João Coelho, como mãe e responsável legal. O nome e o CPF dela continuam na ficha dele, porque servem ao contrato e à procuração dele.");
    await expect(some.nth(1)).toContainText("Sobre o que se cobra o êxito, na proposta P-2026-014");
    await expect(some.nth(2)).toContainText("Os 2 contatos");
    await expect(some.nth(3)).toContainText("A conversa do WhatsApp");
    await expect(some.nth(3).locator("small")).toContainText("A mensagem que ainda ia sair não sai mais.");
    await expect(some.nth(3).locator(".pd-dica b")).toHaveText("Rosa Alves Coelho");
    await expect(j.locator(".pd-fica li").filter({ hasText: "A proposta P-2026-014, sem o pedido de contrato" })).toHaveCount(1);
    await semViolacoes(page);
  });

  test("sem conversa que sai, a dica da que fica vai na linha dos contatos", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: ESC_MARINA },
      [`GET ${ficha}`]: { corpo: { ...FICHA, ...CHAVES_181, saiDeContratos: { pedidos: [], lembretes: null },
        conversasParaApagar: { ...CHAVES_181.conversasParaApagar, conversas: 0, naFila: 0 } } },
      "GET /v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
    });
    await page.goto(`${P}/clientes/${CLI}`);
    const j = await abrirExcluir(page);
    await expect(j.locator(".pd-some li").filter({ hasText: "conversa do WhatsApp" })).toHaveCount(0);
    await expect(j.locator(".pd-some > ul > li").filter({ hasText: "Os 2 contatos" }).locator(".pd-dica")).toContainText("1 conversa fica como está");
    await expect(j.getByText(/em aberto no Astrea/)).toHaveCount(0);
    await expect(j.locator(".pd-fica li").filter({ hasText: "sem o pedido de contrato" })).toHaveCount(0);
  });

  test("C2: na janela de arquivar, o pedido de contrato sai de Contratos", async ({ page }) => {
    const VINC = { contratos: [{ id: "ct1", numero: "C-2026-031" }], processos: [] };
    await simular(page, {
      "/v1/escritorio": { corpo: ESC_MARINA },
      [`GET ${ficha}`]: { corpo: { ...FICHA, pedidoExclusao: PEDIDO, vinculosLgpd: VINC, saiDeContratos: { pedidos: ["P-2026-014"], lembretes: null } } },
      "GET /v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
    });
    await page.goto(`${P}/clientes/${CLI}`);
    await page.getByRole("button", { name: "Arquivar a pedido (LGPD)" }).click();
    const j = page.getByRole("alertdialog", { name: "Arquivar Antônia Ferreira Prado a pedido (LGPD)?" });
    const li = j.locator(".pd-fica li");
    await expect(li.filter({ hasText: "O pedido de contrato da proposta P-2026-014 sai de Contratos" })).toHaveCount(1);
    await expect(li.last()).toContainText("O pedido fica registrado");
    await semViolacoes(page);
  });
});
