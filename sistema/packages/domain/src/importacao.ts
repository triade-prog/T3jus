// Importar clientes e contratos de uma planilha (F3.55, VA-05). A API lê o arquivo na memória
// (o arquivo nunca fica guardado) e manda ao banco só as células de cada aba. Aqui, sem
// biblioteca: o .xlsx é um .zip de arquivos XML (descompactado com o DecompressionStream, que o
// Deno, o Node e os navegadores têm) e o .csv é texto separado por ponto e vírgula ou vírgula.

import { z } from "zod";
import type { PessoaRef } from "./clientes.ts";

export const LIMITE_ARQUIVO_BYTES = 5 * 1024 * 1024;
export const LIMITE_LINHAS = 2000;
/** O backup de outro sistema (F3.56) traz o escritório inteiro: até 20 MB e 10.000 linhas por aba. */
export const LIMITE_BACKUP_BYTES = 20 * 1024 * 1024;
export const LIMITE_BACKUP_LINHAS = 10000;

export interface LimitesLeitura { bytes: number; linhas: number }
const LIMITES_PLANILHA: LimitesLeitura = { bytes: LIMITE_ARQUIVO_BYTES, linhas: LIMITE_LINHAS };
export const LIMITES_BACKUP: LimitesLeitura = { bytes: LIMITE_BACKUP_BYTES, linhas: LIMITE_BACKUP_LINHAS };

export type MotivoArquivo = "ARQUIVO_FORMATO" | "ARQUIVO_VAZIO" | "ARQUIVO_GRANDE" | "ARQUIVO_PROTEGIDO" | "SEM_CABECALHO";

export class ErroArquivo extends Error {
  readonly motivo: MotivoArquivo;
  constructor(motivo: MotivoArquivo) {
    super(motivo);
    this.name = "ErroArquivo";
    this.motivo = motivo;
  }
}

export interface AbaLida {
  nome: string;
  colunas: string[];
  linhas: string[][];
}

// ------------------------------------------------------------------------------------- .zip

interface EntradaZip {
  metodo: number;
  tamanho: number;
  inicio: number;
}

function lerZip(b: Uint8Array): Map<string, EntradaZip> {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let fim = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { fim = i; break; }
  }
  if (fim < 0) throw new ErroArquivo("ARQUIVO_FORMATO");
  const total = dv.getUint16(fim + 10, true);
  let p = dv.getUint32(fim + 16, true);
  const dec = new TextDecoder();
  const mapa = new Map<string, EntradaZip>();
  for (let n = 0; n < total; n++) {
    if (p + 46 > b.length || dv.getUint32(p, true) !== 0x02014b50) throw new ErroArquivo("ARQUIVO_FORMATO");
    const flags = dv.getUint16(p + 8, true);
    const metodo = dv.getUint16(p + 10, true);
    const tamanho = dv.getUint32(p + 20, true);
    const lnome = dv.getUint16(p + 28, true);
    const lextra = dv.getUint16(p + 30, true);
    const lcom = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const nome = dec.decode(b.subarray(p + 46, p + 46 + lnome));
    if (flags & 1) throw new ErroArquivo("ARQUIVO_PROTEGIDO");
    if (local + 30 > b.length) throw new ErroArquivo("ARQUIVO_FORMATO");
    const inicio = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    mapa.set(nome, { metodo, tamanho, inicio });
    p += 46 + lnome + lextra + lcom;
  }
  return mapa;
}

async function abrirZip(b: Uint8Array, e: EntradaZip): Promise<string> {
  const dados = b.subarray(e.inicio, e.inicio + e.tamanho);
  if (e.metodo === 0) return new TextDecoder().decode(dados);
  if (e.metodo !== 8) throw new ErroArquivo("ARQUIVO_FORMATO");
  const fluxo = new Blob([dados.slice()]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return await new Response(fluxo).text();
}

// ------------------------------------------------------------------------------------- .xlsx

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function semEntidades(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (t, c: string) =>
    c[0] === "#" ? String.fromCodePoint(c[1] === "x" || c[1] === "X" ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10)) : (ENTIDADES[c] ?? t));
}

/** O texto de um <si> ou <is>: junta os <t> (com ou sem formatação em <r>). */
function textoRico(xml: string): string {
  let t = "";
  for (const m of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) t += m[1];
  return semEntidades(t);
}

function atributo(tag: string, nome: string): string | undefined {
  return new RegExp(`\\s${nome}="([^"]*)"`).exec(tag)?.[1];
}

