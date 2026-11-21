// Contrato, procuração e declaração em .docx no timbrado (F3.16, CH-08), tela aprovada em
// docs/design/aprovadas/portal-procuracoes. O banco confere quem pode, o que bloqueia e guarda
// cada versão (0680_documentos_contrato.sql); aqui o .docx é montado ou preenchido na memória
// (packages/domain/src/docx.ts) e gravado no Storage privado:
//   <escritório>/documentos/<id>.docx              o documento gerado
//   <escritório>/documentos/modelos/<versão>.docx  o modelo enviado pelo escritório
//   <escritório>/documentos/zip/<geração>.zip      o "Baixar todos"
// Os assinados entram pelo envio em duas etapas dos anexos (0520), com documentoId; o contrato
// assinado continua pela rota da assinatura que já existe. O nome do arquivo nunca entra no caminho.

import type { Context, Hono } from "hono";
import {
  arquivarModeloDocumentoSchema, CAMPOS_DOCUMENTO, camposDoPadraoDocumento, conferenciaModeloDocumento, conferirDocx, criarDocx,
  enviarModeloDocumentoSchema, ErroDocx, ErroDominio, escolhasDocumentosSchema, escreverZip, filtroDocumentosSchema, LIMITE_MODELO_BYTES,
  linhasTimbrado, marcadosDoModeloDocumento, MODELOS_PADRAO_DOCUMENTO, modeloPadraoDocumento, montarValoresDocumento, nomeArquivoDocumento,
  nomeZipDocumentos, preencherDocx, previaDocumento, TIPO_DOCX,
  type DadosDocumentos, type DocumentosDoContrato, type EscolhasDocumentos, type ListaDocumentos, type ListaModelosDocumento,
  type ModeloDocumentoLinha, type PadraoDocumento, type PreviaDocumento, type PreviaDocumentos, type ResultadoDocumentos,
  type TipoDocumentoContrato, type ValoresDocumento,
} from "@t3jus/domain";
import { VALIDADE_LEITURA_S } from "../_shared/arquivos.ts";
import { lerCorpo } from "../_shared/validar.ts";
import type { DepsPortal, VarsPortal } from "./app.ts";
import { logoDaProposta } from "./proposta_docx.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function idDaRota(c: Context, nome: string): string {
  const id = c.req.param(nome);
  if (!id || !UUID.test(id)) throw new ErroDominio("NOT_FOUND");
  return id.toLowerCase();
}

/** Um documento do pedido, como o banco devolve depois de conferir. */
interface DocumentoConferido {
  tipo: TipoDocumentoContrato;
  chave: string;
  numero: number;
  nome: string;
  padrao?: PadraoDocumento | null;
  modeloId?: string | null;
  versaoId?: string | null;
  campos?: string[];
  paragrafos?: string[];
}
interface Preparado {
  pedido: Omit<EscolhasDocumentos, "documentos"> & { documentos: DocumentoConferido[] };
  dados: DadosDocumentos;
}

/** Quantos dados saem marcados, a frase da faixa do botão (decisão 12). */
export function fraseDaFaixa(docs: readonly { marcados: string[] }[]): string {
  const n = docs.map((d) => d.marcados.length);
  const max = Math.max(0, ...n);
  if (max === 0) return "Nenhum dado sai marcado.";
  const igual = n.every((x) => x === max);
  const dado = (k: number) => `${k} ${k === 1 ? "dado sai marcado" : "dados saem marcados"}`;
  if (igual && n.length > 1) return `${dado(max)} em cada um.`;
  return `${dado(n.reduce((a, b) => a + b, 0))}.`;
}

