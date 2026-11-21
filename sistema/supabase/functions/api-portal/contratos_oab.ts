// A OAB dos advogados no contrato (EX-12, F3.74), tela aprovada em
// docs/design/aprovadas/portal-equipe-oab (decisões 14 a 21). O banco confere tudo
// (0530_contrato_inscricoes.sql): pelo menos uma inscrição por advogado, só da própria pessoa.

import type { Context, Hono } from "hono";
import { ErroDominio, inscricoesContratoSchema, type PessoaComOab } from "@t3jus/domain";
import { lerCorpo } from "../_shared/validar.ts";
import type { DepsPortal, VarsPortal } from "./app.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function idDaRota(c: Context, nome: string): string {
  const id = c.req.param(nome);
  if (!id || !UUID.test(id)) throw new ErroDominio("NOT_FOUND");
  return id.toLowerCase();
}

export function rotasContratosOab(app: Hono<VarsPortal>, deps: DepsPortal) {
  const quem = (c: Context<VarsPortal>) => ({ p_pessoa: c.get("sessao").pessoaId, p_escritorio: c.get("escritorioId") });

  // As pessoas da equipe com as inscrições, para marcar os advogados no Novo contrato.
  app.get("/v1/escritorio/pessoas/oab", async (c) => {
    return c.json({ pessoas: await deps.banco.rpc<PessoaComOab[]>("portal_pessoas_oab", quem(c)) });
  });

  // Mudar inscrições na ficha (decisão 19): só as inscrições, com a versão do contrato.
  app.put("/v1/escritorio/contratos/:id/advogados/:pessoa/inscricoes", async (c) => {
    const d = await lerCorpo(c, inscricoesContratoSchema);
    return c.json(await deps.banco.rpc<{ id: string; versao: number; frase: string | null }>("portal_contrato_inscricoes_mudar", {
      ...quem(c), p_contrato: idDaRota(c, "id"), p_alvo: idDaRota(c, "pessoa"), p_versao: d.versao,
      p_ids: d.inscricoes.map((x) => x.toLowerCase()),
    }));
  });
}
