// Dependências falsas para os testes das APIs: o Auth e o banco em memória, sem rede.

import type { AdminAuth, CadastroTotp, Fator, Portador, ProvedorAuth, ResultadoSenha, SessaoAuth } from "./auth.ts";
import { ErroBanco, type Banco } from "./banco.ts";
import { base64url } from "./cripto.ts";
import type { Arquivos } from "./arquivos.ts";

export const SEGREDO = "segredo-de-repasse-de-teste";
export const CODIGO_CERTO = "123456";
export const TOKEN_RECUPERACAO = "token-de-recuperacao-valido";
export const TOKEN_CONVITE = "token-de-convite-valido-0001";
export const TOKEN_LINK = "token-de-link-de-acesso-0001";

export interface UsuarioFalso {
  id: string;
  email: string;
  senha: string;
  emailVerificado?: boolean;
  fatores?: Fator[];
}

function jwt(claims: Record<string, unknown>): string {
  return `${base64url('{"alg":"none"}')}.${base64url(JSON.stringify(claims))}.assinatura`;
}

export function authFalso(usuarios: UsuarioFalso[]) {
  const tokens = new Map<string, { userId: string; sessaoId: string; aal: "aal1" | "aal2" }>();
  const refresh = new Map<string, { userId: string; sessaoId: string; aal: "aal1" | "aal2" }>();
  const recuperacoes: string[] = [];
  const links: { email: string; voltarPara: string }[] = [];
  const recuperacaoUsada = new Set<string>();
  const senhasTrocadas: string[] = [];

  function emitir(userId: string, sessaoId: string = crypto.randomUUID(), aal: "aal1" | "aal2" = "aal1"): SessaoAuth {
    const accessToken = jwt({ sub: userId, session_id: sessaoId, aal, n: crypto.randomUUID() });
    const refreshToken = crypto.randomUUID();
    tokens.set(accessToken, { userId, sessaoId, aal });
    refresh.set(refreshToken, { userId, sessaoId, aal });
    return { accessToken, refreshToken, expiraEm: 3600, userId };
  }
  const porId = (id: string) => usuarios.find((u) => u.id === id)!;

  const auth: ProvedorAuth = {
    entrarComSenha(email, senha): Promise<ResultadoSenha> {
      const u = usuarios.find((x) => x.email === email && x.senha === senha);
      if (!u) return Promise.resolve("CREDENCIAIS");
      if (u.emailVerificado === false) return Promise.resolve("EMAIL_NAO_VERIFICADO");
      return Promise.resolve(emitir(u.id));
    },
    fatores(token) {
      return Promise.resolve(porId(tokens.get(token)!.userId).fatores ?? []);
    },
    cadastrarTotp(token): Promise<CadastroTotp> {
      const u = porId(tokens.get(token)!.userId);
      u.fatores = [...(u.fatores ?? []).filter((f) => f.verificado), { id: crypto.randomUUID(), verificado: false }];
      return Promise.resolve({ factorId: u.fatores.at(-1)!.id, qrCode: "<svg/>", segredo: "SEGREDO" });
    },
    verificarTotp(token, factorId, codigo) {
      const t = tokens.get(token)!;
      const fator = porId(t.userId).fatores?.find((f) => f.id === factorId);
      if (!fator || codigo !== CODIGO_CERTO) return Promise.resolve(null);
      fator.verificado = true;
      return Promise.resolve(emitir(t.userId, t.sessaoId, "aal2"));
    },
    portador(token): Promise<Portador | null> {
      const t = tokens.get(token);
      if (!t) return Promise.resolve(null);
      const u = porId(t.userId);
      return Promise.resolve({
        userId: u.id,
        email: u.email,
        aal: t.aal,
        emailVerificado: u.emailVerificado !== false,
        temAutenticador: (u.fatores ?? []).some((f) => f.verificado),
        sessaoId: t.sessaoId,
      });
    },
    renovar(r) {
      const t = refresh.get(r);
      return Promise.resolve(t ? emitir(t.userId, t.sessaoId, t.aal) : null);
    },
    sair(token) {
      const t = tokens.get(token);
      if (t) for (const [k, v] of tokens) if (v.sessaoId === t.sessaoId) tokens.delete(k);
      return Promise.resolve();
    },
    sairDeTodas(token) {
      const t = tokens.get(token);
      if (t) {
        for (const [k, v] of tokens) if (v.userId === t.userId) tokens.delete(k);
        for (const [k, v] of refresh) if (v.userId === t.userId) refresh.delete(k);
      }
      return Promise.resolve();
    },
    pedirRecuperacao(email) {
      recuperacoes.push(email);
      return Promise.resolve();
    },
    usarRecuperacao(tokenHash) {
      if (tokenHash !== TOKEN_RECUPERACAO || recuperacaoUsada.has(tokenHash)) return Promise.resolve(null);
      recuperacaoUsada.add(tokenHash);
      return Promise.resolve(emitir(usuarios[0]!.id));
    },
    pedirLinkAcesso(email, voltarPara) {
      links.push({ email, voltarPara });
      return Promise.resolve();
    },
    usarLinkAcesso(tokenHash) {
      if (tokenHash !== TOKEN_LINK || recuperacaoUsada.has(tokenHash)) return Promise.resolve(null);
      recuperacaoUsada.add(tokenHash);
      return Promise.resolve(emitir(usuarios[0]!.id));
    },
    usarConvite(tokenHash) {
      if (tokenHash !== TOKEN_CONVITE || recuperacaoUsada.has(tokenHash)) return Promise.resolve(null);
      recuperacaoUsada.add(tokenHash);
      // Como no Auth: abrir o convite confirma o e-mail.
      usuarios.at(-1)!.emailVerificado = true;
      return Promise.resolve(emitir(usuarios.at(-1)!.id));
    },
    trocarSenha(token, novaSenha) {
      if (novaSenha.includes("vazada")) return Promise.resolve("FRACA" as const);
      senhasTrocadas.push(tokens.get(token)!.userId);
      return Promise.resolve("OK" as const);
    },
  };
  return { auth, recuperacoes, links, senhasTrocadas, tokens };
}

