// API do Console T3jus. Só a equipe ativa, sempre com o autenticador (F0.6, PT-08).
// Passo 1: carteira, ficha, convite do sócio, notas internas, histórico e equipe.
// Quem pode o quê é decidido no banco (funções internas e clientes atribuídos, PT-24); aqui
// só se valida a entrada e se fala com o Auth para os convites.

import type { Context } from "hono";
import {
  atribuirSchema,
  cadastrarMembroSchema,
  contratoSchema,
  encerrarContratoT3jusSchema,
  reabrirContratoSchema,
  type DatasContrato,
  type SaidaPessoa,
  convidarPessoaSchema,
  COOKIES_CONSOLE,
  criarEscritorioSchema,
  ErroDominio,
  buscaSuporteSchema,
  iniciarDocumentoSchema,
  mascararEmail,
  motivoSuporteSchema,
  tirarAutenticadorSchema,
  type FichaAcesso,
  type PessoaSuporte,
  estagioSchema,
  fichaSchema,
  funcoesSchema,
  notaSchema,
  versaoSchema,
  type SocioCliente,
  pedidoSiteSchema,
  responsavelInteressadoSchema,
  proximoInteressadoSchema,
  cidadeInteressadoSchema,
  estagioInteressadoSchema,
  encerrarInteressadoSchema,
  reabrirInteressadoSchema,
  notaInteressadoSchema,
  converterInteressadoSchema,
  cadastrarInteressadoSchema,
  juntarInteressadoSchema,
  avisosLidosSchema,
  whatsLegivel,
  CONTATO_T3JUS,
  planoSalvarSchema,
  planoArquivarSchema,
  pessoaAMaisSchema,
  implantacaoConcluirSchema,
  implantacaoPrazoSchema,
  implantacaoRegraSchema,
  implantacaoResponsavelSchema,
  implantacaoTreinoDesfazerSchema,
  implantacaoTreinoSchema,
  assinaturaSalvarSchema,
  mudarPlanoSchema,
  motivoCobrancaSchema,
  pagamentoManualSchema,
} from "@t3jus/domain";
import type { AdminAuth } from "../_shared/auth.ts";
import { VALIDADE_LEITURA_S, type Arquivos } from "../_shared/arquivos.ts";
import { baixarCarneCobranca, baixarDocumentoCobranca, type DocumentoCarne, type DocumentoCobranca } from "../_shared/cobranca_pdf.ts";
import { criarApp } from "../_shared/app.ts";
import { criarSessao, type DepsSessao, type VarsSessao } from "../_shared/sessao.ts";
import { lerCorpo } from "../_shared/validar.ts";
import { ipDaChamada } from "../_shared/repasse.ts";
import { sha256Hex } from "../_shared/cripto.ts";
import type { MeioPagamento, PedidoCobranca } from "../_shared/pagamento.ts";
import { avisoAutenticadorTirado, avisoFimContrato, confirmacaoPedidoDemonstracao, emailCobranca, type AvisoFimContrato, type EnvioCobranca, type Emails } from "../_shared/email.ts";
import { BUCKET_EXCLUSAO, caminhoValido, pastaValida, type LimpezaArquivos } from "../_shared/guarda.ts";
import { registrar } from "../_shared/registro.ts";

export interface DepsConsole extends DepsSessao {
  admin: AdminAuth;
  /** Endereço do Console (links de senha e convite da equipe). */
  urlApp: string;
  /** Endereço do Portal (convite do sócio). */
  urlPortal: string;
  /** Storage dos anexos do cliente (CO-05). */
  arquivos: Arquivos;
  /** E-mails do sistema pelo Resend (F1.12). Sem o segredo, não manda. */
  emails?: Emails;
  /** Apagar as pastas do Storage no fim da guarda (F0.15). */
  limpeza?: LimpezaArquivos;
  /** O meio de pagamento da cobrança (F1.21). Sem ele, a baixa continua manual. */
  pagamento?: MeioPagamento;
}

/** Quantos itens do meio de pagamento cada chamada trata, para caber no tempo do repasse. */
const CODIGOS_POR_CHAMADA = 15;

/** Quantos e-mails da cobrança cada chamada manda, para caber no tempo do repasse. */
const ENVIOS_POR_CHAMADA = 20;

/** Quantos arquivos cada chamada da rotina apaga por pasta, para caber no tempo do repasse. */
const ARQUIVOS_POR_PASTA = 1000;
/** Quantos arquivos da exclusão a pedido do titular (F3.141) cada chamada apaga. */
const OBJETOS_POR_CHAMADA = 500;

interface LinhaCarteira {
  escritorio_id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  estagio: string;
  encerramento: DatasContrato | null;
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
  // O aviso do meio de pagamento chega direto do banco (sem o segredo do repasse): a rota confere
  // a chave do aviso e lê cada cobrança de novo no meio de pagamento antes de dar baixa.
  const app = criarApp<VarsSessao>("api-console", segredo, [/^\/v1\/pagamento\/aviso$/]);
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

  // F0.15 e F3.141: a rotina do banco (pelo pg_net, de hora em hora pelo pg_cron e logo depois de
  // cada exclusão a pedido do titular) chama esta rota quando há o que apagar no Storage. Ela
  // atende as duas filas: as pastas do fim da guarda (guarda_arquivos) e os arquivos um a um da
  // exclusão (arquivos_apagar). A rota é pública através do repasse do Console e não pede sessão:
  // não aceita nada do pedido (o corpo é ignorado) e só cumpre o que o banco já decidiu.
  app.post("/v1/rotina/arquivos-da-guarda", async (c) => {
    if (!deps.limpeza) return c.json({ pastas: 0, concluidas: 0, apagados: 0, objetos: 0, objetosApagados: 0 });
    const limpeza = deps.limpeza;
    const pastas = await apagarPastasDaGuarda(limpeza);
    const objetos = await apagarObjetosDaExclusao(limpeza);
    return c.json({ ...pastas, ...objetos });
  });

