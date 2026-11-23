// Cobrança dos escritórios no Console (CO-06, F1.18): os dados que as telas recebem da API e o
// que elas calculam deles. Telas aprovadas em docs/design/aprovadas/console-cobranca. Módulo
// simples (sem "use client"), para os testes e as páginas do servidor usarem.

import { dinheiro, ErroDinheiro, formatar, lerReais, mesPorExtenso, type FormaAssinatura, type SituacaoFatura } from "@t3jus/domain";
import type { NomeIcone } from "../Icone.tsx";

/** As abas de Cobrança (fora do componente de cliente para a página do servidor conferir). */
export type AbaCobranca = "faturas" | "planos" | "regua";
export const ABAS_COBRANCA: Record<AbaCobranca, string> = { faturas: "Faturas", planos: "Planos", regua: "Régua de cobrança" };
export const ehAbaCobranca = (a: string): a is AbaCobranca => Object.hasOwn(ABAS_COBRANCA, a);

/** Uma fatura, como o banco devolve (fatura_json). */
export interface FaturaCb {
  id: string;
  numero: number;
  competencia: string;
  vencimento: string;
  plano: string;
  forma: FormaAssinatura;
  totalCentavos: number;
  situacao: SituacaoFatura;
  atrasoDias: number | null;
  pagaEm: string | null;
  formaPaga: string | null;
  baixa: string | null;
  canceladaEm: string | null;
  emitidaEm: string;
  pessoasAtivas: number;
  versao: number;
  parcela: { numero: number; de: number; carne: string; carneId: string } | null;
  /** Só na lista de Cobrança. */
  escritorio?: { id: string; nome: string };
}

export interface FaixaIdade {
  ate: number | null;
  totalCentavos: number;
  faturas: number;
}

/** GET /v1/cobranca/faturas. */
export interface ListaCobranca {
  hoje: string;
  podeEditar: boolean;
  resumo: {
    aReceberMesCentavos: number;
    recebidoMesCentavos: number;
    venceMesCentavos: number;
    atraso: { totalCentavos: number; faturas: number; escritorios: number; faixas: FaixaIdade[] };
  };
  faturas: FaturaCb[];
}

export interface EventoCb {
  id: number;
  acao: string;
  dados: Record<string, unknown>;
  em: string;
  autor: { id: string; nome: string } | null;
}

export interface ItemFatura {
  tipo: "MENSALIDADE" | "PESSOA_A_MAIS" | "DESCONTO";
  descricao: string;
  quantidade: number;
  valorUnitarioCentavos?: number;
  valorCentavos: number;
}

/** GET /v1/clientes/:id/faturas/:fatura. */
export interface FaturaAberta extends FaturaCb {
  hoje: string;
  escritorio: { id: string; nome: string; cnpj: string | null; contrato: string; atrasoDias: number | null; soConsultaDesde: string | null };
  assinatura: { id: string; versao: number; cnpjNota: string | null };
  itens: ItemFatura[];
  pagamento: { pixCopiaCola: string | null; linhaBoleto: string | null; disponivel: boolean };
  paraQuem: { email: string; socio: string | null };
  pagamentoManual: { pagoEm: string; valorCentavos: number; forma: string; motivo: string; por: string; em: string } | null;
  cancelamento: { em: string; motivo: string; por: string | null } | null;
  historico: EventoCb[];
  envios: { tipo: string; criadoEm: string; enviadoEm: string | null; descartadoEm: string | null; erro: string | null }[];
  proximos: { tipo: string; dia: string }[];
  proporConsulta: boolean;
  permissoes: { editar: boolean; soConsulta: boolean };
}

export interface PlanoCb {
  id: string;
  nome: string;
  precoCentavos: number;
  pessoasIncluidas: number;
  arquivadoEm: string | null;
  arquivadoMotivo: string | null;
  versao: number;
  criadoEm: string;
  assinantes: number;
  noPrecoAntigo: number;
  escritorios: { id: string; nome: string; precoCentavos: number }[];
}

