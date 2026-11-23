// Fim da guarda (F0.15): a rota da rotina apaga as pastas que o banco pôs na fila e conta o
// que fez; a limpeza do Storage nunca apaga fora da pasta do escritório.
// Exclusão a pedido do titular (F3.141): a mesma rota apaga, depois das pastas, os arquivos um a
// um da fila arquivos_apagar, só pelos caminhos exatos e só nos dois formatos.
import { assertEquals, assertRejects } from "@std/assert";
import { criarApiConsole } from "./app.ts";
import { caminhoValido, storageLimpeza, type LimpezaArquivos } from "../_shared/guarda.ts";
import { adminFalso, arquivosFalsos, authFalso, bancoFalso, pedido } from "../_shared/teste_util.ts";

const CEDRO = "7d1e2f3a-4b5c-4d6e-8f7a-9b0c1d2e3f4a";
const FILA = [
  { id: "f1", escritorioId: CEDRO, bucket: "documentos-console" },
  { id: "f2", escritorioId: CEDRO, bucket: "documentos-portal" },
];

type Objeto = { id: string; bucket: string; caminho: string };

function montar(
  limpeza: LimpezaArquivos | undefined,
  fila: typeof FILA | { id: string; escritorioId: string; bucket: string }[] = FILA,
  extra: Record<string, (a: Record<string, unknown>) => unknown> = {},
) {
  const db = bancoFalso({ rotina_guarda_arquivos_pendentes: () => fila, rotina_guarda_arquivos_registrar: () => null, ...extra });
  const app = criarApiConsole("segredo-de-repasse-de-teste", {
    banco: db.banco, auth: authFalso([]).auth, admin: adminFalso().admin, urlApp: "https://console.exemplo", urlPortal: "https://portal.exemplo",
    arquivos: arquivosFalsos().arquivos, limpeza,
  });
  return { pedir: pedido(app, "api-console"), ...db };
}

Deno.test("F0.15: a rota apaga as pastas da fila e conta o que fez, sem pedir sessão", async () => {
  const pedidos: string[] = [];
  const m = montar({
    apagarObjetos: () => Promise.resolve({ apagados: 0 }),
    apagarPasta: (bucket, pasta) => {
      pedidos.push(`${bucket}:${pasta}`);
      return Promise.resolve(bucket === "documentos-console" ? { apagados: 3, restam: false } : { apagados: 1000, restam: true });
    },
  });
  const r = await m.pedir("/v1/rotina/arquivos-da-guarda", { corpo: {} });
  assertEquals(await r.json(), { pastas: 2, concluidas: 1, apagados: 1003, objetos: 0, objetosApagados: 0 });
  assertEquals(pedidos, [`documentos-console:${CEDRO}`, `documentos-portal:${CEDRO}`]);
  assertEquals(m.chamadas.filter((c) => c.funcao === "rotina_guarda_arquivos_registrar").map((c) => c.args), [
    { p_id: "f1", p_apagados: 3, p_concluido: true },
    { p_id: "f2", p_apagados: 1000, p_concluido: false },
  ]);
});

Deno.test("F0.15: a falha do Storage fica na fila, para a próxima vez", async () => {
  const m = montar({ apagarPasta: () => Promise.reject(new Error("Storage respondeu 503")), apagarObjetos: () => Promise.resolve({ apagados: 0 }) },
    [FILA[0]!]);
  const r = await m.pedir("/v1/rotina/arquivos-da-guarda", { corpo: {} });
  assertEquals(await r.json(), { pastas: 1, concluidas: 0, apagados: 0, objetos: 0, objetosApagados: 0 });
  assertEquals(m.chamadas.find((c) => c.funcao === "rotina_guarda_arquivos_registrar")!.args,
    { p_id: "f1", p_apagados: 0, p_concluido: false, p_erro: "Storage respondeu 503" });
});

