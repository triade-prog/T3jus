// Dados do escritório para os documentos (PA-07), desenho aprovado em
// docs/design/aprovadas/escritorio-dados-documentos (22/11/2026). Regras puras: o que conta
// (decisão 2), a linha da sede (decisão 8), como o escritório sai no contrato (decisões 3, 7,
// 17 e 18) e a conferência do formulário, igual à do servidor (0860).

import { z } from "zod";
import { cnpjValido, UFS } from "./console.ts";
import { qualificacaoDoAdvogado, type DadosDocumentoPessoa } from "./dados_advogado.ts";
import type { InscricaoOab } from "./portal.ts";

export type TipoEscritorio = "SOCIEDADE" | "SOCIEDADE_INDIVIDUAL" | "SEM_SOCIEDADE";

export const TIPOS_ESCRITORIO: Record<TipoEscritorio, { nome: string; explica: string }> = {
  SOCIEDADE: { nome: "Sociedade de advogados", explica: "Dois ou mais sócios, com CNPJ e registro da sociedade na OAB." },
  SOCIEDADE_INDIVIDUAL: { nome: "Sociedade individual de advocacia", explica: "Uma advogada ou um advogado como única sócia, com CNPJ e registro na OAB." },
  SEM_SOCIEDADE: { nome: "Advogada ou advogado sem sociedade", explica: "Sem CNPJ: no contrato, quem contrata é a sócia dona, com a qualificação dela." },
};

/** A sócia dona, para a frase "sem sociedade". Os dados só chegam a quem pode vê-los. */
export interface DonaDoEscritorio {
  pessoaId: string;
  nome: string;
  dados?: DadosDocumentoPessoa | null;
  inscricoes?: InscricaoOab[] | null;
}

/** O que os documentos usam do escritório (escritorio_documentos_json, 0860). */
export interface DadosEscritorioDocumentos {
  nome: string;
  tipo?: TipoEscritorio | null;
  razaoSocial?: string | null;
  cnpj: string | null;
  oabUf?: string | null;
  oabNumero?: string | null;
  /** "OAB/BA 4.217". */
  oab: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade: string | null;
  uf: string | null;
  /** A linha "rua, número, complemento, bairro" (ou o texto antigo). */
  endereco: string | null;
  enderecoConfira?: boolean;
  telefone?: string | null;
  email?: string | null;
  site?: string | null;
  dona?: DonaDoEscritorio | null;
}

const cheio = (s: string | null | undefined): s is string => !!s?.trim();

/** Só o que a sede precisa (as petições não trazem CNPJ nem OAB). */
export type SedeDoEscritorio = Pick<DadosEscritorioDocumentos, "endereco" | "cidade" | "uf"> &
  Partial<Pick<DadosEscritorioDocumentos, "cep" | "logradouro" | "numero" | "complemento" | "bairro" | "enderecoConfira" | "tipo">>;

/** "46250000" → "46250-000". */
export function cepNoTexto(c: string): string {
  const d = c.replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : c;
}

/** A sede tem as partes que o documento pede: CEP, rua, número, bairro, cidade e UF. */
export function sedeCompleta(d: SedeDoEscritorio): boolean {
  return !d.enderecoConfira && cheio(d.cep) && cheio(d.logradouro) && cheio(d.numero) && cheio(d.bairro) && cheio(d.cidade) && cheio(d.uf);
}

/** A sede numa linha só (decisão 8): "Rua Sete de Setembro, 120, sala 4, Centro, Presidente Jânio Quadros/BA, CEP 46250-000". */
export function linhaDaSede(d: SedeDoEscritorio): string | null {
  if (!sedeCompleta(d)) return null;
  const rua = [d.logradouro, d.numero, d.complemento, d.bairro].filter(cheio).map((x) => x.trim()).join(", ");
  return `${rua}, ${d.cidade!.trim()}/${d.uf!.trim()}, CEP ${cepNoTexto(d.cep!)}`;
}

