// Fim do contrato do escritório e saída da pessoa (F0.14, PT-11). Os prazos estão no banco
// (0200_fim_contrato.sql, em configuracoes); aqui ficam os tipos do que o servidor manda e os
// esquemas do que a tela envia. Decisões da Carol de 19/11/2026: 30 dias só de consulta,
// guarda de 5 anos, reabrir com motivo, só a Administração, entrada apagada aos 90 dias.

import { z } from "zod";

/** Contato do T3jus para o escritório pedir a cópia dos dados. Provisório: a Carol ainda vai
 * mandar o endereço real (19/11/2026). */
export const CONTATO_T3JUS = "atendimento@exemplo.com.br";

/** ABERTO não aparece: sem fim registrado, o servidor manda null. */
export const SITUACOES_CONTRATO = {
  MARCADO: "Encerramento marcado",
  CONSULTA: "Só consulta",
  FECHADO: "Acesso fechado",
} as const;
export type SituacaoContrato = keyof typeof SITUACOES_CONTRATO;

/** As datas que as telas mostram, calculadas pelo banco a partir da data do fim. */
export interface DatasContrato {
  fimEm: string;
  situacao: SituacaoContrato;
  /** Último dia só de consulta (fim + 29). */
  consultaAte: string;
  /** Dia em que o acesso fecha (fim + 30). */
  acessoFechaEm: string;
  acessoFechadoEm: string | null;
  /** Quando a entrada de quem só tinha este escritório some (acesso fechado + 90). */
  entradasAte: string;
  /** Fim da guarda de 5 anos: até aqui dá para reabrir. */
  guardaAte: string;
  exportadoEm?: string | null;
}

/** O encerramento como o Console vê: com o motivo e quem registrou. */
export interface EncerramentoConsole extends DatasContrato {
  motivo: string;
  registradoEm: string;
  estagioAntes: "IMPLANTACAO" | "ATIVO";
  por: { id: string; nome: string | null };
}

/** Saída da pessoa: desde quando ela está sem acesso e quando a entrada some (ou sumiu). */
export interface SaidaPessoa {
  semAcessoDesde?: string;
  entradaApagaEm?: string;
  entradaApagadaEm?: string;
}

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const motivo = z.string().trim().min(1).max(300);

export const encerrarContratoSchema = z.object({
  versao: z.number().int().min(1),
  fimEm: dataIso,
  motivo,
  nomeConfirmado: z.string().trim().min(1).max(160),
});
export const reabrirContratoSchema = z.object({ versao: z.number().int().min(1), motivo });

/** "dd/mm/aaaa" vira "aaaa-mm-dd"; null se a data não existe. */
export function dataDigitada(texto: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const [, d, mes, a] = m;
  const dt = new Date(Date.UTC(Number(a), Number(mes) - 1, Number(d)));
  if (dt.getUTCFullYear() !== Number(a) || dt.getUTCMonth() !== Number(mes) - 1 || dt.getUTCDate() !== Number(d)) return null;
  return `${a}-${mes}-${d}`;
}

/** Soma dias a uma data "aaaa-mm-dd" (sem fuso). */
export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** Soma meses a uma data "aaaa-mm-dd"; no mês mais curto, fica no último dia. */
export function somarMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  const ultimo = new Date(Date.UTC(a, m - 1 + meses + 1, 0)).getUTCDate();
  return new Date(Date.UTC(a, m - 1 + meses, Math.min(d, ultimo))).toISOString().slice(0, 10);
}

/** As datas do quadro da janela de encerrar, iguais às do banco (30 dias, 90 dias, 5 anos). */
export function datasDoFim(fimEm: string, prazos = { consulta: 30, entrada: 90, guardaAnos: 5 }) {
  const fecha = somarDias(fimEm, prazos.consulta);
  const [a, m, d] = fimEm.split("-");
  return {
    fimEm,
    consultaAte: somarDias(fimEm, prazos.consulta - 1),
    acessoFechaEm: fecha,
    entradasAte: somarDias(fecha, prazos.entrada),
    // A última entrada é no último dia de consulta; o registro dela sai 6 meses depois.
    registrosAte: somarMeses(somarDias(fimEm, prazos.consulta - 1), 6),
    guardaAte: `${Number(a) + prazos.guardaAnos}-${m}-${d}`,
  };
}
