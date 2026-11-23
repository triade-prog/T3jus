// Documentos para começar (AP-08, EX-18), desenho aprovado em
// docs/design/aprovadas/portal-jornada-fechamento (grupo 9). O banco confere quem pode e guarda
// tudo (0853_documentos_pessoais_lista.sql).
// - Documentos pessoais: o arquivo vai direto do navegador ao Storage (bucket documentos-portal),
//   com o envio em duas etapas de Documentos do caso. O caminho é <escritório>/<documento>, montado
//   aqui, nunca vindo do navegador. As várias fotos viram um PDF no navegador (F3.99).
// - A lista por área: todos com Jurídico veem; só a sócia dona muda (o banco confere).

import type { Context, Hono } from "hono";
import {
  documentoInicioSchema, ErroDominio, moverDocumentoInicioSchema, iniciarDocumentoPessoalSchema, sugestaoDocumentosInicioSchema, tirarDocumentoInicioSchema,
  type DocumentoInicio, type DocumentoPessoal, type DocumentosInicio, type DocumentosPessoais,
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

export function rotasDocumentosPessoais(app: Hono<VarsPortal>, deps: DepsPortal) {
  const quem = (c: Context<VarsPortal>) => ({ p_pessoa: c.get("sessao").pessoaId, p_escritorio: c.get("escritorioId") });

  app.get("/v1/escritorio/clientes/:id/documentos", async (c) => {
    return c.json(await deps.banco.rpc<DocumentosPessoais>("portal_cliente_documentos", { ...quem(c), p_cliente: idDaRota(c, "id") }));
  });

  app.post("/v1/escritorio/clientes/:id/documentos", async (c) => {
    const d = await lerCorpo(c, iniciarDocumentoPessoalSchema);
    const doc = await deps.banco.rpc<string>("portal_cliente_documento_iniciar", { ...quem(c), p_cliente: idDaRota(c, "id"), p_dados: d });
    return c.json({ id: doc, enderecoDeEnvio: await deps.arquivos.enderecoDeEnvio(`${c.get("escritorioId")}/${doc}`) }, 201);
  });

  app.post("/v1/escritorio/clientes/documentos/:id/concluir", async (c) => {
    const doc = idDaRota(c, "id");
    const [registro] = await deps.banco.rpc<{ tipo: string; tamanho: number }[]>("portal_cliente_documento_para_concluir", { ...quem(c), p_documento: doc });
    const chegou = await deps.arquivos.info(`${c.get("escritorioId")}/${doc}`);
    if (!registro || !chegou || chegou.tamanho !== registro.tamanho || chegou.tipo !== registro.tipo) {
      throw new ErroDominio("VALIDATION_ERROR", { campos: ["arquivo"], motivo: "ARQUIVO_NAO_CHEGOU" });
    }
    return c.json(await deps.banco.rpc<DocumentoPessoal>("portal_cliente_documento_concluir", { ...quem(c), p_documento: doc }));
  });

  app.post("/v1/escritorio/clientes/documentos/:id/abrir", async (c) => {
    const doc = idDaRota(c, "id");
    const nome = await deps.banco.rpc<string>("portal_cliente_documento_abrir", { ...quem(c), p_documento: doc });
    return c.json({ url: await deps.arquivos.enderecoDeLeitura(`${c.get("escritorioId")}/${doc}`, VALIDADE_LEITURA_S, nome), validadeSegundos: VALIDADE_LEITURA_S });
  });

  // A lista por área (EX-18).
  app.get("/v1/escritorio/juridico/documentos-inicio", async (c) => {
    return c.json(await deps.banco.rpc<DocumentosInicio>("portal_juridico_documentos_inicio", quem(c)));
  });

  app.post("/v1/escritorio/juridico/documentos-inicio", async (c) => {
    const { versao: _v, ...d } = await lerCorpo(c, documentoInicioSchema);
    if (!d.area) throw new ErroDominio("VALIDATION_ERROR", { campos: ["area"] });
    return c.json(await deps.banco.rpc<DocumentoInicio>("portal_juridico_documento_inicio_salvar", { ...quem(c), p_id: null, p_versao: null, p_dados: d }), 201);
  });

  app.patch("/v1/escritorio/juridico/documentos-inicio/:id", async (c) => {
    const { versao, ...d } = await lerCorpo(c, documentoInicioSchema);
    if (!versao) throw new ErroDominio("VALIDATION_ERROR", { campos: ["versao"] });
    return c.json(await deps.banco.rpc<DocumentoInicio>("portal_juridico_documento_inicio_salvar", {
      ...quem(c), p_id: idDaRota(c, "id"), p_versao: versao, p_dados: d,
    }));
  });

  app.post("/v1/escritorio/juridico/documentos-inicio/:id/mover", async (c) => {
    const { direcao } = await lerCorpo(c, moverDocumentoInicioSchema);
    return c.json(await deps.banco.rpc<DocumentoInicio[]>("portal_juridico_documento_inicio_mover", { ...quem(c), p_id: idDaRota(c, "id"), p_direcao: direcao }));
  });

  app.post("/v1/escritorio/juridico/documentos-inicio/:id/tirar", async (c) => {
    const { versao } = await lerCorpo(c, tirarDocumentoInicioSchema);
    return c.json(await deps.banco.rpc<DocumentoInicio[]>("portal_juridico_documento_inicio_tirar", { ...quem(c), p_id: idDaRota(c, "id"), p_versao: versao }));
  });

  app.post("/v1/escritorio/juridico/documentos-inicio/sugestao", async (c) => {
    const { area } = await lerCorpo(c, sugestaoDocumentosInicioSchema);
    return c.json(await deps.banco.rpc<DocumentoInicio[]>("portal_juridico_documentos_inicio_sugestao", { ...quem(c), p_area: area }));
  });
}
