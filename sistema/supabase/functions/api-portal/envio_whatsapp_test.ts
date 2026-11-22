// A rota da entrega do WhatsApp (F0.21): desligada, nada sai e nada muda na fila; ligada, cada
// mensagem do lote sai pela Meta (aqui, uma Meta falsa) e o resultado volta ao banco.
import { assertEquals } from "@std/assert";
import { criarApiPortal } from "./app.ts";
import { adminFalso, arquivosFalsos, authFalso, bancoFalso, pedido } from "../_shared/teste_util.ts";
import { ErroMeta, type EnvioWhatsapp } from "../_shared/whatsapp.ts";
import type { EntregaWhatsapp } from "./envio_whatsapp.ts";

const RM = "5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const M1 = "7c3d4e5f-6a7b-4c8d-8e9f-1a2b3c4d5e61";
const M2 = "7c3d4e5f-6a7b-4c8d-8e9f-1a2b3c4d5e62";
const M3 = "7c3d4e5f-6a7b-4c8d-8e9f-1a2b3c4d5e63";
const M4 = "7c3d4e5f-6a7b-4c8d-8e9f-1a2b3c4d5e64";

const LEMBRETE = "Olá, {nome}. Lembrete: {compromisso}, no dia {data}.";

const LOTE = [
  { id: M1, escritorioId: RM, numeroId: "1098", tokenRef: null, para: "5511996027736", texto: "Ainda não, avisamos.", anexo: null, modelo: null },
  { id: M2, escritorioId: RM, numeroId: "1098", tokenRef: null, para: "5511996027736",
    texto: "Olá, Marta. Lembrete: Audiência, no dia 25/11.", anexo: null,
    modelo: { nome: "t3jus_lembrete_audiencia", idioma: "pt_BR", texto: LEMBRETE } },
  { id: M3, escritorioId: RM, numeroId: "1098", tokenRef: null, para: "5511996027700", texto: "Oi", anexo: null, modelo: null },
  { id: M4, escritorioId: RM, numeroId: "1098", tokenRef: null, para: "5511996027736", texto: "Segue o recibo.",
    anexo: { nome: "recibo.pdf", tipo: "DOCUMENTO", caminho: `${RM}/recibos/x.pdf` }, modelo: null },
];

function montar(whatsapp: EntregaWhatsapp | null, falhaRegistro = false) {
  const registros: Record<string, unknown>[] = [];
  let fila: unknown[] = [...LOTE];
  const db = bancoFalso({
    rotina_whatsapp_pendentes: () => {
      const r = fila;
      fila = [];
      return r;
    },
    rotina_whatsapp_registrar: (a) => {
      if (falhaRegistro) throw new Error("banco fora");
      registros.push(a);
      return a.p_enviado ? "ENVIADA" : a.p_passageira ? "NA_FILA" : "FALHOU";
    },
  });
  const storage = arquivosFalsos();
  const app = criarApiPortal("segredo-de-repasse-de-teste", {
    banco: db.banco, auth: authFalso([]).auth, urlApp: "https://portal.exemplo", admin: adminFalso().admin, arquivos: storage.arquivos,
    senhaVazada: () => Promise.resolve(false), whatsapp,
  });
  return { pedir: pedido(app, "api-portal"), registros, storage, ...db };
}

function metaFalsa() {
  const mandados: EnvioWhatsapp[] = [];
  const entrega: EntregaWhatsapp = {
    tokenDe: () => Promise.resolve("token-falso"),
    cloud: {
      enviar: (_token, e) => {
        mandados.push(e);
        if (e.para === "5511996027700") return Promise.reject(new ErroMeta("131026", false, "O número do cliente não recebe mensagens pelo WhatsApp"));
        return Promise.resolve(`wamid.${mandados.length}`);
      },
    },
  };
  return { entrega, mandados };
}

Deno.test("F0.21: desligada, a rota não pede o lote e nada muda", async () => {
  const m = montar(null);
  const r = await m.pedir("/v1/rotina/whatsapp-envios", { corpo: {} });
  assertEquals(await r.json(), { ligado: false, enviadas: 0, novamente: 0, falhas: 0 });
  assertEquals(m.chamadas.length, 0);
});

