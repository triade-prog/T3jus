// Quem assina pelo cliente menor ou sob curatela (F3.98; AP-01, CH-08, PT-11). Tela aprovada em
// docs/design/aprovadas/portal-responsavel-legal (Carol, 22/11/2026, com as 8 recomendações).
// Aqui ficam a conta de quem assina pela data (até 15 anos, representado; 16 e 17, assistido;
// curatela, como diz o termo) e o texto que vai na procuração e no contrato: a qualificação, o
// bloco de assinatura e o que falta. O gênero de quem assina vem do papel (mãe, pai, curadora);
// o do cliente fica com o "(a)" que o código já usa (pergunta 7).

import { ESTADOS_CIVIS, formatarDocumento, type EstadoCivil } from "./clientes.ts";

export const CAPACIDADES = {
  PLENA: "Sim, assina por si",
  MENOR: "Não: é menor de 18 anos",
  CURATELA: "Não: está sob curatela",
} as const;
export type Capacidade = keyof typeof CAPACIDADES;

export const PAPEIS_MENOR = { MAE: "Mãe", PAI: "Pai", TUTORA: "Tutora", TUTOR: "Tutor" } as const;
export const PAPEIS_CURATELA = { CURADORA: "Curadora", CURADOR: "Curador" } as const;
export const PAPEIS_RESPONSAVEL = { ...PAPEIS_MENOR, ...PAPEIS_CURATELA } as const;
export type PapelResponsavel = keyof typeof PAPEIS_RESPONSAVEL;

export const MODOS_CURATELA = { REPRESENTA: "A curadora assina sozinha", ASSISTE: "Os dois assinam" } as const;
export type ModoCuratela = keyof typeof MODOS_CURATELA;

/** O que a ficha e os documentos chamam de "quem assina", no dia. */
export type SituacaoAssina = "PROPRIO" | "REPRESENTADO" | "ASSISTIDO" | "CURATELA" | "FEZ_18";
/** Nos documentos, a curatela já vem com o modo. */
export type QuemAssina = "PROPRIO" | "REPRESENTADO" | "ASSISTIDO" | "CURATELA_REPRESENTA" | "CURATELA_ASSISTE";

/** O que o servidor manda na ficha ("assina"), calculado com a data de hoje. */
export interface AssinaCliente {
  situacao: SituacaoAssina;
  idade: number | null;
  faz16: string | null;
  faz18: string | null;
  modo: ModoCuratela | null;
}

/** Os campos do cadastro que dizem quem assina (os nomes da API). */
export interface ResponsavelDoCliente {
  capacidade?: Capacidade | null;
  nascimento?: string | null;
  rlPapel?: PapelResponsavel | null;
  rlNome?: string | null;
  rlDocumento?: string | null;
  rlRg?: string | null;
  rlRgOrgao?: string | null;
  rlNacionalidade?: string | null;
  rlEstadoCivil?: EstadoCivil | null;
  rlProfissao?: string | null;
  rlMoraJunto?: boolean | null;
  rlCep?: string | null;
  rlEndereco?: string | null;
  rlBairro?: string | null;
  rlCidade?: string | null;
  rlUf?: string | null;
  curModo?: ModoCuratela | null;
  curProcesso?: string | null;
  curVara?: string | null;
}

/** Anos completos em "hoje" (aaaa-mm-dd). */
export function idadeEm(nascimento: string, hoje: string): number {
  const [an, mn, dn] = nascimento.slice(0, 10).split("-").map(Number) as [number, number, number];
  const [ah, mh, dh] = hoje.slice(0, 10).split("-").map(Number) as [number, number, number];
  return ah - an - (mh < mn || (mh === mn && dh < dn) ? 1 : 0);
}

/** "2014-03-14" + 16 → "2030-03-14" (29/02 vira 01/03, como no banco). */
export function aniversario(nascimento: string, anos: number): string {
  const [a, m, d] = nascimento.slice(0, 10).split("-").map(Number) as [number, number, number];
  const x = new Date(Date.UTC(a + anos, m - 1, d));
  if (x.getUTCMonth() !== m - 1) x.setUTCDate(0);
  return x.toISOString().slice(0, 10);
}