/** Tem as partes novas (a ficha veio da 0860), e não só o texto antigo. */
function temPartes(d: SedeDoEscritorio): boolean {
  return "cep" in d || "logradouro" in d || "tipo" in d;
}

export type DadoDoEscritorio = "TIPO" | "RAZAO_SOCIAL" | "CNPJ" | "OAB" | "SEDE";

export const ROTULO_DADO_ESCRITORIO: Record<DadoDoEscritorio, string> = {
  TIPO: "o tipo",
  RAZAO_SOCIAL: "a razão social",
  CNPJ: "o CNPJ",
  OAB: "o registro da sociedade na OAB",
  SEDE: "o endereço da sede",
};

/** Os dados que contam (decisão 2): 5 com sociedade, 2 sem (o tipo e a sede). */
export function dadosQueContamEscritorio(d: Pick<DadosEscritorioDocumentos, "tipo">): DadoDoEscritorio[] {
  return d.tipo === "SEM_SOCIEDADE" ? ["TIPO", "SEDE"] : ["TIPO", "RAZAO_SOCIAL", "CNPJ", "OAB", "SEDE"];
}

export function faltasDoEscritorio(d: DadosEscritorioDocumentos): DadoDoEscritorio[] {
  return dadosQueContamEscritorio(d).filter((k) => {
    if (k === "TIPO") return !d.tipo;
    if (k === "RAZAO_SOCIAL") return !cheio(d.razaoSocial);
    if (k === "CNPJ") return !cheio(d.cnpj);
    if (k === "OAB") return !cheio(d.oab);
    return !sedeCompleta(d);
  });
}

/** "o tipo, a razão social e o endereço da sede". */
export function listaFaltasEscritorio(f: readonly DadoDoEscritorio[]): string {
  const r = f.map((k) => ROTULO_DADO_ESCRITORIO[k]);
  if (r.length <= 1) return r[0] ?? "";
  return `${r.slice(0, -1).join(", ")} e ${r.at(-1)}`;
}

const falta = (o_que: string) => `[${o_que}: falta]`;

/** [ESCRITORIO_NOME] (decisão 7): a razão social; sem ela, o nome curto com a marca; sem sociedade, a sócia dona. */
export function nomeDoEscritorioNoDocumento(d: DadosEscritorioDocumentos): string {
  if (d.tipo === "SEM_SOCIEDADE") {
    const nome = d.dona?.dados?.nomeCompleto?.trim() || d.dona?.nome;
    return nome ? nome.toUpperCase() : falta("NOME DA CONTRATADA");
  }
  if (cheio(d.razaoSocial)) return d.razaoSocial.trim().toUpperCase();
  if (!temPartes(d)) return d.nome.toUpperCase();
  return `${d.nome.toUpperCase()} ${falta("RAZÃO SOCIAL")}`;
}

/** [ESCRITORIO_ENDERECO] (decisões 8 e 18). Sem as partes novas, sai como saía. */
export function enderecoDoEscritorioNoDocumento(d: SedeDoEscritorio): string {
  const lugar = [d.cidade?.trim(), d.uf?.trim()].filter(Boolean).join("/");
  if (!temPartes(d)) {
    return d.endereco?.trim() ? `${d.endereco.trim()}${d.cidade ? `, ${d.cidade}` : ""}${d.uf ? `, ${d.uf}` : ""}` : falta("ENDEREÇO DO ESCRITÓRIO");
  }
  const linha = linhaDaSede(d);
  if (linha) return linha;
  if ((d.enderecoConfira || !cheio(d.logradouro)) && cheio(d.endereco)) {
    return `${d.endereco.trim()}${lugar ? `, ${lugar}` : ""} [ENDEREÇO DO ESCRITÓRIO: confira]`;
  }
  return `${falta("ENDEREÇO DO ESCRITÓRIO")}${lugar ? `, ${lugar}` : ""}`;
}

