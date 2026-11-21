// Fim da guarda (F0.15): a rota da rotina apaga as pastas que o banco pôs na fila e conta o
// que fez; a limpeza do Storage nunca apaga fora da pasta do escritório.
import { assertEquals, assertRejects } from "@std/assert";
import { criarApiConsole } from "./app.ts";
import { storageLimpeza, type LimpezaArquivos } from "../_shared/guarda.ts";
import { adminFalso, arquivosFalsos, authFalso, bancoFalso, pedido } from "../_shared/teste_util.ts";

const CEDRO = "7d1e2f3a-4b5c-4d6e-8f7a-9b0c1d2e3f4a";
const FILA = [
  { id: "f1", escritorioId: CEDRO, bucket: "documentos-console" },
  { id: "f2", escritorioId: CEDRO, bucket: "documentos-portal" },
];

function montar(limpeza: LimpezaArquivos | undefined, fila: typeof FILA | { id: string; escritorioId: string; bucket: string }[] = FILA) {
  const db = bancoFalso({ rotina_guarda_arquivos_pendentes: () => fila, rotina_guarda_arquivos_registrar: () => null });
  const app = criarApiConsole("segredo-de-repasse-de-teste", {
    banco: db.banco, auth: authFalso([]).auth, admin: adminFalso().admin, urlApp: "https://console.exemplo", urlPortal: "https://portal.exemplo",
    arquivos: arquivosFalsos().arquivos, limpeza,
  });
  return { pedir: pedido(app, "api-console"), ...db };
}

Deno.test("F0.15: a rota apaga as pastas da fila e conta o que fez, sem pedir sessão", async () => {
  const pedidos: string[] = [];
  const m = montar({
    apagarPasta: (bucket, pasta) => {
      pedidos.push(`${bucket}:${pasta}`);
      return Promise.resolve(bucket === "documentos-console" ? { apagados: 3, restam: false } : { apagados: 1000, restam: true });
    },
  });
  const r = await m.pedir("/v1/rotina/arquivos-da-guarda", { corpo: {} });
  assertEquals(await r.json(), { pastas: 2, concluidas: 1, apagados: 1003 });
  assertEquals(pedidos, [`documentos-console:${CEDRO}`, `documentos-portal:${CEDRO}`]);
  assertEquals(m.chamadas.filter((c) => c.funcao === "rotina_guarda_arquivos_registrar").map((c) => c.args), [
    { p_id: "f1", p_apagados: 3, p_concluido: true },
    { p_id: "f2", p_apagados: 1000, p_concluido: false },
  ]);
});

Deno.test("F0.15: a falha do Storage fica na fila, para a próxima vez", async () => {
  const m = montar({ apagarPasta: () => Promise.reject(new Error("Storage respondeu 503")) }, [FILA[0]!]);
  const r = await m.pedir("/v1/rotina/arquivos-da-guarda", { corpo: {} });
  assertEquals(await r.json(), { pastas: 1, concluidas: 0, apagados: 0 });
  assertEquals(m.chamadas.find((c) => c.funcao === "rotina_guarda_arquivos_registrar")!.args,
    { p_id: "f1", p_apagados: 0, p_concluido: false, p_erro: "Storage respondeu 503" });
});

Deno.test("F0.15: pasta que não é de escritório não se apaga", async () => {
  const pedidos: string[] = [];
  const m = montar({ apagarPasta: (b, p) => (pedidos.push(`${b}:${p}`), Promise.resolve({ apagados: 0, restam: false })) },
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
