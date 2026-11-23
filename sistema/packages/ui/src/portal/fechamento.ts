// Fechamento do caso no financeiro (F3.45, F3.128, F3.132; EX-16, EX-17, FI-08): os textos e as
// escolhas da janela de encerrar e do quadro, sem React, para os testes de unidade. A janela é
// comum à ficha do repasse e à ficha do contrato. Desenho aprovado em
// docs/design/aprovadas/portal-fechamento-sem-levantamento (decisões 8 a 10).

import { PARA_DESTINACAO, type AcertoCaso, type PendenciaCaso } from "@t3jus/domain";
import { diaCurto } from "./agenda.ts";
import { juntarComE } from "./clientes.ts";
import { primeiroNome } from "./equipe.ts";

/** O que o atalho da janela de pendência faz (decisão 8). */
export type Atalho =
  | { tipo: "registrar"; parcelaId: string; rotulo: string }
  | { tipo: "link"; href: string; rotulo: string }
  | { tipo: "repasse"; destinacaoId: string; rotulo: string };

/** Se o caso teve levantamento. Sem o campo (API de antes), vale o que entrou. */
export function comLevantamento(a: Pick<AcertoCaso, "comLevantamento" | "entrou">): boolean {
  return a.comLevantamento ?? a.entrou > 0;
}

/** Decisão 9: "este contrato" com um, "os contratos ligados" com mais de um. */
export function rotuloEncerrarJunto(n: number): string {
  return n === 1 ? "Encerrar também este contrato" : "Encerrar também os contratos ligados";
}

/** O botão da janela pronta. */
export function botaoEncerrar(n: number, junto: boolean): string {
  if (!junto || n === 0) return "Encerrar o caso";
  return n === 1 ? "Encerrar o caso e o contrato" : "Encerrar o caso e os contratos";
}

/** "tudo recebido e repassado" só com levantamento; sem ele, "tudo recebido". */
export function textoEncerrado(a: Pick<AcertoCaso, "comLevantamento" | "entrou">): string {
  return comLevantamento(a) ? "tudo recebido e repassado" : "tudo recebido";
}

/** Nota 1 da segunda leitura: o texto de ajuda da parcela, igual para quem vê. */
export function textoAjudaPendencia(cliente: string): string {
  return `Se ${primeiroNome(cliente)} não vai pagar, ainda não dá para dar baixa na parcela sem receber: anote a cobrança, e o caso segue “acerto pendente” até a parcela ser paga.`;
}

/** O texto aprovado da ficha do repasse, quando há repasse pendente. */
export const AJUDA_REPASSE =
  "Se algum repasse não vai acontecer (por exemplo, o perito abriu mão), registre isso no repasse, com o motivo. Assim nada some sem explicação.";

/**
 * Decisão 10: quem não encerra contratos vê a seção sem caixa, com quem encerra e onde. Sem os
 * nomes (API de antes), diz só a área.
 */
export function textoQuemEncerraContratos(ligados: { numero: string; cliente: { nome: string } }[], quem: string[] | undefined): string {
  const numeros = juntarComE(ligados.map((c) => c.numero));
  const nomes = [...new Set(ligados.map((c) => primeiroNome(c.cliente.nome)))];
  const area = quem?.length ? `a área Contratos (${juntarComE(quem.map(primeiroNome))})` : "a área Contratos";
  const fica = ligados.length === 1 ? `O ${numeros} fica aberto` : `Os ${numeros} ficam abertos`;
  const ficha = `${nomes.length === 1 ? "da ficha" : "das fichas"} de ${juntarComE(nomes)}`;
  return `${fica}. Quem encerra é ${area}, no passo “Encerrar o contrato” ${ficha}.`;
}

/** O contrato já encerrado na janela (decisão 9): "Já encerrado em 12/11, por Felipe, em Contratos · fica como está". */
export function textoJaEncerrado(c: { encerradoEm: string; encerradoPor: { nome: string } | null }, dia: (x: string) => string): string {
  return `Já encerrado em ${dia(c.encerradoEm)}${c.encerradoPor ? `, por ${primeiroNome(c.encerradoPor.nome)}, em Contratos` : ""} · fica como está`;
}

/** O que falta, em palavras, para cada pendência do fechamento (a linha de baixo, na ficha do repasse). */
export function detalheDaPendencia(x: PendenciaCaso): string {
  if (x.tipo === "REPASSE") return `${PARA_DESTINACAO[x.para!].toLowerCase()} · combinado para até ${diaCurto(x.prazo!)}`;
  if (x.tipo === "PARCELA") return `parcela do contrato · vence em ${diaCurto(x.vencimento!)}`;
  if (x.tipo === "EXITO") return "êxito calculado no encerramento, esperando a conferência em A receber";
  if (x.tipo === "PARCELA_SEM_VALOR") return "parcela do contrato ainda sem valor (base do mês ou etapa do caso)";
  return "o escritório adiantou e o cliente ainda não reembolsou";
}

/** O título do aviso da janela de pendência. */
export function tituloPendencias(lista: PendenciaCaso[], contar: (n: number, um: string, varios: string) => string): string {
  const repasses = lista.filter((x) => x.tipo === "REPASSE").length;
  if (repasses && repasses === lista.length) return `Ainda há ${contar(repasses, "repasse pendente", "repasses pendentes")} neste caso.`;
  if (!repasses) return "Ainda falta receber neste caso.";
  return `Ainda há ${contar(lista.length, "pendência", "pendências")} neste caso.`;
}

/** O primeiro atalho que existe, na ordem das pendências (decisão 8: o da primeira). */
export function primeiroAtalho(lista: PendenciaCaso[], atalho: (p: PendenciaCaso) => Atalho | null): Atalho | null {
  for (const p of lista) {
    const a = atalho(p);
    if (a) return a;
  }
  return null;
}

/** O rótulo do registrar repasse da ficha do repasse (o de hoje). */
export function rotuloRepasse(d: { para: keyof typeof PARA_DESTINACAO; nome: string }): string {
  return `Registrar repasse ${d.para === "CLIENTE" ? `a ${primeiroNome(d.nome)}` : `ao ${PARA_DESTINACAO[d.para].toLowerCase()}`}`;
}