/** O que sai marcado do escritório no documento (a faixa de Gerar documentos). */
export function marcadosDoEscritorio(d: DadosEscritorioDocumentos): string[] {
  const m: string[] = [];
  if (d.tipo === "SEM_SOCIEDADE") {
    if (!sedeCompleta(d)) m.push("Endereço do escritório");
    return m;
  }
  if (temPartes(d) && !cheio(d.razaoSocial)) m.push("Razão social do escritório");
  if (!d.cnpj) m.push("CNPJ do escritório");
  if (!d.oab?.trim()) m.push("Registro do escritório na OAB");
  if (temPartes(d) ? !sedeCompleta(d) : !d.endereco?.trim()) m.push("Endereço do escritório");
  return m;
}

/** A sede como endereço profissional de quem usa o do escritório (decisão 10 de Sua conta). */
export function enderecoPadraoDoAdvogado(d: DadosEscritorioDocumentos): { endereco: string | null; cidade: string | null; uf: string | null; cep?: string | null } {
  return { endereco: d.endereco, cidade: d.cidade, uf: d.uf, cep: d.cep ?? null };
}

/** [ESCRITORIO_QUALIFICACAO]: quem contrata, numa frase (decisões 3 e 17). */
export function qualificacaoDoEscritorio(d: DadosEscritorioDocumentos): string {
  if (d.tipo === "SEM_SOCIEDADE") {
    const dona = d.dona;
    if (!dona?.dados) return `${(dona?.nome ?? "").toUpperCase() || falta("CONTRATADA")}, ${falta("QUALIFICAÇÃO DA CONTRATADA")}`;
    return qualificacaoDoAdvogado(dona.dados, dona.inscricoes ?? [], enderecoPadraoDoAdvogado(d));
  }
  const cnpj = d.cnpj ? cnpjNoTexto(d.cnpj) : falta("CNPJ DO ESCRITÓRIO");
  const oab = d.oab?.trim() || falta("REGISTRO NA OAB");
  return `${nomeDoEscritorioNoDocumento(d)}, inscrita no CNPJ sob o nº ${cnpj} e registrada na ${oab}, com sede em ${enderecoDoEscritorioNoDocumento(d)}`;
}

function cnpjNoTexto(c: string): string {
  const d = c.replace(/\D/g, "");
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : c;
}

/** "(77) 98123-9809". */
export function telefoneNoTexto(t: string): string {
  const d = t.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
}

// ------------------------------------------------------------------------------- formulário

export interface FormEscritorio {
  nome: string;
  tipo: TipoEscritorio | "";
  razaoSocial: string;
  cnpj: string;
  oabUf: string;
  oabNumero: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  telefone: string;
  email: string;
  site: string;
}

export function formDoEscritorio(d: DadosEscritorioDocumentos): FormEscritorio {
  return {
    nome: d.nome ?? "", tipo: d.tipo ?? "", razaoSocial: d.razaoSocial ?? "", cnpj: d.cnpj ? cnpjNoTexto(d.cnpj) : "",
    oabUf: d.oabUf ?? "", oabNumero: d.oabNumero ?? "", cep: d.cep ? cepNoTexto(d.cep) : "", logradouro: d.logradouro ?? "",
    numero: d.numero ?? "", complemento: d.complemento ?? "", bairro: d.bairro ?? "", cidade: d.cidade ?? "", uf: d.uf ?? "",
    telefone: d.telefone ? telefoneNoTexto(d.telefone) : "", email: d.email ?? "", site: d.site ?? "",
  };
}