export function rotasDocumentos(app: Hono<VarsPortal>, deps: DepsPortal) {
  const quem = (c: Context<VarsPortal>) => ({ p_pessoa: c.get("sessao").pessoaId, p_escritorio: c.get("escritorioId") });
  const pasta = (c: Context<VarsPortal>) => `${c.get("escritorioId")}/documentos`;
  const link = async (caminho: string, nome: string) =>
    ({ url: await deps.arquivos.enderecoDeLeitura(caminho, VALIDADE_LEITURA_S, nome), validadeSegundos: VALIDADE_LEITURA_S });

  /** O arquivo que chegou como corpo binário, até 5 MB. */
  async function lerArquivo(c: Context<VarsPortal>): Promise<Uint8Array> {
    if (Number(c.req.header("content-length") ?? 0) > LIMITE_MODELO_BYTES) throw new ErroDominio("VALIDATION_ERROR", { campos: ["arquivo"], motivo: "ARQUIVO_GRANDE" });
    return new Uint8Array(await c.req.arrayBuffer());
  }

  async function conferir(bytes: Uint8Array) {
    try {
      return await conferirDocx(bytes);
    } catch (e) {
      if (e instanceof ErroDocx) throw new ErroDominio("VALIDATION_ERROR", { campos: ["arquivo"], motivo: e.motivo });
      throw e;
    }
  }

  function tipoDaConsulta(c: Context): TipoDocumentoContrato {
    const t = enviarModeloDocumentoSchema.shape.tipo.safeParse((c.req.query("tipo") ?? "").toUpperCase());
    if (!t.success) throw new ErroDominio("VALIDATION_ERROR", { campos: ["tipo"] });
    return t.data;
  }

  /** Os parágrafos (para a prévia), os campos e os bytes de cada documento. */
  function abrir(c: Context<VarsPortal>, d: DocumentoConferido, dados: DadosDocumentos) {
    if (d.padrao) {
      const p = modeloPadraoDocumento(d.padrao);
      if (!p) throw new ErroDominio("VALIDATION_ERROR", { campos: ["documentos"], motivo: "MODELO_INVALIDO" });
      return {
        paragrafos: p.paragrafos.map((x) => x.texto),
        campos: camposDoPadraoDocumento(p),
        // O padrão sai no timbrado do escritório, com o logo de hoje (como a proposta).
        bytes: async () => criarDocx(p.paragrafos, linhasTimbrado({ ...dados.escritorio, oab: dados.marca?.oab ?? dados.escritorio.oab }),
          await logoDaProposta(deps, c.get("escritorioId"), dados.marca)),
      };
    }
    return {
      paragrafos: d.paragrafos ?? [],
      campos: d.campos ?? [],
      bytes: async () => {
        const b = await deps.arquivos.baixar(`${pasta(c)}/modelos/${d.versaoId}.docx`);
        if (!b) throw new ErroDominio("UPSTREAM_UNAVAILABLE");
        return b;
      },
    };
  }

  const preparar = (c: Context<VarsPortal>, contrato: string, pedido: unknown) =>
    deps.banco.rpc<Preparado>("portal_documento_preparar", { ...quem(c), p_contrato: contrato, p_pedido: pedido });

  // ------------------------------------------------------------------- lista e modelos

  app.get("/v1/escritorio/documentos", async (c) => {
    const f = filtroDocumentosSchema.safeParse({ situacao: c.req.query("situacao")?.toUpperCase(), q: c.req.query("q") });
    if (!f.success) throw new ErroDominio("VALIDATION_ERROR", { campos: [...new Set(f.error.issues.map((i) => String(i.path[0])))] });
    return c.json(await deps.banco.rpc<ListaDocumentos>("portal_documentos", { ...quem(c), p_filtro: f.data }));
  });

  // Os do escritório e, para cada tipo sem modelo próprio, o padrão T3jus (em revisão).
  app.get("/v1/escritorio/documentos/modelos", async (c) => {
    const r = await deps.banco.rpc<{ modelos: ModeloDocumentoLinha[]; usosPadrao: Record<string, number>; podeEnviar: boolean }>("portal_documento_modelos", quem(c));
    const comModelo = new Set(r.modelos.map((m) => m.tipo));
    const padrao: ModeloDocumentoLinha[] = [];
    for (const tipo of ["CONTRATO", "PROCURACAO", "HIPOSSUFICIENCIA"] as const) {
      if (comModelo.has(tipo)) continue;
      const ms = MODELOS_PADRAO_DOCUMENTO.filter((m) => m.tipo === tipo);
      const p = ms[0]!;
      padrao.push({
        id: p.codigo, codigos: ms.map((m) => ({ codigo: m.codigo, nome: m.nome })), padrao: true, tipo,
        nome: tipo === "HIPOSSUFICIENCIA" ? "Declaração de hipossuficiência" : p.nome,
        versao: 1, versaoId: null, campos: [...new Set(ms.flatMap(camposDoPadraoDocumento))], desconhecidos: [], enviadoPor: null,
        atualizadoEm: p.atualizadoEm, usos: ms.reduce((n, m) => n + (r.usosPadrao[m.codigo] ?? 0), 0), linhaVersao: 0,
        emRevisao: ms.some((m) => m.emRevisao), anteriores: [],
      });
    }
    const ordem = (m: ModeloDocumentoLinha) => ["CONTRATO", "PROCURACAO", "HIPOSSUFICIENCIA", "OUTRO"].indexOf(m.tipo);
    const lista: ListaModelosDocumento = {
      modelos: [...r.modelos, ...padrao].sort((a, b) => ordem(a) - ordem(b)), campos: [...CAMPOS_DOCUMENTO], podeEnviar: r.podeEnviar,
    };
    return c.json(lista);
  });

  // A conferência assim que o arquivo chega: não grava nada.
  app.post("/v1/escritorio/documentos/modelos/conferir", async (c) => {
    const tipo = tipoDaConsulta(c);
    const r = await conferir(await lerArquivo(c));
    return c.json(conferenciaModeloDocumento(tipo, r.campos, r.paragrafos.length));
  });

  async function enviarModelo(c: Context<VarsPortal>, modeloId: string | null) {
    const q = enviarModeloDocumentoSchema.partial().safeParse({ nome: c.req.query("nome") ?? undefined, tipo: c.req.query("tipo")?.toUpperCase() });
    const arquivo = (c.req.query("arquivo") ?? "").trim();
    const campos = q.success ? [] : [...new Set(q.error.issues.map((i) => String(i.path[0])))];
    if (!arquivo || arquivo.length > 200 || /[/\\]/.test(arquivo)) campos.push("arquivo");
    if (!q.success || campos.length) throw new ErroDominio("VALIDATION_ERROR", { campos });
    const bytes = await lerArquivo(c);
    const r = await conferir(bytes);
    const versaoId = crypto.randomUUID();
    await deps.arquivos.enviar(`${pasta(c)}/modelos/${versaoId}.docx`, bytes, TIPO_DOCX);
    const modelo = await deps.banco.rpc<ModeloDocumentoLinha>("portal_documento_modelo_enviar", {
      ...quem(c), p_modelo: modeloId, p_dados: q.data,
      p_conferido: {
        versaoId, arquivo, tamanho: bytes.length, campos: r.campos, paragrafos: r.paragrafos,
        desconhecidos: conferenciaModeloDocumento(q.data.tipo ?? "OUTRO", r.campos, r.paragrafos.length).desconhecidos.map((d) => d.campo),
      },
    });
    return c.json({ modelo, conferencia: conferenciaModeloDocumento(modelo.tipo, r.campos, r.paragrafos.length) }, 201);
  }
  app.post("/v1/escritorio/documentos/modelos", (c) => enviarModelo(c, null));
  app.post("/v1/escritorio/documentos/modelos/:id/versoes", (c) => enviarModelo(c, idDaRota(c, "id")));

  app.post("/v1/escritorio/documentos/modelos/:id/arquivar", async (c) => {
    const d = await lerCorpo(c, arquivarModeloDocumentoSchema);
    return c.json(await deps.banco.rpc("portal_documento_modelo_arquivar", { ...quem(c), p_modelo: idDaRota(c, "id"), p_versao: d.versao, p_motivo: d.motivo }));
  });

  // Baixar o modelo: o do escritório pelo Storage (a versão pedida ou a atual); o padrão é montado
  // sem timbrado, com os campos à vista, para servir de ponto de partida.
  app.post("/v1/escritorio/documentos/modelos/:id/abrir", async (c) => {
    const padrao = modeloPadraoDocumento(c.req.param("id") ?? "");
    if (padrao) {
      await deps.banco.rpc("portal_documento_modelos", quem(c));
      const caminho = `${pasta(c)}/modelos/padrao-${padrao.codigo.toLowerCase()}.docx`;
      await deps.arquivos.enviar(caminho, await criarDocx(padrao.paragrafos), TIPO_DOCX, true);
      return c.json(await link(caminho, `modelo-${padrao.codigo.toLowerCase().replace(/_/g, "-")}.docx`));
    }
    const n = c.req.query("versao");
    const versao = n && /^[1-9][0-9]{0,3}$/.test(n) ? Number(n) : null;
    const r = await deps.banco.rpc<{ versaoId: string; nome: string }>("portal_documento_modelo_arquivo", { ...quem(c), p_modelo: idDaRota(c, "id"), p_versao: versao });
    return c.json(await link(`${pasta(c)}/modelos/${r.versaoId}.docx`, r.nome));
  });

  // ------------------------------------------------------------------- gerar

  app.get("/v1/escritorio/contratos/:id/documentos-dados", async (c) => {
    return c.json(await deps.banco.rpc<DadosDocumentos>("portal_documento_dados", { ...quem(c), p_contrato: idDaRota(c, "id") }));
  });

  app.get("/v1/escritorio/contratos/:id/documentos", async (c) => {
    return c.json(await deps.banco.rpc<DocumentosDoContrato>("portal_contrato_documentos", { ...quem(c), p_contrato: idDaRota(c, "id") }));
  });

  // A prévia, uma aba por documento (decisão 12): confere como o gerar e não grava nada.
  app.post("/v1/escritorio/contratos/:id/documentos/previa", async (c) => {
    const d = await lerCorpo(c, escolhasDocumentosSchema);
    const prep = await preparar(c, idDaRota(c, "id"), d);
    const v = montarValoresDocumento(prep.dados, prep.pedido);
    const documentos: PreviaDocumento[] = prep.pedido.documentos.map((doc) => {
      const m = abrir(c, doc, prep.dados);
      return {
        tipo: doc.tipo, modeloId: doc.modeloId ?? null, nome: doc.nome,
        paragrafos: previaDocumento(m.paragrafos, v),
        marcados: marcadosDoModeloDocumento(v, m.campos),
        desconhecidos: m.campos.filter((x) => !Object.hasOwn(v.valores, x)),
      };
    });
    const previa: PreviaDocumentos = { documentos, frase: fraseDaFaixa(documentos) };
    return c.json(previa);
  });

  // Gera um .docx por documento, grava cada um e só então registra a geração (decisões 13 a 16).
  app.post("/v1/escritorio/contratos/:id/documentos", async (c) => {
    const d = await lerCorpo(c, escolhasDocumentosSchema);
    const contrato = idDaRota(c, "id");
    const prep = await preparar(c, contrato, d);
    const v: ValoresDocumento = montarValoresDocumento(prep.dados, prep.pedido);
    const documentos = [];
    for (const doc of prep.pedido.documentos) {
      const m = abrir(c, doc, prep.dados);
      const arquivo = await preencherDocx(await m.bytes(), v.valores);
      const id = crypto.randomUUID();
      await deps.arquivos.enviar(`${pasta(c)}/${id}.docx`, arquivo, TIPO_DOCX);
      documentos.push({
        id, chave: doc.chave, tamanho: arquivo.length, marcados: marcadosDoModeloDocumento(v, m.campos),
        arquivo: nomeArquivoDocumento(doc.tipo, doc.nome, prep.dados.contrato.numero, prep.dados.cliente.nome, doc.numero),
      });
    }
    const padraoDe = MODELOS_PADRAO_DOCUMENTO[0]!.atualizadoEm;
    const r = await deps.banco.rpc<ResultadoDocumentos>("portal_documento_gravar", {
      ...quem(c), p_contrato: contrato, p_pedido: d, p_resultado: { geracaoId: crypto.randomUUID(), padraoDe, documentos },
    });
    return c.json(r, 201);
  });

  // ------------------------------------------------------------------- baixar

  app.post("/v1/escritorio/documentos/:id/abrir", async (c) => {
    const r = await deps.banco.rpc<{ id: string; nome: string }>("portal_documento_arquivo", { ...quem(c), p_id: idDaRota(c, "id") });
    return c.json(await link(`${pasta(c)}/${r.id}.docx`, r.nome));
  });

  // "Baixar todos (.zip)" de uma geração: monta uma vez e guarda (o conteúdo não muda).
  app.post("/v1/escritorio/documentos/geracoes/:id/zip", async (c) => {
    const geracao = idDaRota(c, "id");
    const g = await deps.banco.rpc<{ numero: string; cliente: string; versao: number; arquivos: { id: string; nome: string }[] }>(
      "portal_documento_geracao", { ...quem(c), p_geracao: geracao });
    const entradas = [];
    for (const a of g.arquivos) {
      const dados = await deps.arquivos.baixar(`${pasta(c)}/${a.id}.docx`);
      if (!dados) throw new ErroDominio("UPSTREAM_UNAVAILABLE");
      entradas.push({ nome: a.nome, dados });
    }
    const caminho = `${pasta(c)}/zip/${geracao}.zip`;
    await deps.arquivos.enviar(caminho, await escreverZip(entradas, { guardar: true }), "application/zip", true);
    return c.json(await link(caminho, nomeZipDocumentos(g.numero, g.cliente, g.versao)));
  });
}