/** GET /v1/cobranca/planos. */
export interface PlanosCb {
  podeEditar: boolean;
  pessoaAMais: { centavos: number; versao: number } | null;
  planos: PlanoCb[];
  historico: { id: number; acao: string; dados: Record<string, unknown>; em: string; planoId: string | null; autor: string }[];
}

export interface ParcelaCb {
  id: string;
  numero: number;
  competencia: string;
  vencimento: string;
  valorCentavos: number;
  situacao: "A_VENCER" | "PAGA" | "CANCELADA";
  faturaId: string | null;
  pagaEm: string | null;
  emAtraso: boolean;
  canceladaMotivo: string | null;
}

export interface CarneCb {
  id: string;
  numero: string;
  parcelas: number;
  valorParcelaCentavos: number;
  diaVencimento: number;
  primeiraCompetencia: string;
  ultimaCompetencia: string;
  geradoEm: string;
  geradoPor: string | null;
  substituidoEm: string | null;
  substituidoMotivo: string | null;
  pdf: boolean;
  itens: ParcelaCb[];
}

export interface PreviaPlano {
  competencia: string;
  vencimento: string;
  itens: ItemFatura[];
  pessoas: number;
  totalCentavos: number;
}

export type SituacaoAssinaturaCb = "SEM_COBRANCA" | "EM_DIA" | "EM_ATRASO" | "SO_CONSULTA";

export interface AssinaturaCb {
  id: string;
  versao: number;
  plano: { id: string; nome: string; arquivado: boolean };
  pessoasIncluidas: number;
  diaVencimento: number;
  forma: FormaAssinatura;
  inicioCobranca: string | null;
  primeiraCompetencia: string | null;
  situacao: SituacaoAssinaturaCb;
  atrasoDias: number | null;
  soConsultaDesde: string | null;
  avisoPortal: boolean;
  proporConsulta: boolean;
  // Só para quem vê os valores (Administração e Financeiro):
  precoCentavos?: number;
  precoDoPlanoHojeCentavos?: number;
  emailCobranca?: string;
  cnpjNota?: string | null;
  /** Endereço de cobrança (F1.21): vai no boleto como endereço do pagador. */
  enderecoCobranca?: EnderecoCobranca | null;
  /** PA-07 (0860): o endereço de cobrança é o da sede (o padrão). */
  mesmoDaSede?: boolean;
  parcelasPorCarne?: number | null;
  desconto?: { pct: number; ate: string; motivo: string; por: string | null } | null;
  soConsulta?: { desde: string; motivo: string; por: string | null } | null;
  proxima?: PreviaPlano;
  abertas?: { faturas: number; totalCentavos: number };
  carne?: { emUso: CarneCb[]; substituidos: { id: string; numero: string; substituidoEm: string; motivo: string }[]; valorHojeCentavos: number | null } | null;
  faturas?: FaturaCb[];
  mudancas?: EventoCb[];
}

export interface EnderecoCobranca {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
}

/** "Rua da Aurora, 295, sala 1102 · Boa Vista · Recife, PE · CEP 50050-000" */
export function enderecoEmLinha(e: EnderecoCobranca): string {
  const cep = e.cep.replace(/\D/g, "");
  return `${e.logradouro}, ${e.numero}${e.complemento ? `, ${e.complemento}` : ""} · ${e.bairro} · ${e.cidade}, ${e.uf} · CEP ${cep.slice(0, 5)}-${cep.slice(5)}`;
}

/** A sede serve de endereço do pagador só inteira e já separada em partes. */
export function sedeParaCobranca(s: AssinaturaResposta["sede"]): EnderecoCobranca | null {
  if (!s || s.confira || !s.cep || !s.logradouro || !s.numero || !s.bairro || !s.cidade || !s.uf) return null;
  return { cep: s.cep, logradouro: s.logradouro, numero: s.numero, complemento: s.complemento ?? null, bairro: s.bairro, cidade: s.cidade, uf: s.uf };
}