Deno.test("F0.15: pasta que não é de escritório não se apaga", async () => {
  const pedidos: string[] = [];
  const m = montar({ apagarPasta: (b, p) => (pedidos.push(`${b}:${p}`), Promise.resolve({ apagados: 0, restam: false })), apagarObjetos: () => Promise.resolve({ apagados: 0 }) },
    [{ id: "f9", escritorioId: "", bucket: "documentos-portal" }]);
  await m.pedir("/v1/rotina/arquivos-da-guarda", { corpo: {} });
  assertEquals(pedidos, []);
  assertEquals(m.chamadas.find((c) => c.funcao === "rotina_guarda_arquivos_registrar")!.args.p_erro, "Pasta inválida");
});

Deno.test("F0.15: o Storage lista as subpastas e apaga em lote só dentro da pasta", async () => {
  const objetos = [`${CEDRO}/a`, `${CEDRO}/peticoes/v1.docx`, `${CEDRO}/peticoes/modelos/m1.docx`];
  const apagados: string[][] = [];
  const buscar = ((url: string, init: RequestInit) => {
    const corpo = JSON.parse(String(init.body));
    if (url.includes("/object/list/")) {
      const prefixo = `${corpo.prefix}/`;
      const filhos = new Map<string, boolean>();
      for (const o of objetos) {
        if (!o.startsWith(prefixo)) continue;
        const resto = o.slice(prefixo.length);
        filhos.set(resto.split("/")[0]!, !resto.includes("/"));
      }
      return Promise.resolve(Response.json([...filhos].map(([name, arquivo]) => ({ name, id: arquivo ? `id-${name}` : null }))));
    }
    apagados.push(corpo.prefixes);
    return Promise.resolve(Response.json([]));
  }) as unknown as typeof fetch;
  const l = storageLimpeza("https://projeto.exemplo", "chave", buscar);
  assertEquals(await l.apagarPasta("documentos-portal", CEDRO, 1000), { apagados: 3, restam: false });
  assertEquals(apagados.flat().sort(), [...objetos].sort());
  assertEquals(await l.apagarPasta("documentos-portal", CEDRO, 2), { apagados: 2, restam: true });
  await assertRejects(() => l.apagarPasta("documentos-portal", "", 1000), Error, "Pasta inválida");
});

// ---------------------------------------------------------------------------------------
// F3.141: os arquivos da exclusão a pedido do titular.

const RG = `${CEDRO}/0b6f1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d`;
const DOCX = `${CEDRO}/propostas/1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d-v3.docx`;
const OBJETOS: Objeto[] = [
  { id: "a1", bucket: "documentos-portal", caminho: RG },
  { id: "a2", bucket: "documentos-portal", caminho: DOCX },
];

function limpezaFalsa(objetos: (b: string, c: string[]) => Promise<{ apagados: number }>, ordem: string[] = []): LimpezaArquivos {
  return {
    apagarPasta: (b, p) => (ordem.push(`pasta ${b}:${p}`), Promise.resolve({ apagados: 1, restam: false })),
    apagarObjetos: (b, c) => (ordem.push(`objetos ${b}`), objetos(b, c)),
  };
}

Deno.test("PT-11: a rota apaga os arquivos da fila depois das pastas e registra os ids", async () => {
  const ordem: string[] = [];
  const pedidos: string[][] = [];
  const m = montar(limpezaFalsa((_, c) => (pedidos.push(c), Promise.resolve({ apagados: 1 })), ordem), [FILA[0]!], {
    rotina_arquivos_apagar_pendentes: () => OBJETOS,
    rotina_arquivos_apagar_registrar: () => 2,
  });
  const r = await m.pedir("/v1/rotina/arquivos-da-guarda", { corpo: {} });
  assertEquals(await r.json(), { pastas: 1, concluidas: 1, apagados: 1, objetos: 2, objetosApagados: 1 });
  assertEquals(ordem, [`pasta documentos-console:${CEDRO}`, "objetos documentos-portal"]);
  assertEquals(pedidos, [[RG, DOCX]]);
  assertEquals(m.chamadas.find((c) => c.funcao === "rotina_arquivos_apagar_pendentes")!.args, { p_limite: 500 });
  assertEquals(m.chamadas.filter((c) => c.funcao === "rotina_arquivos_apagar_registrar").map((c) => c.args), [{ p_ids: ["a1", "a2"] }]);
});

