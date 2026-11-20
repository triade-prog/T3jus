// Rotas das petições (EX-09), tela aprovada em docs/design/aprovadas/portal-peticoes. O banco
// confere quem pode e o que bloqueia (0440_portal_peticoes.sql); aqui o .docx é lido, preenchido
// e marcado como rascunho na memória (packages/domain/src/docx.ts) e gravado no Storage privado:
//   <escritório>/peticoes/<versão>.docx           o arquivo limpo
//   <escritório>/peticoes/<versão>-rascunho.docx  com "Rascunho · em revisão" no cabeçalho
//   <escritório>/peticoes/modelos/<versão>.docx   o modelo enviado pelo escritório
//   <escritório>/<documento>                      a aprovada, nos documentos do caso
// O nome que a pessoa dá ao arquivo nunca entra no caminho.

import type { Context, Hono } from "hono";
import {
  camposDoPadrao, campoConhecido, CAMPOS_PETICAO, conferirDocx, criarDocx, decisaoRevisaoSchema, enviarModeloSchema, enviarRevisaoSchema,
  ErroDocx, ErroDominio, escolhasPeticaoSchema, filtroPeticoesSchema, gerarPeticaoSchema, marcadosDoModelo, marcarRascunho, modeloPadrao,
  MODELOS_PADRAO, montarPrevia, montarValores, nomeArquivoPeticao, novaVersaoDadosSchema, passarRevisaoSchema, preencherDocx, previaDeTexto,
  sugestaoCampo, TIPO_DOCX, arquivarModeloSchema, comentarioPeticaoSchema, LIMITE_MODELO_BYTES,
  type ComentarioPeticao, type ConferenciaModelo, type DadosPeticao, type EscolhasPeticao, type FichaPeticao, type ListaModelos, type ListaPeticoes,
  type ModeloPeticao, type PreviaPeticao, type ResultadoGerar, type RevisorPossivel,
} from "@t3jus/domain";
import { VALIDADE_LEITURA_S } from "../_shared/arquivos.ts";
import { lerCorpo } from "../_shared/validar.ts";
import type { DepsPortal, VarsPortal } from "./app.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function idDaRota(c: Context, nome: string): string {
  const id = c.req.param(nome);
  if (!id || !UUID.test(id)) throw new ErroDominio("NOT_FOUND");
  return id.toLowerCase();
}

/** O modelo que o banco devolve no preparar. */
interface ModeloEscolhido {
  padrao?: string;
  modeloId?: string;
  versaoId?: string;
  nome?: string;
  campos?: string[];
  paragrafos?: string[];
}
interface PedidoConferido extends EscolhasPeticao {
  modelo: ModeloEscolhido;
}
interface Preparado {
  pedido: PedidoConferido;
  dados: DadosPeticao;
}

