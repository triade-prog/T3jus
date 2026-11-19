// F0.6 e F0.3 no Portal do advogado: quem tem vínculo entra; o escritório vem da sessão.
import { assert, assertEquals, assertMatch } from "@std/assert";
import { criarApiPortal } from "./app.ts";
import { adminFalso, authFalso, bancoFalso, CODIGO_CERTO, cookieChamado, cookieDe, erro, erroBanco, limitesFalsos, pedido, TOKEN_CONVITE, TOKEN_LINK, TOKEN_RECUPERACAO } from "../_shared/teste_util.ts";

const ANA = "2d9e5b2a-7f3c-4e4d-9a0b-3c4d5e6f7a8b";
const AURORA = "3e0f6c3b-8a4d-4f5e-8b1c-4d5e6f7a8b9c";
const BELA_VISTA = "4f1a7d4c-9b5e-4a6f-9c2d-5e6f7a8b9c0d";
const LARA = "5a2b8e5d-0c6f-4b7a-8d3e-6f7a8b9c0d1e";
const VL_LARA = "6b3c9f6e-1d7a-4c8b-9e4f-7a8b9c0d1e2f";
const CLIENTE = "7c4d0a7f-2e8b-4d9c-8f5a-8b9c0d1e2f3a";
const ENTRAR = { email: "ana@exemplo.invalid", senha: "senha-da-socia" };

