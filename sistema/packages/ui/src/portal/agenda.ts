// Regras de tela da Agenda (docs/design/aprovadas/portal-agenda-conversas): datas no horário de
// Brasília, períodos de mês, semana e dia, posição na grade e textos. Sem React, com testes.

import { TIPOS_COMPROMISSO_CURTO, type CompromissoLinha, type TipoCompromisso } from "@t3jus/domain";

export type VisaoAgenda = "mes" | "semana" | "dia";

/** Brasília não tem horário de verão desde 2019: o fuso é sempre -03:00. */
export const FUSO = "-03:00";
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const DIAS_SEMANA = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
export const DIAS_CURTOS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Grade da semana: das 8h às 19h, 60 px por hora. */
export const HORA_INICIO = 8;
export const HORA_FIM = 19;

const utc = (d: string) => new Date(`${d}T12:00:00Z`);
const iso = (x: Date) => x.toISOString().slice(0, 10);

export function somarDias(d: string, n: number): string {
  const x = utc(d);
  x.setUTCDate(x.getUTCDate() + n);
  return iso(x);
}

/** 0 = segunda ... 6 = domingo. */
export function diaDaSemana(d: string): number {
  return (utc(d).getUTCDay() + 6) % 7;
}

export function inicioDaSemana(d: string): string {
  return somarDias(d, -diaDaSemana(d));
}

export const numeroDoDia = (d: string) => Number(d.slice(8, 10));
export const nomeDoMes = (d: string) => MESES[Number(d.slice(5, 7)) - 1]!;
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Dias da grade do mês: de segunda antes do dia 1 ao domingo depois do último dia. */
export function gradeDoMes(d: string): string[] {
  const primeiro = `${d.slice(0, 7)}-01`;
  const ini = inicioDaSemana(primeiro);
  const ultimo = somarDias(`${somarDias(primeiro, 32).slice(0, 7)}-01`, -1);
  const fim = somarDias(ultimo, 6 - diaDaSemana(ultimo));
  const dias: string[] = [];
  for (let x = ini; x <= fim; x = somarDias(x, 1)) dias.push(x);
  return dias;
}

/** Período carregado e o título de cada visão. */
export function periodo(vis: VisaoAgenda, d: string): { de: string; ate: string; titulo: string; ant: string; prox: string } {
  if (vis === "mes") {
    const g = gradeDoMes(d);
    const p = `${d.slice(0, 7)}-01`;
    return { de: g[0]!, ate: g.at(-1)!, titulo: `${maiuscula(nomeDoMes(d))} de ${d.slice(0, 4)}`, ant: somarDias(p, -1).slice(0, 7) + "-01", prox: somarDias(p, 32).slice(0, 7) + "-01" };
  }
  if (vis === "dia") {
    return { de: d, ate: d, titulo: `${maiuscula(diaLongo(d))} de ${d.slice(0, 4)}`, ant: somarDias(d, -1), prox: somarDias(d, 1) };
  }
  const ini = inicioDaSemana(d);
  const fim = somarDias(ini, 6);
  const titulo = nomeDoMes(ini) === nomeDoMes(fim)
    ? `${numeroDoDia(ini)} a ${numeroDoDia(fim)} de ${nomeDoMes(fim)} de ${fim.slice(0, 4)}`
    : `${numeroDoDia(ini)} de ${nomeDoMes(ini)}${ini.slice(0, 4) === fim.slice(0, 4) ? "" : ` de ${ini.slice(0, 4)}`} a ${numeroDoDia(fim)} de ${nomeDoMes(fim)} de ${fim.slice(0, 4)}`;
  return { de: ini, ate: fim, titulo, ant: somarDias(ini, -7), prox: somarDias(ini, 7) };
}

/** "quarta, 18 de novembro" */
export function diaLongo(d: string): string {
  return `${DIAS_SEMANA[diaDaSemana(d)]}, ${numeroDoDia(d)} de ${nomeDoMes(d)}`;
}

/** "18/11" */
export const diaCurto = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
/** "18/11/2026" */
export const diaBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

function partes(isoHora: string): { dia: string; hora: string } {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(isoHora));
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { dia: `${v("year")}-${v("month")}-${v("day")}`, hora: `${v("hour")}:${v("minute")}` };
}

/** Dia (aaaa-mm-dd) em Brasília de um instante. */
export const diaDe = (isoHora: string) => partes(isoHora).dia;
/** Hora (hh:mm) em Brasília de um instante. */
export const horaDe = (isoHora: string) => partes(isoHora).hora;
export function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}
/** Instante em Brasília: "2026-11-19" + "16:00". */
export const instante = (dia: string, hhmm: string) => `${dia}T${hhmm}:00${FUSO}`;