  async function apagarPastasDaGuarda(limpeza: LimpezaArquivos) {
    let pendentes: { id: string; escritorioId: string; bucket: string }[];
    try {
      pendentes = await rpc("rotina_guarda_arquivos_pendentes", { p_limite: 4 });
    } catch {
      return { pastas: 0, concluidas: 0, apagados: 0 };
    }
    let concluidas = 0;
    let apagados = 0;
    for (const p of pendentes) {
      try {
        if (!pastaValida(p.escritorioId)) throw new Error("Pasta inválida");
        const r = await limpeza.apagarPasta(p.bucket, p.escritorioId, ARQUIVOS_POR_PASTA);
        await rpc("rotina_guarda_arquivos_registrar", { p_id: p.id, p_apagados: r.apagados, p_concluido: !r.restam });
        apagados += r.apagados;
        if (!r.restam) concluidas++;
      } catch (e) {
        await rpc("rotina_guarda_arquivos_registrar", { p_id: p.id, p_apagados: 0, p_concluido: false, p_erro: e instanceof Error ? e.message : "Falhou" })
          .catch(() => {});
      }
    }
    return { pastas: pendentes.length, concluidas, apagados };
  }

  // Os arquivos da exclusão a pedido do titular e do fim da guarda fiscal (F3.156), pelos caminhos
  // exatos da fila. Caminho fora dos três formatos ou de outro bucket nunca vai ao Storage. Sem a 0970 no banco (a função não existe), o
  // passo só devolve 0; a falha de um passo não impede o outro.
  async function apagarObjetosDaExclusao(limpeza: LimpezaArquivos) {
    let fila: { id: string; bucket: string; caminho: string }[];
    try {
      fila = await rpc("rotina_arquivos_apagar_pendentes", { p_limite: OBJETOS_POR_CHAMADA });
    } catch {
      return { objetos: 0, objetosApagados: 0 };
    }
    const validos = fila.filter((a) => a.bucket === BUCKET_EXCLUSAO && caminhoValido(a.caminho));
    const invalidos = fila.filter((a) => !validos.includes(a));
    try {
      if (invalidos.length) await rpc("rotina_arquivos_apagar_registrar", { p_ids: invalidos.map((a) => a.id), p_erro: "Caminho inválido" });
    } catch { /* fica na fila */ }
    if (!validos.length) return { objetos: fila.length, objetosApagados: 0 };
    const ids = validos.map((a) => a.id);
    try {
      const r = await limpeza.apagarObjetos(BUCKET_EXCLUSAO, validos.map((a) => a.caminho));
      await rpc("rotina_arquivos_apagar_registrar", { p_ids: ids });
      return { objetos: fila.length, objetosApagados: r.apagados };
    } catch (e) {
      await rpc("rotina_arquivos_apagar_registrar", { p_ids: ids, p_erro: e instanceof Error ? e.message : "Falhou" }).catch(() => {});
      return { objetos: fila.length, objetosApagados: 0 };
    }
  }

  // Cobrança dos escritórios (CO-06, F1.18): manda o que está na fila de e-mails da cobrança e
  // registra cada resultado. Sem o segredo do Resend, a fila espera (nada se perde). A cópia vai
  // para o sócio dono, com o e-mail do Auth.
  async function enviarCobrancas(): Promise<{ enviados: number; falhas: number }> {
    if (!deps.emails) return { enviados: 0, falhas: 0 };
    const fila = await rpc<(EnvioCobranca & { id: string; para: string; copiaPessoaId: string | null })[]>(
      "rotina_cobranca_envios_pendentes", { p_limite: ENVIOS_POR_CHAMADA });
    let enviados = 0;
    let falhas = 0;
    for (const e of fila) {
      try {
        const copia = e.copiaPessoaId ? await deps.admin.emailDe(e.copiaPessoaId) : null;
        await deps.emails.enviar({ para: e.para, ...(copia && copia !== e.para ? { copia: [copia] } : {}), ...emailCobranca(e, deps.urlPortal, CONTATO_T3JUS) });
        await rpc("rotina_cobranca_envio_registrar", { p_id: e.id, p_enviado: true });
        enviados++;
      } catch (erro) {
        registrar("aviso", { funcao: "api-console", rota: "cobranca-envios", erro });
        await rpc("rotina_cobranca_envio_registrar", { p_id: e.id, p_enviado: false, p_erro: erro instanceof Error ? erro.message : "Falhou" }).catch(() => undefined);
        falhas++;
      }
    }
    return { enviados, falhas };
  }

  /** Depois de uma ação que pôs e-mail na fila: tenta mandar já; se falhar, a rotina manda depois. */
  async function enviarSemEsperar(): Promise<void> {
    try {
      await enviarCobrancas();
    } catch (erro) {
      registrar("aviso", { funcao: "api-console", rota: "cobranca-envios", erro });
    }
  }