function montar(opcoes: { comAutenticador?: boolean; vazadas?: string[]; naoDono?: boolean; semComercial?: boolean; soConsulta?: boolean } = {}) {
  const { admin, enviados, contas } = adminFalso({ "lara@aurora.adv.br": LARA });
  const vinculos = new Set([AURORA]);
  const sessoes = new Map<string, string>();
  const falso = authFalso([
    { id: ANA, email: ENTRAR.email, senha: ENTRAR.senha, fatores: opcoes.comAutenticador ? [{ id: crypto.randomUUID(), verificado: true }] : [] },
  ]);
  const db = bancoFalso({
    acesso_portal: (a) => a.p_pessoa === ANA && vinculos.size > 0,
    registrar_acesso: () => 1,
    meus_escritorios: () => [...vinculos].map((id) => ({ escritorio_id: id, nome: id === AURORA ? "Aurora Advocacia" : "Bela Vista Advogados", funcoes: ["SOCIO"] })),
    escolher_escritorio: (a) => {
      if (!vinculos.has(String(a.p_escritorio))) erroBanco("TC401");
      sessoes.set(String(a.p_sessao), String(a.p_escritorio));
      return null;
    },
    escritorio_da_sessao: (a) => {
      const c = sessoes.get(String(a.p_sessao));
      return c && vinculos.has(c) ? c : null;
    },
    exportar_escritorio: (a) => {
      if (!vinculos.has(String(a.p_escritorio))) erroBanco("TC401");
      return { formato: "t3jus.exportacao.v1", geradoEm: "2026-11-18T10:00:00-03:00", escritorio: { id: a.p_escritorio }, pessoas: [], tabelas: {} };
    },
    escritorios_para_escolher: () => [
      { escritorio_id: BELA_VISTA, nome: "Bela Vista Advogados", cidade: "Salvador", uf: "BA", ultima_entrada: "2026-11-18T09:12:00-03:00" },
      { escritorio_id: AURORA, nome: "Aurora Advocacia", cidade: null, uf: null, ultima_entrada: null },
    ],
    dados_convite: () => ({ nome: "Ana", escritorio: "Aurora Advocacia", quem: "Ricardo Almeida", papel: "ESCRITORIO" }),
    aceitar_convite: () => null,
    portal_escritorio: (a) => {
      if (!vinculos.has(String(a.p_escritorio))) erroBanco("TC401");
      return { id: a.p_escritorio, nome: "Aurora Advocacia", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"] };
    },
    portal_equipe: (a) => {
      if (opcoes.naoDono) erroBanco("TC401");
      return [{ vinculoId: VL_LARA, pessoaId: LARA, nome: "Lara", dono: false, areas: ["JURIDICO"], desde: "2026-11-18", versao: 1, senhaCriadaEm: null, conviteEnviadoEm: "2026-11-18", escritorio: a.p_escritorio }];
    },
    portal_exigir_escrita: () => {
      if (opcoes.soConsulta) erroBanco("TC401", { motivo: "CONTRATO_ENCERRADO" });
      return null;
    },
    portal_equipe_retiradas: () => [{ vinculoId: VL_LARA, pessoaId: LARA, nome: "Lara", retiradaEm: "2026-11-18", saida: { entradaApagaEm: "2027-02-16" } }],
    portal_convidar: () => VL_LARA,
    portal_mudar_areas: (a) => a.p_areas,
    portal_reenviar_convite: () => LARA,
    portal_retirar: (a) => {
      if (a.p_passar_para === null) erroBanco("TC422", { campos: ["passarPara"] });
      return { versao: 2, passouPara: a.p_passar_para };
    },
    portal_historico_equipe: () => [{ id: 7, ocorrido_em: "2026-11-18T10:00:00-03:00", autor_id: ANA, autor_nome: "Ana", acao: "equipe.retirada", entidade_id: VL_LARA, dados: {}, pessoa_nome: "Lara", para_nome: "Ana" }],
    portal_clientes: (a) => ({ comercial: true, clientes: [{ id: CLIENTE, nome: "Helena Prado", termo: a.p_termo }] }),
    portal_clientes_duplicados: () => [{ id: CLIENTE, nome: "Helena Prado", situacao: "ATIVO", desde: "2026-11-01", por: "DOCUMENTO" }],
    portal_cliente_cadastrar: () => ({ id: CLIENTE, versao: 1 }),
    portal_cliente_editar: (a) => ({ id: a.p_cliente, versao: Number(a.p_versao) + 1 }),
    portal_cliente: (a) => ({ id: a.p_cliente, nome: "Helena Prado", rep_nome: null, estado_civil: "CASADO", criado_em: "2026-11-01", contatos: [{ nome: "Helena", e_principal: true }] }),
    portal_cliente_inativar: () => 3,
    portal_cliente_reativar: () => 4,
    portal_atendimentos: () => { if (opcoes.semComercial) erroBanco("TC401", { motivo: "AREA_NAO_LIBERADA" }); return []; },
    portal_registrar_atendimento: () => "9c8b7a6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
    portal_pessoas_escritorio: () => [{ id: ANA, nome: "Ana" }],
    portal_inicio_contatos: (a) => {
      if (a.p_de === "EQUIPE" && opcoes.naoDono) erroBanco("TC401", { motivo: "SO_SOCIO_DONO" });
      return { de: a.p_de, dono: !opcoes.naoDono, vencidos: [], hoje: [], totalVencidos: 0, totalHoje: 0, maisAntigo: null, equipeVencidos: null, pedidosExclusao: null };
    },
    portal_cliente_pedir_exclusao: (a) => ({ id: "p1", estado: "PENDENTE", ...(a.p_dados as Record<string, unknown>) }),
    portal_cliente_recusar_exclusao: (a) => ({ id: "p1", estado: "RECUSADO", motivoRecusa: a.p_motivo }),
    portal_cliente_excluir_dados: (a) => {
      if (opcoes.naoDono) erroBanco("TC401", { motivo: "SO_SOCIO_DONO" });
      return { protocolo: "EXC-2026-0001", versao: Number(a.p_versao) + 1, pedido: { id: "p1", estado: "ATENDIDO" } };
    },
    portal_agenda: (a) => ({ juridico: true, compromissos: [], feriados: [], prazos: [], tiposEscritos: [], de: a.p_de }),
    portal_compromisso_marcar: () => ({ id: CLIENTE, versao: 1 }),
    portal_comercial_retornos: () => ({ algum: false }),
    portal_propostas: () => ({ propostas: [], contagem: { andamento: 0, contrato: 0, recusadas: 0 }, algum: false }),
    portal_proposta_criar: () => ({ id: CLIENTE, numero: "P-2026-001", versao: 1 }),
    portal_proposta_resposta: () => ({ id: CLIENTE, versao: 4, situacao: "RECUSADA" }),
    portal_proposta_enviada: () => 3,
    portal_comercial_funil: (a) => ({ periodo: a.p_periodo }),
    portal_contratos: (a) => ({ algum: false, contagem: { ativos: 0, elaboracao: 0, encerrados: 0, base: 0 }, contratos: [], mostrar: a.p_mostrar }),
    portal_contrato_criar: () => ({ id: CLIENTE, numero: "C-2026-001", versao: 1 }),
    portal_contrato_condicoes: (a) => {
      if (a.p_dados && !(a.p_dados as Record<string, unknown>).motivo) erroBanco("TC422", { campos: ["motivo"] });
      return { id: a.p_contrato, versao: Number(a.p_versao) + 1, cancelados: 2, novos: 2 };
    },
    portal_contrato_assinatura: (a) => ({ id: a.p_contrato, versao: Number(a.p_versao) + 1, recebimentos: 3, em: a.p_assinado_em }),
    portal_contrato_base: (a) => ({ id: a.p_recebimento, valor: 63540, vencimento: "2026-12-15" }),
    portal_financeiro_receber: (a) => ({ algum: true, parcelas: [], mostrar: a.p_mostrar, forma: a.p_forma, responsavel: a.p_responsavel }),
    portal_financeiro_contrato: (a) => ({ id: a.p_contrato, parcelas: [] }),
    portal_financeiro_receber_registrar: (a) => {
      if ((a.p_dados as Record<string, unknown>).valor === 90000) erroBanco("TC422", { motivo: "VALOR_ACIMA_DO_SALDO", campos: ["valor"], falta: 85000 });
      return { id: CLIENTE, paga: true, falta: 0, recibo: { ano: 2026, numero: 1 } };
    },
    portal_financeiro_cobranca_anotar: () => ({ id: CLIENTE }),
    portal_financeiro_pagar: (a) => ({ algum: true, contas: [], mostrar: a.p_mostrar }),
    portal_financeiro_conta_lancar: () => ({ id: CLIENTE, recorrenteId: null }),
    portal_financeiro_conta_paga: (a) => {
      const d = a.p_dados as { pagaEm?: string };
      if ((d.pagaEm ?? "") > "2026-11-18") erroBanco("TC422", { motivo: "DATA_NO_FUTURO", campos: ["pagaEm"] });
      return { id: a.p_conta, pagaEm: d.pagaEm };
    },
    portal_financeiro_conta_reembolsada: (a) => ({ id: a.p_conta, reembolsadoEm: (a.p_dados as { reembolsadoEm: string }).reembolsadoEm }),
    portal_compromisso: (a) => ({ id: a.p_compromisso, titulo: "Conciliação" }),
    portal_compromisso_editar: (a) => {
      if (a.p_motivo === null) erroBanco("TC422", { campos: ["motivo"] });
      return { id: a.p_compromisso, versao: Number(a.p_versao) + 1 };
    },
    portal_compromisso_cancelar: (a) => Number(a.p_versao) + 1,
    ...limitesFalsos({ login: 5, autenticador: 10, recuperacao: 3, convite: 10 }),
  });
  const app = criarApiPortal("segredo-de-repasse-de-teste", {
    banco: db.banco, auth: falso.auth, urlApp: "https://portal.exemplo", admin,
    senhaVazada: (senha) => Promise.resolve((opcoes.vazadas ?? []).includes(senha)),
  });
  return { pedir: pedido(app, "api-portal"), vinculos, enviados, contas, ...falso, ...db };
}

Deno.test("sócio sem autenticador entra só com a senha (o autenticador é obrigatório só para a equipe)", async () => {
  const m = montar();
  const r = await m.pedir("/v1/auth/entrar", { corpo: ENTRAR });
  assertEquals(await r.json(), { etapa: "PRONTO" });
  assertMatch(r.headers.get("set-cookie") ?? "", /^__Host-portal=v1\./);
  const s = await m.pedir("/v1/sessao", { cookie: cookieDe(r) });
  assertEquals(await s.json(), {
    pessoaId: ANA,
    escritorioAtual: null,
    escritorios: [{ id: AURORA, nome: "Aurora Advocacia", funcoes: ["SOCIO"] }],
  });
});

Deno.test("quem cadastrou autenticador precisa do código em toda sessão", async () => {
  const m = montar({ comAutenticador: true });
  const r = await m.pedir("/v1/auth/entrar", { corpo: ENTRAR });
  assertEquals(await r.json(), { etapa: "CODIGO" });
  const aal1 = cookieDe(r);
  assertEquals((await erro(await m.pedir("/v1/sessao", { cookie: aal1 }))).codigo, "MFA_REQUIRED");
  const v = await m.pedir("/v1/auth/autenticador/verificar", { corpo: { codigo: CODIGO_CERTO }, cookie: aal1 });
  assertEquals((await m.pedir("/v1/sessao", { cookie: cookieDe(v) })).status, 200);
});

Deno.test("PT-01: sem escritório escolhido na sessão, rota de dado do escritório não abre", async () => {
  const m = montar();
  const cookie = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  const r = await m.pedir("/v1/escritorio", { cookie });
  assertEquals(r.status, 403);
  assertEquals((await erro(r)).codigo, "ESCRITORIO_REQUIRED");
});

Deno.test("PT-01: o escritório fica na sessão do servidor; o navegador não o manda de novo", async () => {
  const m = montar();
  const cookie = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  const e = await m.pedir("/v1/sessao/escritorio", { metodo: "PUT", corpo: { escritorioId: AURORA }, cookie });
  assertEquals(await e.json(), { escritorioAtual: AURORA });
  const escolha = m.chamadas.find((c) => c.funcao === "escolher_escritorio")!;
  assertEquals(escolha.args.p_pessoa, ANA);
  assertEquals(typeof escolha.args.p_sessao, "string");

  const r = await m.pedir("/v1/escritorio", { cookie });
  assertEquals(await r.json(), {
    id: AURORA, nome: "Aurora Advocacia", funcoes: ["SOCIO"], dono: true,
    areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"], outrosEscritorios: 0,
  });
});

Deno.test("PT-01: escolher escritório sem vínculo é recusado", async () => {
  const m = montar();
  const cookie = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  const r = await m.pedir("/v1/sessao/escritorio", { metodo: "PUT", corpo: { escritorioId: BELA_VISTA }, cookie });
  assertEquals(r.status, 403);
  assertEquals((await erro(r)).codigo, "FORBIDDEN");
});

Deno.test("PT-21: vínculo revogado para na chamada seguinte", async () => {
  const m = montar();
  const cookie = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  await m.pedir("/v1/sessao/escritorio", { metodo: "PUT", corpo: { escritorioId: AURORA }, cookie });
  m.vinculos.clear();
  assertEquals((await erro(await m.pedir("/v1/escritorio", { cookie }))).codigo, "FORBIDDEN");
});

Deno.test("o cookie do Console não abre o Portal", async () => {
  const m = montar();
  const deLa = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR })).replace("__Host-portal", "__Host-console");
  assertEquals((await erro(await m.pedir("/v1/sessao", { cookie: deLa }))).codigo, "UNAUTHORIZED");
});

