// Teste grátis no Console (F1.33; CO-09): a carteira com a situação do teste e os filtros, o quadro
// da aba Assinatura e as ações. As rotas pedem a sessão completa, mandam ao banco a pessoa da
// sessão (nunca a do corpo), a versão lida e o escritório da rota; quem pode é o banco que decide.
import { assertEquals } from "@std/assert";
import { criarApiConsole } from "./app.ts";
import { adminFalso, arquivosFalsos, authFalso, bancoFalso, CODIGO_CERTO, cookieDe, erro, erroBanco, limitesFalsos, pedido } from "../_shared/teste_util.ts";

const CAROL = "0b7c3f0e-5d1a-4c2b-9e8f-1a2b3c4d5e6f";
const OUTRA = "1c8d4f1f-6e2b-4d3c-8f9a-2b3c4d5e6f70";
const RIBEIRO = "2d9e5b20-7f3c-4e4d-9a0b-3c4d5e6f7a81";
const SUCUPIRA = "2d9e5b20-7f3c-4e4d-9a0b-3c4d5e6f7a82";
const IPE = "2d9e5b20-7f3c-4e4d-9a0b-3c4d5e6f7a83";
const ANTIGO = "2d9e5b20-7f3c-4e4d-9a0b-3c4d5e6f7a84";
const ENTRAR = { email: "carol@t3jus.exemplo", senha: "senha-forte-da-equipe" };
const BLOCO = { situacao: "EM_TESTE", diaAtual: 6, totalDias: 7, fim: "2026-12-03", versao: 4, acoes: { prorrogar: true } };

const linha = (id: string, nome: string) => ({
  escritorio_id: id, nome, cidade: "Salvador", uf: "BA", estagio: "IMPLANTACAO", funcoes: ["ADMINISTRACAO"], situacoes: [], criado_em: "2026-11-10T10:00:00Z",
});
const teste = (id: string, x: Record<string, unknown>) => ({
  escritorioId: id, situacao: "EM_TESTE", inicio: "2026-11-27", fim: "2026-12-03", totalDias: 7, diaAtual: 6, prorrogado: false, soConsultaDesde: null, querAssinarEm: null, ...x,
});

