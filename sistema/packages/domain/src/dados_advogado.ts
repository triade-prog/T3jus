// Os dados de cada advogado para os documentos (EX-15), desenho aprovado em
// docs/design/aprovadas/portal-conta-dados (Carol, 22/11/2026). A própria pessoa (Sua conta) e a
// sócia dona (Equipe) completam; o que falta não bloqueia e sai marcado, como no cliente. A
// mesma regra está no banco (0760_pessoa_dados_documento.sql), que confere tudo de novo.

import { z } from "zod";
import { ESTADOS_CIVIS, formatarDocumento, type EstadoCivil } from "./clientes.ts";
import type { InscricaoOab } from "./portal.ts";

export const TRATAMENTOS = { ADVOGADA: "Advogada", ADVOGADO: "Advogado" } as const;
export type Tratamento = keyof typeof TRATAMENTOS;

/** O estado civil com a concordância do tratamento (decisão 9). */
const CIVIL: Record<EstadoCivil, [string, string, string]> = {
  SOLTEIRO: ["solteira", "solteiro", "solteiro(a)"],
  CASADO: ["casada", "casado", "casado(a)"],
  UNIAO_ESTAVEL: ["em união estável", "em união estável", "em união estável"],
  SEPARADO: ["separada", "separado", "separado(a)"],
  DIVORCIADO: ["divorciada", "divorciado", "divorciado(a)"],
  VIUVO: ["viúva", "viúvo", "viúvo(a)"],
};
/** Como o campo mostra o estado civil: "Casada ou casado". */
export const ESTADOS_CIVIS_ADVOGADO: Record<EstadoCivil, string> = {
  SOLTEIRO: "Solteira ou solteiro",
  CASADO: "Casada ou casado",
  UNIAO_ESTAVEL: "União estável",
  SEPARADO: "Separada ou separado",
  DIVORCIADO: "Divorciada ou divorciado",
  VIUVO: "Viúva ou viúvo",
};

/** Os dados como a API devolve (GET …/conta/dados e …/equipe/pessoas/:id/dados). */
export interface DadosDocumentoPessoa {
  nomeCompleto: string;
  tratamento: Tratamento | null;
  nacionalidade: string | null;
  estadoCivil: EstadoCivil | null;
  /** Só os 11 dígitos. */
  cpf: string | null;
  rg: string | null;
  rgOrgao: string | null;
  /** Decisão 2: o endereço do escritório é o padrão. */
  enderecoDoEscritorio: boolean;
  cep: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  emailProfissional: string | null;
  telefoneProfissional: string | null;
  atualizadoEm: string | null;
  atualizadoPor: { id: string; nome: string } | null;
  /** 0 enquanto ninguém salvou (o nome é o do convite). */
  versao: number;
  /** Só na Equipe: as últimas mudanças, com os nomes dos campos. */
  mudancas?: MudancaDadosDocumento[];
}

export interface MudancaDadosDocumento {
  em: string;
  por: { id: string; nome: string } | null;
  onde: "CONTA" | "EQUIPE";
  campos: CampoMudadoDados[];
}

export const CAMPOS_MUDADOS_DADOS = {
  NOME_COMPLETO: "o nome completo",
  TRATAMENTO: "o tratamento",
  NACIONALIDADE: "a nacionalidade",
  ESTADO_CIVIL: "o estado civil",
  CPF: "o CPF",
  RG: "o RG",
  ENDERECO: "o endereço profissional",
  EMAIL_PROFISSIONAL: "o e-mail profissional",
  TELEFONE_PROFISSIONAL: "o telefone profissional",
} as const;
export type CampoMudadoDados = keyof typeof CAMPOS_MUDADOS_DADOS;

/** O endereço do escritório, de Escritório no Portal. */
export interface EnderecoEscritorio {
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
}

/** Os 8 dados que contam (decisão 6). E-mail e telefone são opcionais e não contam. */
export const DADOS_QUE_CONTAM = {
  NOME_COMPLETO: "nome completo",
  TRATAMENTO: "como o documento te chama",
  NACIONALIDADE: "nacionalidade",
  ESTADO_CIVIL: "estado civil",
  CPF: "CPF",
  RG: "RG",
  ENDERECO: "endereço profissional",
  OAB: "OAB",
} as const;
export type DadoQueConta = keyof typeof DADOS_QUE_CONTAM;
export const TOTAL_DADOS_DOCUMENTO = Object.keys(DADOS_QUE_CONTAM).length;

/** O pedido do PUT: o servidor normaliza e devolve o erro de cada campo (o esquema só limita o tamanho). */
const texto = (max: number) => z.string().max(max).nullish();
export const dadosDocumentoSchema = z.object({
  versao: z.number().int().min(0),
  nomeCompleto: z.string().max(200),
  tratamento: texto(20),
  nacionalidade: texto(80),
  estadoCivil: texto(20),
  cpf: texto(20),
  rg: texto(40),
  rgOrgao: texto(40),
  enderecoDoEscritorio: z.boolean(),
  cep: texto(12),
  endereco: texto(240),
  bairro: texto(120),
  cidade: texto(120),
  uf: texto(4),
  emailProfissional: texto(300),
  telefoneProfissional: texto(30),
});
export type PedidoDadosDocumento = z.input<typeof dadosDocumentoSchema>;