Deno.test("PT-15: a exportação sai do escritório da sessão, nunca de um id do navegador", async () => {
  const m = montar();
  const cookie = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  assertEquals((await erro(await m.pedir("/v1/escritorio/exportacao", { metodo: "POST", corpo: {}, cookie }))).codigo, "ESCRITORIO_REQUIRED");
  await m.pedir("/v1/sessao/escritorio", { metodo: "PUT", corpo: { escritorioId: AURORA }, cookie });
  const r = await m.pedir("/v1/escritorio/exportacao", { metodo: "POST", corpo: { escritorioId: BELA_VISTA }, cookie });
  assertEquals(r.status, 200);
  assertEquals(r.headers.get("content-disposition"), 'attachment; filename="t3jus-exportacao-2026-11-18.json"');
  assertEquals(r.headers.get("cache-control"), "no-store");
  assertEquals((await r.json()).formato, "t3jus.exportacao.v1");
  const chamada = m.chamadas.find((c) => c.funcao === "exportar_escritorio")!;
  assertEquals(chamada.args, { p_pessoa: ANA, p_escritorio: AURORA });
});

Deno.test("manter conectado: marcado, o cookie tem prazo; desmarcado, some ao fechar o navegador", async () => {
  const m = montar();
  const com = (await m.pedir("/v1/auth/entrar", { corpo: ENTRAR })).headers.get("set-cookie") ?? "";
  assertMatch(com, /Max-Age=43200/);
  const sem = await m.pedir("/v1/auth/entrar", { corpo: { ...ENTRAR, manterConectado: false } });
  const cookie = sem.headers.get("set-cookie") ?? "";
  assert(!/Max-Age/.test(cookie), "cookie de sessão não leva Max-Age");
  assertMatch(cookie, /HttpOnly; Secure; SameSite=Strict/);
  assertEquals((await m.pedir("/v1/sessao", { cookie: cookieDe(sem) })).status, 200);
});

Deno.test("link de acesso: a resposta é a mesma exista a conta ou não, e o link volta para a tela de entrar", async () => {
  const m = montar();
  const a = await (await m.pedir("/v1/auth/link", { corpo: { email: ENTRAR.email } })).json();
  const b = await (await m.pedir("/v1/auth/link", { corpo: { email: "ninguem@exemplo.invalid", manterConectado: false } })).json();
  assertEquals(a, b);
  assertEquals(m.links.map((l) => l.voltarPara), ["https://portal.exemplo/entrar/link", "https://portal.exemplo/entrar/link/sessao"]);
});

Deno.test("link de acesso: o token vira sessão uma vez só", async () => {
  const m = montar();
  const r = await m.pedir("/v1/auth/link/usar", { corpo: { tokenHash: TOKEN_LINK } });
  assertEquals(await r.json(), { etapa: "PRONTO" });
  assertEquals((await m.pedir("/v1/sessao", { cookie: cookieDe(r) })).status, 200);
  assertEquals((await erro(await m.pedir("/v1/auth/link/usar", { corpo: { tokenHash: TOKEN_LINK } }))).codigo, "TOKEN_INVALID");
});

Deno.test("link de acesso: quem tem autenticador ainda passa pelo código", async () => {
  const m = montar({ comAutenticador: true });
  const r = await m.pedir("/v1/auth/link/usar", { corpo: { tokenHash: TOKEN_LINK } });
  assertEquals(await r.json(), { etapa: "CODIGO" });
  assertEquals((await erro(await m.pedir("/v1/sessao", { cookie: cookieDe(r) }))).codigo, "MFA_REQUIRED");
});

Deno.test("link de acesso: conta sem vínculo recebe a mesma recusa de link vencido", async () => {
  const m = montar();
  m.vinculos.clear();
  assertEquals((await erro(await m.pedir("/v1/auth/link/usar", { corpo: { tokenHash: TOKEN_LINK } }))).codigo, "TOKEN_INVALID");
});

Deno.test("nova senha pela tela: o link abre uma vez, fica 1 hora num cookie próprio e só serve para salvar a senha", async () => {
  const m = montar();
  const antiga = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  const aberto = await m.pedir("/v1/auth/redefinir/abrir", { corpo: { tokenHash: TOKEN_RECUPERACAO } });
  assertEquals(await aberto.json(), { email: ENTRAR.email });
  assertMatch(aberto.headers.get("set-cookie") ?? "", /^__Host-portal-link=v1\.[^;]+; Path=\/; Max-Age=3600; HttpOnly; Secure; SameSite=Strict$/);
  const link = cookieChamado(aberto, "__Host-portal-link")!;
  // O cookie do link não é sessão: não abre o Portal.
  assertEquals((await erro(await m.pedir("/v1/sessao", { cookie: link }))).codigo, "UNAUTHORIZED");
  // O mesmo link do e-mail não abre de novo.
  assertEquals((await erro(await m.pedir("/v1/auth/redefinir/abrir", { corpo: { tokenHash: TOKEN_RECUPERACAO } }))).codigo, "TOKEN_INVALID");

  const r = await m.pedir("/v1/auth/redefinir", { cookie: link, corpo: { novaSenha: "marfim-ponte-42" } });
  assertEquals(await r.json(), { ok: true });
  assertEquals(cookieChamado(r, "__Host-portal-link"), "__Host-portal-link=");
  assertEquals(m.senhasTrocadas, [ANA]);
  // Sai da conta nos outros aparelhos (decisão da Carol, 18/11).
  assertEquals((await erro(await m.pedir("/v1/sessao", { cookie: antiga }))).codigo, "UNAUTHORIZED");
  assertEquals((await erro(await m.pedir("/v1/auth/redefinir", { cookie: link, corpo: { novaSenha: "outra-senha-boa" } }))).codigo, "TOKEN_INVALID");
});

