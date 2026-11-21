import { afterEach, describe, expect, it, vi } from "vitest";
import { criarRepasse, filtrarSetCookie, ipReal, opcoesConsole, opcoesPortal } from "./repasse.ts";

const op = { destino: "https://fn.exemplo/functions/v1/api-portal", segredo: "s3gredo", cookies: ["__Host-portal"] };
const ctx = (path: string[]) => ({ params: Promise.resolve({ path }) });
const repassar = criarRepasse(() => op);

afterEach(() => vi.unstubAllGlobals());

function mockFetch(resposta: Response) {
  const f = vi.fn(async (_url: URL, _init: RequestInit) => resposta);
  vi.stubGlobal("fetch", f);
  return f;
}

describe("F0.8: repasse /api", () => {
  it("o arquivo para baixar passa com o tipo e o nome", async () => {
    mockFetch(new Response("BEGIN:VCALENDAR", { status: 200, headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": 'attachment; filename="festa.ics"' } }));
    const r = await repassar(new Request("https://portal.exemplo/api/v1/publico/mural/X/comunicados/1/agenda"), ctx(["v1", "publico", "mural", "X", "comunicados", "1", "agenda"]));
    expect(r.headers.get("content-type")).toBe("text/calendar; charset=utf-8");
    expect(r.headers.get("content-disposition")).toBe('attachment; filename="festa.ics"');
    expect(await r.text()).toBe("BEGIN:VCALENDAR");
  });

  it("chama a função com o segredo, o IP real e só os cookies permitidos", async () => {
    const f = mockFetch(new Response('{"ok":true}', { status: 200, headers: { "content-type": "application/json" } }));
    const req = new Request("https://portal.exemplo/api/v1/saude?x=1", {
      headers: {
        cookie: "__Host-portal=abc; outro=1",
        "x-real-ip": "200.1.2.3",
        "x-repasse-segredo": "falso-vindo-do-navegador",
        "x-cliente-ip": "6.6.6.6",
      },
    });
    const r = await repassar(req, ctx(["v1", "saude"]));
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    const [url, init] = f.mock.calls[0]!;
    expect(String(url)).toBe("https://fn.exemplo/functions/v1/api-portal/v1/saude?x=1");
    const h = new Headers(init.headers);
    expect(h.get("x-repasse-segredo")).toBe("s3gredo");
    expect(h.get("x-cliente-ip")).toBe("200.1.2.3");
    expect(h.get("cookie")).toBe("__Host-portal=abc");
  });

  it("cada app fala só com a sua função e só com o seu cookie", () => {
    const env = { SUPABASE_FUNCTIONS_URL: "https://fn.exemplo/functions/v1", REPASSE_SEGREDO: "s" };
    expect(opcoesPortal(env)).toEqual({ destino: "https://fn.exemplo/functions/v1/api-portal", segredo: "s", cookies: ["__Host-portal", "__Host-portal-link"] });
    expect(opcoesConsole(env)).toEqual({ destino: "https://fn.exemplo/functions/v1/api-console", segredo: "s", cookies: ["__Host-console", "__Host-console-link"] });
  });

  it("o cookie do Console nunca passa pelo repasse do Portal", async () => {
    const f = mockFetch(new Response("{}"));
    await repassar(new Request("https://portal.exemplo/api/v1/x", { headers: { cookie: "__Host-console=equipe" } }), ctx(["v1", "x"]));
    expect(new Headers(f.mock.calls[0]![1].headers).has("cookie")).toBe(false);
  });

  it("recusa caminhos fora de /v1 e tentativas de subir de pasta", async () => {
    mockFetch(new Response("{}"));
    for (const path of [["v2", "x"], ["v1", "..", "console"], ["v1"], ["v1", "a b"]]) {
      const r = await repassar(new Request("https://portal.exemplo/api/x"), ctx(path));
      expect(r.status).toBe(404);
      expect(await r.json()).toEqual({ erro: { codigo: "NOT_FOUND" } });
    }
  });

  it("aceita só JSON e corpo pequeno nos envios", async () => {
    mockFetch(new Response("{}"));
    const form = new Request("https://portal.exemplo/api/v1/x", { method: "POST", body: "a=1", headers: { "content-type": "application/x-www-form-urlencoded" } });
    expect((await repassar(form, ctx(["v1", "x"]))).status).toBe(400);
    const grande = new Request("https://portal.exemplo/api/v1/x", { method: "POST", body: "x".repeat(70_000), headers: { "content-type": "application/json" } });
    expect((await repassar(grande, ctx(["v1", "x"]))).status).toBe(400);
  });

  it("F3.55: a planilha passa como arquivo, até 5 MB, só no envio da importação", async () => {
    const f = mockFetch(new Response("{}", { status: 201 }));
    const caminho = ["v1", "escritorio", "importacoes"];
    const arq = new Request("https://portal.exemplo/api/v1/escritorio/importacoes?oQue=CLIENTES&nome=a.xlsx", {
      method: "POST", body: new Uint8Array(200_000), headers: { "content-type": "application/octet-stream" } });
    expect((await repassar(arq, ctx(caminho))).status).toBe(201);
    expect(new Headers(f.mock.calls[0]![1].headers).get("content-type")).toBe("application/octet-stream");
    expect(String(f.mock.calls[0]![0])).toContain("oQue=CLIENTES");
    const outro = new Request("https://portal.exemplo/api/v1/x", { method: "POST", body: new Uint8Array(10), headers: { "content-type": "application/octet-stream" } });
    expect((await repassar(outro, ctx(["v1", "x"]))).status).toBe(400);
    const grande = new Request("https://portal.exemplo/api/v1/escritorio/importacoes", {
      method: "POST", body: new Uint8Array(5 * 1024 * 1024 + 1), headers: { "content-type": "application/octet-stream" } });
    expect((await repassar(grande, ctx(caminho))).status).toBe(400);
  });

  it("EX-09: o .docx das petições passa como arquivo só nos envios de modelo e de versão editada", async () => {
    const id = "8d5e1b8a-3f9c-4e0d-9a6b-9c0d1e2f3a4b";
    const docx = (caminho: string) => new Request(`https://portal.exemplo/api/${caminho}`, {
      method: "POST", body: new Uint8Array(1000), headers: { "content-type": "application/octet-stream" } });
    for (const caminho of ["v1/escritorio/peticoes/modelos", "v1/escritorio/peticoes/modelos/conferir", `v1/escritorio/peticoes/modelos/${id}/versoes`, `v1/escritorio/peticoes/${id}/versoes/docx`]) {
      mockFetch(new Response("{}", { status: 201 }));
      expect((await repassar(docx(caminho), ctx(caminho.split("/")))).status, caminho).toBe(201);
    }
    expect((await repassar(docx(`v1/escritorio/peticoes/${id}/decisao`), ctx(["v1", "escritorio", "peticoes", id, "decisao"]))).status).toBe(400);
  });

  it("F3.16: o modelo de contrato, procuração ou declaração passa como arquivo; gerar continua só em JSON", async () => {
    const id = "a1600000-0000-4000-8000-000000000001";
    const docx = (caminho: string) => new Request(`https://portal.exemplo/api/${caminho}`, {
      method: "POST", body: new Uint8Array(1000), headers: { "content-type": "application/octet-stream" } });
    for (const caminho of ["v1/escritorio/documentos/modelos", "v1/escritorio/documentos/modelos/conferir", `v1/escritorio/documentos/modelos/${id}/versoes`]) {
      mockFetch(new Response("{}", { status: 201 }));
      expect((await repassar(docx(caminho), ctx(caminho.split("/")))).status, caminho).toBe(201);
    }
    expect((await repassar(docx(`v1/escritorio/contratos/${id}/documentos`), ctx(["v1", "escritorio", "contratos", id, "documentos"]))).status).toBe(400);
  });

  it("F3.81: o PNG do logo passa como arquivo só no envio do logo", async () => {
    mockFetch(new Response("{}", { status: 201 }));
    const png = (caminho: string) => new Request(`https://portal.exemplo/api/${caminho}?nome=logo.png&formato=PNG&bytes=86000`, {
      method: "POST", body: new Uint8Array(1000), headers: { "content-type": "application/octet-stream" } });
    expect((await repassar(png("v1/escritorio/recebimento/logo"), ctx(["v1", "escritorio", "recebimento", "logo"]))).status).toBe(201);
    expect((await repassar(png("v1/escritorio/recebimento"), ctx(["v1", "escritorio", "recebimento"]))).status).toBe(400);
  });

  it("função fora do ar vira UPSTREAM_UNAVAILABLE", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    const r = await repassar(new Request("https://portal.exemplo/api/v1/saude"), ctx(["v1", "saude"]));
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ erro: { codigo: "UPSTREAM_UNAVAILABLE" } });
  });

  it("sem segredo configurado não chama nada", async () => {
    const f = mockFetch(new Response("{}"));
    const r = await criarRepasse(() => ({ ...op, segredo: "" }))(new Request("https://portal.exemplo/api/v1/saude"), ctx(["v1", "saude"]));
    expect(r.status).toBe(503);
    expect(f).not.toHaveBeenCalled();
  });

  it("devolve só cookies __Host- permitidos e seguros", async () => {
    const upstream = new Response("{}", { status: 201 });
    upstream.headers.append("set-cookie", "__Host-portal=tok; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=86400");
    upstream.headers.append("set-cookie", "rastreador=1; Path=/");
    mockFetch(upstream);
    const r = await repassar(new Request("https://portal.exemplo/api/v1/x", { method: "DELETE" }), ctx(["v1", "x"]));
    expect(r.headers.getSetCookie()).toEqual(["__Host-portal=tok; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=86400"]);
  });
});