/** GET /v1/clientes/:id/assinatura. */
export interface AssinaturaResposta {
  hoje: string;
  valores: boolean;
  estagio: "IMPLANTACAO" | "ATIVO" | "ENCERRADO";
  contrato: string;
  permissoes: { editar: boolean; soConsulta: boolean };
  pessoasAtivas: number;
  emailSugerido: string | null;
  cnpjSugerido: string | null;
  /** Só para quem vê os valores: o que a ficha tem de endereço, para começar o de cobrança. */
  enderecoSugerido?: Partial<EnderecoCobranca>;
  fichaTemEndereco?: boolean;
  /** PA-07 (0860): a sede em partes, da ficha; "confira" quando veio do texto antigo. */
  sede?: (Partial<Omit<EnderecoCobranca, "complemento">> & { complemento?: string | null; confira?: boolean }) | null;
  planos: { id: string; nome: string; precoCentavos: number; pessoasIncluidas: number; previa: PreviaPlano | null }[] | null;
  pessoaAMaisCentavos: number | null;
  assinatura: AssinaturaCb | null;
}

/** Centavos inteiros → "R$ 1.234,56"; negativo → "− R$ 98,00" (desenho). */
export function brl(centavos: number): string {
  const v = formatar(dinheiro(Math.abs(centavos)));
  return centavos < 0 ? `− ${v}` : v;
}