Deno.test("PT-11: a falha do Storage nos arquivos fica na fila com o erro e não atrapalha as pastas", async () => {
  const m = montar(limpezaFalsa(() => Promise.reject(new Error("Storage respondeu 503"))), [FILA[0]!], {
    rotina_arquivos_apagar_pendentes: () => OBJETOS,
    rotina_arquivos_apagar_registrar: () => 0,
  });
  const r = await m.pedir("/v1/rotina/arquivos-da-guarda", { corpo: {} });
  assertEquals(await r.json(), { pastas: 1, concluidas: 1, apagados: 1, objetos: 2, objetosApagados: 0 });
  assertEquals(m.chamadas.filter((c) => c.funcao === "rotina_arquivos_apagar_registrar").map((c) => c.args),
    [{ p_ids: ["a1", "a2"], p_erro: "Storage respondeu 503" }]);
  assertEquals(m.chamadas.find((c) => c.funcao === "rotina_guarda_arquivos_registrar")!.args, { p_id: "f1", p_apagados: 1, p_concluido: true });
});

Deno.test("PT-11: a falha das pastas não atrapalha os arquivos", async () => {
  const m = montar(limpezaFalsa(() => Promise.resolve({ apagados: 2 })), [FILA[0]!], {
    rotina_guarda_arquivos_pendentes: () => {
      throw new Error("banco fora");
    },
    rotina_arquivos_apagar_pendentes: () => OBJETOS,
    rotina_arquivos_apagar_registrar: () => 2,
  });
  const r = await m.pedir("/v1/rotina/arquivos-da-guarda", { corpo: {} });
  assertEquals(await r.json(), { pastas: 0, concluidas: 0, apagados: 0, objetos: 2, objetosApagados: 2 });
});

Deno.test("PT-11: caminho inválido ou de outro bucket nunca vai ao Storage e fica registrado", async () => {
  const pedidos: string[][] = [];
  const fila: Objeto[] = [
    { id: "x1", bucket: "documentos-portal", caminho: `${CEDRO}/../outro/arquivo` },
    { id: "x2", bucket: "documentos-portal", caminho: `${CEDRO}/peticoes/p.docx` },
    { id: "x3", bucket: "documentos-console", caminho: RG },
    { id: "x4", bucket: "documentos-portal", caminho: `${CEDRO}/` },
    { id: "a1", bucket: "documentos-portal", caminho: RG },
  ];
  const m = montar(limpezaFalsa((_, c) => (pedidos.push(c), Promise.resolve({ apagados: 1 }))), [], {
    rotina_arquivos_apagar_pendentes: () => fila,
    rotina_arquivos_apagar_registrar: () => 0,
  });
  const r = await m.pedir("/v1/rotina/arquivos-da-guarda", { corpo: {} });
  assertEquals((await r.json()).objetos, 5);
  assertEquals(pedidos, [[RG]]);
  assertEquals(m.chamadas.filter((c) => c.funcao === "rotina_arquivos_apagar_registrar").map((c) => c.args), [
    { p_ids: ["x1", "x2", "x3", "x4"], p_erro: "Caminho inválido" },
    { p_ids: ["a1"] },
  ]);
});

Deno.test("PT-11: sem a 0970 no banco, o passo dos arquivos devolve 0 e a rota responde 200", async () => {
  const m = montar(limpezaFalsa(() => Promise.resolve({ apagados: 9 })), [FILA[0]!]);
  const r = await m.pedir("/v1/rotina/arquivos-da-guarda", { corpo: {} });
  assertEquals(r.status, 200);
  assertEquals(await r.json(), { pastas: 1, concluidas: 1, apagados: 1, objetos: 0, objetosApagados: 0 });
});

