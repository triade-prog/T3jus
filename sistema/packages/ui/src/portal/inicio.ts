// Regras de tela do Início do Portal (F1.14, AP-06), separadas para testar sem navegador.

import {
  AREAS_PORTAL, FORMAS_PAGAMENTO, reais, type AreaPortal, type BlocoInicio, type ContatoDoDia, type ContatosDoInicio, type FormaPagamento,
  type GrupoInicio, type InicioContratos, type InicioFinanceiro, type InicioJuridico, type ItemInicio, type ResumoInicio,
} from "@t3jus/domain";
import { DIAS_SEMANA, diaCurto, diaDaSemana as numeroDaSemana, diaDe, horaDe, nomeDoMes, somarDias } from "./agenda.ts";
import { juntarComE } from "./clientes.ts";
import { diasEntre } from "./comercial.ts";
import { primeiroNome } from "./equipe.ts";

/** "Bom dia", "Boa tarde" ou "Boa noite", pela hora de Brasília. */
export function saudacao(agora = new Date()): string {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(agora)) % 24;
  return h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

/** "Quarta-feira, 18 de novembro". */
export function hojeLongo(agora = new Date()): string {
  const t = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long" }).format(agora);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** O selo do vencido: "vencido ontem", "vencido há 5 dias". */
export function rotuloAtraso(dias: number): string {
  return dias <= 1 ? "vencido ontem" : `vencido há ${dias} dias`;
}

/** "10/11" a partir de "2026-11-10". */
export function diaMes(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/** O disco do item: o dia e o mês abreviado. */
export function discoData(iso: string): { dia: string; mes: string } {
  const [, m, d] = iso.split("-");
  return { dia: d ?? "", mes: MESES[Number(m) - 1] ?? "" };
}

/** "sexta, 20/11" (o próximo contato do vazio). */
export function diaDaSemana(iso: string): string {
  const s = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`)).replace("-feira", "");
  return `${s}, ${diaMes(iso)}`;
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** A linha abaixo do título do bloco. */
export function subtituloContatos(c: Pick<ContatosDoInicio, "de" | "totalVencidos" | "totalHoje">): string {
  if (c.de === "EQUIPE") return `Da equipe: ${plural(c.totalVencidos, "vencido", "vencidos")} e ${c.totalHoje} para hoje, com o responsável de cada um`;
  if (!c.totalVencidos && !c.totalHoje) return "Os seus: nada vencido, nada para hoje";
  const partes = [c.totalVencidos ? plural(c.totalVencidos, "vencido", "vencidos") : "", c.totalHoje ? `${c.totalHoje} para hoje` : ""].filter(Boolean);
  return `Os seus: ${partes.join(" e ")}`;
}

/** O pé quando o limite cortou a lista: "Mostrando 5 de 9. Os outros 4: 3 vencidos e 1 de hoje." */
export function peDoLimite(c: Pick<ContatosDoInicio, "vencidos" | "hoje" | "totalVencidos" | "totalHoje">): string | null {
  const vistos = c.vencidos.length + c.hoje.length;
  const total = c.totalVencidos + c.totalHoje;
  if (vistos >= total) return null;
  const v = c.totalVencidos - c.vencidos.length;
  const h = c.totalHoje - c.hoje.length;
  const partes = [v ? plural(v, "vencido", "vencidos") : "", h ? `${h} de hoje` : ""].filter(Boolean);
  return `Mostrando ${vistos} de ${total}. ${total - vistos === 1 ? "O outro" : `Os outros ${total - vistos}`}: ${juntarComE(partes)}.`;
}

/** Os nomes de quem tem contato hoje, para o hero: "Rafael e Lúcia". */
export function nomesDeHoje(hoje: ContatoDoDia[], total: number): string {
  const nomes = hoje.slice(0, 2).map((c) => primeiroNome(c.nome));
  if (total > 2) return `${nomes.join(", ")} e mais ${total - 2}`;
  return juntarComE(nomes);
}

// ---------------------------------------------------------------------------------------
// Início por áreas (F3.26), desenho aprovado em docs/design/aprovadas/portal-inicio-areas.

/** Hoje (aaaa-mm-dd) em Brasília. */
export const hojeIso = (agora = new Date()) => diaDe(agora.toISOString());

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** "Hoje", "Amanhã", "Ontem", o dia da semana até 6 dias à frente ("Sexta") ou "26/11". */
export function relDia(d: string, hoje: string): string {
  if (d === hoje) return "Hoje";
  if (d === somarDias(hoje, 1)) return "Amanhã";
  if (d === somarDias(hoje, -1)) return "Ontem";
  if (d > hoje && d <= somarDias(hoje, 6)) return maiuscula(DIAS_SEMANA[numeroDaSemana(d)]!);
  return diaCurto(d);
}

/** "na sexta", "amanhã", "hoje", "em 26/11": para dentro de uma frase. */
function naData(d: string, hoje: string): string {
  const r = relDia(d, hoje);
  if (r === "Hoje" || r === "Amanhã" || r === "Ontem") return r.toLowerCase();
  if (r.includes("/")) return `em ${r}`;
  return `${r === "Sábado" || r === "Domingo" ? "no" : "na"} ${r.toLowerCase()}`;
}

export type Tom = "urgente" | "atencao" | "neutro" | "implant" | "ok";
export interface TextoItem {
  titulo: string;
  href: string;
  /** O verbo em sobretítulo (PD-01 escrito): Cobrar, Entregar, Acompanhar. */
  verbo: string;
  oque: string;
  detalhe: string | null;
  detalheIco: "doc" | "moeda" | "balanca" | "pessoas" | "agenda";
  selo: { tom: Tom; texto: string } | null;
  valor: number | null;
  esperando: string | null;
}

const PARA: Record<string, string> = { CLIENTE: "cliente", PARCEIRO: "parceiro", PERITO: "perito", OUTRO: "outro" };
const LEVANTAMENTO: Record<string, string> = { ALVARA: "o alvará", RPV: "o RPV", PRECATORIO: "o precatório", ACORDO: "o acordo" };
const LEVANTADO: Record<string, string> = { ALVARA: "Alvará levantado", RPV: "RPV levantado", PRECATORIO: "Precatório levantado", ACORDO: "Depósito do acordo" };

function seloAtraso(em: string, hoje: string, prefixo: string): { tom: Tom; texto: string } {
  const d = diasEntre(em, hoje);
  return { tom: "urgente", texto: d <= 1 ? `${prefixo} ontem` : `${prefixo} há ${d} dias` };
}

/** Cada item do dia em palavras (PD-07): o registro, o verbo, a próxima ação, o detalhe e o selo. */
export function textoItem(i: ItemInicio, hoje: string): TextoItem {
  const venc = i.em < hoje;
  switch (i.tipo) {
    case "BASE": {
      const pct = i.percentual !== null ? `${String(i.percentual / 100).replace(".", ",")}% ${(i.sobre ?? "").toLowerCase()}`.trim() : null;
      return {
        titulo: `${i.cliente.nome} · ${i.contrato.numero}`, href: "/contratos/honorarios", verbo: "Cobrar",
        oque: `Informar a base de ${nomeDoMes(i.em)} para a cobrança sair`,
        detalhe: [pct, `base pedida em ${diaCurto(i.pedirEm)}`].filter(Boolean).join(" · "), detalheIco: "doc",
        selo: venc ? { tom: "urgente", texto: `cobrança parada há ${diasEntre(i.em, hoje)} ${diasEntre(i.em, hoje) === 1 ? "dia" : "dias"}` }
          : { tom: "atencao", texto: relDia(i.em, hoje) },
        valor: null, esperando: null,
      };
    }
    case "ASSINATURA": {
      const dia = diaDe(i.compromisso.inicio);
      return {
        titulo: `${i.cliente.nome} · ${i.contrato.numero}`, href: `/contratos/contratos/${i.contrato.id}`, verbo: "Acompanhar",
        oque: "Registrar a assinatura: o contrato está em elaboração",
        detalhe: `${primeiroNome(i.compromisso.responsavel.nome)} colhe a assinatura ${naData(dia, hoje)}, às ${horaDe(i.compromisso.inicio).replace(":00", "h").replace(":", "h")} · só então a programação vai ao Financeiro`,
        detalheIco: "agenda", selo: { tom: dia === hoje ? "atencao" : "neutro", texto: relDia(dia, hoje) }, valor: null, esperando: null,
      };
    }
    case "PARCELA": {
      const c = i.cobranca;
      const forma = i.forma && i.forma in FORMAS_PAGAMENTO ? FORMAS_PAGAMENTO[i.forma as FormaPagamento] : null;
      return {
        titulo: `${i.cliente.nome} · ${i.descricao}`, href: `/financeiro/a-receber/contratos/${i.contrato.id}`,
        verbo: venc ? "Cobrar" : "Acompanhar",
        oque: venc
          ? c ? `Próxima ação ${c.proxData === hoje ? "hoje" : `em ${diaCurto(c.proxData)}`}: ${c.proxOque}` : "Sem próxima ação: anote a cobrança"
          : `Entra ${naData(i.em, hoje)}${forma ? ` por ${forma}` : ""}`,
        detalhe: venc ? (c?.motivo ? `Motivo: ${c.motivo}` : null) : [maiuscula(nomeDoMes(i.em)), forma].filter(Boolean).join(" · "),
        detalheIco: "doc",
        selo: venc ? { tom: "urgente", texto: `${diasEntre(i.em, hoje)} ${diasEntre(i.em, hoje) === 1 ? "dia" : "dias"}` }
          : { tom: "atencao", texto: relDia(i.em, hoje) },
        valor: i.valor, esperando: null,
      };
    }
    case "REPASSE": {
      const lev = i.levantamento;
      return {
        titulo: `${i.nome} · ${PARA[i.para] ?? i.para.toLowerCase()}`, href: `/financeiro/repasses/${lev.id}`, verbo: "Entregar",
        oque: `Repassar ${LEVANTAMENTO[lev.tipo] ?? "o valor"}${i.caso ? ` de ${i.caso.nome}` : ""}`,
        detalhe: `${LEVANTADO[lev.tipo] ?? "Valor levantado"}, já na conta`, detalheIco: "moeda",
        selo: venc ? { tom: "urgente", texto: `era ${diaCurto(i.em)}` } : { tom: i.em === hoje ? "atencao" : "neutro", texto: i.em === hoje ? "hoje" : `até ${relDia(i.em, hoje).toLowerCase()}` },
        valor: i.valor, esperando: null,
      };
    }
    case "PRAZO": {
      const final = i.dataFinal;
      return {
        titulo: `${i.descricao} · ${i.caso.nome}`, href: `/juridico/casos/${i.caso.id}`, verbo: "Entregar",
        oque: i.fazerAte && i.fazerAte !== final
          ? `Fazer até ${i.fazerAte === hoje ? "hoje" : diaCurto(i.fazerAte)}: o prazo final é ${relDia(final, hoje).toLowerCase()}`
          : `Prazo final ${final === hoje ? "hoje" : diaCurto(final)}`,
        detalhe: ["Prazo", i.caso.numero, i.caso.tribunal].filter(Boolean).join(" · "), detalheIco: "balanca",
        selo: final < hoje ? seloAtraso(final, hoje, "venceu") : { tom: "atencao", texto: relDia(final, hoje) },
        valor: null, esperando: null,
      };
    }
    case "TAREFA":
      return {
        titulo: i.titulo, href: `/juridico/casos/${i.caso.id}`, verbo: i.esperando ? "Acompanhar" : "Entregar",
        oque: `Tarefa · ${i.caso.nome}`, detalhe: null, detalheIco: "doc",
        selo: i.esperando ? null : venc ? seloAtraso(i.em, hoje, "venceu") : { tom: "atencao", texto: "Hoje" },
        valor: null,
        esperando: i.esperando ? `Esperando ${i.esperando}${i.esperandoDesde ? `, desde ${diaCurto(i.esperandoDesde)}` : ""}` : null,
      };
  }
}

/** O rótulo do grupo: "Vencidos", "Para hoje", "A acompanhar", "Esperando alguém". */
export function rotuloGrupo(g: GrupoInicio, ate?: string | null, hoje?: string): string {
  if (g === "ACOMPANHAR" && ate && hoje) return `A fazer até ${relDia(ate, hoje).toLowerCase()}`;
  return { VENCIDOS: "Vencidos", HOJE: "Para hoje", ACOMPANHAR: "A acompanhar", ESPERANDO: "Esperando alguém" }[g];
}

const NOME_OUTROS: Record<GrupoInicio, [string, string]> = {
  VENCIDOS: ["vencido", "vencidos"], HOJE: ["para hoje", "para hoje"], ACOMPANHAR: ["a acompanhar", "a acompanhar"], ESPERANDO: ["esperando alguém", "esperando alguém"],
};
/** O rodapé quando o limite cortou: "Mostrando 5 de 9. Os outros 4: 2 para hoje e 2 esperando alguém." */
export function peDoBloco(b: Pick<BlocoInicio, "total" | "mostrando" | "grupos">): string | null {
  if (b.mostrando >= b.total) return null;
  const partes = b.grupos.filter((g) => g.total > g.itens.length).map((g) => {
    const n = g.total - g.itens.length;
    return `${n} ${NOME_OUTROS[g.chave][n === 1 ? 0 : 1]}`;
  });
  const resto = b.total - b.mostrando;
  return `Mostrando ${b.mostrando} de ${b.total}. ${resto === 1 ? "O outro" : `Os outros ${resto}`}: ${juntarComE(partes)}.`;
}

/** A linha abaixo do título do bloco: "Os seus: 1 tarefa atrasada, 3 para hoje e 1 esperando o cliente". */
export function subtituloBloco(de: "MEUS" | "EQUIPE", b: Pick<BlocoInicio, "grupos">, nomes: Partial<Record<GrupoInicio, [string, string]>>, prefixo?: string): string {
  const quem = prefixo ?? (de === "EQUIPE" ? "Da equipe" : "Os seus");
  const partes = b.grupos.map((g) => {
    const n = nomes[g.chave] ?? NOME_OUTROS[g.chave];
    return `${g.total} ${n[g.total === 1 ? 0 : 1]}`;
  });
  return partes.length ? `${quem}: ${juntarComE(partes)}` : `${quem}: nada para hoje`;
}

export interface Cartao {
  /** Classe do disco: pd-venc (vencido), hoje (âmbar), ar-ok (em dia). */
  disco: "pd-venc" | "hoje" | "ar-ok";
  n: number;
  titulo: string;
  sub: string;
  segundo: string;
}

const pl = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

export function cartaoComercial(c: ContatosDoInicio & { propostasEsperando?: number }, hoje: string): Cartao {
  const n = c.totalVencidos + c.totalHoje;
  const prop = c.propostasEsperando ?? 0;
  const segundo = prop ? `${prop} ${pl(prop, "proposta", "propostas")} ${c.de === "EQUIPE" ? "" : pl(prop, "sua ", "suas ")}esperando resposta`.replace("  ", " ") : "Nenhuma proposta esperando resposta";
  if (!n) return { disco: "ar-ok", n: 0, titulo: "Em dia", sub: c.proximo ? `próximo contato ${naData(c.proximo.em, hoje)}` : "nada marcado", segundo };
  if (c.totalVencidos) return { disco: "pd-venc", n, titulo: pl(n, "contato vencido", "contatos para retornar"), sub: `${c.totalVencidos} ${pl(c.totalVencidos, "vencido", "vencidos")}${c.totalHoje ? ` e ${c.totalHoje} para hoje` : ""}`, segundo };
  return { disco: "hoje", n, titulo: pl(n, "contato para hoje", "contatos para hoje"), sub: c.hoje.slice(0, 2).map((x) => x.nome).join(", "), segundo };
}

export function cartaoContratos(c: InicioContratos, hoje: string): Cartao {
  const ass = c.assinaturas;
  const segundo = ass ? `${ass} ${pl(ass, "contrato esperando", "contratos esperando")} a assinatura` : "Nenhuma assinatura marcada esta semana";
  const base = c.grupos.flatMap((g) => g.itens).find((i) => i.tipo === "BASE");
  if (!c.pedem) return { disco: "ar-ok", n: 0, titulo: "Em dia", sub: c.proximo ? `próxima base ${naData(c.proximo.em, hoje)}` : "nenhuma cobrança parada", segundo };
  return {
    disco: c.grupos.some((g) => g.chave === "VENCIDOS") ? "pd-venc" : "hoje", n: c.pedem,
    titulo: pl(c.pedem, "cobrança parada", "cobranças paradas"),
    sub: base && base.tipo === "BASE" ? `base de ${nomeDoMes(base.em)} de ${primeiroNome(base.cliente.nome)}` : "sem a base do mês", segundo,
  };
}

export function cartaoFinanceiro(f: InicioFinanceiro, hoje: string): Cartao & { terceiros: boolean } {
  const t = f.terceiros;
  const segundo = t.total
    ? `De terceiros: ${t.atrasados ? `${t.atrasados} ${pl(t.atrasados, "repasse atrasado", "repasses atrasados")}` : `${t.total} ${pl(t.total, "repasse pendente", "repasses pendentes")}`}`
    : "De terceiros: nenhum repasse pendente";
  const v = f.escritorio.vencidas;
  if (v) return { disco: "pd-venc", n: v, titulo: pl(v, "parcela vencida", "parcelas vencidas"), sub: `${reais(f.escritorio.valorVencido)} do escritório`, segundo, terceiros: true };
  const hojeN = f.escritorio.grupos.find((g) => g.chave === "HOJE")?.total ?? 0;
  if (hojeN) return { disco: "hoje", n: hojeN, titulo: pl(hojeN, "parcela vence hoje", "parcelas vencem hoje"), sub: "do escritório", segundo, terceiros: true };
  const p = f.escritorio.proximo;
  return { disco: "ar-ok", n: 0, titulo: "Em dia", sub: p ? `próxima entrada ${naData(p.em, hoje)}` : "nada a receber agora", segundo, terceiros: true };
}

export function cartaoJuridico(j: InicioJuridico, hoje: string): Cartao {
  const ph = j.prazosHoje;
  const segundo = ph ? `${ph} ${pl(ph, "prazo", "prazos")} para fazer até hoje` : "Nenhum prazo para hoje";
  if (!j.pedem) return { disco: "ar-ok", n: 0, titulo: "Em dia", sub: j.proximo ? `próximo ${naData(j.proximo.em, hoje)}` : "nada marcado", segundo };
  const hojeN = j.pedem - j.atrasadas;
  if (j.atrasadas) return { disco: "pd-venc", n: j.atrasadas, titulo: pl(j.atrasadas, "item atrasado", "itens atrasados"), sub: hojeN ? `e ${hojeN} para hoje` : "nada mais para hoje", segundo };
  return { disco: "hoje", n: hojeN, titulo: pl(hojeN, "item para hoje", "itens para hoje"), sub: "prazos e tarefas", segundo };
}

/** O hero: quantos itens pedem a pessoa hoje e os compromissos de hoje (decisão 10). */
export function diaDoInicio(r: ResumoInicio): { n: number; titulo: string; sub: string }[] {
  const areas = r.areas.length;
  const itens: { n: number; titulo: string; sub: string }[] = [];
  if (areas) {
    itens.push({
      n: r.total, titulo: r.total === 1 ? "pede você hoje" : "pedem você hoje",
      sub: areas === 1 ? `em ${AREAS_PORTAL[r.areas[0] as AreaPortal]}` : `nas suas ${areas} áreas`,
    });
  }
  const p = r.proximoCompromisso;
  const tipo = p ? (p.tipoEscrito ?? { AUDIENCIA: "audiência", CLIENTE: "cliente", ASSINATURA: "assinatura", INTERNO: "interno", OUTRO: "compromisso" }[p.tipo]) : null;
  itens.push({
    n: r.compromissos, titulo: r.compromissos === 1 ? "compromisso hoje" : "compromissos hoje",
    sub: p && tipo ? `${tipo.toLowerCase()} às ${horaDe(p.inicio).replace(":00", "h").replace(":", "h")}` : r.compromissos ? "nenhum mais hoje" : "agenda livre",
  });
  return itens;
}
