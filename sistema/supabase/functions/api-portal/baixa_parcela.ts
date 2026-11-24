// "Dar baixa sem receber" numa parcela em atraso, com motivo (F3.139; FI-24, FI-25, FI-08).
// Tela aprovada em docs/design/aprovadas/portal-baixa-parcela-motivo. O banco confere quem pode
// (Financeiro com financeiro.editar), a escrita do escritório e o que muda
// (1010_baixa_parcela.sql). No T3jus "baixa" sozinha quer dizer recebido: tudo diz "sem receber".

import type { Context, Hono } from "hono";
import {
  baixarParcelaSchema, desfazerBaixaSchema, ErroDominio,
  type BaixaDesfeita, type BaixaFeita, type PreviaBaixa,
} from "@t3jus/domain";
import { lerCorpo } from "../_shared/validar.ts";
import type { DepsPortal, VarsPortal } from "./app.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function idDaRota(c: Context): string {
  const id = c.req.param("id");
  if (!id || !UUID.test(id)) throw new ErroDominio("NOT_FOUND");
  return id.toLowerCase();
}

export function rotasBaixaParcela(app: Hono<VarsPortal>, deps: DepsPortal) {
  const quem = (c: Context<VarsPortal>) => ({ p_pessoa: c.get("sessao").pessoaId, p_escritorio: c.get("escritorioId") });

  // O que a janela mostra antes de confirmar: o que falta, os recibos, as custas, os casos.
  app.get("/v1/escritorio/financeiro/parcelas/:id/baixa", async (c) =>
    c.json(await deps.banco.rpc<PreviaBaixa>("portal_financeiro_parcela_baixa_previa", { ...quem(c), p_parcela: idDaRota(c) })));

  // Dar baixa sem receber. "falta" é o valor que a pessoa viu: se mudou, o banco recusa (PARCELA_MUDOU).
  app.post("/v1/escritorio/financeiro/parcelas/:id/baixa", async (c) => {
    const d = await lerCorpo(c, baixarParcelaSchema);
    return c.json(await deps.banco.rpc<BaixaFeita>("portal_financeiro_parcela_baixar", {
      ...quem(c), p_parcela: idDaRota(c), p_dados: d,
    }), 201);
  });

  // Desfazer a baixa sem receber: a parcela volta para A receber e a cobrança ganha a próxima ação.
  app.post("/v1/escritorio/financeiro/parcelas/:id/baixa/desfazer", async (c) => {
    const d = await lerCorpo(c, desfazerBaixaSchema);
    return c.json(await deps.banco.rpc<BaixaDesfeita>("portal_financeiro_parcela_baixa_desfazer", {
      ...quem(c), p_parcela: idDaRota(c), p_dados: d,
    }));
  });
}