/** Posição na grade da semana (px desde as 8h) e altura (mínimo de 44 px). */
export function posicaoNaGrade(c: Pick<CompromissoLinha, "inicio" | "fim">, dia: string): { topo: number; altura: number } {
  const ini = diaDe(c.inicio) < dia ? 0 : minutos(horaDe(c.inicio));
  const fim = diaDe(c.fim) > dia ? 24 * 60 : minutos(horaDe(c.fim));
  const limite = (HORA_FIM - HORA_INICIO) * 60;
  const topo = Math.max(0, Math.min(limite - 44, ini - HORA_INICIO * 60));
  const altura = Math.max(44, Math.min(limite - topo, fim - Math.max(ini, HORA_INICIO * 60) - 2));
  return { topo, altura };
}

/** O nome do tipo como aparece na agenda: o escrito, no "Outro". */
export function nomeDoTipo(c: Pick<CompromissoLinha, "tipo" | "tipoEscrito">): string {
  return c.tipo === "OUTRO" ? (c.tipoEscrito ?? "Outro") : TIPOS_COMPROMISSO_CURTO[c.tipo];
}

/** Cor do filete: repete o tipo (nada depende só dela, o tipo vem escrito). Tipo escrito usa vinho-3. */
export const COR_TIPO: Record<TipoCompromisso, string> = {
  AUDIENCIA: "var(--vinho)",
  CLIENTE: "var(--ambar)",
  ASSINATURA: "var(--vinho-2)",
  INTERNO: "var(--vinho-4)",
  OUTRO: "var(--vinho-3)",
};

export function jaPassou(c: Pick<CompromissoLinha, "fim">, agora = new Date()): boolean {
  return new Date(c.fim).getTime() <= agora.getTime();
}

/** Os compromissos que tocam um dia, por ordem de início. */
export function doDia<T extends Pick<CompromissoLinha, "inicio" | "fim">>(lista: T[], dia: string): T[] {
  return lista.filter((c) => diaDe(c.inicio) <= dia && diaDe(c.fim) >= dia && !(diaDe(c.fim) === dia && horaDe(c.fim) === "00:00" && diaDe(c.inicio) < dia));
}

/** Horários livres de pelo menos 90 minutos depois de agora, entre 8h e 19h (visão Dia). */
export function horariosLivres(lista: Pick<CompromissoLinha, "inicio" | "fim" | "situacao">[], dia: string, agoraMin: number | null): { de: string; ate: string | null }[] {
  const ocupados = lista.filter((c) => c.situacao === "MARCADO")
    .map((c) => [diaDe(c.inicio) < dia ? 0 : minutos(horaDe(c.inicio)), diaDe(c.fim) > dia ? 24 * 60 : minutos(horaDe(c.fim))] as const)
    .sort((a, b) => a[0] - b[0]);
  const livres: { de: number; ate: number | null }[] = [];
  let cursor = Math.max(HORA_INICIO * 60, agoraMin ?? 0);
  for (const [i, f] of ocupados) {
    if (i - cursor >= 90) livres.push({ de: cursor, ate: i });
    cursor = Math.max(cursor, f);
  }
  if (cursor < HORA_FIM * 60) livres.push({ de: cursor, ate: null });
  const hh = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return livres.map((l) => ({ de: hh(l.de), ate: l.ate === null ? null : hh(l.ate) }));
}

/** Os dois lembretes ao cliente: 1 dia antes, no mesmo horário, e 2 horas antes. */
export function horariosDoLembrete(inicio: string): { umDia: string; duasHoras: string } {
  const t = new Date(inicio).getTime();
  return { umDia: new Date(t - 24 * 3600e3).toISOString(), duasHoras: new Date(t - 2 * 3600e3).toISOString() };
}

/** "quarta, às 16:00" */
export function quandoCurto(isoHora: string): string {
  return `${DIAS_SEMANA[diaDaSemana(diaDe(isoHora))]}, às ${horaDe(isoHora)}`;
}

/** Endereço da Agenda com a visão, o dia e a pessoa. */
export function rotaAgenda(o: { ver?: VisaoAgenda; dia?: string; pessoa?: string | null }): string {
  const q = new URLSearchParams();
  if (o.ver && o.ver !== "semana") q.set("ver", o.ver);
  if (o.dia) q.set("dia", o.dia);
  if (o.pessoa) q.set("pessoa", o.pessoa);
  const s = q.toString();
  return s ? `/agenda?${s}` : "/agenda";
}

/** "1 compromisso", "4 compromissos". */
export const contar = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Lê "19/11/2026" como aaaa-mm-dd; data impossível vira nulo. */
export function lerDia(texto: string): string | null {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(texto);
  if (!m) return null;
  const d = `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return iso(utc(d)) === d ? d : null;
}

/** Lê "9:30" ou "09:30". */
export function lerHorario(texto: string): string | null {
  const m = /^\s*(\d{1,2})(?::|h)(\d{2})\s*$/.exec(texto);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return `${m[1]!.padStart(2, "0")}:${m[2]}`;
}
