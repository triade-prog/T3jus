// Meio de pagamento da cobrança (F1.21, CO-06): a rota da rotina emite e cancela o que o banco
// listou; o aviso do meio de pagamento só dá baixa depois de ler a cobrança de novo lá.
import { assertEquals } from "@std/assert";
import { criarApiConsole } from "./app.ts";
import { adminFalso, arquivosFalsos, authFalso, bancoFalso, pedido } from "../_shared/teste_util.ts";
import { meioInter, type MeioPagamento, type SituacaoCobranca } from "../_shared/pagamento.ts";

const FATURA = "6b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e";
const PARCELA = "8d4e5f6a-7b8c-4d9e-8f0a-1b2c3d4e5f6a";
const PEDIDO = {
  acao: "EMITIR_FATURA", id: FATURA, pagamentoId: null, provedor: "falso", valorCentavos: 43100, vencimento: "2026-12-10",
  descricao: "T3jus · fatura de dezembro de 2026", pagador: { nome: "Cedro & Lima Advocacia", cnpj: "12345678000190", email: "financeiro@cedrolima.exemplo.com.br" },
};

function meioFalso(situacoes: Record<string, SituacaoCobranca> = {}, falhar = false) {
  const feitos: string[] = [];
  const meio: MeioPagamento = {
    nome: "falso",
    emitir: (p) => {
      if (falhar) return Promise.reject(new Error("fora do ar"));
      feitos.push(`emitir ${p.id}`);
      return Promise.resolve({ pagamentoId: "cob-1", pixCopiaCola: "000201...", linhaBoleto: "07790...", codigoBarras: null, boletoUrl: null });
    },
    cancelar: (id) => (feitos.push(`cancelar ${id}`), Promise.resolve()),
    consultar: (id) => Promise.resolve(situacoes[id] ?? { pagamentoId: id, situacao: "A_PAGAR" }),
    codigosDoAviso: (r, corpo) => new URL(r.url).searchParams.get("chave") === "certa" ? (corpo as { codigo: string }[]).map((x) => x.codigo) : null,
  };
  return { meio, feitos };
}

function montar(meio?: MeioPagamento, fila: unknown[] = []) {
  const db = bancoFalso({
    rotina_cobranca_codigos_pendentes: () => fila,
    rotina_cobranca_codigos_gravar: () => null,
    cobranca_baixa_automatica: (a) => ({ resultado: a.p_pagamento_id === "cob-repetida" ? "JA_PAGA" : "PAGA" }),
    rotina_cobranca_envios_pendentes: () => [],
  });
  const app = criarApiConsole("segredo-de-repasse-de-teste", {
    banco: db.banco, auth: authFalso([]).auth, admin: adminFalso().admin,
    urlApp: "https://console.exemplo", urlPortal: "https://portal.exemplo", arquivos: arquivosFalsos().arquivos,
    emails: { enviar: () => Promise.resolve() }, pagamento: meio,
  });
  return { pedir: pedido(app, "api-console"), ...db };
}

Deno.test("F1.21: sem meio de pagamento ligado, a rotina não pede nada ao banco e o aviso não existe", async () => {
  const m = montar();
  assertEquals(await (await m.pedir("/v1/rotina/cobranca-codigos", { corpo: {} })).json(), { emitidas: 0, canceladas: 0, falhas: 0 });
  assertEquals(m.chamadas.length, 0);
  assertEquals((await m.pedir("/v1/pagamento/aviso?chave=certa", { corpo: [], segredo: null })).status, 404);
});

Deno.test("F1.21: a rotina emite o que o banco listou, grava os códigos e cancela a cobrança da fatura cancelada", async () => {
  const { meio, feitos } = meioFalso();
  const m = montar(meio, [PEDIDO, { acao: "CANCELAR_PARCELA", id: PARCELA, pagamentoId: "cob-velha", provedor: "falso" }]);
  assertEquals((await m.pedir("/v1/rotina/cobranca-codigos", { corpo: {}, segredo: null })).status, 403);
  assertEquals(await (await m.pedir("/v1/rotina/cobranca-codigos", { corpo: {} })).json(), { emitidas: 1, canceladas: 1, falhas: 0 });
  assertEquals(feitos, [`emitir ${FATURA}`, "cancelar cob-velha"]);
  const gravados = m.chamadas.filter((c) => c.funcao === "rotina_cobranca_codigos_gravar").map((c) => c.args);
  assertEquals(gravados[0], { p_acao: "EMITIR_FATURA", p_id: FATURA, p_provedor: "falso",
    p_dados: { pagamentoId: "cob-1", pixCopiaCola: "000201...", linhaBoleto: "07790...", codigoBarras: null, boletoUrl: null } });
  assertEquals(gravados[1], { p_acao: "CANCELAR_PARCELA", p_id: PARCELA, p_provedor: "falso", p_dados: {} });
});