type Handler = (args: Record<string, unknown>) => unknown;

/** Banco falso: cada função responde pelo handler; as chamadas ficam registradas. */
export function bancoFalso(handlers: Record<string, Handler>) {
  const chamadas: { funcao: string; args: Record<string, unknown> }[] = [];
  // Como a 0880: acesso_portal_sessao chama acesso_portal e, com acesso, escritorio_da_sessao.
  if (!handlers.acesso_portal_sessao && handlers.acesso_portal) {
    handlers = {
      ...handlers,
      acesso_portal_sessao: (a) => {
        const acesso = Boolean(handlers.acesso_portal!({ p_pessoa: a.p_pessoa }));
        const escritorio = acesso && a.p_sessao && handlers.escritorio_da_sessao ? handlers.escritorio_da_sessao(a) ?? null : null;
        return { acesso, escritorio };
      },
    };
  }
  const banco: Banco = {
    rpc<T>(funcao: string, args: Record<string, unknown> = {}): Promise<T> {
      chamadas.push({ funcao, args });
      const h = handlers[funcao];
      if (!h) return Promise.reject(new Error(`função não prevista no teste: ${funcao}`));
      try {
        return Promise.resolve(h(args) as T);
      } catch (e) {
        return Promise.reject(e);
      }
    },
  };
  const acessos = () => chamadas.filter((c) => c.funcao === "registrar_acesso").map((c) => c.args.p_acao);
  return { banco, chamadas, acessos };
}

/** Limites de uso contados em memória, como o banco faz. */
export function limitesFalsos(max: Record<string, number>) {
  const usos = new Map<string, number>();
  return {
    limite_ok: (a: Record<string, unknown>) => (usos.get(`${a.p_tipo}:${a.p_chave}`) ?? 0) < max[String(a.p_tipo)]!,
    limite_contar: (a: Record<string, unknown>) => {
      const k = `${a.p_tipo}:${a.p_chave}`;
      usos.set(k, (usos.get(k) ?? 0) + 1);
      return usos.get(k)! <= max[String(a.p_tipo)]!;
    },
  };
}

export function erroBanco(codigo: string, detalhe?: unknown): never {
  throw new ErroBanco(codigo, "erro do banco", detalhe === undefined ? undefined : JSON.stringify(detalhe));
}

