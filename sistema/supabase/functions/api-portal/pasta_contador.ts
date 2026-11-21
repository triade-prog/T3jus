// A pasta (.zip) com os comprovantes do mês para o contador (F3.89, F3.22b; FI-18, FI-21). O banco
// diz quais anexos entram e guarda as partes (0621_pasta_contador.sql). Aqui o servidor baixa cada
// arquivo do Storage, monta o .zip sem comprimir de novo (PDF e foto já vêm comprimidos) e grava em
// <escritório>/exportacoes/<exportação>-<parte>.zip, no bucket documentos-portal. A pasta se monta
// uma vez por exportação; cada pedido assina links novos.

import type { Context, Hono } from "hono";
import {
  dividirPasta, ErroDominio, escreverZip, nomeDaPasta, nomesNaPasta,
  type AnexoDaPasta, type PartePasta, type PastaContador, type PastaParaBaixar,
} from "@t3jus/domain";
import { VALIDADE_LEITURA_S } from "../_shared/arquivos.ts";
import type { DepsPortal, VarsPortal } from "./app.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Preparo {
  exportacaoId: string;
  mes: string;
  formato: "XLSX" | "CSV";
  pasta: PastaContador | null;
  anexos: AnexoDaPasta[];
}

/**
 * A pasta da exportação: a que já existe ou, se o mês tem anexos, uma nova. Nulo quando não há
 * nenhum comprovante no mês (ou a exportação é só a planilha .csv).
 */
export async function garantirPasta(deps: DepsPortal, quem: { p_pessoa: string; p_escritorio: string }, exportacao: string): Promise<PastaContador | null> {
  const p = await deps.banco.rpc<Preparo>("portal_financeiro_pasta_preparar", { ...quem, p_exportacao: exportacao });
  if (p.pasta) return p.pasta;
  if (p.formato !== "XLSX" || !p.anexos.length) return null;
  const nomes = nomesNaPasta(p.anexos);
  const comNome = p.anexos.map((a, i) => ({ ...a, naPasta: nomes[i]! }));
  const grupos = dividirPasta(comNome);
  const partes: PartePasta[] = [];
  for (const grupo of grupos) {
    const entradas: { nome: string; dados: Uint8Array }[] = [];
    for (const a of grupo) {
      const dados = await deps.arquivos.baixar(`${quem.p_escritorio}/${a.id}`);
      // Um arquivo que sumiu do Storage não impede a pasta; o resto vai.
      if (dados) entradas.push({ nome: a.naPasta, dados });
    }
    if (!entradas.length) continue;
    const zip = await escreverZip(entradas, { guardar: true });
    const caminho = `${quem.p_escritorio}/exportacoes/${p.exportacaoId}-${partes.length + 1}.zip`;
    await deps.arquivos.enviar(caminho, zip, "application/zip", true);
    partes.push({ caminho, nome: "", tamanho: zip.length, arquivos: entradas.length });
  }
  if (!partes.length) return null;
  for (const [i, x] of partes.entries()) x.nome = nomeDaPasta(p.mes, i + 1, partes.length);
  return await deps.banco.rpc<PastaContador>("portal_financeiro_pasta_registrar", { ...quem, p_exportacao: p.exportacaoId, p_partes: partes });
}

/** Os links de cada parte, com o nome para baixar. */
export async function linksDaPasta(deps: DepsPortal, pasta: PastaContador, segundos: number) {
  return await Promise.all(pasta.partes.map(async (x) => ({
    nome: x.nome, tamanho: x.tamanho, arquivos: x.arquivos, url: await deps.arquivos.enderecoDeLeitura(x.caminho, segundos, x.nome),
  })));
}

export function rotasPastaContador(app: Hono<VarsPortal>, deps: DepsPortal) {
  const quem = (c: Context<VarsPortal>) => ({ p_pessoa: c.get("sessao").pessoaId, p_escritorio: c.get("escritorioId") });

  // Baixar os comprovantes da exportação (F3.22b): monta a pasta, se ainda não existe, e devolve
  // um link de 60 segundos para cada parte.
  app.post("/v1/escritorio/financeiro/exportacoes/:id/pasta", async (c) => {
    const id = c.req.param("id");
    if (!id || !UUID.test(id)) throw new ErroDominio("NOT_FOUND");
    const pasta = await garantirPasta(deps, quem(c), id.toLowerCase());
    const r: PastaParaBaixar = {
      pasta: pasta ? { arquivos: pasta.arquivos, tamanho: pasta.tamanho, partes: await linksDaPasta(deps, pasta, VALIDADE_LEITURA_S) } : null,
    };
    return c.json(r);
  });
}
