// Interessados (F2.2, F2.3; SC-02, SC-05): o pedido do site entra sem sessão, só com o segredo
// do repasse e o IP; a resposta automática sai pelo Resend e fica registrada. As rotas do
// Console exigem a sessão completa e deixam a permissão para o banco.
import { assert, assertEquals } from "@std/assert";
import type { MensagemEmail } from "../_shared/email.ts";
import { criarApiConsole } from "./app.ts";
import { adminFalso, arquivosFalsos, authFalso, bancoFalso, CODIGO_CERTO, cookieDe, erro, limitesFalsos, pedido } from "../_shared/teste_util.ts";

const CAROLINA = "0b7c3f0e-5d1a-4c2b-9e8f-1a2b3c4d5e6f";
const JATOBA = "3e0f6c31-8a4d-4f5e-8b1c-4d5e6f7a8b9c";
const ENTRAR = { email: "carol@t3jus.exemplo", senha: "senha-forte-da-equipe" };
const PEDIDO = {
  nome: "Lívia Prado", escritorio: "Jatobá Advocacia", email: "Livia@Jatoba.adv.br", whats: "(86) 99812-4410",
  tamanho: "6 a 10", area: "Previdenciário", msg: "Planilha e caderno.", aceite: true, origem: { pagina: "/demonstracao", campanha: "lancamento" },
};

function montar(opcoes: { emailFalha?: boolean; handlers?: Record<string, (a: Record<string, unknown>) => unknown> } = {}) {
  const emails: MensagemEmail[] = [];
  const falso = authFalso([{ id: CAROLINA, email: ENTRAR.email, senha: ENTRAR.senha }]);
  const db = bancoFalso({
    acesso_console: () => true,
    registrar_acesso: () => 1,
    ...limitesFalsos({ login: 5, autenticador: 10, recuperacao: 3 }),
    site_registrar_pedido: () => ({ id: JATOBA, repetido: false }),
    site_pedido_resposta: () => null,
    console_interessados: () => ({ hoje: "2026-11-21", podeEditar: true, interessados: [], pessoas: [], mes: { pedidos: 0, site: 0, clientes: 0 } }),
    console_interessado_estagio: (a) => Number(a.p_versao) + 1,
    console_interessado_converter: () => "4f1a7d42-9b5e-4a6f-9c2d-5e6f7a8b9c0d",
    ...opcoes.handlers,
  });
  const app = criarApiConsole("segredo-de-repasse-de-teste", {
    banco: db.banco, auth: falso.auth, admin: adminFalso().admin, urlApp: "https://console.exemplo", urlPortal: "https://portal.exemplo", arquivos: arquivosFalsos().arquivos,
    emails: { enviar: (m) => (opcoes.emailFalha ? Promise.reject(new Error("Resend respondeu 500")) : (emails.push(m), Promise.resolve())) },
  });
  return { pedir: pedido(app, "api-console"), emails, ...db };
}

async function entrar(m: ReturnType<typeof montar>): Promise<string> {
  const aal1 = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  const { factorId } = await (await m.pedir("/v1/auth/autenticador/cadastrar", { corpo: {}, cookie: aal1 })).json();
  return cookieDe(await m.pedir("/v1/auth/autenticador/verificar", { corpo: { codigo: CODIGO_CERTO, factorId }, cookie: aal1 }));
}

Deno.test("SC-02: o pedido do site entra sem sessão, com o IP, e a resposta automática sai", async () => {
  const m = montar();
  const r = await m.pedir("/v1/site/pedidos", { corpo: PEDIDO });
  assertEquals(r.status, 201);
  assertEquals(await r.json(), { ok: true, respostaEnviada: true });
  const chamada = m.chamadas.find((c) => c.funcao === "site_registrar_pedido")!;
  assertEquals(chamada.args.p_ip, "200.1.2.3");
  assertEquals((chamada.args.p_dados as { email: string }).email, "livia@jatoba.adv.br");
  assertEquals(m.emails.length, 1);
  assertEquals(m.emails[0]!.para, "livia@jatoba.adv.br");
  assert(m.emails[0]!.texto.includes("1 dia útil"));
  assert(m.emails[0]!.texto.includes("(86) 99812-4410"));
  assertEquals(m.chamadas.find((c) => c.funcao === "site_pedido_resposta")!.args, { p_id: JATOBA, p_enviada: true });
});