  // Meio de pagamento (F1.21): o pg_cron chama de hora em hora quando há fatura ou parcela sem
  // código, ou cobrança cancelada no T3jus que ainda vale lá. Só faz o que o banco listou.
  app.post("/v1/rotina/cobranca-codigos", async (c) => {
    const meio = deps.pagamento;
    if (!meio) return c.json({ emitidas: 0, canceladas: 0, falhas: 0 });
    const fila = await rpc<(PedidoCobranca | { acao: "CANCELAR_FATURA" | "CANCELAR_PARCELA"; id: string; pagamentoId: string; provedor: string })[]>(
      "rotina_cobranca_codigos_pendentes", { p_limite: CODIGOS_POR_CHAMADA });
    let emitidas = 0;
    let canceladas = 0;
    let falhas = 0;
    for (const item of fila) {
      try {
        if (item.acao === "CANCELAR_FATURA" || item.acao === "CANCELAR_PARCELA") {
          await meio.cancelar(item.pagamentoId, "Cancelada no T3jus");
          await rpc("rotina_cobranca_codigos_gravar", { p_acao: item.acao, p_id: item.id, p_provedor: meio.nome, p_dados: {} });
          canceladas++;
        } else {
          const r = await meio.emitir(item as PedidoCobranca);
          await rpc("rotina_cobranca_codigos_gravar", { p_acao: item.acao, p_id: item.id, p_provedor: meio.nome, p_dados: r });
          emitidas++;
        }
      } catch (erro) {
        registrar("aviso", { funcao: "api-console", rota: "cobranca-codigos", acao: item.acao, erro });
        falhas++;
      }
    }
    return c.json({ emitidas, canceladas, falhas });
  });

  // O aviso de pagamento do meio de pagamento. O corpo só diz quais cobranças mudaram: a situação
  // de cada uma é lida de novo lá, e só a leitura dá baixa (no banco, com a regra da baixa manual).
  app.post("/v1/pagamento/aviso", async (c) => {
    const meio = deps.pagamento;
    if (!meio) throw new ErroDominio("NOT_FOUND");
    const corpo = await c.req.json().catch(() => null);
    const codigos = meio.codigosDoAviso(c.req.raw, corpo);
    if (codigos === null) throw new ErroDominio("FORBIDDEN");
    let pagas = 0;
    for (const codigo of codigos) {
      const s = await meio.consultar(codigo);
      if (s.situacao !== "PAGA" || !s.pagoEm || s.valorPagoCentavos === undefined || !s.forma) continue;
      const r = await rpc<{ resultado: string }>("cobranca_baixa_automatica", {
        p_provedor: meio.nome, p_pagamento_id: codigo, p_pago_em: s.pagoEm, p_valor_centavos: s.valorPagoCentavos, p_forma: s.forma,
      });
      if (r.resultado === "PAGA") pagas++;
      else if (r.resultado !== "JA_PAGA") registrar("aviso", { funcao: "api-console", rota: "pagamento-aviso", resultado: r.resultado });
    }
    if (pagas) await enviarSemEsperar();
    return c.json({ recebidos: codigos.length, pagas });
  });

  // A rotina da manhã do banco chama esta rota quando há e-mail da cobrança na fila. Ela só manda
  // o que o banco já decidiu, então não pede sessão (o repasse confere o segredo).
  app.post("/v1/rotina/cobranca-envios", async (c) => c.json(await enviarCobrancas()));

  // Fim do contrato (F0.16, PT-11): manda os avisos à sócia dona que o banco pôs na fila (no dia
  // do fim e 3 dias antes de o acesso fechar) e registra cada resultado. O e-mail dela vem do
  // Auth. Sem o segredo do Resend, a fila espera.
  async function enviarAvisosFim(): Promise<{ enviados: number; falhas: number }> {
    if (!deps.emails) return { enviados: 0, falhas: 0 };
    const fila = await rpc<(AvisoFimContrato & { id: string; paraPessoaId: string })[]>(
      "rotina_contrato_avisos_pendentes", { p_limite: ENVIOS_POR_CHAMADA });
    let enviados = 0;
    let falhas = 0;
    for (const a of fila) {
      try {
        const para = await deps.admin.emailDe(a.paraPessoaId);
        if (!para) throw new Error("Sem e-mail no Auth");
        await deps.emails.enviar({ para, ...avisoFimContrato(a, deps.urlPortal, CONTATO_T3JUS) });
        await rpc("rotina_contrato_aviso_registrar", { p_id: a.id, p_enviado: true });
        enviados++;
      } catch (erro) {
        registrar("aviso", { funcao: "api-console", rota: "avisos-fim-contrato", erro });
        await rpc("rotina_contrato_aviso_registrar", { p_id: a.id, p_enviado: false, p_erro: erro instanceof Error ? erro.message : "Falhou" }).catch(() => undefined);
        falhas++;
      }
    }
    return { enviados, falhas };
  }

  // A rotina das 8h do banco chama esta rota quando há aviso na fila. Ela só manda o que o banco
  // já decidiu, então não pede sessão (o repasse confere o segredo).
  app.post("/v1/rotina/avisos-fim-contrato", async (c) => c.json(await enviarAvisosFim()));

  // Pedido de demonstração do site (F2.2, SC-02). O site (t3jus.pro) repassa com o segredo e o IP
  // de quem pediu; não há sessão. O banco aplica os limites e guarda a autorização; a resposta
  // automática sai daqui, e se não sair o pedido continua registrado (fica no histórico).
  app.post("/v1/site/pedidos", async (c) => {
    const d = await lerCorpo(c, pedidoSiteSchema);
    const r = await rpc<{ limite?: boolean; id?: string; repetido?: boolean }>("site_registrar_pedido", { p_dados: d, p_ip: ipDaChamada(c.req.raw.headers) });
    if (r.limite) throw new ErroDominio("RATE_LIMITED");
    let respostaEnviada = false;
    if (r.id && !r.repetido && deps.emails) {
      try {
        await deps.emails.enviar({
          para: d.email,
          ...confirmacaoPedidoDemonstracao({ nome: d.nome, escritorio: d.escritorio, email: d.email, whats: whatsLegivel(d.whats), tamanho: d.tamanho, area: d.area, msg: d.msg }),
        });
        respostaEnviada = true;
      } catch (e) {
        registrar("aviso", { funcao: "api-console", rota: "site-pedidos", erro: e });
      }
      await rpc("site_pedido_resposta", { p_id: r.id, p_enviada: respostaEnviada });
    }
    return c.json({ ok: true, respostaEnviada }, 201);
  });

