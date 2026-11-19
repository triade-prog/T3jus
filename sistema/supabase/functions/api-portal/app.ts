// API do Portal do advogado. Login (F0.6) e escolha do escritório na sessão (F0.3):
// o navegador nunca manda o escritório nas chamadas; ele vem da sessão, conferida no banco.

import type { MiddlewareHandler } from "hono";
import {
  areasSchema, buscaClientesSchema, cadastrarClienteSchema, CAMPOS_CLIENTE_BANCO, convidarEquipeSchema, COOKIES_PORTAL, editarClienteSchema, ErroDominio,
  escolherEscritorioSchema, inativarClienteSchema, reativarClienteSchema, registrarAtendimentoSchema, retirarEquipeSchema,
  cancelarCompromissoSchema, dadosCompromissoSchema, editarCompromissoSchema, periodoAgendaSchema, type Agenda, type FichaCompromisso,
  dadosPropostaSchema, editarPropostaSchema, respostaPropostaSchema, versaoSchema, PERIODOS_COMERCIAL,
  type Retornos, type ListaPropostas, type FichaProposta, type Funil, type OrigemContatos,
  assinaturaContratoSchema, baseMesSchema, dadosContratoSchema, editarContratoSchema, encerrarContratoSchema, MOSTRAR_CONTRATOS,
  type FichaContrato, type HonorariosContratos, type ListaContratos, type PropostaParaContrato,
  anotarCobrancaSchema, FORMAS_PAGAMENTO, MOSTRAR_RECEBER, registrarRecebimentoSchema,
  type ListaReceber, type ParcelasContrato, type RecebimentoRegistrado,
  contatosInicioSchema, excluirDadosSchema, pedirExclusaoSchema, recusarExclusaoSchema,
  type Atendimento, type ContatosDoInicio, type DadosCliente, type PedidoExclusao, type FichaCliente, type ListaClientes, type PessoaEquipePortal, type PossivelDuplicado,
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

  // Pedido de exclusão do titular (F1.15, PT-11): qualquer pessoa da equipe registra o pedido;
  // só a sócia dona exclui ou recusa (decisão 2). O banco confere quem é a dona.
  app.post("/v1/escritorio/clientes/:id/exclusao/pedido", async (c) => {
    const d = await lerCorpo(c, pedirExclusaoSchema);
    const pedido = await deps.banco.rpc<PedidoExclusao>("portal_cliente_pedir_exclusao", { ...quem(c), p_cliente: idDaRota(c, "id"), p_dados: d });
    return c.json(pedido, 201);
  });

  app.post("/v1/escritorio/clientes/:id/exclusao/recusar", async (c) => {
    const d = await lerCorpo(c, recusarExclusaoSchema);
    const pedido = await deps.banco.rpc<PedidoExclusao>("portal_cliente_recusar_exclusao", { ...quem(c), p_cliente: idDaRota(c, "id"), p_motivo: d.motivo });
    return c.json(pedido);
  });

  app.post("/v1/escritorio/clientes/:id/exclusao", async (c) => {
    const { versao, ...d } = await lerCorpo(c, excluirDadosSchema);
    const r = await deps.banco.rpc<{ protocolo: string; versao: number; pedido: PedidoExclusao }>("portal_cliente_excluir_dados", {
      ...quem(c), p_cliente: idDaRota(c, "id"), p_versao: versao, p_dados: d,
    });
    return c.json(r);
  });

  // Início: os contatos vencidos e os de hoje (F1.14, AP-06). "Da equipe" só para a dona.
  app.get("/v1/escritorio/inicio/contatos", async (c) => {
    const r = contatosInicioSchema.safeParse({ de: c.req.query("de") || undefined, limite: c.req.query("limite") || undefined });
    if (!r.success) throw new ErroDominio("VALIDATION_ERROR", { campos: [...new Set(r.error.issues.map((i) => String(i.path[0] ?? "")))] });
    return c.json(await deps.banco.rpc<ContatosDoInicio>("portal_inicio_contatos", { ...quem(c), p_de: r.data.de, p_limite: r.data.limite }));
  });

  // Quem pode ser responsável pelo próximo contato ou ter atendido.
  app.get("/v1/escritorio/pessoas", async (c) => {
    return c.json({ pessoas: await deps.banco.rpc<{ id: string; nome: string }[]>("portal_pessoas_escritorio", quem(c)) });
  });

  // ---------------------------------------------------------------------------------------
  // Agenda (EX-06, EX-11, PD-07): uma só, da equipe toda; todos veem e marcam. Os prazos do
  // Jurídico só vêm para quem tem a área (o banco decide).

  app.get("/v1/escritorio/agenda", async (c) => {
    const r = periodoAgendaSchema.safeParse({ de: c.req.query("de"), ate: c.req.query("ate"), pessoa: c.req.query("pessoa") || undefined });
    if (!r.success) throw new ErroDominio("VALIDATION_ERROR", { campos: [...new Set(r.error.issues.map((i) => String(i.path[0] ?? "")))] });
    return c.json(await deps.banco.rpc<Agenda>("portal_agenda", {
      ...quem(c), p_de: r.data.de, p_ate: r.data.ate, p_de_quem: r.data.pessoa?.toLowerCase() ?? null,
    }));
  });

  app.post("/v1/escritorio/compromissos", async (c) => {
    const d = await lerCorpo(c, dadosCompromissoSchema);
    return c.json(await deps.banco.rpc<{ id: string; versao: number }>("portal_compromisso_marcar", { ...quem(c), p_dados: d }), 201);
  });

  app.get("/v1/escritorio/compromissos/:id", async (c) => {
    return c.json(await deps.banco.rpc<FichaCompromisso>("portal_compromisso", { ...quem(c), p_compromisso: idDaRota(c, "id") }));
  });

  // Editar ou remarcar: segue a versão lida (PT-19); mudar o dia ou a hora pede o motivo.
  app.put("/v1/escritorio/compromissos/:id", async (c) => {
    const { versao, motivo, ...d } = await lerCorpo(c, editarCompromissoSchema);
    return c.json(await deps.banco.rpc<{ id: string; versao: number }>("portal_compromisso_editar", {
      ...quem(c), p_compromisso: idDaRota(c, "id"), p_versao: versao, p_dados: d, p_motivo: motivo ?? null,
    }));
  });

  // Cancelar não apaga (PT-03): fica riscado, com o motivo.
  app.post("/v1/escritorio/compromissos/:id/cancelar", async (c) => {
    const d = await lerCorpo(c, cancelarCompromissoSchema);
    const versao = await deps.banco.rpc<number>("portal_compromisso_cancelar", {
      ...quem(c), p_compromisso: idDaRota(c, "id"), p_versao: d.versao, p_motivo: d.motivo, p_avisar: d.avisar,
    });
    return c.json({ versao });
  });

  // ------------------------------------------------------------------ Comercial (AP-02 a AP-06)
  // Só com a área Comercial: o banco recusa com AREA_NAO_LIBERADA.

  app.get("/v1/escritorio/comercial/retornos", async (c) => {
    const resp = c.req.query("responsavel") || null;
    if (resp && !UUID.test(resp)) throw new ErroDominio("VALIDATION_ERROR", { campos: ["responsavel"] });
    return c.json(await deps.banco.rpc<Retornos>("portal_comercial_retornos", { ...quem(c), p_responsavel: resp?.toLowerCase() ?? null }));
  });

  app.get("/v1/escritorio/propostas", async (c) => {
    const mostrar = (c.req.query("mostrar") || "ANDAMENTO").toUpperCase();
    if (!["ANDAMENTO", "CONTRATO", "RECUSADAS"].includes(mostrar)) throw new ErroDominio("VALIDATION_ERROR", { campos: ["mostrar"] });
    const q = c.req.query("q") ?? null;
    if (q && q.length > 120) throw new ErroDominio("VALIDATION_ERROR", { campos: ["q"] });
    return c.json(await deps.banco.rpc<ListaPropostas>("portal_propostas", { ...quem(c), p_mostrar: mostrar, p_q: q }));
  });

  app.post("/v1/escritorio/propostas", async (c) => {
    const d = await lerCorpo(c, dadosPropostaSchema);
    return c.json(await deps.banco.rpc<{ id: string; numero: string; versao: number }>("portal_proposta_criar", { ...quem(c), p_dados: d }), 201);
  });

  app.get("/v1/escritorio/propostas/:id", async (c) => {
    return c.json(await deps.banco.rpc<FichaProposta>("portal_proposta", { ...quem(c), p_proposta: idDaRota(c, "id") }));
  });

  // Editar segue a versão lida (PT-19); a mudança fica no histórico com as condições de antes.
  app.put("/v1/escritorio/propostas/:id", async (c) => {
    const { versao, ...d } = await lerCorpo(c, editarPropostaSchema);
    return c.json(await deps.banco.rpc<{ id: string; versao: number }>("portal_proposta_editar", {
      ...quem(c), p_proposta: idDaRota(c, "id"), p_versao: versao, p_dados: d,
    }));
  });

  // "Enviada" é marcada à mão: o escritório envia como já envia.
  app.post("/v1/escritorio/propostas/:id/enviada", async (c) => {
    const d = await lerCorpo(c, versaoSchema);
    const versao = await deps.banco.rpc<number>("portal_proposta_enviada", { ...quem(c), p_proposta: idDaRota(c, "id"), p_versao: d.versao });
    return c.json({ versao });
  });

  // Aceitou, pediu mudança ou recusou: grava o atendimento do cliente e encerra o retorno.
  app.post("/v1/escritorio/propostas/:id/resposta", async (c) => {
    const { versao, ...d } = await lerCorpo(c, respostaPropostaSchema);
    return c.json(await deps.banco.rpc<{ id: string; versao: number; situacao: string }>("portal_proposta_resposta", {
      ...quem(c), p_proposta: idDaRota(c, "id"), p_versao: versao, p_dados: d,
    }));
  });

  app.post("/v1/escritorio/propostas/:id/pedir-contrato", async (c) => {
    await deps.banco.rpc("portal_proposta_pedir_contrato", { ...quem(c), p_proposta: idDaRota(c, "id") });
    return c.json({ ok: true });
  });

  app.get("/v1/escritorio/comercial/funil", async (c) => {
    const periodo = c.req.query("periodo") || "90";
    if (!(periodo in PERIODOS_COMERCIAL)) throw new ErroDominio("VALIDATION_ERROR", { campos: ["periodo"] });
    return c.json(await deps.banco.rpc<Funil>("portal_comercial_funil", { ...quem(c), p_periodo: periodo }));
  });

  app.get("/v1/escritorio/comercial/origem", async (c) => {
    const periodo = c.req.query("periodo") || "90";
    if (!(periodo in PERIODOS_COMERCIAL)) throw new ErroDominio("VALIDATION_ERROR", { campos: ["periodo"] });
    return c.json(await deps.banco.rpc<OrigemContatos>("portal_comercial_origem", { ...quem(c), p_periodo: periodo }));
  });

  // ------------------------------------------------------------------ Contratos (CH-01 a CH-06, IN-01)
  // Só com a área Contratos: o banco recusa com AREA_NAO_LIBERADA.

  app.get("/v1/escritorio/contratos", async (c) => {
    const mostrar = (c.req.query("mostrar") || "ATIVOS").toUpperCase();
    if (!(MOSTRAR_CONTRATOS as readonly string[]).includes(mostrar)) throw new ErroDominio("VALIDATION_ERROR", { campos: ["mostrar"] });
    const q = c.req.query("q") ?? null;
    if (q && q.length > 120) throw new ErroDominio("VALIDATION_ERROR", { campos: ["q"] });
    return c.json(await deps.banco.rpc<ListaContratos>("portal_contratos", { ...quem(c), p_mostrar: mostrar, p_q: q }));
  });

  // O formulário do contrato a partir da proposta aceita, sem redigitar (IN-01).
  app.get("/v1/escritorio/contratos/da-proposta/:id", async (c) => {
    return c.json(await deps.banco.rpc<PropostaParaContrato>("portal_contrato_da_proposta", { ...quem(c), p_proposta: idDaRota(c, "id") }));
  });

  app.get("/v1/escritorio/contratos/honorarios", async (c) => {
    return c.json(await deps.banco.rpc<HonorariosContratos>("portal_contratos_honorarios", quem(c)));
  });

  app.post("/v1/escritorio/contratos", async (c) => {
    const d = await lerCorpo(c, dadosContratoSchema);
    return c.json(await deps.banco.rpc<{ id: string; numero: string; versao: number }>("portal_contrato_criar", { ...quem(c), p_dados: d }), 201);
  });

  app.get("/v1/escritorio/contratos/:id", async (c) => {
    return c.json(await deps.banco.rpc<FichaContrato>("portal_contrato", { ...quem(c), p_contrato: idDaRota(c, "id") }));
  });

  // Mudar condições, objeto e pessoas (PT-19). Contrato ativo pede motivo e refaz só o futuro.
  app.put("/v1/escritorio/contratos/:id", async (c) => {
    const { versao, ...d } = await lerCorpo(c, editarContratoSchema);
    return c.json(await deps.banco.rpc<{ id: string; versao: number; cancelados: number; novos: number }>("portal_contrato_condicoes", {
      ...quem(c), p_contrato: idDaRota(c, "id"), p_versao: versao, p_dados: d,
    }));
  });

  // Registrar a assinatura ativa o contrato e cria a programação dos recebimentos.
  app.post("/v1/escritorio/contratos/:id/assinatura", async (c) => {
    const d = await lerCorpo(c, assinaturaContratoSchema);
    return c.json(await deps.banco.rpc<{ id: string; versao: number; recebimentos: number }>("portal_contrato_assinatura", {
      ...quem(c), p_contrato: idDaRota(c, "id"), p_versao: d.versao, p_assinado_em: d.assinadoEm ?? null,
    }));
  });

  app.post("/v1/escritorio/contratos/:id/encerrar", async (c) => {
    const d = await lerCorpo(c, encerrarContratoSchema);
    return c.json(await deps.banco.rpc<{ id: string; versao: number; cancelados: number }>("portal_contrato_encerrar", {
      ...quem(c), p_contrato: idDaRota(c, "id"), p_versao: d.versao, p_motivo: d.motivo ?? null,
    }));
  });

  // A base do mês do percentual recorrente: o valor da cobrança sai do percentual.
  app.post("/v1/escritorio/recebimentos/:id/base", async (c) => {
    const d = await lerCorpo(c, baseMesSchema);
    return c.json(await deps.banco.rpc<{ id: string; valor: number; vencimento: string }>("portal_contrato_base", {
      ...quem(c), p_recebimento: idDaRota(c, "id"), p_dados: d,
    }));
  });

  // ------------------------------------------------------------------ Financeiro (FI-01 a FI-04, FI-14, FI-17)
  // Só com a área Financeiro: o banco recusa com AREA_NAO_LIBERADA.

  app.get("/v1/escritorio/financeiro/receber", async (c) => {
    const mostrar = (c.req.query("mostrar") || "ABERTO").toUpperCase();
    if (!(MOSTRAR_RECEBER as readonly string[]).includes(mostrar)) throw new ErroDominio("VALIDATION_ERROR", { campos: ["mostrar"] });
    const q = c.req.query("q") || null;
    if (q && q.length > 120) throw new ErroDominio("VALIDATION_ERROR", { campos: ["q"] });
    const responsavel = c.req.query("responsavel") || null;
    if (responsavel && !UUID.test(responsavel)) throw new ErroDominio("VALIDATION_ERROR", { campos: ["responsavel"] });
    const forma = (c.req.query("forma") || "").toUpperCase() || null;
    if (forma && !(forma in FORMAS_PAGAMENTO)) throw new ErroDominio("VALIDATION_ERROR", { campos: ["forma"] });
    return c.json(await deps.banco.rpc<ListaReceber>("portal_financeiro_receber", {
      ...quem(c), p_mostrar: mostrar, p_q: q, p_responsavel: responsavel?.toLowerCase() ?? null, p_forma: forma,
    }));
  });

  // As parcelas, os recebimentos e a cobrança de um contrato.
  app.get("/v1/escritorio/financeiro/contratos/:id", async (c) => {
    return c.json(await deps.banco.rpc<ParcelasContrato>("portal_financeiro_contrato", { ...quem(c), p_contrato: idDaRota(c, "id") }));
  });

  // Registrar recebimento: baixa a parcela do mês dela; o dinheiro conta no dia em que entrou.
  app.post("/v1/escritorio/financeiro/parcelas/:id/recebimentos", async (c) => {
    const d = await lerCorpo(c, registrarRecebimentoSchema);
    return c.json(await deps.banco.rpc<RecebimentoRegistrado>("portal_financeiro_receber_registrar", {
      ...quem(c), p_parcela: idDaRota(c, "id"), p_dados: d,
    }), 201);
  });

  // Anotar cobrança: o que foi feito, o motivo do atraso e a próxima ação.
  app.post("/v1/escritorio/financeiro/parcelas/:id/cobranca", async (c) => {
    const d = await lerCorpo(c, anotarCobrancaSchema);
    return c.json(await deps.banco.rpc<{ id: string }>("portal_financeiro_cobranca_anotar", {
      ...quem(c), p_parcela: idDaRota(c, "id"), p_dados: d,
    }), 201);
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