/** Índices dos estilos de célula que são data (formatos de data embutidos e os do arquivo). */
function estilosDeData(xml: string | undefined): Set<number> {
  const datas = new Set<number>();
  if (!xml) return datas;
  const proprios = new Map<number, string>();
  for (const m of xml.matchAll(/<numFmt\s[^>]*>/g)) {
    const id = Number(atributo(m[0], "numFmtId"));
    proprios.set(id, semEntidades(atributo(m[0], "formatCode") ?? ""));
  }
  const xfs = /<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/.exec(xml)?.[1] ?? "";
  let i = 0;
  for (const m of xfs.matchAll(/<xf\s[^>]*?\/?>/g)) {
    const id = Number(atributo(m[0], "numFmtId") ?? 0);
    const fmt = proprios.get(id);
    const ehData = (id >= 14 && id <= 22) || (id >= 45 && id <= 47) ||
      (fmt !== undefined && /[dmy]/i.test(fmt.replace(/\[[^\]]*\]|"[^"]*"|\\./g, "")) && !/^[#0.,%\s]*$/.test(fmt));
    if (ehData) datas.add(i);
    i++;
  }
  return datas;
}

/** Número de série do Excel (dias desde 30/12/1899) em dd/mm/aaaa. */
export function dataDoExcel(serie: number): string {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(serie) * 86400000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** Número como o escritório escreve: vírgula nos decimais, sem notação científica. */
function numeroBr(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  const s = Number.isInteger(n) ? n.toFixed(0) : String(Math.round(n * 100) / 100);
  return s.replace(".", ",");
}

function colunaDe(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/[0-9]/g, "")) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function lerAbaXml(xml: string, compartilhadas: string[], datas: Set<number>): string[][] {
  const linhas: string[][] = [];
  for (const r of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const num = Number(atributo(r[0].slice(0, r[0].indexOf(">") + 1), "r") ?? linhas.length + 1);
    const linha: string[] = [];
    let auto = 0;
    for (const c of r[2]!.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const tag = `<c${c[1]}>`;
      const ref = atributo(tag, "r");
      const col = ref ? colunaDe(ref) : auto;
      auto = col + 1;
      const tipo = atributo(tag, "t");
      const estilo = Number(atributo(tag, "s") ?? 0);
      const corpo = c[2] ?? "";
      const v = /<v>([\s\S]*?)<\/v>/.exec(corpo)?.[1];
      let texto = "";
      if (tipo === "s") texto = compartilhadas[Number(v)] ?? "";
      else if (tipo === "inlineStr") texto = textoRico(corpo);
      else if (tipo === "str" || tipo === "e") texto = semEntidades(v ?? "");
      else if (tipo === "b") texto = v === "1" ? "sim" : "não";
      else if (tipo === "d") texto = v ? dataDoExcel((Date.parse(v) - Date.UTC(1899, 11, 30)) / 86400000) : "";
      else if (v !== undefined) texto = datas.has(estilo) ? dataDoExcel(Number(v)) : numeroBr(v);
      linha[col] = texto.trim();
    }
    while (linhas.length < num - 1) linhas.push([]);
    linhas.push(Array.from(linha, (x) => x ?? ""));
  }
  return linhas;
}

async function lerXlsx(b: Uint8Array): Promise<{ nome: string; celulas: string[][] }[]> {
  const zip = lerZip(b);
  const abrir = async (nome: string) => {
    const e = zip.get(nome);
    return e ? await abrirZip(b, e) : undefined;
  };
  const livro = await abrir("xl/workbook.xml");
  if (!livro) throw new ErroArquivo("ARQUIVO_FORMATO");
  const rels = (await abrir("xl/_rels/workbook.xml.rels")) ?? "";
  const alvo = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\s[^>]*>/g)) {
    const id = atributo(m[0], "Id");
    const t = atributo(m[0], "Target");
    if (id && t) alvo.set(id, t.startsWith("/") ? t.slice(1) : `xl/${t}`);
  }
  const compartilhadas: string[] = [];
  const sst = await abrir("xl/sharedStrings.xml");
  if (sst) for (const m of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) compartilhadas.push(textoRico(m[1]!));
  const datas = estilosDeData(await abrir("xl/styles.xml"));
  const abas: { nome: string; celulas: string[][] }[] = [];
  for (const m of livro.matchAll(/<sheet\s[^>]*>/g)) {
    const caminho = alvo.get(atributo(m[0], "r:id") ?? "");
    const xml = caminho ? await abrir(caminho) : undefined;
    if (xml === undefined) continue;
    abas.push({ nome: semEntidades(atributo(m[0], "name") ?? `Aba ${abas.length + 1}`), celulas: lerAbaXml(xml, compartilhadas, datas) });
  }
  return abas;
}

