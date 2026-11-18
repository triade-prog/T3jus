// Regras de tela da Equipe do escritório (PA-02): situação do convite, nomes das áreas e as
// frases do histórico da equipe. Funções puras, testadas em portal.test.ts.

import { AREAS_PORTAL, type AreaPortal, type PessoaEquipePortal } from "@t3jus/domain";
import { VALIDADE_CONVITE_MS } from "../console/carteira.ts";
import { hora } from "../console/tempo.ts";

const FUSO = "America/Sao_Paulo";

function diaEm(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** "Comercial", "Comercial e Jurídico", "Comercial, Contratos e Jurídico". */
export function listaAreas(areas: readonly string[]): string {
  const nomes = areas.map((a) => (a in AREAS_PORTAL ? AREAS_PORTAL[a as AreaPortal] : a));
  if (nomes.length <= 1) return nomes[0] ?? "";
  return `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`;
}

/** Primeiro nome, para os textos curtos ("Retirar Diego"). */
export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

export type SituacaoEquipe = { tipo: "ativa" } | { tipo: "pendente"; vence: string } | { tipo: "vencido"; venceu: string };

/** Quando o horário cai: "15h05", "ontem, às 17h40", "12/11, às 9h00". */
function quando(fim: Date, agora: Date, hoje: boolean): string {
  const h = hora(fim.toISOString());
  if (hoje) return h;
  if (diaEm(fim) === diaEm(new Date(agora.getTime() - 24 * 60 * 60 * 1000))) return `ontem, às ${h}`;
  const dm = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit" }).format(fim);
  return `${dm}, às ${h}`;
}

/** Ativa (já criou a senha), convite pendente (vale até…) ou convite vencido (venceu…). */
export function situacaoNaEquipe(p: Pick<PessoaEquipePortal, "senhaCriadaEm" | "conviteEnviadoEm">, agora: Date = new Date()): SituacaoEquipe {
  if (p.senhaCriadaEm) return { tipo: "ativa" };
  const fim = new Date(new Date(p.conviteEnviadoEm).getTime() + VALIDADE_CONVITE_MS);
  const hoje = diaEm(fim) === diaEm(agora);
  if (fim.getTime() > agora.getTime()) return { tipo: "pendente", vence: `vale até ${quando(fim, agora, hoje)}` };
  return { tipo: "vencido", venceu: `venceu ${hoje ? "às " : ""}${quando(fim, agora, hoje)}` };
}

/** Evento do histórico da equipe, como GET /v1/escritorio/equipe/historico devolve. */
export interface EventoEquipe {
  id: number;
  ocorridoEm: string;
  autor: { id: string; nome: string | null } | null;
  acao: string;
  entidadeId: string | null;
  dados: Record<string, unknown> | null;
  /** Nome de quem o evento cita (convidada, retirada…). */
  pessoa: string | null;
  /** Nome de quem recebeu o que era de quem saiu. */
  passouPara: string | null;
}

export interface FraseEquipe {
  quem: string | null;
  /** Partes da frase; as marcadas com `b` saem em negrito. */
  fez: { t: string; b?: boolean }[];
  detalhe?: string;
  exportacao?: boolean;
}

const lista = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** A frase que a pessoa lê para cada evento da equipe. */
export function fraseEquipe(e: EventoEquipe): FraseEquipe {
  const quem = e.autor?.nome ?? null;
  const alguem = e.pessoa ?? "uma pessoa";
  const areas = lista(e.dados?.areas);
  switch (e.acao) {
    case "equipe.convidada":
      return { quem, fez: [{ t: "convidou " }, { t: alguem, b: true }], detalhe: areas.length ? `Áreas: ${listaAreas(areas)}` : "Só as partes comuns" };
    case "socio.convidado":
      return { quem, fez: [{ t: "convidou " }, { t: alguem, b: true }, { t: " como sócio dono" }] };
    case "equipe.areas_mudadas": {
      const antes = lista(e.dados?.antes);
      const depois = lista(e.dados?.depois);
      const entrou = depois.filter((a) => !antes.includes(a));
      const saiu = antes.filter((a) => !depois.includes(a));
      const ficou = depois.filter((a) => antes.includes(a));
      const partes = [
        entrou.length ? `Entrou: ${listaAreas(entrou)}` : "",
        saiu.length ? `Saiu: ${listaAreas(saiu)}` : "",
        ficou.length ? `Ficou: ${listaAreas(ficou)}` : "",
      ].filter(Boolean);
      return { quem, fez: [{ t: "mudou as áreas de " }, { t: alguem, b: true }], detalhe: partes.join(" · ") || "Só as partes comuns" };
    }
    case "equipe.convite_reenviado":
      return { quem, fez: [{ t: "reenviou o convite de " }, { t: alguem, b: true }], detalhe: "O link antigo deixou de valer" };
    case "equipe.convite_cancelado":
      return { quem, fez: [{ t: "cancelou o convite de " }, { t: alguem, b: true }] };
    case "equipe.retirada": {
      const primeiro = e.pessoa ? primeiroNome(e.pessoa) : "quem saiu";
      return {
        quem,
        fez: e.passouPara
          ? [{ t: "retirou " }, { t: alguem, b: true }, { t: ` da equipe; o que era de ${primeiro} passou para ` }, { t: e.passouPara, b: true }]
          : [{ t: "retirou " }, { t: alguem, b: true }, { t: " da equipe" }],
        detalhe: `Tarefas, prazos, cobranças e atendimentos · a autoria do que ${primeiro} registrou não mudou`,
      };
    }
    case "escritorio.exportado":
      return { quem, fez: [{ t: "exportou os dados do escritório" }], detalhe: "Arquivo JSON completo", exportacao: true };
    default:
      return { quem, fez: [{ t: "fez uma mudança na equipe" }] };
  }
}

/** "18/11/2026 · hoje": os eventos agrupados por dia, no horário de Brasília. */
export function agruparEventosPorDia<T extends { ocorridoEm: string }>(eventos: T[], agora: Date = new Date()): { dia: string; eventos: T[] }[] {
  const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" });
  const hoje = fmt.format(agora);
  const grupos: { dia: string; eventos: T[] }[] = [];
  for (const e of eventos) {
    const d = fmt.format(new Date(e.ocorridoEm));
    const dia = d === hoje ? `${d} · hoje` : d;
    const ultimo = grupos.at(-1);
    if (ultimo?.dia === dia) ultimo.eventos.push(e);
    else grupos.push({ dia, eventos: [e] });
  }
  return grupos;
}
