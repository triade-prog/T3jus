// Fim do contrato (F0.16, PT-11): os avisos à sócia dona saem da fila do banco pelo Resend, com
// o e-mail dela do Auth. No encerramento com fim hoje, o aviso sai na hora; sem o segredo do
// Resend, a fila espera.
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { criarApiConsole } from "./app.ts";
import { adminFalso, arquivosFalsos, authFalso, bancoFalso, CODIGO_CERTO, cookieDe, limitesFalsos, pedido } from "../_shared/teste_util.ts";
import { avisoFimContrato, type AvisoFimContrato, type MensagemEmail } from "../_shared/email.ts";
import { CONTATO_T3JUS } from "@t3jus/domain";

const CAROL = "0b7c3f0e-5d1a-4c2b-9e8f-1a2b3c4d5e6f";
const RENATA = "1c8d4f1f-6e2b-4d3c-8f9a-2b3c4d5e6f70";
const CEDRO = "5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const AVISO = "7c3d4e5f-6a7b-4c8d-8e9f-1a2b3c4d5e6f";
const ENTRAR = { email: "carol@t3jus.exemplo", senha: "senha-forte-da-equipe" };

const FIM: AvisoFimContrato = {
  tipo: "FIM", escritorio: "Cedro & Lima Advocacia", socio: "Renata Lima", fimEm: "2026-11-19",
  consultaAte: "2026-12-18", acessoFechaEm: "2026-12-19", guardaAte: "2031-11-19", diasParaFechar: 30,
};

function montar(opcoes: { semEmail?: boolean; falhaEmail?: boolean; enfileirados?: number } = {}) {
  const falso = authFalso([{ id: CAROL, email: ENTRAR.email, senha: ENTRAR.senha }]);
  const mandados: MensagemEmail[] = [];
  let fila = [{ ...FIM, id: AVISO, paraPessoaId: RENATA }];
  const db = bancoFalso({
    acesso_console: () => true,
    registrar_acesso: () => 1,
    ...limitesFalsos({ login: 5, autenticador: 10, recuperacao: 3 }),
    console_encerrar_contrato: () => ({ versao: 4, encerramento: { situacao: "CONSULTA" } }),
    contrato_avisos_do_escritorio: () => opcoes.enfileirados ?? 1,
    rotina_contrato_avisos_pendentes: () => {
      const r = fila;
      fila = [];
      return r;
    },
    rotina_contrato_aviso_registrar: () => null,
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

const ENCERRAR = { versao: 3, fimEm: "2026-11-19", motivo: "Distrato assinado", nomeConfirmado: "Cedro & Lima Advocacia" };

Deno.test("PT-11: encerrar com o fim hoje manda o aviso à sócia dona na hora", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const r = await m.pedir(`/v1/clientes/${CEDRO}/encerrar`, { corpo: ENCERRAR, cookie });
  assertEquals(await r.json(), { versao: 4, encerramento: { situacao: "CONSULTA" } });
  assertEquals(m.chamadas.find((c) => c.funcao === "contrato_avisos_do_escritorio")?.args, { p_escritorio: CEDRO });
  assertEquals(m.mandados.length, 1);
  assertEquals(m.mandados[0]!.para, "renata@cedrolima.adv.br");
  assertEquals(m.mandados[0]!.assunto, "O contrato da Cedro & Lima Advocacia com o T3jus terminou");
  assertEquals(m.mandados[0]!.responderPara, CONTATO_T3JUS);
  assertEquals(m.chamadas.find((c) => c.funcao === "rotina_contrato_aviso_registrar")?.args, { p_id: AVISO, p_enviado: true });
});

Deno.test("PT-11: com o fim no futuro, encerrar não manda nada", async () => {
  const m = montar({ enfileirados: 0 });
  const cookie = await entrar(m);
  assertEquals((await m.pedir(`/v1/clientes/${CEDRO}/encerrar`, { corpo: { ...ENCERRAR, fimEm: "2026-12-01" }, cookie })).status, 200);
  assertEquals(m.mandados.length, 0);
  assertEquals(m.chamadas.some((c) => c.funcao === "rotina_contrato_avisos_pendentes"), false);
});

Deno.test("PT-11: se o e-mail falha, o encerramento continua feito e a fila guarda o erro", async () => {
  const m = montar({ falhaEmail: true });
  const cookie = await entrar(m);
  assertEquals((await m.pedir(`/v1/clientes/${CEDRO}/encerrar`, { corpo: ENCERRAR, cookie })).status, 200);
  assertEquals(m.chamadas.find((c) => c.funcao === "rotina_contrato_aviso_registrar")?.args,
    { p_id: AVISO, p_enviado: false, p_erro: "Resend respondeu 500" });
});

Deno.test("PT-11: a rota da rotina manda a fila sem sessão, só com o segredo do repasse", async () => {
  const m = montar();
  assertEquals((await m.pedir("/v1/rotina/avisos-fim-contrato", { corpo: {}, segredo: null })).status, 403);
  assertEquals(await (await m.pedir("/v1/rotina/avisos-fim-contrato", { corpo: {} })).json(), { enviados: 1, falhas: 0 });
});

Deno.test("PT-11: sem o segredo do Resend, nada sai e a fila espera", async () => {
  const m = montar({ semEmail: true });
  assertEquals(await (await m.pedir("/v1/rotina/avisos-fim-contrato", { corpo: {} })).json(), { enviados: 0, falhas: 0 });
  assertEquals(m.chamadas.some((c) => c.funcao === "rotina_contrato_avisos_pendentes"), false);
});

Deno.test("PT-11: o aviso do fim diz o prazo para baixar, quando o acesso fecha e até quando os dados ficam", () => {
  const e = avisoFimContrato(FIM, "https://portal.exemplo", "contato@exemplo.com.br");
  assertStringIncludes(e.texto, "Olá, Renata.");
  assertStringIncludes(e.texto, "terminou em 19/11/2026. Até 18/12/2026, o Portal fica só para consulta");
  assertStringIncludes(e.texto, "Em 19/12/2026, o acesso ao Portal fecha.");
  assertStringIncludes(e.texto, "guardados pelo T3jus até 19/11/2031");
  assertStringIncludes(e.texto, "Baixar os dados no Portal: https://portal.exemplo/meu-escritorio");
  assertStringIncludes(e.html, "mailto:contato@exemplo.com.br");
  assert(e.html.includes("Cedro &amp; Lima Advocacia"), "o nome do escritório vai escapado no HTML");
});

Deno.test("PT-11: o aviso de 3 dias diz quantos faltam, e amanhã quando falta 1", () => {
  const tres = avisoFimContrato({ ...FIM, tipo: "FECHA_EM_3", diasParaFechar: 3 }, "https://portal.exemplo", CONTATO_T3JUS);
  assertEquals(tres.assunto, "O acesso ao Portal do T3jus fecha em 3 dias");
  assertStringIncludes(tres.texto, "fecha em 19/12/2026, porque o contrato terminou em 19/11/2026. Até 18/12/2026, ainda dá para baixar");
  assertStringIncludes(tres.texto, "Se já baixou, pode desconsiderar este e-mail.");
  assertEquals(avisoFimContrato({ ...FIM, tipo: "FECHA_EM_3", diasParaFechar: 1 }, "https://portal.exemplo", CONTATO_T3JUS).assunto,
    "O acesso ao Portal do T3jus fecha amanhã");
});
