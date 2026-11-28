// Teste grátis de 7 dias (F1.34, CO-09): os quatro passos à sócia dona saem pela mesma fila e pela
// mesma rota do fim do contrato (/v1/rotina/avisos-fim-contrato), cada um com o texto do desenho
// aprovado (docs/design/aprovadas/teste-gratis/emails.html, dia1, dia5, dia7 e dia8).
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { criarApiConsole } from "./app.ts";
import { adminFalso, arquivosFalsos, authFalso, bancoFalso, pedido } from "../_shared/teste_util.ts";
import { avisoTesteGratis, type AvisoTesteGratis, type MensagemEmail } from "../_shared/email.ts";
import { CONTATO_T3JUS } from "@t3jus/domain";

const MARINA = "1c8d4f1f-6e2b-4d3c-8f9a-2b3c4d5e6f70";
const AVISO = "7c3d4e5f-6a7b-4c8d-8e9f-1a2b3c4d5e6f";
const PORTAL = "https://portal.exemplo";

const DIA1: AvisoTesteGratis = {
  tipo: "TESTE_COMECOU", escritorio: "Ribeiro & Matos Advocacia", socio: "Marina Ribeiro", inicio: "2026-11-27", fim: "2026-12-03",
  hoje: "2026-11-27", totalDias: 7, faltamDias: 7, origem: "PRIMEIRO_ACESSO", implantacao: "Rafael Teles", primeiraCompetencia: "2027-01-01",
};
const texto = (a: Partial<AvisoTesteGratis>) => avisoTesteGratis({ ...DIA1, ...a }, PORTAL, "contato@exemplo.com.br");

Deno.test("CO-09: o e-mail do dia 1 diz até quando vai o teste e quem acompanha a implantação", () => {
  const e = texto({});
  assertEquals(e.assunto, "Seu teste grátis do T3jus vai até quinta-feira, 03/12");
  assertStringIncludes(e.texto, "Olá, Marina.");
  assertStringIncludes(e.texto, "O teste grátis da Ribeiro & Matos Advocacia começou hoje, no seu primeiro acesso. Ele vai até quinta-feira, 03/12: 7 dias, contando hoje.");
  assertStringIncludes(e.texto, "Nesses dias, a equipe do escritório usa o Portal inteiro, e nada é cobrado. Rafael Teles, da implantação do T3jus, acompanha vocês.");
  assertStringIncludes(e.texto, `Abrir o Portal: ${PORTAL}/`);
  assertStringIncludes(e.html, "Sete dias, contando hoje.");
  assertStringIncludes(e.html, "Ribeiro &amp; Matos Advocacia");
  assertEquals(e.responderPara, "contato@exemplo.com.br");
  const sem = texto({ implantacao: null, origem: "LIBERADO" });
  assert(!sem.texto.includes("implantação"), "sem quem cuide da implantação, a frase sai");
  assertStringIncludes(sem.texto, "começou hoje. Ele vai até");
});

Deno.test("CO-09: o e-mail do dia 5 conta os dias, a primeira fatura e o só consulta", () => {
  const e = texto({ tipo: "TESTE_ACABANDO", hoje: "2026-12-01", faltamDias: 3 });
  assertEquals(e.assunto, "Faltam 3 dias para o fim do seu teste no T3jus");
  assertStringIncludes(e.html, ">Seu teste vai até quinta-feira, 03/12<");
  assertStringIncludes(e.texto, "Nada é cobrado durante o teste. Com a assinatura, a primeira fatura é a de janeiro de 2027.");
  assertStringIncludes(e.texto, "a partir de 04/12, o Portal fica só para consulta");
  assertStringIncludes(e.texto, `Quero assinar: ${PORTAL}/meu-escritorio#plano`);
  assertEquals(texto({ tipo: "TESTE_ACABANDO", faltamDias: 2 }).assunto, "Faltam 2 dias para o fim do seu teste no T3jus");
});

Deno.test("CO-09: o e-mail do dia 7 é o do último dia, e quem já pediu pode desconsiderar", () => {
  const e = texto({ tipo: "TESTE_ULTIMO_DIA", hoje: "2026-12-03", faltamDias: 1 });
  assertEquals(e.assunto, "Hoje é o último dia do seu teste no T3jus");
  assertStringIncludes(e.texto, "Hoje, quinta-feira, 03/12, é o último dia do teste grátis da Ribeiro & Matos Advocacia. A partir de amanhã, 04/12, à 0h, o Portal fica só para consulta até a assinatura.");
  assertStringIncludes(e.texto, "Se já pediu para assinar, pode desconsiderar este e-mail");
});

Deno.test("CO-09: o e-mail do dia 8 diz que os dados estão guardados e como exportar", () => {
  const e = texto({ tipo: "TESTE_ACABOU", hoje: "2026-12-04", faltamDias: 0 });
  assertEquals(e.assunto, "O teste do T3jus terminou. Seus dados estão guardados");
  assertStringIncludes(e.texto, "terminou em 03/12. Desde hoje, o Portal está só para consulta");
  assertStringIncludes(e.texto, "Escritório › Exportar os dados");
  assertStringIncludes(texto({ tipo: "TESTE_ACABOU", hoje: "2026-12-05" }).texto, "Desde 04/12, o Portal está só para consulta");
});

Deno.test("CO-09: a rota da rotina manda os passos do teste com o texto do tipo e registra o envio", async () => {
  const mandados: MensagemEmail[] = [];
  let fila: unknown[] = [{ ...DIA1, tipo: "TESTE_ULTIMO_DIA", hoje: "2026-12-03", id: AVISO, paraPessoaId: MARINA }];
  const db = bancoFalso({
    rotina_contrato_avisos_pendentes: () => {
      const r = fila;
      fila = [];
      return r;
    },
    rotina_contrato_aviso_registrar: () => null,
  });
  const app = criarApiConsole("segredo-de-repasse-de-teste", {
    banco: db.banco, auth: authFalso([]).auth, admin: adminFalso({ "marina@ribeiromatos.adv.br": MARINA }).admin,
    urlApp: "https://console.exemplo", urlPortal: PORTAL, arquivos: arquivosFalsos().arquivos,
    emails: { enviar: (m) => { mandados.push(m); return Promise.resolve(); } },
  });
  const r = await pedido(app, "api-console")("/v1/rotina/avisos-fim-contrato", { corpo: {} });
  assertEquals(await r.json(), { enviados: 1, falhas: 0 });
  assertEquals(mandados[0]!.para, "marina@ribeiromatos.adv.br");
  assertEquals(mandados[0]!.assunto, "Hoje é o último dia do seu teste no T3jus");
  assertEquals(mandados[0]!.responderPara, CONTATO_T3JUS);
  assertEquals(db.chamadas.find((c) => c.funcao === "rotina_contrato_aviso_registrar")?.args, { p_id: AVISO, p_enviado: true });
});