Deno.test("sem o segredo do repasse, o pedido do site não entra", async () => {
  const m = montar();
  assertEquals((await m.pedir("/v1/site/pedidos", { corpo: PEDIDO, segredo: null })).status, 403);
  assertEquals(m.chamadas.length, 0);
});

Deno.test("sem a autorização ou com campo errado, o pedido é recusado antes do banco", async () => {
  const m = montar();
  const r = await m.pedir("/v1/site/pedidos", { corpo: { ...PEDIDO, aceite: false } });
  assertEquals(r.status, 400);
  assertEquals(m.chamadas.length, 0);
});

Deno.test("passou do limite: 429 e nada de e-mail", async () => {
  const m = montar({ handlers: { site_registrar_pedido: () => ({ limite: true }) } });
  const r = await m.pedir("/v1/site/pedidos", { corpo: PEDIDO });
  assertEquals(r.status, 429);
  assertEquals((await erro(r)).codigo, "RATE_LIMITED");
  assertEquals(m.emails.length, 0);
});

Deno.test("pedido repetido não manda outra resposta", async () => {
  const m = montar({ handlers: { site_registrar_pedido: () => ({ id: JATOBA, repetido: true }) } });
  assertEquals(await (await m.pedir("/v1/site/pedidos", { corpo: PEDIDO })).json(), { ok: true, respostaEnviada: false });
  assertEquals(m.emails.length, 0);
});

Deno.test("se o e-mail falhar, o pedido continua registrado e a falha fica no histórico", async () => {
  const m = montar({ emailFalha: true });
  const r = await m.pedir("/v1/site/pedidos", { corpo: PEDIDO });
  assertEquals(r.status, 201);
  assertEquals(await r.json(), { ok: true, respostaEnviada: false });
  assertEquals(m.chamadas.find((c) => c.funcao === "site_pedido_resposta")!.args, { p_id: JATOBA, p_enviada: false });
});

Deno.test("SC-05: as rotas dos Interessados pedem a sessão completa", async () => {
  const m = montar();
  for (const rota of ["/v1/interessados", `/v1/interessados/${JATOBA}`]) {
    assertEquals((await erro(await m.pedir(rota))).codigo, "UNAUTHORIZED", rota);
  }
  assertEquals(m.chamadas.filter((c) => c.funcao.startsWith("console_")).length, 0);
});

Deno.test("SC-05: lista, mudar estágio com motivo e virar escritório cliente", async () => {
  const m = montar();
  const cookie = await entrar(m);
  assertEquals((await (await m.pedir("/v1/interessados", { cookie })).json()).podeEditar, true);

  const semMotivo = await m.pedir(`/v1/interessados/${JATOBA}/estagio`, { metodo: "PUT", corpo: { versao: 3, estagio: "EM_CONTATO", motivo: " " }, cookie });
  assertEquals(semMotivo.status, 400);
  const r = await m.pedir(`/v1/interessados/${JATOBA}/estagio`, { metodo: "PUT", corpo: { versao: 3, estagio: "DEMONSTRACAO", motivo: "Confirmou.", data: "2026-11-26", hora: "18:00" }, cookie });
  assertEquals(await r.json(), { versao: 4 });
  const est = m.chamadas.find((c) => c.funcao === "console_interessado_estagio")!.args;
  assertEquals([est.p_pessoa, est.p_estagio, est.p_data, est.p_hora], [CAROLINA, "DEMONSTRACAO", "2026-11-26", "18:00"]);

  const conv = await m.pedir(`/v1/interessados/${JATOBA}/converter`, { corpo: { versao: 4, nome: "Jatobá Advocacia", cidade: "Teresina", uf: "PI", motivo: "Contrato assinado." }, cookie });
  assertEquals(conv.status, 201);
  assertEquals((await conv.json()).escritorioId, "4f1a7d42-9b5e-4a6f-9c2d-5e6f7a8b9c0d");
});

Deno.test("id fora do formato responde como não encontrado", async () => {
  const m = montar();
  const cookie = await entrar(m);
  assertEquals((await erro(await m.pedir("/v1/interessados/abc", { cookie }))).codigo, "NOT_FOUND");
});
