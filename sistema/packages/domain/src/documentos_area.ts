// Documentos marcados conforme a área (F3.170 e F3.171; CH-14), desenho aprovado em
// docs/design/aprovadas/portal-documentos-por-area (D36; Carol, 24/11/2026). "Tipo de processo" é a
// área do direito que o contrato e o caso já guardam (pergunta 1). O escritório diz, para cada área,
// quais documentos vêm marcados em Gerar documentos; até mudar, vale a sugestão do T3jus, igual à de
// hoje nas 8 áreas (pergunta 4). As regras de verdade (quem muda, versão, OUTRO ativo, gravar a área
// no contrato) ficam no banco (1070_documentos_por_area.sql); aqui ficam os esquemas, os tipos das
// respostas e as contas puras que a tela usa.

import { z } from "zod";
import type { PessoaRef } from "./clientes.ts";
import { AREAS_DIREITO, type AreaDireito } from "./juridico.ts";

/** As áreas na ordem da folha (a de Documentos para começar), com "Outra ou sem área" no fim. */
export const AREAS_DOCUMENTOS = ["PREVIDENCIARIO", "TRABALHISTA", "CIVEL", "CONSUMIDOR", "FAMILIA", "SAUDE", "TRIBUTARIO", "OUTRA"] as const satisfies readonly AreaDireito[];

/** A sugestão do T3jus: a mesma de hoje, nas 8 áreas (pergunta 4; revisão, ajuste 3). */
export const SUGESTAO_T3JUS_DOCUMENTOS = ["CONTRATO", "PROCURACAO", "HIPOSSUFICIENCIA"] as const;

/** A chave de um documento na lista: o tipo, ou "OUTRO:<modelo>" (como em documentos_gerados.chave). */
export const CHAVE_DOCUMENTO_AREA = /^(CONTRATO|PROCURACAO|HIPOSSUFICIENCIA|OUTRO:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

/** "Previdenciário", …, e "Outra ou sem área" (OUTRA vale também para o contrato sem área). */
export function rotuloAreaDocumentos(a: AreaDireito): string {
  return a === "OUTRA" ? "Outra ou sem área" : AREAS_DIREITO[a];
}

export const areaDocumentosSchema = z.enum(AREAS_DOCUMENTOS);

/** PUT /v1/escritorio/documentos/por-area/:area. Versão nula: a primeira gravação da área. */
export const salvarDocumentosAreaSchema = z.object({
  versao: z.number().int().min(1).nullable(),
  documentos: z.array(z.string().regex(CHAVE_DOCUMENTO_AREA)).max(12),
});
export type PedidoDocumentosArea = z.infer<typeof salvarDocumentosAreaSchema>;

/** Uma área da folha "Documentos por área". */
export interface LinhaDocumentosPorArea {
  area: AreaDireito;
  /** O que vem marcado hoje: a lista salva ou a sugestão, sem os modelos arquivados. */
  documentos: string[];
  sugestao: string[];
  igualSugestao: boolean;
  /** O escritório já salvou esta área (selo "Do escritório"). */
  salva: boolean;
  versao: number | null;
  atualizadoPor: PessoaRef | null;
  atualizadoEm: string | null;
}

/** Um modelo que pode vir marcado (os três de sempre e os outros documentos ativos do escritório). */
export interface ModeloDaArea {
  chave: string;
  tipo: "CONTRATO" | "PROCURACAO" | "HIPOSSUFICIENCIA" | "OUTRO";
  nome: string;
  doEscritorio: boolean;
  numero: number | null;
  enviadoEm: string | null;
}

/** GET /v1/escritorio/documentos/por-area. */
export interface DocumentosPorArea {
  podeEditar: boolean;
  /** Por que a folha está só para ler: o Portal só para consulta, ou a pessoa sem permissão. */
  leitura: "SO_CONSULTA" | "SEM_PERMISSAO" | null;
  areas: LinhaDocumentosPorArea[];
  modelos: ModeloDaArea[];
}

/** O que Gerar documentos recebe para abrir com os documentos da área (documentos-dados, "sugestao"). */
export interface SugestaoDocumentos {
  /** A área que o seletor começa: a do caso mais antigo, a do contrato ou OUTRA. */
  area: AreaDireito;
  origem: "CASO" | "CONTRATO" | null;
  casoNome: string | null;
  contratoArea: AreaDireito | null;
  areasDosCasos: AreaDireito[];
  porArea: Record<AreaDireito, string[]>;
  salvas: AreaDireito[];
  /** Pergunta 5: o que entrou numa lista salva depois da última geração deste contrato. */
  entraramDepois: Partial<Record<AreaDireito, { chave: string; em: string }[]>>;
  /** A área escolhida vai ao contrato ao gerar (em elaboração, sem área e sem caso). */
  gravaNoContrato: boolean;
}

/** As mesmas chaves, em qualquer ordem. */
export function mesmaLista(a: readonly string[], b: readonly string[]): boolean {
  const sa = new Set(a);
  const sb = new Set(b);
  return sa.size === sb.size && [...sa].every((k) => sb.has(k));
}

/** O que vem marcado ao abrir Gerar pela primeira vez: a lista da área, sem o que já tem assinado (D4). */
export function marcadosDaArea(area: AreaDireito, s: Pick<SugestaoDocumentos, "porArea">, disponiveis: readonly string[], assinadas: ReadonlySet<string>): string[] {
  const lista = new Set(s.porArea[area] ?? []);
  return disponiveis.filter((k) => lista.has(k) && !assinadas.has(k));
}

/**
 * "Previdenciário também tem: …" em Gerar de novo (pergunta 5): o que entrou na lista salva da área
 * depois da última geração, ainda está nela, existe hoje, não está marcado e não tem assinado.
 */
export function faltaNaSugestao(
  area: AreaDireito, s: Pick<SugestaoDocumentos, "porArea" | "entraramDepois">, marcados: readonly string[], disponiveis: readonly string[], assinadas: ReadonlySet<string>,
): { chave: string; em: string }[] {
  const lista = new Set(s.porArea[area] ?? []);
  return (s.entraramDepois[area] ?? []).filter((x) => lista.has(x.chave) && disponiveis.includes(x.chave) && !marcados.includes(x.chave) && !assinadas.has(x.chave));
}
