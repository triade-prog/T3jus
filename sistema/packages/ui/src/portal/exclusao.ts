// F3.155: a linha nova de "O que é apagado" na janela de exclusão a pedido do titular, pelo desenho
// aprovado em docs/design/aprovadas/portal-exclusao-arquivos (_fonte/f155.py, linha_arquivos).
// F3.156: a despesa adiantada ao cliente, pelo desenho aprovado em
// docs/design/aprovadas/portal-exclusao-despesas (alternativa A; _fonte/f156.py).
import type { ArquivosParaApagar, ArquivosQueFicam } from "@t3jus/domain";

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

// ---------------------------------------------------------------------------------------
// F3.156: a despesa adiantada ao cliente e os arquivos dela, que ficam guardados pela lei fiscal.

export type Linha = { texto: string; explicacao: string };
export interface DespesasDoExcluido {
  /** A linha nova de "O que é apagado" (a descrição); null sem despesa. */
  descricao: Linha | null;
  /** O quadro "O que a lei obriga a guardar"; null sem arquivo. */
  guarda: { arquivos: Linha; pasta: Linha | null } | null;
  /** A frase em negrito da faixa do escudo; null mantém "Nada aqui precisa ser guardado por lei.". */
  faixa: string | null;
}

export const PE_GUARDA = "Ficam pela obrigação fiscal do escritório, que vale mesmo com o pedido do titular (LGPD, art. 16, I).";
export const SEM_DATA = "Enquanto houver despesa em aberto, não há data: o T3jus apaga sozinho em 1º de janeiro do 7º ano depois do pagamento.";

const inteiro = (n: number | undefined) => Math.max(0, Math.trunc(n || 0));
const dma = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

/** As peças da janela; tudo null sem o campo (quem não é a dona) ou sem despesa. */
export function despesasDoExcluido(q: ArquivosQueFicam | null | undefined): DespesasDoExcluido {
  const nada = { descricao: null, guarda: null, faixa: null };
  if (!q) return nada;
  const n = inteiro(q.despesas);
  if (!n) return nada;
  const descricao: Linha = n === 1
    ? { texto: "A descrição da despesa adiantada", explicacao: "vira “Despesa adiantada a cliente excluído”. O valor, as datas e o reembolso continuam no Financeiro." }
    : { texto: `A descrição das ${n} despesas adiantadas`, explicacao: "viram “Despesa adiantada a cliente excluído”. O valor, as datas e o reembolso continuam no Financeiro." };
  const a = inteiro(q.arquivos);
  if (!a) return { descricao, guarda: null, faixa: null };
  const c = inteiro(q.comArquivo);
  const p = inteiro(q.pastas);
  const fim = q.ate ? `O T3jus apaga sozinho em ${dma(q.ate)}.` : SEM_DATA;
  const arquivos: Linha = a === 1
    ? { texto: "O arquivo da despesa adiantada", explicacao: `a nota, guia, boleto ou comprovante, com o nome trocado pelo tipo, como “Nota fiscal.pdf”. ${fim}` }
    : { texto: c > 1 ? `Os ${a} arquivos das ${c} despesas adiantadas` : `Os ${a} arquivos da despesa adiantada`,
        explicacao: `notas, guias, boletos ou comprovantes, com o nome trocado pelo tipo, como “Nota fiscal.pdf”. ${fim}` };
  const pasta: Linha | null = !p ? null : p === 1
    ? { texto: "A pasta mandada ao contador",
        explicacao: "fica como foi montada, com a descrição antiga no nome dos arquivos. A cópia do T3jus sai pela regra do mês da pasta; a que o contador recebeu fica fora do T3jus." }
    : { texto: `As ${p} pastas mandadas ao contador`,
        explicacao: "ficam como foram montadas, com a descrição antiga no nome dos arquivos. As cópias do T3jus saem pela regra do mês de cada pasta; as que o contador recebeu ficam fora do T3jus." };
  const faixa = a > 1 || p ? "Fora esses arquivos, nada aqui precisa ser guardado por lei." : "Fora esse arquivo, nada aqui precisa ser guardado por lei.";
  return { descricao, guarda: { arquivos, pasta }, faixa };
}
