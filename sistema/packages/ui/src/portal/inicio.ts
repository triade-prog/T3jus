// Regras de tela do Início do Portal (F1.14, AP-06), separadas para testar sem navegador.

import type { ContatoDoDia, ContatosDoInicio } from "@t3jus/domain";
import { juntarComE } from "./clientes.ts";
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
