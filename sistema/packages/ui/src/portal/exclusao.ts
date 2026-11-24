// F3.155: a linha nova de "O que é apagado" na janela de exclusão a pedido do titular, pelo desenho
// aprovado em docs/design/aprovadas/portal-exclusao-arquivos (_fonte/f155.py, linha_arquivos).
import type { ArquivosParaApagar } from "@t3jus/domain";

export const EXPLICACAO_UM = "o arquivo é apagado do T3jus. Fica só que existiu: tipo, tamanho e datas, sem o nome do arquivo.";
export const EXPLICACAO_VARIOS = "os arquivos são apagados do T3jus. Fica só que existiram: tipo, tamanho e datas, sem o nome dos arquivos.";

const junta = (p: string[]) => (p.length === 1 ? p[0]! : `${p.slice(0, -1).join(", ")} e ${p[p.length - 1]}`);

/** A linha e a explicação; null sem arquivo ou sem o campo (quem não é a dona). */
export function linhaArquivosParaApagar(a: ArquivosParaApagar | null | undefined): { texto: string; explicacao: string } | null {
  if (!a) return null;
  const docs = Math.max(0, Math.trunc(a.documentos || 0));
  const props = Math.max(0, Math.trunc(a.propostas || 0));
  const partes: string[] = [];
  if (docs) partes.push(docs === 1 ? "o documento pessoal" : `os ${docs} documentos pessoais`);
  // Os dois termos podem coexistir (o de tutela guardado depois da passagem à curatela, ou o contrário).
  if (a.curatela && a.tutela) partes.push("os termos de curatela e de tutela");
  else if (a.curatela) partes.push("o termo de curatela");
  else if (a.tutela) partes.push("o termo de tutela");
  if (props) partes.push(props === 1 ? "o arquivo Word da proposta" : `os arquivos Word das ${props} propostas`);
  if (!partes.length) return null;
  const t = junta(partes);
  const total = docs + (a.curatela ? 1 : 0) + (a.tutela ? 1 : 0) + props;
  return { texto: t[0]!.toUpperCase() + t.slice(1), explicacao: total === 1 ? EXPLICACAO_UM : EXPLICACAO_VARIOS };
}
