// Rotas dos anexos do Portal fora do caso (F3.12, F3.22): o contrato assinado e a nota, guia,
// boleto ou comprovante de cada conta e de cada recebimento. O banco confere a área e o dono
// (0520_portal_anexos.sql). O arquivo vai direto do navegador para o Storage, no bucket
// documentos-portal; aqui só se registra, confere e assina. O caminho é <escritório>/<anexo>,
// montado no servidor, nunca vindo do navegador.

import type { Context, Hono } from "hono";
import { buscarAnexosSchema, ErroDominio, iniciarAnexoSchema, type Anexo, type AnexosDaExportacao, type ListaAnexos } from "@t3jus/domain";
import { VALIDADE_LEITURA_S } from "../_shared/arquivos.ts";
import { lerCorpo } from "../_shared/validar.ts";
import type { DepsPortal, VarsPortal } from "./app.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function idDaRota(c: Context, nome: string): string {
  const id = c.req.param(nome);
  if (!id || !UUID.test(id)) throw new ErroDominio("NOT_FOUND");
  return id.toLowerCase();
}

export function rotasAnexos(app: Hono<VarsPortal>, deps: DepsPortal) {
  const quem = (c: Context<VarsPortal>) => ({ p_pessoa: c.get("sessao").pessoaId, p_escritorio: c.get("escritorioId") });

  app.post("/v1/escritorio/anexos", async (c) => {
    const d = await lerCorpo(c, iniciarAnexoSchema);
    const anexo = await deps.banco.rpc<string>("portal_anexo_iniciar", { ...quem(c), p_dados: d });
    return c.json({ id: anexo, enderecoDeEnvio: await deps.arquivos.enderecoDeEnvio(`${c.get("escritorioId")}/${anexo}`) }, 201);
  });

  app.post("/v1/escritorio/anexos/:id/concluir", async (c) => {
    const anexo = idDaRota(c, "id");
    const [registro] = await deps.banco.rpc<{ tipo: string; tamanho: number }[]>("portal_anexo_para_concluir", { ...quem(c), p_anexo: anexo });
    const chegou = await deps.arquivos.info(`${c.get("escritorioId")}/${anexo}`);
    if (!registro || !chegou || chegou.tamanho !== registro.tamanho || chegou.tipo !== registro.tipo) {
      throw new ErroDominio("VALIDATION_ERROR", { campos: ["arquivo"], motivo: "ARQUIVO_NAO_CHEGOU" });
    }
    return c.json(await deps.banco.rpc<Anexo>("portal_anexo_concluir", { ...quem(c), p_anexo: anexo }));
  });

  app.post("/v1/escritorio/anexos/:id/abrir", async (c) => {
    const anexo = idDaRota(c, "id");
    const nome = await deps.banco.rpc<string>("portal_anexo_abrir", { ...quem(c), p_anexo: anexo });
    return c.json({ url: await deps.arquivos.enderecoDeLeitura(`${c.get("escritorioId")}/${anexo}`, VALIDADE_LEITURA_S, nome), validadeSegundos: VALIDADE_LEITURA_S });
  });

  // O assinado do contrato (CH-01), do mais novo ao mais antigo.
  app.get("/v1/escritorio/contratos/:id/anexos", async (c) => {
    return c.json(await deps.banco.rpc<ListaAnexos>("portal_contrato_anexos", { ...quem(c), p_contrato: idDaRota(c, "id") }));
  });

  // Os anexos das contas e dos recebimentos que a tela mostra (FI-18).
  app.post("/v1/escritorio/financeiro/anexos/buscar", async (c) => {
    const d = await lerCorpo(c, buscarAnexosSchema);
    return c.json(await deps.banco.rpc<ListaAnexos>("portal_financeiro_anexos", { ...quem(c), p_contas: d.contas, p_pagamentos: d.pagamentos }));
  });

  // Para a exportação do mês (FI-21): as despesas pagas sem nota e os anexos.
  app.get("/v1/escritorio/financeiro/exportacoes/anexos", async (c) => {
    const mes = c.req.query("mes") ?? "";
    if (!/^\d{4}-\d{2}-01$/.test(mes)) throw new ErroDominio("VALIDATION_ERROR", { campos: ["mes"] });
    return c.json(await deps.banco.rpc<AnexosDaExportacao>("portal_financeiro_exportacao_anexos", { ...quem(c), p_mes: mes }));
  });
}
