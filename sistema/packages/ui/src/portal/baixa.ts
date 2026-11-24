// "Dar baixa sem receber" (F3.139; FI-24, FI-25, FI-08). Os textos da janela, do aviso e da linha,
// do desenho aprovado em docs/design/aprovadas/portal-baixa-parcela-motivo. No T3jus "baixa"
// sozinha quer dizer recebido (FI-02): todo botão e todo aviso diz "sem receber".

import {
  MOTIVOS_BAIXA, reais,
  type BaixaDesfeita, type BaixaFeita, type BaixaSemReceber, type CasoDaBaixa, type CustasDaParcela, type MotivoBaixa, type PessoaRef,
} from "@t3jus/domain";
import { diaCurto } from "./agenda.ts";
import { primeiroNome } from "./equipe.ts";
import { parcelaCurta } from "./fechamento.ts";
import { mesReferencia } from "./financeiro.ts";

const FUSO = { timeZone: "America/Sao_Paulo" } as const;
const diaDoInstante = (em: string) => new Intl.DateTimeFormat("en-CA", { ...FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
const horaDoInstante = (em: string) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("pt-BR", { ...FUSO, hour: "numeric", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(em)).map((x) => [x.type, x.value]));
  return `${Number(p.hour)}h${p.minute}`;
};
const minusc = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** "Parcela 6 de 6" vira "parcela 6/6"; "Fixo" vira "parcela". */
export function nomeDaParcela(descricao: string): string {
  const c = parcelaCurta(descricao);
  return /\d+\/\d+/.test(c) ? minusc(c) : `parcela ${minusc(c)}`;
}

/** A ajuda de cada motivo (decisão 7). */
export const AJUDA_MOTIVO: Record<MotivoBaixa, string> = {
  PERDOADA: "O escritório decidiu abrir mão deste valor.",
  INADIMPLENCIA: "O cliente não pagou, e o escritório parou de cobrar pelo T3jus.",
  RENEGOCIADA: "O valor vai entrar em outra combinação com o cliente.",
};

/** O rótulo da explicação muda com o motivo (decisão 8). */
export function rotuloExplicacao(m: MotivoBaixa | null): string {
  if (m === "PERDOADA") return "Por que e quem decidiu";
  if (m === "INADIMPLENCIA") return "O que aconteceu";
  if (m === "RENEGOCIADA") return "O que foi combinado";
  return "Explicação";
}

/** Decisão 7: no contrato encerrado, a renegociada não aparece; no lugar, esta linha. */
export const SEM_RENEGOCIAR =
  "Com o contrato encerrado, não há nova cobrança pelo T3jus. Se o cliente ainda vai pagar, deixe a parcela em atraso e registre quando entrar.";

/** Os erros da janela antes de enviar (decisão 13): o botão nunca fica desabilitado. */
export function errosDaBaixa(motivo: MotivoBaixa | null, explicacao: string): { motivo?: string; explicacao?: string } {
  return {
    ...(motivo ? {} : { motivo: "Escolha o motivo." }),
    ...(explicacao.trim().length >= 3 ? {} : { explicacao: "Escreva a explicação, com pelo menos 3 letras." }),
  };
}

/** O resumo de erros no topo: "Faltam 2 coisas para dar baixa sem receber." */
export function tituloErrosBaixa(n: number): string {
  return n === 1 ? "Falta 1 coisa para dar baixa sem receber." : `Faltam ${n} coisas para dar baixa sem receber.`;
}

/** Para onde vão as custas ligadas à parcela (nota 5), sem a baixa delas junto. */
export function textoCustas(c: Pick<CustasDaParcela, "valor" | "depois">, cliente: string, hoje: string): string {
  if (c.depois) return `As custas de ${reais(c.valor)} passam a ir junto com a ${nomeDaParcela(c.depois.descricao)}, de ${mesReferencia(c.depois.vencimento, hoje)}.`;
  return `As custas de ${reais(c.valor)} ficam a reembolsar, em A pagar: não há outra parcela de ${primeiroNome(cliente)} para elas irem junto.`;
}

/** "Venceu 10/11/2026, há 8 dias". */
export function textoDiasAtraso(d: number): string {
  return d === 1 ? "há 1 dia" : `há ${d} dias`;
}

/** A nota da linha baixada, na ficha: "Inadimplência · por Marina Ribeiro em 18/11". */
export function notaDaBaixa(b: Pick<BaixaSemReceber, "motivo" | "por" | "em" | "recebidoAntes" | "valor">): string {
  const base = `${MOTIVOS_BAIXA[b.motivo]} · por ${b.por.nome} em ${diaCurto(diaDoInstante(b.em))}`;
  return b.recebidoAntes > 0 ? `Recebido ${reais(b.recebidoAntes)} · baixa sem receber de ${reais(b.valor)}. ${base}` : base;
}

/** O que a recusa de conflito diz (decisão 14): outra pessoa registrou ou já deu baixa. */
export type ConflitoBaixa = { titulo: string; quem: string; como: string | null; faltava: number | null };
export function conflitoDaBaixa(d: Record<string, unknown> | undefined, hojeDia: string): ConflitoBaixa | null {
  if (!d) return null;
  const por = (d.por as PessoaRef | null)?.nome ?? "Alguém da equipe";
  const em = typeof d.em === "string" ? d.em : null;
  const quando = em ? `${diaDoInstante(em) === hojeDia ? "hoje" : diaCurto(diaDoInstante(em))} às ${horaDoInstante(em)}` : "";
  const quem = `${por}${quando ? `, ${quando}` : ""}`;
  if (d.motivo === "PARCELA_MUDOU") {
    const falta = Number(d.falta ?? 0);
    return {
      titulo: `${por} registrou ${reais(Number(d.valor ?? 0))} nesta parcela${em ? ` às ${horaDoInstante(em)}` : ""}.`,
      quem, faltava: d.faltaAntes === undefined || d.faltaAntes === null ? null : Number(d.faltaAntes),
      como: falta > 0 ? `Faltam ${reais(falta)}, ainda em atraso` : "Paga",
    };
  }
  if (d.motivo === "PARCELA_JA_BAIXADA") {
    return { titulo: `${por} já deu baixa nesta parcela${em ? ` às ${horaDoInstante(em)}` : ""}.`, quem, faltava: null, como: "Baixa sem receber" };
  }
  return null;
}

/** O caso que ficou pronto com a baixa (decisão 15). */
export function casoPronto(casos: CasoDaBaixa[] | undefined): CasoDaBaixa | null {
  return casos?.find((c) => c.pronto && !c.fechado) ?? null;
}

/** O aviso depois de dar baixa (decisão 15). */
export function avisoBaixaFeita(r: Pick<BaixaFeita, "descricao" | "casos" | "reembolsosBaixados" | "baixa">, cliente: string, custasFicam: number): { titulo: string; texto: string } {
  const caso = casoPronto(r.casos);
  const partes: string[] = [];
  if (caso) partes.push(`O caso ${caso.nome} já pode ser encerrado no financeiro.`);
  if (r.reembolsosBaixados) partes.push(`O reembolso das custas, ${reais(r.baixa?.reembolsos.reduce((t, x) => t + x.valor, 0) ?? 0)}, teve baixa junto.`);
  else if (custasFicam) partes.push(`As custas de ${reais(custasFicam)} ficaram a reembolsar, em A pagar.`);
  partes.push("Dá para desfazer na linha da parcela.");
  return { titulo: `A ${nomeDaParcela(r.descricao)} de ${primeiroNome(cliente)} saiu de Em atraso sem receber.`, texto: partes.join(" ") };
}

/** Com quem fica a próxima ação do desfazer (decisão 17, pergunta 6). `eu` é o nome de quem vê
 *  (GET /v1/escritorio). */
export function comQuemFica(com: PessoaRef, eu: string, responsavel: PessoaRef | null): string {
  if (com.nome === eu) return "com você";
  return responsavel && responsavel.id === com.id ? `com ${com.nome}, que cuida do contrato` : `com ${com.nome}`;
}

/** O aviso depois de desfazer (decisão 17). */
export function avisoDesfeita(r: Pick<BaixaDesfeita, "descricao" | "proximaAcao">, eu: string): { titulo: string; texto: string } {
  const com = r.proximaAcao.com.nome === eu ? "com você" : `com ${r.proximaAcao.com.nome}`;
  return {
    titulo: `A ${nomeDaParcela(r.descricao)} voltou para Em atraso.`,
    texto: `A próxima ação é falar com ${primeiroNome(r.proximaAcao.cliente)} amanhã, ${com}.`,
  };
}