// ------------------------------------------------------------------------------------- .csv

function decodificar(b: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(b).replace(/^\uFEFF/, "");
  } catch {
    // Excel antigo salva em Windows-1252.
    return new TextDecoder("windows-1252").decode(b);
  }
}

export function lerCsv(texto: string): string[][] {
  const primeira = texto.split(/\r?\n/, 1)[0] ?? "";
  const contar = (c: string) => primeira.split(c).length - 1;
  const sep = [";", ",", "\t"].reduce((a, c) => (contar(c) > contar(a) ? c : a), ";");
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i]!;
    if (aspas) {
      if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') aspas = false;
      else campo += ch;
    } else if (ch === '"' && campo === "") aspas = true;
    else if (ch === sep) { linha.push(campo.trim()); campo = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo.trim()); linhas.push(linha); linha = []; campo = "";
    } else campo += ch;
  }
  if (campo !== "" || linha.length > 0) { linha.push(campo.trim()); linhas.push(linha); }
  return linhas;
}

// ------------------------------------------------------------------------------------- abas

/** A primeira linha não vazia traz os nomes; sem nome, ou com cara de dado (CPF, data, e-mail), não serve. */
function montarAba(nome: string, celulas: string[][], limiteLinhas: number): AbaLida | null {
  const cheia = (l: string[]) => l.some((c) => c !== "");
  const ini = celulas.findIndex(cheia);
  if (ini < 0) return null;
  const cab = celulas[ini]!;
  let ultima = cab.length - 1;
  while (ultima >= 0 && cab[ultima] === "") ultima--;
  const colunas = cab.slice(0, ultima + 1);
  const dados = celulas.slice(ini + 1);
  const pareceDado = (c: string) => /@/.test(c) || /^[\d.\-/()\s,]+$/.test(c);
  if (colunas.filter((c) => c === "").length > colunas.length / 2 || colunas.filter(pareceDado).length > colunas.length / 2) {
    throw new ErroArquivo("SEM_CABECALHO");
  }
  const largura = Math.max(colunas.length, ...dados.map((l) => l.length));
  const nomes = Array.from({ length: largura }, (_, i) => colunas[i] || `Coluna ${i + 1}`);
  // As linhas guardam o número da planilha: as vazias do meio ficam como linhas vazias.
  let fim = dados.length;
  while (fim > 0 && !cheia(dados[fim - 1]!)) fim--;
  const linhas = dados.slice(0, fim).map((l) => Array.from({ length: largura }, (_, i) => l[i] ?? ""));
  if (linhas.length > limiteLinhas) throw new ErroArquivo("ARQUIVO_GRANDE");
  return { nome: nome.slice(0, 100), colunas: nomes.slice(0, 60), linhas: linhas.map((l) => l.slice(0, 60)) };
}

function comeca(b: Uint8Array, ...bytes: number[]) {
  return bytes.every((x, i) => b[i] === x);
}

/** Lê o arquivo enviado. Erros de arquivo saem como ErroArquivo, com o motivo da tela. */
export async function lerPlanilha(b: Uint8Array, nome: string, limites: LimitesLeitura = LIMITES_PLANILHA): Promise<AbaLida[]> {
  if (b.length === 0) throw new ErroArquivo("ARQUIVO_VAZIO");
  if (b.length > limites.bytes) throw new ErroArquivo("ARQUIVO_GRANDE");
  let brutas: { nome: string; celulas: string[][] }[];
  if (comeca(b, 0xd0, 0xcf, 0x11, 0xe0)) {
    // Arquivo do Office com senha (ou .xls antigo): o T3jus não pede a senha.
    const t = new TextDecoder("utf-16le").decode(b.subarray(0, Math.min(b.length, 1 << 20)));
    throw new ErroArquivo(t.includes("EncryptedPackage") || t.includes("EncryptionInfo") ? "ARQUIVO_PROTEGIDO" : "ARQUIVO_FORMATO");
  } else if (comeca(b, 0x50, 0x4b, 0x03, 0x04)) {
    brutas = await lerXlsx(b);
  } else if (/\.(csv|txt)$/i.test(nome) && !comeca(b, 0x25, 0x50, 0x44, 0x46)) {
    const texto = decodificar(b);
    // Caracteres de controle no começo: não é texto (um binário com o nome trocado).
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u0008\u000e-\u001f]/.test(texto.slice(0, 4000))) throw new ErroArquivo("ARQUIVO_FORMATO");
    brutas = [{ nome: nome.replace(/\.[^.]+$/, ""), celulas: lerCsv(texto) }];
  } else {
    throw new ErroArquivo("ARQUIVO_FORMATO");
  }
  const abas = brutas.slice(0, 20).map((a) => montarAba(a.nome, a.celulas, limites.linhas));
  if (abas.every((a) => a === null || a.linhas.length === 0)) throw new ErroArquivo("ARQUIVO_VAZIO");
  return abas.map((a, i) => a ?? { nome: brutas[i]!.nome, colunas: [], linhas: [] });
}

