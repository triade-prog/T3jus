// F3.53: a chamada à OpenAI, com o fetch falso (sem rede).
import { assertEquals } from "@std/assert";
import { cerebroOpenAI, esquemaEstrito } from "./ia.ts";

const SAIDA = { acao: "RESPONDER" as const, texto: "A audiência é dia 25/11.", motivo: null, fonte: "Agenda", resolvida: true, naoSoube: null };
const PEDIDO = { instrucoes: "Regras", mensagens: [{ role: "user" as const, content: "Quando é a audiência?" }] };
const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });

Deno.test("PA-05: pede saída estrita e devolve o formato conferido", async () => {
  const pedidos: Record<string, unknown>[] = [];
  const buscar = (_u: string | URL | Request, i?: RequestInit) => {
    pedidos.push(JSON.parse(String(i?.body)));
    return Promise.resolve(resposta({ choices: [{ message: { content: JSON.stringify(SAIDA) }, finish_reason: "stop" }] }));
  };
  const r = await cerebroOpenAI("chave", "modelo-x", buscar as typeof fetch).pensar(PEDIDO);
  assertEquals(r, SAIDA);
  assertEquals(pedidos[0]!.model, "modelo-x");
  assertEquals((pedidos[0]!.messages as { role: string }[]).map((m) => m.role), ["system", "user"]);
  const e = esquemaEstrito() as { required: string[]; additionalProperties: boolean };
  assertEquals([e.required.sort(), e.additionalProperties], [Object.keys(SAIDA).sort(), false]);
});

Deno.test("PA-05: recusa, formato errado ou fora do ar viram nulo (a conversa passa para uma pessoa)", async () => {
  let vezes = 0;
  const fora = () => { vezes++; return Promise.resolve(resposta({}, 503)); };
  assertEquals([await cerebroOpenAI("c", "m", fora as typeof fetch).pensar(PEDIDO), vezes], [null, 2]);
  const recusa = () => Promise.resolve(resposta({ choices: [{ message: { content: null, refusal: "não" } }] }));
  assertEquals(await cerebroOpenAI("c", "m", recusa as typeof fetch).pensar(PEDIDO), null);
  const torto = () => Promise.resolve(resposta({ choices: [{ message: { content: '{"acao":"OUTRA"}' }, finish_reason: "stop" }] }));
  assertEquals(await cerebroOpenAI("c", "m", torto as typeof fetch).pensar(PEDIDO), null);
});

Deno.test("F3.59: montar usa o seu formato, sem limites numéricos no esquema estrito", async () => {
  const pedidos: Record<string, unknown>[] = [];
  const saida = { entendeu: false, porque: "Não é automação.", gatilho: null, nome: null, dias: null, semCombinado: null, passos: [], feito: [], experimente: [] };
  const buscar = (_u: string | URL | Request, i?: RequestInit) => {
    pedidos.push(JSON.parse(String(i?.body)));
    return Promise.resolve(resposta({ choices: [{ message: { content: JSON.stringify(saida) }, finish_reason: "stop" }] }));
  };
  assertEquals(await cerebroOpenAI("c", "m", buscar as typeof fetch).montar!(PEDIDO), saida);
  const fmt = (pedidos[0]!.response_format as { json_schema: { name: string; schema: unknown } }).json_schema;
  assertEquals([fmt.name, /"(minimum|maximum)"/.test(JSON.stringify(fmt.schema))], ["fluxo_automacao", false]);
});
