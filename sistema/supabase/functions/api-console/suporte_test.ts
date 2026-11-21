// Suporte de acesso no Console (F1.3, PT-23): o link vai só para o e-mail cadastrado, toda
// ação pede motivo e o banco decide quem pode ver e agir (PT-24).
import { assertEquals } from "@std/assert";
import { criarApiConsole } from "./app.ts";
import type { MensagemEmail } from "../_shared/email.ts";
import { adminFalso, arquivosFalsos, authFalso, bancoFalso, CODIGO_CERTO, cookieDe, erro, erroBanco, limitesFalsos, pedido } from "../_shared/teste_util.ts";

const CAROLINA = "0b7c3f0e-5d1a-4c2b-9e8f-1a2b3c4d5e6f";
const MARINA = "3a4b5c6d-7e8f-4a0b-9c1d-2e3f4a5b6c7d";
const DIEGO = "4b5c6d7e-8f9a-4b1c-8d2e-3f4a5b6c7d8e";
const ENTRAR = { email: "carol@t3jus.exemplo", senha: "senha-forte-da-equipe" };
const EMAIL_MARINA = "marina@ribeiromatos.adv.br";

function ficha(id: string, extra: Record<string, unknown> = {}) {
  return {
    id, nome: id === MARINA ? "Marina Ribeiro" : "Diego Almeida", email: null,
    senhaCriadaEm: id === MARINA ? "2026-11-04T13:00:00Z" : null,
    escritorios: [{ id: "e1", nome: "Ribeiro & Matos", papel: id === MARINA ? "SOCIO" : "EQUIPE", conviteEnviadoEm: "2026-11-18T18:00:00Z", telefone: "(11) 3256-4410" }],
    podeAgir: true, aparelhos: 2, ...extra,
  };
}

function montar(opcoes: { podeAgir?: boolean; handlers?: Record<string, (a: Record<string, unknown>) => unknown>; emailFalha?: boolean } = {}) {
  const emails: MensagemEmail[] = [];
  const falso = authFalso([{ id: CAROLINA, email: ENTRAR.email, senha: ENTRAR.senha }]);
  const convites = adminFalso({ [EMAIL_MARINA]: MARINA, "diego@ribeiromatos.adv.br": DIEGO }, new Set(), new Set([MARINA]));
  const db = bancoFalso({
    acesso_console: () => true,
    registrar_acesso: () => 1,
    ...limitesFalsos({ login: 5, autenticador: 10, recuperacao: 3, convite: 5 }),
    console_suporte_buscar: (a) => (String(a.p_termo).includes("mar") ? [ficha(MARINA)] : []),
    console_suporte_pessoa: (a) => {
      if (a.p_alvo !== MARINA && a.p_alvo !== DIEGO) erroBanco("TC404");
      return ficha(String(a.p_alvo), { podeAgir: opcoes.podeAgir ?? true });
    },
    console_suporte_historico: () => [{ ocorrido_em: "2026-11-18T18:20:00Z", autor_id: CAROLINA, autor_nome: "Carol", acao: "suporte.desconectou", dados: { motivo: "Trocou de celular", aparelhos: 2 } }],
    console_suporte_registrar: () => 1,
    console_suporte_desconectar: () => 2,
    ...opcoes.handlers,
  });
  const app = criarApiConsole("segredo-de-repasse-de-teste", {
    banco: db.banco, auth: falso.auth, admin: convites.admin, urlApp: "https://console.exemplo", urlPortal: "https://portal.exemplo", arquivos: arquivosFalsos().arquivos,
    emails: { enviar: (m) => (opcoes.emailFalha ? Promise.reject(new Error("Resend respondeu 500")) : (emails.push(m), Promise.resolve())) },
  });
  return { pedir: pedido(app, "api-console"), emails, ...falso, ...db, ...convites };
}

async function entrar(m: ReturnType<typeof montar>): Promise<string> {
  const aal1 = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  const { factorId } = await (await m.pedir("/v1/auth/autenticador/cadastrar", { corpo: {}, cookie: aal1 })).json();
  return cookieDe(await m.pedir("/v1/auth/autenticador/verificar", { corpo: { codigo: CODIGO_CERTO, factorId }, cookie: aal1 }));
}

const chamou = (m: ReturnType<typeof montar>, f: string) => m.chamadas.filter((c) => c.funcao === f);

