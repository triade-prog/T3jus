// O sino de avisos (F3.57; PD-07) e o pedido de "não receber avisos" na ficha (F3.63; PA-03).
// Telas aprovadas em docs/design/aprovadas/portal-sem-avisos-sino.
import { z } from "zod";
import type { Condicao } from "./honorarios.ts";

// ------------------------------------------------------------------ Não receber avisos

export type CanalSemAvisos = "WHATSAPP" | "TELEFONE" | "PRESENCIAL" | "EMAIL";
export type QuemPediuSemAvisos = "CLIENTE" | "CONTATO" | "OUTRA";

export const CANAIS_SEM_AVISOS: { canal: CanalSemAvisos; nome: string; curto: string }[] = [
  { canal: "WHATSAPP", nome: "Pelo WhatsApp", curto: "pelo WhatsApp" },
  { canal: "TELEFONE", nome: "Por telefone", curto: "por telefone" },
  { canal: "PRESENCIAL", nome: "Pessoalmente", curto: "pessoalmente" },
  { canal: "EMAIL", nome: "Por e-mail", curto: "por e-mail" },
];

export interface PedidoSemAvisos {
  id: string;
  tipo: "TODOS" | "COBRANCA";
  origem: "CONVERSA" | "FICHA";
  canal: CanalSemAvisos | null;
  quem: QuemPediuSemAvisos | null;
  contatoId: string | null;
  quemPediu: string | null;
  quemPapel: string | null;
  pedidoEm: string;
  registradoEm: string;
  registradoPor: { id: string; nome: string } | null;
  /** A mensagem do cliente que originou o pedido, quando veio da conversa (F3.65). */
  mensagem?: { id: string; texto: string | null; em: string } | null;
  retirada: {
    em: string;
    por: { id: string; nome: string } | null;
    quem: QuemPediuSemAvisos | null;
    contatoId: string | null;
    quemPediu: string | null;
    quemPapel: string | null;
    canal: CanalSemAvisos | null;
  } | null;
}

/** GET /v1/escritorio/clientes/:id/sem-avisos */
export interface AvisosDoCliente {
  ativo: PedidoSemAvisos | null;
  historico: PedidoSemAvisos[];
  podeMudar: boolean;
}

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const semAvisosSchema = z.object({
  tipo: z.enum(["TODOS", "COBRANCA"]).optional(),
  origem: z.enum(["CONVERSA", "FICHA"]).optional(),
  quem: z.enum(["CLIENTE", "CONTATO", "OUTRA"]).optional(),
  contatoId: z.string().uuid().optional(),
  quemPediu: z.string().max(120).optional(),
  canal: z.enum(["WHATSAPP", "TELEFONE", "PRESENCIAL", "EMAIL"]).optional(),
  pedidoEm: dia.optional(),
  retirar: z.boolean().optional(),
  /** Pela conversa (F3.65): a conversa e a mensagem do cliente que originou o pedido. */
  conversaId: z.string().uuid().optional(),
  mensagemId: z.string().uuid().optional(),
});

// ------------------------------------------------------------------ Sino

export type TipoAvisoSino =
  | "CONVERSA_IA" | "CONVERSA_ASSUMIDA" | "CONVERSA_PASSADA" | "AUTOMACAO_SUGESTAO"
  | "MODELO_APROVADO" | "MODELO_RECUSADO" | "PRAZO_2_DIAS"
  | "PETICAO_REVISAR" | "PETICAO_DECIDIDA" | "PETICAO_PASSADA"
  | "BASE_DO_MES" | "PEDIDO_CONTRATO" | "CONTRATO_GERADO"
  | "REPASSE_PASSADO" | "REPASSE_ATRASADO" | "REPASSE_PROXIMA_ACAO"
  | "EXPORTAR_CONTADOR" | "DOCUMENTO_CHEGOU" | "CARNE_DESATUALIZADO" | "PEDIDO_CHAVE_PIX"
  | "EXITO_VALOR_MUDOU" | "EXITO_NAO_COBRADO" | "CASO_ABERTO_NA_ASSINATURA" | "CLIENTE_FEZ_18"
  | "DOCUMENTOS_INICIO_CHEGARAM" | "CASO_PRONTO_FECHAR" | "CASO_ENCERRADO_FINANCEIRO" | "BAIXA_RENEGOCIADA";