/** O formulário como dados (para a prévia enquanto digita). */
export function dadosDoForm(f: FormEscritorio, base: DadosEscritorioDocumentos): DadosEscritorioDocumentos {
  const t = (s: string) => (s.trim() ? s.trim() : null);
  const sem = f.tipo === "SEM_SOCIEDADE";
  const uf = t(f.oabUf)?.toUpperCase() ?? null;
  const num = f.oabNumero.replace(/\D/g, "") || null;
  const rua = [t(f.logradouro), t(f.numero), t(f.complemento), t(f.bairro)].filter(Boolean).join(", ");
  return {
    ...base,
    nome: f.nome.trim() || base.nome, tipo: f.tipo || null,
    razaoSocial: sem ? null : t(f.razaoSocial), cnpj: sem ? null : f.cnpj.replace(/\D/g, "") || null,
    oabUf: sem ? null : uf, oabNumero: sem ? null : num,
    oab: !sem && uf && num ? `OAB/${uf} ${num.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}` : null,
    cep: f.cep.replace(/\D/g, "") || null, logradouro: t(f.logradouro), numero: t(f.numero)?.toUpperCase() ?? null,
    complemento: t(f.complemento), bairro: t(f.bairro), cidade: t(f.cidade), uf: t(f.uf)?.toUpperCase() ?? null,
    endereco: rua || null, enderecoConfira: false,
    telefone: f.telefone.replace(/\D/g, "") || null, email: t(f.email)?.toLowerCase() ?? null, site: t(f.site)?.toLowerCase() ?? null,
  };
}

export type CampoEscritorio = keyof FormEscritorio;

/** A conferência do formulário, a mesma do servidor (escritorio_dados_gravar). Códigos por campo. */
export function conferirFormEscritorio(f: FormEscritorio, onde: "PORTAL" | "CONSOLE" = "PORTAL"): Partial<Record<CampoEscritorio, string>> {
  const e: Partial<Record<CampoEscritorio, string>> = {};
  const nome = f.nome.trim().replace(/\s+/g, " ");
  if (!nome) e.nome = "NOME_OBRIGATORIO";
  else if (nome.length < 2 || nome.length > 120) e.nome = "NOME_INVALIDO";
  if (!f.tipo && onde === "PORTAL") e.tipo = "TIPO_OBRIGATORIO";
  if (f.tipo !== "SEM_SOCIEDADE") {
    const r = f.razaoSocial.trim().replace(/\s+/g, " ");
    if (r && (r.length < 5 || r.length > 150)) e.razaoSocial = "RAZAO_SOCIAL_INVALIDA";
    const c = f.cnpj.replace(/\D/g, "");
    if (c && (c.length !== 14 || !cnpjValido(c))) e.cnpj = "CNPJ_INVALIDO";
    const ou = f.oabUf.trim();
    const on = f.oabNumero.replace(/\D/g, "");
    if (!ou !== !on) e[ou ? "oabNumero" : "oabUf"] = "OAB_INCOMPLETA";
    else if (ou && !(UFS as readonly string[]).includes(ou.toUpperCase())) e.oabUf = "UF_INVALIDA";
    else if (on && !/^[1-9][0-9]{0,5}$/.test(on)) e.oabNumero = "OAB_NUMERO_INVALIDO";
  }
  const cep = f.cep.replace(/\D/g, "");
  if (cep && cep.length !== 8) e.cep = "CEP_INVALIDO";
  const rua = f.logradouro.trim();
  if (rua && (rua.length < 2 || rua.length > 200)) e.logradouro = "LOGRADOURO_INVALIDO";
  if (rua && !f.numero.trim()) e.numero = "NUMERO_OBRIGATORIO";
  else if (f.numero.trim().length > 20) e.numero = "NUMERO_INVALIDO";
  if (f.complemento.trim().length > 60) e.complemento = "COMPLEMENTO_INVALIDO";
  const b = f.bairro.trim();
  if (b && (b.length < 2 || b.length > 80)) e.bairro = "BAIRRO_INVALIDO";
  const cid = f.cidade.trim();
  if (cid && (cid.length < 2 || cid.length > 80)) e.cidade = "CIDADE_INVALIDA";
  else if (!cid && onde === "CONSOLE") e.cidade = "CIDADE_OBRIGATORIA";
  const uf = f.uf.trim().toUpperCase();
  if (uf ? !(UFS as readonly string[]).includes(uf) : onde === "CONSOLE") e.uf = "UF_INVALIDA";
  const tel = f.telefone.replace(/\D/g, "");
  if (tel && (tel.length < 10 || tel.length > 11)) e.telefone = "TELEFONE_INVALIDO";
  const em = f.email.trim();
  if (em && (em.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em))) e.email = "EMAIL_INVALIDO";
  const s = f.site.trim();
  if (s && (s.length > 200 || !/^(https?:\/\/)?[^\s/]+\.[^\s]+$/i.test(s))) e.site = "SITE_INVALIDO";
  return e;
}

