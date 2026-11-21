// A pasta (.zip) com os comprovantes do mês para o contador (F3.89, F3.22b; FI-18, FI-21). Desenho
// aprovado em docs/design/aprovadas/portal-comercial-financeiro-pendencias (ct-exportar, decisão 9
// da Carol): a planilha vai anexada no e-mail e o .zip vai por um link que vale 30 dias. A API
// monta o .zip no servidor (0621_pasta_contador.sql); aqui ficam as regras puras: o nome de cada
// arquivo (a data e o lançamento), a divisão em partes e o nome de cada parte.

import { CATEGORIAS_ANEXO, type CategoriaAnexo } from "./anexos.ts";
import type { PessoaRef } from "./clientes.ts";

/** O bucket aceita até 12 MB por arquivo; cada parte fica em até 11 MB, com folga para o índice do .zip. */
export const PARTE_MAXIMA_PASTA = 11 * 1024 * 1024;
/** O link do .zip no e-mail vale 30 dias (decisão 9 da Carol). */
export const VALIDADE_LINK_PASTA_S = 30 * 24 * 60 * 60;

export interface AnexoDaPasta {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  categoria: CategoriaAnexo;
  /** O dia do lançamento: a conta paga ou o recebimento. */
  dia: string;
  lancamento: string;
}

export interface PartePasta {
  caminho: string;
  nome: string;
  tamanho: number;
  arquivos: number;
}

export interface PastaContador {
  id: string;
  partes: PartePasta[];
  arquivos: number;
  tamanho: number;
  em: string;
  por: PessoaRef | null;
}

const EXTENSOES: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };

function limpar(t: string, max: number): string {
  // eslint-disable-next-line no-control-regex
  const s = t.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max).trim() : s;
}

/**
 * O nome de cada arquivo dentro do .zip: "2026-10-05 - Aluguel da sala - Nota fiscal.pdf". A data
 * vem primeiro para o contador achar pela ordem. Nomes repetidos ganham "(2)", "(3)".
 */
export function nomesNaPasta(anexos: readonly AnexoDaPasta[]): string[] {
  const usados = new Map<string, number>();
  return anexos.map((a) => {
    const ext = EXTENSOES[a.tipo] ?? (a.nome.includes(".") ? limpar(a.nome.split(".").pop()!, 5).toLowerCase() : "pdf");
    const base = `${a.dia} - ${limpar(a.lancamento, 90) || "Lançamento"} - ${CATEGORIAS_ANEXO[a.categoria] ?? "Comprovante"}`;
    const n = (usados.get(base) ?? 0) + 1;
    usados.set(base, n);
    return `${base}${n > 1 ? ` (${n})` : ""}.${ext}`;
  });
}

/** Divide os anexos em partes de até `maximo` bytes, na ordem dada. Um arquivo nunca se divide. */
export function dividirPasta<T extends { tamanho: number }>(anexos: readonly T[], maximo = PARTE_MAXIMA_PASTA): T[][] {
  const partes: T[][] = [];
  let atual: T[] = [];
  let soma = 0;
  for (const a of anexos) {
    // Cada entrada custa o arquivo e uns 200 bytes de cabeçalho e índice.
    const custo = a.tamanho + 200;
    if (atual.length && soma + custo > maximo) {
      partes.push(atual);
      atual = [];
      soma = 0;
    }
    atual.push(a);
    soma += custo;
  }
  if (atual.length) partes.push(atual);
  return partes;
}

const MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "comprovantes-outubro-2026.zip" ou, em partes, "comprovantes-outubro-2026-parte-2-de-3.zip". */
export function nomeDaPasta(mes: string, parte: number, total: number): string {
  const base = `comprovantes-${MESES[Number(mes.slice(5, 7)) - 1]}-${mes.slice(0, 4)}`;
  return total > 1 ? `${base}-parte-${parte}-de-${total}.zip` : `${base}.zip`;
}