function montar() {
  const falso = authFalso([{ id: CAROL, email: ENTRAR.email, senha: ENTRAR.senha }]);
  const db = bancoFalso({
    acesso_console: () => true,
    registrar_acesso: () => 1,
    ...limitesFalsos({ login: 5, autenticador: 10, recuperacao: 3 }),
    console_carteira: () => [linha(RIBEIRO, "Ribeiro & Matos"), linha(SUCUPIRA, "Sucupira"), linha(IPE, "Ipê"), linha(ANTIGO, "Aroeira")],
    console_carteira_cobranca: () => [],
    console_carteira_teste: () => [
      teste(RIBEIRO, { querAssinarEm: "2026-12-01T19:20:00Z" }),
      teste(SUCUPIRA, { inicio: "2026-11-24", fim: "2026-12-04", totalDias: 11, diaAtual: 9, prorrogado: true }),
      teste(IPE, { situacao: "ACABOU", inicio: "2026-11-23", fim: "2026-11-29", diaAtual: null, soConsultaDesde: "2026-11-30" }),
    ],
    console_assinatura: () => ({ valores: true, assinatura: { id: "a", versao: 2 } }),
    console_teste: () => BLOCO,
    console_teste_prorrogar: (a) => {
      if (a.p_versao === 3) erroBanco("TC409", { versao: 4 });
      if (a.p_fim === "2026-12-02") erroBanco("TC422", { motivo: "PRORROGAR_DATA", campos: ["fim"] });
      return { versao: 5, teste: { situacao: "EM_TESTE" } };
    },
    console_teste_liberar: () => erroBanco("TC422", { motivo: "TESTE_NAO_REPETIDO" }),
    console_teste_dispensar: (a) => {
      if (a.p_motivo === "") erroBanco("TC422", { motivo: "MOTIVO_OBRIGATORIO", campos: ["motivo"] });
      return { versao: 5, teste: { situacao: "DISPENSADO" } };
    },
    console_assinatura_confirmar: (a) => {
      if ((a.p_dados as { detalhe: string }).detalhe === "") erroBanco("TC422", { campos: ["detalhe"] });
      if ((a.p_dados as { como: string }).como === "PORTAL" && a.p_versao === 9) erroBanco("TC422", { motivo: "JA_ASSINADO" });
      return { versao: 3, assinadaEm: "2026-12-02T12:52:00Z", inicioCobranca: null, primeiraCompetencia: null };
    },
    rotina_cobranca_envios_pendentes: () => [],
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

Deno.test("CO-09: as rotas do teste pedem a sessão completa", async () => {
  const m = montar();
  for (const [rota, metodo] of [[`/v1/clientes/${RIBEIRO}/teste`, "GET"], [`/v1/clientes/${RIBEIRO}/teste/prorrogar`, "POST"],
    [`/v1/clientes/${RIBEIRO}/teste/liberar`, "POST"], [`/v1/clientes/${RIBEIRO}/teste/dispensar`, "POST"],
    [`/v1/clientes/${RIBEIRO}/assinatura/confirmar`, "POST"]]) {
    const r = await m.pedir(rota!, metodo === "POST" ? { corpo: { versao: 1, motivo: "x" } } : {});
    assertEquals((await erro(r)).codigo, "UNAUTHORIZED", rota);
  }
  assertEquals(m.chamadas.filter((c) => c.funcao.startsWith("console_")).length, 0);
});

Deno.test("CO-09: a carteira traz a situação do teste de cada escritório e os números dos filtros", async () => {
  const m = montar();
  const corpo = await (await m.pedir("/v1/clientes", { cookie: await entrar(m) })).json();
  assertEquals(corpo.clientes.map((x: { nome: string; teste: { situacao: string } | null }) => [x.nome, x.teste?.situacao ?? null]),
    [["Ribeiro & Matos", "EM_TESTE"], ["Sucupira", "EM_TESTE"], ["Ipê", "ACABOU"], ["Aroeira", null]]);
  assertEquals(corpo.clientes[0].teste.escritorioId, undefined);
  assertEquals(corpo.filtrosTeste, { EM_TESTE: 2, ACABOU: 1, QUER_ASSINAR: 1 });
  assertEquals(m.chamadas.find((c) => c.funcao === "console_carteira_teste")?.args, { p_pessoa: CAROL });
});

Deno.test("CO-09: os filtros Em teste, Teste acabou e Quer assinar", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const nomes = async (f: string) => (await (await m.pedir(`/v1/clientes?teste=${f}`, { cookie })).json()).clientes.map((x: { nome: string }) => x.nome);
  assertEquals(await nomes("EM_TESTE"), ["Ribeiro & Matos", "Sucupira"]);
  assertEquals(await nomes("ACABOU"), ["Ipê"]);
  assertEquals(await nomes("QUER_ASSINAR"), ["Ribeiro & Matos"]);
  const ruim = await m.pedir("/v1/clientes?teste=ASSINADO", { cookie });
  assertEquals(ruim.status, 400);
  assertEquals((await erro(ruim)).detalhes, { campos: ["teste"] });
});

Deno.test("CO-09: a aba Assinatura e o GET do teste trazem o quadro do teste, com o escritório da rota", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const r = await (await m.pedir(`/v1/clientes/${RIBEIRO}/assinatura`, { cookie })).json();
  assertEquals(r.teste, BLOCO);
  assertEquals(r.assinatura, { id: "a", versao: 2 });
  assertEquals(await (await m.pedir(`/v1/clientes/${RIBEIRO}/teste`, { cookie })).json(), BLOCO);
  assertEquals(m.chamadas.filter((c) => c.funcao === "console_teste").map((c) => c.args),
    [{ p_pessoa: CAROL, p_escritorio: RIBEIRO }, { p_pessoa: CAROL, p_escritorio: RIBEIRO }]);
  assertEquals((await erro(await m.pedir("/v1/clientes/nao-e-id/teste", { cookie }))).codigo, "NOT_FOUND");
});

Deno.test("CO-09: prorrogar manda a data nova, a versão e o motivo, e devolve o quadro novo", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const r = await m.pedir(`/v1/clientes/${RIBEIRO}/teste/prorrogar`, {
    metodo: "POST", corpo: { versao: 4, fim: "2026-12-08", motivo: "Sem internet na primeira semana", p_pessoa: OUTRA, escritorio: IPE }, cookie,
  });
  assertEquals(r.status, 200);
  assertEquals(await r.json(), { versao: 5, teste: BLOCO });
  assertEquals(m.chamadas.find((c) => c.funcao === "console_teste_prorrogar")?.args,
    { p_pessoa: CAROL, p_escritorio: RIBEIRO, p_versao: 4, p_fim: "2026-12-08", p_motivo: "Sem internet na primeira semana" });
  assertEquals((await m.pedir(`/v1/clientes/${RIBEIRO}/teste/prorrogar`, { metodo: "POST", corpo: { versao: 4, fim: "08/12/2026", motivo: "x" }, cookie })).status, 400);
  assertEquals((await m.pedir(`/v1/clientes/${RIBEIRO}/teste/prorrogar`, { metodo: "POST", corpo: { fim: "2026-12-08", motivo: "x" }, cookie })).status, 400);
  const conflito = await m.pedir(`/v1/clientes/${RIBEIRO}/teste/prorrogar`, { metodo: "POST", corpo: { versao: 3, fim: "2026-12-08", motivo: "x" }, cookie });
  assertEquals(conflito.status, 409);
  const data = await m.pedir(`/v1/clientes/${RIBEIRO}/teste/prorrogar`, { metodo: "POST", corpo: { versao: 4, fim: "2026-12-02", motivo: "x" }, cookie });
  assertEquals((await erro(data)).detalhes, { motivo: "PRORROGAR_DATA", campos: ["fim"] });
});

