// Lembretes de contrato (F3.144, F3.145; VA-05): rotas e textos da tela, sem React, para os
// testes de unidade. Os textos são os do desenho aprovado em
// docs/design/aprovadas/portal-importacao-sobras e na rodada 2 (portal-importacao-sobras-rodada2).

import {
  dataBr, reais, SITUACOES_LEMBRETE,
  type LembreteContrato, type OrdemLembrete, type OrigemDados, type PessoaRef, type SituacaoLembrete,
} from "@t3jus/domain";
import { esperando } from "../console/tempo.ts";

const BASE = "/contratos/contratos/lembretes";
const PARAM: Record<SituacaoLembrete, string> = { ABERTO: "abertos", CONTRATO: "viraram", DISPENSADO: "dispensados" };
const DO_PARAM: Record<string, SituacaoLembrete> = { abertos: "ABERTO", viraram: "CONTRATO", dispensados: "DISPENSADO" };

export const ROTAS_LEMBRETES = {
  lista: BASE,
  /** Um grupo, com a busca indo junto (rodada 2: quem procurou no grupo errado acha com um clique). */
  grupo: (s: SituacaoLembrete, q?: string | null) => `${BASE}?mostrar=${PARAM[s]}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
  dispensados: `${BASE}?mostrar=dispensados`,
  viraram: `${BASE}?mostrar=viraram`,
};

/** O grupo do endereço (?mostrar=dispensados); sem ele, Abertos. */
export const grupoDoEndereco = (v: string | null | undefined): SituacaoLembrete => DO_PARAM[v ?? ""] ?? "ABERTO";

const SISTEMA: Record<OrigemDados, string> = { PLANILHA: "sistema antigo", ASTREA: "Astrea", ADVBOX_PLANILHA: "ADVBOX" };
export const nomeSistema = (o: OrigemDados | null | undefined) => SISTEMA[o ?? "PLANILHA"];

export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;

const contar = (n: number, um: string, varios: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;

const ORDEM_TEXTO: Record<OrdemLembrete, string> = {
  VALOR: "do maior valor para o menor",
  ANTIGO: "do lançamento mais antigo para o mais recente",
  NOME: "pelo nome do cliente, de A a Z",
};

/** "Caso Tavares x Metalúrgica Andrade · com Felipe Matos", ou "Sem caso ligado". */
export function textoCaso(caso: { nome: string; responsavel?: PessoaRef | null } | null): string {
  if (!caso) return "Sem caso ligado";
  return `Caso ${caso.nome}${caso.responsavel ? ` · com ${caso.responsavel.nome}` : ""}`;
}

/** "3 lançamentos · o mais antigo venceu em 10/06/2026". */
export function textoLancamentos(l: Pick<LembreteContrato, "lancamentos" | "maisAntigo">, hoje: string): string {
  const n = contar(l.lancamentos, "lançamento", "lançamentos");
  if (!l.maisAntigo) return n;
  const verbo = l.maisAntigo < hoje ? "venceu em" : "vence em";
  return `${n} · ${l.lancamentos === 1 ? verbo : `o mais antigo ${verbo}`} ${dataBr(l.maisAntigo)}`;
}

/** A contagem acima da lista: o número em negrito e o resto. */
export function contagemLembretes(s: SituacaoLembrete, total: number, valor: number, ordem: OrdemLembrete | null, q: string | null): { forte: string; resto: string } {
  if (!total && q) {
    return { forte: "Nenhum lembrete encontrado", resto: `${s === "ABERTO" ? "" : ` em ${SITUACOES_LEMBRETE[s]}`} para “${q}”` };
  }
  const forte = s === "ABERTO" ? contar(total, "lembrete aberto", "lembretes abertos")
    : s === "CONTRATO" ? contar(total, "lembrete virou contrato", "lembretes viraram contrato")
    : contar(total, "lembrete dispensado", "lembretes dispensados");
  const ord = s === "ABERTO" ? ORDEM_TEXTO[ordem ?? "VALOR"] : "do mais recente para o mais antigo";
  return { forte, resto: `${q ? ` para “${q}”` : ""} · ${reais(valor)} · ${ord}` };
}

/** A busca sem resultado. Em Abertos, o texto aprovado; nos outros grupos, o da rodada 2. */
export function buscaVazia(s: SituacaoLembrete, q: string): { titulo: string; texto: string } {
  if (s === "ABERTO") {
    return {
      titulo: `Nenhum lembrete para “${q}”`,
      texto: "Confira o nome do cliente ou do caso. A busca olha só os lembretes abertos; os que viraram contrato ou foram dispensados ficam nos outros números acima.",
    };
  }
  const grupo = SITUACOES_LEMBRETE[s];
  const aqui = s === "CONTRATO" ? "os que viraram contrato" : "os dispensados";
  const outros = s === "CONTRATO" ? "nos abertos ou nos dispensados" : "nos abertos ou nos que viraram contrato";
  return {
    titulo: `Nenhum lembrete em ${grupo} para “${q}”`,
    texto: `Confira o nome do cliente ou do caso. Aqui a busca olha só ${aqui}. Para procurar ${outros}, clique no número acima: a busca vai junto.`,
  };
}

/** O grupo vazio, sem busca. */
export function grupoVazio(s: SituacaoLembrete, total: number, origem: OrigemDados | null, importadoEm: string | null): { titulo: string; texto: string } {
  if (s === "ABERTO") {
    const de = importadoEm ? ` de ${dataBr(importadoEm.slice(0, 10)).slice(0, 5)}` : "";
    return {
      titulo: "Nenhum lembrete aberto",
      texto: total
        ? `${total === 1 ? "O lembrete" : `Os ${total.toLocaleString("pt-BR")} lembretes`} da importação do ${nomeSistema(origem)}${de} ${total === 1 ? "virou contrato ou foi dispensado" : "viraram contrato ou foram dispensados"}. Não falta criar nenhum contrato pelo que estava em aberto no sistema antigo.`
        : "Não falta criar nenhum contrato pelo que estava em aberto no sistema antigo.",
    };
  }
  return s === "CONTRATO"
    ? { titulo: "Nenhum lembrete virou contrato ainda", texto: "Quando um contrato do cliente é criado, o lembrete sai dos abertos sozinho e aparece aqui." }
    : { titulo: "Nenhum lembrete dispensado", texto: "O que o escritório não vai cobrar, dispensado com o motivo, aparece aqui e dá para trazer de volta." };
}

/** O aviso depois de dispensar (com "Desfazer"). */
export function avisoDispensado(cliente: string): { titulo: string; texto: string } {
  return {
    titulo: `Lembrete de ${primeiroNome(cliente)} dispensado.`,
    texto: "Saiu da lista e da ficha do cliente. Está em Dispensados, com o motivo, e no histórico do cliente.",
  };
}

/** O aviso de "Trazer de volta" (rodada 2): voltou para Abertos ou já voltou resolvido. */
export function avisoTrazido(l: Pick<LembreteContrato, "situacao" | "cliente" | "contrato">): { titulo: string; texto: string; resolvido: boolean } {
  const p = primeiroNome(l.cliente.nome);
  if (l.situacao === "CONTRATO") {
    return {
      resolvido: true,
      titulo: `O lembrete de ${p} voltou já resolvido.`,
      texto: `O contrato ${l.contrato?.numero ?? ""} foi criado enquanto ele estava dispensado. Por isso foi direto para Viraram contrato, e não para Abertos.`.replace("contrato  foi", "contrato foi"),
    };
  }
  return {
    resolvido: false,
    titulo: `O lembrete de ${p} voltou para Abertos.`,
    texto: "Está de novo na lista e na ficha do cliente, com o mesmo valor. O histórico do cliente guarda quem dispensou e quem trouxe de volta.",
  };
}

type ConflitoDispensa = { motivo?: string; contrato?: { numero?: string }; por?: PessoaRef | null; em?: string };

/** O conflito da janela de dispensar: alguém criou o contrato ou já dispensou enquanto ela estava aberta. */
export function conflitoDispensa(d: ConflitoDispensa, cliente: string, agora: Date = new Date()): { titulo: string; texto: string } {
  const quem = d.por?.nome ?? "Alguém";
  const ha = d.em ? esperando(d.em, agora).replace(/min$/, "minutos").replace(/ h$/, " horas").replace(/^há 1 minutos$/, "há 1 minuto").replace(/^há 1 horas$/, "há 1 hora") : "agora há pouco";
  if (d.motivo === "JA_DISPENSADO") {
    return {
      titulo: "Este lembrete já foi dispensado.",
      texto: `${quem} já dispensou este lembrete ${ha}. Nada mudou: o motivo que você escolheu não foi gravado. O lembrete está em Dispensados, com o motivo de ${d.por ? primeiroNome(d.por.nome) : "quem dispensou"}.`,
    };
  }
  return {
    titulo: "Este lembrete já saiu da lista.",
    texto: `${quem} criou o contrato ${d.contrato?.numero ?? ""} para ${primeiroNome(cliente)} ${ha}, e o lembrete saiu sozinho. Nada foi dispensado. Feche a janela para ver a lista atualizada.`.replace("contrato  para", "contrato para"),
  };
}

/** "Dispensado hoje por Marina Ribeiro" ou "Dispensado em 22/11 por …". */
export function quandoDispensado(em: string, por: PessoaRef | null, hoje: string): string {
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
  return `Dispensado ${dia === hoje ? "hoje" : `em ${dia.slice(8, 10)}/${dia.slice(5, 7)}`}${por ? ` por ${por.nome}` : ""}`;
}

/** "criado em 22/11 por Felipe Matos". */
export function quandoCriado(em: string, por: PessoaRef | null): string {
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
  return `criado em ${dia.slice(8, 10)}/${dia.slice(5, 7)}${por ? ` por ${por.nome}` : ""}`;
}
