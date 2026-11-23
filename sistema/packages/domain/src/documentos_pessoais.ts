// Documentos para começar (AP-08, EX-18), desenho aprovado em
// docs/design/aprovadas/portal-jornada-fechamento (grupo 9): os documentos pessoais na ficha do
// cliente e a lista por área. As regras estão no banco (0853); aqui o esquema confere a forma.
// O termo de curatela (F3.118, 0930) fica na mesma tabela, mas fora de Documentos pessoais.

import { z } from "zod";
import type { PessoaRef } from "./clientes.ts";
import { TAMANHO_MAXIMO_DOCUMENTO, TIPOS_DOCUMENTO, type TipoDocumento } from "./console.ts";
import type { AreaDireito, MensagemAviso } from "./juridico.ts";
import { MAX_FOTOS_ASSINADO } from "./pdf_fotos.ts";

/** Os tipos fixos e poucos (decisão 35). */
export const TIPOS_DOCUMENTO_PESSOAL = {
  RG_CPF: "RG e CPF",
  CNH: "CNH",
  COMPROVANTE_RESIDENCIA: "Comprovante de residência",
  CERTIDAO_CASAMENTO: "Certidão de casamento",
  CERTIDAO_NASCIMENTO: "Certidão de nascimento",
  CERTIDAO_OBITO: "Certidão de óbito",
  OUTRO: "Outro documento pessoal",
} as const;
export type TipoDocumentoPessoal = keyof typeof TIPOS_DOCUMENTO_PESSOAL;

/** Fora de `TIPOS_DOCUMENTO_PESSOAL`: não aparece em Documentos pessoais (F3.118). */
export const TIPO_TERMO_CURATELA = "TERMO_CURATELA" as const;
const TIPOS = Object.keys(TIPOS_DOCUMENTO_PESSOAL) as [TipoDocumentoPessoal, ...TipoDocumentoPessoal[]];

/** As áreas que têm lista (Outra não tem). */
export const AREAS_COM_LISTA = ["PREVIDENCIARIO", "TRABALHISTA", "CIVEL", "CONSUMIDOR", "FAMILIA", "SAUDE", "TRIBUTARIO"] as const satisfies readonly AreaDireito[];
export type AreaComLista = (typeof AREAS_COM_LISTA)[number];

export interface DocumentoPessoal {
  id: string;
  tipo: TipoDocumentoPessoal;
  descricao: string | null;
  dataDocumento: string | null;
  nome: string;
  arquivoTipo: TipoDocumento;
  tamanho: number;
  fotos: number | null;
  enviadoPor: PessoaRef | null;
  enviadoEm: string;
  dias: number | null;
  vencido: boolean;
  anteriores: number;
}

/** O termo de curatela em uso, na ficha e em Gerar documentos (F3.118). */
export interface TermoCuratela {
  id: string;
  tipo: typeof TIPO_TERMO_CURATELA;
  nome: string;
  arquivoTipo: TipoDocumento;
  tamanho: number;
  fotos: null;
  enviadoPor: PessoaRef | null;
  enviadoEm: string;
  anteriores: number;
}

export interface PedidoPessoalAberto {
  id: string;
  tipoPessoal: TipoDocumentoPessoal;
  descricao: string;
  pedidoEm: string;
  caso: { id: string; nome: string };
}

export interface DocumentosPessoais {
  hoje: string;
  validadeDias: number;
  podeAnexar: boolean;
  /** Só a sócia dona muda o prazo do comprovante (F3.134). */
  podeMudarPrazo: boolean;
  /** Os sócios donos, na ordem de entrada no escritório (o "Quem muda"). */
  sociosDonos: string[];
  documentos: DocumentoPessoal[];
  pedidos: PedidoPessoalAberto[];
}

const idOpcional = z.string().uuid().nullish();
const nomeArquivoSchema = z.string().trim().min(1).max(200).refine((n) => !/[/\\]/.test(n), { message: "Nome de arquivo inválido" });
const arquivoTipoSchema = z.enum(Object.keys(TIPOS_DOCUMENTO) as [TipoDocumento, ...TipoDocumento[]]);
const tamanhoSchema = z.number().int().min(1).max(TAMANHO_MAXIMO_DOCUMENTO);

export const iniciarDocumentoPessoalSchema = z.object({
  tipo: z.enum(TIPOS),
  descricao: z.string().trim().max(160).nullish(),
  dataDocumento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  nome: nomeArquivoSchema,
  arquivoTipo: arquivoTipoSchema,
  tamanho: tamanhoSchema,
  fotos: z.number().int().min(2).max(MAX_FOTOS_ASSINADO).nullish(),
  substitui: idOpcional,
  pedidoId: idOpcional,
});
export type IniciarDocumentoPessoal = z.infer<typeof iniciarDocumentoPessoalSchema>;