Deno.test("CO-09: liberar e dispensar levam o motivo; a recusa volta com o motivo", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const lib = await m.pedir(`/v1/clientes/${RIBEIRO}/teste/liberar`, { metodo: "POST", corpo: { versao: 4, motivo: "Sócio de outro escritório" }, cookie });
  assertEquals((await erro(lib)).detalhes, { motivo: "TESTE_NAO_REPETIDO" });
  const disp = await m.pedir(`/v1/clientes/${RIBEIRO}/teste/dispensar`, { metodo: "POST", corpo: { versao: 4, motivo: "Piloto" }, cookie });
  assertEquals(disp.status, 200);
  assertEquals((await disp.json()).teste, BLOCO);
  assertEquals(m.chamadas.find((c) => c.funcao === "console_teste_dispensar")?.args, { p_pessoa: CAROL, p_escritorio: RIBEIRO, p_versao: 4, p_motivo: "Piloto" });
  const sem = await m.pedir(`/v1/clientes/${RIBEIRO}/teste/dispensar`, { metodo: "POST", corpo: { versao: 4, motivo: "" }, cookie });
  assertEquals((await erro(sem)).detalhes, { motivo: "MOTIVO_OBRIGATORIO", campos: ["motivo"] });
});

Deno.test("CO-09: confirmar a assinatura manda como e o detalhe, com a versão da assinatura", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const r = await m.pedir(`/v1/clientes/${RIBEIRO}/assinatura/confirmar`, {
    metodo: "POST", corpo: { versao: 2, como: "PORTAL", detalhe: "Ligação de 02/12, 9h30", autor: OUTRA }, cookie,
  });
  assertEquals(r.status, 200);
  assertEquals((await r.json()).teste, BLOCO);
  assertEquals(m.chamadas.find((c) => c.funcao === "console_assinatura_confirmar")?.args,
    { p_pessoa: CAROL, p_escritorio: RIBEIRO, p_versao: 2, p_dados: { como: "PORTAL", detalhe: "Ligação de 02/12, 9h30" } });
  const campos = await m.pedir(`/v1/clientes/${RIBEIRO}/assinatura/confirmar`, { metodo: "POST", corpo: { versao: 2, como: "EMAIL", detalhe: "" }, cookie });
  assertEquals((await erro(campos)).detalhes, { campos: ["detalhe"] });
  const ja = await m.pedir(`/v1/clientes/${RIBEIRO}/assinatura/confirmar`, { metodo: "POST", corpo: { versao: 9, como: "PORTAL", detalhe: "x" }, cookie });
  assertEquals((await erro(ja)).detalhes, { motivo: "JA_ASSINADO" });
});
