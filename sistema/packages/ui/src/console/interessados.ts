// Regras da tela Comercial › Interessados (F2.3, SC-05), separadas para teste: filtros, números
// do alto, prazo do próximo passo e a frase de cada evento do histórico.
// Desenho aprovado: docs/design/aprovadas/site-comercial/interessados.html.

import {
  ESTAGIOS_INTERESSADO,
  ESTAGIOS_ABERTOS,
  ORIGENS_INTERESSADO,
  type EstagioInteressado,
  type EventoInteressado,
  type Interessado,
  type OrigemInteressado,
} from "@t3jus/domain";
import type { NomeIcone } from "../Icone.tsx";

export type Chip = "ANDAMENTO" | "NOVOS" | "VENCIDOS" | "CLIENTES" | "FECHADOS" | "TODOS";
export const CHIPS: { chave: Chip; nome: string }[] = [
  { chave: "ANDAMENTO", nome: "Em andamento" },
  { chave: "NOVOS", nome: "Novos" },
  { chave: "VENCIDOS", nome: "Vencidos" },
  { chave: "CLIENTES", nome: "Clientes" },
  { chave: "FECHADOS", nome: "Perdidos e descartados" },
  { chave: "TODOS", nome: "Todos" },
];

/** Selo de cada estágio: classe e ícone (desenho aprovado). */
export const SELO_ESTAGIO: Record<EstagioInteressado, { classe: string; icone: NomeIcone }> = {
  NOVO: { classe: "selo-atencao", icone: "mais" },
  EM_CONTATO: { classe: "selo-ok", icone: "telefone" },
  DEMONSTRACAO: { classe: "selo-implant", icone: "agenda" },
  PROPOSTA: { classe: "selo-neutro", icone: "envelope" },
  CLIENTE: { classe: "selo-ativo", icone: "check" },
  PERDIDO: { classe: "selo-apagada", icone: "xis" },
  DESCARTADO: { classe: "selo-apagada", icone: "guardar" },
};

export const ICONE_ORIGEM: Record<OrigemInteressado, NomeIcone> = { SITE: "janela", INDICACAO: "pessoas", EVENTO: "agenda", CONTATO: "envelope" };

/** Cor da barra de cada estágio no funil. */
export const COR_FUNIL: Partial<Record<EstagioInteressado, string>> = {
  NOVO: "var(--ambar)", EM_CONTATO: "var(--vinho-4)", DEMONSTRACAO: "var(--vinho-3)", PROPOSTA: "var(--vinho-2)", CLIENTE: "var(--vinho)",
};

export const aberto = (i: Pick<Interessado, "estagio">) => (ESTAGIOS_ABERTOS as readonly string[]).includes(i.estagio);

export type Prazo = "venc" | "hoje" | "";

/** Próximo passo vencido, de hoje ou no prazo (só para quem está em andamento). */
export function prazo(i: Interessado, hoje: string): Prazo {
  const d = i.proximo?.data;
  if (!aberto(i) || !d) return "";
  if (d < hoje) return "venc";
  return d === hoje ? "hoje" : "";
}

/** "2026-11-26" → "26/11"; com o ano quando é outro ano. */
export function diaMes(iso: string, hoje: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return a === hoje.slice(0, 4) ? `${d}/${m}` : `${d}/${m}/${a}`;
}

export function dataBrInteira(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** "18:00" → "18h00". */
export const horaBr = (h: string) => h.replace(":", "h");

/** Dias entre duas datas (aaaa-mm-dd). */
export function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(ate) - Date.parse(de)) / 86_400_000);
}

/** Quando, como na lista: "venceu em 18/11", "hoje", "25/11, 15h", "até 22/11". */
export function quandoPasso(i: Interessado, hoje: string): string {
  const p = i.proximo;
  if (!p?.data) return "";
  const t = prazo(i, hoje);
  if (t === "venc") return `venceu em ${diaMes(p.data, hoje)}`;
  if (t === "hoje") return p.hora ? `hoje, ${horaBr(p.hora)}` : "hoje";
  const base = diaMes(p.data, hoje);
  if (p.hora) return `${base}, ${horaBr(p.hora)}`;
  return i.estagio === "NOVO" ? `até ${base}` : base;
}

