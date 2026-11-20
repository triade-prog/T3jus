// Repasse /api (F0.8): o navegador só fala com o próprio domínio. Este route handler chama
// a Edge Function do sistema no servidor, com o segredo de repasse e o IP real, e devolve a
// resposta. Os cookies de sessão são de primeira parte (__Host-). Nenhuma regra de negócio aqui.

import { COOKIES_CONSOLE, COOKIES_PORTAL, ErroDominio, type CodigoErro } from "@t3jus/domain";

export interface OpcoesRepasse {
  /** URL da função, ex.: https://<projeto>.supabase.co/functions/v1/api-portal */
  destino: string;
  segredo: string;
  /** Cookies que podem ir e voltar. Todos precisam começar com __Host-. */
  cookies: readonly string[];
  tempoLimiteMs?: number;
  maxCorpoBytes?: number;
  /** fetch do ambiente; os testes passam um falso, sem rede. */
  buscar?: (url: URL, init: RequestInit) => Promise<Response>;
}

type Ambiente = Record<string, string | undefined>;

/** Portal do advogado → api-portal. */
export function opcoesPortal(env: Ambiente): OpcoesRepasse {
  return { destino: `${env.SUPABASE_FUNCTIONS_URL ?? ""}/api-portal`, segredo: env.REPASSE_SEGREDO ?? "", cookies: Object.values(COOKIES_PORTAL) };
}

/** Console T3jus → api-console. */
export function opcoesConsole(env: Ambiente): OpcoesRepasse {
  return { destino: `${env.SUPABASE_FUNCTIONS_URL ?? ""}/api-console`, segredo: env.REPASSE_SEGREDO ?? "", cookies: Object.values(COOKIES_CONSOLE) };
}

const METODOS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const CAMINHO_VALIDO = /^v1(\/[A-Za-z0-9_-]+)+$/;
// A planilha da importação (F3.55) é o único corpo que não é JSON: vai como está, até 5 MB.
const ENVIO_PLANILHA = /^v1\/escritorio\/importacoes$/;
const MAX_PLANILHA_BYTES = 5 * 1024 * 1024;
// Importar grava até 2.000 linhas numa transação: espera mais que o normal.
const DEMORADO = /^v1\/escritorio\/importacoes(\/[0-9a-f-]+\/(importar|colunas|desfazer))?$/;

function erro(codigo: CodigoErro): Response {
  const e = new ErroDominio(codigo);
  return new Response(JSON.stringify(e.toJSON()), {
    status: e.status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

/** IP real de quem chamou. Na Vercel, x-real-ip e x-forwarded-for são gravados pela própria Vercel. */
export function ipReal(headers: Headers): string | null {
  const ip = headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0];
  const limpo = ip?.trim();
  return limpo && /^[0-9a-fA-F:.]{3,45}$/.test(limpo) ? limpo : null;
}

function cookiesPermitidos(cabecalho: string | null, nomes: readonly string[]): string | null {
  if (!cabecalho) return null;
  const pares = cabecalho
    .split(";")
    .map((p) => p.trim())
    .filter((p) => nomes.includes(p.slice(0, p.indexOf("="))));
  return pares.length ? pares.join("; ") : null;
}

/**
 * Só deixa voltar Set-Cookie de nome permitido e com os atributos obrigatórios de um
 * cookie __Host-: Secure, Path=/ e sem Domain. Acrescenta HttpOnly e SameSite=Lax se faltarem.
 */
export function filtrarSetCookie(valores: string[], nomes: readonly string[]): string[] {
  const saida: string[] = [];
  for (const valor of valores) {
    const [par, ...atributos] = valor.split(";").map((p) => p.trim());
    const nome = par?.slice(0, par.indexOf("=")) ?? "";
    if (!par || !nomes.includes(nome) || !nome.startsWith("__Host-")) continue;
    const attrs = atributos.filter((a) => !/^domain=/i.test(a));
    const tem = (re: RegExp) => attrs.some((a) => re.test(a));
    if (!tem(/^secure$/i) || !tem(/^path=\/$/i)) continue;
    if (!tem(/^httponly$/i)) attrs.push("HttpOnly");
    if (!tem(/^samesite=/i)) attrs.push("SameSite=Lax");
    saida.push([par, ...attrs].join("; "));
  }
  return saida;
}

export function criarRepasse(obterOpcoes: () => OpcoesRepasse) {
  return async function repassar(req: Request, ctx: { params: Promise<{ path?: string[] }> }): Promise<Response> {
    const op = obterOpcoes();
    if (!op.segredo || !op.destino) return erro("UPSTREAM_UNAVAILABLE");
    if (!METODOS.has(req.method)) return erro("NOT_FOUND");

    const caminho = ((await ctx.params).path ?? []).join("/");
    if (!CAMINHO_VALIDO.test(caminho)) return erro("NOT_FOUND");

    const headers = new Headers({ "x-repasse-segredo": op.segredo, accept: "application/json" });
    const ip = ipReal(req.headers);
    if (ip) headers.set("x-cliente-ip", ip);
    const cookie = cookiesPermitidos(req.headers.get("cookie"), op.cookies);
    if (cookie) headers.set("cookie", cookie);

    let corpo: ArrayBuffer | undefined;
    if (req.method !== "GET" && req.method !== "DELETE") {
      const tipo = req.headers.get("content-type") ?? "";
      const planilha = req.method === "POST" && ENVIO_PLANILHA.test(caminho) && tipo.startsWith("application/octet-stream");
      if (!planilha && !tipo.startsWith("application/json")) return erro("VALIDATION_ERROR");
      corpo = await req.arrayBuffer();
      if (corpo.byteLength > (planilha ? MAX_PLANILHA_BYTES : (op.maxCorpoBytes ?? 64 * 1024))) return erro("VALIDATION_ERROR");
      headers.set("content-type", planilha ? "application/octet-stream" : "application/json");
    }

    const url = new URL(`${op.destino.replace(/\/$/, "")}/${caminho}`);
    url.search = new URL(req.url).search;

    let resposta: Response;
    try {
      resposta = await (op.buscar ?? fetch)(url, {
        method: req.method,
        headers,
        body: corpo,
        redirect: "manual",
        signal: AbortSignal.timeout(DEMORADO.test(caminho) ? Math.max(op.tempoLimiteMs ?? 10_000, 60_000) : (op.tempoLimiteMs ?? 10_000)),
      });
    } catch {
      return erro("UPSTREAM_UNAVAILABLE");
    }

    const saida = new Headers({ "cache-control": "no-store" });
    const tipo = resposta.headers.get("content-type");
    if (tipo) saida.set("content-type", tipo);
    // O arquivo de agenda de download vem com o nome (Content-Disposition); o resto é JSON e não tem.
    const disposicao = resposta.headers.get("content-disposition");
    if (disposicao) saida.set("content-disposition", disposicao);
    for (const c of filtrarSetCookie(resposta.headers.getSetCookie(), op.cookies)) saida.append("set-cookie", c);
    return new Response(resposta.body, { status: resposta.status, headers: saida });
  };
}
