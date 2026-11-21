// Cobrança dos escritórios (CO-06, F1.18): as rotas pedem a sessão completa, passam o que foi
// escrito ao banco (que decide quem pode e confere os campos) e mandam os e-mails da fila, com o
// sócio dono em cópia. Sem o segredo do Resend, a fila espera.
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { criarApiConsole } from "./app.ts";
import { adminFalso, arquivosFalsos, authFalso, bancoFalso, CODIGO_CERTO, cookieDe, erro, erroBanco, limitesFalsos, pedido } from "../_shared/teste_util.ts";
import { emailCobranca, type EnvioCobranca, type MensagemEmail } from "../_shared/email.ts";

const MARTA = "0b7c3f0e-5d1a-4c2b-9e8f-1a2b3c4d5e6f";
const RENATA = "1c8d4f1f-6e2b-4d3c-8f9a-2b3c4d5e6f70";
const CEDRO = "5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const FATURA = "6b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e";
const ENVIO = "7c3d4e5f-6a7b-4c8d-8e9f-1a2b3c4d5e6f";
const ENTRAR = { email: "marta@t3jus.exemplo", senha: "senha-forte-da-equipe" };

const FILA: (EnvioCobranca & { id: string; para: string; copiaPessoaId: string | null })[] = [{
  id: ENVIO, tipo: "VENCEU_7", para: "financeiro@cedrolima.adv.br", copiaPessoaId: RENATA, socio: "Renata Cedro", escritorio: "Cedro & Lima Advocacia",
  fatura: { competencia: "2026-11-01", vencimento: "2026-11-10", totalCentavos: 96800, pagaEm: null, atrasoDias: 7, pixCopiaCola: null, linhaBoleto: null },
  abertas: [],
}];

function montar(opcoes: { semEmail?: boolean; falhaEmail?: boolean } = {}) {
  const falso = authFalso([{ id: MARTA, email: ENTRAR.email, senha: ENTRAR.senha }]);
  const mandados: MensagemEmail[] = [];
  let fila = [...FILA];
  const db = bancoFalso({
    acesso_console: () => true,
    registrar_acesso: () => 1,
    ...limitesFalsos({ login: 5, autenticador: 10, recuperacao: 3 }),
    console_cobranca_faturas: () => ({ hoje: "2026-11-17", faturas: [] }),
    console_planos: () => ({ podeEditar: false, planos: [] }),
    console_plano_salvar: () => ({ id: "p", versao: 1 }),
    console_cobranca_fatura: () => ({ id: FATURA }),
    console_fatura_lembrete: () => ({ ok: true }),
    console_fatura_pagamento_manual: (a) => {
      if (a.p_versao === 9) erroBanco("TC409", { versao: 10, quem: "Carol", em: "2026-11-17T17:32:00Z" });
      return { acessoDevolvido: false, versao: 3 };
    },
    console_fatura_cancelar: () => ({ versao: 2 }),
    console_assinatura: () => ({ valores: true, assinatura: null }),
    console_assinatura_salvar: () => ({ id: "a", versao: 1 }),
    console_portal_so_consulta: () => erroBanco("TC401"),
    rotina_cobranca_envios_pendentes: () => {
      const r = fila;
      fila = [];
      return r;
    },
    rotina_cobranca_envio_registrar: () => null,
  });
  const app = criarApiConsole("segredo-de-repasse-de-teste", {
    banco: db.banco, auth: falso.auth, admin: adminFalso({ "renata@cedrolima.adv.br": RENATA }).admin,
    urlApp: "https://console.exemplo", urlPortal: "https://portal.exemplo", arquivos: arquivosFalsos().arquivos,
    emails: opcoes.semEmail ? undefined : {
      enviar: (m) => {
        if (opcoes.falhaEmail) return Promise.reject(new Error("Resend respondeu 500"));
        mandados.push(m);
        return Promise.resolve();
      },
    },
  });
  return { pedir: pedido(app, "api-console"), mandados, ...db };
}