Deno.test("nova senha: sem link, ou com o link do convite, não troca", async () => {
  const m = montar();
  assertEquals((await erro(await m.pedir("/v1/auth/redefinir", { corpo: { novaSenha: "marfim-ponte-42" } }))).codigo, "TOKEN_INVALID");
  const convite = cookieChamado(await m.pedir("/v1/auth/criar-senha/abrir", { corpo: { tokenHash: TOKEN_CONVITE } }), "__Host-portal-link")!;
  assertEquals((await erro(await m.pedir("/v1/auth/redefinir", { cookie: convite, corpo: { novaSenha: "marfim-ponte-42" } }))).codigo, "TOKEN_INVALID");
  assertEquals(m.senhasTrocadas, []);
});

Deno.test("senha que aparece em lista de senhas vazadas é recusada antes do Auth", async () => {
  const m = montar({ vazadas: ["advocacia2024"] });
  const link = cookieChamado(await m.pedir("/v1/auth/redefinir/abrir", { corpo: { tokenHash: TOKEN_RECUPERACAO } }), "__Host-portal-link")!;
  assertEquals((await erro(await m.pedir("/v1/auth/redefinir", { cookie: link, corpo: { novaSenha: "advocacia2024" } }))).codigo, "PASSWORD_WEAK");
  assertEquals(m.senhasTrocadas, []);
  // O link continua valendo para tentar outra senha.
  assertEquals((await m.pedir("/v1/auth/redefinir", { cookie: link, corpo: { novaSenha: "marfim-ponte-42" } })).status, 200);
});

Deno.test("PT-20: convite mostra quem convidou, pede nome e Termos, e já entra no Portal", async () => {
  const m = montar();
  const aberto = await m.pedir("/v1/auth/criar-senha/abrir", { corpo: { tokenHash: TOKEN_CONVITE } });
  assertEquals(await aberto.json(), { email: ENTRAR.email, nome: "Ana", escritorio: "Aurora Advocacia", quem: "Ricardo Almeida", papel: "ESCRITORIO" });
  assertEquals(m.chamadas.find((c) => c.funcao === "dados_convite")?.args, { p_pessoa: ANA, p_sistema: "PORTAL" });
  const link = cookieChamado(aberto, "__Host-portal-link")!;

  const semAceite = await m.pedir("/v1/auth/criar-senha", { cookie: link, corpo: { novaSenha: "marfim-ponte-42", nome: "Ana Lima", aceiteTermos: false } });
  assertEquals(await erro(semAceite), { codigo: "VALIDATION_ERROR", detalhes: { campos: ["aceiteTermos"] } });

  const r = await m.pedir("/v1/auth/criar-senha", { cookie: link, corpo: { novaSenha: "marfim-ponte-42", nome: " Ana Lima ", aceiteTermos: true } });
  assertEquals(await r.json(), { etapa: "PRONTO" });
  assertEquals(m.chamadas.find((c) => c.funcao === "aceitar_convite")?.args, { p_pessoa: ANA, p_nome: "Ana Lima", p_sistema: "PORTAL" });
  assertEquals(cookieChamado(r, "__Host-portal-link"), "__Host-portal-link=");
  const sessao = cookieChamado(r, "__Host-portal")!;
  assertEquals((await m.pedir("/v1/sessao", { cookie: sessao })).status, 200);
});

Deno.test("escolha do escritório: a lista vem do banco, do último usado ao mais antigo, com o e-mail de quem entrou", async () => {
  const m = montar();
  const cookie = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  const r = await m.pedir("/v1/sessao/escolha", { cookie });
  assertEquals(await r.json(), {
    email: ENTRAR.email,
    escritorios: [
      { id: BELA_VISTA, nome: "Bela Vista Advogados", cidade: "Salvador", uf: "BA", ultimaEntrada: "2026-11-18T09:12:00-03:00" },
      { id: AURORA, nome: "Aurora Advocacia", cidade: null, uf: null, ultimaEntrada: null },
    ],
  });
  assertEquals(m.chamadas.find((c) => c.funcao === "escritorios_para_escolher")?.args, { p_pessoa: ANA });
  assertEquals((await erro(await m.pedir("/v1/sessao/escolha"))).codigo, "UNAUTHORIZED");
});

async function noEscritorio(m: ReturnType<typeof montar>) {
  const cookie = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  await m.pedir("/v1/sessao/escritorio", { metodo: "PUT", corpo: { escritorioId: AURORA }, cookie });
  return cookie;
}

Deno.test("PA-02: a equipe vem com o e-mail do Auth, e o escritório da sessão vai para o banco", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/equipe", { cookie });
  const corpo = await r.json();
  assertEquals(corpo.pessoas[0].email, "lara@aurora.adv.br");
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_equipe")?.args.p_escritorio, AURORA);
});

Deno.test("PA-02: quem não é sócio dono não convida, e a conta nem nasce no Auth", async () => {
  const m = montar({ naoDono: true });
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/equipe", { metodo: "POST", corpo: { nome: "Novo", email: "novo@aurora.adv.br", areas: [] }, cookie });
  assertEquals(r.status, 403);
  assertEquals(m.contas["novo@aurora.adv.br"], undefined);
  assert(!m.chamadas.some((c) => c.funcao === "portal_convidar"));
});

Deno.test("F0.14: nos 30 dias só de consulta, o convite não cria a conta no Auth", async () => {
  const m = montar({ soConsulta: true });
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/equipe", { metodo: "POST", corpo: { nome: "Novo", email: "novo@aurora.adv.br", areas: [] }, cookie });
  assertEquals(r.status, 403);
  assertEquals((await r.json()).erro.detalhes, { motivo: "CONTRATO_ENCERRADO" });
  assertEquals(m.contas["novo@aurora.adv.br"], undefined);
});

Deno.test("F0.14: a Equipe lista quem foi retirado, com a data em que a entrada some", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/equipe/retiradas", { cookie });
  const p = (await r.json()).pessoas[0];
  assertEquals(p.saida, { entradaApagaEm: "2027-02-16" });
  assert("email" in p);
});