/** Quem recebe o aviso de caso encerrado no financeiro (F3.150): quem encerra contratos ou a responsável. */
export type PapelCasoFechou = "CONTRATOS" | "RESPONSAVEL";
/** Um contrato citado no aviso de caso encerrado no financeiro (F3.150), sem valor (PT-02). */
export interface ContratoNoAviso { id?: string; numero: string; cliente?: string; clienteId?: string; outroCaso?: string }

/** O que deixou o caso pronto para encerrar no financeiro (F3.147; EX-16, EX-17). */
export type MotivoCasoPronto = "PAGAMENTO" | "REEMBOLSO" | "EXITO" | "BAIXA" | "CONTRATO_ENCERRADO" | "CASO_ENCERRADO" | "OUTRO_CASO" | "ROTINA";

export interface AvisoSino {
  id: string;
  tipo: TipoAvisoSino;
  dados: {
    conversa?: string; contato?: string; quem?: string; trecho?: string; motivo?: string; recado?: string;
    automacao?: string; texto?: string; modelo?: string; prazo?: string; cliente?: string; vence?: string; processo?: string;
    /** Petições (EX-09). */
    caso?: string; versao?: number; decisao?: "APROVADA" | "AJUSTE" | "REPROVADA"; para?: string; passadaPor?: string;
    /** A base do mês do percentual recorrente (CH-06): o número do contrato, o mês e o vencimento. */
    contrato?: string; sobre?: string; vencimento?: string; mes?: number; de?: number; recebimento?: string;
    /** Pedido de contrato do Comercial (IN-01): a proposta, o serviço, quando foi aceita e os honorários. */
    proposta?: string; servico?: string; aceita?: string; condicoes?: Condicao[];
    /** Repasses (F3.71, F3.46): quem saiu, se você entrou, o tipo do levantamento, a parte, o que fazer e o valor. */
    saiu?: string; entrou?: boolean; levantamento?: string; partes?: number; parte?: string; oQue?: string; valor?: number;
    /** Lembrete do dia 5 (F3.50): o mês a exportar e o contador. */
    referencia?: string; contador?: string;
    /** Arquivo do cliente com documento pedido (F3.86): o arquivo e quantos documentos faltam. */
    arquivo?: string; quantos?: number;
    /** Documentos para começar (EX-18): quantos eram na lista. */
    total?: number;
    /** Carnê desatualizado (F3.80): o carnê, quando foi gerado e se foi você quem gerou. */
    carne?: string; gerado?: string; gerou?: boolean; parcela?: string;
    /** O êxito conferido no Financeiro (F3.14): o valor calculado pelo contrato e a explicação de não cobrar. */
    calculado?: number; explicacao?: string;
    /** O cliente menor que fez 18 anos (F3.98): o dia (dd/mm/aaaa); "quem" é quem assinava, com o papel. */
    em?: string;
    /** Caso pronto para encerrar no financeiro (F3.147): os clientes (até dois, na ordem do caso) e quantos
     *  sobram, o contrato do link (o de menor número), quantas parcelas, se é de novo, o período e o que
     *  deixou o caso pronto (motivo, êxito, reembolso, contrato encerrado, outro caso e o contrato que segue).
     *  Nenhum valor em reais (PT-02). */
    clientes?: string[]; maisClientes?: number; contratoId?: string; parcelas?: number; denovo?: boolean; periodoId?: string;
    exito?: "NAO_COBRADO" | "PAGO"; reembolso?: string; contratoEncerrado?: string; outroCaso?: string; contratoSegue?: string;
    /** Baixa sem receber (F3.139): a parcela e o cliente dela, no caso pronto; o combinado, na renegociação. */
    clienteParcela?: string; combinado?: string;
    /** Caso encerrado no financeiro (F3.150): o papel de quem recebe, o primeiro cliente do caso, os
     *  contratos que ficaram abertos, os encerrados junto, os que já estavam encerrados, os que seguem
     *  com outro caso e, para a responsável com contrato aberto, quem encerra contratos. Sem valor (PT-02). */
    papel?: PapelCasoFechou; clienteId?: string; abertos?: ContratoNoAviso[]; juntos?: ContratoNoAviso[]; jaEncerrados?: ContratoNoAviso[];
    seguem?: ContratoNoAviso[]; quemContratos?: string[];
  };
  origem: "conversas" | "automacoes" | "prazos" | "peticoes" | "contratos" | "propostas" | "levantamentos" | "escritorios" | "casos" | "clientes";
  origemId: string;
  em: string;
  lido: boolean;
  /** Caso pronto para encerrar (F3.147): o que aconteceu com o caso depois do aviso. Sem ele, o caso
   *  continua pronto. */
  agora?: AgoraCasoPronto;
  /** Caso encerrado no financeiro (F3.150): o que aconteceu com os contratos abertos depois do aviso.
   *  Sem ele, nada mudou. */
  agoraFechou?: AgoraCasoFechou;
}

