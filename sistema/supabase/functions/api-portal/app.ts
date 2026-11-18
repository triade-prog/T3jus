// API do Portal do advogado. Login (F0.6) e escolha do escritório na sessão (F0.3):
// o navegador nunca manda o escritório nas chamadas; ele vem da sessão, conferida no banco.

import type { MiddlewareHandler } from "hono";
import {
  areasSchema, buscaClientesSchema, cadastrarClienteSchema, CAMPOS_CLIENTE_BANCO, convidarEquipeSchema, COOKIES_PORTAL, editarClienteSchema, ErroDominio,
  escolherEscritorioSchema, inativarClienteSchema, reativarClienteSchema, registrarAtendimentoSchema, retirarEquipeSchema,
  type Atendimento, type DadosCliente, type FichaCliente, type ListaClientes, type PessoaEquipePortal, type PossivelDuplicado,
} from "@t3jus/domain";
import type { Context } from "hono";
import type { AdminAuth } from "../_shared/auth.ts";
import { criarApp } from "../_shared/app.ts";
import { criarSessao, type DepsSessao, type VarsSessao } from "../_shared/sessao.ts";
import { lerCorpo } from "../_shared/validar.ts";

export type VarsPortal = { Variables: VarsSessao["Variables"] & { escritorioId: string } };

interface EscritorioDaPessoa {
  escritorio_id: string;
  nome: string;
  funcoes: string[];
}

interface LinhaEscolha {
  escritorio_id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  ultima_entrada: string | null;
}

export interface DepsPortal extends DepsSessao {
  /** Endereço do Portal (links de senha e convite da equipe). */
  urlApp: string;
  /** Convites da equipe do escritório (PA-02): conta própria no Auth, e-mail só lá. */
  admin: AdminAuth;
}