/** "2026-11-20" (ou um instante) → "20/11/2026". */
export function dataBr(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** "2026-11-20" → "20/11". */
export function diaMes(iso: string): string {
  return dataBr(iso).slice(0, 5);
}

/** "dd/mm/aaaa" → "aaaa-mm-dd"; null se não for uma data. */
export function lerDataBr(t: string): string | null {
  const m = /^\s*(\d{2})\/(\d{2})\/(\d{4})\s*$/.exec(t);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
}

/** "2026-12-01" → "dezembro/2026" (lista de faturas). */
export function competenciaCurta(c: string): string {
  return `${mesPorExtenso(c, true)}/${c.slice(0, 4)}`;
}

/** Número da fatura como o desenho mostra: "2026/0187". */
export function numeroFatura(f: Pick<FaturaCb, "numero" | "competencia">): string {
  return `${f.competencia.slice(0, 4)}/${String(f.numero).padStart(4, "0")}`;
}

/** Dias entre duas datas (aaaa-mm-dd), sem fuso. */
export function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate.slice(0, 10)}T12:00:00Z`) - Date.parse(`${de.slice(0, 10)}T12:00:00Z`)) / 86_400_000);
}

/** O selo da fatura: texto e ícone, nunca só a cor; de 30 dias em diante muda de cor e de ícone. */
export function seloFatura(s: SituacaoFatura, atraso: number | null, prefixo = "Em atraso"): { classe: string; icone: NomeIcone; texto: string } {
  switch (s) {
    case "EM_ATRASO": {
      const d = atraso ?? 0;
      return { classe: d >= 30 ? "selo-urgente" : "selo-atencao", icone: d >= 30 ? "alerta" : "relogio", texto: `${prefixo} · ${d} ${d === 1 ? "dia" : "dias"}` };
    }
    case "VENCE_HOJE":
      return { classe: "selo-atencao", icone: "relogio", texto: "Vence hoje" };
    case "A_VENCER":
      return { classe: "selo-ok", icone: "agenda", texto: "A vencer" };
    case "PAGA":
      return { classe: "selo-paga", icone: "check", texto: "Paga" };
    case "CANCELADA":
      return { classe: "selo-cancelada", icone: "xis", texto: "Cancelada" };
  }
}

export const FORMA_ICONE: Record<FormaAssinatura, NomeIcone> = { PIX: "qr", BOLETO: "barras", CARNE: "carne" };

/** A linha de baixo do selo: "venceu em 10/11/2026", "em 20 dias", "paga em 04/11". */
export function detalheFatura(f: FaturaCb, hoje: string): string {
  switch (f.situacao) {
    case "EM_ATRASO":
      return `venceu em ${dataBr(f.vencimento)}`;
    case "VENCE_HOJE":
      return "vence hoje";
    case "A_VENCER": {
      const d = diasEntre(hoje, f.vencimento);
      return d === 1 ? "em 1 dia" : `em ${d} dias`;
    }
    case "PAGA":
      return f.pagaEm ? `paga em ${diaMes(f.pagaEm)}` : "paga";
    case "CANCELADA":
      return f.canceladaEm ? `cancelada em ${diaMes(f.canceladaEm)}` : "cancelada";
  }
}

export type FiltroCobranca = "TODAS" | SituacaoFatura;
export const FILTROS_COBRANCA: { chave: FiltroCobranca; nome: string }[] = [
  { chave: "TODAS", nome: "Todas" },
  { chave: "A_VENCER", nome: "A vencer" },
  { chave: "VENCE_HOJE", nome: "Vence hoje" },
  { chave: "EM_ATRASO", nome: "Em atraso" },
  { chave: "PAGA", nome: "Pagas" },
  { chave: "CANCELADA", nome: "Canceladas" },
];

const semAcento = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

/** Contagem de cada filtro de situação. */
export function contarFaturas(lista: FaturaCb[]): Record<FiltroCobranca, number> {
  const c = { TODAS: lista.length, A_VENCER: 0, VENCE_HOJE: 0, EM_ATRASO: 0, PAGA: 0, CANCELADA: 0 };
  for (const f of lista) c[f.situacao] += 1;
  return c;
}

/**
 * Filtros da lista de Cobrança. A ordem é a do servidor (as mais urgentes primeiro); com o
 * filtro "Em atraso", da mais antiga para a mais nova.
 */
export function filtrarFaturas(lista: FaturaCb[], o: { situacao: FiltroCobranca; termo: string; escritorio: string; mes: string; forma: string }): FaturaCb[] {
  const t = semAcento(o.termo);
  return lista.filter((f) => {
    if (o.situacao !== "TODAS" && f.situacao !== o.situacao) return false;
    if (o.escritorio && f.escritorio?.id !== o.escritorio) return false;
    if (o.mes && f.vencimento.slice(0, 7) !== o.mes) return false;
    if (o.forma && f.forma !== o.forma) return false;
    return !t || semAcento(`${f.escritorio?.nome ?? ""} ${numeroFatura(f)} ${f.numero}`).includes(t);
  });
}

/** Os rótulos das faixas de atraso por idade. */
export function rotuloFaixa(f: FaixaIdade, i: number, faixas: FaixaIdade[]): string {
  if (f.ate === null) return `mais de ${faixas[i - 1]?.ate ?? 90}`;
  if (i === 0) return `até ${f.ate} dias`;
  return `${(faixas[i - 1]?.ate ?? 0) + 1} a ${f.ate} dias`;
}

const TIPO_ENVIO: Record<string, string> = {
  EMITIDA: "mandou a fatura por e-mail",
  VENCE_EM_3: "mandou o lembrete “vence em 3 dias”",
  VENCE_HOJE: "mandou o lembrete “vence hoje”",
  VENCEU_3: "mandou o lembrete “venceu há 3 dias”",
  VENCEU_7: "mandou o lembrete “venceu há 7 dias”",
  VENCEU_15: "mandou o lembrete “venceu há 15 dias”",
  MANUAL: "mandou o lembrete pedido",
  RECIBO: "mandou o recibo por e-mail",
  CANCELADA: "avisou o escritório por e-mail que a fatura foi cancelada",
};

/** O nome de cada passo da régua, para "Próximos lembretes". */
export const PASSO_REGUA: Record<string, string> = {
  VENCE_EM_3: "“vence em 3 dias”",
  VENCE_HOJE: "“vence hoje”",
  VENCEU_3: "“venceu há 3 dias”",
  VENCEU_7: "“venceu há 7 dias” e o aviso no Portal",
  VENCEU_15: "“venceu há 15 dias”, o último automático",
};

const FORMAS_TEXTO: Record<string, string> = {
  PIX: "Pix", BOLETO: "boleto", CARNE: "carnê", TRANSFERENCIA: "transferência", DINHEIRO: "dinheiro", OUTRA: "outra forma",
};

const txt = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" ? v : 0);

/** Uma linha do histórico da fatura ou da assinatura: o que foi feito, o detalhe e o motivo. */
export function textoEvento(e: EventoCb): { quem: string; acao: string; detalhe?: string; motivo?: string; sistema: boolean; forte: boolean; soEquipe?: boolean } {
  const quem = e.autor?.nome ?? "O sistema";
  const sistema = !e.autor;
  const d = e.dados;
  const base = { quem, sistema, forte: false };
  switch (e.acao) {
    case "fatura.emitida":
      return {
        ...base, acao: d.parcela ? `emitiu a fatura da parcela ${num(d.parcela)} do carnê` : "emitiu a fatura",
        detalhe: `${brl(num(d.totalCentavos))} · vence em ${dataBr(txt(d.vencimento))} · ${num(d.pessoas)} ${num(d.pessoas) === 1 ? "pessoa ativa" : "pessoas ativas"} na emissão`,
      };
    case "email.enviado":
      return { ...base, acao: TIPO_ENVIO[txt(d.tipo)] ?? "mandou um e-mail" };
    case "lembrete.pedido":
      return { ...base, acao: "pediu um lembrete agora", detalhe: "Com todas as faturas em aberto do escritório" };
    case "pagamento.registrado":
      return { ...base, forte: true, acao: "registrou o pagamento", detalhe: `pago em ${dataBr(txt(d.pagoEm))} · ${FORMAS_TEXTO[txt(d.forma)] ?? txt(d.forma)}`, motivo: txt(d.motivo) };
    case "fatura.paga":
      return {
        ...base, acao: d.baixa === "MANUAL" ? "deu a fatura como paga" : "recebeu a confirmação do pagamento",
        detalhe: `${brl(num(d.totalCentavos))} · os lembretes desta fatura foram cancelados`,
      };
    case "fatura.cancelada":
      return { ...base, forte: true, acao: "cancelou a fatura", detalhe: "O Pix e o boleto deixaram de valer · lembretes cancelados", motivo: txt(d.motivo) };
    case "portal.aviso_aceso":
      return { ...base, acao: "ligou o aviso de atraso no Portal", detalhe: "O aviso aparece só para o sócio dono" };
    case "consulta.proposta":
      return { ...base, soEquipe: true, acao: `avisou a Administração: ${num(d.dias)} dias em atraso`, detalhe: "O Console passou a propor o Portal só para consulta" };
    case "acesso.so_consulta":
      return { ...base, forte: true, acao: "passou o Portal para só consulta", motivo: txt(d.motivo) };
    case "acesso.devolvido":
      return d.pelo === "PAGAMENTO"
        ? { ...base, acao: "devolveu o acesso ao Portal", detalhe: "O pagamento tirou o atraso de 30 dias" }
        : { ...base, forte: true, acao: "devolveu o acesso ao Portal antes do pagamento", motivo: txt(d.motivo) };
    case "cobranca.comecou":
      return { ...base, forte: true, acao: "começou a cobrança", detalhe: `em ${dataBr(txt(d.em))}, quando o cliente passou para Ativo` };
    case "assinatura.preparada":
      return {
        ...base, acao: "preparou a assinatura",
        detalhe: [`plano ${txt(d.plano)}`, `todo dia ${num(d.dia)}`, FORMAS_TEXTO[txt(d.forma)] ?? "", d.descontoPct ? `desconto de ${num(d.descontoPct)}%` : ""]
          .filter(Boolean).join(", "),
        motivo: txt(d.descontoMotivo) || undefined,
      };
    case "assinatura.alterada":
      return { ...base, acao: "mudou a assinatura", detalhe: mudancasAssinatura(d) };
    case "assinatura.plano_mudou":
      return {
        ...base, forte: true, acao: `mudou o plano de ${txt(d.de)} para ${txt(d.para)}`,
        detalhe: `vale a partir da fatura de ${mesPorExtenso(txt(d.valeEm))} · ${brl(num(d.precoParaCentavos))} por mês`, motivo: txt(d.motivo),
      };
    case "carne.gerado":
      return {
        ...base, acao: `gerou o carnê ${txt(d.numero)}`,
        detalhe: `${num(d.parcelas)} parcelas de ${brl(num(d.valorParcelaCentavos))}, de ${mesPorExtenso(txt(d.de))} a ${mesPorExtenso(txt(d.ate))}`,
      };
    case "carne.parcelas_canceladas":
      return { ...base, acao: `cancelou ${num(d.parcelas)} ${num(d.parcelas) === 1 ? "parcela" : "parcelas"} do carnê`, detalhe: "Nada foi apagado: ficam como Canceladas", motivo: txt(d.motivo) };
    default:
      return { ...base, acao: "registrou uma mudança" };
  }
}

function mudancasAssinatura(d: Record<string, unknown>): string {
  const partes: string[] = [];
  const de = (k: string) => (d[k] as { de?: unknown; para?: unknown } | undefined) ?? null;
  const dia = de("dia");
  if (dia) partes.push(`dia ${String(dia.de)} → ${String(dia.para)}`);
  const forma = de("forma");
  if (forma) partes.push(`forma ${FORMAS_TEXTO[String(forma.de)] ?? ""} → ${FORMAS_TEXTO[String(forma.para)] ?? ""}`);
  if (d.emailCobranca) partes.push("e-mail de cobrança");
  if (d.cnpjNota) partes.push("CNPJ de cobrança");
  if (d.enderecoCobranca) partes.push("endereço de cobrança");
  const desc = d.desconto as { pct?: number | null } | undefined;
  if (desc) partes.push(desc.pct ? `desconto de ${desc.pct}%` : "sem desconto");
  const parc = de("parcelasPorCarne");
  if (parc) partes.push(`${String(parc.para)} parcelas por carnê`);
  return partes.join(" · ");
}

/** Agrupa eventos por dia (no horário de Brasília), do mais novo para o mais antigo. */
export function porDia<T extends { em: string }>(lista: T[], hoje: string): { dia: string; titulo: string; itens: T[] }[] {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
  const grupos = new Map<string, T[]>();
  for (const e of lista) {
    const dia = fmt.format(new Date(e.em));
    grupos.set(dia, [...(grupos.get(dia) ?? []), e]);
  }
  return [...grupos.entries()].map(([dia, itens]) => ({ dia, titulo: dia === hoje ? `${dataBr(dia)} · hoje` : dataBr(dia), itens }));
}

/** "9 de 8, 1 a mais" (desenho, decisão 10). */
export function textoPessoas(ativas: number, incluidas: number): { conta: string; extra: string | null } {
  const mais = ativas - incluidas;
  return { conta: `${ativas} de ${incluidas}`, extra: mais > 0 ? `${mais} a mais` : null };
}

/** "431,00" (para pôr no campo) a partir dos centavos. */
export function reaisDe(centavos: number): string {
  return brl(centavos).replace(/^R\$\s/, "");
}

/** O que a pessoa digitou ("431", "431,00", "1.290,50") em centavos; null se não der para ler. */
export function centavosDe(t: string): number | null {
  if (!t.trim()) return null;
  try {
    return lerReais(t).centavos;
  } catch (e) {
    if (e instanceof ErroDinheiro) return null;
    throw e;
  }
}