/** As mensagens de cada código que o servidor devolve, presas ao campo (decisão 15). */
export const MENSAGENS_DADOS_DOCUMENTO: Record<string, string> = {
  NOME_COMPLETO_OBRIGATORIO: "Escreva o nome completo, como na carteira da OAB. É o nome que sai nos documentos.",
  NOME_COMPLETO_INVALIDO: "Escreva o nome completo, de 5 a 120 letras, sem números.",
  TRATAMENTO_INVALIDO: "Escolha advogada ou advogado.",
  NACIONALIDADE_INVALIDA: "Escreva a nacionalidade, por exemplo: brasileira.",
  ESTADO_CIVIL_INVALIDO: "Escolha o estado civil da lista.",
  CPF_INVALIDO: "Os dígitos do CPF não conferem. Confira no seu documento.",
  RG_INVALIDO: "Escreva o RG, de 3 a 20 caracteres.",
  RG_ORGAO_INVALIDO: "Escreva o órgão emissor e a UF, por exemplo: SSP/BA.",
  CEP_INVALIDO: "O CEP tem 8 números.",
  ENDERECO_INVALIDO: "Escreva a rua, o número e a sala.",
  BAIRRO_INVALIDO: "Escreva o bairro.",
  ENDERECO_INCOMPLETO: "Escreva a cidade e a UF do endereço profissional, ou volte a marcar “Usar o endereço do escritório”.",
  CIDADE_INVALIDA: "Escreva o nome da cidade.",
  UF_INVALIDA: "Escolha a UF da lista.",
  EMAIL_INVALIDO: "Escreva um e-mail completo, como nome@escritorio.adv.br.",
  TELEFONE_INVALIDO: "Escreva o telefone com o DDD: 10 ou 11 números.",
};

/** Os dados de antes do primeiro salvar: o nome do convite e o endereço do escritório. */
export function dadosDocumentoVazios(nome: string): DadosDocumentoPessoa {
  return {
    nomeCompleto: nome, tratamento: null, nacionalidade: null, estadoCivil: null, cpf: null, rg: null, rgOrgao: null,
    enderecoDoEscritorio: true, cep: null, endereco: null, bairro: null, cidade: null, uf: null,
    emailProfissional: null, telefoneProfissional: null, atualizadoEm: null, atualizadoPor: null, versao: 0,
  };
}

/** CPF só com os dígitos, conferindo os dois dígitos verificadores. */
function cpfConfere(d: string): boolean {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  const dig = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dig(9) === Number(d[9]) && dig(10) === Number(d[10]);
}

const cheio = (s: string | null | undefined) => !!s?.trim();
const so = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/** "41820020" → "41820-020". */
function cepFmt(c: string): string {
  return c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : c;
}

/** O endereço profissional como sai, ou null quando falta (decisão 10). */
export function enderecoDoAdvogado(d: DadosDocumentoPessoa, esc: EnderecoEscritorio): string | null {
  if (d.enderecoDoEscritorio) {
    if (!cheio(esc.endereco)) return null;
    const lugar = [esc.cidade?.trim(), esc.uf?.trim()].filter(Boolean).join("/");
    return [esc.endereco!.trim(), lugar].filter(Boolean).join(", ");
  }
  if (!cheio(d.cidade) || !cheio(d.uf)) return null;
  const partes = [d.endereco?.trim(), d.bairro?.trim(), `${d.cidade!.trim()}/${d.uf!.trim()}`].filter(Boolean);
  const cep = so(d.cep);
  return `${partes.join(", ")}${cep ? `, CEP ${cepFmt(cep)}` : ""}`;
}

/** Os dados que faltam, na ordem da tela (decisão 6). */
export function faltasDoAdvogado(d: DadosDocumentoPessoa, inscricoes: readonly Pick<InscricaoOab, "uf">[], esc: EnderecoEscritorio): DadoQueConta[] {
  const f: DadoQueConta[] = [];
  if (!cheio(d.nomeCompleto)) f.push("NOME_COMPLETO");
  if (!d.tratamento) f.push("TRATAMENTO");
  if (!cheio(d.nacionalidade)) f.push("NACIONALIDADE");
  if (!d.estadoCivil) f.push("ESTADO_CIVIL");
  if (!d.cpf || !cpfConfere(so(d.cpf))) f.push("CPF");
  if (!cheio(d.rg) || !cheio(d.rgOrgao)) f.push("RG");
  if (!enderecoDoAdvogado(d, esc)) f.push("ENDERECO");
  if (!inscricoes.length) f.push("OAB");
  return f;
}

