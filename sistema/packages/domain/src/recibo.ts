// O texto do recibo em PDF (FI-14, F3.19), desenho aprovado em
// docs/design/aprovadas/portal-recibo-recorrente (recibo-a4.html; decisões 1.1 a 1.10).
// O recibo é do escritório; o CPF ou CNPJ do cliente vai completo (pergunta 2).

import { FORMAS_PAGAMENTO, type ReciboParaImprimir } from "./financeiro.ts";
import { reais } from "./honorarios.ts";
import { dataPorExtenso, valorPorExtenso } from "./peticoes.ts";

/** "318.482.617-13" ou "11.222.333/0001-81"; outro texto volta como veio. */
export function documentoFormatado(doc: string | null | undefined): string | null {
  if (!doc) return null;
  const d = doc.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return doc;
}

/** "CPF 318.482.617-13", "CNPJ ..." ou nada. */
export function documentoComNome(doc: string | null | undefined): string | null {
  const f = documentoFormatado(doc);
  if (!f) return null;
  return `${doc!.replace(/\D/g, "").length === 14 ? "CNPJ" : "CPF"} ${f}`;
}

/** "2026-0187" */
export function numeroDoRecibo(r: Pick<ReciboParaImprimir, "numero">): string {
  return `${r.numero.ano}-${String(r.numero.numero).padStart(4, "0")}`;
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "outubro de 2026" */
export function mesDeReferencia(vencimento: string): string {
  return `${MESES[Number(vencimento.slice(5, 7)) - 1]} de ${vencimento.slice(0, 4)}`;
}

const br = (d: string) => d.split("-").reverse().join("/");

/** "parcela 3 de 6", ou a descrição quando a conta não está numerada. */
export function parcelaDoRecibo(r: Pick<ReciboParaImprimir, "parcela">): string {
  return r.parcela.ordem && r.parcela.total && r.parcela.total > 1 ? `parcela ${r.parcela.ordem} de ${r.parcela.total}` : r.parcela.descricao.toLowerCase();
}

/** O total do recibo: o valor da parcela mais multa e juros, quando houver. */
export function totalDoRecibo(r: Pick<ReciboParaImprimir, "valor" | "multaJuros">): number {
  return r.valor + (r.multaJuros ?? 0);
}

export interface PedacoRecibo { texto: string; forte?: boolean; extenso?: boolean }

/** O texto corrido do recibo, em pedaços (os nomes e números vão em negrito). */
export function textoDoRecibo(r: ReciboParaImprimir): PedacoRecibo[] {
  const total = totalDoRecibo(r);
  const doc = (d: string | null) => (documentoComNome(d) ? `, ${documentoComNome(d)}` : "");
  const out: PedacoRecibo[] = [{ texto: "Recebemos de " }];
  if (r.pagador) {
    out.push({ texto: r.pagador.nome, forte: true }, { texto: `${doc(r.pagador.documento)}, em favor de ` });
  }
  out.push({ texto: r.cliente.nome, forte: true }, { texto: `${doc(r.cliente.documento)}, a quantia de ` },
    { texto: reais(total), forte: true }, { texto: " (" }, { texto: valorPorExtenso(total), extenso: true }, { texto: "), referente à " },
    { texto: `${parcelaDoRecibo(r)}`, forte: true }, { texto: " dos honorários advocatícios do contrato " },
    { texto: r.contrato.numero, forte: true }, { texto: ` (${r.contrato.objeto.toLowerCase()}), mês de referência ` },
    { texto: mesDeReferencia(r.parcela.vencimento), forte: true },
    { texto: `${r.multaJuros ? ", já com multa e juros pelo atraso" : ""}, paga por ` },
    { texto: FORMAS_PAGAMENTO[r.forma] ?? r.forma, forte: true }, { texto: " em " }, { texto: br(r.pagoEm), forte: true },
    { texto: ". Por ser verdade, damos quitação do valor acima." });
  return out;
}

/** "São Paulo, 18 de novembro de 2026." */
export function localEData(r: ReciboParaImprimir): string {
  return `${r.escritorio.cidade?.trim() ? `${r.escritorio.cidade.trim()}, ` : ""}${dataPorExtenso(r.pagoEm)}.`;
}

/** O título da página, que vira o nome do arquivo ao salvar o PDF (decisão 1.8). */
export function tituloDoRecibo(r: ReciboParaImprimir): string {
  return `Recibo ${numeroDoRecibo(r)} · ${r.cliente.nome} · ${r.escritorio.nome}`;
}
