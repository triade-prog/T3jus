// API do Console T3jus. Só a equipe ativa, sempre com o autenticador (F0.6, PT-08).
// Passo 1: carteira, ficha, convite do sócio, notas internas, histórico e equipe.
// Quem pode o quê é decidido no banco (funções internas e clientes atribuídos, PT-24); aqui
// só se valida a entrada e se fala com o Auth para os convites.

import type { Context } from "hono";
import {
  atribuirSchema,
  cadastrarMembroSchema,
  contratoSchema,
  convidarPessoaSchema,
  COOKIES_CONSOLE,
  criarEscritorioSchema,
  ErroDominio,
  iniciarDocumentoSchema,
  estagioSchema,
  fichaSchema,
  funcoesSchema,
  notaSchema,
  versaoSchema,
  type SocioCliente,
} from "@t3jus/domain";
import type { AdminAuth } from "../_shared/auth.ts";
import { VALIDADE_LEITURA_S, type Arquivos } from "../_shared/arquivos.ts";
import { criarApp } from "../_shared/app.ts";
import { criarSessao, type DepsSessao, type VarsSessao } from "../_shared/sessao.ts";
import { lerCorpo } from "../_shared/validar.ts";

export interface DepsConsole extends DepsSessao {
  admin: AdminAuth;
  /** Endereço do Console (links de senha e convite da equipe). */
  urlApp: string;
  /** Endereço do Portal (convite do sócio). */
  urlPortal: string;
  /** Storage dos anexos do cliente (CO-05). */
  arquivos: Arquivos;
}

interface LinhaCarteira {
  escritorio_id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  estagio: string;
  funcoes: string[];
  situacoes: string[];
  criado_em: string;
  socios: SocioCliente[];
  equipe: { pessoaId: string; nome: string; funcoes: string[] }[];
  ultima_atividade: string;
}

