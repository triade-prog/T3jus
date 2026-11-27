// Implantação assistida (CO-08, F1.42 e F1.43): a regra global no Console, concluir e mudar o prazo. As rotas pedem a sessão completa,
// mandam ao banco a pessoa da sessão (nunca a do corpo) e a versão lida, e o banco decide quem pode
// (Administração e Financeiro leem; só a Administração muda) e confere os campos.
import { assertEquals } from "@std/assert";
import { criarApiConsole } from "./app.ts";
import { adminFalso, arquivosFalsos, authFalso, bancoFalso, CODIGO_CERTO, cookieDe, erro, erroBanco, limitesFalsos, pedido } from "../_shared/teste_util.ts";

const CAROL = "0b7c3f0e-5d1a-4c2b-9e8f-1a2b3c4d5e6f";
const OUTRA = "1c8d4f1f-6e2b-4d3c-8f9a-2b3c4d5e6f70";
const ENTRAR = { email: "carol@t3jus.exemplo", senha: "senha-forte-da-equipe" };
const ESC = "2d9e5a2a-7f3c-4e4d-9a0b-3c4d5e6f7081";
const OUTRO_ESC = "3e0f6b3b-8a4d-4f5e-8b1c-4d5e6f708192";
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
    console_implantacao_concluir: (a) => {
      if (a.p_versao_implantacao === 1) erroBanco("TC409", { versao: 2 });
      if (a.p_versao_cliente === 9) erroBanco("TC422", { motivo: "IMPLANTACAO_NAO_ABERTA" });
      return { versaoCliente: 4, implantacao: { estado: "CONCLUIDA", resumo: a.p_resumo } };
    },
    console_implantacao_prazo: (a) => {
      if (a.p_prazo_ate === "2026-01-01") erroBanco("TC422", { motivo: "PRAZO_INVALIDO", campos: ["prazoAte"] });
      if (a.p_pessoa !== CAROL) erroBanco("TC401");
      return { versao: 3, implantacao: { prazoAte: a.p_prazo_ate } };
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

Deno.test("CO-08: concluir e mudar o prazo pedem a sessão completa", async () => {
  const m = montar();
  assertEquals((await erro(await m.pedir(`/v1/clientes/${ESC}/implantacao/concluir`, { corpo: { versaoCliente: 3, versaoImplantacao: 2 } }))).codigo, "UNAUTHORIZED");
  assertEquals((await erro(await m.pedir(`/v1/clientes/${ESC}/implantacao/prazo`, { metodo: "PUT", corpo: { versao: 2, prazoAte: "2027-01-20", motivo: "x" } }))).codigo,
    "UNAUTHORIZED");
  assertEquals(m.chamadas.filter((c) => c.funcao.startsWith("console_implantacao")).length, 0);
});

Deno.test("CO-08: concluir manda as duas versões e o resumo, com o escritório da rota e a pessoa da sessão", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const r = await m.pedir(`/v1/clientes/${ESC}/implantacao/concluir`, {
    corpo: { versaoCliente: 3, versaoImplantacao: 2, resumo: "Equipe treinada", p_pessoa: OUTRA, escritorioId: OUTRO_ESC }, cookie,
  });
  assertEquals(r.status, 200);
  assertEquals((await r.json()).implantacao.estado, "CONCLUIDA");
  assertEquals(m.chamadas.find((c) => c.funcao === "console_implantacao_concluir")?.args, {
    p_pessoa: CAROL, p_escritorio: ESC, p_versao_cliente: 3, p_versao_implantacao: 2, p_resumo: "Equipe treinada",
  });
  const semResumo = await m.pedir(`/v1/clientes/${ESC}/implantacao/concluir`, { corpo: { versaoCliente: 3, versaoImplantacao: 2 }, cookie });
  assertEquals(semResumo.status, 200);
  assertEquals(m.chamadas.filter((c) => c.funcao === "console_implantacao_concluir").at(-1)?.args.p_resumo, null);
});

Deno.test("CO-08: concluir sem as versões é 400, com id que não é do formato é 404; versão velha é 409; sem implantação aberta volta o motivo", async () => {
  const m = montar();
  const cookie = await entrar(m);
  assertEquals((await m.pedir(`/v1/clientes/${ESC}/implantacao/concluir`, { corpo: { versaoCliente: 3 }, cookie })).status, 400);
  assertEquals((await m.pedir(`/v1/clientes/nao-e-id/implantacao/concluir`, { corpo: { versaoCliente: 3, versaoImplantacao: 2 }, cookie })).status, 404);
  assertEquals(m.chamadas.some((c) => c.funcao === "console_implantacao_concluir"), false);
  assertEquals((await m.pedir(`/v1/clientes/${ESC}/implantacao/concluir`, { corpo: { versaoCliente: 3, versaoImplantacao: 1 }, cookie })).status, 409);
  const fechada = await m.pedir(`/v1/clientes/${ESC}/implantacao/concluir`, { corpo: { versaoCliente: 9, versaoImplantacao: 2 }, cookie });
  assertEquals(fechada.status, 400);
  assertEquals((await erro(fechada)).detalhes, { motivo: "IMPLANTACAO_NAO_ABERTA" });
});

Deno.test("CO-08: mudar o prazo leva a data, o motivo e a versão; a data fora do formato é 400 e a recusada volta com o campo", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const r = await m.pedir(`/v1/clientes/${ESC}/implantacao/prazo`, {
    metodo: "PUT", corpo: { versao: 2, prazoAte: "2027-01-20", motivo: "Sócia viajou", autor: OUTRA }, cookie,
  });
  assertEquals(r.status, 200);
  assertEquals(m.chamadas.find((c) => c.funcao === "console_implantacao_prazo")?.args, {
    p_pessoa: CAROL, p_escritorio: ESC, p_prazo_ate: "2027-01-20", p_motivo: "Sócia viajou", p_versao: 2,
  });
  assertEquals((await m.pedir(`/v1/clientes/${ESC}/implantacao/prazo`, { metodo: "PUT", corpo: { versao: 2, prazoAte: "20/01/2027", motivo: "x" }, cookie })).status, 400);
  const antes = await m.pedir(`/v1/clientes/${ESC}/implantacao/prazo`, { metodo: "PUT", corpo: { versao: 2, prazoAte: "2026-01-01", motivo: "x" }, cookie });
  assertEquals(antes.status, 400);
  assertEquals((await erro(antes)).detalhes, { motivo: "PRAZO_INVALIDO", campos: ["prazoAte"] });
});