export function pedido(app: { request: (url: string, init?: RequestInit) => Response | Promise<Response> }, base: string) {
  return async (caminho: string, opcoes: { metodo?: string; corpo?: unknown; bruto?: Uint8Array; cookie?: string; segredo?: string | null } = {}) => {
    const headers = new Headers({ "x-cliente-ip": "200.1.2.3" });
    if (opcoes.segredo !== null) headers.set("x-repasse-segredo", opcoes.segredo ?? SEGREDO);
    if (opcoes.cookie) headers.set("cookie", opcoes.cookie);
    if (opcoes.corpo !== undefined) headers.set("content-type", "application/json");
    if (opcoes.bruto !== undefined) headers.set("content-type", "application/octet-stream");
    return await app.request(`/${base}${caminho}`, {
      method: opcoes.metodo ?? (opcoes.corpo === undefined && opcoes.bruto === undefined ? "GET" : "POST"),
      headers,
      body: (opcoes.bruto?.slice() as BodyInit | undefined) ?? (opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo)),
    });
  };
}

/** O cookie de sessão gravado na resposta, pronto para a próxima chamada. */
/** Um cookie pelo nome, entre os que a resposta gravou ("nome=valor"; vazio se apagado). */
export function cookieChamado(r: Response, nome: string): string | null {
  const c = r.headers.getSetCookie().find((x) => x.startsWith(`${nome}=`));
  return c ? c.split(";")[0]! : null;
}

export function cookieDe(r: Response): string {
  const set = r.headers.get("set-cookie") ?? "";
  return set.split(";")[0]!;
}

export async function erro(r: Response): Promise<{ codigo: string; detalhes?: Record<string, unknown> }> {
  return ((await r.json()) as { erro: { codigo: string; detalhes?: Record<string, unknown> } }).erro;
}

/** Convites em memória: e-mail já cadastrado devolve a mesma conta, sem e-mail novo. */
export function adminFalso(contas: Record<string, string> = {}, comSenha = new Set<string>(), autenticadores = new Set<string>()) {
  const enviados: { email: string; voltarPara: string }[] = [];
  const removidos: string[] = [];
  const admin: AdminAuth = {
    convidar(email, voltarPara) {
      if (contas[email]) return Promise.resolve({ userId: contas[email]!, contaNova: false });
      contas[email] = crypto.randomUUID();
      enviados.push({ email, voltarPara });
      return Promise.resolve({ userId: contas[email]!, contaNova: true });
    },
    reenviarConvite(email, voltarPara) {
      if (comSenha.has(email)) return Promise.resolve(false);
      enviados.push({ email, voltarPara });
      return Promise.resolve(true);
    },
    emailDe: (id) => Promise.resolve(Object.entries(contas).find(([, v]) => v === id)?.[0] ?? null),
    removerAutenticadores: (id) => {
      const tinha = autenticadores.delete(id);
      removidos.push(id);
      return Promise.resolve(tinha ? 1 : 0);
    },
    conta: (id) => {
      const email = Object.entries(contas).find(([, v]) => v === id)?.[0];
      if (!email) return Promise.resolve(null);
      return Promise.resolve({
        email, emailConfirmado: true, ultimaEntrada: "2026-11-18T12:40:00Z",
        autenticadorDesde: autenticadores.has(id) ? "2026-11-04T13:00:00Z" : null,
      });
    },
  };
  return { admin, enviados, contas, comSenha, autenticadores, removidos };
}

/** Storage em memória: o "envio" é marcar o caminho com tamanho e tipo. */
export function arquivosFalsos() {
  const guardados = new Map<string, { tamanho: number; tipo: string }>();
  const pedidosDeEnvio: string[] = [];
  const leituras: { caminho: string; segundos: number; nome: string }[] = [];
  const bytes = new Map<string, Uint8Array>();
  const arquivos: Arquivos = {
    enderecoDeEnvio: (caminho) => {
      pedidosDeEnvio.push(caminho);
      return Promise.resolve(`https://storage.exemplo/envio/${caminho}?token=uso-unico`);
    },
    info: (caminho) => Promise.resolve(guardados.get(caminho) ?? null),
    enderecoDeLeitura: (caminho, segundos, nome) => {
      leituras.push({ caminho, segundos, nome });
      return Promise.resolve(`https://storage.exemplo/ler/${caminho}?token=curto`);
    },
    enviar: (caminho, dados, tipo, substituir) => {
      if (bytes.has(caminho) && !substituir) return Promise.reject(new Error("Storage respondeu 409"));
      bytes.set(caminho, dados);
      guardados.set(caminho, { tamanho: dados.length, tipo });
      return Promise.resolve();
    },
    baixar: (caminho) => Promise.resolve(bytes.get(caminho) ?? null),
  };
  return { arquivos, guardados, pedidosDeEnvio, leituras, bytes };
}