// ------------------------------------------------------------------------------------- tipos da API

/**
 * CASOS: os processos de outro sistema, como casos no Jurídico (F3.56, parte 2). FINANCEIRO: os
 * lançamentos do backup do Astrea, só como informação na ficha do cliente (parte 3).
 */
export type OQueImportar = "CLIENTES" | "CLIENTES_CONTRATOS" | "CASOS" | "FINANCEIRO";
/** De onde vêm os dados (F3.56): a planilha de sempre, o backup do Astrea ou a planilha do ADVBOX. */
export type OrigemDados = "PLANILHA" | "ASTREA" | "ADVBOX_PLANILHA";
export const NOMES_ORIGEM_IMPORTACAO: Record<OrigemDados, string> = {
  PLANILHA: "Planilha", ASTREA: "Astrea · backup", ADVBOX_PLANILHA: "ADVBOX · planilha",
};
export type SituacaoImportacao = "PREVIA" | "CONCLUIDA" | "DESFEITA" | "CANCELADA" | "EXPIRADA";
/** FORA_REGRA: lida e mostrada na prévia, nunca importada (a despesa do escritório, F3.117). */
export type SituacaoLinha = "PRONTA" | "AVISO" | "ERRO" | "PULADA" | "IMPORTADA" | "FORA_REGRA";
export type DecisaoLinha = "JUNTAR" | "NOVO" | "SEGUIR" | "PULAR";
export type TipoImportado = "FIXO" | "PARCELADO" | "MENSAL" | "EXITO";

export const CAMPOS_CLIENTE_IMPORTACAO = [
  "nome", "documento", "telefone", "email", "contato_nome", "contato_papel", "nacionalidade", "estado_civil", "profissao",
  "rg", "rg_orgao", "cep", "endereco", "bairro", "cidade", "uf", "origem", "origem_indicacao",
] as const;
export const CAMPOS_CONTRATO_IMPORTACAO = ["objeto", "tipo", "valor", "parcelas", "primeiro", "pagas", "assinatura", "responsavel"] as const;
/** Só no backup de outro sistema: separa cliente, parte contrária e terceiros (decisão 9 do F3.56). */
export const CAMPO_TIPO_CONTATO = "tipo_contato";
/** Os campos de um processo de outro sistema, que vira caso no Jurídico (F3.56, parte 2). */
export const CAMPOS_CASO_IMPORTACAO = [
  "cliente", "cliente_documento", "numero", "caso_nome", "area", "parte_contraria", "tribunal", "vara", "valor_causa", "distribuido_em",
  "etapa", "situacao_processo", "papel", "responsavel",
] as const;
/** Os campos de um lançamento do financeiro antigo (F3.56, parte 3). */
export const CAMPOS_LANCAMENTO_IMPORTACAO = [
  "cliente", "cliente_documento", "numero", "lanc_descricao", "lanc_data", "lanc_valor", "lanc_situacao", "lanc_tipo",
] as const;
export type CampoImportacao =
  | (typeof CAMPOS_CLIENTE_IMPORTACAO)[number] | (typeof CAMPOS_CONTRATO_IMPORTACAO)[number] | typeof CAMPO_TIPO_CONTATO
  | (typeof CAMPOS_CASO_IMPORTACAO)[number] | (typeof CAMPOS_LANCAMENTO_IMPORTACAO)[number];
/** O que o tipo de contato vira: cliente, parte contrária nos casos ou fica de fora. */
export type TipoContato = "CLIENTE" | "PARTE_CONTRARIA" | "FORA";