async function entrar(m: ReturnType<typeof montar>): Promise<string> {
  const aal1 = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  const { factorId } = await (await m.pedir("/v1/auth/autenticador/cadastrar", { corpo: {}, cookie: aal1 })).json();
  return cookieDe(await m.pedir("/v1/auth/autenticador/verificar", { corpo: { codigo: CODIGO_CERTO, factorId }, cookie: aal1 }));
}

Deno.test("CO-06: Cobrança, planos e a fatura pedem a sessão completa", async () => {
  const m = montar();
  assertEquals((await erro(await m.pedir("/v1/cobranca/faturas"))).codigo, "UNAUTHORIZED");
  assertEquals((await erro(await m.pedir("/v1/cobranca/planos"))).codigo, "UNAUTHORIZED");
  assertEquals((await erro(await m.pedir(`/v1/clientes/${CEDRO}/faturas/${FATURA}/lembrete`, { corpo: {} }))).codigo, "UNAUTHORIZED");
  assertEquals(m.chamadas.filter((c) => c.funcao.startsWith("console_")).length, 0);
});

Deno.test("CO-06: o lembrete manual manda na hora, para o e-mail de cobrança com o sócio dono em cópia", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const r = await m.pedir(`/v1/clientes/${CEDRO}/faturas/${FATURA}/lembrete`, { corpo: {}, cookie });
  assertEquals(r.status, 200);
  assertEquals(m.chamadas.find((c) => c.funcao === "console_fatura_lembrete")?.args, { p_pessoa: MARTA, p_escritorio: CEDRO, p_fatura: FATURA });
  assertEquals(m.mandados.length, 1);
  assertEquals(m.mandados[0]!.para, "financeiro@cedrolima.adv.br");
  assertEquals(m.mandados[0]!.copia, ["renata@cedrolima.adv.br"]);
  assertEquals(m.mandados[0]!.assunto, "Fatura de novembro do T3jus em aberto há 7 dias");
  assertEquals(m.chamadas.find((c) => c.funcao === "rotina_cobranca_envio_registrar")?.args, { p_id: ENVIO, p_enviado: true });
});

Deno.test("CO-06: se o e-mail falha, a ação continua feita e a fila guarda o erro", async () => {
  const m = montar({ falhaEmail: true });
  const cookie = await entrar(m);
  assertEquals((await m.pedir(`/v1/clientes/${CEDRO}/faturas/${FATURA}/lembrete`, { corpo: {}, cookie })).status, 200);
  assertEquals(m.chamadas.find((c) => c.funcao === "rotina_cobranca_envio_registrar")?.args,
    { p_id: ENVIO, p_enviado: false, p_erro: "Resend respondeu 500" });
});

Deno.test("CO-06: sem o segredo do Resend, nada sai e a fila espera", async () => {
  const m = montar({ semEmail: true });
  const r = await m.pedir("/v1/rotina/cobranca-envios", { corpo: {} });
  assertEquals(await r.json(), { enviados: 0, falhas: 0 });
  assertEquals(m.chamadas.some((c) => c.funcao === "rotina_cobranca_envios_pendentes"), false);
});

Deno.test("CO-06: a rota da rotina manda a fila sem sessão, mas só com o segredo do repasse", async () => {
  const m = montar();
  assertEquals((await m.pedir("/v1/rotina/cobranca-envios", { corpo: {}, segredo: null })).status, 403);
  const r = await m.pedir("/v1/rotina/cobranca-envios", { corpo: {} });
  assertEquals(await r.json(), { enviados: 1, falhas: 0 });
});