/**
 * O envio do termo de curatela: um arquivo só (PDF, JPG ou PNG, até 10 MB). O tipo, o cliente e o
 * escritório não vêm do navegador; o que vier a mais é descartado.
 */
export const iniciarTermoCuratelaSchema = z.object({ nome: nomeArquivoSchema, arquivoTipo: arquivoTipoSchema, tamanho: tamanhoSchema });
export type IniciarTermoCuratela = z.infer<typeof iniciarTermoCuratelaSchema>;

/** O nome que a equipe vê: a descrição, se houver, senão o tipo. */
export function nomeDoDocumentoPessoal(d: Pick<DocumentoPessoal, "tipo" | "descricao">): string {
  return d.descricao?.trim() || TIPOS_DOCUMENTO_PESSOAL[d.tipo];
}

/** Precisa de atenção: o comprovante com a data do papel além do prazo (decisão 36). */
export const precisaAtencao = (d: DocumentoPessoal) => d.vencido;

/**
 * O texto do "Pedir pelo WhatsApp" da ficha (pergunta 9): só abre a conversa, sem registrar
 * pedido. O pedido registrado, com lembrete, começa quando o caso abre.
 */
export function textoPedirDocumentosPessoais(contato: string, escritorio: string, cliente: string, documentos: string[]): string {
  const primeiro = contato.trim().split(/\s+/)[0] ?? "";
  const sobre = contato.trim() === cliente.trim() ? "" : ` de ${cliente.trim().split(/\s+/)[0]}`;
  const lista = listaComE(documentos.map(textoNoMeio));
  return `Olá, ${primeiro}. Aqui é do escritório ${escritorio}. Para deixar os documentos${sobre} em dia, precisamos de: ${lista}. Pode mandar uma foto ou o arquivo por aqui mesmo. Se já mandou, agradecemos e pode desconsiderar esta mensagem.`;
}

// ------------------------------------------------------------------------- a lista por área

export interface DocumentoInicio {
  id: string;
  ordem: number;
  nome: string;
  comoPedir: string | null;
  pessoal: TipoDocumentoPessoal | null;
  seHouver: boolean;
  versao: number;
}

export interface SugestaoDocumentoInicio {
  nome: string;
  comoPedir: string | null;
  pessoal: TipoDocumentoPessoal | null;
  seHouver: boolean;
}

export interface DocumentosInicio {
  podeEditar: boolean;
  /** Só a sócia dona muda o prazo do comprovante, mesmo com juridico.etapas.editar (F3.134). */
  podeMudarPrazo: boolean;
  sociosDonos: string[];
  validadeDias: number;
  /** Os comprovantes em uso dos clientes ativos e quantos passaram do prazo (a conta da prévia). */
  comprovantesTotal: number;
  comprovantesVencidos: number;
  /** Quantas listas dizem "últimos {validadeDias} dias" no "Como pedir" do comprovante. */
  listasComFrase: number;
  areas: { area: AreaComLista; itens: DocumentoInicio[]; sugestao: SugestaoDocumentoInicio[] }[];
}

export const documentoInicioSchema = z.object({
  area: z.enum(AREAS_COM_LISTA).optional(),
  nome: z.string().trim().min(3).max(80),
  comoPedir: z.string().trim().max(300).nullish(),
  pessoal: z.enum(TIPOS).nullish(),
  seHouver: z.boolean(),
  versao: z.number().int().min(1).optional(),
});
export const tirarDocumentoInicioSchema = z.object({ versao: z.number().int().min(1) });
export const sugestaoDocumentosInicioSchema = z.object({ area: z.enum(AREAS_COM_LISTA) });
export const moverDocumentoInicioSchema = z.object({ direcao: z.enum(["SOBE", "DESCE"]) });

// ------------------------------------------------------------------------- o prazo do comprovante (F3.134)

/** O prazo do comprovante de residência, em dias da data do papel (0853: check de 30 a 365). */
export const PRAZO_COMPROVANTE = { min: 30, max: 365, padrao: 90 } as const;

/** As opções rápidas da folha "Prazo do comprovante", pelo desenho aprovado. */
export const OPCOES_PRAZO_COMPROVANTE = [
  { dias: 60, rotulo: "60 dias", ajuda: "Para juízos e cartórios que pedem conta mais recente." },
  { dias: 90, rotulo: "90 dias · o padrão", ajuda: "O que o INSS, os cartórios e a maioria dos juízos aceitam." },
  { dias: 180, rotulo: "180 dias", ajuda: "Para quem só lida com órgãos que aceitam até 6 meses." },
] as const;

/** O corpo do PUT. O limite de 30 a 365 é conferido no banco, para o erro vir preso ao campo. */
export const prazoComprovanteSchema = z.object({
  validadeDias: z.number().int().nullish(),
  trocarTexto: z.boolean(),
});
export type PrazoComprovanteCorpo = z.infer<typeof prazoComprovanteSchema>;