Deno.test("F0.21: sem o segredo do repasse, a rota não abre", async () => {
  const m = montar(metaFalsa().entrega);
  assertEquals((await m.pedir("/v1/rotina/whatsapp-envios", { corpo: {}, segredo: null })).status, 403);
  assertEquals(m.chamadas.length, 0);
});

Deno.test("F0.21: ligada, cada mensagem sai e o resultado volta ao banco", async () => {
  const meta = metaFalsa();
  const m = montar(meta.entrega);
  const r = await m.pedir("/v1/rotina/whatsapp-envios", { corpo: {} });
  assertEquals(await r.json(), { ligado: true, enviadas: 3, novamente: 0, falhas: 1 });
  // Texto livre, aviso com os campos e o PDF pelo link temporário.
  assertEquals(meta.mandados[0]!.modelo, null);
  assertEquals(meta.mandados[1]!.modelo, { nome: "t3jus_lembrete_audiencia", idioma: "pt_BR", parametros: ["Marta", "Audiência", "25/11"] });
  assertEquals(meta.mandados[3]!.anexo, { nome: "recibo.pdf", tipo: "DOCUMENTO", link: `https://storage.exemplo/ler/${RM}/recibos/x.pdf?token=curto` });
  assertEquals(m.storage.leituras, [{ caminho: `${RM}/recibos/x.pdf`, segundos: 3600, nome: "recibo.pdf" }]);
  assertEquals(m.registros[0], { p_escritorio: RM, p_mensagem: M1, p_enviado: true, p_meta_id: "wamid.1" });
  assertEquals(m.registros[2], {
    p_escritorio: RM, p_mensagem: M3, p_enviado: false, p_motivo: "O número do cliente não recebe mensagens pelo WhatsApp",
    p_erro: "131026", p_passageira: false,
  });
});

Deno.test("F0.21: sem token, a mensagem volta para a fila (falha passageira)", async () => {
  const meta = metaFalsa();
  const m = montar({ ...meta.entrega, tokenDe: () => Promise.resolve(null) });
  assertEquals(await (await m.pedir("/v1/rotina/whatsapp-envios", { corpo: {} })).json(), { ligado: true, enviadas: 0, novamente: 4, falhas: 0 });
  assertEquals(meta.mandados.length, 0);
  assertEquals(m.registros[0]!.p_erro, "SEM_TOKEN");
});

Deno.test("F0.21: texto que não bate com o aviso aprovado não sai", async () => {
  const meta = metaFalsa();
  const m = montar(meta.entrega);
  const outro = [{ ...LOTE[1]!, texto: "Outro texto qualquer." }];
  m.chamadas.length = 0;
  const db = bancoFalso({ rotina_whatsapp_pendentes: () => outro, rotina_whatsapp_registrar: (a) => (m.registros.push(a), "FALHOU") });
  const app = criarApiPortal("segredo-de-repasse-de-teste", {
    banco: db.banco, auth: authFalso([]).auth, urlApp: "https://portal.exemplo", admin: adminFalso().admin, arquivos: arquivosFalsos().arquivos,
    senhaVazada: () => Promise.resolve(false), whatsapp: meta.entrega,
  });
  assertEquals(await (await pedido(app, "api-portal")("/v1/rotina/whatsapp-envios", { corpo: {} })).json(), { ligado: true, enviadas: 0, novamente: 0, falhas: 1 });
  assertEquals(meta.mandados.length, 0);
  assertEquals(m.registros[0]!.p_motivo, "A mensagem não bate com o texto do aviso aprovado");
});

Deno.test("F0.21: se o registro falha depois de sair, conta como enviada (não manda de novo nesta chamada)", async () => {
  const meta = metaFalsa();
  const m = montar(meta.entrega, true);
  const r = await (await m.pedir("/v1/rotina/whatsapp-envios", { corpo: {} })).json();
  assertEquals(r.enviadas, 3);
  assertEquals(meta.mandados.length, 4);
});
