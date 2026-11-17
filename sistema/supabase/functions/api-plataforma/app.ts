// API da Plataforma do escritório. Login (F0.6) e escolha do escritório na sessão (F0.3):
// o navegador nunca manda o escritório nas chamadas; ele vem da sessão, conferida no banco.

import type { MiddlewareHandler } from "hono";
import { COOKIES_PLATAFORMA, ErroDominio, escolherEscritorioSchema } from "@t3just/domain";
import { criarApp } from "../_shared/app.ts";
import { criarSessao, type DepsSessao, type VarsSessao } from "../_shared/sessao.ts";
import { lerCorpo } from "../_shared/validar.ts";

export type VarsPlataforma = { Variables: VarsSessao["Variables"] & { escritorioId: string } };

interface EscritorioDaPessoa {
  escritorio_id: string;
  nome: string;
  funcoes: string[];
}

export function criarApiPlataforma(segredo: string | undefined, deps: DepsSessao & { urlApp: string }) {
  const app = criarApp<VarsPlataforma>("api-plataforma", segredo);
  const sessao = criarSessao(
    { sistema: "plataforma", cookie: COOKIES_PLATAFORMA.sessao, autenticadorObrigatorio: false, funcaoAcesso: "acesso_plataforma", urlApp: deps.urlApp },
    deps,
  );

  app.get("/v1/saude", (c) => c.json({ ok: true, servico: "api-plataforma" }));
  sessao.rotas(app);

  for (const rota of ["/v1/sessao", "/v1/sessao/*", "/v1/escritorio", "/v1/escritorio/*"]) app.use(rota, sessao.exigirSessao);

  // Quem está logado, os escritórios dele e o escolhido nesta sessão.
  app.get("/v1/sessao", async (c) => {
    const s = c.get("sessao");
    const escritorios = await deps.banco.rpc<EscritorioDaPessoa[]>("meus_escritorios", { p_pessoa: s.pessoaId });
    const atual = await deps.banco.rpc<string | null>("escritorio_da_sessao", { p_pessoa: s.pessoaId, p_sessao: s.sessaoId });
    return c.json({
      pessoaId: s.pessoaId,
      escritorioAtual: atual,
      escritorios: escritorios.map((x) => ({ id: x.escritorio_id, nome: x.nome, funcoes: x.funcoes })),
    });
  });

  app.put("/v1/sessao/escritorio", async (c) => {
    const s = c.get("sessao");
    const { escritorioId } = await lerCorpo(c, escolherEscritorioSchema);
    await deps.banco.rpc("escolher_escritorio", { p_pessoa: s.pessoaId, p_sessao: s.sessaoId, p_escritorio: escritorioId });
    return c.json({ escritorioAtual: escritorioId });
  });

  // O escritório em que a pessoa está agora: o escolhido na sessão, ainda com vínculo ativo.
  app.use("/v1/escritorio", exigirEscritorio(deps));
  app.get("/v1/escritorio", async (c) => {
    const id = c.get("escritorioId");
    const escritorios = await deps.banco.rpc<EscritorioDaPessoa[]>("meus_escritorios", { p_pessoa: c.get("sessao").pessoaId });
    const atual = escritorios.find((x) => x.escritorio_id === id);
    if (!atual) throw new ErroDominio("ESCRITORIO_REQUIRED");
    return c.json({ id, nome: atual.nome, funcoes: atual.funcoes });
  });

  return app;
}

/** Rotas de dado de escritório: sessão completa e o escritório escolhido, ainda com vínculo ativo. */
export function exigirEscritorio(deps: DepsSessao): MiddlewareHandler<VarsPlataforma> {
  return async (c, next) => {
    const s = c.get("sessao");
    const escritorio = await deps.banco.rpc<string | null>("escritorio_da_sessao", { p_pessoa: s.pessoaId, p_sessao: s.sessaoId });
    if (!escritorio) throw new ErroDominio("ESCRITORIO_REQUIRED");
    c.set("escritorioId", escritorio);
    await next();
  };
}