/** Quem assina no dia: o menor que já fez 18 assina por si, mesmo antes de a ficha mudar. */
export function quemAssina(c: ResponsavelDoCliente & { tipo?: "PF" | "PJ" }, hoje: string): QuemAssina {
  if (c.tipo === "PJ" || !c.capacidade || c.capacidade === "PLENA" || !c.rlNome?.trim()) return "PROPRIO";
  if (c.capacidade === "CURATELA") return c.curModo === "ASSISTE" ? "CURATELA_ASSISTE" : "CURATELA_REPRESENTA";
  if (!c.nascimento) return "REPRESENTADO";
  const idade = idadeEm(c.nascimento, hoje);
  return idade >= 18 ? "PROPRIO" : idade >= 16 ? "ASSISTIDO" : "REPRESENTADO";
}

/** Na ficha: a mesma conta, com as datas dos 16 e dos 18 (o servidor manda pronto; aqui, para a tela que edita). */
export function situacaoNoDia(capacidade: Capacidade, nascimento: string | null, hoje: string): AssinaCliente {
  if (capacidade === "PLENA") return { situacao: "PROPRIO", idade: null, faz16: null, faz18: null, modo: null };
  if (capacidade === "CURATELA") return { situacao: "CURATELA", idade: null, faz16: null, faz18: null, modo: null };
  if (!nascimento) return { situacao: "REPRESENTADO", idade: null, faz16: null, faz18: null, modo: null };
  const idade = idadeEm(nascimento, hoje);
  return {
    situacao: idade >= 18 ? "FEZ_18" : idade >= 16 ? "ASSISTIDO" : "REPRESENTADO",
    idade, faz16: aniversario(nascimento, 16), faz18: aniversario(nascimento, 18), modo: null,
  };
}

const FEMININO: Record<PapelResponsavel, boolean> = { MAE: true, PAI: false, TUTORA: true, TUTOR: false, CURADORA: true, CURADOR: false };

export function papelFeminino(p: PapelResponsavel | null | undefined): boolean {
  return p ? FEMININO[p] : true;
}

/** "sua mãe", "seu pai", "sua curadora". */
export function papelComPossessivo(p: PapelResponsavel | null | undefined): string {
  if (!p) return "seu responsável";
  return `${FEMININO[p] ? "sua" : "seu"} ${PAPEIS_RESPONSAVEL[p].toLowerCase()}`;
}

/** "Casado(a)" vira "casada" ou "casado" pelo papel de quem assina. */
export function estadoCivilNoGenero(e: EstadoCivil | null | undefined, feminino: boolean): string | null {
  if (!e) return null;
  return ESTADOS_CIVIS[e].toLowerCase().replace(/o\(a\)$/, feminino ? "a" : "o");
}

function falta(o_que: string): string {
  return `[${o_que}: falta]`;
}

function cep(c: string): string {
  return c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : c;
}

/** O endereço de quem assina, quando não mora com o cliente. */
export function enderecoDoResponsavel(c: ResponsavelDoCliente): string {
  if (!c.rlEndereco?.trim()) return falta("ENDEREÇO DE QUEM ASSINA");
  const partes = [c.rlEndereco.trim(), c.rlBairro?.trim(), c.rlCidade?.trim(), c.rlUf?.trim()].filter(Boolean);
  return `${partes.join(", ")}${c.rlCep ? `, CEP ${cep(c.rlCep)}` : ""}`;
}

/** "brasileira, divorciada, auxiliar administrativa, portadora do RG nº …, inscrita no CPF sob o nº …". */
export function qualificacaoDoResponsavel(c: ResponsavelDoCliente): string {
  const f = papelFeminino(c.rlPapel);
  const rg = c.rlRg?.trim() ? `${c.rlRg.trim()}${c.rlRgOrgao?.trim() ? ` ${c.rlRgOrgao.trim()}` : ""}` : falta("RG DE QUEM ASSINA");
  return [
    c.rlNacionalidade?.trim().toLowerCase(),
    estadoCivilNoGenero(c.rlEstadoCivil, f),
    c.rlProfissao?.trim().toLowerCase(),
    `${f ? "portadora" : "portador"} do RG nº ${rg}`,
    `${f ? "inscrita" : "inscrito"} no CPF sob o nº ${c.rlDocumento ? formatarDocumento(c.rlDocumento) : falta("CPF DE QUEM ASSINA")}`,
  ].filter((x): x is string => !!x).join(", ");
}

