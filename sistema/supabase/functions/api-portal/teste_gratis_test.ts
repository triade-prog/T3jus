// Teste grátis no Portal (F1.33; CO-09): a faixa vem com o escritório da sessão em GET /v1/escritorio
// e em Plano e faturas, e "Quero assinar" manda ao banco a pessoa e o escritório da sessão, nunca
// os do corpo. Quem pode (só o sócio) e se ainda vale (no teste ou depois do fim) é o banco que decide.
import { assertEquals } from "@std/assert";
import { criarApiPortal } from "./app.ts";
import { adminFalso, arquivosFalsos, authFalso, bancoFalso, cookieDe, erro, erroBanco, limitesFalsos, pedido } from "../_shared/teste_util.ts";

const MARINA = "2d9e5b2a-7f3c-4e4d-9a0b-3c4d5e6f7a8b";
const RIBEIRO = "3e0f6c3b-8a4d-4f5e-8b1c-4d5e6f7a8b9c";
const IPE = "4f1a7d4c-9b5e-4a6f-9c2d-5e6f7a8b9c0d";
const ENTRAR = { email: "marina@exemplo.invalid", senha: "senha-da-socia" };
const TESTE = { situacao: "EM_TESTE", fim: "2026-12-03", diaAtual: 6, totalDias: 7, faltamDias: 2, souSocio: true, podePedir: true, pedido: null };

function montar(opcoes: { socio?: boolean } = {}) {
  const sessoes = new Map<string, string>();
  let pedido_: { em: string; por: string } | null = null;
  const falso = authFalso([{ id: MARINA, email: ENTRAR.email, senha: ENTRAR.senha }]);
  const db = bancoFalso({
    acesso_portal: (a) => a.p_pessoa === MARINA,
    registrar_acesso: () => 1,
    ...limitesFalsos({ login: 5, autenticador: 10, recuperacao: 3 }),
    meus_escritorios: () => [{ escritorio_id: RIBEIRO, nome: "Ribeiro & Matos Advocacia", funcoes: ["SOCIO"] }],
    escolher_escritorio: (a) => {
      if (a.p_escritorio !== RIBEIRO) erroBanco("TC401");
      sessoes.set(String(a.p_sessao), String(a.p_escritorio));
      return null;
    },
    escritorio_da_sessao: (a) => sessoes.get(String(a.p_sessao)) ?? null,
    portal_escritorio: () => ({ dono: true, areas: [] }),
    portal_cobranca: () => ({ soConsultaDesde: null, socioDono: "Marina Ribeiro", veFaturas: true, atraso: null }),
    portal_teste: () => ({ ...TESTE, pedido: pedido_, podePedir: pedido_ === null }),
    portal_plano_faturas: () => ({ hoje: "2026-12-02", assinatura: { plano: { nome: "Escritório" } }, faturas: [] }),
    portal_quero_assinar: (a) => {
      if (opcoes.socio === false) erroBanco("TC401");
      const recado = (a.p_dados as { recado: string | null }).recado;
      if (recado && recado.length > 300) erroBanco("TC422", { campos: ["recado"] });
      const novo = pedido_ === null;
      pedido_ ??= { em: "2026-12-01T19:20:00Z", por: "Marina Ribeiro" };
      return { novo, teste: { ...TESTE, pedido: pedido_, podePedir: false } };
    },
  });
  const app = criarApiPortal("segredo-de-repasse-de-teste", {
    banco: db.banco, auth: falso.auth, urlApp: "https://portal.exemplo", admin: adminFalso({}).admin, arquivos: arquivosFalsos().arquivos,
  });
  return { pedir: pedido(app, "api-portal"), ...db };
}

async function noEscritorio(m: ReturnType<typeof montar>) {
  const cookie = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  await m.pedir("/v1/sessao/escritorio", { metodo: "PUT", corpo: { escritorioId: RIBEIRO }, cookie });
  return cookie;
}

Deno.test("CO-09: a moldura recebe a faixa do teste em cobranca.teste, do escritório da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await (await m.pedir("/v1/escritorio", { cookie })).json();
  assertEquals(r.cobranca.teste, { ...TESTE, podePedir: true });
  assertEquals(r.cobranca.socioDono, "Marina Ribeiro");
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_teste")?.args, { p_pessoa: MARINA, p_escritorio: RIBEIRO });
});

Deno.test("CO-09: Plano e faturas traz o teste antes da assinatura", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await (await m.pedir("/v1/escritorio/faturas", { cookie })).json();
  assertEquals(r.assinatura.plano.nome, "Escritório");
  assertEquals(r.teste.fim, "2026-12-03");
});

Deno.test("CO-09: Quero assinar usa a pessoa e o escritório da sessão e é idempotente", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const corpo = { recado: "Prefiro falar depois das 18h", escritorioId: IPE, p_pessoa: "outra" };
  const r1 = await m.pedir("/v1/escritorio/assinatura/quero-assinar", { metodo: "POST", corpo, cookie });
  assertEquals(r1.status, 200);
  assertEquals((await r1.json()).novo, true);
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_quero_assinar")?.args,
    { p_pessoa: MARINA, p_escritorio: RIBEIRO, p_dados: { recado: "Prefiro falar depois das 18h" } });
  const r2 = await (await m.pedir("/v1/escritorio/assinatura/quero-assinar", { metodo: "POST", corpo: {}, cookie })).json();
  assertEquals([r2.novo, r2.teste.pedido.em], [false, "2026-12-01T19:20:00Z"]);
  assertEquals(m.chamadas.filter((c) => c.funcao === "portal_quero_assinar").at(-1)?.args.p_dados, { recado: null });
});

Deno.test("CO-09: Quero assinar sem sessão, fora do formato, longo demais ou de quem não é sócio", async () => {
  const m = montar({ socio: false });
  assertEquals((await erro(await m.pedir("/v1/escritorio/assinatura/quero-assinar", { metodo: "POST", corpo: {} }))).codigo, "UNAUTHORIZED");
  const cookie = await noEscritorio(m);
  assertEquals((await m.pedir("/v1/escritorio/assinatura/quero-assinar", { metodo: "POST", corpo: { recado: 12 }, cookie })).status, 400);
  assertEquals((await m.pedir("/v1/escritorio/assinatura/quero-assinar", { metodo: "POST", corpo: {}, cookie })).status, 403);
  const m2 = montar();
  const c2 = await noEscritorio(m2);
  const longo = await m2.pedir("/v1/escritorio/assinatura/quero-assinar", { metodo: "POST", corpo: { recado: "x".repeat(301) }, cookie: c2 });
  assertEquals((await erro(longo)).detalhes, { campos: ["recado"] });
});