Deno.test("PT-23: nenhuma rota do suporte responde sem a sessão completa", async () => {
  const m = montar();
  for (const rota of ["/v1/suporte/pessoas?q=marina", `/v1/suporte/pessoas/${MARINA}`, `/v1/suporte/pessoas/${MARINA}/historico`]) {
    assertEquals((await erro(await m.pedir(rota))).codigo, "UNAUTHORIZED", rota);
  }
  assertEquals((await erro(await m.pedir(`/v1/suporte/pessoas/${MARINA}/desconectar`, { corpo: { motivo: "x" } }))).codigo, "UNAUTHORIZED");
  assertEquals(m.chamadas.filter((c) => c.funcao.startsWith("console_suporte")).length, 0);
});

Deno.test("PT-24: a busca vai ao banco com quem pergunta e pede ao menos 2 letras", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const r = await m.pedir("/v1/suporte/pessoas?q=%20marina%20", { cookie });
  assertEquals((await r.json()).pessoas.map((p: { nome: string }) => p.nome), ["Marina Ribeiro"]);
  assertEquals(chamou(m, "console_suporte_buscar")[0]!.args, { p_pessoa: CAROLINA, p_termo: "marina" });
  assertEquals(await erro(await m.pedir("/v1/suporte/pessoas?q=a", { cookie })), { codigo: "VALIDATION_ERROR", detalhes: { campos: ["q"] } });
});

Deno.test("ficha de acesso: o e-mail, a entrada e o autenticador vêm do Auth", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const f = await (await m.pedir(`/v1/suporte/pessoas/${MARINA}`, { cookie })).json();
  assertEquals([f.email, f.emailConfirmado, f.ultimaEntrada, f.autenticadorDesde, f.aparelhos], [EMAIL_MARINA, true, "2026-11-18T12:40:00Z", "2026-11-04T13:00:00Z", 2]);
  const fora = await m.pedir(`/v1/suporte/pessoas/9f0a1b2c-3d4e-4f50-8a6b-7c8d9e0f1a2b`, { cookie });
  assertEquals((await erro(fora)).codigo, "NOT_FOUND");
  assertEquals((await erro(await m.pedir("/v1/suporte/pessoas/nao-e-id", { cookie }))).codigo, "NOT_FOUND");
});

Deno.test("PT-23: o link de nova senha vai só para o e-mail cadastrado e a resposta mostra o e-mail mascarado", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const r = await m.pedir(`/v1/suporte/pessoas/${MARINA}/link-senha`, { corpo: { motivo: "Esqueceu a senha", email: "outro@golpe.exemplo" }, cookie });
  assertEquals(await r.json(), { email: "ma***@ribeiromatos.adv.br" });
  assertEquals(m.recuperacoes, [EMAIL_MARINA]);
  assertEquals(chamou(m, "console_suporte_registrar")[0]!.args, { p_pessoa: CAROLINA, p_alvo: MARINA, p_acao: "suporte.link_senha", p_motivo: "Esqueceu a senha" });
});

Deno.test("sem motivo, nada sai e nada é registrado", async () => {
  const m = montar();
  const cookie = await entrar(m);
  for (const acao of ["link-senha", "desconectar", "reenviar-convite"]) {
    const r = await m.pedir(`/v1/suporte/pessoas/${MARINA}/${acao}`, { corpo: { motivo: "   " }, cookie });
    assertEquals(await erro(r), { codigo: "VALIDATION_ERROR", detalhes: { campos: ["motivo"] } }, acao);
  }
  assertEquals(m.recuperacoes, []);
  assertEquals(chamou(m, "console_suporte_registrar").length + chamou(m, "console_suporte_desconectar").length, 0);
});

Deno.test("link de nova senha: o limite de 3 por hora é o mesmo da recuperação da própria pessoa", async () => {
  const m = montar();
  const cookie = await entrar(m);
  for (let i = 0; i < 3; i++) assertEquals((await m.pedir(`/v1/suporte/pessoas/${MARINA}/link-senha`, { corpo: { motivo: "Pediu" }, cookie })).status, 200);
  assertEquals((await erro(await m.pedir(`/v1/suporte/pessoas/${MARINA}/link-senha`, { corpo: { motivo: "Pediu" }, cookie }))).codigo, "RATE_LIMITED");
  assertEquals(m.recuperacoes.length, 3);
  assertEquals(chamou(m, "console_suporte_registrar").length, 3);
});

Deno.test("quem só pode ver não age", async () => {
  const m = montar({ podeAgir: false });
  const cookie = await entrar(m);
  assertEquals((await erro(await m.pedir(`/v1/suporte/pessoas/${MARINA}/link-senha`, { corpo: { motivo: "Pediu" }, cookie }))).codigo, "FORBIDDEN");
  assertEquals(m.recuperacoes, []);
});