/** "neste ato representado(a) por sua mãe, JOANA ALVES SOUZA, brasileira, …". */
export function trechoDoResponsavel(c: ResponsavelDoCliente, quem: Exclude<QuemAssina, "PROPRIO">): string {
  const verbo = quem === "ASSISTIDO" || quem === "CURATELA_ASSISTE" ? "assistido(a)" : "representado(a)";
  const nome = c.rlNome?.trim() ? c.rlNome.trim().toUpperCase() : falta("QUEM ASSINA");
  return `neste ato ${verbo} por ${papelComPossessivo(c.rlPapel)}, ${nome}, ${qualificacaoDoResponsavel(c)}`;
}

/** "nomeada nos autos da ação de curatela nº …, da …, conforme termo de curatela anexo". */
export function trechoDaCuratela(c: ResponsavelDoCliente): string {
  const nomeada = papelFeminino(c.rlPapel) ? "nomeada" : "nomeado";
  const autos = c.curProcesso?.trim()
    ? `${nomeada} nos autos da ação de curatela nº ${c.curProcesso.trim()}${c.curVara?.trim() ? `, da ${c.curVara.trim()}` : ""}, `
    : "";
  return `${autos}conforme termo de curatela anexo`;
}

/** As linhas de assinatura: uma (representado) ou duas (assistido), com o CPF de quem assina. */
export function assinaturaComResponsavel(nomeCliente: string, cpfCliente: string, c: ResponsavelDoCliente, quem: Exclude<QuemAssina, "PROPRIO">): string {
  const linha = "_______________________________________";
  const nomeRl = c.rlNome?.trim() ? c.rlNome.trim().toUpperCase() : falta("QUEM ASSINA");
  const cpfRl = `CPF ${c.rlDocumento ? formatarDocumento(c.rlDocumento) : falta("CPF DE QUEM ASSINA")}`;
  if (quem === "ASSISTIDO" || quem === "CURATELA_ASSISTE") {
    const papel = c.rlPapel ? PAPEIS_RESPONSAVEL[c.rlPapel].toLowerCase() : "responsável";
    return `${linha}\n${nomeCliente}\nCPF ${cpfCliente}\n\n${linha}\n${nomeRl}\n${papel}, que o(a) assiste\n${cpfRl}`;
  }
  return `${linha}\n${nomeCliente}\nrepresentado(a) por ${papelComPossessivo(c.rlPapel)}, ${nomeRl}\n${cpfRl}`;
}

/** O que falta de quem assina, para o aviso no alto ("o CPF de quem assina"). */
export function faltasDoResponsavel(c: ResponsavelDoCliente): string[] {
  const f: string[] = [];
  if (!c.rlNome?.trim()) f.push("quem assina pelo cliente");
  if (!c.rlDocumento) f.push("o CPF de quem assina");
  if (!c.rlRg?.trim()) f.push("o RG de quem assina");
  if (!c.rlNacionalidade?.trim() || !c.rlEstadoCivil || !c.rlProfissao?.trim()) f.push("a qualificação de quem assina");
  if (c.rlMoraJunto === false && !c.rlEndereco?.trim()) f.push("o endereço de quem assina");
  return f;
}

/** "Representa · Pedro tem menos de 16 anos", para o selo da ficha e de Gerar documentos. */
export function rotuloQuemAssina(quem: QuemAssina): string {
  switch (quem) {
    case "REPRESENTADO": return "Representa";
    case "ASSISTIDO": return "Assiste";
    case "CURATELA_REPRESENTA": return "Representa";
    case "CURATELA_ASSISTE": return "Assiste";
    default: return "Assina por si";
  }
}