export interface PedidoComprovanteAberto {
  casoId: string;
  caso: string;
  pedidoEm: string;
  /** O contato principal, quando não é o próprio cliente. */
  contato: { nome: string; papel: string | null } | null;
  peloWhatsapp: boolean;
}

export interface PreviaPrazoComprovante {
  dias: number;
  atual: number;
  totalComComprovante: number;
  vencidosAgora: number;
  vencidosCom: number;
  passamAQtd: number;
  passamA: { clienteId: string; nome: string; dias: number }[];
  voltamAEmDiaQtd: number;
  voltamAEmDia: { clienteId: string; nome: string; dias: number; dataDocumento: string; pedidos: PedidoComprovanteAberto[] }[];
  listasComFrase: number;
  itensComFrase: number;
}

export interface PrazoComprovanteSalvo {
  validadeDias: number;
  de: number;
  mudou: boolean;
  passaramA: number;
  voltaramAEmDia: number;
  textosTrocados: number;
  listasTrocadas: number;
  /** Os textos que passariam de 300 letras com o número novo e ficaram como estavam. */
  naoCouberam: number;
}

/**
 * Quem muda (o desenho aprovado): com uma sócia dona, o nome dela; com mais de um, todos, na
 * ordem de entrada no escritório. `oque` entra depois de "Quem muda" ("as listas e o prazo").
 */
export function quemMuda(socios: readonly string[], oque?: string): string {
  const q = oque ? `Quem muda ${oque}` : "Quem muda";
  if (socios.length > 1) return `${q} são os sócios donos: ${listaComE([...socios])}.`;
  return socios[0] ? `${q} é ${socios[0]}, a sócia dona.` : `${q} é a sócia dona.`;
}

// ------------------------------------------------------------------------- na abertura do caso (EX-18)

/** Um item da lista na abertura: "Já temos" (na ficha e em dia), o comprovante vencido ou a pedir. */
export interface ItemPreviaInicio {
  itemId: string;
  nome: string;
  comoPedir: string | null;
  pessoal: TipoDocumentoPessoal | null;
  seHouver: boolean;
  /** Como o documento entra no aviso ao cliente: o nome e o "como pedir". */
  noAviso: string;
  situacao: "JA_TEMOS" | "VENCIDO" | "PEDIR";
  doc: DocumentoPessoal | null;
}

export interface PreviaDocumentosInicio {
  area: AreaDireito;
  itens: ItemPreviaInicio[];
  cliente: { id: string; nome: string } | null;
  contato: { nome: string; celular: boolean; semAvisos: boolean } | null;
  whatsappLigado: boolean;
  /** O texto do aviso "Pedido de documento" do escritório, com {nome}, {caso} e {documento}. */
  modelo: string | null;
  escritorio: string;
  podeConferir: boolean;
}

/** O que vai com o caso novo: os itens marcados, os pedidos a mais e se avisa o contato. */
export const documentosDoCasoSchema = z.object({
  pedir: z.array(z.string().uuid()).max(30).default([]),
  mais: z.array(z.string().trim().max(160)).max(10).default([]),
  avisar: z.boolean().default(false),
});
export type DocumentosNaAbertura = z.input<typeof documentosDoCasoSchema>;

/** Os de começar na ficha do caso: a contagem, o que falta e o que já temos. */
export interface InicioDoCaso {
  total: number;
  chegaram: number;
  area: AreaDireito;
  faltam: { id: string; descricao: string; tipoPessoal: TipoDocumentoPessoal | null }[];
  temos: { id: string; descricao: string; tipoPessoal: TipoDocumentoPessoal | null; chegouEm: string; chegouPor: PessoaRef | null; daFicha: boolean }[];
  aviso: MensagemAviso | null;
}

/** "Comprovante de residência" no meio da frase; "RG e CPF" fica como está (igual ao banco). */
export function textoNoMeio(t: string): string {
  return /^.[a-zà-ÿ]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
}

/** "a, b e c". */
export function listaComE(p: string[]): string {
  return p.length <= 1 ? (p[0] ?? "") : `${p.slice(0, -1).join(", ")} e ${p.at(-1)}`;
}

/**
 * A prévia do aviso com a lista (decisão 44): o aviso "Pedido de documento" do escritório, o
 * mesmo que o banco preenche, com o primeiro nome do contato, o caso e o que falta.
 */
export function textoAvisoDocumentosInicio(modelo: string, contato: string, escritorio: string, caso: string, documentos: string[]): string {
  const campos: Record<string, string> = {
    nome: contato.trim().split(/\s+/)[0] ?? "", "nome do escritório": escritorio, caso: caso.trim(), documento: listaComE(documentos),
  };
  return modelo.replace(/\{([^{}]{1,40})\}/g, (m, c: string) => campos[c] ?? m);
}