Deno.test("PA-02: convidar cria a conta, manda o link do Portal e grava as áreas", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/equipe", { metodo: "POST", corpo: { nome: "Bia", email: "BIA@aurora.adv.br", areas: ["FINANCEIRO", "FINANCEIRO"] }, cookie });
  assertEquals(r.status, 201);
  assertEquals(m.enviados, [{ email: "bia@aurora.adv.br", voltarPara: "https://portal.exemplo/criar-senha" }]);
  const conv = m.chamadas.find((c) => c.funcao === "portal_convidar")!;
  assertEquals(conv.args.p_areas, ["FINANCEIRO"]);
  assertEquals(conv.args.p_escritorio, AURORA);
});

Deno.test("PA-02: área desconhecida não chega ao banco", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir(`/v1/escritorio/equipe/${VL_LARA}/areas`, { metodo: "PUT", corpo: { areas: ["RH"] }, cookie });
  assertEquals(r.status, 400);
  assert(!m.chamadas.some((c) => c.funcao === "portal_mudar_areas"));
});

Deno.test("PT-20: reenviar o convite manda o link de novo para o e-mail do Auth", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir(`/v1/escritorio/equipe/${VL_LARA}/reenviar`, { metodo: "POST", cookie });
  assertEquals(await r.json(), { enviado: true });
  assertEquals(m.enviados.at(-1)?.email, "lara@aurora.adv.br");
});

Deno.test("EX-10: retirar sem para quem passar volta o campo; com alguém, passa", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const sem = await m.pedir(`/v1/escritorio/equipe/${VL_LARA}/retirar`, { metodo: "POST", corpo: { versao: 1 }, cookie });
  assertEquals((await erro(sem)).detalhes?.campos, ["passarPara"]);
  const com = await m.pedir(`/v1/escritorio/equipe/${VL_LARA}/retirar`, { metodo: "POST", corpo: { versao: 1, passarPara: ANA }, cookie });
  assertEquals(await com.json(), { versao: 2, passouPara: ANA });
});

Deno.test("PA-02: histórico da equipe com nomes e paginação", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/equipe/historico?antes=10&limite=20", { cookie });
  const corpo = await r.json();
  assertEquals(corpo.eventos[0].passouPara, "Ana");
  const h = m.chamadas.find((c) => c.funcao === "portal_historico_equipe")!;
  assertEquals([h.args.p_antes, h.args.p_limite], [10, 20]);
});

Deno.test("PA-02: as áreas do domínio são as mesmas do banco", async () => {
  const { AREAS_PORTAL } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0140_portal_equipe.sql", import.meta.url));
  const doBanco = /area in \(([^)]+)\)/.exec(sql)?.[1]?.match(/'([A-Z]+)'/g)?.map((s) => s.slice(1, -1));
  assertEquals(doBanco, Object.keys(AREAS_PORTAL));
});

// ------------------------------------------------------------------- Clientes (AP-01, AP-02)

const HELENA = {
  tipo: "PF", nome: " Helena Prado ", documento: "529.982.247-25", cep: "01310-100", estadoCivil: "CASADO", rg: "",
  contatos: [{ nome: "Helena", telefone: "(11) 98888-7777", principal: true }, { nome: "Bia", papel: "filha", email: "BIA@exemplo.invalid", principal: false }],
};

Deno.test("AP-01: cadastrar confere os dados e manda ao banco com os nomes dele, no escritório da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/clientes", { metodo: "POST", corpo: { ...HELENA, escritorioId: BELA_VISTA }, cookie });
  assertEquals(r.status, 201);
  const ch = m.chamadas.find((c) => c.funcao === "portal_cliente_cadastrar")!;
  assertEquals(ch.args.p_escritorio, AURORA);
  const d = ch.args.p_dados as Record<string, unknown>;
  assertEquals([d.nome, d.documento, d.cep, d.estado_civil, d.rg, d.escritorio_id], ["Helena Prado", "52998224725", "01310100", "CASADO", null, undefined]);
  assertEquals((d.contatos as { telefone: string; email: string }[]).map((x) => x.telefone ?? x.email), ["+5511988887777", "bia@exemplo.invalid"]);
});

Deno.test("AP-01: CPF errado, contato sem telefone nem e-mail ou sem principal não chegam ao banco", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  for (const [corpo, campo] of [
    [{ ...HELENA, documento: "529.982.247-24" }, "documento"],
    [{ ...HELENA, contatos: [{ nome: "Helena", principal: true }] }, "contatos"],
    [{ ...HELENA, contatos: [{ nome: "Helena", telefone: "11988887777", principal: false }] }, "contatos"],
    [{ ...HELENA, tipo: "PJ", documento: "11222333000180" }, "documento"],
  ] as const) {
    const r = await m.pedir("/v1/escritorio/clientes", { metodo: "POST", corpo, cookie });
    assertEquals((await erro(r)).detalhes?.campos, [campo]);
  }
  assert(!m.chamadas.some((c) => c.funcao === "portal_cliente_cadastrar"));
});

Deno.test("AP-01: a busca vai ao banco com o termo, e o filtro errado volta como campo", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/clientes?q=Prado&vencidos=1", { cookie });
  assertEquals((await r.json()).clientes[0].nome, "Helena Prado");
  const ch = m.chamadas.find((c) => c.funcao === "portal_clientes")!;
  assertEquals([ch.args.p_termo, ch.args.p_situacao, ch.args.p_vencidos], ["Prado", "ATIVO", true]);
  const e = await m.pedir("/v1/escritorio/clientes?situacao=APAGADO", { cookie });
  assertEquals((await erro(e)).detalhes?.campos, ["situacao"]);
});

Deno.test("AP-01: a ficha chega com os nomes da API; id fora do formato é não encontrado", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const f = await (await m.pedir(`/v1/escritorio/clientes/${CLIENTE}`, { cookie })).json();
  assertEquals([f.estadoCivil, f.repNome, f.criadoEm], ["CASADO", null, "2026-11-01"]);
  assertEquals((await m.pedir("/v1/escritorio/clientes/abc", { cookie })).status, 404);
});

Deno.test("PT-19: editar leva a versão lida; inativar pede motivo", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}`, { metodo: "PUT", corpo: { ...HELENA, versao: 2 }, cookie });
  assertEquals(await r.json(), { id: CLIENTE, versao: 3 });
  const sem = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/inativar`, { metodo: "POST", corpo: { versao: 3, motivo: " " }, cookie });
  assertEquals((await erro(sem)).detalhes?.campos, ["motivo"]);
  const com = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/inativar`, { metodo: "POST", corpo: { versao: 3, motivo: "Desistiu" }, cookie });
  assertEquals(await com.json(), { versao: 3 });
  const re = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/reativar`, { metodo: "POST", corpo: { versao: 3 }, cookie });
  assertEquals(await re.json(), { versao: 4 });
});