/** Os nomes da tela (os do desenho aprovado). */
export const NOMES_CAMPO_IMPORTACAO: Record<CampoImportacao, string> = {
  nome: "Nome ou razão social", documento: "CPF ou CNPJ", telefone: "Telefone ou WhatsApp", email: "E-mail", contato_nome: "Com quem falar",
  contato_papel: "Papel do contato", nacionalidade: "Nacionalidade", estado_civil: "Estado civil", profissao: "Profissão", rg: "RG",
  rg_orgao: "Órgão emissor do RG", cep: "CEP", endereco: "Endereço", bairro: "Bairro", cidade: "Cidade", uf: "UF", origem: "Origem",
  origem_indicacao: "Quem indicou", objeto: "Objeto do contrato", tipo: "Tipo de honorário", valor: "Valor (total, mensal ou percentual)",
  parcelas: "Número de parcelas", primeiro: "Primeiro vencimento", pagas: "Parcelas já pagas", assinatura: "Data da assinatura",
  responsavel: "Responsável pelo contrato", tipo_contato: "Tipo de contato",
  cliente: "Cliente", cliente_documento: "CPF ou CNPJ do cliente", numero: "Número do processo", caso_nome: "Nome do caso",
  area: "Área do direito", parte_contraria: "Parte contrária", tribunal: "Tribunal", vara: "Vara", valor_causa: "Valor da causa",
  distribuido_em: "Distribuído em", etapa: "Fase ou etapa", situacao_processo: "Situação do processo", papel: "Papel do cliente",
  lanc_descricao: "Descrição", lanc_data: "Data", lanc_valor: "Valor", lanc_situacao: "Pago ou em aberto", lanc_tipo: "Receita ou despesa",
};
/** O nome do responsável no caso (o mesmo campo, outro texto). */
export const NOME_RESPONSAVEL_CASO = "Responsável pelo caso";

export interface ColunaImportacao {
  indice: number;
  letra: string;
  nome: string;
  exemplo: string | null;
  campo: CampoImportacao | null;
  sugestao: CampoImportacao | null;
  /** O campo pelo modelo do sistema (Astrea, ADVBOX); nulo na planilha. */
  modelo: CampoImportacao | null;
  foraMotivo: "OBSERVACAO" | "AREA" | null;
}

/** Uma aba do backup, reconhecida ou não pelo modelo do sistema. */
export interface AbaSistema {
  indice: number;
  nome: string;
  linhas: number;
  destino: DestinoAba;
  reconhecida: boolean;
  /** Lida e guardada para a prévia (as abas que ficam de fora não chegam ao T3jus). */
  lida: boolean;
  /** Na aba dos processos: quantos estão ativos e arquivados, pela situação (null sem a coluna). */
  ativos?: number | null;
  arquivados?: number | null;
}

/** O que fazer com os processos arquivados do sistema antigo (F3.116). FORA é o recomendado. */
export type ArquivadosImportacao = "FORA" | "ENCERRADOS";
export type DestinoAba = "CLIENTES" | "CASOS" | "FINANCEIRO" | "TAREFAS" | "AGENDA" | "PUBLICACOES" | "FORA";

export interface Importacao {
  id: string;
  arquivo: string;
  oQue: OQueImportar;
  origem: OrigemDados;
  /** A versão do modelo do sistema usada para ligar (por exemplo, astrea-2026-11). */
  modelo: string | null;
  abasSistema: AbaSistema[] | null;
  /** Contatos do backup que não viraram clientes, por tipo. */
  foraTipo: { PARTE_CONTRARIA: number; FORA: number } | { ARQUIVADOS: number } | { DESPESAS: number } | null;
  situacao: SituacaoImportacao;
  versao: number;
  criadoEm: string;
  por: PessoaRef;
  linhasLidas: number | null;
  contratos: boolean;
  comercial: boolean;
  abas: { indice: number; nome: string; linhas: number; colunas: number }[] | null;
  aba: number;
  colunas: ColunaImportacao[] | null;
  ligacao: Record<string, CampoImportacao>;
  pares: {
    responsavel?: Record<string, string>; tipo?: Record<string, string>; origem?: Record<string, string>; tipoContato?: Record<string, string>;
    area?: Record<string, string>; etapa?: Record<string, string>; situacaoProcesso?: Record<string, string>;
    lancSituacao?: Record<string, string>; lancTipo?: Record<string, string>;
  };
  temPrevia: boolean;
  importadoEm: string | null;
  desfazerAte: string | null;
  resumo: ResultadoImportacao | null;
  podeDesfazer: boolean;
  fora: number;
  desfeita: { em: string; por: PessoaRef; motivo: string } | null;
  /** A escolha dos processos arquivados (F3.116). */
  arquivados?: ArquivadosImportacao;
  /** A importação dos clientes de onde vieram os processos (F3.56, parte 2). */
  pai?: string | null;
  /** A importação dos processos que nasceu desta, ao importar os clientes do backup. */
  filha?: { id: string; situacao: SituacaoImportacao; linhas: number | null; criadoEm: string } | null;
  /** A importação do financeiro antigo que nasceu desta (F3.56, parte 3). */
  filhaFinanceiro?: { id: string; situacao: SituacaoImportacao; linhas: number | null; criadoEm: string } | null;
}

