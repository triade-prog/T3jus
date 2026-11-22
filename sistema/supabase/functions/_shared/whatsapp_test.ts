// A Cloud API do WhatsApp (F0.21): o corpo da chamada, os campos do aviso tirados do texto e o
// que cada erro da Meta quer dizer. As respostas seguem o formato da documentação da Meta; a
// Meta de verdade só entra quando o T3jus for parceiro de tecnologia (F3.58).
import { assert, assertEquals, assertRejects } from "@std/assert";
import { camposDoModelo, classificarErro, corpoDaMensagem, ErroMeta, whatsappCloud } from "./whatsapp.ts";

const LEMBRETE = "Olá, {nome}. Aqui é do escritório {nome do escritório}. Lembrete: {compromisso}, no dia {data}, às {hora}. Local: {local}. Responda CONFIRMO, ou escreva se tiver alguma dúvida.";
const TEXTO = "Olá, Marta. Aqui é do escritório Ribeiro & Matos. Lembrete: Audiência de conciliação, no dia 25/11/2026, às 14:00. Local: Fórum de Pinheiros, sala 3. Responda CONFIRMO, ou escreva se tiver alguma dúvida.";

Deno.test("F0.21: os campos do aviso saem do texto da fila, na ordem do texto aprovado", () => {
  assertEquals(camposDoModelo(LEMBRETE, TEXTO),
    ["Marta", "Ribeiro & Matos", "Audiência de conciliação", "25/11/2026", "14:00", "Fórum de Pinheiros, sala 3"]);
});

Deno.test("F0.21: texto que não bate com o aviso não vira aviso", () => {
  assertEquals(camposDoModelo(LEMBRETE, "Olá, Marta. Outra coisa."), null);
  assertEquals(camposDoModelo("Sem campos aqui, só texto fixo.", "Sem campos aqui, só texto fixo."), []);
  assertEquals(camposDoModelo("Sem campos aqui, só texto fixo.", "Outro texto."), null);
});

Deno.test("F0.21: campo com quebra de linha vira uma linha só (regra da Meta)", () => {
  const etapa = "Olá, {nome}. Novidade no caso {caso}: {texto da etapa} Qualquer dúvida, é só responder esta mensagem.";
  const texto = "Olá, Hélio. Novidade no caso 0001/2026: A perícia foi marcada.\nLevar os exames.    Obrigado. Qualquer dúvida, é só responder esta mensagem.";
  assertEquals(camposDoModelo(etapa, texto), ["Hélio", "0001/2026", "A perícia foi marcada. Levar os exames.   Obrigado."]);
});

Deno.test("F0.21: na janela sai texto livre; com PDF, documento com legenda", () => {
  assertEquals(corpoDaMensagem({ numeroId: "1098", para: "5511996027736", texto: "Bom dia!" }), {
    messaging_product: "whatsapp", recipient_type: "individual", to: "5511996027736",
    type: "text", text: { body: "Bom dia!", preview_url: true },
  });
  assertEquals(corpoDaMensagem({
    numeroId: "1098", para: "5511996027736", texto: "Segue o carnê.",
    anexo: { nome: "carne.pdf", tipo: "DOCUMENTO", link: "https://storage.exemplo/ler/x" },
  }), {
    messaging_product: "whatsapp", recipient_type: "individual", to: "5511996027736",
    type: "document", document: { link: "https://storage.exemplo/ler/x", filename: "carne.pdf", caption: "Segue o carnê." },
  });
});

Deno.test("F0.21: fora da janela sai o aviso aprovado, com os campos e o PDF no cabeçalho", () => {
  assertEquals(corpoDaMensagem({
    numeroId: "1098", para: "5511996027736", texto: "…",
    anexo: { nome: "recibo-2026-0007.pdf", tipo: "DOCUMENTO", link: "https://storage.exemplo/ler/r" },
    modelo: { nome: "t3jus_recibo_pagamento", idioma: "pt_BR", parametros: ["Marta", "Ribeiro & Matos"] },
  }), {
    messaging_product: "whatsapp", recipient_type: "individual", to: "5511996027736", type: "template",
    template: {
      name: "t3jus_recibo_pagamento", language: { code: "pt_BR" },
      components: [
        { type: "header", parameters: [{ type: "document", document: { link: "https://storage.exemplo/ler/r", filename: "recibo-2026-0007.pdf" } }] },
        { type: "body", parameters: [{ type: "text", text: "Marta" }, { type: "text", text: "Ribeiro & Matos" }] },
      ],
    },
  });
});

Deno.test("F0.21: erro passageiro tenta de novo; definitivo para com o motivo simples", () => {
  const limite = classificarErro(400, { code: 130429, message: "Rate limit hit" });
  assertEquals([limite.passageira, limite.motivo], [true, "A Meta pediu para esperar: muitas mensagens de uma vez"]);
  assertEquals(classificarErro(503, null).passageira, true);
  assertEquals(classificarErro(400, { code: 131016 }).passageira, true);
  const semWhats = classificarErro(400, { code: 131026 });
  assertEquals([semWhats.passageira, semWhats.motivo], [false, "O número do cliente não recebe mensagens pelo WhatsApp"]);
  assertEquals(classificarErro(400, { code: 132001 }).motivo, "O aviso não existe na Meta com este nome");
  assertEquals(classificarErro(400, { code: 132999 }).motivo, "A Meta recusou o aviso");
  assertEquals(classificarErro(400, { code: 100 }).motivo, "A Meta recusou a mensagem (código 100)");
  const token = classificarErro(401, { code: 190 });
  assertEquals([token.passageira, token.motivo], [true, "A ligação do WhatsApp do escritório com a Meta precisa ser refeita"]);
});

Deno.test("F0.21: a chamada vai ao número do escritório, com o token, e devolve o id da Meta", async () => {
  const chamadas: { url: string; init: RequestInit }[] = [];
  const cloud = whatsappCloud("v23.0", (url, init) => {
    chamadas.push({ url: String(url), init: init! });
    return Promise.resolve(Response.json({ messaging_product: "whatsapp", contacts: [{ wa_id: "5511996027736" }], messages: [{ id: "wamid.HBgN" }] }));
  });
  assertEquals(await cloud.enviar("token-falso", { numeroId: "1098", para: "5511996027736", texto: "Oi" }), "wamid.HBgN");
  assertEquals(chamadas[0]!.url, "https://graph.facebook.com/v23.0/1098/messages");
  assertEquals(new Headers(chamadas[0]!.init.headers).get("authorization"), "Bearer token-falso");
});

Deno.test("F0.21: erro da Meta e falta de rede viram ErroMeta", async () => {
  const recusa = whatsappCloud("v23.0", () =>
    Promise.resolve(Response.json({ error: { message: "(#131026) Message undeliverable", type: "OAuthException", code: 131026 } }, { status: 400 })));
  const e = await assertRejects(() => recusa.enviar("t", { numeroId: "1", para: "55", texto: "Oi" }), ErroMeta);
  assertEquals([e.codigo, e.passageira], ["131026", false]);
  const semRede = whatsappCloud("v23.0", () => Promise.reject(new TypeError("conexão recusada")));
  const r = await assertRejects(() => semRede.enviar("t", { numeroId: "1", para: "55", texto: "Oi" }), ErroMeta);
  assert(r.passageira);
});
