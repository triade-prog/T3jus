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

/**
 * A idade para a tela (F3.162): "menos de 1 ano", "1 ano", "12 anos". Sem meses: a frase diz quem
 * assina, e a data fica ao lado. Negativo (data depois de hoje) também vira "menos de 1 ano", como o
 * `age()` do banco; o cadastro mostra antes "Esta data ainda não chegou.". Toda tela que mostrar a
 * idade de alguém usa esta função.
 */
export function idadeEmPalavras(anos: number): string {
  if (anos < 1) return "menos de 1 ano";
  return anos === 1 ? "1 ano" : `${anos} anos`;
}

/** "Pedro tem 12 anos hoje: é representado(a)." (cadastro e Gerar documentos, desenho D25). */
export function tituloDaIdade(primeiro: string, anos: number, situacao: "REPRESENTADO" | "ASSISTIDO"): string {
  return `${primeiro} tem ${idadeEmPalavras(anos)} hoje: é ${situacao === "REPRESENTADO" ? "representado(a)" : "assistido(a)"}.`;
}

/** A data de nascimento é depois de hoje (aaaa-mm-dd)? */
export function nascimentoNoFuturo(nascimento: string, hoje: string): boolean {
  return nascimento.slice(0, 10) > hoje.slice(0, 10);
}

/**
 * "2014-03-14" + 16 → "2030-03-14". Quem nasceu em 29/02, num ano sem 29/02, faz aniversário em
 * 01/03 (art. 132, § 3º, do Código Civil, e art. 3º da Lei 810/1949: sem o dia correspondente, o
 * ano termina no primeiro dia seguinte), o mesmo dia em que idadeEm e o age() do banco viram a
 * idade. No banco, a mesma conta é aniversario_em (1120). O Date.UTC já rola 29/02 para 01/03.
 */
export function aniversario(nascimento: string, anos: number): string {
  const [a, m, d] = nascimento.slice(0, 10).split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(a + anos, m - 1, d)).toISOString().slice(0, 10);
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

// As marcas do que falta de quem assina, escritas só aqui (F3.161): o .docx, a prévia e os avisos de
// Gerar documentos usam estas mesmas strings. O "DE QUEM ASSINA" separa da marca do próprio cliente
// ([ESTADO CIVIL: falta]), que pode estar no mesmo parágrafo.
const MARCA_QUEM_ASSINA = falta("QUEM ASSINA");
const MARCA_CPF = falta("CPF DE QUEM ASSINA");
const MARCA_RG = falta("RG DE QUEM ASSINA");
const MARCA_NACIONALIDADE = falta("NACIONALIDADE DE QUEM ASSINA");
const MARCA_ESTADO_CIVIL = falta("ESTADO CIVIL DE QUEM ASSINA");
const MARCA_PROFISSAO = falta("PROFISSÃO DE QUEM ASSINA");
const MARCA_ENDERECO = falta("ENDEREÇO DE QUEM ASSINA");

/** Nacionalidade, estado civil (no gênero do papel) e profissão de quem assina, com a marca de cada um. */
function partesDaQualificacao(c: ResponsavelDoCliente): { valor: string | null; marca: string }[] {
  return [
    { valor: c.rlNacionalidade?.trim().toLowerCase() || null, marca: MARCA_NACIONALIDADE },
    { valor: estadoCivilNoGenero(c.rlEstadoCivil, papelFeminino(c.rlPapel)), marca: MARCA_ESTADO_CIVIL },
    { valor: c.rlProfissao?.trim().toLowerCase() || null, marca: MARCA_PROFISSAO },
  ];
}

/**
 * As marcas da qualificação de quem assina que faltam, na ordem do texto (nacionalidade, estado
 * civil, profissão). Vazia quando a qualificação está completa (F3.161).
 */
export function marcasDaQualificacaoDoResponsavel(c: ResponsavelDoCliente): string[] {
  return partesDaQualificacao(c).filter((p) => !p.valor).map((p) => p.marca);
}

function cep(c: string): string {
  return c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : c;
}

/** O endereço de quem assina, quando não mora com o cliente. */
export function enderecoDoResponsavel(c: ResponsavelDoCliente): string {
  if (!c.rlEndereco?.trim()) return MARCA_ENDERECO;
  const partes = [c.rlEndereco.trim(), c.rlBairro?.trim(), c.rlCidade?.trim(), c.rlUf?.trim()].filter(Boolean);
  return `${partes.join(", ")}${c.rlCep ? `, CEP ${cep(c.rlCep)}` : ""}`;
}