type QuemEncerrou = { id: string; nome: string } | null;
/** O "agora" do aviso de caso encerrado no financeiro (F3.150). Quando existe, `abertos` traz todos os
 *  contratos que continuam ativos sem outro caso (ausente quando nenhum sobrou); `saiu`, os encerrados
 *  depois do aviso; `seguem`, os que passaram a seguir com outro caso; `encerrados`, só quando todos os
 *  abertos do aviso foram encerrados (`por` null quando foram pessoas diferentes). `voce` vem do
 *  servidor: a sessão do Portal não tem o id da pessoa. */
export interface AgoraCasoFechou {
  abertos?: { id: string; numero: string }[];
  saiu?: { numero: string; em: string; por: QuemEncerrou; voce?: boolean }[];
  seguem?: { id: string; numero: string; outroCaso: string }[];
  encerrados?: { em: string; por: QuemEncerrou; voce?: boolean };
}

/** O "agora" do aviso de caso pronto: encerrado no financeiro, aviso antigo (há um mais novo para a
 *  mesma pessoa), voltou a ter pendência ou fecha no repasse (entrou RPV ou alvará). */
export interface AgoraCasoPronto {
  encerrado?: { em: string; por: { id: string; nome: string } | null };
  depois?: true;
  pendente?: true;
  fora?: true;
}

/** GET /v1/escritorio/avisos: os últimos 30 dias, os mais novos primeiro. */
export interface ListaAvisosSino {
  novos: number;
  total: number;
  itens: AvisoSino[];
  /** Só na resposta de "marcar todos". */
  marcados?: number;
}

export const avisosLidosSchema = z.object({ ate: z.string().datetime({ offset: true }) });

// ------------------------------------------------------------------ Caso pronto para encerrar (F3.147)

const FUSO_AVISOS = "America/Sao_Paulo";
const diaAvisos = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_AVISOS, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** Quando o caso foi encerrado no financeiro, na linha "Agora:" do aviso: "hoje, às 10h05".
 *  [C1, provisório, à espera do ok da Carol] O desenho aprovado só mostra "hoje"; fora de hoje, o texto
 *  segue o rótulo do próprio sino: "ontem, às 10h05" e "em 16/11, às 10h05". Se a Carol pedir outra
 *  forma, muda só esta função (e o teste dela). */
export function quandoEncerrouNoFinanceiro(iso: string, agora: Date = new Date()): string {
  const d = new Date(iso);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_AVISOS, hour: "numeric", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d).map((x) => [x.type, x.value]),
  );
  const hora = `${Number(p.hour)}h${p.minute}`;
  return `${quandoDia(iso, agora)}, às ${hora}`;
}

/** O dia, no fuso de Brasília: "hoje", "ontem" ou "em 19/11" (F3.150, a linha "Agora:" do aviso de
 *  caso encerrado no financeiro; também o dia de quandoEncerrouNoFinanceiro). */
export function quandoDia(iso: string, agora: Date = new Date()): string {
  const dia = diaAvisos(new Date(iso));
  if (dia === diaAvisos(agora)) return "hoje";
  if (dia === diaAvisos(new Date(agora.getTime() - 86_400_000))) return "ontem";
  return `em ${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
}