Deno.test("CO-06: o pagamento manual leva a versão lida; o conflito diz quem registrou", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const corpo = { pagoEm: "2026-11-17", valorCentavos: 43100, forma: "PIX", motivo: "Comprovante por e-mail" };
  assertEquals((await erro(await m.pedir(`/v1/clientes/${CEDRO}/faturas/${FATURA}/pagamento-manual`, { corpo, cookie }))).detalhes, { campos: ["versao"] });
  const conflito = await m.pedir(`/v1/clientes/${CEDRO}/faturas/${FATURA}/pagamento-manual`, { corpo: { ...corpo, versao: 9 }, cookie });
  assertEquals(conflito.status, 409);
  assertEquals(((await erro(conflito)).detalhes as Record<string, unknown>).quem, "Carol");
  const ok = await m.pedir(`/v1/clientes/${CEDRO}/faturas/${FATURA}/pagamento-manual`, { corpo: { ...corpo, versao: 2 }, cookie });
  assertEquals(await ok.json(), { acessoDevolvido: false, versao: 3 });
  assertEquals(m.chamadas.findLast((c) => c.funcao === "console_fatura_pagamento_manual")?.args,
    { p_pessoa: MARTA, p_escritorio: CEDRO, p_fatura: FATURA, p_versao: 2, p_dados: corpo });
});

Deno.test("CO-06: preparar a assinatura vai sem versão; só consulta recusada pelo banco é 403", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const d = { diaVencimento: 10, forma: "PIX", emailCobranca: "financeiro@cedrolima.adv.br", planoId: "8d4e5f6a-7b8c-4d9e-8f0a-1b2c3d4e5f6a" };
  assertEquals((await m.pedir(`/v1/clientes/${CEDRO}/assinatura`, { metodo: "PUT", corpo: d, cookie })).status, 200);
  assertEquals(m.chamadas.find((c) => c.funcao === "console_assinatura_salvar")?.args.p_versao, null);
  const r = await m.pedir(`/v1/clientes/${CEDRO}/portal-so-consulta`, { corpo: { versao: 1, motivo: "Atraso" }, cookie });
  assertEquals(r.status, 403);
});

Deno.test("CO-06: o e-mail da régua é curto e educado, sem juros nem ameaça", () => {
  const base = FILA[0]!;
  const sete = emailCobranca(base, "https://app.t3jus.pro", "atendimento@exemplo.com.br");
  assertStringIncludes(sete.texto, "Olá, Renata.");
  assertStringIncludes(sete.texto, "R$ 968,00");
  assertStringIncludes(sete.texto, "venceu em 10/11/2026 e ainda não consta como paga");
  assertStringIncludes(sete.texto, "Se já pagou, desconsidere");
  assertStringIncludes(sete.texto, "O uso do Portal continua normal.");
  assert(!/juros|multa|protesto|bloque/i.test(sete.texto));
  assertEquals(sete.responderPara, "atendimento@exemplo.com.br");
  const manual = emailCobranca({ ...base, tipo: "MANUAL", abertas: [
    { competencia: "2026-10-01", vencimento: "2026-10-10", totalCentavos: 19000, atrasoDias: 41 },
    { competencia: "2026-11-01", vencimento: "2026-11-10", totalCentavos: 19000, atrasoDias: 10 },
  ] }, "https://app.t3jus.pro", "atendimento@exemplo.com.br");
  assertEquals(manual.assunto, "Faturas do T3jus em aberto");
  assertStringIncludes(manual.texto, "2 faturas do T3jus em aberto, somando R$ 380,00");
  const cancelada = emailCobranca({ ...base, tipo: "CANCELADA" }, "https://app.t3jus.pro", "atendimento@exemplo.com.br");
  assert(!cancelada.texto.includes("Ver a fatura"));
  assertStringIncludes(emailCobranca({ ...base, tipo: "RECIBO", fatura: { ...base.fatura, pagaEm: "2026-11-17" } }, "https://app.t3jus.pro", "x@y.z").texto,
    "Recebemos o pagamento da fatura de novembro de 2026 da Cedro & Lima Advocacia, de R$ 968,00, em 17/11/2026.");
});