const semAcento = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export interface FiltroInteressados {
  chip: Chip;
  busca: string;
  /** "" todos, "MEUS", "SEM" ou o id de uma pessoa. */
  responsavel: string;
  origem: "" | OrigemInteressado;
}

export function passaNoChip(i: Interessado, chip: Chip, hoje: string): boolean {
  switch (chip) {
    case "ANDAMENTO": return aberto(i);
    case "NOVOS": return i.estagio === "NOVO";
    case "VENCIDOS": return prazo(i, hoje) === "venc";
    case "CLIENTES": return i.estagio === "CLIENTE";
    case "FECHADOS": return i.estagio === "PERDIDO" || i.estagio === "DESCARTADO";
    case "TODOS": return true;
  }
}

export function filtrar(lista: Interessado[], f: FiltroInteressados, hoje: string, eu: string | undefined): Interessado[] {
  const q = semAcento(f.busca.trim());
  return lista.filter((i) => {
    if (!passaNoChip(i, f.chip, hoje)) return false;
    if (f.origem && i.origem !== f.origem) return false;
    if (f.responsavel === "MEUS" && i.responsavel?.id !== eu) return false;
    if (f.responsavel === "SEM" && i.responsavel) return false;
    if (f.responsavel && f.responsavel !== "MEUS" && f.responsavel !== "SEM" && i.responsavel?.id !== f.responsavel) return false;
    if (q && ![i.escritorio, i.nome, i.email ?? "", i.cidade ?? ""].some((v) => semAcento(v).includes(q))) return false;
    return true;
  });
}

export function contarChips(lista: Interessado[], hoje: string): Record<Chip, number> {
  const c = { ANDAMENTO: 0, NOVOS: 0, VENCIDOS: 0, CLIENTES: 0, FECHADOS: 0, TODOS: 0 } as Record<Chip, number>;
  for (const i of lista) for (const { chave } of CHIPS) if (passaNoChip(i, chave, hoje)) c[chave]++;
  return c;
}

/** Os números do alto: sem responsável, vencidos (com quem e há quanto) e o funil. */
export function numeros(lista: Interessado[], hoje: string) {
  const sem = lista.filter((i) => aberto(i) && !i.responsavel);
  const vencidos = lista.filter((i) => prazo(i, hoje) === "venc")
    .map((i) => ({ nome: i.escritorio.split(/\s+/)[0]!, dias: diasEntre(i.proximo!.data!, hoje) }));
  const funil = (["NOVO", "EM_CONTATO", "DEMONSTRACAO", "PROPOSTA", "CLIENTE"] as const).map((e) => ({
    estagio: e, nome: ESTAGIOS_INTERESSADO[e], quantos: lista.filter((i) => i.estagio === e).length,
  }));
  return { sem, vencidos, funil };
}

export const nomeMes = (hoje: string) =>
  ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"][Number(hoje.slice(5, 7)) - 1]!;

const est = (v: unknown) => (typeof v === "string" && v in ESTAGIOS_INTERESSADO ? ESTAGIOS_INTERESSADO[v as EstagioInteressado] : String(v ?? ""));

