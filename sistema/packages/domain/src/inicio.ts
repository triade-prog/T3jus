// Início do Portal por áreas (F3.26; PD-01 a PD-07, PA-01, PA-02). Um bloco por área liberada,
// cada um com a sua consulta; o servidor decide os grupos, o limite e quem vê "Da equipe".

import { z } from "zod";
import type { AreaPortal } from "./portal.ts";
import type { PessoaRef } from "./clientes.ts";
import type { TipoCompromisso } from "./agenda.ts";

export type GrupoInicio = "VENCIDOS" | "HOJE" | "ACOMPANHAR" | "ESPERANDO";
type Ref = { id: string; nome: string };
type RefContrato = { id: string; numero: string };

interface ItemBase {
  id: string;
  /** A data do disco (aaaa-mm-dd). */
  em: string;
  responsavel: PessoaRef;
}
export interface ItemBaseMensal extends ItemBase {
  tipo: "BASE";
  pedirEm: string;
  contrato: RefContrato;
  cliente: Ref;
  /** Em centésimos de ponto percentual (3000 = 30%). */
  percentual: number | null;
  sobre: string | null;
}
export interface ItemAssinatura extends ItemBase {
  tipo: "ASSINATURA";
  contrato: RefContrato;
  cliente: Ref;
  compromisso: { id: string; inicio: string; responsavel: PessoaRef };
}
export interface ItemParcela extends ItemBase {
  tipo: "PARCELA";
  descricao: string;
  /** O que falta receber, em centavos. */
  valor: number;
  forma: string | null;
  contrato: RefContrato;
  cliente: Ref;
  cobranca: { motivo: string | null; proxData: string; proxOque: string } | null;
}
export interface ItemRepasse extends ItemBase {
  tipo: "REPASSE";
  para: string;
  nome: string;
  valor: number;
  levantamento: { id: string; tipo: "ALVARA" | "RPV" | "PRECATORIO" | "ACORDO"; entrouEm: string };
  caso: Ref | null;
  cliente: Ref | null;
}
export interface ItemPrazo extends ItemBase {
  tipo: "PRAZO";
  descricao: string;
  fazerAte: string | null;
  dataFinal: string;
  /** Amanhã ou depois de amanhã, com "lembrar" marcado (F3.38): a acompanhar. */
  lembrete?: boolean;
  caso: { id: string; nome: string; numero: string | null; tribunal: string | null };
}
export interface ItemTarefa extends ItemBase {
  tipo: "TAREFA";
  titulo: string;
  esperando: string | null;
  esperandoDesde: string | null;
  caso: Ref;
}
/** A petição esperando a revisão de quem é o responsável do item (F3.76, EX-09). */
export interface ItemPeticao extends ItemBase {
  tipo: "PETICAO";
  modelo: string;
  versao: number;
  /** Quando chegou para a revisão (aaaa-mm-dd). */
  enviadaEm: string;
  por: PessoaRef;
  caso: Ref;
  /** O prazo aberto mais próximo do caso, quando há. */
  prazo: { id: string; descricao: string; em: string; dataFinal: string } | null;
}
export type ItemInicio = ItemBaseMensal | ItemAssinatura | ItemParcela | ItemRepasse | ItemPrazo | ItemTarefa | ItemPeticao;

export interface BlocoInicio<T extends ItemInicio = ItemInicio> {
  total: number;
  mostrando: number;
  grupos: { chave: GrupoInicio; total: number; itens: T[] }[];
}

export interface InicioContratos extends BlocoInicio<ItemBaseMensal | ItemAssinatura> {
  de: DeInicio;
  pedem: number;
  paradas: number;
  assinaturas: number;
  esperandoEtapa: number;
  proximo: { em: string; cliente: string; descricao: string } | null;
}
export interface InicioFinanceiro {
  de: DeInicio;
  pedem: number;
  escritorio: BlocoInicio<ItemParcela> & {
    vencidas: number;
    valorVencido: number;
    escritorioVencidas: number | null;
    proximo: { em: string; cliente: string; valor: number } | null;
  };
  terceiros: BlocoInicio<ItemRepasse> & { atrasados: number; prazoMaisLonge: string | null };
}
export interface InicioJuridico extends BlocoInicio<ItemPrazo | ItemTarefa | ItemPeticao> {
  de: DeInicio;
  pedem: number;
  atrasadas: number;
  prazosHoje: number;
  escritorioPrazosHoje: { n: number; com: string[] } | null;
  proximo: { em: string; texto: string } | null;
}
export interface ResumoInicio {
  areas: AreaPortal[];
  dono: boolean;
  pedem: Partial<Record<AreaPortal, number>>;
  total: number;
  compromissos: number;
  proximoCompromisso: { tipo: TipoCompromisso; tipoEscrito: string | null; inicio: string } | null;
}

export type DeInicio = "MEUS" | "EQUIPE";
export const deInicioSchema = z.object({ de: z.enum(["MEUS", "EQUIPE"]).default("MEUS") });
export const responsavelRepasseSchema = z.object({ responsavelId: z.string().uuid().transform((s) => s.toLowerCase()) });