/** "estado civil, CPF e RG". */
export function listaFaltas(f: readonly DadoQueConta[], voce = true): string {
  const r = f.map((k) => (k === "TRATAMENTO" && !voce ? "como o documento o chama" : DADOS_QUE_CONTAM[k]));
  if (r.length <= 1) return r[0] ?? "";
  return `${r.slice(0, -1).join(", ")} e ${r.at(-1)}`;
}

/** Um pedaço da frase: o valor do cadastro ou a marca do que falta. */
export interface PedacoQualificacao {
  texto: string;
  /** "valor" veio do cadastro; "falta" sai marcado; "fixo" é texto da frase. */
  tipo: "fixo" | "valor" | "falta" | "nome";
}

function numeroOabDoc(i: Pick<InscricaoOab, "numero" | "letra">): string {
  return `${i.numero.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}${i.letra ? `-${i.letra}` : ""}`;
}

/**
 * A qualificação do advogado, em pedaços (para a tela marcar o que falta e o que veio do
 * cadastro). "CAROLINA SOARES SANTANA, brasileira, casada, advogada inscrita na OAB/BA sob o
 * nº 63.876-S, portadora do RG nº 08.765.432-10 SSP/BA, inscrita no CPF sob o nº
 * 123.456.789-09, com escritório profissional na …". Sem a última pontuação.
 */
export function pedacosQualificacaoAdvogado(
  d: DadosDocumentoPessoa,
  inscricoes: readonly Pick<InscricaoOab, "uf" | "numero" | "letra" | "tipo">[],
  esc: EnderecoEscritorio,
): PedacoQualificacao[] {
  const g = d.tratamento;
  const a = g === "ADVOGADA" ? "a" : g === "ADVOGADO" ? "o" : "o(a)";
  const r: PedacoQualificacao[] = [];
  const fixo = (texto: string) => r.push({ texto, tipo: "fixo" });
  const valor = (texto: string) => r.push({ texto, tipo: "valor" });
  const falta = (o: string) => r.push({ texto: `[${o}: falta]`, tipo: "falta" });

  if (cheio(d.nomeCompleto)) r.push({ texto: d.nomeCompleto.trim().toUpperCase(), tipo: "nome" });
  else falta("NOME COMPLETO");
  fixo(", ");
  if (cheio(d.nacionalidade)) valor(d.nacionalidade!.trim().toLowerCase());
  else falta("NACIONALIDADE");
  fixo(", ");
  if (d.estadoCivil) valor(CIVIL[d.estadoCivil][g === "ADVOGADA" ? 0 : g === "ADVOGADO" ? 1 : 2]);
  else falta("ESTADO CIVIL");
  fixo(", ");
  const adv = g === "ADVOGADA" ? "advogada" : g === "ADVOGADO" ? "advogado" : "advogado(a)";
  const ordem = [...inscricoes].sort((x, y) => Number(x.tipo !== "PRINCIPAL") - Number(y.tipo !== "PRINCIPAL"));
  if (ordem.length) {
    fixo(`${adv} inscrit${a} `);
    const ins = ordem.map((i) => `na OAB/${i.uf} sob o nº ${numeroOabDoc(i)}`);
    valor(ins.length === 1 ? ins[0]! : `${ins.slice(0, -1).join(", ")} e ${ins.at(-1)}`);
  } else {
    fixo(`${adv}, `);
    falta("OAB");
  }
  fixo(`, portador${g === "ADVOGADA" ? "a" : g === "ADVOGADO" ? "" : "(a)"} do RG nº `);
  if (cheio(d.rg) && cheio(d.rgOrgao)) valor(`${d.rg!.trim()} ${d.rgOrgao!.trim()}`);
  else falta("RG");
  fixo(`, inscrit${a} no CPF sob o nº `);
  if (d.cpf && cpfConfere(so(d.cpf))) valor(formatarDocumento(so(d.cpf)));
  else if (d.cpf) r.push({ texto: "[CPF: confira]", tipo: "falta" });
  else falta("CPF");
  fixo(", com escritório profissional na ");
  const e = enderecoDoAdvogado(d, esc);
  if (e) valor(e);
  else falta("ENDEREÇO PROFISSIONAL");
  return r;
}

/** A qualificação em texto corrido, como vai no documento. */
export function qualificacaoDoAdvogado(
  d: DadosDocumentoPessoa,
  inscricoes: readonly Pick<InscricaoOab, "uf" | "numero" | "letra" | "tipo">[],
  esc: EnderecoEscritorio,
): string {
  return pedacosQualificacaoAdvogado(d, inscricoes, esc).map((p) => p.texto).join("");
}

/** Como a tela mostra o estado civil: com a concordância do tratamento, ou "Casada ou casado". */
export function estadoCivilNaTela(e: EstadoCivil, g: Tratamento | null): string {
  const t = g ? CIVIL[e][g === "ADVOGADA" ? 0 : 1] : ESTADOS_CIVIS_ADVOGADO[e].toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Os rótulos do estado civil (a mesma lista do cliente). */
export const CODIGOS_ESTADO_CIVIL = Object.keys(ESTADOS_CIVIS) as EstadoCivil[];