Deno.test("AP-02: sem a área Comercial os atendimentos são recusados com o motivo", async () => {
  const m = montar({ semComercial: true });
  const cookie = await noEscritorio(m);
  const r = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/atendimentos`, { cookie });
  assertEquals(r.status, 403);
  assertEquals((await erro(r)).detalhes?.motivo, "AREA_NAO_LIBERADA");
});

Deno.test("AP-06: o próximo contato vai inteiro ou não vai", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const meio = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/atendimentos`, { metodo: "POST", corpo: { canal: "WHATSAPP", resumo: "Oi", proxEm: "2026-11-20" }, cookie });
  assertEquals((await erro(meio)).detalhes?.campos, ["proxResponsavel", "proxOque"]);
  const ok = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/atendimentos`, {
    metodo: "POST", corpo: { canal: "WHATSAPP", resumo: "Oi", proxEm: "2026-11-20", proxResponsavel: ANA, proxOque: "Ligar" }, cookie,
  });
  assertEquals(ok.status, 201);
});

Deno.test("AP-01: os valores do domínio são os mesmos do banco", async () => {
  const { ORIGENS, CANAIS, ESTADOS_CIVIS } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0160_portal_clientes.sql", import.meta.url));
  const lista = (re: RegExp) => re.exec(sql)?.[1]?.match(/'([A-Z_]+)'/g)?.map((s) => s.slice(1, -1));
  assertEquals(lista(/origem\s+text check \(origem in \(([^)]+)\)/), Object.keys(ORIGENS));
  assertEquals(lista(/canal\s+text not null check \(canal in \(([^)]+)\)/), Object.keys(CANAIS));
  assertEquals(lista(/estado_civil\s+text check \(estado_civil in \(([^)]+)\)/), Object.keys(ESTADOS_CIVIS));
});

Deno.test("F1.14: o Início pede os contatos da pessoa; \"Da equipe\" só para a dona", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/inicio/contatos", { cookie });
  assertEquals((await r.json()).de, "MEUS");
  const ch = m.chamadas.find((c) => c.funcao === "portal_inicio_contatos")!;
  assertEquals([ch.args.p_de, ch.args.p_limite], ["MEUS", 5]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/inicio/contatos?de=TODOS", { cookie }))).detalhes?.campos, ["de"]);
  const n = montar({ naoDono: true });
  const e = await n.pedir("/v1/escritorio/inicio/contatos?de=EQUIPE", { cookie: await noEscritorio(n) });
  assertEquals([e.status, (await erro(e)).detalhes?.motivo], [403, "SO_SOCIO_DONO"]);
});

Deno.test("F1.15: o pedido de exclusão confere data, canal e quem pediu", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const ruim = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/exclusao/pedido`, { metodo: "POST", corpo: { pedidoEm: "18/11", canal: "FAX" }, cookie });
  assertEquals((await erro(ruim)).detalhes?.campos, ["pedidoEm", "canal"]);
  const ok = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/exclusao/pedido`, {
    metodo: "POST", corpo: { pedidoEm: "2026-11-18", canal: "WHATSAPP" }, cookie,
  });
  assertEquals(ok.status, 201);
  const sem = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/exclusao/recusar`, { metodo: "POST", corpo: { motivo: " " }, cookie });
  assertEquals((await erro(sem)).detalhes?.campos, ["motivo"]);
});

Deno.test("F1.15: excluir pede a conferência e o nome; quem não é a dona é recusado com o motivo", async () => {
  const corpo = { pedidoEm: "2026-11-18", canal: "TELEFONE", quemPediu: "TITULAR", versao: 2, nomeConfirmado: "Helena Prado" };
  const m = montar();
  const cookie = await noEscritorio(m);
  const sem = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/exclusao`, { metodo: "POST", corpo, cookie });
  assertEquals((await erro(sem)).detalhes?.campos, ["conferido"]);
  const ok = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/exclusao`, { metodo: "POST", corpo: { ...corpo, conferido: true }, cookie });
  assertEquals((await ok.json()).protocolo, "EXC-2026-0001");
  const ch = m.chamadas.find((c) => c.funcao === "portal_cliente_excluir_dados")!;
  assertEquals([ch.args.p_versao, (ch.args.p_dados as Record<string, unknown>).versao], [2, undefined]);
  const n = montar({ naoDono: true });
  const e = await n.pedir(`/v1/escritorio/clientes/${CLIENTE}/exclusao`, { metodo: "POST", corpo: { ...corpo, conferido: true }, cookie: await noEscritorio(n) });
  assertEquals((await erro(e)).detalhes?.motivo, "SO_SOCIO_DONO");
});

Deno.test("F1.15: os canais do pedido no domínio são os mesmos do banco", async () => {
  const { CANAIS_PEDIDO } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0170_clientes_pendencias.sql", import.meta.url));
  const lista = /canal\s+text not null check \(canal in \(([^)]+)\)/.exec(sql)?.[1]?.match(/'([A-Z_]+)'/g)?.map((s) => s.slice(1, -1));
  assertEquals(lista, Object.keys(CANAIS_PEDIDO));
});

Deno.test("EX-06: a agenda pede um período válido e a pessoa do filtro; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir(`/v1/escritorio/agenda?de=2026-11-16&ate=2026-11-22&pessoa=${LARA.toUpperCase()}`, { cookie });
  assertEquals(r.status, 200);
  const ch = m.chamadas.find((c) => c.funcao === "portal_agenda")!;
  assertEquals([ch.args.p_escritorio, ch.args.p_de, ch.args.p_ate, ch.args.p_de_quem], [AURORA, "2026-11-16", "2026-11-22", LARA]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/agenda?de=16/11&ate=2026-11-22", { cookie }))).detalhes?.campos, ["de"]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/agenda?de=2026-11-16&ate=2026-11-22&pessoa=x", { cookie }))).detalhes?.campos, ["pessoa"]);
});

