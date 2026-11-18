// API do Portal do advogado. Login (F0.6) e escolha do escritório na sessão (F0.3):
// o navegador nunca manda o escritório nas chamadas; ele vem da sessão, conferida no banco.

import type { MiddlewareHandler } from "hono";
import { COOKIES_PORTAL, ErroDominio, escolherEscritorioSchema } from "@t3jus/domain";
import { criarApp } from "../_shared/app.ts";
import { criarSessao, type DepsSessao, type VarsSessao } from "../_shared/sessao.ts";
import { lerCorpo } from "../_shared/validar.ts";

export type VarsPortal = { Variables: VarsSessao["Variables"] & { escritorioId: string } };

interface EscritorioDaPessoa {
  escritorio_id: string;
  nome: string;
  funcoes: string[];
}

export function criarApiPortal(segredo: string | undefined, deps: DepsSessao & { urlApp: string }) {
  const app = criarApp<VarsPortal>("api-portal", segredo);
  const sessao = criarSessao(
    { sistema: "portal", cookie: COOKIES_PORTAL.sessao, autenticadorObrigatorio: false, funcaoAcesso: "acesso_portal", urlApp: deps.urlApp },
    deps,
  );

  app.get("/v1/saude", (c) => c.json({ ok: true, servico: "api-portal" }));
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
  for (const rota of ["/v1/escritorio", "/v1/escritorio/*"]) app.use(rota, exigirEscritorio(deps));
  app.get("/v1/escritorio", async (c) => {
    const id = c.get("escritorioId");
    const escritorios = await deps.banco.rpc<EscritorioDaPessoa[]>("meus_escritorios", { p_pessoa: c.get("sessao").pessoaId });
    const atual = escritorios.find((x) => x.escritorio_id === id);
    if (!atual) throw new ErroDominio("ESCRITORIO_REQUIRED");
    return c.json({ id, nome: atual.nome, funcoes: atual.funcoes });
  });

  // Exportação completa do escritório (PT-15): só o sócio, só o escritório da sessão. O que
  // sai é o que o inventário de dados marca para exportar (PT-11); a exportação fica no histórico.
  app.post("/v1/escritorio/exportacao", async (c) => {
    const id = c.get("escritorioId");
    const dados = await deps.banco.rpc<Record<string, unknown>>("exportar_escritorio", { p_pessoa: c.get("sessao").pessoaId, p_escritorio: id });
    const dia = String(dados.geradoEm ?? "").slice(0, 10) || "dados";
    c.header("Content-Disposition", `attachment; filename="t3jus-exportacao-${dia}.json"`);
    c.header("Cache-Control", "no-store");
    return c.json(dados);
  });

  return app;
}

/** Rotas de dado de escritório: sessão completa e o escritório escolhido, ainda com vínculo ativo. */
export function exigirEscritorio(deps: DepsSessao): MiddlewareHandler<VarsPortal> {
  return async (c, next) => {
    const s = c.get("sessao");
    const escritorio = await deps.banco.rpc<string | null>("escritorio_da_sessao", { p_pessoa: s.pessoaId, p_sessao: s.sessaoId });
    if (!escritorio) throw new ErroDominio("ESCRITORIO_REQUIRED");
    c.set("escritorioId", escritorio);
    await next();
  };
}