describe("filtrarSetCookie", () => {
  const nomes = ["__Host-portal"];
  it("tira Domain e completa HttpOnly e SameSite", () => {
    expect(filtrarSetCookie(["__Host-portal=x; Path=/; Secure; Domain=supabase.co"], nomes)).toEqual(["__Host-portal=x; Path=/; Secure; HttpOnly; SameSite=Lax"]);
  });
  it("descarta cookie sem Secure, com Path diferente ou nome fora da lista", () => {
    expect(filtrarSetCookie(["__Host-portal=x; Path=/"], nomes)).toEqual([]);
    expect(filtrarSetCookie(["__Host-portal=x; Path=/api; Secure"], nomes)).toEqual([]);
    expect(filtrarSetCookie(["__Host-outro=x; Path=/; Secure"], nomes)).toEqual([]);
  });
});

describe("ipReal", () => {
  it("usa x-real-ip, depois o primeiro do x-forwarded-for, e recusa lixo", () => {
    expect(ipReal(new Headers({ "x-real-ip": "2804:14c::1" }))).toBe("2804:14c::1");
    expect(ipReal(new Headers({ "x-forwarded-for": "200.1.2.3, 10.0.0.1" }))).toBe("200.1.2.3");
    expect(ipReal(new Headers({ "x-real-ip": "<script>" }))).toBeNull();
    expect(ipReal(new Headers())).toBeNull();
  });
});