export interface ResultadoImportacao {
  clientes: number; juntados: number; juntadosIds: string[]; contratos: number; ativos: number; parcelas: number; valor: number;
  vencidas: number; exitos: number; valorPagoAntes: number; linhas: number; fora: number;
  /** Nos processos: os casos novos e os que já existiam e ganharam um cliente. */
  casos?: number; juntadosCasos?: number;
  /** Nos processos: dos casos novos, os que entraram encerrados (F3.116). */
  encerrados?: number;
  /** No financeiro antigo: o que foi recebido, o que está em aberto e os lembretes de contrato. */
  recebidos?: number; valorRecebido?: number; emAberto?: number; valorEmAberto?: number; lembretes?: number;
  /** No financeiro antigo: as despesas do escritório, que nunca entram. */
  despesas?: number;
}

export interface ParValor { chave: string; valor: string; n: number; sugestao: string | null }
export interface ParesImportacao {
  responsavel: ParValor[]; tipo: ParValor[]; origem: ParValor[]; tipoContato: ParValor[]; equipe: PessoaRef[]; colunas: ColunaImportacao[];
  /** Nos processos: a área, a fase e a situação, e as etapas do escritório. */
  area?: ParValor[]; etapa?: ParValor[]; situacaoProcesso?: ParValor[]; etapas?: { id: string; nome: string }[];
  /** No financeiro antigo: pago ou em aberto, receita ou despesa. */
  lancSituacao?: ParValor[]; lancTipo?: ParValor[];
}

export interface ContagensPrevia { lidas: number; prontas: number; aviso: number; erro: number; puladas: number; corrigidas: number; decididas: number }
export interface ResumoPrevia {
  contagens: ContagensPrevia;
  clientes: { novos: number; juntados: number };
  contratos: { ativos: number; elaboracao: number; mensais: number; exitos: number };
  financeiro: { parcelas: number; valor: number; vencidas: number; pagasAntes: number; valorPagoAntes: number };
  meses: { mes: string; valor: number }[];
  /** Só nos processos. */
  casos?: { novos: number; juntados: number; clientes: number; ativos?: number; encerrados?: number };
  /** Só no financeiro antigo. */
  financeiroAntigo?: FinanceiroAntigoResumo;
}
export interface FinanceiroAntigoResumo {
  recebidos: number; valorRecebido: number; emAberto: number; valorEmAberto: number; lembretes: number; clientes: number;
  /** As despesas do escritório, que ficam de fora (F3.117). */
  despesas?: number;
  /** A conta de cada grupo da prévia, com as linhas que não foram puladas. */
  grupos?: Record<"recebidos" | "emAberto" | "despesas", { linhas: number; valor: number }>;
}

export type CodigoProblema =
  | "NOME_FALTA" | "CONTATO_OBRIGATORIO" | "TELEFONE_INVALIDO" | "EMAIL_INVALIDO" | "CPF_INVALIDO" | "CNPJ_INVALIDO" | "DOCUMENTO_INVALIDO"
  | "OBJETO_FALTA" | "TIPO_FALTA" | "VALOR_FALTA" | "VALOR_INVALIDO" | "PARCELAS_INVALIDAS" | "PRIMEIRO_FALTA" | "DATA_INVALIDA"
  | "PAGAS_INVALIDAS" | "RESPONSAVEL_FALTA" | "DUPLICADO" | "TELEFONE_DE_OUTRO" | "SEM_ASSINATURA" | "FORA_DA_LISTA" | "CAMPO_INVALIDO"
  | "CLIENTE_FALTA" | "CLIENTE_NAO_ENCONTRADO" | "CLIENTE_AMBIGUO" | "NUMERO_CNJ_INVALIDO" | "CASO_DUPLICADO";

export interface ProblemaLinha { codigo: CodigoProblema; campo: CampoImportacao; nivel: "ERRO" | "AVISO"; valor?: string }

