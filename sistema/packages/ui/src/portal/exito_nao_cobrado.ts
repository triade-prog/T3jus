// O êxito marcado como não cobrado na divisão do alvará (F3.191; CH-07, FI-05). Os textos do
// desenho aprovado em docs/design/aprovadas/portal-exito-nao-cobrado-alvara (D40, estados enc-),
// com a C1 = (a), "Cobrar com motivo escrito": o aviso e a escolha da janela, os erros, a
// confirmação, as linhas da ficha do repasse, o "De onde veio" e as telas do caso.

import {
  COMBINADO_MIN, dataBr, percentual, reais,
  type CobradoNoAlvara, type ExitoNaoCobrado, type MotivoNaoCobrar, type PessoaRef,
} from "@t3jus/domain";
import { diaCurto } from "./agenda.ts";
import { nomeDoLevantamento } from "./baixa.ts";
import { primeiroNome } from "./equipe.ts";

const FUSO = { timeZone: "America/Sao_Paulo" } as const;
const diaDoInstante = (em: string) => new Intl.DateTimeFormat("en-CA", { ...FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
/** "18/11" de uma data ou de um instante (no fuso de Brasília). */
const curto = (x: string) => diaCurto(/^\d{4}-\d{2}-\d{2}$/.test(x) ? x : diaDoInstante(x));

/** O motivo como a frase diz: "perdoado", "indevido", "outro". */
export const MOTIVO_CURTO: Record<MotivoNaoCobrar, string> = { PERDOADO: "perdoado", INDEVIDO: "indevido", OUTRO: "outro" };
const motivo = (m: unknown) => (typeof m === "string" && m in MOTIVO_CURTO ? MOTIVO_CURTO[m as MotivoNaoCobrar] : "não cobrado");

/** "Marina Ribeiro e Larissa Costa"; "Marina Ribeiro, Felipe Matos e Larissa Costa". */
export function listaDeNomes(ps: Pick<PessoaRef, "nome">[]): string {
  const n = ps.map((p) => p.nome);
  return n.length <= 1 ? (n[0] ?? "") : `${n.slice(0, -1).join(", ")} e ${n[n.length - 1]}`;
}

export type EscolhaNaoCobrado = "SEM" | "COBRAR";

export interface AvisoNaoCobrado {
  titulo: string;
  detalhe: string;
  /** Já cobrado em parte em outro alvará: quanto e até quanto ainda dá. */
  parcial: string | null;
  /** A explicação da conferência (null para o cliente excluído). */
  explicacao: string | null;
  texto: string;
  /** Indevido: o quadro branco com o caminho, sem a escolha. */
  semEscolha: string | null;
}

/** O aviso dentro do quadro "Divisão" (enc-proposta, enc-indevido), com as variações das notas. */
export function textoExitoNaoCobrado(nc: ExitoNaoCobrado, cliente: string, caso: string, tipo?: string | null): AvisoNaoCobrado {
  const pn = primeiroNome(cliente);
  const quem = nc.conferido.por?.nome ?? "alguém da equipe";
  const quando = nc.conferido.em ? ` em ${dataBr(diaDoInstante(nc.conferido.em))}` : "";
  const detalhe = `Êxito · ${caso} · ${percentual(nc.percentual)} · ${reais(nc.calculado)} calculados · ${motivo(nc.motivo)}, por ${quem}${quando}.`;
  const cs = nc.cobrancas;
  const onde = cs.length === 1 ? `no ${nomeDoLevantamento(cs[0]!.tipo)} de ${diaCurto(cs[0]!.entrouEm)}` : `em ${cs.length} levantamentos`;
  const parcial = nc.jaCobrado > 0
    ? `Já foram cobrados ${reais(nc.jaCobrado)} deste êxito ${onde}.${nc.limite > 0 ? ` Dá para cobrar até ${reais(nc.limite)}.` : ""}` : null;
  if (nc.motivo === "INDEVIDO") {
    return {
      titulo: `O êxito de ${pn} foi marcado como não devido na conferência.`, detalhe, parcial, explicacao: nc.explicacao,
      texto: "Por isso, a divisão não tem os honorários do êxito, e eles não podem ser cobrados neste alvará.".replace("alvará", nomeDoLevantamento(tipo)),
      semEscolha: `Se foi um engano, fale com ${quem}. Por enquanto, o T3jus não refaz a conferência: registre o ${nomeDoLevantamento(tipo)} assim e não lance os honorários como “Outro”.`,
    };
  }
  if (!nc.podeCobrar) {
    // Lacuna do plano, no caminho conservador: o calculado já foi todo cobrado em outros alvarás.
    return {
      titulo: `O êxito de ${pn} foi marcado como não cobrado.`, detalhe, parcial, explicacao: nc.explicacao,
      texto: `Por isso, a divisão veio sem os honorários do êxito. O êxito calculado na conferência já foi todo cobrado, e nada mais dele entra neste ${nomeDoLevantamento(tipo)}.`,
      semEscolha: null,
    };
  }
  return {
    titulo: `O êxito de ${pn} foi marcado como não cobrado.`, detalhe, parcial, explicacao: nc.explicacao,
    texto: `Por isso, a divisão veio sem os honorários do êxito. Escolha se fica assim ou se eles são cobrados neste ${nomeDoLevantamento(tipo)}, com o acordo de ${pn}.`,
    semEscolha: null,
  };
}

/** As ajudas dos dois cartões (enc-proposta). `total` é o valor levantado. */
export function ajudasDaEscolha(nc: Pick<ExitoNaoCobrado, "motivo" | "avisados">, cliente: string, total: number): { sem: string; cobrar: string } {
  const pn = primeiroNome(cliente);
  const av = nc.avisados.length
    ? ` A prestação de contas vai mostrar os honorários, e ${listaDeNomes(nc.avisados)} ${nc.avisados.length === 1 ? "recebe" : "recebem"} um aviso.`
    : " A prestação de contas vai mostrar os honorários.";
  return {
    sem: `Os ${reais(total)} ficam com ${pn}, como decidido na conferência.`,
    cobrar: `Só cobre se ${pn} concordou.${av}${nc.motivo === "PERDOADO" ? " Se o combinado virou parcelas novas em Contratos, cobrar aqui cobra duas vezes." : ""}`,
  };
}

/** O teto na linha dos honorários que volta com o "Cobrar". */
export function tetoDoExito(nc: Pick<ExitoNaoCobrado, "limite" | "jaCobrado">): string {
  return nc.jaCobrado > 0
    ? `Até ${reais(nc.limite)}, o que falta do êxito calculado na conferência.`
    : `Até ${reais(nc.limite)}, o êxito calculado na conferência.`;
}

export interface ErrosNaoCobrado { grupo?: string; valor?: string; combinado?: string; concordou?: string }

/** "Cobrar" com a linha de honorários tirada (revisão, M3): erro no grupo, e não "Deixar sem" calado. */
export const COBRAR_SEM_LINHA = "Você escolheu cobrar, mas tirou a linha de honorários. Ponha a linha de volta ou escolha deixar sem.";
const COBRAR_SEM_LINHA_CURTO = "Ponha a linha de honorários de volta ou escolha deixar sem.";

/** Os erros antes de enviar (enc-erro, enc-erro-cobrar). `honorarios`: a soma das linhas de honorários. */
export function errosDoNaoCobrado(nc: ExitoNaoCobrado, escolha: EscolhaNaoCobrado | null, combinado: string, concordou: boolean,
  honorarios: number, cliente: string): ErrosNaoCobrado {
  const pn = primeiroNome(cliente);
  // Sem a escolha possível, a proposta não traz a linha, e a tela não acrescenta honorários à mão
  // (PARA_ACRESCENTAR): a parte mandada por fora é recusada no servidor (revisão, L1).
  if (!nc.podeCobrar) return {};
  if (!escolha) return { grupo: `Escolha o que fazer com os honorários do êxito de ${pn}: deixar sem ou cobrar neste alvará.` };
  if (escolha === "SEM") return {};
  const e: ErrosNaoCobrado = {};
  if (honorarios <= 0) e.grupo = COBRAR_SEM_LINHA;
  if (honorarios > nc.limite) e.valor = `Os honorários passam do êxito calculado na conferência (${reais(nc.limite)}).`;
  if (combinado.trim().length < COMBINADO_MIN) e.combinado = `Escreva o que foi combinado com ${pn}, com pelo menos 3 letras.`;
  if (!concordou) e.concordou = `Confirme que ${pn} concordou com a cobrança.`;
  return e;
}

/** Os links do resumo no topo, na ordem dos campos. Com a mensagem do grupo, o link diz o caso certo
 *  (a linha tirada no "Cobrar"). */
export function resumoDoNaoCobrado(e: ErrosNaoCobrado, cliente: string): { campo: keyof ErrosNaoCobrado; texto: string }[] {
  const pn = primeiroNome(cliente);
  return [
    e.grupo ? { campo: "grupo" as const, texto: e.grupo === COBRAR_SEM_LINHA ? COBRAR_SEM_LINHA_CURTO : `Escolha o que fazer com os honorários do êxito de ${pn}.` } : null,
    e.valor ? { campo: "valor" as const, texto: "Os honorários passam do êxito calculado na conferência." } : null,
    e.combinado ? { campo: "combinado" as const, texto: `Escreva o que foi combinado com ${pn}.` } : null,
    e.concordou ? { campo: "concordou" as const, texto: `Confirme que ${pn} concordou com a cobrança.` } : null,
  ].filter((x): x is { campo: keyof ErrosNaoCobrado; texto: string } => !!x);
}

/** A nota do "Deixar sem" (enc-sem). */
export function notaDeixarSem(cliente: string): string {
  return `Os honorários ficam fora da divisão. O êxito de ${primeiroNome(cliente)} continua não cobrado, e isso fica no histórico do repasse.`;
}

/** O fim da confirmação, depois do "Cobrar". */
export const CONFIRMACAO_COBRADO = "Os honorários do êxito foram cobrados, e o combinado ficou na ficha do repasse.";

// ------------------------------------------------------------------ A ficha do repasse

/** "(perdoado, por Marina Ribeiro em 10/11)", com o que o histórico tem. */
function naConferencia(d: Record<string, unknown>): string {
  const por = (d.conferidoPor as PessoaRef | null | undefined)?.nome;
  const em = typeof d.conferidoEm === "string" ? d.conferidoEm : null;
  return [motivo(d.motivo), por || em ? `por ${por ?? "alguém da equipe"}${em ? ` em ${curto(em)}` : ""}` : null].filter(Boolean).join(", ");
}

/** O subtítulo de "Para onde vai cada parte". */
export function subtituloNaoCobrado(cobrado: boolean, por: PessoaRef | null, cliente: string): string {
  return cobrado
    ? `Com os honorários do êxito, cobrados por ${por ? primeiroNome(por.nome) : "alguém da equipe"} com o combinado com ${primeiroNome(cliente)}.`
    : "Sem os honorários do êxito: o êxito foi marcado como não cobrado na conferência.";
}

/** A linha do histórico com "Cobrar" (enc-historico): o texto, o combinado entre aspas e quem. */
export function textoExitoCobradoHist(d: Record<string, unknown>, cliente: string, por: PessoaRef | null, tipo: string | null | undefined):
  { antes: string; combinado: string | null; depois: string; quem: string } {
  const pn = primeiroNome(cliente);
  const combinado = typeof d.combinado === "string" && d.combinado ? d.combinado : null;
  return {
    antes: `Honorários do êxito cobrados neste ${nomeDoLevantamento(tipo)}, com o combinado com ${pn}${combinado ? ":" : "."}`,
    combinado,
    depois: `Na conferência, o êxito tinha sido marcado como não cobrado (${naConferencia(d)}).`,
    quem: `${por?.nome ?? "Alguém da equipe"}, ao registrar o ${nomeDoLevantamento(tipo)} · ${pn} concordou, segundo ${por ? primeiroNome(por.nome) : "quem registrou"}`,
  };
}

/** A linha do histórico com "Deixar sem" (enc-historico-sem). */
export function textoExitoNaoCobradoHist(d: Record<string, unknown>, cliente: string): string {
  return `Registrado sem os honorários do êxito: o êxito de ${primeiroNome(cliente)} foi marcado como não cobrado na conferência (${naConferencia(d)}).`;
}

/** O detalhe da linha do registro com "Cobrar", no lugar de "divisão ajustada à mão". */
export const REGISTRO_COM_COBRANCA = "com os honorários do êxito cobrados";

/** A linha do "Fechamento do caso" com "Cobrar" ou com "Deixar sem". */
export function fechamentoExitoCobrado(d: Record<string, unknown>, cliente: string, por: PessoaRef | null, entrouEm: string, tipo: string | null | undefined):
  { titulo: string; detalhe: string } {
  const pn = primeiroNome(cliente);
  const valor = typeof d.honorarios === "number" ? reais(d.honorarios) : null;
  return {
    titulo: `Êxito de ${pn} cobrado no ${nomeDoLevantamento(tipo)} de ${diaCurto(entrouEm)} (não cobrado na conferência)`,
    detalhe: [valor, `por ${por?.nome ?? "alguém da equipe"}, com o combinado com ${pn}`, `na conferência: ${naConferencia(d)}`].filter(Boolean).join(" · "),
  };
}

export function fechamentoExitoNaoCobrado(d: Record<string, unknown>, tipo: string | null | undefined): { titulo: string; detalhe: string } {
  const contrato = typeof d.contrato === "string" && d.contrato ? d.contrato : null;
  return {
    titulo: `Êxito${contrato ? ` do contrato ${contrato}` : ""}: não cobrado`,
    detalhe: `${naConferencia(d)} · deixado fora do ${nomeDoLevantamento(tipo)} ao registrar`,
  };
}

// ------------------------------------------------------------------ As telas do caso

/** O "De onde veio" (enc-caso-historico). */
export function origemExitoCobrado(d: Record<string, unknown>): { fez: string; detalhe: string } {
  const cliente = typeof d.cliente === "string" && d.cliente ? ` de ${primeiroNome(d.cliente)}` : "";
  const quando = typeof d.entrouEm === "string" ? ` de ${curto(d.entrouEm)}` : "";
  return {
    fez: `cobrou no ${nomeDoLevantamento(typeof d.tipo === "string" ? d.tipo : null)}${quando} os honorários do êxito${cliente}, que estava como não cobrado`,
    detalhe: [typeof d.valor === "number" ? reais(d.valor) : "", typeof d.combinado === "string" && d.combinado ? `“${d.combinado}”` : ""].filter(Boolean).join(" · "),
  };
}


/** O acerto na ficha do caso (enc-acerto, enc-acerto-larissa). */
export function acertoExitoCobrado(c: CobradoNoAlvara, conferido: { por: PessoaRef | null; em: string | null }): { texto: string; sub: string } {
  const nc = `Não cobrado${conferido.por ? ` por ${primeiroNome(conferido.por.nome)}` : ""}${conferido.em ? ` em ${curto(conferido.em)}` : ""}`;
  const quem = `${c.por ? ` por ${primeiroNome(c.por.nome)}` : ""} em ${curto(c.em)}`;
  return {
    texto: `Êxito não cobrado · cobrado no ${nomeDoLevantamento(c.tipo)}`,
    sub: `${nc} · ${typeof c.valor === "number" ? `${reais(c.valor)} cobrados` : "cobrado"}${quem}`,
  };
}

/** O passo "Conferir o êxito" da ficha do cliente (enc-ficha-cliente). */
export function passoExitoCobrado(c: CobradoNoAlvara, conferido: { por: PessoaRef | null; em: string | null }): string {
  const nc = `Não cobrado${conferido.por ? `, por ${primeiroNome(conferido.por.nome)}` : ""}${conferido.em ? ` em ${curto(conferido.em)}` : ""}`;
  // Sem o Financeiro, entrouEm não vem: fica o dia em que foi cobrado (revisão, M2).
  const quando = c.entrouEm ? ` de ${curto(c.entrouEm)}` : ` em ${curto(c.em)}`;
  return `${nc} · cobrado no ${nomeDoLevantamento(c.tipo)}${quando}${c.por ? `, por ${primeiroNome(c.por.nome)}` : ""}`;
}

/** A ficha do contrato só de êxito (enc-caso-historico): o âmbar e o vazio das parcelas. */
export function contratoExitoCobrado(c: { tipo: CobradoNoAlvara["tipo"]; entrouEm: string }): { ambar: string; vazio: string } {
  const onde = `no ${nomeDoLevantamento(c.tipo)} de ${curto(c.entrouEm)}`;
  return {
    ambar: `O êxito foi cobrado ${onde}. Os honorários vão ao caixa pela ficha do repasse.`,
    vazio: `O contrato é só de êxito. O êxito foi marcado como não cobrado na conferência, e os honorários foram cobrados ${onde}, na ficha do repasse.`,
  };
}