  sessao.rotas(app);

  for (const rota of ["/v1/sessao", "/v1/clientes", "/v1/clientes/*", "/v1/equipe", "/v1/equipe/*", "/v1/suporte/*", "/v1/interessados", "/v1/interessados/*", "/v1/avisos", "/v1/avisos/*", "/v1/cobranca", "/v1/cobranca/*"]) app.use(rota, sessao.exigirSessao);
  const pessoa = (c: Context<VarsSessao>) => c.get("sessao").pessoaId;

  // Quem está no Console: nome, funções e o que pode fazer fora de um cliente.
  // F2.3: o contador de Comercial (interessados que pedem atenção) vai junto, para a moldura.
  app.get("/v1/sessao", async (c) => {
    const [s, atencao, cobranca] = await Promise.all([
      rpc<Record<string, unknown>>("console_sessao", { p_pessoa: pessoa(c) }),
      rpc<number>("console_interessados_atencao", { p_pessoa: pessoa(c) }),
      rpc<number>("console_cobranca_atencao", { p_pessoa: pessoa(c) }),
    ]);
    return c.json({ ...s, interessadosAtencao: atencao, faturasAtraso: cobranca });
  });

  // Carteira (CO-01): só os clientes atribuídos.
  app.get("/v1/clientes", async (c) => {
    const [linhas, cobranca] = await Promise.all([
      rpc<LinhaCarteira[]>("console_carteira", { p_pessoa: pessoa(c) }),
      rpc<{ escritorioId: string; atrasoDias: number | null; soConsultaDesde: string | null }[]>("console_carteira_cobranca", { p_pessoa: pessoa(c) }),
    ]);
    // F1.18: "Fatura em atraso · N dias" e o só consulta por atraso (só os dias, sem valor).
    const porEscritorio = new Map(cobranca.map((x) => [x.escritorioId, { atrasoDias: x.atrasoDias, soConsultaDesde: x.soConsultaDesde }]));
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
        encerramento: l.encerramento,
        cobranca: porEscritorio.get(l.escritorio_id) ?? null,
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
    // PA-07: a ficha nova manda os dados para os documentos e grava tudo de uma vez.
    if (d.documentos) {
      const versao = await rpc<number>("console_ficha_salvar", {
        p_pessoa: pessoa(c), p_escritorio: id, p_versao: d.versao,
        p_dados: { ...d.documentos, nome: d.nome, cidade: d.cidade, uf: d.uf, cnpj: d.cnpj, contatos: d.contatos },
      });
      return c.json({ versao });
    }
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

  // Implantação assistida (CO-08, F1.43). Concluir passa a Ativo pelo caminho do estágio
  // (console.estagio.mudar) e fecha a implantação; o prazo muda só pela Administração, com motivo.
  // O escritório vai na rota e o autor é sempre a pessoa da sessão.
  app.post("/v1/clientes/:id/implantacao/concluir", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, implantacaoConcluirSchema);
    return c.json(await rpc("console_implantacao_concluir", {
      p_pessoa: pessoa(c), p_escritorio: id, p_versao_cliente: d.versaoCliente, p_versao_implantacao: d.versaoImplantacao,
      p_resumo: d.resumo ?? null,
    }));
  });
  app.put("/v1/clientes/:id/implantacao/prazo", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, implantacaoPrazoSchema);
    return c.json(await rpc("console_implantacao_prazo", {
      p_pessoa: pessoa(c), p_escritorio: id, p_prazo_ate: d.prazoAte, p_motivo: d.motivo, p_versao: d.versao,
    }));
  });

  // A aba Implantação (F1.45): ler (console.implantacao.ver; o valor só com console.cobranca.ver),
  // registrar e desfazer treinos e trocar quem acompanha (console.implantacao.editar). Quem deu o
  // treino, quem desfez e quem trocou vêm da sessão; o escritório, da rota.
  app.get("/v1/clientes/:id/implantacao", async (c) => {
    const id = idDaRota(c, "id");
    return c.json(await rpc("console_implantacao", { p_pessoa: pessoa(c), p_escritorio: id }));
  });
  app.post("/v1/clientes/:id/implantacao/treinos", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, implantacaoTreinoSchema);
    return c.json(await rpc("console_implantacao_treino", {
      p_pessoa: pessoa(c), p_escritorio: id,
      p_dados: { dia: d.dia, duracaoMin: d.duracaoMin, forma: d.forma, pessoas: d.pessoas, temas: d.temas },
    }));
  });
  app.post("/v1/clientes/:id/implantacao/treinos/:treino/desfazer", async (c) => {
    const id = idDaRota(c, "id");
    const treino = idDaRota(c, "treino");
    const d = await lerCorpo(c, implantacaoTreinoDesfazerSchema);
    return c.json(await rpc("console_implantacao_treino_desfazer", { p_pessoa: pessoa(c), p_escritorio: id, p_treino: treino, p_motivo: d.motivo }));
  });
  app.put("/v1/clientes/:id/implantacao/responsavel", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, implantacaoResponsavelSchema);
    return c.json(await rpc("console_implantacao_responsavel", {
      p_pessoa: pessoa(c), p_escritorio: id, p_responsavel: d.responsavelId, p_versao: d.versao,
    }));
  });

  // Fim do contrato (F0.14, PT-11): só a Administração. Encerrar confere a data, o motivo e o
  // nome do escritório; reabrir (ou desmarcar o fim que não chegou) pede o motivo.
  app.post("/v1/clientes/:id/encerrar", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, encerrarContratoT3jusSchema);
    const r = await rpc("console_encerrar_contrato", {
      p_pessoa: pessoa(c), p_escritorio: id, p_versao: d.versao,
      p_dados: { fimEm: d.fimEm, motivo: d.motivo, nomeConfirmado: d.nomeConfirmado },
    });
    // F0.16: com o fim hoje, o aviso à sócia dona sai na hora. Se falhar, a rotina das 8h manda.
    try {
      if (await rpc<number>("contrato_avisos_do_escritorio", { p_escritorio: id }) > 0) await enviarAvisosFim();
    } catch (erro) {
      registrar("aviso", { funcao: "api-console", rota: "avisos-fim-contrato", erro });
    }
    return c.json(r);
  });

  app.post("/v1/clientes/:id/reabrir", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, reabrirContratoSchema);
    return c.json(await rpc("console_reabrir_contrato", { p_pessoa: pessoa(c), p_escritorio: id, p_versao: d.versao, p_motivo: d.motivo }));
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
    const linhas = await rpc<{
      pessoa_id: string; nome: string; ativa: boolean; funcoes: string[]; desde: string; senha_criada_em: string | null;
      desativada_em: string | null; saida: SaidaPessoa | null;
    }[]>("console_equipe", { p_pessoa: pessoa(c) });
    // O e-mail vem do Auth (o banco só guarda o nome); convite pendente = ainda sem senha.
    const pessoas = await Promise.all(linhas.map(async (l) => ({
      id: l.pessoa_id, nome: l.nome, ativa: l.ativa, funcoes: l.funcoes, desde: l.desde,
      email: l.saida?.entradaApagadaEm ? null : await deps.admin.emailDe(l.pessoa_id), convitePendente: l.senha_criada_em === null,
      desativadaEm: l.desativada_em, saida: l.saida,
    })));
    return c.json({ pessoas });
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

  // Suporte de acesso (F1.3, PT-23). A busca e a ficha só mostram pessoas dos escritórios que
  // quem pergunta atende (PT-24); o banco decide. A senha e o link nunca passam por aqui: o
  // link vai pelo Auth só para o e-mail já cadastrado, e o e-mail nunca muda por esta tela.
  app.get("/v1/suporte/pessoas", async (c) => {
    const busca = buscaSuporteSchema.safeParse({ q: c.req.query("q") ?? "" });
    if (!busca.success) throw new ErroDominio("VALIDATION_ERROR", { campos: ["q"] });
    return c.json({ pessoas: await rpc<PessoaSuporte[]>("console_suporte_buscar", { p_pessoa: pessoa(c), p_termo: busca.data.q }) });
  });

  /** A ficha de acesso: o banco confere quem pode ver; o Auth diz e-mail, entrada e autenticador. */
  async function fichaAcesso(c: Context<VarsSessao>, alvo: string): Promise<FichaAcesso> {
    const ficha = await rpc<Omit<FichaAcesso, "emailConfirmado" | "ultimaEntrada" | "autenticadorDesde">>(
      "console_suporte_pessoa", { p_pessoa: pessoa(c), p_alvo: alvo });
    const conta = await deps.admin.conta(alvo);
    // Entrada apagada (90 dias sem acesso, F0.14): a ficha mostra só o nome e a data.
    if (!conta && ficha.saida?.entradaApagadaEm) {
      return { ...ficha, email: null, emailConfirmado: false, ultimaEntrada: null, autenticadorDesde: null, podeAgir: false };
    }
    if (!conta) throw new ErroDominio("NOT_FOUND");
    return { ...ficha, email: conta.email, emailConfirmado: conta.emailConfirmado, ultimaEntrada: conta.ultimaEntrada, autenticadorDesde: conta.autenticadorDesde };
  }

  /** Para agir: a ficha, com a permissão de agir e o e-mail cadastrado. */
  async function fichaParaAgir(c: Context<VarsSessao>, alvo: string): Promise<FichaAcesso & { email: string }> {
    const ficha = await fichaAcesso(c, alvo);
    if (!ficha.podeAgir) throw new ErroDominio("FORBIDDEN");
    if (!ficha.email) throw new ErroDominio("NOT_FOUND");
    return { ...ficha, email: ficha.email };
  }

  app.get("/v1/suporte/pessoas/:id", async (c) => c.json(await fichaAcesso(c, idDaRota(c, "id"))));

  app.get("/v1/suporte/pessoas/:id/historico", async (c) => {
    const linhas = await rpc<{ ocorrido_em: string; autor_id: string | null; autor_nome: string | null; acao: string; dados: Record<string, unknown> }[]>(
      "console_suporte_historico", { p_pessoa: pessoa(c), p_alvo: idDaRota(c, "id") });
    return c.json({
      eventos: linhas.map((l) => ({ ocorridoEm: l.ocorrido_em, autor: l.autor_id ? { id: l.autor_id, nome: l.autor_nome } : null, acao: l.acao, dados: l.dados })),
    });
  });

  // Link de nova senha: mesmo limite da recuperação que a própria pessoa pede (3 por hora).
  // Só registra depois de o Auth aceitar o pedido: se falhar, nada foi enviado.
  app.post("/v1/suporte/pessoas/:id/link-senha", async (c) => {
    const alvo = idDaRota(c, "id");
    const { motivo } = await lerCorpo(c, motivoSuporteSchema);
    const ficha = await fichaParaAgir(c, alvo);
    if (!ficha.senhaCriadaEm) throw new ErroDominio("VALIDATION_ERROR", { motivo: "SEM_SENHA" });
    if (!(await rpc<boolean>("limite_contar", { p_tipo: "recuperacao", p_chave: await sha256Hex(ficha.email) }))) throw new ErroDominio("RATE_LIMITED");
    try {
      await deps.auth.pedirRecuperacao(ficha.email, `${deps.urlPortal}/redefinir`);
    } catch {
      throw new ErroDominio("UPSTREAM_UNAVAILABLE");
    }
    await rpc("console_suporte_registrar", { p_pessoa: pessoa(c), p_alvo: alvo, p_acao: "suporte.link_senha", p_motivo: motivo });
    return c.json({ email: mascararEmail(ficha.email) });
  });

  // Desconectar de todos os aparelhos: o banco registra e apaga as sessões no mesmo passo.
  app.post("/v1/suporte/pessoas/:id/desconectar", async (c) => {
    const alvo = idDaRota(c, "id");
    const { motivo } = await lerCorpo(c, motivoSuporteSchema);
    return c.json({ aparelhos: await rpc<number>("console_suporte_desconectar", { p_pessoa: pessoa(c), p_alvo: alvo, p_motivo: motivo }) });
  });

  // Tirar o autenticador (decisão 2): identidade conferida pelo telefone, motivo e histórico.
  // Também desconecta, para quem está com o aparelho perdido não continuar dentro.
  app.post("/v1/suporte/pessoas/:id/tirar-autenticador", async (c) => {
    const alvo = idDaRota(c, "id");
    const { motivo } = await lerCorpo(c, tirarAutenticadorSchema);
    const ficha = await fichaParaAgir(c, alvo);
    if (!ficha.autenticadorDesde) throw new ErroDominio("VALIDATION_ERROR", { motivo: "SEM_AUTENTICADOR" });
    try {
      await deps.admin.removerAutenticadores(alvo);
    } catch {
      throw new ErroDominio("UPSTREAM_UNAVAILABLE");
    }
    const aparelhos = await rpc<number>("console_suporte_desconectar", { p_pessoa: pessoa(c), p_alvo: alvo, p_motivo: motivo, p_tirar_autenticador: true });
    // F1.12: a própria pessoa fica sabendo na hora, pelo e-mail cadastrado. Se o e-mail não
    // sair, a ação continua feita (já está no histórico).
    let avisoEnviado = false;
    if (deps.emails) {
      try {
        await deps.emails.enviar({ para: ficha.email, ...avisoAutenticadorTirado(ficha.nome) });
        avisoEnviado = true;
      } catch (e) {
        registrar("aviso", { funcao: "api-console", rota: "tirar-autenticador", erro: e });
      }
    }
    return c.json({ aparelhos, avisoEnviado });
  });

  // Reenviar o convite de quem ainda não criou a senha (o link anterior deixa de valer).
  app.post("/v1/suporte/pessoas/:id/reenviar-convite", async (c) => {
    const alvo = idDaRota(c, "id");
    const { motivo } = await lerCorpo(c, motivoSuporteSchema);
    const ficha = await fichaParaAgir(c, alvo);
    if (ficha.senhaCriadaEm) throw new ErroDominio("VALIDATION_ERROR", { motivo: "JA_ENTROU" });
    if (!(await rpc<boolean>("limite_contar", { p_tipo: "convite", p_chave: pessoa(c) }))) throw new ErroDominio("RATE_LIMITED");
    let enviado: boolean;
    try {
      enviado = await deps.admin.reenviarConvite(ficha.email, `${deps.urlPortal}/criar-senha`);
    } catch {
      throw new ErroDominio("UPSTREAM_UNAVAILABLE");
    }
    if (!enviado) throw new ErroDominio("VALIDATION_ERROR", { motivo: "JA_ENTROU" });
    await rpc("console_suporte_registrar", { p_pessoa: pessoa(c), p_alvo: alvo, p_acao: "suporte.reenviou_convite", p_motivo: motivo });
    return c.json({ email: mascararEmail(ficha.email) });
  });

  // Comercial › Interessados (F2.3, SC-05). Quem vê e quem muda é decidido no banco
  // (Administração e Implantação, decisão 9 do desenho aprovado).
  app.get("/v1/interessados", async (c) => c.json(await rpc("console_interessados", { p_pessoa: pessoa(c) })));
  // F2.5: cadastrar à mão. Com um repetido (mesmo e-mail ou WhatsApp), nada é gravado e a
  // resposta traz o existente; "forcar" cadastra mesmo assim (decisão 3).
  app.post("/v1/interessados", async (c) => {
    const { forcar, responsavel, passo, passoData, ...dados } = await lerCorpo(c, cadastrarInteressadoSchema);
    const r = await rpc<{ id: string } | { repetido: Record<string, unknown> }>("console_interessado_cadastrar", {
      p_pessoa: pessoa(c), p_dados: { ...dados, responsavel, passo, passoData }, p_forcar: forcar,
    });
    return c.json(r, "id" in r ? 201 : 200);
  });

  app.get("/v1/interessados/:id", async (c) => c.json(await rpc("console_interessado", { p_pessoa: pessoa(c), p_id: idDaRota(c, "id") })));

  app.put("/v1/interessados/:id/responsavel", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, responsavelInteressadoSchema);
    return c.json({ versao: await rpc<number>("console_interessado_responsavel", { p_pessoa: pessoa(c), p_id: id, p_versao: d.versao, p_responsavel: d.pessoaId, p_recado: d.recado ?? null }) });
  });

  app.put("/v1/interessados/:id/proximo", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, proximoInteressadoSchema);
    return c.json({ versao: await rpc<number>("console_interessado_proximo", { p_pessoa: pessoa(c), p_id: id, p_versao: d.versao, p_passo: d.passo, p_data: d.data, p_hora: d.hora ?? null, p_quem: d.quem }) });
  });

  app.put("/v1/interessados/:id/cidade", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, cidadeInteressadoSchema);
    return c.json({ versao: await rpc<number>("console_interessado_cidade", { p_pessoa: pessoa(c), p_id: id, p_versao: d.versao, p_cidade: d.cidade, p_uf: d.uf }) });
  });

  app.put("/v1/interessados/:id/estagio", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, estagioInteressadoSchema);
    return c.json({ versao: await rpc<number>("console_interessado_estagio", { p_pessoa: pessoa(c), p_id: id, p_versao: d.versao, p_estagio: d.estagio, p_motivo: d.motivo, p_data: d.data ?? null, p_hora: d.hora ?? null }) });
  });

  app.post("/v1/interessados/:id/encerrar", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, encerrarInteressadoSchema);
    return c.json({ versao: await rpc<number>("console_interessado_encerrar", { p_pessoa: pessoa(c), p_id: id, p_versao: d.versao, p_como: d.como, p_porque: d.porque, p_motivo: d.motivo, p_procurar_em: d.procurarEm ?? null }) });
  });

  app.post("/v1/interessados/:id/reabrir", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, reabrirInteressadoSchema);
    return c.json({ versao: await rpc<number>("console_interessado_reabrir", { p_pessoa: pessoa(c), p_id: id, p_versao: d.versao, p_motivo: d.motivo }) });
  });

  app.post("/v1/interessados/:id/notas", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, notaInteressadoSchema);
    return c.json({ id: await rpc<string>("console_interessado_nota", { p_pessoa: pessoa(c), p_id: id, p_texto: d.texto }) }, 201);
  });

  // Juntar ao existente: o que foi escrito vira nota e conta como novo contato.
  app.post("/v1/interessados/:id/juntar", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, juntarInteressadoSchema);
    return c.json({ nota: await rpc<string>("console_interessado_juntar", { p_pessoa: pessoa(c), p_id: id, p_dados: d }) }, 201);
  });

  // O sino do Console (F2.6): cada pessoa só os próprios avisos, dos últimos 30 dias.
  app.get("/v1/avisos", async (c) => c.json(await rpc("console_avisos", { p_pessoa: pessoa(c) })));
  app.post("/v1/avisos/lidos", async (c) => {
    const { ate } = await lerCorpo(c, avisosLidosSchema);
    return c.json(await rpc("console_avisos_lidos", { p_pessoa: pessoa(c), p_ate: ate }));
  });
  app.post("/v1/avisos/:id/lido", async (c) => c.json(await rpc("console_aviso_lido", { p_pessoa: pessoa(c), p_id: idDaRota(c, "id") })));

  // Virar escritório cliente: o cadastro de sempre, já preenchido; o contato vai para a ficha.
  app.post("/v1/interessados/:id/converter", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, converterInteressadoSchema);
    return c.json({ escritorioId: await rpc<string>("console_interessado_converter", { p_pessoa: pessoa(c), p_id: id, p_versao: d.versao, p_nome: d.nome, p_cidade: d.cidade, p_uf: d.uf, p_motivo: d.motivo }) }, 201);
  });

  // ---------------------------------------------------------------------------------------
  // Cobrança dos escritórios (CO-06, F1.18). Quem vê e quem muda é decidido no banco:
  // Administração e Financeiro nas faturas e assinaturas; só a Administração nos planos e no
  // só consulta; Implantação e Suporte veem o plano e a situação, sem valores (PT-24).
  app.get("/v1/cobranca/faturas", async (c) => c.json(await rpc("console_cobranca_faturas", { p_pessoa: pessoa(c) })));
  app.get("/v1/cobranca/planos", async (c) => c.json(await rpc("console_planos", { p_pessoa: pessoa(c) })));
  app.post("/v1/cobranca/planos", async (c) => {
    const { versao: _v, ...d } = await lerCorpo(c, planoSalvarSchema);
    return c.json(await rpc("console_plano_salvar", { p_pessoa: pessoa(c), p_plano: null, p_versao: null, p_dados: d }), 201);
  });
  app.put("/v1/cobranca/planos/:plano", async (c) => {
    const id = idDaRota(c, "plano");
    const { versao, ...d } = await lerCorpo(c, planoSalvarSchema);
    if (!versao) throw new ErroDominio("VALIDATION_ERROR", { campos: ["versao"] });
    return c.json(await rpc("console_plano_salvar", { p_pessoa: pessoa(c), p_plano: id, p_versao: versao, p_dados: d }));
  });
  app.post("/v1/cobranca/planos/:plano/arquivar", async (c) => {
    const id = idDaRota(c, "plano");
    const d = await lerCorpo(c, planoArquivarSchema);
    return c.json(await rpc("console_plano_arquivar", { p_pessoa: pessoa(c), p_plano: id, p_versao: d.versao, p_arquivar: d.arquivar, p_motivo: d.motivo }));
  });
  app.put("/v1/cobranca/pessoa-a-mais", async (c) => {
    const d = await lerCorpo(c, pessoaAMaisSchema);
    return c.json(await rpc("console_pessoa_a_mais", { p_pessoa: pessoa(c), p_versao: d.versao, p_centavos: d.centavos }));
  });
  // A regra da implantação assistida (CO-08, F1.42): Administração e Financeiro leem, só a
  // Administração muda. Vale só para as implantações que abrirem depois; o autor vem da sessão.
  app.get("/v1/cobranca/implantacao", async (c) => c.json(await rpc("console_implantacao_regras", { p_pessoa: pessoa(c) })));
  app.put("/v1/cobranca/implantacao", async (c) => {
    const { versao, ...d } = await lerCorpo(c, implantacaoRegraSchema);
    return c.json(await rpc("console_implantacao_regras_salvar", { p_pessoa: pessoa(c), p_versao: versao, p_dados: d }));
  });

  // A fatura aberta e o que se faz nela. O escritório vai na rota: o banco confere se a pessoa o
  // atende e se a fatura é dele.
  app.get("/v1/clientes/:id/faturas/:fatura", async (c) =>
    c.json(await rpc("console_cobranca_fatura", { p_pessoa: pessoa(c), p_escritorio: idDaRota(c, "id"), p_fatura: idDaRota(c, "fatura") })));
  // O PDF da fatura e o do recibo (F1.21, desenho cobranca-pdfs): montados na hora, com a fatura como está.
  for (const [rota, recibo] of [["pdf", false], ["recibo", true]] as const) {
    app.get(`/v1/clientes/:id/faturas/:fatura/${rota}`, async (c) => {
      const id = idDaRota(c, "id");
      const d = await rpc<DocumentoCobranca>("console_fatura_documento", { p_pessoa: pessoa(c), p_escritorio: id, p_fatura: idDaRota(c, "fatura"), p_recibo: recibo });
      return c.json(await baixarDocumentoCobranca(deps.arquivos, id, d, recibo));
    });
  }
  // O carnê em PDF (F1.21), como está hoje: o Console baixa sempre, para conferir.
  app.get("/v1/clientes/:id/carnes/:carne/pdf", async (c) => {
    const id = idDaRota(c, "id");
    const d = await rpc<DocumentoCarne>("console_carne_documento", { p_pessoa: pessoa(c), p_escritorio: id, p_carne: idDaRota(c, "carne") });
    return c.json(await baixarCarneCobranca(deps.arquivos, id, d));
  });
  app.post("/v1/clientes/:id/faturas/:fatura/pagamento-manual", async (c) => {
    const id = idDaRota(c, "id");
    const fatura = idDaRota(c, "fatura");
    const { versao, ...d } = await lerCorpo(c, pagamentoManualSchema);
    if (!versao) throw new ErroDominio("VALIDATION_ERROR", { campos: ["versao"] });
    const r = await rpc("console_fatura_pagamento_manual", { p_pessoa: pessoa(c), p_escritorio: id, p_fatura: fatura, p_versao: versao, p_dados: d });
    await enviarSemEsperar();
    return c.json(r);
  });
  app.post("/v1/clientes/:id/faturas/:fatura/lembrete", async (c) => {
    const r = await rpc("console_fatura_lembrete", { p_pessoa: pessoa(c), p_escritorio: idDaRota(c, "id"), p_fatura: idDaRota(c, "fatura") });
    await enviarSemEsperar();
    return c.json(r);
  });
  app.post("/v1/clientes/:id/faturas/:fatura/cancelar", async (c) => {
    const id = idDaRota(c, "id");
    const fatura = idDaRota(c, "fatura");
    const d = await lerCorpo(c, motivoCobrancaSchema);
    const r = await rpc("console_fatura_cancelar", { p_pessoa: pessoa(c), p_escritorio: id, p_fatura: fatura, p_versao: d.versao, p_motivo: d.motivo });
    await enviarSemEsperar();
    return c.json(r);
  });
  // Parcela do carnê paga adiantada: a fatura do mês já nasce paga.
  app.post("/v1/clientes/:id/carne/parcelas/:parcela/pagamento-manual", async (c) => {
    const id = idDaRota(c, "id");
    const parcela = idDaRota(c, "parcela");
    const { versao: _v, ...d } = await lerCorpo(c, pagamentoManualSchema);
    const r = await rpc("console_parcela_pagamento_manual", { p_pessoa: pessoa(c), p_escritorio: id, p_parcela: parcela, p_dados: d });
    await enviarSemEsperar();
    return c.json(r);
  });

  // A aba Assinatura da ficha.
  app.get("/v1/clientes/:id/assinatura", async (c) => c.json(await rpc("console_assinatura", { p_pessoa: pessoa(c), p_escritorio: idDaRota(c, "id") })));
  app.put("/v1/clientes/:id/assinatura", async (c) => {
    const id = idDaRota(c, "id");
    const { versao, ...d } = await lerCorpo(c, assinaturaSalvarSchema);
    const r = await rpc("console_assinatura_salvar", { p_pessoa: pessoa(c), p_escritorio: id, p_versao: versao ?? null, p_dados: d });
    await enviarSemEsperar();
    return c.json(r);
  });
  app.post("/v1/clientes/:id/assinatura/mudar-plano", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, mudarPlanoSchema);
    return c.json(await rpc("console_assinatura_mudar_plano", { p_pessoa: pessoa(c), p_escritorio: id, p_versao: d.versao, p_plano: d.planoId, p_motivo: d.motivo }));
  });
  app.post("/v1/clientes/:id/assinatura/carne-novo", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, motivoCobrancaSchema);
    return c.json(await rpc("console_carne_novo", { p_pessoa: pessoa(c), p_escritorio: id, p_versao: d.versao, p_motivo: d.motivo }));
  });
  // Só consulta por atraso e "Devolver o acesso agora": só a Administração, com motivo.
  app.post("/v1/clientes/:id/portal-so-consulta", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, motivoCobrancaSchema);
    return c.json(await rpc("console_portal_so_consulta", { p_pessoa: pessoa(c), p_escritorio: id, p_versao: d.versao, p_motivo: d.motivo }));
  });
  app.post("/v1/clientes/:id/portal-normal", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, motivoCobrancaSchema);
    return c.json(await rpc("console_portal_normal", { p_pessoa: pessoa(c), p_escritorio: id, p_versao: d.versao, p_motivo: d.motivo }));
  });

  return app;
}