export interface ParcelaGerada { n: number; vencimento: string; valor: number; pagoAntes: boolean }
export interface LinhaPrevia {
  numero: number;
  situacao: SituacaoLinha;
  decisao: DecisaoLinha | null;
  problemas: ProblemaLinha[];
  valores: Partial<Record<CampoImportacao, string>>;
  corrigidas: { campo: CampoImportacao; antes: string | null; agora: string }[];
  cliente: {
    nome: string; tipo: "PF" | "PJ"; documento?: string;
    contatos: { nome: string; papel?: string; telefone?: string; email?: string }[];
  };
  mesmaDe: number | null;
  telefoneDe: { id: string; nome: string } | null;
  contrato: {
    objeto: string; tipo: TipoImportado | null; valor: number | null; parcelas: number | null; primeiro: string | null; pagas: number;
    assinatura: string | null; responsavel: PessoaRef | null;
    gera: { parcelas: number; valor: number; vencidas: number; valorVencido: number; pagasAntes: number; valorPagoAntes: number;
            proxima: string | null; lista: ParcelaGerada[] } | null;
  } | null;
  duplicado: {
    id: string; nome: string; situacao: string; desde: string; contratos: string[];
    comparar: { campo: CampoImportacao; planilha: string; cadastrado: string | null; resultado: "IGUAL" | "FICA" | "ENTRA" }[];
  } | null;
  /** Só nos processos: o caso que vai entrar no Jurídico. */
  caso?: CasoDaLinha;
  clienteId?: string | null;
  casoExistente?: { id: string; nome: string; numero: string | null; situacao: string; clientes: string[]; jaNoCaso: boolean } | null;
  /** Só no financeiro antigo: o lançamento, que fica na ficha do cliente. */
  lancamento?: LancamentoDaLinha;
}

export interface LancamentoDaLinha {
  descricao: string; data: string | null; valor: number | null; situacao: SituacaoLancamentoAntigo; caso: { id: string; nome: string } | null;
  /** O grupo da prévia (F3.117). */
  grupo?: GrupoLancamento;
}
export type SituacaoLancamentoAntigo = "PAGO" | "EM_ABERTO";
export type GrupoLancamento = "RECEBIDOS" | "EM_ABERTO" | "DESPESAS";
export const GRUPOS_LANCAMENTO: GrupoLancamento[] = ["RECEBIDOS", "EM_ABERTO", "DESPESAS"];
export const NOMES_GRUPO_LANCAMENTO: Record<GrupoLancamento, string> = {
  RECEBIDOS: "Recebidos", EM_ABERTO: "Em aberto", DESPESAS: "Despesas do escritório",
};
/** O grupo de uma linha da prévia do financeiro: a despesa pela situação; o resto pelo que foi pago. */
export function grupoDoLancamento(l: Pick<LinhaPrevia, "situacao" | "lancamento">): GrupoLancamento {
  if (l.lancamento?.grupo) return l.lancamento.grupo;
  if (l.situacao === "FORA_REGRA") return "DESPESAS";
  return l.lancamento?.situacao === "PAGO" ? "RECEBIDOS" : "EM_ABERTO";
}

export interface CasoDaLinha {
  nome: string; area: string; parteContraria: string | null; numero: string | null; tribunal: string | null; vara: string | null;
  valorCausa: number | null; distribuidoEm: string | null; etapa: { id: string; nome: string } | null; etapaAntiga: string | null;
  papel: "AUTOR" | "REU" | "INTERESSADO"; responsavel: PessoaRef | null;
  /** O processo arquivado que entra encerrado, sem resultado (F3.116). */
  encerrado?: boolean;
}

export interface PreviaImportacao extends ResumoPrevia {
  importacao: Importacao;
  linhas: LinhaPrevia[];
  total: number;
}

export interface PlanoDesfazer {
  clientes: number; juntados: number; contratos: number; parcelas: number;
  /** Nos processos: os casos que vão para Encerrados e os clientes ligados a casos que já existiam. */
  casos?: number; ligacoes?: number;
  /** Nos processos: os que entraram encerrados e passam a "importação desfeita". */
  encerrados?: number;
  /** No financeiro antigo: os lançamentos e os lembretes que saem das fichas. */
  lancamentos?: number; lembretes?: number;
  mexidos: { tipo: "CLIENTE" | "CONTRATO" | "CASO" | "LEMBRETE"; id: string; nome: string }[];
}

export interface LinhasFora {
  arquivo: string;
  ligacao: Record<string, CampoImportacao>;
  linhas: { numero: number; valores: Partial<Record<CampoImportacao, string>>; situacao: SituacaoLinha; problemas: ProblemaLinha[] }[];
}