Deno.test("F1.21: se o meio de pagamento falha, nada é gravado e a próxima rodada tenta de novo", async () => {
  const { meio } = meioFalso({}, true);
  const m = montar(meio, [PEDIDO]);
  assertEquals(await (await m.pedir("/v1/rotina/cobranca-codigos", { corpo: {} })).json(), { emitidas: 0, canceladas: 0, falhas: 1 });
  assertEquals(m.chamadas.some((c) => c.funcao === "rotina_cobranca_codigos_gravar"), false);
});

Deno.test("F1.21: o aviso só dá baixa no que a leitura lá diz que foi pago, e chave errada é recusada", async () => {
  const { meio } = meioFalso({
    "cob-1": { pagamentoId: "cob-1", situacao: "PAGA", pagoEm: "2026-12-08", valorPagoCentavos: 43100, forma: "PIX" },
  });
  const m = montar(meio);
  assertEquals((await m.pedir("/v1/pagamento/aviso?chave=errada", { corpo: [{ codigo: "cob-1" }], segredo: null })).status, 403);
  const r = await m.pedir("/v1/pagamento/aviso?chave=certa", { corpo: [{ codigo: "cob-1" }, { codigo: "cob-2" }], segredo: null });
  assertEquals(await r.json(), { recebidos: 2, pagas: 1 });
  const baixas = m.chamadas.filter((c) => c.funcao === "cobranca_baixa_automatica").map((c) => c.args);
  assertEquals(baixas, [{ p_provedor: "falso", p_pagamento_id: "cob-1", p_pago_em: "2026-12-08", p_valor_centavos: 43100, p_forma: "PIX" }]);
});

Deno.test("F1.21: peça do Inter: token, emissão do boleto com Pix, leitura do pagamento e chave do aviso", async () => {
  const chamadas: { metodo: string; url: string; corpo?: unknown }[] = [];
  const buscar: typeof fetch = (url, init) => {
    const u = String(url);
    chamadas.push({ metodo: init?.method ?? "GET", url: u, corpo: typeof init?.body === "string" ? JSON.parse(init.body) : undefined });
    const json = (v: unknown) => Promise.resolve(new Response(JSON.stringify(v), { status: 200 }));
    if (u.endsWith("/oauth/v2/token")) return json({ access_token: "tk", expires_in: 3600 });
    if (u.endsWith("/cobranca/v3/cobrancas") && init?.method === "POST") return json({ codigoSolicitacao: "abc-123" });
    if (u.endsWith("/cobranca/v3/cobrancas/abc-123")) {
      return json({ cobranca: { situacao: "RECEBIDO", valorTotalRecebido: "431.00", dataSituacao: "2026-12-08", origemRecebimento: "PIX" },
        boleto: { linhaDigitavel: "07790001", codigoBarras: "0779" }, pix: { pixCopiaECola: "000201abc" } });
    }
    return Promise.resolve(new Response("", { status: 404 }));
  };
  const inter = meioInter({ clientId: "id", clientSecret: "s", chaveAviso: "certa", conta: "123" }, buscar);
  const semEndereco = await inter.emitir(PEDIDO as never).catch((e) => e.detalhes?.motivo);
  assertEquals(semEndereco, "PAGADOR_SEM_ENDERECO");
  const pedido = { ...PEDIDO, pagador: { ...PEDIDO.pagador, endereco: { logradouro: "Rua das Flores", numero: "10", cidade: "Salvador", uf: "BA", cep: "40000-000" } } };
  const r = await inter.emitir(pedido as never);
  assertEquals(r, { pagamentoId: "abc-123", pixCopiaCola: "000201abc", linhaBoleto: "07790001", codigoBarras: "0779", boletoUrl: null });
  const emissao = chamadas.find((c) => c.metodo === "POST" && c.url.endsWith("/cobrancas"))!.corpo as Record<string, unknown>;
  assertEquals(emissao.valorNominal, 431);
  assertEquals(emissao.seuNumero, "T3F6b2c3d4e5f6a");
  assertEquals(chamadas.filter((c) => c.url.endsWith("/oauth/v2/token")).length, 1);
  assertEquals(await inter.consultar("abc-123"), { pagamentoId: "abc-123", situacao: "PAGA", pagoEm: "2026-12-08", valorPagoCentavos: 43100, forma: "PIX" });
  assertEquals(inter.codigosDoAviso(new Request("https://x/aviso?chave=certa"), [{ codigoSolicitacao: "abc-123" }]), ["abc-123"]);
  assertEquals(inter.codigosDoAviso(new Request("https://x/aviso?chave=outra"), [{ codigoSolicitacao: "abc-123" }]), null);
});