Deno.test("EX-06, PT-03: marcar, remarcar com motivo e cancelar com motivo", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const dados = {
    tipo: "AUDIENCIA", titulo: "Conciliação", inicio: "2026-11-19T16:00:00-03:00", fim: "2026-11-19T17:00:00-03:00",
    modalidade: "VIRTUAL", linkSala: "https://sala.exemplo/1", responsavelId: ANA, lembrete: true,
  };
  const novo = await m.pedir("/v1/escritorio/compromissos", { corpo: dados, cookie });
  assertEquals(novo.status, 201);
  const ch = m.chamadas.find((c) => c.funcao === "portal_compromisso_marcar")!;
  assertEquals((ch.args.p_dados as Record<string, unknown>).tambemVai, []);
  const sem = await m.pedir(`/v1/escritorio/compromissos/${CLIENTE}`, { metodo: "PUT", corpo: { ...dados, versao: 1 }, cookie });
  assertEquals((await erro(sem)).detalhes?.campos, ["motivo"]);
  const com = await m.pedir(`/v1/escritorio/compromissos/${CLIENTE}`, { metodo: "PUT", corpo: { ...dados, versao: 1, motivo: "redesignada" }, cookie });
  assertEquals((await com.json()).versao, 2);
  const ed = m.chamadas.findLast((c) => c.funcao === "portal_compromisso_editar")!;
  assertEquals([(ed.args.p_dados as Record<string, unknown>).versao, ed.args.p_motivo], [undefined, "redesignada"]);
  const vazio = await m.pedir(`/v1/escritorio/compromissos/${CLIENTE}/cancelar`, { corpo: { versao: 2, motivo: " " }, cookie });
  assertEquals((await erro(vazio)).detalhes?.campos, ["motivo"]);
  const ok = await m.pedir(`/v1/escritorio/compromissos/${CLIENTE}/cancelar`, { corpo: { versao: 2, motivo: "acordo", avisar: true }, cookie });
  assertEquals((await ok.json()).versao, 3);
  assertEquals((await m.pedir("/v1/escritorio/compromissos/nao-e-id", { cookie })).status, 404);
});

Deno.test("EX-06: os tipos de compromisso no domínio são os mesmos do banco", async () => {
  const { TIPOS_COMPROMISSO, MODALIDADES } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0180_portal_agenda.sql", import.meta.url));
  const lista = (re: RegExp) => re.exec(sql)?.[1]?.match(/'([A-Z_]+)'/g)?.map((s) => s.slice(1, -1));
  assertEquals(lista(/tipo\s+text not null check \(tipo in \(([^)]+)\)/), Object.keys(TIPOS_COMPROMISSO));
  assertEquals(lista(/modalidade\s+text not null check \(modalidade in \(([^)]+)\)/), Object.keys(MODALIDADES));
});

Deno.test("AP-05, IN-01: proposta com condições, marcar como enviada e registrar a resposta; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const dados = {
    clienteId: CLIENTE, servico: "Divórcio consensual", escopo: "Petição e partilha.", responsavelId: ANA, validaAte: "2026-11-30",
    condicoes: [{ tipo: "PARCELADO", total: 400000, parcelas: 4, primeiro: "2026-12-15" }], retorno: { em: "2026-11-25", responsavelId: ANA },
  };
  const novo = await m.pedir("/v1/escritorio/propostas", { corpo: dados, cookie });
  assertEquals(novo.status, 201);
  const ch = m.chamadas.find((c) => c.funcao === "portal_proposta_criar")!;
  assertEquals([ch.args.p_escritorio, (ch.args.p_dados as { condicoes: unknown[] }).condicoes, (ch.args.p_dados as { rascunho: boolean }).rascunho],
    [AURORA, dados.condicoes, false]);
  assertEquals((await (await m.pedir(`/v1/escritorio/propostas/${CLIENTE}/enviada`, { corpo: { versao: 2 }, cookie })).json()).versao, 3);
  const r = await m.pedir(`/v1/escritorio/propostas/${CLIENTE}/resposta`, { corpo: { versao: 3, resposta: "RECUSOU", em: "2026-11-18", canal: "WHATSAPP", motivo: "VALOR_ALTO" }, cookie });
  assertEquals((await r.json()).situacao, "RECUSADA");
  const rs = m.chamadas.find((c) => c.funcao === "portal_proposta_resposta")!;
  assertEquals([rs.args.p_versao, (rs.args.p_dados as Record<string, unknown>).versao], [3, undefined]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/propostas?mostrar=todas", { cookie }))).detalhes?.campos, ["mostrar"]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/comercial/funil?periodo=7", { cookie }))).detalhes?.campos, ["periodo"]);
  assertEquals((await (await m.pedir("/v1/escritorio/comercial/funil?periodo=12", { cookie })).json()).periodo, "12");
  assertEquals((await erro(await m.pedir("/v1/escritorio/comercial/retornos?responsavel=x", { cookie }))).detalhes?.campos, ["responsavel"]);
});

Deno.test("AP-05, CH-06: situações, motivos e tipos de honorário no domínio são os mesmos do banco", async () => {
  const { MOTIVOS_RECUSA, TIPOS_HONORARIO } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0190_portal_comercial.sql", import.meta.url));
  const lista = (re: RegExp) => re.exec(sql)?.[1]?.match(/'([A-Z_]+)'/g)?.map((s) => s.slice(1, -1));
  assertEquals(lista(/motivo_recusa\s+text check \(motivo_recusa in \(([^)]+)\)/), Object.keys(MOTIVOS_RECUSA));
  assertEquals(lista(/tipo\s+text not null check \(tipo in \(([^)]+)\)/), Object.keys(TIPOS_HONORARIO));
});

Deno.test("CH-01, CH-04, IN-01: criar o contrato da proposta, registrar a assinatura, mudar com motivo e informar a base; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const dados = {
    clienteId: CLIENTE, propostaId: CLIENTE, objeto: "Aposentadoria por idade", responsavelId: ANA, advogados: [ANA],
    condicoes: [{ tipo: "PARCELADO", total: 200000, parcelas: 3, primeiro: "2026-12-10" }],
  };
  const novo = await m.pedir("/v1/escritorio/contratos", { corpo: dados, cookie });
  assertEquals(novo.status, 201);
  const ch = m.chamadas.find((c) => c.funcao === "portal_contrato_criar")!;
  assertEquals([ch.args.p_escritorio, (ch.args.p_dados as { advogados: string[] }).advogados], [AURORA, [ANA]]);
  const a = await (await m.pedir(`/v1/escritorio/contratos/${CLIENTE}/assinatura`, { corpo: { versao: 1, assinadoEm: "2026-11-18" }, cookie })).json();
  assertEquals([a.versao, a.recebimentos, a.em], [2, 3, "2026-11-18"]);
  const sem = await erro(await m.pedir(`/v1/escritorio/contratos/${CLIENTE}`, { metodo: "PUT", corpo: { versao: 2, ...dados }, cookie }));
  assertEquals(sem.detalhes?.campos, ["motivo"]);
  const ed = m.chamadas.find((c) => c.funcao === "portal_contrato_condicoes")!;
  assertEquals([ed.args.p_versao, (ed.args.p_dados as Record<string, unknown>).versao, (ed.args.p_dados as Record<string, unknown>).clienteId], [2, undefined, undefined]);
  const b = await (await m.pedir(`/v1/escritorio/recebimentos/${CLIENTE}/base`, { corpo: { valor: 211800, fonte: "EXTRATO", vencimento: "2026-12-15" }, cookie })).json();
  assertEquals(b.valor, 63540);
  assertEquals((await erro(await m.pedir("/v1/escritorio/contratos?mostrar=todos", { cookie }))).detalhes?.campos, ["mostrar"]);
  assertEquals((await (await m.pedir("/v1/escritorio/contratos?mostrar=base", { cookie })).json()).mostrar, "BASE");
  assertEquals((await m.pedir("/v1/escritorio/contratos/nao-e-id", { cookie })).status, 404);
});

