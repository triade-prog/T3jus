// F0.6 e F0.3 no Portal do advogado: quem tem vínculo entra; o escritório vem da sessão.
import { assert, assertEquals, assertMatch } from "@std/assert";
import { criarApiPortal } from "./app.ts";
import { authFalso, bancoFalso, CODIGO_CERTO, cookieChamado, cookieDe, erro, erroBanco, limitesFalsos, pedido, TOKEN_CONVITE, TOKEN_LINK, TOKEN_RECUPERACAO } from "../_shared/teste_util.ts";

const ANA = "2d9e5b2a-7f3c-4e4d-9a0b-3c4d5e6f7a8b";
const AURORA = "3e0f6c3b-8a4d-4f5e-8b1c-4d5e6f7a8b9c";
const BELA_VISTA = "4f1a7d4c-9b5e-4a6f-9c2d-5e6f7a8b9c0d";
const ENTRAR = { email: "ana@exemplo.invalid", senha: "senha-da-socia" };

function montar(opcoes: { comAutenticador?: boolean; vazadas?: string[] } = {}) {
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
    ...limitesFalsos({ login: 5, autenticador: 10, recuperacao: 3 }),
  });
  const app = criarApiPortal("segredo-de-repasse-de-teste", {
    banco: db.banco, auth: falso.auth, urlApp: "https://portal.exemplo",
    senhaVazada: (senha) => Promise.resolve((opcoes.vazadas ?? []).includes(senha)),
  });
  return { pedir: pedido(app, "api-portal"), vinculos, ...falso, ...db };
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
  assertEquals(await r.json(), { id: AURORA, nome: "Aurora Advocacia", funcoes: ["SOCIO"] });
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
