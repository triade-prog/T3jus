// Implantação assistida (CO-08, F1.42): a regra global no Console. As rotas pedem a sessão completa,
// mandam ao banco a pessoa da sessão (nunca a do corpo) e a versão lida, e o banco decide quem pode
// (Administração e Financeiro leem; só a Administração muda) e confere os campos.
import { assertEquals } from "@std/assert";
import { criarApiConsole } from "./app.ts";
import { adminFalso, arquivosFalsos, authFalso, bancoFalso, CODIGO_CERTO, cookieDe, erro, erroBanco, limitesFalsos, pedido } from "../_shared/teste_util.ts";

const CAROL = "0b7c3f0e-5d1a-4c2b-9e8f-1a2b3c4d5e6f";
const OUTRA = "1c8d4f1f-6e2b-4d3c-8f9a-2b3c4d5e6f70";
const ENTRAR = { email: "carol@t3jus.exemplo", senha: "senha-forte-da-equipe" };
const REGRA = {
  nome: "Implantação assistida", descricao: "treino de toda a equipe e acompanhamento por 30 dias", valorCentavos: 149000,
  condicaoPadrao: "ISENTA", isencaoAte: "2027-05-31", isencaoTexto: "Oferta de lançamento", prazoDias: 30,
};

function montar() {
  const falso = authFalso([{ id: CAROL, email: ENTRAR.email, senha: ENTRAR.senha }]);
  const db = bancoFalso({
    acesso_console: () => true,
    registrar_acesso: () => 1,
    ...limitesFalsos({ login: 5, autenticador: 10, recuperacao: 3 }),
    console_implantacao_regras: () => ({ podeEditar: true, regra: { ...REGRA, versao: 2 }, hoje: { condicao: "ISENTA" }, historico: [] }),
    console_implantacao_regras_salvar: (a) => {
      if (a.p_versao === 1) erroBanco("TC409", { versao: 2, atual: { ...REGRA, versao: 2 } });
      if ((a.p_dados as { prazoDias: number }).prazoDias > 90) erroBanco("TC422", { campos: ["prazoDias"] });
      if ((a.p_dados as { valorCentavos: number }).valorCentavos === 0) erroBanco("TC401");
      return { versao: 3, mudou: true };
    },
  });
  const app = criarApiConsole("segredo-de-repasse-de-teste", {
    banco: db.banco, auth: falso.auth, admin: adminFalso({}).admin,
    urlApp: "https://console.exemplo", urlPortal: "https://portal.exemplo", arquivos: arquivosFalsos().arquivos,
  });
  return { pedir: pedido(app, "api-console"), ...db };
}

async function entrar(m: ReturnType<typeof montar>): Promise<string> {
  const aal1 = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  const { factorId } = await (await m.pedir("/v1/auth/autenticador/cadastrar", { corpo: {}, cookie: aal1 })).json();
  return cookieDe(await m.pedir("/v1/auth/autenticador/verificar", { corpo: { codigo: CODIGO_CERTO, factorId }, cookie: aal1 }));
}

Deno.test("CO-08: a regra da implantação pede a sessão completa", async () => {
  const m = montar();
  assertEquals((await erro(await m.pedir("/v1/cobranca/implantacao"))).codigo, "UNAUTHORIZED");
  assertEquals((await erro(await m.pedir("/v1/cobranca/implantacao", { metodo: "PUT", corpo: { ...REGRA, versao: 2 } }))).codigo, "UNAUTHORIZED");
  assertEquals(m.chamadas.filter((c) => c.funcao.startsWith("console_implantacao")).length, 0);
});

Deno.test("CO-08: ler a regra manda só a pessoa da sessão", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const r = await m.pedir("/v1/cobranca/implantacao", { cookie });
  assertEquals(r.status, 200);
  assertEquals((await r.json()).regra.valorCentavos, 149000);
  assertEquals(m.chamadas.find((c) => c.funcao === "console_implantacao_regras")?.args, { p_pessoa: CAROL });
});

Deno.test("CO-08: mudar a regra leva a versão lida e os campos; o autor vem da sessão, nunca do corpo", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const r = await m.pedir("/v1/cobranca/implantacao", { metodo: "PUT", corpo: { ...REGRA, versao: 2, autor: OUTRA, p_pessoa: OUTRA }, cookie });
  assertEquals(r.status, 200);
  assertEquals(await r.json(), { versao: 3, mudou: true });
  assertEquals(m.chamadas.find((c) => c.funcao === "console_implantacao_regras_salvar")?.args, { p_pessoa: CAROL, p_versao: 2, p_dados: REGRA });
});

Deno.test("CO-08: sem versão é 400; versão velha é 409 com a regra salva; campo fora do limite volta com o campo", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const semVersao = await m.pedir("/v1/cobranca/implantacao", { metodo: "PUT", corpo: REGRA, cookie });
  assertEquals(semVersao.status, 400);
  assertEquals(m.chamadas.some((c) => c.funcao === "console_implantacao_regras_salvar"), false);
  const conflito = await m.pedir("/v1/cobranca/implantacao", { metodo: "PUT", corpo: { ...REGRA, versao: 1 }, cookie });
  assertEquals(conflito.status, 409);
  assertEquals(((await erro(conflito)).detalhes as { versao: number }).versao, 2);
  const prazo = await m.pedir("/v1/cobranca/implantacao", { metodo: "PUT", corpo: { ...REGRA, versao: 2, prazoDias: 91 }, cookie });
  assertEquals(prazo.status, 400);
  assertEquals((await erro(prazo)).detalhes, { campos: ["prazoDias"] });
  const dataErrada = await m.pedir("/v1/cobranca/implantacao", { metodo: "PUT", corpo: { ...REGRA, versao: 2, isencaoAte: "31/05/2027" }, cookie });
  assertEquals(dataErrada.status, 400);
});

Deno.test("CO-08: quem não é da Administração recebe 403 do banco", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const r = await m.pedir("/v1/cobranca/implantacao", { metodo: "PUT", corpo: { ...REGRA, versao: 2, valorCentavos: 0 }, cookie });
  assertEquals(r.status, 403);
});