/**
 * "brasileira, divorciada, auxiliar administrativa, portadora do RG nº …, inscrita no CPF sob o nº …".
 * O que falta sai marcado ([ESTADO CIVIL DE QUEM ASSINA: falta]), como na qualificação do cliente (F3.161).
 */
export function qualificacaoDoResponsavel(c: ResponsavelDoCliente): string {
  const f = papelFeminino(c.rlPapel);
  const rg = c.rlRg?.trim() ? `${c.rlRg.trim()}${c.rlRgOrgao?.trim() ? ` ${c.rlRgOrgao.trim()}` : ""}` : MARCA_RG;
  return [
    ...partesDaQualificacao(c).map((p) => p.valor ?? p.marca),
    `${f ? "portadora" : "portador"} do RG nº ${rg}`,
    `${f ? "inscrita" : "inscrito"} no CPF sob o nº ${c.rlDocumento ? formatarDocumento(c.rlDocumento) : MARCA_CPF}`,
  ].join(", ");
}

/** "neste ato representado(a) por sua mãe, JOANA ALVES SOUZA, brasileira, …". */
export function trechoDoResponsavel(c: ResponsavelDoCliente, quem: Exclude<QuemAssina, "PROPRIO">): string {
  const verbo = quem === "ASSISTIDO" || quem === "CURATELA_ASSISTE" ? "assistido(a)" : "representado(a)";
  const nome = c.rlNome?.trim() ? c.rlNome.trim().toUpperCase() : MARCA_QUEM_ASSINA;
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
  const nomeRl = c.rlNome?.trim() ? c.rlNome.trim().toUpperCase() : MARCA_QUEM_ASSINA;
  const cpfRl = `CPF ${c.rlDocumento ? formatarDocumento(c.rlDocumento) : MARCA_CPF}`;
  if (quem === "ASSISTIDO" || quem === "CURATELA_ASSISTE") {
    const papel = c.rlPapel ? PAPEIS_RESPONSAVEL[c.rlPapel].toLowerCase() : "responsável";
    return `${linha}\n${nomeCliente}\nCPF ${cpfCliente}\n\n${linha}\n${nomeRl}\n${papel}, que o(a) assiste\n${cpfRl}`;
  }
  return `${linha}\n${nomeCliente}\nrepresentado(a) por ${papelComPossessivo(c.rlPapel)}, ${nomeRl}\n${cpfRl}`;
}

/**
 * Cada falta de quem assina, com as marcas que ela deixa no .docx (F3.161): o CPF, o RG e o endereço
 * deixam uma; a qualificação (nacionalidade, estado civil, profissão) é 1 dado, como na ficha
 * (RL_QUALIFICACAO), e deixa de 1 a 3 marcas. A tela cita estas marcas; não escreve as suas.
 */
export function faltasDoResponsavelComMarcas(c: ResponsavelDoCliente): { falta: string; marcas: string[] }[] {
  const f: { falta: string; marcas: string[] }[] = [];
  if (!c.rlNome?.trim()) f.push({ falta: "quem assina pelo cliente", marcas: [MARCA_QUEM_ASSINA] });
  if (!c.rlDocumento) f.push({ falta: "o CPF de quem assina", marcas: [MARCA_CPF] });
  if (!c.rlRg?.trim()) f.push({ falta: "o RG de quem assina", marcas: [MARCA_RG] });
  const qualificacao = marcasDaQualificacaoDoResponsavel(c);
  if (qualificacao.length) f.push({ falta: "a qualificação de quem assina", marcas: qualificacao });
  if (c.rlMoraJunto === false && !c.rlEndereco?.trim()) f.push({ falta: "o endereço de quem assina", marcas: [MARCA_ENDERECO] });
  return f;
}

/**
 * O que falta de quem assina, para o aviso no alto ("o CPF de quem assina"). "A qualificação de
 * quem assina" é 1 dado e sai marcada no .docx (F3.161).
 */
export function faltasDoResponsavel(c: ResponsavelDoCliente): string[] {
  return faltasDoResponsavelComMarcas(c).map((x) => x.falta);
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