/** O texto de cada erro, como na cobrança aprovada para o endereço. */
export const TEXTO_ERRO_ESCRITORIO: Record<string, string> = {
  NOME_OBRIGATORIO: "Escreva o nome do escritório no T3jus.",
  NOME_INVALIDO: "O nome precisa ter de 2 a 120 letras.",
  TIPO_OBRIGATORIO: "Escolha o tipo do escritório.",
  TIPO_INVALIDO: "Escolha um dos três tipos.",
  RAZAO_SOCIAL_INVALIDA: "A razão social precisa ter de 5 a 150 letras.",
  CNPJ_INVALIDO: "Os dígitos do CNPJ não conferem. Confira no cartão do CNPJ.",
  CNPJ_EM_USO: "Este CNPJ já é de outro escritório no T3jus.",
  OAB_INCOMPLETA: "Escreva a seccional e o número do registro, os dois juntos.",
  OAB_NUMERO_INVALIDO: "O número do registro tem só números, até 6.",
  UF_INVALIDA: "Escolha uma das 27 UFs.",
  CEP_INVALIDO: "O CEP tem 8 números.",
  LOGRADOURO_INVALIDO: "A rua precisa ter de 2 a 200 letras.",
  NUMERO_OBRIGATORIO: "Escreva o número. Se não houver, escreva S/N.",
  NUMERO_INVALIDO: "O número tem até 20 letras.",
  COMPLEMENTO_INVALIDO: "O complemento tem até 60 letras.",
  BAIRRO_INVALIDO: "O bairro precisa ter de 2 a 80 letras.",
  CIDADE_INVALIDA: "A cidade precisa ter de 2 a 80 letras.",
  CIDADE_OBRIGATORIA: "Escreva a cidade.",
  TELEFONE_INVALIDO: "O telefone tem DDD e 8 ou 9 números.",
  EMAIL_INVALIDO: "Confira o e-mail: falta o @ ou o domínio.",
  SITE_INVALIDO: "Confira o site, por exemplo: santana.adv.br.",
  CONTATOS_INVALIDOS: "Confira os contatos.",
};

const texto = (max: number) => z.string().max(max).optional().nullable();

/** O corpo de PUT /v1/escritorio/dados (Portal) e dos campos novos da ficha do Console. */
export const dadosEscritorioSchema = z.object({
  versao: z.number().int().min(0),
  nome: z.string().max(200),
  tipo: z.enum(["SOCIEDADE", "SOCIEDADE_INDIVIDUAL", "SEM_SOCIEDADE"]).nullable().optional(),
  razaoSocial: texto(300),
  cnpj: texto(30),
  oabUf: texto(4),
  oabNumero: texto(12),
  cep: texto(12),
  logradouro: texto(300),
  numero: texto(30),
  complemento: texto(100),
  bairro: texto(120),
  cidade: texto(120),
  uf: texto(4),
  telefone: texto(30),
  email: texto(300),
  site: texto(300),
});
export type CorpoDadosEscritorio = z.infer<typeof dadosEscritorioSchema>;
