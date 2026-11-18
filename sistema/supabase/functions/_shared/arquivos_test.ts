import { assertEquals } from "@std/assert";
import { arquivosStorage } from "./arquivos.ts";

Deno.test("Storage: endereços assinados com a chave só no servidor e o caminho escapado", async () => {
  const chamadas: { url: string; metodo: string; corpo?: string; chave?: string | null }[] = [];
  const buscar = ((url: string, init: RequestInit) => {
    chamadas.push({ url, metodo: init.method ?? "GET", corpo: init.body as string | undefined, chave: new Headers(init.headers).get("apikey") });
    if (url.includes("/upload/sign/")) return Promise.resolve(Response.json({ url: "/object/upload/sign/documentos-console/e/d?token=t1" }));
    if (url.includes("/object/sign/")) return Promise.resolve(Response.json({ signedURL: "/object/sign/documentos-console/e/d?token=t2" }));
    if (url.includes("/info/")) return Promise.resolve(url.endsWith("/x") ? new Response("", { status: 404 }) : Response.json({ size: 10, content_type: "application/pdf" }));
    return Promise.resolve(new Response("", { status: 500 }));
  }) as typeof fetch;
  const a = arquivosStorage("https://proj.supabase.co", "chave-servico", "documentos-console", buscar);
  assertEquals(await a.enderecoDeEnvio("e/d"), "https://proj.supabase.co/storage/v1/object/upload/sign/documentos-console/e/d?token=t1");
  assertEquals(await a.info("e/d"), { tamanho: 10, tipo: "application/pdf" });
  assertEquals(await a.info("e/x"), null);
  assertEquals(await a.enderecoDeLeitura("e/d", 60, "contrato assinado.pdf"),
    "https://proj.supabase.co/storage/v1/object/sign/documentos-console/e/d?token=t2&download=contrato%20assinado.pdf");
  assertEquals(chamadas.find((c) => c.url.includes("/object/sign/"))?.corpo, JSON.stringify({ expiresIn: 60 }));
  assertEquals(chamadas.every((c) => c.chave === "chave-servico"), true);
});
