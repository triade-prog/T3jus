// Regras de tela do suporte de acesso (F1.3, PT-23), fora do componente para os testes.

import type { EscritorioDaPessoa, EventoSuporte, PessoaSuporte } from "@t3jus/domain";
import { VALIDADE_CONVITE_MS } from "./carteira.ts";

/** Endereço da página do suporte de acesso no Console. */
export const SUPORTE = "/suporte";

export const enderecoPessoa = (id: string, termo?: string) =>
  `${SUPORTE}?pessoa=${encodeURIComponent(id)}${termo ? `&q=${encodeURIComponent(termo)}` : ""}`;

export type SituacaoAcesso = "EM_DIA" | "CONVITE_PENDENTE" | "CONVITE_VENCIDO";

/** O convite mais novo da pessoa (cada escritório tem o seu). */
export function ultimoConvite(p: Pick<PessoaSuporte, "escritorios">): string | null {
  return p.escritorios.map((e) => e.conviteEnviadoEm).filter(Boolean).sort().at(-1) ?? null;
}

/** Quando o convite mais novo deixa de valer (1 hora depois de sair). */
export function conviteValeAte(p: Pick<PessoaSuporte, "escritorios">): string | null {
  const u = ultimoConvite(p);
  return u ? new Date(new Date(u).getTime() + VALIDADE_CONVITE_MS).toISOString() : null;
}

export function situacaoAcesso(p: Pick<PessoaSuporte, "escritorios" | "senhaCriadaEm">, agora: Date = new Date()): SituacaoAcesso {
  if (p.senhaCriadaEm) return "EM_DIA";
  const ate = conviteValeAte(p);
  return ate && new Date(ate).getTime() > agora.getTime() ? "CONVITE_PENDENTE" : "CONVITE_VENCIDO";
}

export const PAPEIS: Record<EscritorioDaPessoa["papel"], string> = { SOCIO: "Sócio", EQUIPE: "Equipe" };

/** Telefone para conferir a identidade: o da ficha do primeiro escritório que tem um. */
export function telefoneParaConferir(p: Pick<PessoaSuporte, "escritorios">): { escritorio: string; telefone: string } | null {
  const e = p.escritorios.find((x) => x.telefone);
  return e ? { escritorio: e.nome, telefone: e.telefone! } : null;
}

/** "mandou link de nova senha" e o detalhe embaixo, do jeito do histórico aprovado. */
export function fraseSuporte(e: Pick<EventoSuporte, "acao" | "dados">): { fez: string; detalhe: string | null } {
  const n = e.dados.aparelhos ?? 0;
  const aparelhos = `${n} ${n === 1 ? "aparelho desconectado" : "aparelhos desconectados"}`;
  switch (e.acao) {
    case "suporte.link_senha":
      return { fez: "mandou link de nova senha", detalhe: "Para o e-mail cadastrado · vale 1 hora" };
    case "suporte.desconectou":
      return { fez: "desconectou de todos os aparelhos", detalhe: aparelhos };
    case "suporte.tirou_autenticador":
      return {
        fez: "tirou o autenticador",
        detalhe: `${e.dados.identidade_conferida ? "Identidade conferida pelo telefone da ficha · " : ""}${aparelhos}`,
      };
    case "suporte.reenviou_convite":
      return { fez: "reenviou o convite", detalhe: "Para o e-mail do convite · vale 1 hora" };
    default:
      return { fez: "registrou um atendimento", detalhe: null };
  }
}

/** Termo marcado no nome: partes para a tela pôr <mark> sem montar HTML. */
export function marcarTermo(texto: string, termo: string): { t: string; marca: boolean }[] {
  const q = termo.trim().toLowerCase();
  const i = q ? texto.toLowerCase().indexOf(q) : -1;
  if (i < 0) return [{ t: texto, marca: false }];
  return [
    { t: texto.slice(0, i), marca: false },
    { t: texto.slice(i, i + q.length), marca: true },
    { t: texto.slice(i + q.length), marca: false },
  ].filter((p) => p.t);
}

/** Agrupa o histórico por dia (horário de Brasília); o dia de hoje leva "· hoje". */
export function agruparPorDiaSuporte<E extends { ocorridoEm: string }>(eventos: E[], agora: Date = new Date()): { dia: string; eventos: E[] }[] {
  const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
  const hoje = fmt.format(agora);
  const grupos: { dia: string; eventos: E[] }[] = [];
  for (const e of eventos) {
    const d = fmt.format(new Date(e.ocorridoEm));
    const dia = d === hoje ? `${d} · hoje` : d;
    const ultimo = grupos.at(-1);
    if (ultimo?.dia === dia) ultimo.eventos.push(e);
    else grupos.push({ dia, eventos: [e] });
  }
  return grupos;
}
