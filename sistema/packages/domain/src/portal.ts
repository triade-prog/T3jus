// Portal do advogado: áreas e equipe do escritório (PA-01, PA-02).
// Os mesmos valores estão no banco (0140_portal_equipe.sql); os testes conferem os dois.

import { z } from "zod";

/** Áreas que o sócio dono libera pessoa por pessoa. As partes comuns todo mundo vê. */
export const AREAS_PORTAL = {
  COMERCIAL: "Comercial",
  CONTRATOS: "Contratos",
  FINANCEIRO: "Financeiro",
  JURIDICO: "Jurídico",
} as const;
export type AreaPortal = keyof typeof AREAS_PORTAL;

const chaves = Object.keys(AREAS_PORTAL) as [AreaPortal, ...AreaPortal[]];
const areas = z.array(z.enum(chaves)).max(4).transform((a) => [...new Set(a)]);
const uuid = z.string().uuid().transform((s) => s.toLowerCase());

export const convidarEquipeSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().max(254).email(),
  areas,
});

export const areasSchema = z.object({ areas });

/** Retirar alguém: quem já entrou precisa de alguém para receber o que era dela (EX-10). */
export const retirarEquipeSchema = z.object({
  versao: z.number().int().min(1),
  passarPara: uuid.nullable().default(null),
});

/** Pessoa na equipe do escritório, como a API devolve. */
export interface PessoaEquipePortal {
  vinculoId: string;
  pessoaId: string;
  nome: string;
  email: string | null;
  dono: boolean;
  areas: AreaPortal[];
  desde: string;
  versao: number;
  senhaCriadaEm: string | null;
  conviteEnviadoEm: string;
}
