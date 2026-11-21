// Pix estático do escritório e o carnê de pagamento (FI-23), tela aprovada em
// docs/design/aprovadas/portal-carne. Sem provedor de pagamento: o T3jus monta sozinho o
// "Pix copia e cola" (BR Code, padrão EMV-MPM do Banco Central) com a chave do próprio
// escritório, o valor da parcela e o identificador dela. A baixa continua manual, em
// "Registrar recebimento". As regras de quem pode o quê estão no banco (0450_portal_carne.sql).

import type { CorLogo, JeitoLogo, LogoEscritorio, MarcaDocumento, MarcaNoDocumento } from "./logo.ts";
import { z } from "zod";
import { cpfValido } from "./clientes.ts";
import { cnpjValido } from "./console.ts";
import type { PessoaRef } from "./clientes.ts";

export const TIPOS_CHAVE_PIX = {
  CNPJ: "CNPJ",
  CPF: "CPF",
  EMAIL: "E-mail",
  CELULAR: "Celular",
  ALEATORIA: "Chave aleatória",
} as const;
export type TipoChavePix = keyof typeof TIPOS_CHAVE_PIX;

/** Limites do BR Code: nome do recebedor (campo 59) e cidade (campo 60). */
export const LIMITE_RECEBEDOR = 25;
export const LIMITE_CIDADE = 15;
export const LIMITE_INSTRUCOES = 400;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Tira os acentos e deixa só o que o BR Code aceita bem nos bancos: A-Z, 0-9, espaço e . - & /. */
export function textoPix(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 .\-&/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A chave como o Banco Central espera: CPF e CNPJ só com os dígitos, e-mail em minúsculas,
 * celular no formato +55DDNNNNNNNNN e a aleatória em minúsculas. Nulo quando não confere.
 */
export function normalizarChavePix(tipo: TipoChavePix, chave: string): string | null {
  const s = chave.trim();
  switch (tipo) {
    case "CPF": {
      const d = s.replace(/\D/g, "");
      return d.length === 11 && cpfValido(d) ? d : null;
    }
    case "CNPJ": {
      const d = s.replace(/\D/g, "");
      return d.length === 14 && cnpjValido(d) ? d : null;
    }
    case "EMAIL": {
      const e = s.toLowerCase();
      return e.length <= 77 && EMAIL.test(e) ? e : null;
    }
    case "CELULAR": {
      let d = s.replace(/\D/g, "");
      if (d.length === 10 || d.length === 11) d = "55" + d;
      return /^55[1-9][0-9]9[0-9]{8}$/.test(d) ? "+" + d : null;
    }
    case "ALEATORIA": {
      const a = s.toLowerCase();
      return UUID.test(a) ? a : null;
    }
  }
}

/** A chave para ler na tela: CNPJ e CPF com pontuação, celular com DDD. */
export function chavePixParaLer(tipo: TipoChavePix, chave: string): string {
  if (tipo === "CNPJ" && /^\d{14}$/.test(chave)) return chave.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  if (tipo === "CPF" && /^\d{11}$/.test(chave)) return chave.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  if (tipo === "CELULAR" && /^\+55\d{11}$/.test(chave)) return chave.replace(/^\+55(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  return chave;
}

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), em 4 dígitos hexadecimais maiúsculos. */
export function crc16Pix(texto: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function campo(id: string, valor: string): string {
  const tam = new TextEncoder().encode(valor).length;
  if (tam > 99) throw new Error(`Campo ${id} do Pix passa de 99 caracteres`);
  return id + String(tam).padStart(2, "0") + valor;
}

export interface DadosPix {
  chave: string;
  recebedor: string;
  cidade: string;
  /** Em centavos; nulo deixa o valor para o app do banco (parcela vencida, Pix de teste). */
  valor: number | null;
  /** Identificador da parcela (campo txid): até 25 letras e números. */
  txid?: string | null;
  /** Informação adicional que o app do banco mostra, quando cabe. */
  info?: string | null;
}

/** Monta o Pix copia e cola estático (BR Code). */
export function brCodePix(d: DadosPix): string {
  const txid = (d.txid ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const recebedor = textoPix(d.recebedor).slice(0, LIMITE_RECEBEDOR);
  const cidade = textoPix(d.cidade).slice(0, LIMITE_CIDADE);
  if (!recebedor || !cidade) throw new Error("Pix sem recebedor ou sem cidade");
  const gui = campo("00", "br.gov.bcb.pix") + campo("01", d.chave);
  let conta = gui;
  const info = d.info ? textoPix(d.info) : "";
  if (info && (gui + campo("02", info)).length <= 99) conta += campo("02", info);
  const valor = d.valor === null ? "" : campo("54", (d.valor / 100).toFixed(2));
  if (d.valor !== null && (!Number.isSafeInteger(d.valor) || d.valor < 1)) throw new Error("Valor do Pix inválido");
  const corpo =
    campo("00", "01") + campo("26", conta) + campo("52", "0000") + campo("53", "986") + valor + campo("58", "BR") +
    campo("59", recebedor) + campo("60", cidade) + campo("62", campo("05", txid)) + "6304";
  return corpo + crc16Pix(corpo);
}

/** O identificador da parcela: C + o número do contrato sem traço + P + a ordem (C2026014P04). */
export function txidParcela(numeroContrato: string, ordem: number): string {
  return "C" + numeroContrato.replace(/[^0-9]/g, "") + "P" + String(ordem).padStart(2, "0");
}

// ------------------------------------------------------------------ Escritório › Recebimento

const txt = (max: number) => z.string().max(max).nullish();

export const salvarRecebimentoSchema = z.object({
  versao: z.number().int().min(0),
  pixTipo: z.enum(Object.keys(TIPOS_CHAVE_PIX) as [TipoChavePix, ...TipoChavePix[]]).nullish(),
  pixChave: txt(120),
  recebedor: txt(60),
  cidade: txt(60),
  instrucoes: txt(1000),
  // A marca no carnê e no recibo e o registro da sociedade na OAB (F3.81, F3.19).
  marca: z.enum(["LETRA", "LOGO"]).nullish(),
  logoId: z.string().regex(/^[0-9a-f-]{36}$/i).nullish(),
  logoJeito: z.enum(["SO_LOGO", "LOGO_E_NOME"]).nullish(),
  logoCor: z.enum(["ARQUIVO", "UMA_COR"]).nullish(),
  oabUf: txt(2),
  oabNumero: txt(12),
});
export type SalvarRecebimento = z.input<typeof salvarRecebimentoSchema>;

/** O que o escritório guarda para o carnê (e, depois, para o recibo e outras cobranças). */
export interface RecebimentoEscritorio {
  dono: boolean;
  /** Nome da sócia dona, para "Quem cadastra é…". */
  socioDono: PessoaRef | null;
  versao: number;
  pixTipo: TipoChavePix | null;
  pixChave: string | null;
  recebedor: string | null;
  cidade: string | null;
  instrucoes: string | null;
  atualizadoPor: PessoaRef | null;
  atualizadoEm: string | null;
  /** Sugestões para o recebedor e a cidade, vindas da ficha do escritório. */
  sugestao: { recebedor: string; cidade: string | null; cnpj: string | null };
  /** O que vai no alto do carnê e do recibo (F3.81). */
  marca?: MarcaDocumento;
  logoJeito?: JeitoLogo | null;
  logoCor?: CorLogo;
  logo?: LogoEscritorio | null;
  /** O registro da sociedade na OAB (F3.19, pergunta 5). */
  oabUf?: string | null;
  oabNumero?: string | null;
  oab?: string | null;
}

export interface RecebimentoSalvo {
  versao: number;
  /** Carnês que ficaram desatualizados com a troca da chave. */
  desatualizados: number;
  /** O que não foi salvo, com o motivo: o logo claro demais nas cores do arquivo (pergunta 7). */
  naoSalvo?: { marca: "LOGO_SEM_CONTRASTE"; contraste: number } | null;
}

// ------------------------------------------------------------------ Carnê

export const FORMATOS_CARNE = { TRES: "3 parcelas por folha", UM: "1 parcela por folha" } as const;
export type FormatoCarne = keyof typeof FORMATOS_CARNE;
export type AreaCarne = "FINANCEIRO" | "CONTRATOS";

export const gerarCarneSchema = z.object({
  area: z.enum(["FINANCEIRO", "CONTRATOS"]),
  parcelas: z.array(z.string().regex(/^[0-9a-f-]{36}$/i)).min(1).max(120),
  formato: z.enum(["TRES", "UM"]).default("TRES"),
  capa: z.boolean().default(true),
});
export type GerarCarne = z.input<typeof gerarCarneSchema>;

/** POST /v1/escritorio/recebimento/pedido (F3.80): quem não é dono pede a chave Pix à sócia dona. */
export const pedirChavePixSchema = z.object({
  area: z.enum(["FINANCEIRO", "CONTRATOS"]),
  contratoId: z.string().uuid().optional(),
});
export type PedirChavePix = z.input<typeof pedirChavePixSchema>;
export interface PedidoChavePix {
  para: PessoaRef;
  /** Já havia um pedido seu que ela ainda não leu: nenhum aviso novo saiu. */
  jaPedido: boolean;
}

export interface ParcelaParaCarne {
  id: string;
  descricao: string;
  /** Ordem da parcela no contrato e quantas são ("4 de 6"). */
  ordem: number;
  total: number;
  vencimento: string;
  valor: number;
  situacao: "A_VENCER" | "VENCIDA" | "PARCIAL" | "PAGA" | "CANCELADA";
  pagaEm: string | null;
}

export interface MudancaCarne {
  tipo: "CANCELADA" | "VENCIMENTO" | "VALOR" | "CHAVE_PIX";
  parcela: string | null;
  era: string | null;
  agora: string | null;
}

export interface CarneGerado {
  id: string;
  formato: FormatoCarne;
  capa: boolean;
  geradoPor: PessoaRef;
  geradoEm: string;
  comPix: boolean;
  parcelas: { descricao: string; ordem: number; total: number; vencimento: string; valor: number; semValor: boolean }[];
  /** O que mudou depois do carnê (parcela cancelada, vencimento, valor ou chave Pix). Vazio: em dia. */
  mudancas: MudancaCarne[];
  /** Para quem o carnê foi pelo WhatsApp (F3.79, decisão 11). */
  envios?: EnvioCarne[];
}

// ------------------------------------------------------------------ Carnê pelo WhatsApp (F3.79)

export interface EnvioCarne {
  id: string;
  para: string;
  telefone: string;
  em: string;
  por: PessoaRef | null;
  /** NA_FILA até a ligação com a Meta entregar. */
  envio: "NA_FILA" | "ENVIADA" | "ENTREGUE" | "LIDA" | "FALHOU" | null;
}

export type BloqueioEnvioCarne = "WHATSAPP_NAO_LIGADO" | "SEM_WHATSAPP" | "JANELA_FECHADA_SEM_MODELO";

/** GET /v1/escritorio/carnes/:id/envio: a prévia da mensagem, com o PDF gerado no servidor. */
export interface PreviaEnvioCarne {
  cliente: { nome: string };
  para: { nome: string; papel: string | null; telefone: string } | null;
  titular: { nome: string; telefone: string } | null;
  escritorio: string;
  ultimaDoCliente: string | null;
  bloqueio: BloqueioEnvioCarne | null;
  envios: EnvioCarne[];
  texto: string;
  arquivo: { nome: string; tamanho: number; folhas: number };
}

export const enviarCarneSchema = z.object({
  area: z.enum(["FINANCEIRO", "CONTRATOS"]),
  texto: z.string().trim().min(1).max(1024),
  tambemCliente: z.boolean().default(false),
});
export type EnviarCarne = z.input<typeof enviarCarneSchema>;

/** GET /v1/escritorio/carnes/:id/pdf: o link de 60 segundos para baixar o PDF. */
export interface PdfDoCarne { url: string; nome: string; tamanho: number }

const primeiro = (n: string) => n.trim().split(/\s+/)[0] ?? n;

/**
 * A mensagem que acompanha o PDF (estado carne-whats): "Olá, Marta! Aqui está o carnê dos
 * honorários do Hélio, contrato C-2026-014: as parcelas 4 a 6, de R$ 850,00, que vencem todo dia 25."
 */
export function textoEnvioCarne(c: Pick<CarneParaImprimir, "cliente" | "contrato" | "parcelas" | "pix" | "escritorio">, para: string): string {
  const ps = c.parcelas;
  const doCliente = primeiro(para).toLowerCase() === primeiro(c.cliente.nome).toLowerCase() ? "dos seus honorários" : `dos honorários ${c.cliente.tipo === "PJ" ? "de" : "do"} ${c.cliente.tipo === "PJ" ? c.cliente.nome : primeiro(c.cliente.nome)}`;
  let quais: string;
  if (ps.length === 1) {
    const p = ps[0]!;
    quais = `a parcela ${p.ordem} de ${p.total}, de ${reaisTexto(p.valor)}, que vence em ${p.vencimento.slice(8, 10)}/${p.vencimento.slice(5, 7)}/${p.vencimento.slice(0, 4)}`;
  } else {
    const faixa = `as parcelas ${ps[0]!.ordem} a ${ps[ps.length - 1]!.ordem}`;
    const mesmoValor = ps.every((p) => p.valor === ps[0]!.valor);
    const mesmoDia = ps.every((p) => p.vencimento.slice(8, 10) === ps[0]!.vencimento.slice(8, 10));
    quais = mesmoValor && mesmoDia ? `${faixa}, de ${reaisTexto(ps[0]!.valor)}, que vencem todo dia ${Number(ps[0]!.vencimento.slice(8, 10))}`
      : `${faixa}, que somam ${reaisTexto(ps.reduce((s, p) => s + p.valor, 0))}`;
  }
  const como = c.pix ? "Em cada parcela tem o QR e o Pix copia e cola." : "Em cada parcela está o identificador para escrever na descrição do pagamento.";
  return `Olá, ${primeiro(para)}! Aqui está o carnê ${doCliente}, contrato ${c.contrato.numero}: ${quais}.\n\n${como} Depois de pagar, mande o comprovante por aqui: o recibo chega nesta conversa.\n\n${c.escritorio.nome}`;
}

const reaisTexto = (centavos: number) =>
  `R$ ${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(centavos / 100)}`;

export interface OpcoesCarne {
  contrato: { id: string; numero: string; objeto: string; situacao: string };
  cliente: { id: string; nome: string };
  parcelas: ParcelaParaCarne[];
  recebimento: { pixTipo: TipoChavePix | null; pixChave: string | null; recebedor: string | null; cidade: string | null; instrucoes: string | null };
  dono: boolean;
  socioDono: PessoaRef | null;
  carnes: CarneGerado[];
  /** F3.80: você já pediu a chave Pix e a sócia dona ainda não leu o aviso. */
  chavePedida?: boolean;
}

/** Uma parcela no carnê para imprimir, já com o Pix copia e cola montado. */
export interface ParcelaImpressa {
  descricao: string;
  ordem: number;
  total: number;
  vencimento: string;
  valor: number;
  semValor: boolean;
  txid: string;
  pix: string | null;
}

export interface CarneParaImprimir {
  id: string;
  formato: FormatoCarne;
  capa: boolean;
  geradoEm: string;
  /** A marca guardada no dia do carnê (F3.81); sem ela, o nome em letra. */
  marca?: MarcaNoDocumento | null;
  escritorio: { nome: string; cnpj: string | null; endereco: string | null; cidade: string | null; uf: string | null; whatsapp: string | null; oab?: string | null };
  cliente: { nome: string; documento: string | null; tipo: "PF" | "PJ" };
  contrato: { id: string; numero: string; objeto: string };
  pix: { tipo: TipoChavePix; chave: string; recebedor: string; cidade: string } | null;
  instrucoes: string | null;
  parcelas: ParcelaImpressa[];
  mudancas: MudancaCarne[];
}

/** O documento do cliente no carnê, só com o meio à mostra (***.482.617-**). */
export function documentoParcial(doc: string | null): string | null {
  if (!doc) return null;
  if (/^\d{11}$/.test(doc)) return `***.${doc.slice(3, 6)}.${doc.slice(6, 9)}-**`;
  if (/^\d{14}$/.test(doc)) return doc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  return null;
}

/** Monta o Pix de cada parcela a partir da cópia guardada no carnê. */
export function pixDaParcela(
  pix: CarneParaImprimir["pix"],
  p: { semValor: boolean; valor: number; txid: string; ordem: number; total: number },
  numeroContrato: string,
): string | null {
  if (!pix) return null;
  return brCodePix({
    chave: pix.chave,
    recebedor: pix.recebedor,
    cidade: pix.cidade,
    valor: p.semValor ? null : p.valor,
    txid: p.txid,
    info: `Parcela ${p.ordem}/${p.total} ${numeroContrato}`,
  });
}