Deno.test("desconectar: o banco registra e encerra as sessões", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const r = await m.pedir(`/v1/suporte/pessoas/${MARINA}/desconectar`, { corpo: { motivo: "Trocou de celular" }, cookie });
  assertEquals(await r.json(), { aparelhos: 2 });
  assertEquals(chamou(m, "console_suporte_desconectar")[0]!.args, { p_pessoa: CAROLINA, p_alvo: MARINA, p_motivo: "Trocou de celular" });
});

Deno.test("tirar o autenticador exige conferir a identidade, tira no Auth e desconecta", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const sem = await m.pedir(`/v1/suporte/pessoas/${MARINA}/tirar-autenticador`, { corpo: { motivo: "Perdeu o celular" }, cookie });
  assertEquals(await erro(sem), { codigo: "VALIDATION_ERROR", detalhes: { campos: ["identidadeConferida"] } });
  assertEquals(m.removidos, []);
  const r = await m.pedir(`/v1/suporte/pessoas/${MARINA}/tirar-autenticador`, { corpo: { motivo: "Perdeu o celular", identidadeConferida: true }, cookie });
  assertEquals(await r.json(), { aparelhos: 2, avisoEnviado: true });
  assertEquals(m.removidos, [MARINA]);
  // F1.12: a própria pessoa recebe o aviso no e-mail cadastrado.
  assertEquals(m.emails.map((e) => [e.para, e.assunto]), [[EMAIL_MARINA, "O autenticador da sua conta no T3jus foi tirado"]]);
  assertEquals(m.emails[0]!.texto.includes("Se não foi você que pediu, fale com o escritório agora."), true);
  assertEquals(m.emails[0]!.html.includes("Olá, Marina."), true);
  assertEquals(chamou(m, "console_suporte_desconectar")[0]!.args.p_tirar_autenticador, true);
  // Sem autenticador, não há o que tirar.
  const de_novo = await m.pedir(`/v1/suporte/pessoas/${MARINA}/tirar-autenticador`, { corpo: { motivo: "De novo", identidadeConferida: true }, cookie });
  assertEquals(await erro(de_novo), { codigo: "VALIDATION_ERROR", detalhes: { motivo: "SEM_AUTENTICADOR" } });
});

Deno.test("reenviar convite: só para quem ainda não criou a senha", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const marina = await m.pedir(`/v1/suporte/pessoas/${MARINA}/reenviar-convite`, { corpo: { motivo: "Convite venceu" }, cookie });
  assertEquals(await erro(marina), { codigo: "VALIDATION_ERROR", detalhes: { motivo: "JA_ENTROU" } });
  const diego = await m.pedir(`/v1/suporte/pessoas/${DIEGO}/reenviar-convite`, { corpo: { motivo: "Convite venceu" }, cookie });
  assertEquals(await diego.json(), { email: "di***@ribeiromatos.adv.br" });
  assertEquals(m.enviados, [{ email: "diego@ribeiromatos.adv.br", voltarPara: "https://portal.exemplo/criar-senha" }]);
  assertEquals(chamou(m, "console_suporte_registrar").map((c) => c.args.p_acao), ["suporte.reenviou_convite"]);
});

Deno.test("falha do Auth: nada é registrado", async () => {
  const m = montar();
  m.auth.pedirRecuperacao = () => Promise.reject(new Error("Auth fora"));
  const cookie = await entrar(m);
  const r = await m.pedir(`/v1/suporte/pessoas/${MARINA}/link-senha`, { corpo: { motivo: "Pediu" }, cookie });
  assertEquals((await erro(r)).codigo, "UPSTREAM_UNAVAILABLE");
  assertEquals(chamou(m, "console_suporte_registrar").length, 0);
});

Deno.test("histórico de suporte com o motivo", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const r = await (await m.pedir(`/v1/suporte/pessoas/${MARINA}/historico`, { cookie })).json();
  assertEquals(r.eventos[0], { ocorridoEm: "2026-11-18T18:20:00Z", autor: { id: CAROLINA, nome: "Carol" }, acao: "suporte.desconectou", dados: { motivo: "Trocou de celular", aparelhos: 2 } });
});

Deno.test("F1.12: se o e-mail de aviso não sai, o autenticador continua tirado", async () => {
  const m = montar({ emailFalha: true });
  const cookie = await entrar(m);
  const r = await m.pedir(`/v1/suporte/pessoas/${MARINA}/tirar-autenticador`, { corpo: { motivo: "Perdeu o celular", identidadeConferida: true }, cookie });
  assertEquals(await r.json(), { aparelhos: 2, avisoEnviado: false });
  assertEquals(m.removidos, [MARINA]);
});
