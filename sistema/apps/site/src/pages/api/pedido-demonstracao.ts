// Pedido de demonstração (F2.2, SC-02): recebe o formulário do site, confere com as mesmas
// regras do navegador (src/lib/pedido.ts) e repassa para a api-console com o segredo de
// repasse e o IP de quem pediu. O banco aplica os limites, guarda a autorização e o Console
// recebe o interessado. Robô (campo isca preenchido ou envio rápido demais) recebe "ok" e nada
// é guardado.
import type { APIRoute } from "astro";
import { normalizar, TEMPO_MINIMO_MS, validar } from "../../lib/pedido";

export const prerender = false;

const json = (corpo: unknown, status: number) =>
  new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

const curto = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const funcoes = import.meta.env.SUPABASE_FUNCTIONS_URL ?? process.env.SUPABASE_FUNCTIONS_URL;
  const segredo = import.meta.env.REPASSE_SEGREDO ?? process.env.REPASSE_SEGREDO;
  if (!funcoes || !segredo) return json({ erro: "INDISPONIVEL" }, 503);

  if (!(request.headers.get("content-type") ?? "").includes("application/json")) return json({ erro: "FORMATO" }, 415);
  let bruto: Record<string, unknown>;
  try {
    const lido = await request.json();
    if (!lido || typeof lido !== "object" || Array.isArray(lido)) return json({ erro: "FORMATO" }, 400);
    bruto = lido as Record<string, unknown>;
  } catch {
    return json({ erro: "FORMATO" }, 400);
  }

  // Robô: responde como se tivesse dado certo, sem guardar nada.
  if (curto(bruto.site, 200) || !(Number(bruto.tempo) >= TEMPO_MINIMO_MS)) return json({ ok: true }, 201);

  const pedido = normalizar(bruto);
  const erros = validar(pedido);
  if (Object.keys(erros).length) return json({ erros }, 422);

  const o = (bruto.origem && typeof bruto.origem === "object" ? bruto.origem : {}) as Record<string, unknown>;
  const origem = {
    pagina: curto(o.pagina, 120), referencia: curto(o.referencia, 400),
    campanha: curto(o.campanha, 120), fonte: curto(o.fonte, 120), meio: curto(o.meio, 120),
  };

  let r: Response;
  try {
    r = await fetch(`${funcoes.replace(/\/$/, "")}/api-console/v1/site/pedidos`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-repasse-segredo": segredo,
        "x-cliente-ip": request.headers.get("x-real-ip") ?? clientAddress ?? "",
      },
      body: JSON.stringify({ ...pedido, origem }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return json({ erro: "INDISPONIVEL" }, 502);
  }
  if (r.status === 201) return json({ ok: true }, 201);
  if (r.status === 429) return json({ erro: "LIMITE" }, 429);
  return json({ erro: "INDISPONIVEL" }, 502);
};
