// Cadastrar interessado à mão (F2.5, SC-05) e o sino do Console (F2.6, SC-02, SC-05): as rotas
// exigem a sessão completa, passam o que foi escrito ao banco e deixam as regras para ele.
import { assertEquals } from "@std/assert";
import { criarApiConsole } from "./app.ts";
import { adminFalso, arquivosFalsos, authFalso, bancoFalso, CODIGO_CERTO, cookieDe, erro, erroBanco, limitesFalsos, pedido } from "../_shared/teste_util.ts";

const CAROLINA = "0b7c3f0e-5d1a-4c2b-9e8f-1a2b3c4d5e6f";
const AROEIRA = "5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const SUCUPIRA = "6b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e";
const AVISO = "7c3d4e5f-6a7b-4c8d-8e9f-1a2b3c4d5e6f";
const ENTRAR = { email: "carol@t3jus.exemplo", senha: "senha-forte-da-equipe" };
const CADASTRO = {
  nome: "Tomás Lins", escritorio: "Aroeira & Lins Advogados", email: "tomas@aroeiralins.adv.br", whats: "(86) 99561-2087", tamanho: "DE_2_A_5",
  area: "Cível", cidade: "Teresina", uf: "PI", origem: "INDICACAO", detalhe: "Indicação de Patrícia Nóbrega", quando: "2026-11-21",
  mensagem: "", sabe: false, responsavel: CAROLINA, passo: "Fazer o primeiro contato", passoData: "2026-11-23",
};
const LISTA = { novos: 1, total: 1, veInteressados: true, itens: [{ id: AVISO, tipo: "INTERESSADO_NOVO", dados: { escritorio: "Jatobá" }, interessadoId: SUCUPIRA, em: "2026-11-21T12:14:00Z", lido: false, agora: null }] };

function montar(handlers: Record<string, (a: Record<string, unknown>) => unknown> = {}) {
  const falso = authFalso([{ id: CAROLINA, email: ENTRAR.email, senha: ENTRAR.senha }]);
  const db = bancoFalso({
    acesso_console: () => true,
    registrar_acesso: () => 1,
    ...limitesFalsos({ login: 5, autenticador: 10, recuperacao: 3 }),
    console_interessado_cadastrar: () => ({ id: AROEIRA }),
    console_interessado_juntar: () => "nota-1",
    console_avisos: () => LISTA,
    console_aviso_lido: () => ({ ...LISTA, novos: 0 }),
    console_avisos_lidos: () => ({ ...LISTA, novos: 0, marcados: 1 }),
    ...handlers,
  });
  const app = criarApiConsole("segredo-de-repasse-de-teste", {
    banco: db.banco, auth: falso.auth, admin: adminFalso().admin, urlApp: "https://console.exemplo", urlPortal: "https://portal.exemplo", arquivos: arquivosFalsos().arquivos,
    emails: { enviar: () => Promise.resolve() },
  });
  return { pedir: pedido(app, "api-console"), ...db };
}

async function entrar(m: ReturnType<typeof montar>): Promise<string> {
  const aal1 = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  const { factorId } = await (await m.pedir("/v1/auth/autenticador/cadastrar", { corpo: {}, cookie: aal1 })).json();
  return cookieDe(await m.pedir("/v1/auth/autenticador/verificar", { corpo: { codigo: CODIGO_CERTO, factorId }, cookie: aal1 }));
}

Deno.test("F2.5 e F2.6: cadastrar, juntar e o sino pedem a sessão completa", async () => {
  const m = montar();
  assertEquals((await erro(await m.pedir("/v1/interessados", { corpo: CADASTRO }))).codigo, "UNAUTHORIZED");
  assertEquals((await erro(await m.pedir(`/v1/interessados/${SUCUPIRA}/juntar`, { corpo: CADASTRO }))).codigo, "UNAUTHORIZED");
  assertEquals((await erro(await m.pedir("/v1/avisos"))).codigo, "UNAUTHORIZED");
  assertEquals((await erro(await m.pedir(`/v1/avisos/${AVISO}/lido`, { corpo: {} }))).codigo, "UNAUTHORIZED");
  assertEquals(m.chamadas.filter((c) => c.funcao.startsWith("console_")).length, 0);
});

Deno.test("SC-05: cadastrar à mão passa o que foi escrito e a pessoa da sessão; o novo responde 201", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const r = await m.pedir("/v1/interessados", { corpo: CADASTRO, cookie });
  assertEquals(r.status, 201);
  assertEquals(await r.json(), { id: AROEIRA });
  const a = m.chamadas.find((c) => c.funcao === "console_interessado_cadastrar")!.args;
  assertEquals([a.p_pessoa, a.p_forcar, (a.p_dados as { origem: string }).origem, (a.p_dados as { passoData: string }).passoData], [CAROLINA, false, "INDICACAO", "2026-11-23"]);
});

Deno.test("decisão 3: o repetido volta com 200 e nada gravado; cadastrar mesmo assim manda forcar", async () => {
  const rep = { repetido: { id: SUCUPIRA, escritorio: "Sucupira", campo: "email" } };
  const m = montar({ console_interessado_cadastrar: (a) => (a.p_forcar ? { id: AROEIRA } : rep) });
  const cookie = await entrar(m);
  const r = await m.pedir("/v1/interessados", { corpo: CADASTRO, cookie });
  assertEquals(r.status, 200);
  assertEquals(await r.json(), rep);
  assertEquals((await m.pedir("/v1/interessados", { corpo: { ...CADASTRO, forcar: true }, cookie })).status, 201);
  const j = await m.pedir(`/v1/interessados/${SUCUPIRA}/juntar`, { corpo: CADASTRO, cookie });
  assertEquals(j.status, 201);
  assertEquals(m.chamadas.find((c) => c.funcao === "console_interessado_juntar")!.args.p_id, SUCUPIRA);
});

Deno.test("os campos com erro do banco voltam presos aos campos", async () => {
  const m = montar({ console_interessado_cadastrar: () => erroBanco("TC422", { campos: ["email", "whats"] }) });
  const cookie = await entrar(m);
  const e = await erro(await m.pedir("/v1/interessados", { corpo: { ...CADASTRO, email: "", whats: "" }, cookie }));
  assertEquals([e.codigo, e.detalhes?.campos], ["VALIDATION_ERROR", ["email", "whats"]]);
});

Deno.test("F2.6: ler, abrir e marcar todos como lidos até o último mostrado", async () => {
  const m = montar();
  const cookie = await entrar(m);
  assertEquals((await (await m.pedir("/v1/avisos", { cookie })).json()).novos, 1);
  assertEquals((await (await m.pedir(`/v1/avisos/${AVISO}/lido`, { corpo: {}, cookie })).json()).novos, 0);
  assertEquals(m.chamadas.find((c) => c.funcao === "console_aviso_lido")!.args, { p_pessoa: CAROLINA, p_id: AVISO });
  assertEquals((await m.pedir("/v1/avisos/lidos", { corpo: { ate: "nada" }, cookie })).status, 400);
  assertEquals((await (await m.pedir("/v1/avisos/lidos", { corpo: { ate: "2026-11-21T12:14:00Z" }, cookie })).json()).marcados, 1);
  assertEquals(m.chamadas.find((c) => c.funcao === "console_avisos_lidos")!.args, { p_pessoa: CAROLINA, p_ate: "2026-11-21T12:14:00Z" });
});