Deno.test("CH-01: situações do contrato e fontes da base no domínio são as mesmas do banco", async () => {
  const { SITUACOES_CONTRATO, FONTES_BASE } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0200_portal_contratos.sql", import.meta.url));
  const lista = (re: RegExp) => re.exec(sql)?.[1]?.match(/'([A-Z_]+)'/g)?.map((s) => s.slice(1, -1));
  assertEquals(lista(/fonte\s+text not null check \(fonte in \(([^)]+)\)/), Object.keys(FONTES_BASE));
  assertEquals([...new Set(lista(/transicoes_permitidas \(tabela, de, para\) values\s+(\('contratos'[\s\S]*?);/)?.filter((x) => x !== "contratos"))].sort(),
    Object.keys(SITUACOES_CONTRATO).sort());
});

Deno.test("FI-01 a FI-04, FI-14: A receber, ficha de parcelas, registrar recebimento e anotar cobrança; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const l = await (await m.pedir(`/v1/escritorio/financeiro/receber?mostrar=vencidas&forma=pix&responsavel=${ANA.toUpperCase()}`, { cookie })).json();
  assertEquals([l.mostrar, l.forma, l.responsavel], ["VENCIDAS", "PIX", ANA.toLowerCase()]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/financeiro/receber?mostrar=tudo", { cookie }))).detalhes?.campos, ["mostrar"]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/financeiro/receber?forma=ouro", { cookie }))).detalhes?.campos, ["forma"]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/financeiro/receber?responsavel=x", { cookie }))).detalhes?.campos, ["responsavel"]);
  assertEquals((await (await m.pedir(`/v1/escritorio/financeiro/contratos/${CLIENTE}`, { cookie })).json()).id, CLIENTE);
  assertEquals((await m.pedir("/v1/escritorio/financeiro/contratos/nao-e-id", { cookie })).status, 404);
  const r = await m.pedir(`/v1/escritorio/financeiro/parcelas/${CLIENTE}/recebimentos`, { corpo: { valor: 85000, recebidoEm: "2026-11-18", forma: "PIX", recibo: true }, cookie });
  assertEquals([r.status, (await r.json()).recibo.numero], [201, 1]);
  const ch = m.chamadas.find((c) => c.funcao === "portal_financeiro_receber_registrar")!;
  assertEquals([ch.args.p_escritorio, ch.args.p_parcela], [AURORA, CLIENTE]);
  const acima = await erro(await m.pedir(`/v1/escritorio/financeiro/parcelas/${CLIENTE}/recebimentos`, { corpo: { valor: 90000, recebidoEm: "2026-11-18", forma: "PIX" }, cookie }));
  assertEquals([acima.detalhes?.motivo, acima.detalhes?.falta], ["VALOR_ACIMA_DO_SALDO", 85000]);
  const c = await m.pedir(`/v1/escritorio/financeiro/parcelas/${CLIENTE}/cobranca`, {
    corpo: { tipo: "LIGACAO", motivo: "Não atende", proxData: "2026-11-19", proxOque: "Ligar de novo", proxResponsavelId: ANA }, cookie });
  assertEquals(c.status, 201);
});

Deno.test("FI-17: as formas de pagamento do domínio são as mesmas do banco", async () => {
  const { FORMAS_PAGAMENTO } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0220_portal_financeiro_receber.sql", import.meta.url));
  const formas = /select p in \(([^)]+)\)/.exec(sql)?.[1]?.match(/'([A-Z_]+)'/g)?.map((x) => x.slice(1, -1));
  assertEquals(formas, Object.keys(FORMAS_PAGAMENTO));
});

Deno.test("FI-01, FI-07, FI-13: A pagar, lançar conta, marcar paga e reembolso; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  assertEquals((await (await m.pedir("/v1/escritorio/financeiro/pagar?mostrar=mes", { cookie })).json()).mostrar, "MES");
  assertEquals((await (await m.pedir("/v1/escritorio/financeiro/pagar", { cookie })).json()).mostrar, "SEMANA");
  assertEquals((await erro(await m.pedir("/v1/escritorio/financeiro/pagar?mostrar=tudo", { cookie }))).detalhes?.campos, ["mostrar"]);
  const l = await m.pedir("/v1/escritorio/financeiro/contas", {
    corpo: { descricao: "Custas recursais", categoria: "CUSTAS", valor: 48500, vencimento: "2026-11-19", adiantada: true, clienteId: CLIENTE, reembolsoComo: "LEVANTAMENTO" }, cookie });
  assertEquals(l.status, 201);
  const ch = m.chamadas.find((c) => c.funcao === "portal_financeiro_conta_lancar")!;
  assertEquals([ch.args.p_escritorio, (ch.args.p_dados as { repete: boolean }).repete], [AURORA, false]);
  assertEquals((await m.pedir(`/v1/escritorio/financeiro/contas/${CLIENTE}/paga`, { corpo: { valor: 48500, pagaEm: "2026-11-18" }, cookie })).status, 200);
  const fut = await erro(await m.pedir(`/v1/escritorio/financeiro/contas/${CLIENTE}/paga`, { corpo: { valor: 48500, pagaEm: "2026-11-20" }, cookie }));
  assertEquals(fut.detalhes?.motivo, "DATA_NO_FUTURO");
  assertEquals((await (await m.pedir(`/v1/escritorio/financeiro/contas/${CLIENTE}/reembolso`, { corpo: { reembolsadoEm: "2026-11-18" }, cookie })).json()).reembolsadoEm, "2026-11-18");
  assertEquals((await m.pedir("/v1/escritorio/financeiro/contas/nao-e-id/paga", { corpo: {}, cookie })).status, 404);
});

Deno.test("FI-20, FI-07: categorias de saída e formas de reembolso do domínio são as mesmas do banco", async () => {
  const { CATEGORIAS_SAIDA, REEMBOLSO_COMO } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0230_portal_financeiro_pagar.sql", import.meta.url));
  const lista = (re: RegExp) => re.exec(sql)?.[1]?.match(/'([A-Z_]+)'/g)?.map((x) => x.slice(1, -1));
  assertEquals(lista(/categoria_saida_valida\(p text\)[\s\S]*?select p in \(([^)]+)\)/), Object.keys(CATEGORIAS_SAIDA));
  assertEquals(lista(/reembolso_como\s+text check \(reembolso_como in \(([^)]+)\)/), Object.keys(REEMBOLSO_COMO));
});