interface LinhaHistorico {
  id: number;
  ocorrido_em: string;
  autor_tipo?: string;
  autor_id: string | null;
  autor_nome: string | null;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  dados: Record<string, unknown>;
  interno?: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Id de rota: fora do formato, responde como não encontrado. */
function idDaRota(c: Context, nome: string): string {
  const id = c.req.param(nome);
  if (!id || !UUID.test(id)) throw new ErroDominio("NOT_FOUND");
  return id.toLowerCase();
}

function paginacao(c: Context): { p_antes: number | null; p_limite: number } {
  const antes = Number(c.req.query("antes"));
  const limite = Number(c.req.query("limite"));
  return {
    p_antes: Number.isInteger(antes) && antes > 0 ? antes : null,
    p_limite: Number.isInteger(limite) && limite > 0 ? Math.min(limite, 200) : 50,
  };
}

function historico(l: LinhaHistorico) {
  return {
    id: l.id,
    ocorridoEm: l.ocorrido_em,
    autor: l.autor_id ? { id: l.autor_id, nome: l.autor_nome } : null,
    acao: l.acao,
    entidade: l.entidade,
    entidadeId: l.entidade_id,
    dados: l.dados,
    ...(l.interno === undefined ? {} : { interno: l.interno }),
  };
}

export function criarApiConsole(segredo: string | undefined, deps: DepsConsole) {
  const app = criarApp<VarsSessao>("api-console", segredo);
  const sessao = criarSessao(
    { sistema: "console", cookie: COOKIES_CONSOLE.sessao, cookieLink: COOKIES_CONSOLE.link, autenticadorObrigatorio: true, funcaoAcesso: "acesso_console", urlApp: deps.urlApp },
    deps,
  );
  const rpc = deps.banco.rpc.bind(deps.banco);

  /** Convite pelo Auth, com limite por pessoa da equipe. */
  async function convidar(pessoaId: string, email: string, voltarPara: string) {
    if (!(await rpc<boolean>("limite_contar", { p_tipo: "convite", p_chave: pessoaId }))) throw new ErroDominio("RATE_LIMITED");
    return await deps.admin.convidar(email, `${voltarPara}/criar-senha`);
  }

  app.get("/v1/saude", (c) => c.json({ ok: true, servico: "api-console" }));
  sessao.rotas(app);

  for (const rota of ["/v1/sessao", "/v1/clientes", "/v1/clientes/*", "/v1/equipe", "/v1/equipe/*"]) app.use(rota, sessao.exigirSessao);
  const pessoa = (c: Context<VarsSessao>) => c.get("sessao").pessoaId;

  // Quem está no Console: nome, funções e o que pode fazer fora de um cliente.
  app.get("/v1/sessao", async (c) => c.json(await rpc("console_sessao", { p_pessoa: pessoa(c) })));

  // Carteira (CO-01): só os clientes atribuídos.
  app.get("/v1/clientes", async (c) => {
    const linhas = await rpc<LinhaCarteira[]>("console_carteira", { p_pessoa: pessoa(c) });
    return c.json({
      clientes: linhas.map((l) => ({
        id: l.escritorio_id,
        nome: l.nome,
        cidade: l.cidade,
        uf: l.uf,
        estagio: l.estagio,
        funcoes: l.funcoes,
        situacoes: l.situacoes,
        criadoEm: l.criado_em,
        socios: l.socios,
        equipe: l.equipe,
        ultimaAtividade: l.ultima_atividade,
      })),
    });
  });

  app.post("/v1/clientes", async (c) => {
    const d = await lerCorpo(c, criarEscritorioSchema);
    const id = await rpc<string>("console_criar_escritorio", {
      p_pessoa: pessoa(c), p_nome: d.nome, p_cidade: d.cidade, p_uf: d.uf,
    });
    return c.json({ id }, 201);
  });

  // Ficha (CO-02). O e-mail dos sócios vem do Auth (o banco só guarda o nome).
  app.get("/v1/clientes/:id", async (c) => {
    const ficha = await rpc<{ socios: SocioCliente[] }>("console_ficha", { p_pessoa: pessoa(c), p_escritorio: idDaRota(c, "id") });
    const socios = await Promise.all(ficha.socios.map(async (s) => ({ ...s, email: await deps.admin.emailDe(s.pessoaId) })));
    return c.json({ ...ficha, socios });
  });

  app.put("/v1/clientes/:id/ficha", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, fichaSchema);
    const versao = await rpc<number>("console_editar_ficha", {
      p_pessoa: pessoa(c), p_escritorio: id, p_versao: d.versao, p_nome: d.nome, p_cidade: d.cidade, p_uf: d.uf,
      p_endereco: d.endereco, p_cnpj: d.cnpj, p_contatos: d.contatos,
    });
    return c.json({ versao });
  });

  // Referência do contrato (CO-02): só administração.
  app.put("/v1/clientes/:id/contrato", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, contratoSchema);
    return c.json({
      versao: await rpc<number>("console_alterar_contrato", { p_pessoa: pessoa(c), p_escritorio: id, p_versao: d.versao, p_referencia: d.referenciaContrato }),
    });
  });

  // Estágio (CO-01).
  app.put("/v1/clientes/:id/estagio", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, estagioSchema);
    return c.json({
      versao: await rpc<number>("console_mudar_estagio", { p_pessoa: pessoa(c), p_escritorio: id, p_versao: d.versao, p_estagio: d.estagio, p_motivo: d.motivo }),
    });
  });

  // Convidar o sócio (PT-20): conta própria, ligada ao escritório. A permissão é conferida
  // no banco antes do convite sair (console_ficha falha para quem não está atribuído).
  app.post("/v1/clientes/:id/socios", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, convidarPessoaSchema);
    const ficha = await rpc<{ permissoes: string[] }>("console_ficha", { p_pessoa: pessoa(c), p_escritorio: id });
    if (!ficha.permissoes.includes("console.socios.convidar")) throw new ErroDominio("FORBIDDEN");
    const conta = await convidar(pessoa(c), d.email, deps.urlPortal);
    const vinculoId = await rpc<string>("console_vincular_socio", {
      p_pessoa: pessoa(c), p_escritorio: id, p_convidado: conta.userId, p_nome: d.nome,
    });
    return c.json({ vinculoId, contaNova: conta.contaNova }, 201);
  });

  // Reenviar o convite do sócio que ainda não criou a senha (PT-20). O banco confere a
  // permissão e o vínculo; quem já tem conta com senha não recebe e-mail.
  app.post("/v1/clientes/:id/socios/:vinculo/reenviar", async (c) => {
    const id = idDaRota(c, "id");
    const vinculo = idDaRota(c, "vinculo");
    if (!(await rpc<boolean>("limite_contar", { p_tipo: "convite", p_chave: pessoa(c) }))) throw new ErroDominio("RATE_LIMITED");
    const convidado = await rpc<string>("console_reenviar_convite", { p_pessoa: pessoa(c), p_escritorio: id, p_vinculo: vinculo });
    const email = await deps.admin.emailDe(convidado);
    if (!email) throw new ErroDominio("NOT_FOUND");
    return c.json({ enviado: await deps.admin.reenviarConvite(email, `${deps.urlPortal}/criar-senha`) });
  });

  // Contrato e documentos do cliente (CO-05). O arquivo vai direto do navegador para o
  // Storage; aqui só se registra, confere e assina. O caminho é <escritório>/<documento>,
  // montado no servidor: o navegador nunca escolhe onde grava.
  app.get("/v1/clientes/:id/documentos", async (c) => {
    const linhas = await rpc<{ id: string; categoria: string; nome: string; tipo: string; tamanho: number; enviado_por: string; enviado_por_nome: string | null; concluido_em: string }[]>(
      "console_documentos", { p_pessoa: pessoa(c), p_escritorio: idDaRota(c, "id") });
    return c.json({
      documentos: linhas.map((d) => ({
        id: d.id, categoria: d.categoria, nome: d.nome, tipo: d.tipo, tamanho: d.tamanho,
        enviadoPor: { id: d.enviado_por, nome: d.enviado_por_nome }, enviadoEm: d.concluido_em,
      })),
    });
  });

  app.post("/v1/clientes/:id/documentos", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, iniciarDocumentoSchema);
    const documento = await rpc<string>("console_documento_iniciar", {
      p_pessoa: pessoa(c), p_escritorio: id, p_categoria: d.categoria, p_nome: d.nome, p_tipo: d.tipo, p_tamanho: d.tamanho,
    });
    return c.json({ id: documento, enderecoDeEnvio: await deps.arquivos.enderecoDeEnvio(`${id}/${documento}`) }, 201);
  });

  app.post("/v1/clientes/:id/documentos/:doc/concluir", async (c) => {
    const id = idDaRota(c, "id");
    const doc = idDaRota(c, "doc");
    const [registro] = await rpc<{ tipo: string; tamanho: number }[]>("console_documento_para_concluir", { p_pessoa: pessoa(c), p_escritorio: id, p_documento: doc });
    const chegou = await deps.arquivos.info(`${id}/${doc}`);
    if (!registro || !chegou || chegou.tamanho !== registro.tamanho || chegou.tipo !== registro.tipo) {
      throw new ErroDominio("VALIDATION_ERROR", { campos: ["arquivo"], motivo: "ARQUIVO_NAO_CHEGOU" });
    }
    await rpc("console_documento_concluir", { p_pessoa: pessoa(c), p_escritorio: id, p_documento: doc });
    return c.json({ ok: true });
  });

  app.post("/v1/clientes/:id/documentos/:doc/abrir", async (c) => {
    const id = idDaRota(c, "id");
    const doc = idDaRota(c, "doc");
    const nome = await rpc<string>("console_documento_abrir", { p_pessoa: pessoa(c), p_escritorio: id, p_documento: doc });
    return c.json({ url: await deps.arquivos.enderecoDeLeitura(`${id}/${doc}`, VALIDADE_LEITURA_S, nome), validadeSegundos: VALIDADE_LEITURA_S });
  });

  // Notas internas (CO-03).
  app.get("/v1/clientes/:id/notas", async (c) => {
    const linhas = await rpc<{ id: string; texto: string; criado_em: string; autor_id: string; autor_nome: string | null }[]>(
      "console_notas", { p_pessoa: pessoa(c), p_escritorio: idDaRota(c, "id") });
    return c.json({ notas: linhas.map((n) => ({ id: n.id, texto: n.texto, criadoEm: n.criado_em, autor: { id: n.autor_id, nome: n.autor_nome } })) });
  });

  app.post("/v1/clientes/:id/notas", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, notaSchema);
    return c.json({ id: await rpc<string>("console_escrever_nota", { p_pessoa: pessoa(c), p_escritorio: id, p_texto: d.texto }) }, 201);
  });

  // Histórico administrativo do cliente (CO-04).
  app.get("/v1/clientes/:id/historico", async (c) => {
    const linhas = await rpc<LinhaHistorico[]>("console_historico", { p_pessoa: pessoa(c), p_escritorio: idDaRota(c, "id"), ...paginacao(c) });
    return c.json({ eventos: linhas.map(historico) });
  });

  // Atribuir e retirar pessoas da equipe no cliente (PT-24).
  app.post("/v1/clientes/:id/equipe", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, atribuirSchema);
    return c.json({ vinculoId: await rpc<string>("console_atribuir", { p_pessoa: pessoa(c), p_escritorio: id, p_membro: d.pessoaId, p_funcao: d.funcao }) }, 201);
  });

  app.post("/v1/clientes/:id/equipe/:vinculo/retirar", async (c) => {
    const id = idDaRota(c, "id");
    const vinculo = idDaRota(c, "vinculo");
    const d = await lerCorpo(c, versaoSchema);
    return c.json({
      versao: await rpc<number>("console_retirar_atribuicao", { p_pessoa: pessoa(c), p_escritorio: id, p_vinculo: vinculo, p_versao: d.versao }),
    });
  });

  // Equipe (PT-24): só administração.
  app.get("/v1/equipe", async (c) => {
    const linhas = await rpc<{ pessoa_id: string; nome: string; ativa: boolean; funcoes: string[]; desde: string }[]>(
      "console_equipe", { p_pessoa: pessoa(c) });
    return c.json({ pessoas: linhas.map((l) => ({ id: l.pessoa_id, nome: l.nome, ativa: l.ativa, funcoes: l.funcoes, desde: l.desde })) });
  });

  app.post("/v1/equipe", async (c) => {
    const d = await lerCorpo(c, cadastrarMembroSchema);
    // Confere a permissão antes de o convite sair.
    await rpc("console_equipe", { p_pessoa: pessoa(c) });
    const conta = await convidar(pessoa(c), d.email, deps.urlApp);
    await rpc("console_cadastrar_membro", { p_pessoa: pessoa(c), p_membro: conta.userId, p_nome: d.nome, p_funcoes: d.funcoes });
    return c.json({ pessoaId: conta.userId, contaNova: conta.contaNova }, 201);
  });

  app.put("/v1/equipe/:pessoa/funcoes", async (c) => {
    const membro = idDaRota(c, "pessoa");
    const d = await lerCorpo(c, funcoesSchema);
    await rpc("console_definir_funcoes", { p_pessoa: pessoa(c), p_membro: membro, p_funcoes: d.funcoes });
    return c.json({ ok: true });
  });

  app.post("/v1/equipe/:pessoa/desativar", async (c) => {
    await rpc("console_desativar_membro", { p_pessoa: pessoa(c), p_membro: idDaRota(c, "pessoa") });
    return c.json({ ok: true });
  });

  app.get("/v1/equipe/historico", async (c) => {
    const linhas = await rpc<LinhaHistorico[]>("console_historico_equipe", { p_pessoa: pessoa(c), ...paginacao(c) });
    return c.json({ eventos: linhas.map(historico) });
  });

  return app;
}
