// "Dar baixa sem receber" (F3.139; FI-24, FI-25, FI-08). Os textos da janela, do aviso e da linha,
// do desenho aprovado em docs/design/aprovadas/portal-baixa-parcela-motivo. No T3jus "baixa"
// sozinha quer dizer recebido (FI-02): todo botão e todo aviso diz "sem receber".

import {
  dataBr, MOTIVOS_BAIXA, reais,
  type BaixaDesfeita, type BaixaFeita, type BaixaSemReceber, type CasoDaBaixa, type CustasDaParcela, type ExitoBaixado, type MotivoBaixa, type PessoaRef,
} from "@t3jus/domain";
import { diaCurto } from "./agenda.ts";
import { primeiroNome } from "./equipe.ts";
import { nomeDaParcela } from "./fechamento.ts";
import { mesReferencia } from "./financeiro.ts";

const FUSO = { timeZone: "America/Sao_Paulo" } as const;
const diaDoInstante = (em: string) => new Intl.DateTimeFormat("en-CA", { ...FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
const horaDoInstante = (em: string) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("pt-BR", { ...FUSO, hour: "numeric", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(em)).map((x) => [x.type, x.value]));
  return `${Number(p.hour)}h${p.minute}`;
};

export { nomeDaParcela } from "./fechamento.ts";

/** Sugestão 14 da revisão: com avisos_desde = agora, a régua de atraso não recomeça nesta parcela. */
export const REGUA_DEPOIS_DE_DESFAZER =
  "A régua não manda de uma vez o que venceu durante a baixa: nenhum aviso automático sai desta parcela, e a cobrança fica com a pessoa.";

/** Sugestão 12 da revisão (decisão 18): a baixa das custas que foi junto também se desfaz. */
export function textoCustasBaixadasVoltam(reembolsos: { valor: number }[]): string {
  const v = reais(reembolsos.reduce((t, x) => t + x.valor, 0));
  return reembolsos.length === 1
    ? `O reembolso das custas, ${v}, que teve baixa junto, também volta para A pagar, a reembolsar.`
    : `Os reembolsos das custas, ${v}, que tiveram baixa junto, também voltam para A pagar, a reembolsar.`;
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

/** Revisão, nota 6: a frase "Gera:" da condição em Contratos, com quantas tiveram baixa sem receber. */
export function geraComBaixas(n: number, baixadas: number): string {
  const programados = n === 1 ? "1 recebimento programado" : `${n} recebimentos programados`;
  return `${programados}${baixadas ? ` · ${baixadas} com baixa sem receber` : ""}.`;
}

/** Revisão, nota 6: o âmbar de Contratos, para quem tem o Financeiro: "Parcela 6 de 6: baixa sem receber em 18/11". */
export function ambarBaixaNoContrato(r: { descricao: string; baixa: { em: string } }): string {
  return `${r.descricao}: baixa sem receber em ${diaCurto(diaDoInstante(r.baixa.em))}`;
}

/** Revisão, nota 8: as linhas do histórico de cobrança que a baixa e o desfazer escrevem (bx-feita, bx-desfeita). */
export type LinhaDaBaixa = { em: string; quem: string; oque: string; texto: string };
type ComBaixa = { baixa?: Pick<BaixaSemReceber, "motivo" | "por" | "em"> | null;
  baixaDesfeita?: { por: PessoaRef; em: string; explicacao: string; baixa?: { motivo: MotivoBaixa; por: PessoaRef; em: string } | null } | null };
export function linhasDaBaixa(p: ComBaixa): LinhaDaBaixa[] {
  const deu = (b: { motivo: MotivoBaixa; por: PessoaRef; em: string }, depois: string): LinhaDaBaixa =>
    ({ em: b.em, quem: b.por.nome, oque: `deu baixa sem receber, às ${horaDoInstante(b.em)}`, texto: `${MOTIVOS_BAIXA[b.motivo]}. ${depois}` });
  if (p.baixa) return [deu(p.baixa, "A régua desta parcela parou, sem mandar mais nada.")];
  const d = p.baixaDesfeita;
  if (!d) return [];
  const desfez: LinhaDaBaixa = { em: d.em, quem: d.por.nome, oque: `desfez a baixa sem receber, às ${horaDoInstante(d.em)}`,
    texto: `“${d.explicacao}” A régua não manda de uma vez os passos que venceram durante a baixa.` };
  return d.baixa ? [desfez, deu(d.baixa, "A cobrança parou.")] : [desfez];
}
/** A anotação que o desfazer grava ("Baixa sem receber desfeita: …") vira a linha acima, não uma anotação comum. */
export const ehAnotacaoDoDesfazer = (e: { tipo: string; texto: string | null; autor: PessoaRef }, d: { por: PessoaRef } | null | undefined) =>
  !!d && e.tipo === "ANOTACAO" && e.autor.id === d.por.id && !!e.texto?.startsWith("Baixa sem receber desfeita: ");
/** "responsável: Marina Ribeiro, que desfez a baixa (Felipe, que cuida do contrato, não tem Financeiro)". */
export function responsavelDepoisDoDesfazer(prox: PessoaRef, d: { por: PessoaRef } | null | undefined, responsavel: PessoaRef): string {
  if (!d || prox.id !== d.por.id) return `responsável: ${prox.nome}`;
  return `responsável: ${prox.nome}, que desfez a baixa${responsavel.id !== prox.id ? ` (${primeiroNome(responsavel.nome)}, que cuida do contrato, não tem Financeiro)` : ""}`;
}

/** FI-25: a nota do reembolso que teve baixa junto: "Inadimplência, por Marina Ribeiro em 18/11, junto com a parcela 6/6". */
export function notaReembolsoBaixado(b: { motivo: MotivoBaixa; por: PessoaRef; em: string; parcela: string | null }): string {
  return `${MOTIVOS_BAIXA[b.motivo]}, por ${b.por.nome} em ${diaCurto(diaDoInstante(b.em))}${b.parcela ? `, junto com a ${nomeDaParcela(b.parcela)}` : ""}`;
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

// ------------------------------------------------------------------ O êxito baixado na divisão do alvará (F3.174)
// Desenho aprovado em docs/design/aprovadas/portal-exito-baixado-alvara (estados eb-). Os textos
// novos dizem "paga a parcela do êxito", nunca "dá baixa" (nota 15 da revisão do plano).

/** O que entrou, como a frase diz: "alvará", "RPV", "precatório", "depósito de acordo". */
export function nomeDoLevantamento(tipo: string | null | undefined): string {
  if (tipo === "RPV") return "RPV";
  if (tipo === "PRECATORIO") return "precatório";
  if (tipo === "ACORDO") return "depósito de acordo";
  return "alvará";
}

/** O aviso abaixo da divisão (eb-proposta), com as variações das notas do desenho. */
export function textoExitoBaixado(e: Pick<ExitoBaixado, "descricao" | "valor" | "baixa">, cliente: string, tipo?: string | null): {
  titulo: string; detalhe: string; parcial: string | null; custas: string | null; explicacao: string; texto: string; renegociada: string | null;
} {
  const pn = primeiroNome(cliente);
  const b = e.baixa;
  const custas = b.reembolsos.reduce((t, x) => t + x.valor, 0);
  const deste = nomeDoLevantamento(tipo);
  const reneg = b.motivo === "RENEGOCIADA";
  return {
    titulo: `O êxito de ${pn} está com baixa sem receber.`,
    detalhe: `${e.descricao} · ${reais(e.valor)} · ${MOTIVOS_BAIXA[b.motivo].toLowerCase()}, por ${b.por.nome} em ${dataBr(diaDoInstante(b.em))}.`,
    parcial: b.recebidoAntes > 0
      ? `Recebido ${reais(b.recebidoAntes)} de ${reais(e.valor)}. A baixa sem receber foi dos ${reais(b.valor)} que faltavam.` : null,
    custas: custas > 0 ? `As custas de ${reais(custas)} tiveram baixa junto. Ao desfazer, elas entram na divisão como reembolso.` : null,
    explicacao: b.explicacao,
    texto: reneg
      ? `Os honorários deste ${deste} pagam esse êxito: desfaça a baixa antes de dividir.`
      : `Se os honorários deste ${deste} pagam esse êxito, desfaça a baixa antes de dividir. Se o escritório decidiu não cobrar, mantenha a baixa e tire os honorários: o valor fica com ${pn}.`,
    renegociada: reneg
      ? "Se o combinado já virou parcelas novas em Contratos, tire essas parcelas mudando as condições do contrato, ou o valor vai ser cobrado duas vezes." : null,
  };
}

export type EscolhaExito = "DESFAZER" | "MANTER";

/** Os erros do grupo e do "Por que desfazer" antes de enviar (eb-erro). */
export function errosDoExito(escolha: EscolhaExito | null, explicacao: string, cliente: string, soDesfazer: boolean): { exito?: string; porque?: string } {
  const pn = primeiroNome(cliente);
  if (!escolha) {
    return { exito: soDesfazer
      ? `Escolha o que fazer com o êxito de ${pn}: desfazer a baixa sem receber.`
      : `Escolha o que fazer com o êxito de ${pn}: desfazer a baixa sem receber ou tirar os honorários.` };
  }
  if (escolha === "DESFAZER" && explicacao.trim().length < 3) return { porque: "Escreva por que desfazer, com pelo menos 3 letras." };
  return {};
}

/** "Falta acertar 1 coisa." (eb-erro). */
export function tituloErrosExito(n: number): string {
  return n === 1 ? "Falta acertar 1 coisa." : `Falta acertar ${n} coisas.`;
}

/** O "Por que desfazer" já preenchido: "O alvará de R$ 16.000,00 entrou em 18/11 e paga o êxito." */
export function porQueDesfazer(tipo: string | null | undefined, valor: number | null, entrouEm: string | null): string {
  const oque = nomeDoLevantamento(tipo);
  return `O ${oque}${valor ? ` de ${reais(valor)}` : ""}${entrouEm ? ` entrou em ${diaCurto(entrouEm)}` : " entrou"} e paga o êxito.`;
}

/** O conflito EXITO_MUDOU (eb-conflito): quem desfez ou deu a baixa, e quando. */
export function conflitoDoExito(d: Record<string, unknown> | undefined, hojeDia: string, cliente: string): { titulo: string; texto: string } | null {
  if (!d || d.motivo !== "EXITO_MUDOU") return null;
  const por = (d.por as PessoaRef | null)?.nome ?? "Alguém da equipe";
  const em = typeof d.em === "string" ? d.em : null;
  const quando = em ? (diaDoInstante(em) === hojeDia ? ` às ${horaDoInstante(em)}` : ` em ${diaCurto(diaDoInstante(em))}, às ${horaDoInstante(em)}`) : "";
  const pn = primeiroNome(cliente);
  // F3.191 (enc-conflito): o êxito marcado como não cobrado com a janela aberta.
  if (d.tipo === "NAO_COBRADO") {
    return { titulo: `${por} marcou o êxito de ${pn} como não cobrado${quando}.`, texto: "Nada foi registrado. Veja a divisão refeita: ela fica sem os honorários do êxito." };
  }
  // F3.191: o não cobrado que a tela viu saiu (contrato cancelado ou importação desfeita).
  if (d.tipo === "CONFERENCIA") return { titulo: `O êxito de ${pn} mudou enquanto você dividia.`, texto: "Nada foi registrado. Veja a divisão refeita antes de registrar." };
  return {
    titulo: d.tipo === "BAIXA"
      ? `${por} deu baixa sem receber no êxito de ${pn}${quando}.`
      : `${por} desfez a baixa sem receber do êxito de ${pn}${quando}.`,
    texto: "Nada foi registrado. Veja a divisão refeita antes de registrar.",
  };
}

/** A linha do histórico do repasse registrado com "Manter" (eb-historico). */
export function textoExitoMantido(d: Record<string, unknown>, cliente: string): string {
  const pn = primeiroNome(cliente);
  const baixas = Array.isArray(d.baixas) ? (d.baixas as { motivo?: MotivoBaixa; por?: PessoaRef | null; em?: string }[]) : [];
  const como = baixas.map((b) => [b.motivo && MOTIVOS_BAIXA[b.motivo] ? MOTIVOS_BAIXA[b.motivo].toLowerCase() : null,
    b.por || b.em ? `por ${b.por?.nome ?? "alguém da equipe"}${b.em ? ` em ${diaCurto(diaDoInstante(b.em))}` : ""}` : null].filter(Boolean).join(", "))
    .filter(Boolean);
  const parcela = baixas.length > 1 ? `as parcelas de ${pn} continuam` : `a parcela de ${pn} continua`;
  return `Registrado sem os honorários do êxito: ${parcela} com baixa sem receber${como.length ? ` (${como.join("; ")})` : ""}.`;
}

/** Quem e quando, embaixo da linha: "Diego Almeida, ao registrar o alvará". */
export function quemRegistrou(por: string | null | undefined, tipo: string | null | undefined): string {
  return `${por ?? "Alguém da equipe"}, ao registrar o ${nomeDoLevantamento(tipo)}`;
}

/**
 * O que o desfazer deu, com o que os honorários pagaram de fato (a confirmação e a linha do
 * histórico): a parcela inteira, uma parte, ou nada (os honorários tirados depois de escolher).
 */
export function textoExitoDesfeito(pago: number, falta: number): string {
  if (pago > 0 && falta <= 0) return "A baixa sem receber do êxito foi desfeita, e os honorários pagam a parcela.";
  if (pago > 0) return `A baixa sem receber do êxito foi desfeita; os honorários pagaram ${reais(pago)}, e falta ${reais(falta)}.`;
  return "A baixa sem receber do êxito foi desfeita, e a parcela volta a ser cobrada.";
}

/** O evento levantamento_exito_desfeito do histórico; sem o pago (evento antigo), o texto de antes. */
export function textoExitoDesfeitoDoHistorico(d: Record<string, unknown>): string {
  const b = (d.baixaDesfeita ?? {}) as { pago?: unknown; falta?: unknown };
  if (typeof b.pago !== "number" || typeof b.falta !== "number") return textoExitoDesfeito(1, 0);
  return textoExitoDesfeito(b.pago, b.falta);
}

/**
 * A linha do "Fechamento do caso" depois do "Manter" (eb-historico): "Êxito do contrato C-2026-021:
 * baixa sem receber", com "inadimplência, por Marina Ribeiro em 05/11 · mantida ao registrar o alvará".
 */
export function fechamentoExitoMantido(d: Record<string, unknown>, tipo: string | null | undefined): { titulo: string; detalhe: string }[] {
  const baixas = Array.isArray(d.baixas) ? (d.baixas as { motivo?: MotivoBaixa; por?: PessoaRef | null; em?: string; contrato?: string | null }[]) : [];
  return baixas.map((b) => ({
    titulo: `Êxito${b.contrato ? ` do contrato ${b.contrato}` : ""}: baixa sem receber`,
    detalhe: [b.motivo && MOTIVOS_BAIXA[b.motivo] ? MOTIVOS_BAIXA[b.motivo].toLowerCase() : null,
      b.por || b.em ? `por ${b.por?.nome ?? "alguém da equipe"}${b.em ? ` em ${diaCurto(diaDoInstante(b.em))}` : ""}` : null]
      .filter(Boolean).join(", ") + ` · mantida ao registrar o ${nomeDoLevantamento(tipo)}`,
  }));
}