Deno.test("PT-11: sem limpeza configurada, a rota responde com as cinco contagens em zero", async () => {
  const m = montar(undefined);
  const r = await m.pedir("/v1/rotina/arquivos-da-guarda", { corpo: {} });
  assertEquals(await r.json(), { pastas: 0, concluidas: 0, apagados: 0, objetos: 0, objetosApagados: 0 });
});

Deno.test("PT-11: a rota é pública e ignora o corpo: caminhos mandados no pedido não são apagados", async () => {
  const pedidos: string[][] = [];
  const m = montar(limpezaFalsa((_, c) => (pedidos.push(c), Promise.resolve({ apagados: 1 }))), [], {
    rotina_arquivos_apagar_pendentes: () => [],
    rotina_arquivos_apagar_registrar: () => 0,
  });
  const r = await m.pedir("/v1/rotina/arquivos-da-guarda", { corpo: { caminhos: [RG], ids: ["a1"], bucket: "documentos-portal" } });
  assertEquals(await r.json(), { pastas: 0, concluidas: 0, apagados: 0, objetos: 0, objetosApagados: 0 });
  assertEquals(pedidos, []);
  assertEquals(m.chamadas.find((c) => c.funcao === "rotina_arquivos_apagar_pendentes")!.args, { p_limite: 500 });
  assertEquals(m.chamadas.some((c) => c.funcao === "rotina_arquivos_apagar_registrar"), false);
});

Deno.test("PT-11: o Storage apaga os arquivos por nome exato, em lotes de até 1.000, e o erro HTTP vira exceção", async () => {
  const corpos: { url: string; metodo: string; nomes: string[] }[] = [];
  let status = 200;
  const buscar = ((url: string, init: RequestInit) => {
    const nomes = JSON.parse(String(init.body)).prefixes as string[];
    corpos.push({ url, metodo: String(init.method), nomes });
    return Promise.resolve(status === 200 ? Response.json(nomes.slice(0, 1).map((name) => ({ name }))) : new Response("", { status }));
  }) as unknown as typeof fetch;
  const l = storageLimpeza("https://projeto.exemplo", "chave", buscar);
  assertEquals(await l.apagarObjetos("documentos-portal", [RG, DOCX]), { apagados: 1 });
  assertEquals(corpos, [{ url: "https://projeto.exemplo/storage/v1/object/documentos-portal", metodo: "DELETE", nomes: [RG, DOCX] }]);

  corpos.length = 0;
  const muitos = Array.from({ length: 1001 }, (_, i) => `${CEDRO}/${(0x10000000 + i).toString(16)}-3e4f-4a5b-8c6d-7e8f9a0b1c2d`);
  assertEquals(await l.apagarObjetos("documentos-portal", muitos), { apagados: 2 });
  assertEquals(corpos.map((c) => c.nomes.length), [1000, 1]);

  await assertRejects(() => l.apagarObjetos("documentos-portal", [RG, `${CEDRO}/../x`]), Error, "Caminho inválido");
  await assertRejects(() => l.apagarObjetos("documentos-console", [RG]), Error, "Bucket inválido");
  status = 503;
  await assertRejects(() => l.apagarObjetos("documentos-portal", [RG]), Error, "Storage respondeu 503");
});

Deno.test("PT-11: caminhoValido aceita só os dois formatos dentro da pasta de um escritório", () => {
  assertEquals([RG, DOCX].map(caminhoValido), [true, true]);
  assertEquals([
    `${CEDRO}`, `${CEDRO}/`, `${CEDRO}/peticoes/x.docx`, `${CEDRO}/propostas/1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d-v0.docx`,
    `${CEDRO}/propostas/1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d.docx`, `x/${CEDRO}`, `${CEDRO}/../${CEDRO}`, `/${RG}`, `${RG}/x`,
    RG.toUpperCase(),
  ].map(caminhoValido), [false, false, false, false, false, false, false, false, false, false]);
});
