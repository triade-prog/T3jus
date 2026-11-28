// Implantação assistida no Console (CO-08, F1.47), telas aprovadas em
// docs/design/aprovadas/console-implantacao: a aba Implantação da ficha (estados, registrar e
// desfazer treino, trocar quem acompanha, mudar o prazo, concluir e o conflito), o aviso da aba
// Contrato e a regra em Cobrança › Planos. A API é simulada; aqui se testa a tela, a
// acessibilidade e o que ela manda ao servidor.
import { expect, test, type Page } from "@playwright/test";
import { C, CA, CLIENTES, d, diaIso, ficha, fixarRelogio, IN, PERMISSOES, semViolacoes, SESSAO, simular, socio } from "./console-dados.ts";

const hoje = diaIso();
const dia = (n: number) => new Date(Date.parse(`${hoje}T12:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);
const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

// O sócio já entrou no Portal: é o que abre a implantação assistida.
const CEDRO = { ...CLIENTES[1]!, socios: [socio(2, "Renata Lima", d(9), d(8))] };
const PERM = [...PERMISSOES, "console.implantacao.ver"];
const ADM = { ...SESSAO, acoes: ["console.cobranca.ver", "console.cobranca.editar"] };
const FIN = { ...SESSAO, pessoaId: "c0000000-0000-4000-8000-000000000009", nome: "Fábio Neves", funcoes: ["FINANCEIRO"], acoes: ["console.cobranca.ver"] };

const RENATA = { id: "a0000000-0000-4000-8000-000000000002", nome: "Renata Lima" };
const JOANA = { id: "a0000000-0000-4000-8000-000000000012", nome: "Joana Freitas" };
const PEDRO = { id: "a0000000-0000-4000-8000-000000000013", nome: "Pedro Lima" };
const T1 = "71000000-0000-4000-8000-000000000001";
const T2 = "71000000-0000-4000-8000-000000000002";
const IMP = "70000000-0000-4000-8000-000000000001";

const treino = (o: Record<string, unknown>) => ({
  implantacaoId: IMP, implantacaoNumero: 1, forma: "VIDEO", temas: ["INICIO", "CLIENTES", "AGENDA"], dadoPor: { id: IN.pessoaId, nome: IN.nome },
  criadoEm: `${dia(-6)}T14:00:00-03:00`, desfeito: null, ...o,
});

function implantacao(o: { impl?: Record<string, unknown>; podeEditar?: boolean; podeMudarPrazo?: boolean; podeConcluir?: boolean; valores?: boolean; todas?: boolean } = {}) {
  const treinada = { treinada: true, treinoId: T1, dia: dia(-6), forma: "VIDEO", duracaoMin: 90 };
  const pessoas = [
    { ...RENATA, funcao: "SOCIO", areas: [], convite: { aceitou: true, aceitouEm: dia(-8), convidadaEm: dia(-9) }, treino: treinada },
    { ...JOANA, funcao: "EQUIPE", areas: ["JURIDICO"], convite: { aceitou: true, aceitouEm: dia(-7), convidadaEm: dia(-8) }, treino: o.todas ? treinada : { treinada: false } },
    { ...PEDRO, funcao: "EQUIPE", areas: ["FINANCEIRO"], convite: { aceitou: !!o.todas, aceitouEm: o.todas ? dia(-2) : null, convidadaEm: dia(-8) }, treino: o.todas ? treinada : { treinada: false } },
  ];
  const impl = {
    id: IMP, numero: 1, estado: "ABERTA", abertaEm: dia(-8), prazoAte: dia(22), nome: "Implantação assistida", descricao: "treino da equipe e acompanhamento por 30 dias",
    condicao: "ISENTA", condicaoTexto: "Oferta de lançamento", responsavel: { id: IN.pessoaId, nome: IN.nome }, concluidaEm: null, concluidaPor: null, resumo: null,
    canceladaEm: null, versao: 3, ...(o.valores === false ? {} : { valorCentavos: 149000 }), ...o.impl,
  };
  const treinadas = pessoas.filter((p) => p.treino.treinada).length;
  return {
    podeEditar: o.podeEditar ?? true, podeMudarPrazo: o.podeMudarPrazo ?? true, podeConcluir: o.podeConcluir ?? true, valores: o.valores ?? true,
    cliente: { estado: "IMPLANTACAO", versao: 2 },
    implantacao: impl,
    acompanhantes: o.podeEditar === false ? null : [{ id: IN.pessoaId, nome: IN.nome, funcoes: ["IMPLANTACAO"] }, { id: CA.pessoaId, nome: CA.nome, funcoes: ["ADMINISTRACAO"] }],
    situacao: {
      hoje, socioEntrou: { entrou: true, dia: dia(-8), pessoa: RENATA },
      importacao: { concluida: true, em: dia(-5), origem: "ASTREA", oQue: "CLIENTES_CONTRATOS" }, whatsapp: { ligado: false, desde: null },
      pessoas, treinadas, total: 3, diasAtePrazo: null,
    },
    treinos: [
      treino({ id: T2, dia: dia(-4), duracaoMin: 60, forma: "TELEFONE", pessoas: [JOANA], desfeito: { em: `${dia(-4)}T18:00:00-03:00`, por: { id: IN.pessoaId, nome: IN.nome }, motivo: "Registrado no escritório errado." } }),
      treino({ id: T1, dia: dia(-6), duracaoMin: 90, pessoas: [RENATA] }),
    ],
    temas: ["INICIO", "CLIENTES", "CONVERSAS", "AGENDA", "FINANCEIRO"],
  };
}

const ASSINATURA = {
  hoje, valores: true, estagio: "IMPLANTACAO", contrato: "ABERTO", permissoes: { editar: true, soConsulta: false }, pessoasAtivas: 3, emailSugerido: null, cnpjSugerido: null,
  pessoaAMaisCentavos: 3900, planos: [], assinatura: null,
  implantacao: {
    id: IMP, numero: 1, estado: "ABERTA", nome: "Implantação assistida", descricao: "treino da equipe e acompanhamento por 30 dias", condicao: "ISENTA",
    condicaoTexto: "Oferta de lançamento", naFatura: true, faturada: false, faturaId: null, faturaNumero: null, faturaCompetencia: null, naPrimeiraFatura: true, valorCentavos: 149000,
  },
};

function rotas(extra: Record<string, unknown> = {}, o: { sessao?: unknown; perm?: string[]; impl?: unknown } = {}) {
  return {
    "/v1/sessao": { corpo: o.sessao ?? { ...SESSAO, nome: IN.nome, pessoaId: IN.pessoaId, funcoes: ["IMPLANTACAO"] } },
    [`/v1/clientes/${CEDRO.id}`]: { corpo: ficha(CEDRO, o.perm ?? PERM) },
    [`/v1/clientes/${CEDRO.id}/notas`]: { corpo: { notas: [] } },
    [`/v1/clientes/${CEDRO.id}/implantacao`]: o.impl ?? { corpo: implantacao() },
    [`/v1/clientes/${CEDRO.id}/assinatura`]: { corpo: ASSINATURA },
    ...extra,
  } as Parameters<typeof simular>[1];
}

async function abrirAba(page: Page, q = "") {
  await page.goto(`${C}/clientes/${CEDRO.id}/implantacao${q}`);
  await expect(page.getByRole("heading", { name: "O que já aconteceu" })).toBeVisible();
}

// O relógio do navegador fica em AGORA, o mesmo instante de onde os dados contam (F3.164).
test.beforeEach(async ({ page }) => { await fixarRelogio(page); });

test.describe("Console: implantação assistida", () => {
  test("aberta: o prazo, o que já aconteceu, as pessoas e os treinos, sem violações", async ({ page }) => {
    await simular(page, rotas());
    await abrirAba(page);
    await expect(page.getByRole("tab", { name: "Implantação", selected: true }).or(page.getByRole("link", { name: "Implantação", exact: true })).first()).toBeVisible();
    await expect(page.getByText(`até ${br(dia(22))}`).first()).toBeVisible();
    await expect(page.getByText("1 de 3 pessoas treinadas")).toBeVisible();
    await expect(page.getByText("Faltam 2: Joana Freitas e Pedro Lima. Veja abaixo.")).toBeVisible();
    await expect(page.getByText("o treino fica para depois do primeiro acesso")).toBeVisible();
    await expect(page.getByText("Registrado no escritório errado.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Concluir a implantação" }).first()).toHaveAttribute("href", `/clientes/${CEDRO.id}/implantacao?concluir=1`);
    await expect(page.getByText(/Desconto/)).toHaveCount(0);
    await semViolacoes(page);
  });

  test("registrar treino: os erros presos aos campos e o corpo enviado", async ({ page }) => {
    const pedidos = await simular(page, rotas({ [`POST /v1/clientes/${CEDRO.id}/implantacao/treinos`]: { corpo: { id: "t-novo" } } }));
    await abrirAba(page);
    await page.getByRole("button", { name: "Registrar treino" }).click();
    const j = page.getByRole("dialog", { name: "Registrar treino" });
    await j.getByLabel("Dia do treino").fill(br(dia(1)));
    await j.getByLabel("Duração, em minutos").fill("10");
    await j.getByRole("button", { name: "Registrar o treino" }).click();
    await expect(j.getByText("Falta acertar 3 pontos, marcados abaixo.")).toBeVisible();
    await expect(j.getByLabel("Dia do treino")).toHaveAttribute("aria-invalid", "true");
    await expect(j.getByLabel("Dia do treino")).toBeFocused();
    await expect(j.getByText("Escreva entre 15 e 480 minutos.")).toBeVisible();
    await expect(j.getByText("Marque pelo menos uma pessoa.")).toBeVisible();
    await semViolacoes(page);

    await j.getByLabel("Dia do treino").fill(br(hoje));
    await j.getByLabel("Duração, em minutos").fill("90");
    await j.getByRole("checkbox", { name: /Joana Freitas/ }).check();
    await j.getByRole("checkbox", { name: /Agenda/ }).check();
    await j.getByRole("button", { name: "Registrar o treino" }).click();
    await expect(page.getByText("Treino registrado.")).toBeVisible();
    const post = pedidos.find((p) => p.metodo === "POST");
    expect(post?.corpo).toEqual({ dia: hoje, duracaoMin: 90, forma: "VIDEO", pessoas: [JOANA.id], temas: ["AGENDA"] });
  });

  test("desfazer registro pede o motivo e manda só ele", async ({ page }) => {
    const pedidos = await simular(page, rotas({ [`POST /v1/clientes/${CEDRO.id}/implantacao/treinos/${T1}/desfazer`]: { corpo: { ok: true } } }));
    await abrirAba(page);
    await page.getByRole("button", { name: /Desfazer registro/ }).first().click();
    const j = page.getByRole("alertdialog");
    await expect(j).toContainText(`Desfazer o registro do treino de ${br(dia(-6)).slice(0, 5)}?`);
    await expect(j.getByRole("button", { name: "Voltar" })).toBeFocused();
    await j.getByRole("button", { name: "Desfazer o registro" }).click();
    await expect(j.getByLabel("Motivo")).toHaveAttribute("aria-invalid", "true");
    await semViolacoes(page);
    await j.getByLabel("Motivo").fill("Treino lançado em dobro.");
    await j.getByRole("button", { name: "Desfazer o registro" }).click();
    await expect(page.getByText("Registro desfeito.")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")?.corpo).toEqual({ motivo: "Treino lançado em dobro." });
  });

  test("trocar quem acompanha manda a versão lida", async ({ page }) => {
    const pedidos = await simular(page, rotas({ [`PUT /v1/clientes/${CEDRO.id}/implantacao/responsavel`]: { corpo: { versao: 4 } } }));
    await abrirAba(page);
    await page.getByRole("button", { name: /Trocar/ }).first().click();
    const j = page.getByRole("dialog", { name: "Trocar quem acompanha" });
    await j.getByRole("radio", { name: new RegExp(CA.nome) }).check();
    await semViolacoes(page);
    await j.getByRole("button", { name: "Trocar", exact: true }).click();
    await expect(page.getByText("Quem acompanha mudou.")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "PUT")?.corpo).toEqual({ responsavelId: CA.pessoaId, versao: 3 });
  });

  test("mudar o prazo: a Administração muda com motivo; a Implantação só lê", async ({ page }) => {
    const pedidos = await simular(page, rotas({ [`PUT /v1/clientes/${CEDRO.id}/implantacao/prazo`]: { corpo: { versao: 4 } } }, { sessao: SESSAO }));
    await abrirAba(page);
    await page.getByRole("button", { name: "Mudar o prazo" }).first().click();
    const j = page.getByRole("dialog", { name: "Mudar o prazo da implantação" });
    await j.getByLabel("Novo prazo").fill(br(dia(-1)));
    await j.getByRole("button", { name: "Mudar o prazo" }).click();
    await expect(j.getByLabel("Novo prazo")).toHaveAttribute("aria-invalid", "true");
    await expect(j.getByLabel("Motivo")).toHaveAttribute("aria-invalid", "true");
    await semViolacoes(page);
    await j.getByLabel("Novo prazo").fill(br(dia(30)));
    await j.getByLabel("Motivo").fill("O escritório pediu mais uma semana para o treino da equipe.");
    await j.getByRole("button", { name: "Mudar o prazo" }).click();
    await expect(page.getByText("Prazo mudado.")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "PUT")?.corpo).toEqual({ versao: 3, prazoAte: dia(30), motivo: "O escritório pediu mais uma semana para o treino da equipe." });
  });

  test("a Implantação não muda o prazo", async ({ page }) => {
    await simular(page, rotas({}, { impl: { corpo: implantacao({ podeMudarPrazo: false }) } }));
    await abrirAba(page);
    await expect(page.getByText("Só a Administração muda o prazo.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Mudar o prazo" })).toHaveCount(0);
  });

  test("concluir pelo atalho: a janela abre, mostra a cobrança e manda as versões", async ({ page }) => {
    const pedidos = await simular(page, rotas({ [`POST /v1/clientes/${CEDRO.id}/implantacao/concluir`]: { corpo: { ok: true } } }));
    await abrirAba(page, "?concluir=1");
    const j = page.getByRole("alertdialog");
    await expect(j).toContainText(`Concluir a implantação da ${CEDRO.nome}?`);
    await expect(j.getByText("Na cobrança").first()).toBeVisible();
    await semViolacoes(page);
    await j.getByLabel(/Resumo/).fill("Equipe treinada; agenda e clientes em uso.");
    await j.getByRole("button", { name: "Concluir e passar para Ativo" }).click();
    await expect(page.getByText("Implantação concluída.")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")?.corpo).toEqual({ versaoCliente: 2, versaoImplantacao: 3, resumo: "Equipe treinada; agenda e clientes em uso." });
  });

  test("concluir com conflito: mostra o que mudou e manda as versões novas", async ({ page }) => {
    const nova = implantacao({ impl: { prazoAte: dia(29), versao: 4 } });
    const pedidos = await simular(page, rotas({
      [`POST /v1/clientes/${CEDRO.id}/implantacao/concluir`]: [{ status: 409, corpo: { erro: { codigo: "VERSION_CONFLICT", detalhes: { versao: 3, atual: 4 } } } }, { corpo: { ok: true } }],
    }, { impl: [{ corpo: implantacao() }, { corpo: nova }] }));
    await abrirAba(page, "?concluir=1");
    const j = page.getByRole("alertdialog");
    await j.getByRole("button", { name: "Concluir e passar para Ativo" }).click();
    await expect(j.getByText("Outra pessoa mudou a implantação enquanto esta janela estava aberta.")).toBeVisible();
    await expect(j.getByRole("table")).toContainText(br(dia(29)));
    await semViolacoes(page);
    await j.getByRole("button", { name: "Concluir e passar para Ativo" }).click();
    await expect(page.getByText("Implantação concluída.")).toBeVisible();
    const posts = pedidos.filter((p) => p.metodo === "POST");
    expect(posts.at(-1)?.corpo).toMatchObject({ versaoCliente: 2, versaoImplantacao: 4 });
  });

  for (const [nome, prazo, texto] of [
    ["perto do prazo", 5, "Faltam 5 dias para o prazo, e 2 pessoas estão sem treino."],
    ["vence hoje", 0, "O prazo da implantação vence hoje."],
    ["passou do prazo", -3, `O prazo passou em ${br(dia(-3))}, há 3 dias.`],
  ] as const) {
    test(`${nome}: a faixa do prazo, sem violações`, async ({ page }) => {
      await simular(page, rotas({}, { impl: { corpo: implantacao({ impl: { prazoAte: dia(prazo) } }) } }));
      await abrirAba(page);
      await expect(page.getByText(texto).first()).toBeVisible();
      await semViolacoes(page);
    });
  }

  test("tudo pronto: as três pessoas treinadas", async ({ page }) => {
    await simular(page, rotas({}, { impl: { corpo: implantacao({ todas: true }) } }));
    await abrirAba(page);
    await expect(page.getByText("3 de 3 pessoas treinadas")).toBeVisible();
    await expect(page.getByText("As 3 pessoas foram treinadas.").first()).toBeVisible();
  });

  test("concluída e cancelada: só leitura", async ({ page }) => {
    await simular(page, rotas({}, {
      impl: [
        { corpo: { ...implantacao({ impl: { estado: "CONCLUIDA", concluidaEm: `${dia(-1)}T16:00:00-03:00`, concluidaPor: IN.nome, resumo: "Tudo certo com a equipe." } }), cliente: { estado: "ATIVO", versao: 3 } } },
      ],
    }));
    await abrirAba(page);
    await expect(page.getByRole("heading", { name: "Resumo da conclusão" })).toBeVisible();
    await expect(page.getByText("“Tudo certo com a equipe.”")).toBeVisible();
    await expect(page.getByRole("button", { name: "Concluir a implantação" })).toHaveCount(0);
    await semViolacoes(page);

    await page.unrouteAll();
    await simular(page, rotas({}, { impl: { corpo: implantacao({ impl: { estado: "CANCELADA", canceladaEm: `${dia(-1)}T16:00:00-03:00` } }) } }));
    await abrirAba(page);
    await expect(page.getByText("A implantação foi cancelada com o fim do contrato.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrar treino" })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("Financeiro e Suporte leem sem editar", async ({ page }) => {
    await simular(page, rotas({}, { sessao: FIN, impl: { corpo: implantacao({ podeEditar: false, podeMudarPrazo: false, podeConcluir: false }) } }));
    await abrirAba(page);
    await expect(page.getByText("Você vê a implantação. Quem registra treinos, troca o responsável e conclui é a Implantação ou a Administração.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrar treino" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Desfazer registro/ })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("erro ao carregar mostra o código e tenta de novo", async ({ page }) => {
    await simular(page, rotas({}, { impl: [{ status: 500, corpo: { erro: { codigo: "INTERNAL" } } }, { corpo: implantacao() }] }));
    await page.goto(`${C}/clientes/${CEDRO.id}/implantacao`);
    await expect(page.getByText("Não deu para carregar a implantação deste cliente")).toBeVisible();
    await expect(page.getByText("Código para o suporte: INTERNAL")).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(page.getByRole("heading", { name: "O que já aconteceu" })).toBeVisible();
  });

  test("sem permissão: o aviso e nenhuma leitura da implantação", async ({ page }) => {
    const pedidos = await simular(page, rotas({}, { perm: PERMISSOES }));
    await page.goto(`${C}/clientes/${CEDRO.id}/implantacao`);
    await expect(page.getByText(`Você não vê a implantação da ${CEDRO.nome}`)).toBeVisible();
    expect(pedidos.some((p) => p.caminho === `/v1/clientes/${CEDRO.id}/implantacao`)).toBe(false);
    await semViolacoes(page);
  });

  test("aba Contrato: passar para Ativo leva a concluir a implantação", async ({ page }) => {
    await simular(page, rotas({}, { sessao: SESSAO }));
    await page.goto(`${C}/clientes/${CEDRO.id}/contrato`);
    await expect(page.getByText("Passar para Ativo agora é “Concluir a implantação”.")).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("link", { name: "Concluir a implantação" }).last().click();
    await expect(page.getByRole("alertdialog")).toContainText(`Concluir a implantação da ${CEDRO.nome}?`);
  });
});

test.describe("Console: a regra da implantação em Cobrança › Planos", () => {
  const PLANOS = { podeEditar: true, pessoaAMais: { centavos: 3900, versao: 1 }, planos: [], historico: [] };
  const REGRA = {
    podeEditar: true,
    regra: {
      nome: "Implantação assistida", descricao: "treino da equipe e acompanhamento por 30 dias", valorCentavos: 149000, condicaoPadrao: "ISENTA",
      isencaoAte: null, isencaoTexto: "Oferta de lançamento", prazoDias: 30, versao: 2, alteradoEm: null, alteradoPor: null,
    },
    hoje: { dia: hoje, condicao: "ISENTA", condicaoTexto: "Oferta de lançamento" },
    historico: [],
  };

  test("a folha, a prévia e editar com erros e o corpo enviado", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: ADM }, "/v1/cobranca/planos": { corpo: PLANOS }, "/v1/cobranca/implantacao": { corpo: REGRA },
      "PUT /v1/cobranca/implantacao": [
        { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { campos: ["prazoDias"] } } } },
        { corpo: { versao: 3, mudou: true } },
      ],
    });
    await page.goto(`${C}/cobranca/planos`);
    const folha = page.locator("section").filter({ has: page.getByRole("heading", { name: "Implantação assistida" }) });
    await expect(folha.getByText("R$ 1.490,00").first()).toBeVisible();
    await expect(folha.getByText("Isenção da implantação · Oferta de lançamento").first()).toBeVisible();
    await expect(folha.getByText("Sem data de fim")).toBeVisible();
    await semViolacoes(page);

    await folha.getByRole("button", { name: /Editar/ }).click();
    const j = page.getByRole("dialog", { name: "Editar a implantação assistida" });
    await j.getByLabel("Valor da implantação").fill("abc");
    await j.getByLabel(/Isenta até/).fill(br(dia(-1)));
    await j.getByRole("button", { name: "Salvar a regra" }).click();
    await expect(j.getByText("Falta acertar 2 pontos, marcados abaixo.")).toBeVisible();
    await expect(j.getByLabel("Valor da implantação")).toBeFocused();
    await semViolacoes(page);

    await j.getByRole("radio", { name: /Cobrada à vista/ }).check();
    await expect(j.getByText("Antes de cobrar, resolva a nota fiscal com o contador.")).toBeVisible();
    await expect(j.getByLabel(/Isenta até/)).toBeDisabled();
    await j.getByRole("radio", { name: /^Isenta/ }).check();
    await j.getByLabel("Valor da implantação").fill("1.490,00");
    await j.getByLabel(/Isenta até/).fill("31/05/2027");
    await j.getByRole("button", { name: "Salvar a regra" }).click();
    await expect(j.getByLabel("Prazo, em dias")).toHaveAttribute("aria-invalid", "true");
    await j.getByRole("button", { name: "Salvar a regra" }).click();
    await expect(page.getByText("Regra da implantação salva.")).toBeVisible();
    expect(pedidos.filter((p) => p.metodo === "PUT").at(-1)?.corpo).toEqual({
      versao: 2, nome: "Implantação assistida", descricao: "treino da equipe e acompanhamento por 30 dias", valorCentavos: 149000, condicaoPadrao: "ISENTA",
      isencaoAte: "2027-05-31", isencaoTexto: "Oferta de lançamento", prazoDias: 30,
    });
  });

  test("o Financeiro lê a regra sem editar", async ({ page }) => {
    await simular(page, { "/v1/sessao": { corpo: FIN }, "/v1/cobranca/planos": { corpo: { ...PLANOS, podeEditar: false } }, "/v1/cobranca/implantacao": { corpo: { ...REGRA, podeEditar: false } } });
    await page.goto(`${C}/cobranca/planos`);
    await expect(page.getByText("Quem muda a regra da implantação é a Administração.")).toBeVisible();
    await expect(page.getByRole("button", { name: /a regra da implantação/ })).toHaveCount(0);
    await semViolacoes(page);
  });
});
