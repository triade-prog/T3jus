// Cobrança dos escritórios no Console (CO-06, F1.19), telas aprovadas em
// docs/design/aprovadas/console-cobranca: faturas, planos, régua, fatura aberta, aba Assinatura
// e o atraso na carteira. A API é simulada; aqui se testa a tela, a acessibilidade e o que ela
// manda ao servidor.
import { expect, test } from "@playwright/test";
import { C, CA, CLIENTES, ficha, PERMISSOES, SESSAO, semViolacoes, simular } from "./console-dados.ts";

const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const dia = (n: number) => new Date(Date.parse(`${hoje}T12:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);
const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const comp = (n: number) => `${dia(n).slice(0, 7)}-01`;

const ADM = { ...SESSAO, faturasAtraso: 2, acoes: ["console.cobranca.ver", "console.cobranca.editar", "console.portal.so_consulta"] };
const IMPL = { ...SESSAO, nome: "Inês Nogueira", funcoes: ["IMPLANTACAO"], acoes: [] };

const AROEIRA = CLIENTES[3]!;
const BACURI = { ...AROEIRA, id: "e0000000-0000-4000-8000-000000000005", nome: "Bacuri Advocacia Trabalhista", cidade: "Belém", uf: "PA" };
const F1 = "d0000000-0000-4000-8000-000000000001";
const F2 = "d0000000-0000-4000-8000-000000000002";
const F3 = "d0000000-0000-4000-8000-000000000003";
const PLANO_ESC = "b0000000-0000-4000-8000-000000000001";
const PLANO_BANCA = "b0000000-0000-4000-8000-000000000002";

const fatura = (o: Record<string, unknown>) => ({
  numero: 187, plano: "Escritório", forma: "PIX", totalCentavos: 49000, atrasoDias: null, pagaEm: null, formaPaga: null, baixa: null,
  canceladaEm: null, emitidaEm: dia(-25), pessoasAtivas: 6, versao: 1, parcela: null, ...o,
});
const FATURAS = [
  fatura({ id: F1, competencia: comp(-41), vencimento: dia(-41), situacao: "EM_ATRASO", atrasoDias: 41, totalCentavos: 19000, plano: "Fundador", forma: "BOLETO", escritorio: { id: BACURI.id, nome: BACURI.nome } }),
  fatura({ id: F2, competencia: comp(10), vencimento: dia(10), situacao: "A_VENCER", escritorio: { id: AROEIRA.id, nome: AROEIRA.nome } }),
  fatura({ id: F3, competencia: comp(-20), vencimento: dia(-20), situacao: "PAGA", pagaEm: dia(-21), formaPaga: "PIX", baixa: "AUTOMATICA", escritorio: { id: AROEIRA.id, nome: AROEIRA.nome } }),
];
const LISTA = {
  hoje, podeEditar: true,
  resumo: {
    aReceberMesCentavos: 49000, recebidoMesCentavos: 0, venceMesCentavos: 49000,
    atraso: { totalCentavos: 19000, faturas: 1, escritorios: 1, faixas: [{ ate: 7, totalCentavos: 0, faturas: 0 }, { ate: 30, totalCentavos: 0, faturas: 0 }, { ate: null, totalCentavos: 19000, faturas: 1 }] },
  },
  faturas: FATURAS,
};
const PLANOS = {
  podeEditar: true,
  pessoaAMais: { centavos: 3900, versao: 1 },
  planos: [
    { id: PLANO_ESC, nome: "Escritório", precoCentavos: 49000, pessoasIncluidas: 8, arquivadoEm: null, arquivadoMotivo: null, versao: 1, criadoEm: dia(-90), assinantes: 1, noPrecoAntigo: 0, escritorios: [{ id: AROEIRA.id, nome: AROEIRA.nome, precoCentavos: 49000 }] },
    { id: PLANO_BANCA, nome: "Banca", precoCentavos: 89000, pessoasIncluidas: 15, arquivadoEm: null, arquivadoMotivo: null, versao: 1, criadoEm: dia(-90), assinantes: 0, noPrecoAntigo: 0, escritorios: [] },
  ],
  historico: [],
};
const ABERTA = {
  ...FATURAS[0], hoje,
  escritorio: { id: BACURI.id, nome: BACURI.nome, cnpj: "31864027000156", contrato: "ABERTO", atrasoDias: 41, soConsultaDesde: null },
  assinatura: { id: "a1000000-0000-4000-8000-000000000001", versao: 4, cnpjNota: null },
  itens: [{ tipo: "MENSALIDADE", descricao: "Plano Fundador, até 5 pessoas", quantidade: 1, valorCentavos: 19000 }],
  pagamento: { pixCopiaCola: null, linhaBoleto: null, disponivel: false },
  paraQuem: { email: "luiza@bacuri.exemplo.com.br", socio: "Luíza Farias" },
  pagamentoManual: null, cancelamento: null,
  historico: [{ id: 1, acao: "fatura.emitida", dados: { totalCentavos: 19000, vencimento: dia(-41), pessoas: 4 }, em: `${dia(-61)}T09:00:00Z`, autor: null }],
  envios: [], proximos: [], proporConsulta: true, permissoes: { editar: true, soConsulta: true },
};

const PREVIA = { competencia: comp(40), vencimento: dia(40), pessoas: 6, totalCentavos: 89000, itens: [{ tipo: "MENSALIDADE", descricao: "Plano Banca", quantidade: 1, valorCentavos: 89000 }] };
const assinatura = (o: Record<string, unknown> = {}) => ({
  hoje, valores: true, estagio: "ATIVO", contrato: "ABERTO", permissoes: { editar: true, soConsulta: true }, pessoasAtivas: 6,
  emailSugerido: null, cnpjSugerido: null, pessoaAMaisCentavos: 3900,
  planos: [
    { id: PLANO_ESC, nome: "Escritório", precoCentavos: 49000, pessoasIncluidas: 8, previa: null },
    { id: PLANO_BANCA, nome: "Banca", precoCentavos: 89000, pessoasIncluidas: 15, previa: PREVIA },
  ],
  assinatura: {
    id: "a1000000-0000-4000-8000-000000000002", versao: 3, plano: { id: PLANO_ESC, nome: "Escritório", arquivado: false }, pessoasIncluidas: 8,
    diaVencimento: 10, forma: "PIX", inicioCobranca: dia(-60), primeiraCompetencia: comp(-50), situacao: "EM_DIA", atrasoDias: null,
    soConsultaDesde: null, avisoPortal: false, proporConsulta: false, precoCentavos: 49000, precoDoPlanoHojeCentavos: 49000,
    emailCobranca: "financeiro@aroeira.exemplo.com.br", cnpjNota: "22914870000166", parcelasPorCarne: null, desconto: null, soConsulta: null,
    proxima: { competencia: comp(40), vencimento: dia(40), pessoas: 6, totalCentavos: 49000, itens: [] },
    abertas: { faturas: 0, totalCentavos: 0 }, carne: null, faturas: [FATURAS[1], FATURAS[2]],
    mudancas: [{ id: 1, acao: "assinatura.preparada", dados: { plano: "Escritório", dia: 10, forma: "PIX" }, em: `${dia(-61)}T09:00:00Z`, autor: { id: CA.pessoaId, nome: CA.nome } }],
    ...o,
  },
});

test.describe("Console: cobrança dos escritórios", () => {
  test("faturas: números, filtro de atraso e sem violações", async ({ page }) => {
    await simular(page, { "/v1/sessao": { corpo: ADM }, "/v1/cobranca/faturas": { corpo: LISTA } });
    await page.goto(`${C}/cobranca`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: BACURI.nome }).first()).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: /^Em atraso/ }).first().click();
    await expect(page.getByRole("link", { name: AROEIRA.nome })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("o atalho da carteira abre já no filtro de atraso", async ({ page }) => {
    await simular(page, { "/v1/sessao": { corpo: ADM }, "/v1/cobranca/faturas": { corpo: LISTA } });
    await page.goto(`${C}/cobranca?situacao=EM_ATRASO`);
    await expect(page.getByRole("link", { name: BACURI.nome }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: AROEIRA.nome })).toHaveCount(0);
  });

  test("sem permissão, Implantação vê o aviso e nenhuma fatura", async ({ page }) => {
    const pedidos = await simular(page, { "/v1/sessao": { corpo: IMPL } });
    await page.goto(`${C}/cobranca`);
    await expect(page.getByText(/Administração e (do )?Financeiro/).first()).toBeVisible();
    expect(pedidos.some((p) => p.caminho === "/v1/cobranca/faturas")).toBe(false);
    await semViolacoes(page);
  });

  test("planos: cartões, pessoa a mais e sem violações", async ({ page }) => {
    await simular(page, { "/v1/sessao": { corpo: ADM }, "/v1/cobranca/planos": { corpo: PLANOS } });
    await page.goto(`${C}/cobranca/planos`);
    await expect(page.getByRole("heading", { name: "Banca" })).toBeVisible();
    await expect(page.getByText("R$ 890,00").first()).toBeVisible();
    await semViolacoes(page);
  });

  test("régua de cobrança abre sem violações", async ({ page }) => {
    await simular(page, { "/v1/sessao": { corpo: ADM } });
    await page.goto(`${C}/cobranca/regua`);
    await expect(page.getByText("nao-responda@t3jus.pro").first()).toBeVisible();
    await semViolacoes(page);
  });

  test("fatura em atraso: registrar pagamento confere os campos e manda a versão", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: ADM },
      [`/v1/clientes/${BACURI.id}/faturas/${F1}`]: [{ corpo: ABERTA }, { corpo: { ...ABERTA, situacao: "PAGA", atrasoDias: null, pagaEm: hoje, baixa: "MANUAL", formaPaga: "PIX" } }],
      [`POST /v1/clientes/${BACURI.id}/faturas/${F1}/pagamento-manual`]: { corpo: { acessoDevolvido: false } },
    });
    await page.goto(`${C}/cobranca/faturas/${BACURI.id}/${F1}`);
    await expect(page.getByRole("heading", { name: BACURI.nome, level: 1 })).toBeVisible();
    await expect(page.getByText("41 dias em atraso.")).toBeAttached();
    await expect(page.getByRole("link", { name: "Passar o Portal para só consulta" })).toHaveAttribute("href", `/clientes/${BACURI.id}/assinatura?consulta=1`);
    await semViolacoes(page);

    await page.getByRole("button", { name: "Registrar pagamento" }).click();
    const j = page.getByRole("dialog", { name: "Registrar pagamento" });
    await expect(j.getByLabel("Data do pagamento")).toHaveValue(br(hoje));
    await expect(j.getByLabel("Valor recebido")).toHaveValue("190,00");
    await j.getByRole("button", { name: "Registrar pagamento" }).click();
    await expect(j.getByText("Falta acertar 1 ponto, marcado abaixo.")).toBeVisible();
    await expect(j.getByLabel("Motivo")).toHaveAttribute("aria-invalid", "true");
    await semViolacoes(page);

    await j.getByLabel("Motivo").fill("Pix direto na conta, comprovante no e-mail de hoje.");
    await j.getByRole("button", { name: "Registrar pagamento" }).click();
    await expect(page.getByText("Pagamento registrado.")).toBeVisible();
    const post = pedidos.find((p) => p.metodo === "POST");
    expect(post?.corpo).toEqual({ versao: 1, pagoEm: hoje, valorCentavos: 19000, forma: "PIX", motivo: "Pix direto na conta, comprovante no e-mail de hoje." });
  });

  test("fatura: conflito mostra quem registrou antes e não registra de novo", async ({ page }) => {
    await simular(page, {
      "/v1/sessao": { corpo: ADM },
      [`/v1/clientes/${BACURI.id}/faturas/${F1}`]: { corpo: ABERTA },
      [`POST /v1/clientes/${BACURI.id}/faturas/${F1}/pagamento-manual`]: { status: 409, corpo: { erro: { codigo: "VERSION_CONFLICT", detalhes: { versao: 2, quem: "Marta Quintela", em: `${hoje}T17:32:00Z` } } } },
    });
    await page.goto(`${C}/cobranca/faturas/${BACURI.id}/${F1}`);
    await page.getByRole("button", { name: "Registrar pagamento" }).click();
    const j = page.getByRole("dialog", { name: "Registrar pagamento" });
    await j.getByLabel("Motivo").fill("Comprovante recebido.");
    await j.getByRole("button", { name: "Registrar pagamento" }).click();
    await expect(j.getByText(/Marta Quintela registrou um pagamento nesta fatura/)).toBeVisible();
    await expect(j.getByRole("button", { name: "Fechar e conferir" })).toBeVisible();
    await semViolacoes(page);
  });

  test("assinatura em dia: dados, mudar de plano com prévia e motivo", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: ADM },
      [`/v1/clientes/${AROEIRA.id}`]: { corpo: ficha(AROEIRA, PERMISSOES) },
      [`/v1/clientes/${AROEIRA.id}/notas`]: { corpo: { notas: [] } },
      [`/v1/clientes/${AROEIRA.id}/assinatura`]: { corpo: assinatura() },
      [`POST /v1/clientes/${AROEIRA.id}/assinatura/mudar-plano`]: { corpo: { versao: 4 } },
    });
    await page.goto(`${C}/clientes/${AROEIRA.id}/assinatura`);
    await expect(page.getByRole("heading", { name: "Assinatura", exact: true })).toBeVisible();
    await expect(page.getByText("financeiro@aroeira.exemplo.com.br")).toBeVisible();
    await expect(page.getByText("Todo dia 10").first()).toBeVisible();
    await semViolacoes(page);

    await page.getByRole("button", { name: "Mudar de plano" }).click();
    const j = page.getByRole("dialog", { name: "Mudar de plano" });
    await expect(j.getByText("Primeira fatura no Banca", { exact: false })).toBeVisible();
    await j.getByRole("button", { name: "Mudar para Banca" }).click();
    await expect(j.getByText("Falta acertar 1 ponto, marcado abaixo.")).toBeVisible();
    await semViolacoes(page);
    await j.getByLabel("Motivo").fill("O escritório contrata mais 4 advogados.");
    await j.getByRole("button", { name: "Mudar para Banca" }).click();
    await expect(page.getByText(/passa para o plano Banca/)).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")?.corpo).toEqual({ versao: 3, planoId: PLANO_BANCA, motivo: "O escritório contrata mais 4 advogados." });
  });

  test("editar a assinatura: erros presos aos campos e o corpo enviado", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: ADM },
      [`/v1/clientes/${AROEIRA.id}`]: { corpo: ficha(AROEIRA, PERMISSOES) },
      [`/v1/clientes/${AROEIRA.id}/notas`]: { corpo: { notas: [] } },
      [`/v1/clientes/${AROEIRA.id}/assinatura`]: { corpo: assinatura() },
      [`PUT /v1/clientes/${AROEIRA.id}/assinatura`]: { corpo: { id: "x", versao: 4 } },
    });
    await page.goto(`${C}/clientes/${AROEIRA.id}/assinatura`);
    await page.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("E-mail de cobrança").fill("financeiro@aroeira");
    await page.getByLabel(/Desconto na mensalidade/).fill("20");
    await page.getByRole("button", { name: "Salvar a assinatura" }).click();
    await expect(page.getByText("Falta acertar 2 pontos, marcados abaixo.")).toBeVisible();
    await expect(page.getByLabel("E-mail de cobrança")).toHaveAttribute("aria-invalid", "true");
    await semViolacoes(page);
    expect(pedidos.filter((p) => p.metodo === "PUT")).toHaveLength(0);

    await page.getByLabel("E-mail de cobrança").fill("financeiro@aroeira.exemplo.com.br");
    await page.getByLabel("Motivo do desconto").fill("Desconto de implantação.");
    await page.getByRole("radio", { name: /^Boleto/ }).check();
    await page.getByRole("button", { name: "Salvar a assinatura" }).click();
    await expect(page.getByText("Assinatura salva.")).toBeVisible();
    const put = pedidos.find((p) => p.metodo === "PUT")?.corpo as Record<string, unknown>;
    expect(put).toMatchObject({ versao: 3, diaVencimento: 10, forma: "BOLETO", emailCobranca: "financeiro@aroeira.exemplo.com.br", cnpjNota: "22914870000166", parcelasPorCarne: null });
    expect(put.desconto).toMatchObject({ pct: 20, motivo: "Desconto de implantação." });
  });

  test("endereço de cobrança: a folha mostra o endereço e o editar o manda junto", async ({ page }) => {
    const END = { cep: "50050000", logradouro: "Rua da Aurora", numero: "295", complemento: "sala 1102", bairro: "Boa Vista", cidade: "Recife", uf: "PE" };
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: ADM },
      [`/v1/clientes/${AROEIRA.id}`]: { corpo: ficha(AROEIRA, PERMISSOES) },
      [`/v1/clientes/${AROEIRA.id}/notas`]: { corpo: { notas: [] } },
      [`/v1/clientes/${AROEIRA.id}/assinatura`]: { corpo: assinatura({ enderecoCobranca: END }) },
      [`PUT /v1/clientes/${AROEIRA.id}/assinatura`]: { corpo: { id: "x", versao: 4 } },
    });
    await page.goto(`${C}/clientes/${AROEIRA.id}/assinatura`);
    await expect(page.getByText("Rua da Aurora, 295, sala 1102 · Boa Vista · Recife, PE · CEP 50050-000")).toBeVisible();
    await expect(page.getByText("Falta o endereço")).toHaveCount(0);
    await expect(page.getByText("CNPJ de cobrança")).toBeVisible();
    await semViolacoes(page);

    await page.getByRole("button", { name: "Editar" }).click();
    const grupo = page.getByRole("group", { name: "Endereço de cobrança" });
    await expect(grupo.getByLabel("CEP")).toHaveValue("50050-000");
    await expect(grupo.getByLabel("UF")).toHaveValue("PE");
    await grupo.getByLabel("CEP").fill("50050-00");
    await grupo.getByLabel("Número").fill("");
    await page.getByRole("button", { name: "Salvar a assinatura" }).click();
    await expect(page.getByText("Falta acertar 2 pontos, marcados abaixo.")).toBeVisible();
    await expect(page.getByText("O CEP tem 8 números; aqui há 7. Confira, como em 50050-000.")).toBeVisible();
    await expect(page.getByText("Escreva o número. Se não houver, escreva S/N.")).toBeVisible();
    await expect(grupo.getByLabel("CEP")).toBeFocused();
    await semViolacoes(page);
    expect(pedidos.filter((p) => p.metodo === "PUT")).toHaveLength(0);

    await grupo.getByLabel("CEP").fill("50050-000");
    await grupo.getByLabel("Número").fill("S/N");
    await page.getByRole("button", { name: "Salvar a assinatura" }).click();
    await expect(page.getByText("Assinatura salva.")).toBeVisible();
    const put = pedidos.find((p) => p.metodo === "PUT")?.corpo as Record<string, unknown>;
    expect(put.endereco).toEqual({ ...END, cep: "50050-000", numero: "S/N" });
  });

  test("sem endereço de cobrança: o aviso, a sugestão da ficha e o salvar que não trava", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: ADM },
      [`/v1/clientes/${AROEIRA.id}`]: { corpo: ficha(AROEIRA, PERMISSOES) },
      [`/v1/clientes/${AROEIRA.id}/notas`]: { corpo: { notas: [] } },
      [`/v1/clientes/${AROEIRA.id}/assinatura`]: {
        corpo: { ...assinatura({ enderecoCobranca: null }), enderecoSugerido: { logradouro: "Av. Conselheiro Aguiar, 1200", cidade: "Recife", uf: "PE" }, fichaTemEndereco: true },
      },
      [`PUT /v1/clientes/${AROEIRA.id}/assinatura`]: { corpo: { id: "x", versao: 4 } },
    });
    await page.goto(`${C}/clientes/${AROEIRA.id}/assinatura`);
    await expect(page.getByText("Falta o endereço: sem ele o boleto não sai, só o Pix.")).toBeVisible();
    await expect(page.getByText("Só Pix por enquanto")).toBeVisible();
    await expect(page.getByText(/A ficha tem a rua, mas não tem o CEP\./)).toBeVisible();
    await semViolacoes(page);

    await page.getByRole("button", { name: "Preencher o endereço" }).first().click();
    const grupo = page.getByRole("group", { name: "Endereço de cobrança" });
    await expect(grupo.getByLabel("Rua, avenida ou travessa")).toHaveValue("Av. Conselheiro Aguiar, 1200");
    await expect(grupo.getByLabel("CEP")).toHaveValue("");
    // Sem mexer no endereço sugerido, o resto da assinatura salva normalmente.
    await page.getByLabel("E-mail de cobrança").fill("cobranca@aroeira.exemplo.com.br");
    await page.getByRole("button", { name: "Salvar a assinatura" }).click();
    await expect(page.getByText("Assinatura salva.")).toBeVisible();
    const put = pedidos.find((p) => p.metodo === "PUT")?.corpo as Record<string, unknown>;
    expect(put.endereco).toBeNull();
    expect(put.emailCobranca).toBe("cobranca@aroeira.exemplo.com.br");
  });

  test("atraso de 41 dias: só consulta com motivo, e a faixa nas outras abas", async ({ page }) => {
    const atraso = assinatura({ situacao: "EM_ATRASO", atrasoDias: 41, avisoPortal: true, proporConsulta: true, abertas: { faturas: 1, totalCentavos: 19000 } });
    const consulta = assinatura({ situacao: "SO_CONSULTA", atrasoDias: 41, soConsultaDesde: `${hoje}T15:00:00Z`, abertas: { faturas: 1, totalCentavos: 19000 }, soConsulta: { desde: `${hoje}T15:00:00Z`, motivo: "x", por: CA.nome } });
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: ADM },
      [`/v1/clientes/${BACURI.id}`]: { corpo: ficha(BACURI, PERMISSOES) },
      [`/v1/clientes/${BACURI.id}/notas`]: { corpo: { notas: [] } },
      [`/v1/clientes/${BACURI.id}/assinatura`]: [{ corpo: atraso }, { corpo: atraso }, { corpo: consulta }],
      [`POST /v1/clientes/${BACURI.id}/portal-so-consulta`]: { corpo: { versao: 4 } },
    });
    await page.goto(`${C}/clientes/${BACURI.id}/assinatura?consulta=1`);
    const j = page.getByRole("alertdialog", { name: /só consulta/ });
    await expect(j).toBeVisible();
    await expect(j.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await j.getByRole("button", { name: "Passar para só consulta" }).click();
    await expect(j.getByText("Falta acertar 1 ponto, marcado abaixo.")).toBeVisible();
    await semViolacoes(page);
    await j.getByLabel("Motivo").fill("Fatura em aberto há mais de 30 dias.");
    await j.getByRole("button", { name: "Passar para só consulta" }).click();
    await expect(page.getByText(/está só para consulta\./)).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")?.corpo).toEqual({ versao: 3, motivo: "Fatura em aberto há mais de 30 dias." });
    await expect(page.getByRole("button", { name: "Devolver o acesso agora" })).toBeVisible();

    await page.goto(`${C}/clientes/${BACURI.id}/ficha`);
    await expect(page.getByRole("note", { name: "Situação do Portal" })).toContainText("Portal só para consulta por atraso");
  });

  test("Implantação vê o plano e a situação, sem valores", async ({ page }) => {
    const semValores = assinatura();
    const a = { ...semValores.assinatura } as Record<string, unknown>;
    for (const k of ["precoCentavos", "precoDoPlanoHojeCentavos", "emailCobranca", "cnpjNota", "parcelasPorCarne", "desconto", "soConsulta", "proxima", "abertas", "carne", "faturas", "mudancas"]) delete a[k];
    await simular(page, {
      "/v1/sessao": { corpo: IMPL },
      [`/v1/clientes/${AROEIRA.id}`]: { corpo: ficha(AROEIRA, ["console.ficha.ver"]) },
      [`/v1/clientes/${AROEIRA.id}/assinatura`]: { corpo: { ...semValores, valores: false, planos: null, pessoaAMaisCentavos: null, permissoes: { editar: false, soConsulta: false }, assinatura: a } },
    });
    await page.goto(`${C}/clientes/${AROEIRA.id}/assinatura`);
    await expect(page.getByText(/Você vê o plano e a situação da cobrança/)).toBeVisible();
    await expect(page.getByText("R$ 490,00")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("carteira: selo de atraso, filtro e atalho para Cobrança", async ({ page }) => {
    const clientes = [
      ...CLIENTES,
      { ...BACURI, cobranca: { atrasoDias: 41, soConsultaDesde: null } },
      { ...AROEIRA, id: "e0000000-0000-4000-8000-000000000006", nome: "Vale & Sena Advogados", cobranca: { atrasoDias: 10, soConsultaDesde: null } },
    ];
    await simular(page, { "/v1/sessao": { corpo: ADM }, "/v1/clientes": { corpo: { clientes } } });
    await page.goto(C);
    await expect(page.locator("text=Fatura em atraso · 41 dias >> visible=true").first()).toBeVisible();
    await page.getByRole("button", { name: "Fatura em atraso (2)" }).click();
    await expect(page.getByText(/Mostrando 2 escritórios com fatura em atraso/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver as faturas em Cobrança" })).toHaveAttribute("href", "/cobranca?situacao=EM_ATRASO");
    await semViolacoes(page);
  });
});