/** A frase do histórico: quem (em negrito, na tela) e o que fez; o detalhe vai embaixo. */
export function fraseEvento(e: EventoInteressado): { quem: string; texto: string; detalhe?: string; forte: boolean } {
  const d = e.dados;
  const quem = e.autor?.nome ?? "O site";
  const motivo = typeof d.motivo === "string" ? `Motivo: “${d.motivo}”` : undefined;
  switch (e.acao) {
    case "pedido.recebido": return { quem: "O site", texto: "registrou o pedido de demonstração, com a autorização de dados", forte: false };
    case "pedido.repetido": return { quem: "O site", texto: "recebeu outro pedido da mesma pessoa", detalhe: "Fica neste interessado; não cria outro.", forte: false };
    case "resposta.enviada": return { quem: "O site", texto: "mandou a resposta automática por e-mail", forte: false };
    case "resposta.falhou": return { quem: "O site", texto: "não conseguiu mandar a resposta automática", detalhe: "Responda à pessoa por WhatsApp ou e-mail.", forte: false };
    case "responsavel.ficou": return { quem, texto: "ficou com o pedido", forte: true };
    case "responsavel.atribuido":
      return { quem, texto: `atribuiu o pedido a ${String(d.para_nome ?? "")}`, detalhe: typeof d.recado === "string" ? `Recado: “${d.recado}”` : undefined, forte: true };
    case "responsavel.saiu": return { quem: "O sistema", texto: `tirou ${String(d.nome ?? "a pessoa")} de responsável, porque saiu da equipe ou da função`, forte: false };
    case "proximo.mudou":
      return { quem, texto: `mudou o próximo passo para “${String(d.passo ?? "")}”`, detalhe: [d.data ? `Data: ${dataBrInteira(String(d.data))}` : "", d.hora ? horaBr(String(d.hora)) : "", d.quem_nome ? String(d.quem_nome) : ""].filter(Boolean).join(" · "), forte: false };
    case "cidade.completada": return { quem, texto: "completou a cidade", forte: false };
    case "estagio.mudou": return { quem, texto: `passou de ${est(d.de)} para ${est(d.para)}`, detalhe: motivo, forte: true };
    case "encerrado":
      return { quem, texto: `encerrou como ${est(d.como)} · ${String(d.porque ?? "")}`, detalhe: [motivo, d.procurar_em ? `Procurar de novo em ${dataBrInteira(String(d.procurar_em))}` : ""].filter(Boolean).join(" · "), forte: true };
    case "reaberto": return { quem, texto: `reabriu (era ${est(d.de)})`, detalhe: motivo, forte: true };
    case "interessado.cadastrado": {
      const org = ORIGENS_INTERESSADO[String(d.origem) as OrigemInteressado] ?? "";
      return {
        quem, texto: `cadastrou o interessado à mão · ${org}`,
        detalhe: [d.detalhe ? `De onde veio: “${String(d.detalhe)}”.` : "", d.sabe === false ? "A pessoa ainda não sabe." : d.sabe === true ? "A pessoa sabe do contato." : "",
          d.responsavel_nome ? `Responsável: ${String(d.responsavel_nome)}.` : "", d.repetido_nome ? `Cadastrado mesmo havendo ${String(d.repetido_nome)} com o mesmo contato.` : ""].filter(Boolean).join(" "),
        forte: true,
      };
    }
    case "contato.repetido":
      return { quem, texto: "juntou um contato novo a este interessado", detalhe: d.detalhe ? `De onde veio: “${String(d.detalhe)}”. O que foi escrito está nas notas.` : undefined, forte: false };
    case "convertido": return { quem, texto: `cadastrou o escritório ${String(d.escritorio_nome ?? "")} a partir deste interessado`, detalhe: motivo, forte: true };
    default: return { quem, texto: e.acao, forte: false };
  }
}

export const ORIGENS = Object.entries(ORIGENS_INTERESSADO) as [OrigemInteressado, string][];

/** "26/11/2026" (ou "26/11/26") → "2026-11-26"; inválida → null. */
export function lerDataBr(v: string): string | null {
  const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return null;
  const a = m[3]!.length === 2 ? `20${m[3]}` : m[3]!;
  const iso = `${a}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
}

/** "18h00", "18:00" ou "18h" → "18:00"; inválida → null. */
export function lerHora(v: string): string | null {
  const m = v.trim().toLowerCase().match(/^(\d{1,2})\s*[h:]\s*(\d{2})?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? "0");
  return h > 23 || min > 59 ? null : `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
