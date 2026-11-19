// Suporte de acesso pelo Console (F1.3, PT-23). A equipe T3jus nunca vê nem escolhe a senha:
// o link vai só para o e-mail já cadastrado, e o e-mail nunca muda por aqui (decisão 5 da
// Carol, 18/11/2026). Toda ação pede o motivo, que fica só no histórico do Console.

import { z } from "zod";
import type { SaidaPessoa } from "./contrato.ts";

const motivo = z.string().trim().min(1).max(300);

export const motivoSuporteSchema = z.object({ motivo });

/** Tirar o autenticador: uma pessoa basta, desde que confira a identidade pelo telefone (decisão 2). */
export const tirarAutenticadorSchema = z.object({ motivo, identidadeConferida: z.literal(true) });

export const buscaSuporteSchema = z.object({ q: z.string().trim().min(2).max(120) });

/** Papel da pessoa num escritório, do jeito do Portal. */
export type PapelPortal = "SOCIO" | "EQUIPE";

export interface EscritorioDaPessoa {
  id: string;
  nome: string;
  papel: PapelPortal;
  /** Último convite (o primeiro ou um reenvio). */
  conviteEnviadoEm: string;
  /** Telefone da ficha do escritório, para conferir a identidade. */
  telefone: string | null;
  /** Quando a pessoa foi retirada deste escritório (F0.14); sem isso, ela está nele. */
  retiradoEm?: string;
}

/** Pessoa achada na busca do suporte. */
export interface PessoaSuporte {
  id: string;
  nome: string;
  email: string | null;
  senhaCriadaEm: string | null;
  escritorios: EscritorioDaPessoa[];
}

/** Ficha de acesso: o que o banco sabe mais o que só o Auth sabe. */
export interface FichaAcesso extends PessoaSuporte {
  podeAgir: boolean;
  /** Sessões ainda válidas (decisão 4: só o número, sem lista de aparelhos). */
  aparelhos: number;
  emailConfirmado: boolean;
  ultimaEntrada: string | null;
  /** Desde quando tem o autenticador; null quando não tem. */
  autenticadorDesde: string | null;
  /** Sem nenhum acesso: quando a entrada some, ou quando sumiu (F0.14). */
  saida?: SaidaPessoa | null;
}

export interface EventoSuporte {
  ocorridoEm: string;
  autor: { id: string; nome: string | null } | null;
  acao: "suporte.link_senha" | "suporte.desconectou" | "suporte.tirou_autenticador" | "suporte.reenviou_convite";
  dados: { motivo?: string; aparelhos?: number; identidade_conferida?: boolean };
}

/**
 * "ma***@ribeiromatos.adv.br": nas janelas, para quem liga se passando pela pessoa não
 * descobrir o e-mail (desenho aprovado). Até duas letras do começo ficam à vista.
 */
export function mascararEmail(email: string): string {
  const arroba = email.lastIndexOf("@");
  if (arroba < 1) return "***";
  const usuario = email.slice(0, arroba);
  return `${usuario.slice(0, Math.min(2, usuario.length - 1) || 1)}***${email.slice(arroba)}`;
}