const campo = z.enum([...new Set([...CAMPOS_CLIENTE_IMPORTACAO, ...CAMPOS_CONTRATO_IMPORTACAO, CAMPO_TIPO_CONTATO, ...CAMPOS_CASO_IMPORTACAO,
  ...CAMPOS_LANCAMENTO_IMPORTACAO])] as [CampoImportacao, ...CampoImportacao[]]);
export const enviarImportacaoSchema = z.object({
  oQue: z.enum(["CLIENTES", "CLIENTES_CONTRATOS", "CASOS"]),
  nome: z.string().trim().min(1).max(200),
  origem: z.enum(["PLANILHA", "ASTREA", "ADVBOX_PLANILHA"]).default("PLANILHA"),
});
export const ligacaoImportacaoSchema = z.object({
  aba: z.number().int().min(0).max(19).optional(),
  ligacao: z.record(z.string().regex(/^[0-9]{1,2}$/), z.union([campo, z.literal("")])),
});
const arquivados = z.enum(["FORA", "ENCERRADOS"]);
export const colunasImportacaoSchema = ligacaoImportacaoSchema.extend({
  versao: z.number().int().positive(),
  /** Na planilha de processos do ADVBOX, a escolha dos arquivados vem com as colunas. */
  arquivados: arquivados.optional(),
  pares: z.object({
    responsavel: z.record(z.string().max(200), z.string().max(40)).optional(),
    tipo: z.record(z.string().max(200), z.string().max(40)).optional(),
    origem: z.record(z.string().max(200), z.string().max(40)).optional(),
    tipoContato: z.record(z.string().max(200), z.string().max(40)).optional(),
    area: z.record(z.string().max(200), z.string().max(40)).optional(),
    etapa: z.record(z.string().max(200), z.string().max(40)).optional(),
    situacaoProcesso: z.record(z.string().max(200), z.string().max(40)).optional(),
    lancSituacao: z.record(z.string().max(200), z.string().max(40)).optional(),
    lancTipo: z.record(z.string().max(200), z.string().max(40)).optional(),
  }).optional(),
});
export const linhaImportacaoSchema = z.object({
  campos: z.partialRecord(campo, z.string().max(400)).optional(),
  decisao: z.enum(["JUNTAR", "NOVO", "SEGUIR", "PULAR"]).nullable().optional(),
});
export const decidirImportacaoSchema = z.object({
  codigo: z.enum(["DUPLICADO", "TELEFONE_DE_OUTRO", "SEM_ASSINATURA", "FORA_DA_LISTA", "CAMPO_INVALIDO", "CASO_DUPLICADO"]),
  decisao: z.enum(["JUNTAR", "NOVO", "SEGUIR", "PULAR"]),
});
export const importarSchema = z.object({ versao: z.number().int().positive() });
/** A escolha dos arquivados no passo das abas do backup do Astrea. */
export const arquivadosImportacaoSchema = z.object({ versao: z.number().int().positive(), arquivados });
export const desfazerImportacaoSchema = z.object({ motivo: z.string().trim().min(3).max(300) });
export const filtroLinhasSchema = z.object({
  situacao: z.enum(["PRONTA", "AVISO", "ERRO", "PULADA"]).optional(),
  q: z.string().max(120).optional(),
  desde: z.coerce.number().int().min(0).max(10001).optional(),
});
/** A prévia do financeiro agrupada: o chip do grupo, a situação, a busca e a página. */
export const filtroLancamentosSchema = z.object({
  grupo: z.enum(["RECEBIDOS", "EM_ABERTO", "DESPESAS"]).optional(),
  situacao: z.enum(["PRONTA", "AVISO", "ERRO", "PULADA"]).optional(),
  q: z.string().max(120).optional(),
  pular: z.coerce.number().int().min(0).max(10000).optional(),
});

export interface OrigemImportacao { id: string; arquivo: string; em: string; por: PessoaRef }

/** Na ficha do cliente: o que veio do sistema antigo, só como informação (F3.56, parte 3). */
export interface FinanceiroAnterior {
  origem: OrigemDados;
  importacao: { id: string; arquivo: string; em: string } | null;
  /** O que ficou em aberto lá: lembrar de criar o contrato, porque no T3jus a cobrança nasce dele. */
  lembretes: { id: string; valor: number; lancamentos: number; caso: { id: string; nome: string } | null }[];
  /** O total pago antes do T3jus. */
  pago: number;
  lancamentos: { data: string | null; descricao: string; valor: number; situacao: SituacaoLancamentoAntigo; caso: string | null }[];
  total: number;
}