export function rotasPeticoes(app: Hono<VarsPortal>, deps: DepsPortal) {
  const quem = (c: Context<VarsPortal>) => ({ p_pessoa: c.get("sessao").pessoaId, p_escritorio: c.get("escritorioId") });
  const pasta = (c: Context<VarsPortal>) => `${c.get("escritorioId")}/peticoes`;

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

  function conferencia(campos: string[], paragrafos: number): ConferenciaModelo {
    return {
      campos,
      desconhecidos: campos.filter((x) => !campoConhecido(x)).map((campo) => ({ campo, sugestao: sugestaoCampo(campo) })),
      semCampos: !campos.some(campoConhecido),
      paragrafos,
    };
  }

  /** O modelo em .docx e os parágrafos (para a prévia). */
  function abrirModelo(c: Context<VarsPortal>, m: ModeloEscolhido): { nome: string; bytes: () => Promise<Uint8Array>; paragrafos: string[]; campos: string[]; resto: string } {
    if (m.padrao) {
      const p = modeloPadrao(m.padrao);
      if (!p) throw new ErroDominio("VALIDATION_ERROR", { campos: ["modelo"], motivo: "MODELO_INVALIDO" });
      return { nome: p.nome, bytes: () => criarDocx(p.paragrafos), paragrafos: p.paragrafos.map((x) => x.texto), campos: camposDoPadrao(p), resto: p.resto };
    }
    return {
      nome: m.nome ?? "Modelo do escritório",
      bytes: async () => {
        const b = await deps.arquivos.baixar(`${pasta(c)}/modelos/${m.versaoId}.docx`);
        if (!b) throw new ErroDominio("UPSTREAM_UNAVAILABLE");
        return b;
      },
      paragrafos: m.paragrafos ?? [],
      campos: m.campos ?? [],
      resto: `Continua com o texto do modelo do escritório, do jeito que está no Word. O T3jus não muda esse texto.`,
    };
  }

  function contagem(campos: string[], v: ReturnType<typeof montarValores>) {
    const conhecidos = campos.filter(campoConhecido);
    const preenchido = (x: string) => !/: falta\]/.test(v.valores[x] ?? "");
    return {
      total: conhecidos.length,
      cadastro: conhecidos.filter((x) => v.origem[x] !== "formulario" && preenchido(x)).length,
      formulario: conhecidos.filter((x) => v.origem[x] === "formulario" && preenchido(x)).length,
      preenchidos: conhecidos.filter(preenchido).length,
    };
  }

  /** Monta o .docx (limpo e rascunho), grava no Storage e devolve o que o banco guarda. */
  async function montar(c: Context<VarsPortal>, prep: Preparado, versaoId: string, numero: number, documentoId: string | null) {
    const modelo = abrirModelo(c, prep.pedido.modelo);
    const v = montarValores(prep.dados, prep.pedido);
    const limpo = await preencherDocx(await modelo.bytes(), v.valores);
    await deps.arquivos.enviar(`${pasta(c)}/${versaoId}.docx`, limpo, TIPO_DOCX);
    await deps.arquivos.enviar(`${pasta(c)}/${versaoId}-rascunho.docx`, await marcarRascunho(limpo), TIPO_DOCX);
    if (documentoId) await deps.arquivos.enviar(`${c.get("escritorioId")}/${documentoId}`, limpo, TIPO_DOCX);
    return {
      versaoId, documentoId, modeloNome: modelo.nome, tamanho: limpo.length,
      arquivo: nomeArquivoPeticao(modelo.nome, prep.dados.caso.nome, numero),
      marcados: marcadosDoModelo(v, modelo.campos),
      previa: montarPrevia(modelo.paragrafos, v),
    };
  }

  // ------------------------------------------------------------------- modelos

  app.get("/v1/escritorio/peticoes/modelos", async (c) => {
    const r = await deps.banco.rpc<{ modelos: ModeloPeticao[]; usosPadrao: Record<string, number>; podeEnviar: boolean }>("portal_peticao_modelos", quem(c));
    const trocados = new Set(r.modelos.map((m) => m.substitui).filter(Boolean));
    const padrao: ModeloPeticao[] = MODELOS_PADRAO.filter((m) => !trocados.has(m.codigo)).map((m) => ({
      id: m.codigo, padrao: true, nome: m.nome, tipo: m.tipo, area: m.area, substitui: null, versao: 1, versaoId: null,
      campos: camposDoPadrao(m), desconhecidos: [], enviadoPor: null, atualizadoEm: m.atualizadoEm, usos: r.usosPadrao[m.codigo] ?? 0, linhaVersao: 0,
    }));
    const lista: ListaModelos = { modelos: [...r.modelos, ...padrao], campos: [...CAMPOS_PETICAO], podeEnviar: r.podeEnviar };
    return c.json(lista);
  });

  // A conferência assim que o arquivo chega (decisão 5): não grava nada.
  app.post("/v1/escritorio/peticoes/modelos/conferir", async (c) => {
    const r = await conferir(await lerArquivo(c));
    return c.json(conferencia(r.campos, r.paragrafos.length));
  });

  async function enviarModelo(c: Context<VarsPortal>, modeloId: string | null) {
    const q = enviarModeloSchema.partial({ nome: true, tipo: true, area: true }).safeParse({
      nome: c.req.query("nome") ?? undefined, tipo: c.req.query("tipo") ?? undefined, area: c.req.query("area") ?? undefined,
      substitui: c.req.query("substitui") || null,
    });
    const arquivo = (c.req.query("arquivo") ?? "").trim();
    const campos = q.success ? [] : [...new Set(q.error.issues.map((i) => String(i.path[0])))];
    if (!arquivo || arquivo.length > 200 || /[/\\]/.test(arquivo)) campos.push("arquivo");
    if (!q.success || campos.length) throw new ErroDominio("VALIDATION_ERROR", { campos });
    const bytes = await lerArquivo(c);
    const r = await conferir(bytes);
    const versaoId = crypto.randomUUID();
    await deps.arquivos.enviar(`${pasta(c)}/modelos/${versaoId}.docx`, bytes, TIPO_DOCX);
    const conf = conferencia(r.campos, r.paragrafos.length);
    const modelo = await deps.banco.rpc<ModeloPeticao>("portal_peticao_modelo_enviar", {
      ...quem(c), p_modelo: modeloId, p_dados: q.data,
      p_conferido: { versaoId, arquivo, tamanho: bytes.length, campos: r.campos, desconhecidos: conf.desconhecidos.map((d) => d.campo), paragrafos: r.paragrafos },
    });
    return c.json({ modelo, conferencia: conf }, 201);
  }
  app.post("/v1/escritorio/peticoes/modelos", (c) => enviarModelo(c, null));
  app.post("/v1/escritorio/peticoes/modelos/:id/versoes", (c) => enviarModelo(c, idDaRota(c, "id")));

  app.post("/v1/escritorio/peticoes/modelos/:id/arquivar", async (c) => {
    const d = await lerCorpo(c, arquivarModeloSchema);
    return c.json(await deps.banco.rpc("portal_peticao_modelo_arquivar", { ...quem(c), p_modelo: idDaRota(c, "id"), p_versao: d.versao, p_motivo: d.motivo }));
  });

  // Baixar o modelo: o do escritório pelo Storage; o padrão é montado e guardado na pasta do escritório.
  app.post("/v1/escritorio/peticoes/modelos/:id/abrir", async (c) => {
    const id = c.req.param("id");
    const padrao = modeloPadrao(id);
    if (padrao) {
      await deps.banco.rpc("portal_peticao_modelos", quem(c));
      const caminho = `${pasta(c)}/modelos/padrao-${padrao.codigo}.docx`;
      await deps.arquivos.enviar(caminho, await criarDocx(padrao.paragrafos), TIPO_DOCX, true);
      return c.json({ url: await deps.arquivos.enderecoDeLeitura(caminho, VALIDADE_LEITURA_S, `${nomeArquivoPeticao(padrao.nome, "modelo")}`), validadeSegundos: VALIDADE_LEITURA_S });
    }
    const r = await deps.banco.rpc<{ versaoId: string; nome: string }>("portal_peticao_modelo_arquivo", { ...quem(c), p_modelo: idDaRota(c, "id"), p_versao: null });
    return c.json({ url: await deps.arquivos.enderecoDeLeitura(`${pasta(c)}/modelos/${r.versaoId}.docx`, VALIDADE_LEITURA_S, r.nome), validadeSegundos: VALIDADE_LEITURA_S });
  });

  // ------------------------------------------------------------------- gerar

  app.get("/v1/escritorio/peticoes/casos/:id/dados", async (c) => {
    return c.json(await deps.banco.rpc<DadosPeticao>("portal_peticao_dados", { ...quem(c), p_caso: idDaRota(c, "id") }));
  });

  // A prévia (decisão 10): confere como o gerar, monta os valores e não grava nada.
  app.post("/v1/escritorio/peticoes/casos/:id/previa", async (c) => {
    const d = await lerCorpo(c, escolhasPeticaoSchema);
    const prep = await deps.banco.rpc<Preparado>("portal_peticao_preparar", { ...quem(c), p_caso: idDaRota(c, "id"), p_pedido: d });
    const modelo = abrirModelo(c, prep.pedido.modelo);
    const v = montarValores(prep.dados, prep.pedido);
    const previa: PreviaPeticao = {
      paragrafos: montarPrevia(modelo.paragrafos, v),
      resto: modelo.resto,
      campos: contagem(modelo.campos, v),
      marcados: marcadosDoModelo(v, modelo.campos),
      desconhecidos: modelo.campos.filter((x) => !campoConhecido(x)),
      revisor: prep.dados.revisor,
      semRevisao: prep.dados.semRevisao,
    };
    return c.json(previa);
  });

  app.post("/v1/escritorio/peticoes/casos/:id/gerar", async (c) => {
    const d = await lerCorpo(c, gerarPeticaoSchema);
    const caso = idDaRota(c, "id");
    const prep = await deps.banco.rpc<Preparado>("portal_peticao_preparar", { ...quem(c), p_caso: caso, p_pedido: d });
    const peticaoId = crypto.randomUUID();
    const resultado = await montar(c, prep, crypto.randomUUID(), 1, prep.dados.semRevisao ? crypto.randomUUID() : null);
    const r = await deps.banco.rpc<ResultadoGerar>("portal_peticao_gravar", { ...quem(c), p_caso: caso, p_pedido: d, p_resultado: { ...resultado, peticaoId } });
    return c.json(r, 201);
  });

  // ------------------------------------------------------------------- lista, ficha e arquivo

  app.get("/v1/escritorio/peticoes", async (c) => {
    const f = filtroPeticoesSchema.safeParse({ q: c.req.query("q"), modelo: c.req.query("modelo"), visao: c.req.query("visao"), caso: c.req.query("caso") });
    if (!f.success) throw new ErroDominio("VALIDATION_ERROR", { campos: [...new Set(f.error.issues.map((i) => String(i.path[0])))] });
    return c.json(await deps.banco.rpc<ListaPeticoes>("portal_peticoes", { ...quem(c), p_filtro: f.data }));
  });

  app.get("/v1/escritorio/peticoes/:id", async (c) => {
    const f = await deps.banco.rpc<Omit<FichaPeticao, "resto">>("portal_peticao", { ...quem(c), p_id: idDaRota(c, "id") });
    const padrao = f.modelo.padrao ? modeloPadrao(f.modelo.id) : null;
    const resto = f.previaEditada
      ? "Este é o texto do .docx editado no Word. Os dados não aparecem marcados."
      : padrao?.resto ?? `Continua com o texto do modelo do escritório${f.modelo.versao ? ` (v${f.modelo.versao})` : ""}. O T3jus não muda esse texto.`;
    return c.json({ ...f, resto });
  });

  app.post("/v1/escritorio/peticoes/:id/abrir", async (c) => {
    const n = c.req.query("versao");
    const versao = n && /^[1-9][0-9]{0,3}$/.test(n) ? Number(n) : null;
    const r = await deps.banco.rpc<{ versaoId: string; nome: string; rascunho: boolean }>("portal_peticao_arquivo", { ...quem(c), p_id: idDaRota(c, "id"), p_versao: versao });
    const caminho = `${pasta(c)}/${r.versaoId}${r.rascunho ? "-rascunho" : ""}.docx`;
    const nome = r.rascunho ? `rascunho-${r.nome}` : r.nome;
    return c.json({ url: await deps.arquivos.enderecoDeLeitura(caminho, VALIDADE_LEITURA_S, nome), validadeSegundos: VALIDADE_LEITURA_S, rascunho: r.rascunho });
  });

  // ------------------------------------------------------------------- revisão

  app.post("/v1/escritorio/peticoes/:id/enviar", async (c) => {
    const d = await lerCorpo(c, enviarRevisaoSchema);
    return c.json(await deps.banco.rpc<ResultadoGerar>("portal_peticao_enviar", { ...quem(c), p_id: idDaRota(c, "id"), p_recado: d.recado ?? null }));
  });

  app.post("/v1/escritorio/peticoes/:id/comentarios", async (c) => {
    const d = await lerCorpo(c, comentarioPeticaoSchema);
    return c.json(await deps.banco.rpc<ComentarioPeticao>("portal_peticao_comentar", { ...quem(c), p_id: idDaRota(c, "id"), p_dados: d }), 201);
  });

  app.post("/v1/escritorio/peticoes/comentarios/:id/desfazer", async (c) => {
    return c.json(await deps.banco.rpc("portal_peticao_comentario_desfazer", { ...quem(c), p_comentario: idDaRota(c, "id") }));
  });

  // Aprovar copia o arquivo limpo para os documentos do caso antes de gravar (decisão 25).
  app.post("/v1/escritorio/peticoes/:id/decisao", async (c) => {
    const d = await lerCorpo(c, decisaoRevisaoSchema);
    const id = idDaRota(c, "id");
    let documento: string | null = null;
    if (d.decisao === "APROVAR") {
      const v = await deps.banco.rpc<{ versaoId: string }>("portal_peticao_para_aprovar", { ...quem(c), p_id: id, p_versao: d.versao });
      const limpo = await deps.arquivos.baixar(`${pasta(c)}/${v.versaoId}.docx`);
      if (!limpo) throw new ErroDominio("UPSTREAM_UNAVAILABLE");
      documento = crypto.randomUUID();
      await deps.arquivos.enviar(`${c.get("escritorioId")}/${documento}`, limpo, TIPO_DOCX);
    }
    return c.json(await deps.banco.rpc<FichaPeticao>("portal_peticao_decidir", { ...quem(c), p_id: id, p_dados: d, p_documento: documento }));
  });

  app.get("/v1/escritorio/peticoes/:id/revisores", async (c) => {
    return c.json({ revisores: await deps.banco.rpc<RevisorPossivel[]>("portal_peticao_revisores", { ...quem(c), p_id: idDaRota(c, "id") }) });
  });

  app.post("/v1/escritorio/peticoes/:id/passar", async (c) => {
    const d = await lerCorpo(c, passarRevisaoSchema);
    return c.json(await deps.banco.rpc<FichaPeticao>("portal_peticao_passar", { ...quem(c), p_id: idDaRota(c, "id"), p_dados: d }));
  });

  // Versão nova depois do ajuste (decisão 23), refeita pelos dados.
  app.post("/v1/escritorio/peticoes/:id/versoes", async (c) => {
    const { resolvidos, recado, ...escolhas } = await lerCorpo(c, novaVersaoDadosSchema);
    const id = idDaRota(c, "id");
    const prep = await deps.banco.rpc<Preparado & { numero: number }>("portal_peticao_versao_preparar", { ...quem(c), p_id: id, p_pedido: escolhas });
    const resultado = await montar(c, prep, crypto.randomUUID(), prep.numero, null);
    return c.json(await deps.banco.rpc<ResultadoGerar>("portal_peticao_versao_gravar", {
      ...quem(c), p_id: id, p_dados: { origem: "DADOS", escolhas, resolvidos, recado: recado ?? null }, p_resultado: resultado,
    }), 201);
  });

  // …ou o .docx editado no Word: mesma conferência; a prévia é o texto do arquivo (decisão 24).
  app.post("/v1/escritorio/peticoes/:id/versoes/docx", async (c) => {
    const id = idDaRota(c, "id");
    const recado = (c.req.query("recado") ?? "").trim() || null;
    const resolvidos = (c.req.query("resolvidos") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    if ((recado?.length ?? 0) > 1000 || resolvidos.length > 200 || !resolvidos.every((x) => UUID.test(x))) {
      throw new ErroDominio("VALIDATION_ERROR", { campos: [recado && recado.length > 1000 ? "recado" : "resolvidos"] });
    }
    const prep = await deps.banco.rpc<{ numero: number; modeloNome: string; casoNome: string }>("portal_peticao_versao_preparar", { ...quem(c), p_id: id, p_pedido: null });
    const bytes = await lerArquivo(c);
    const r = await conferir(bytes);
    const versaoId = crypto.randomUUID();
    await deps.arquivos.enviar(`${pasta(c)}/${versaoId}.docx`, bytes, TIPO_DOCX);
    await deps.arquivos.enviar(`${pasta(c)}/${versaoId}-rascunho.docx`, await marcarRascunho(bytes), TIPO_DOCX);
    const resultado = {
      versaoId, tamanho: bytes.length, arquivo: nomeArquivoPeticao(prep.modeloNome, prep.casoNome, prep.numero),
      marcados: [...new Set(r.faltas)], previa: previaDeTexto(r.paragrafos),
    };
    const g = await deps.banco.rpc<ResultadoGerar>("portal_peticao_versao_gravar", {
      ...quem(c), p_id: id, p_dados: { origem: "DOCX_EDITADO", resolvidos, recado }, p_resultado: resultado,
    });
    return c.json({ ...g, faltas: r.faltas.length }, 201);
  });
}
