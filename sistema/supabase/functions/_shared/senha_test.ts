// Senha vazada: só o começo do hash sai do servidor; serviço fora do ar não trava a troca.
import { assertEquals } from "@std/assert";
import { conferirVazadaHibp, sufixoNaFaixa } from "./senha.ts";

// SHA-1 de "password": 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8.
const FAIXA = "1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493\r\n0000000000000000000000000000000000A:0\r\n";

Deno.test("senha vazada: confere o sufixo na faixa e ignora as linhas de enchimento", () => {
  assertEquals(sufixoNaFaixa(FAIXA, "1E4C9B93F3F0682250B6CF8331B7EE68FD8"), true);
  assertEquals(sufixoNaFaixa(FAIXA, "0000000000000000000000000000000000A"), false);
});

Deno.test("senha vazada: só os 5 primeiros caracteres do hash saem, com enchimento pedido", async () => {
  const pedidos: { url: string; padding: string | null }[] = [];
  const buscar = ((url: string, init?: RequestInit) => {
    pedidos.push({ url, padding: new Headers(init?.headers).get("Add-Padding") });
    return Promise.resolve(new Response(FAIXA));
  }) as typeof fetch;
  assertEquals(await conferirVazadaHibp(buscar)("password"), true);
  assertEquals(await conferirVazadaHibp(buscar)("marfim-ponte-42"), false);
  assertEquals(pedidos[0], { url: "https://api.pwnedpasswords.com/range/5BAA6", padding: "true" });
});

Deno.test("senha vazada: serviço fora do ar não impede a troca", async () => {
  const fora = (() => Promise.reject(new Error("rede"))) as typeof fetch;
  assertEquals(await conferirVazadaHibp(fora)("password"), false);
});