interface LinhaHistoricoEquipe {
  id: number;
  ocorrido_em: string;
  autor_id: string | null;
  autor_nome: string | null;
  acao: string;
  entidade_id: string | null;
  dados: Record<string, unknown>;
  pessoa_nome: string | null;
  para_nome: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Id de rota: fora do formato, responde como não encontrado. */
function idDaRota(c: Context, nome: string): string {
  const id = c.req.param(nome);
  if (!id || !UUID.test(id)) throw new ErroDominio("NOT_FOUND");
  return id.toLowerCase();
}

export function criarApiPortal(segredo: string | undefined, deps: DepsPortal) {
  const app = criarApp<VarsPortal>("api-portal", segredo);
  const sessao = criarSessao(
    { sistema: "portal", cookie: COOKIES_PORTAL.sessao, cookieLink: COOKIES_PORTAL.link, autenticadorObrigatorio: false, funcaoAcesso: "acesso_portal", urlApp: deps.urlApp },
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

  // Escolha do escritório (tela aprovada): do último usado ao mais antigo, com a cidade.
  app.get("/v1/sessao/escolha", async (c) => {
    const s = c.get("sessao");
    const linhas = await deps.banco.rpc<LinhaEscolha[]>("escritorios_para_escolher", { p_pessoa: s.pessoaId });
    return c.json({
      email: s.email,
      escritorios: linhas.map((x) => ({ id: x.escritorio_id, nome: x.nome, cidade: x.cidade, uf: x.uf, ultimaEntrada: x.ultima_entrada })),
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
  // O escritório da sessão, com o que a moldura precisa: as áreas da pessoa e se ela é o
  // sócio dono (PA-01, PA-02), e a ficha só para leitura.
  app.get("/v1/escritorio", async (c) => {
    const id = c.get("escritorioId");
    const pessoaId = c.get("sessao").pessoaId;
    const escritorios = await deps.banco.rpc<EscritorioDaPessoa[]>("meus_escritorios", { p_pessoa: pessoaId });
    const atual = escritorios.find((x) => x.escritorio_id === id);
    if (!atual) throw new ErroDominio("ESCRITORIO_REQUIRED");
    const dados = await deps.banco.rpc<Record<string, unknown>>("portal_escritorio", { p_pessoa: pessoaId, p_escritorio: id });
    return c.json({ ...dados, id, nome: atual.nome, funcoes: atual.funcoes, outrosEscritorios: escritorios.length - 1 });
  });

  // Equipe do escritório (PA-02): só o sócio dono. O banco confere em cada chamada.
  const quem = (c: Context<VarsPortal>) => ({ p_pessoa: c.get("sessao").pessoaId, p_escritorio: c.get("escritorioId") });

  app.get("/v1/escritorio/equipe", async (c) => {
    const pessoas = await deps.banco.rpc<Omit<PessoaEquipePortal, "email">[]>("portal_equipe", quem(c));
    const comEmail: PessoaEquipePortal[] = await Promise.all(pessoas.map(async (p) => ({ ...p, email: await deps.admin.emailDe(p.pessoaId) })));
    return c.json({ pessoas: comEmail });
  });

  // Convidar (PT-20): a permissão é conferida antes de a conta nascer no Auth.
  app.post("/v1/escritorio/equipe", async (c) => {
    const d = await lerCorpo(c, convidarEquipeSchema);
    await deps.banco.rpc("portal_equipe", quem(c));
    if (!(await deps.banco.rpc<boolean>("limite_contar", { p_tipo: "convite", p_chave: c.get("sessao").pessoaId }))) throw new ErroDominio("RATE_LIMITED");
    const conta = await deps.admin.convidar(d.email, `${deps.urlApp}/criar-senha`);
    const vinculoId = await deps.banco.rpc<string>("portal_convidar", { ...quem(c), p_convidado: conta.userId, p_nome: d.nome, p_areas: d.areas });
    return c.json({ vinculoId, contaNova: conta.contaNova }, 201);
  });

  app.put("/v1/escritorio/equipe/:vinculo/areas", async (c) => {
    const d = await lerCorpo(c, areasSchema);
    const areas = await deps.banco.rpc<string[]>("portal_mudar_areas", { ...quem(c), p_vinculo: idDaRota(c, "vinculo"), p_areas: d.areas });
    return c.json({ areas });
  });

  // Reenviar o convite de quem ainda não criou a senha: o link antigo deixa de valer.
  app.post("/v1/escritorio/equipe/:vinculo/reenviar", async (c) => {
    const vinculo = idDaRota(c, "vinculo");
    if (!(await deps.banco.rpc<boolean>("limite_contar", { p_tipo: "convite", p_chave: c.get("sessao").pessoaId }))) throw new ErroDominio("RATE_LIMITED");
    const membro = await deps.banco.rpc<string>("portal_reenviar_convite", { ...quem(c), p_vinculo: vinculo });
    const email = await deps.admin.emailDe(membro);
    if (!email) throw new ErroDominio("NOT_FOUND");
    return c.json({ enviado: await deps.admin.reenviarConvite(email, `${deps.urlApp}/criar-senha`) });
  });

  // Retirar (PT-21, EX-10): quem já entrou passa o que era dela para alguém da equipe.
  app.post("/v1/escritorio/equipe/:vinculo/retirar", async (c) => {
    const d = await lerCorpo(c, retirarEquipeSchema);
    const r = await deps.banco.rpc<{ versao: number; passouPara?: string }>("portal_retirar", {
      ...quem(c), p_vinculo: idDaRota(c, "vinculo"), p_versao: d.versao, p_passar_para: d.passarPara,
    });
    return c.json(r);
  });

  app.get("/v1/escritorio/equipe/historico", async (c) => {
    const antes = Number(c.req.query("antes"));
    const limite = Number(c.req.query("limite"));
    const linhas = await deps.banco.rpc<LinhaHistoricoEquipe[]>("portal_historico_equipe", {
      ...quem(c),
      p_antes: Number.isInteger(antes) && antes > 0 ? antes : null,
      p_limite: Number.isInteger(limite) && limite > 0 ? Math.min(limite, 200) : 50,
    });
    return c.json({
      eventos: linhas.map((l) => ({
        id: l.id, ocorridoEm: l.ocorrido_em, autor: l.autor_id ? { id: l.autor_id, nome: l.autor_nome } : null,
        acao: l.acao, entidadeId: l.entidade_id, dados: l.dados, pessoa: l.pessoa_nome, passouPara: l.para_nome,
      })),
    });
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

  // ---------------------------------------------------------------------------------------
  // Clientes (AP-01, AP-02, AP-04, AP-06). Todos da equipe abrem a lista e a ficha; o banco
  // tira a origem, o próximo contato e os atendimentos de quem não tem a área Comercial.

  app.get("/v1/escritorio/clientes", async (c) => {
    const r = buscaClientesSchema.safeParse({ q: c.req.query("q"), situacao: c.req.query("situacao") || undefined, vencidos: c.req.query("vencidos") });
    if (!r.success) throw new ErroDominio("VALIDATION_ERROR", { campos: [...new Set(r.error.issues.map((i) => String(i.path[0] ?? "")))] });
    const lista = await deps.banco.rpc<ListaClientes>("portal_clientes", {
      ...quem(c), p_termo: r.data.q || null, p_situacao: r.data.situacao, p_vencidos: r.data.vencidos,
    });
    return c.json(lista);
  });

  // Possível duplicado: mesmo CPF, CNPJ ou telefone. É aviso, não bloqueio.
  app.get("/v1/escritorio/clientes/duplicados", async (c) => {
    const ignorar = c.req.query("ignorar");
    const duplicados = await deps.banco.rpc<PossivelDuplicado[]>("portal_clientes_duplicados", {
      ...quem(c),
      p_documento: (c.req.query("documento") ?? "").slice(0, 30) || null,
      p_telefone: (c.req.query("telefone") ?? "").slice(0, 30) || null,
      p_ignorar: ignorar && UUID.test(ignorar) ? ignorar.toLowerCase() : null,
    });
    return c.json({ duplicados });
  });

  app.post("/v1/escritorio/clientes", async (c) => {
    const d = await lerCorpo(c, cadastrarClienteSchema);
    const r = await deps.banco.rpc<{ id: string; versao: number }>("portal_cliente_cadastrar", { ...quem(c), p_dados: clienteParaBanco(d) });
    return c.json(r, 201);
  });

  app.get("/v1/escritorio/clientes/:id", async (c) => {
    const f = await deps.banco.rpc<Record<string, unknown>>("portal_cliente", { ...quem(c), p_cliente: idDaRota(c, "id") });
    return c.json(camelCase(f) as unknown as FichaCliente);
  });

  app.put("/v1/escritorio/clientes/:id", async (c) => {
    const { versao, ...d } = await lerCorpo(c, editarClienteSchema);
    const r = await deps.banco.rpc<{ id: string; versao: number }>("portal_cliente_editar", {
      ...quem(c), p_cliente: idDaRota(c, "id"), p_versao: versao, p_dados: clienteParaBanco(d),
    });
    return c.json(r);
  });

  // Inativar e reativar: só quem tem a área Comercial (decisão 2); nada é apagado.
  app.post("/v1/escritorio/clientes/:id/inativar", async (c) => {
    const d = await lerCorpo(c, inativarClienteSchema);
    const versao = await deps.banco.rpc<number>("portal_cliente_inativar", { ...quem(c), p_cliente: idDaRota(c, "id"), p_versao: d.versao, p_motivo: d.motivo });
    return c.json({ versao });
  });

  app.post("/v1/escritorio/clientes/:id/reativar", async (c) => {
    const d = await lerCorpo(c, reativarClienteSchema);
    const versao = await deps.banco.rpc<number>("portal_cliente_reativar", { ...quem(c), p_cliente: idDaRota(c, "id"), p_versao: d.versao, p_motivo: d.motivo });
    return c.json({ versao });
  });

  // Atendimentos (AP-02, AP-06): só o Comercial; não se editam nem se apagam (decisão 3).
  app.get("/v1/escritorio/clientes/:id/atendimentos", async (c) => {
    const atendimentos = await deps.banco.rpc<Atendimento[]>("portal_atendimentos", { ...quem(c), p_cliente: idDaRota(c, "id") });
    return c.json({ atendimentos });
  });

  app.post("/v1/escritorio/clientes/:id/atendimentos", async (c) => {
    const d = await lerCorpo(c, registrarAtendimentoSchema);
    const id = await deps.banco.rpc<string>("portal_registrar_atendimento", { ...quem(c), p_cliente: idDaRota(c, "id"), p_dados: d });
    return c.json({ id }, 201);
  });

  // Quem pode ser responsável pelo próximo contato ou ter atendido.
  app.get("/v1/escritorio/pessoas", async (c) => {
    return c.json({ pessoas: await deps.banco.rpc<{ id: string; nome: string }[]>("portal_pessoas_escritorio", quem(c)) });
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

/** Os campos do cliente com os nomes do banco. */
function clienteParaBanco(d: Partial<DadosCliente>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d)) if (CAMPOS_CLIENTE_BANCO[k]) r[CAMPOS_CLIENTE_BANCO[k]] = v;
  return r;
}

/** rep_nome vira repNome (só o primeiro nível). */
function camelCase(o: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/_([a-z])/g, (_, l: string) => l.toUpperCase()), v]));
}
