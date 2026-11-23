// Gerador de petições (EX-09), tela aprovada em docs/design/aprovadas/portal-peticoes (Carol,
// 19/11/2026). Não há IA: é preenchimento de modelo. O texto jurídico é o do escritório; o T3jus
// só troca os campos entre colchetes pelos dados do cadastro e do formulário curto. Aqui ficam:
// - os campos aceitos e o que entra em cada um (decisão 4);
// - os 8 modelos padrão do T3jus, em código, para o escritório testar no primeiro dia;
// - a montagem dos valores, com o que falta marcado ("[RG: falta]", decisão 8);
// - a prévia por parágrafo, com as marcas de origem (decisão 10);
// - os esquemas dos pedidos e os tipos das respostas da API.
// As regras de quem pode, do que bloqueia e da revisão ficam no banco (0440_portal_peticoes.sql).

import { z } from "zod";
import type { PessoaRef } from "./clientes.ts";
import { ESTADOS_CIVIS, formatarDocumento, type EstadoCivil } from "./clientes.ts";
import { dinheiro, formatar } from "./dinheiro.ts";
import { faltasDoAdvogado, qualificacaoDoAdvogado, ROTULO_FALTA_ADVOGADO, type DadoQueConta, type DadosDocumentoPessoa } from "./dados_advogado.ts";
import { CAMPO_DOCX, MARCA_FALTA, type ParagrafoDocx } from "./docx.ts";
import { enderecoDoEscritorioNoDocumento } from "./escritorio_dados.ts";
import { AREAS_DIREITO, formatarCnj, type AreaDireito } from "./juridico.ts";
import { fraseOab, type InscricaoOab, type TipoOab, type UfBrasil } from "./portal.ts";

// ------------------------------------------------------------------------------- campos

export const TIPOS_PECA = {
  INICIAL: "Petição inicial",
  CONTESTACAO: "Contestação",
  RECURSO: "Recurso",
  JUNTADA: "Juntada de documentos",
  PRAZO: "Pedido de prazo",
  MANIFESTACAO: "Manifestação",
  OUTRA: "Outra peça",
} as const;
export type TipoPeca = keyof typeof TIPOS_PECA;

export type AreaModelo = AreaDireito | "QUALQUER";
export const AREAS_MODELO: Record<AreaModelo, string> = { ...AREAS_DIREITO, QUALQUER: "Qualquer área" };

/** Os grupos da lista de modelos (decisão 4): a área ordena a escolha na nova petição. */
export function grupoDaArea(area: AreaModelo): string {
  if (area === "TRABALHISTA") return "Trabalhista";
  if (area === "CIVEL" || area === "CONSUMIDOR" || area === "SAUDE") return "Cível, consumidor e saúde";
  if (area === "QUALQUER") return "Para qualquer área";
  return AREAS_DIREITO[area];
}

export type OrigemCampo = "cadastro" | "formulario" | "escritorio";

export interface CampoPeticao {
  campo: string;
  grupo: "Clientes do caso" | "Caso e processo" | "Advogados" | "Formulário e escritório";
  descricao: string;
  origem: OrigemCampo;
}

export const CAMPOS_PETICAO: readonly CampoPeticao[] = [
  { campo: "PARTES_QUALIFICACAO", grupo: "Clientes do caso", descricao: "Todos os clientes marcados como partes, cada um com a qualificação, ligados por “e”", origem: "cadastro" },
  { campo: "CLIENTE_NOME", grupo: "Clientes do caso", descricao: "Nome do primeiro cliente, em maiúsculas", origem: "cadastro" },
  { campo: "CLIENTE_QUALIFICACAO", grupo: "Clientes do caso", descricao: "Nacionalidade, estado civil, profissão, RG, CPF e endereço do primeiro cliente", origem: "cadastro" },
  { campo: "CLIENTE_CPF", grupo: "Clientes do caso", descricao: "CPF (ou CNPJ) do primeiro cliente", origem: "cadastro" },
  { campo: "CLIENTE_RG", grupo: "Clientes do caso", descricao: "RG do primeiro cliente, com o órgão", origem: "cadastro" },
  { campo: "CLIENTE_ENDERECO", grupo: "Clientes do caso", descricao: "Endereço completo do primeiro cliente", origem: "cadastro" },
  { campo: "NUMERO_PROCESSO", grupo: "Caso e processo", descricao: "Número no formato do CNJ", origem: "cadastro" },
  { campo: "VARA", grupo: "Caso e processo", descricao: "Vara do caso", origem: "cadastro" },
  { campo: "TRIBUNAL", grupo: "Caso e processo", descricao: "Tribunal do caso", origem: "cadastro" },
  { campo: "SISTEMA", grupo: "Caso e processo", descricao: "Sistema do processo (PJe, e-SAJ…)", origem: "cadastro" },
  { campo: "PARTE_CONTRARIA", grupo: "Caso e processo", descricao: "Nome da parte contrária", origem: "cadastro" },
  { campo: "PARTE_CONTRARIA_QUALIFICACAO", grupo: "Caso e processo", descricao: "CNPJ ou CPF e endereço, quando o caso tiver", origem: "cadastro" },
  { campo: "VALOR_CAUSA", grupo: "Caso e processo", descricao: "R$ 86.400,00", origem: "formulario" },
  { campo: "VALOR_CAUSA_EXTENSO", grupo: "Caso e processo", descricao: "“oitenta e seis mil e quatrocentos reais”", origem: "formulario" },
  { campo: "ADVOGADOS_OAB", grupo: "Advogados", descricao: "Nome completo e inscrições de quem assina: “MARINA RIBEIRO, OAB/SP nº 214.538, e …”", origem: "cadastro" },
  { campo: "ADVOGADOS_QUALIFICACAO", grupo: "Advogados", descricao: "Cada advogado que assina com a qualificação completa: nome, nacionalidade, estado civil, OAB, RG, CPF e endereço profissional (de Sua conta)", origem: "cadastro" },
  { campo: "ADVOGADOS_ASSINATURA", grupo: "Advogados", descricao: "O bloco de assinatura, uma linha por advogado", origem: "cadastro" },
  { campo: "ENDERECAMENTO", grupo: "Formulário e escritório", descricao: "Para quem vai a petição; vem montado da vara do caso", origem: "formulario" },
  { campo: "CIDADE_DATA", grupo: "Formulário e escritório", descricao: "“São Paulo, 18 de novembro de 2026”", origem: "formulario" },
  { campo: "ESCRITORIO_NOME", grupo: "Formulário e escritório", descricao: "Nome do escritório, de Escritório no Portal", origem: "escritorio" },
  { campo: "ESCRITORIO_ENDERECO", grupo: "Formulário e escritório", descricao: "Endereço do escritório, de Escritório no Portal", origem: "escritorio" },
];
export const NOMES_CAMPOS = CAMPOS_PETICAO.map((c) => c.campo);

export function campoConhecido(campo: string): boolean {
  return NOMES_CAMPOS.includes(campo);
}

/** Para o campo que o T3jus não conhece, o mais parecido da lista (decisão 5). */
export function sugestaoCampo(campo: string): string | null {
  const c = campo.toUpperCase();
  const regras: [RegExp, string][] = [
    [/RECLAMAD|REU|RE_|CONTRARI|REQUERID|EMPRESA/, "PARTE_CONTRARIA"],
    [/QUALIFICA.*ADVOG|ADVOG.*QUALIFICA|QUALIFICA.*PROCURADOR/, "ADVOGADOS_QUALIFICACAO"],
    [/QUALIFICA/, "PARTES_QUALIFICACAO"],
    [/RECLAMANTE|AUTOR|REQUERENTE|CLIENTE|NOME/, "CLIENTE_NOME"],
    [/CPF|DOCUMENTO/, "CLIENTE_CPF"],
    [/ENDERECO/, "CLIENTE_ENDERECO"],
    [/PROCESSO|AUTOS/, "NUMERO_PROCESSO"],
    [/EXTENSO/, "VALOR_CAUSA_EXTENSO"],
    [/VALOR/, "VALOR_CAUSA"],
    [/DATA|LOCAL|CIDADE/, "CIDADE_DATA"],
    [/ASSINA/, "ADVOGADOS_ASSINATURA"],
    [/OAB|ADVOGAD|PROCURADOR/, "ADVOGADOS_OAB"],
    [/JUIZ|JUIZO|ENDERECAMENTO|EXCELENTISSIMO/, "ENDERECAMENTO"],
    [/VARA|FORO|COMARCA/, "VARA"],
    [/TRIBUNAL|TRT|TJ/, "TRIBUNAL"],
    [/ESCRITORIO/, "ESCRITORIO_NOME"],
  ];
  for (const [r, s] of regras) if (r.test(c)) return s;
  return null;
}

/** Os campos de um texto, na ordem e sem repetir. */
export function camposDoTexto(textos: readonly string[]): string[] {
  const achados: string[] = [];
  for (const t of textos) for (const m of t.matchAll(CAMPO_DOCX)) if (!achados.includes(m[1]!)) achados.push(m[1]!);
  return achados;
}

// ------------------------------------------------------------------------------- modelos padrão

export interface ModeloPadrao {
  codigo: string;
  nome: string;
  tipo: TipoPeca;
  area: AreaModelo;
  atualizadoEm: string;
  paragrafos: readonly ParagrafoDocx[];
  /** O que diz a prévia depois do começo do documento. */
  resto: string;
}

const ABERTURA_FIM: ParagrafoDocx[] = [
  { texto: "Termos em que pede deferimento." },
  { texto: "[CIDADE_DATA].", estilo: "direita" },
  { texto: "[ADVOGADOS_ASSINATURA]", estilo: "assinatura" },
];

/**
 * Os 8 modelos padrão (pergunta 3 da Carol). Curtos, para o escritório ver como os campos
 * funcionam e trocar cada um pelo dele. O texto jurídico passa pela advogada parceira antes de
 * valer como pronto (item pendente no painel).
 */
export const MODELOS_PADRAO: readonly ModeloPadrao[] = [
  {
    codigo: "INICIAL_TRABALHISTA", nome: "Petição inicial trabalhista", tipo: "INICIAL", area: "TRABALHISTA", atualizadoEm: "2026-11-20",
    resto: "Continua com os fatos, os pedidos e o valor da causa, para completar no Word.",
    paragrafos: [
      { texto: "[ENDERECAMENTO]", estilo: "enderecamento" },
      { texto: "[PARTES_QUALIFICACAO], por seus advogados, [ADVOGADOS_OAB], com escritório em [ESCRITORIO_ENDERECO], onde recebem intimações, vêm propor" },
      { texto: "RECLAMAÇÃO TRABALHISTA", estilo: "titulo" },
      { texto: "em face de [PARTE_CONTRARIA], [PARTE_CONTRARIA_QUALIFICACAO], pelos fatos e fundamentos a seguir." },
      { texto: "I. DOS FATOS", estilo: "titulo" },
      { texto: "(Escreva aqui os fatos: admissão, função, salário, jornada e desligamento.)" },
      { texto: "II. DOS PEDIDOS", estilo: "titulo" },
      { texto: "Diante do exposto, requer a notificação da reclamada para, querendo, apresentar defesa, sob pena de revelia e confissão, e a procedência dos pedidos, com a condenação ao pagamento das verbas acima, acrescidas de juros e correção monetária." },
      { texto: "Requer a produção de todas as provas em direito admitidas, em especial o depoimento pessoal do representante da reclamada e a oitiva de testemunhas." },
      { texto: "Dá-se à causa o valor de [VALOR_CAUSA] ([VALOR_CAUSA_EXTENSO])." },
      ...ABERTURA_FIM,
    ],
  },
  {
    codigo: "INICIAL_CIVEL", nome: "Petição inicial cível", tipo: "INICIAL", area: "CIVEL", atualizadoEm: "2026-11-20",
    resto: "Continua com os fatos, o direito e os pedidos, para completar no Word.",
    paragrafos: [
      { texto: "[ENDERECAMENTO]", estilo: "enderecamento" },
      { texto: "[PARTES_QUALIFICACAO], por seus advogados, [ADVOGADOS_OAB], com escritório em [ESCRITORIO_ENDERECO], onde recebem intimações, vêm propor a presente" },
      { texto: "AÇÃO", estilo: "titulo" },
      { texto: "em face de [PARTE_CONTRARIA], [PARTE_CONTRARIA_QUALIFICACAO], pelos fatos e fundamentos a seguir." },
      { texto: "I. DOS FATOS", estilo: "titulo" },
      { texto: "(Escreva aqui os fatos.)" },
      { texto: "II. DO DIREITO", estilo: "titulo" },
      { texto: "(Escreva aqui os fundamentos jurídicos.)" },
      { texto: "III. DOS PEDIDOS", estilo: "titulo" },
      { texto: "Diante do exposto, requer a citação da parte ré para, querendo, contestar no prazo legal, e a procedência dos pedidos, com a condenação ao pagamento das custas e dos honorários de sucumbência." },
      { texto: "Informa, nos termos do art. 319, VII, do Código de Processo Civil, que (não) tem interesse na audiência de conciliação." },
      { texto: "Requer a produção de todas as provas em direito admitidas." },
      { texto: "Dá-se à causa o valor de [VALOR_CAUSA] ([VALOR_CAUSA_EXTENSO])." },
      ...ABERTURA_FIM,
    ],
  },
  {
    codigo: "CONTESTACAO_TRABALHISTA", nome: "Contestação trabalhista", tipo: "CONTESTACAO", area: "TRABALHISTA", atualizadoEm: "2026-11-20",
    resto: "Continua com as preliminares e o mérito, para completar no Word.",
    paragrafos: [
      { texto: "[ENDERECAMENTO]", estilo: "enderecamento" },
      { texto: "Processo nº [NUMERO_PROCESSO]" },
      { texto: "[PARTES_QUALIFICACAO], nos autos da reclamação trabalhista que lhe move [PARTE_CONTRARIA], vem, por seus advogados, [ADVOGADOS_OAB], apresentar" },
      { texto: "CONTESTAÇÃO", estilo: "titulo" },
      { texto: "pelos fatos e fundamentos a seguir." },
      { texto: "I. DO MÉRITO", estilo: "titulo" },
      { texto: "(Escreva aqui a defesa, pedido por pedido.)" },
      { texto: "Diante do exposto, requer a improcedência dos pedidos e a produção de todas as provas em direito admitidas." },
      ...ABERTURA_FIM,
    ],
  },
  {
    codigo: "CONTESTACAO_CIVEL", nome: "Contestação cível", tipo: "CONTESTACAO", area: "CIVEL", atualizadoEm: "2026-11-20",
    resto: "Continua com os fatos e o mérito, para completar no Word.",
    paragrafos: [
      { texto: "[ENDERECAMENTO]", estilo: "enderecamento" },
      { texto: "Processo nº [NUMERO_PROCESSO]" },
      { texto: "[PARTES_QUALIFICACAO], nos autos da ação que lhe move [PARTE_CONTRARIA], vem, por seus advogados, [ADVOGADOS_OAB], apresentar" },
      { texto: "CONTESTAÇÃO", estilo: "titulo" },
      { texto: "pelos fatos e fundamentos a seguir." },
      { texto: "I. DOS FATOS", estilo: "titulo" },
      { texto: "(Escreva aqui a versão dos fatos.)" },
      { texto: "II. DO MÉRITO", estilo: "titulo" },
      { texto: "(Escreva aqui a defesa.)" },
      { texto: "Diante do exposto, requer a improcedência dos pedidos, com a condenação da parte autora ao pagamento das custas e dos honorários de sucumbência, e a produção de todas as provas em direito admitidas." },
      ...ABERTURA_FIM,
    ],
  },
  {
    codigo: "RECURSO_ORDINARIO", nome: "Recurso ordinário", tipo: "RECURSO", area: "TRABALHISTA", atualizadoEm: "2026-11-20",
    resto: "Continua com as razões do recurso, para completar no Word.",
    paragrafos: [
      { texto: "[ENDERECAMENTO]", estilo: "enderecamento" },
      { texto: "Processo nº [NUMERO_PROCESSO]" },
      { texto: "[PARTES_QUALIFICACAO], nos autos da reclamação trabalhista em face de [PARTE_CONTRARIA], [PARTE_CONTRARIA_QUALIFICACAO], vem, por seus advogados, inconformado(a) com a r. sentença, interpor" },
      { texto: "RECURSO ORDINÁRIO", estilo: "titulo" },
      { texto: "com as razões anexas, requerendo o seu recebimento e a remessa ao Egrégio [TRIBUNAL]." },
      ...ABERTURA_FIM,
    ],
  },
  {
    codigo: "JUNTADA", nome: "Juntada de documentos", tipo: "JUNTADA", area: "QUALQUER", atualizadoEm: "2026-11-20",
    resto: "Fim do modelo padrão do T3jus. A lista dos documentos se escreve no Word.",
    paragrafos: [
      { texto: "[ENDERECAMENTO]", estilo: "enderecamento" },
      { texto: "Processo nº [NUMERO_PROCESSO]" },
      { texto: "[PARTES_QUALIFICACAO], nos autos da ação em face de [PARTE_CONTRARIA], vem, por seus advogados, requerer a juntada dos documentos anexos." },
      ...ABERTURA_FIM,
    ],
  },
  {
    codigo: "PRAZO", nome: "Pedido de prazo", tipo: "PRAZO", area: "QUALQUER", atualizadoEm: "2026-11-20",
    resto: "Fim do modelo padrão do T3jus. O motivo e o número de dias se ajustam no Word.",
    paragrafos: [
      { texto: "[ENDERECAMENTO]", estilo: "enderecamento" },
      { texto: "Processo nº [NUMERO_PROCESSO]" },
      { texto: "[PARTES_QUALIFICACAO], nos autos da ação em face de [PARTE_CONTRARIA], vem, por seus advogados, requerer a dilação do prazo por mais 15 (quinze) dias, para (escreva o motivo)." },
      ...ABERTURA_FIM,
    ],
  },
  {
    codigo: "MANIFESTACAO", nome: "Manifestação simples", tipo: "MANIFESTACAO", area: "QUALQUER", atualizadoEm: "2026-11-20",
    resto: "Fim do modelo padrão do T3jus. O texto da manifestação se escreve no Word.",
    paragrafos: [
      { texto: "[ENDERECAMENTO]", estilo: "enderecamento" },
      { texto: "Processo nº [NUMERO_PROCESSO]" },
      { texto: "[PARTES_QUALIFICACAO], nos autos da ação em face de [PARTE_CONTRARIA], vem, por seus advogados, manifestar-se nos seguintes termos:" },
      { texto: "(Escreva aqui a manifestação.)" },
      ...ABERTURA_FIM,
    ],
  },
];

export function modeloPadrao(codigo: string): ModeloPadrao | null {
  return MODELOS_PADRAO.find((m) => m.codigo === codigo) ?? null;
}
export const CODIGOS_PADRAO = MODELOS_PADRAO.map((m) => m.codigo);

export function camposDoPadrao(m: ModeloPadrao): string[] {
  return camposDoTexto(m.paragrafos.map((p) => p.texto));
}

// ------------------------------------------------------------------------------- dados

/** Um cliente do caso, com a qualificação do cadastro (AP-01), como o banco devolve. */
export interface ClienteDaPeticao {
  id: string;
  nome: string;
  tipo: "PF" | "PJ";
  papel: "AUTOR" | "REU" | "INTERESSADO";
  documento: string | null;
  nacionalidade: string | null;
  estadoCivil: EstadoCivil | null;
  profissao: string | null;
  rg: string | null;
  rgOrgao: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  repNome: string | null;
  repCargo: string | null;
}

export interface AdvogadoDaPeticao {
  pessoaId: string;
  nome: string;
  responsavel: boolean;
  socioDono: boolean;
  inscricoes: InscricaoOab[];
  /** Os dados de Sua conta (EX-15, F3.106); sem eles, só o nome e a OAB. */
  dados?: DadosDocumentoPessoa | null;
}

export interface CasoDaPeticao {
  id: string;
  nome: string;
  area: AreaDireito;
  numero: string | null;
  vara: string | null;
  tribunal: string | null;
  sistema: string | null;
  parteContraria: string | null;
  parteContrariaQualificacao: string | null;
  valorCausa: number | null;
  responsavel: PessoaRef;
}

export interface EscritorioDaPeticao {
  nome: string;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  /** A sede em partes e a razão social (PA-07, 0860). */
  razaoSocial?: string | null;
  tipo?: "SOCIEDADE" | "SOCIEDADE_INDIVIDUAL" | "SEM_SOCIEDADE" | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  enderecoConfira?: boolean;
}

/** O que o formulário mostra para um caso (GET …/peticao-dados). */
export interface DadosPeticao {
  caso: CasoDaPeticao;
  clientes: ClienteDaPeticao[];
  advogados: AdvogadoDaPeticao[];
  /** Quem tem Jurídico e fica de fora por não ter OAB. */
  semOab: PessoaRef[];
  escritorio: EscritorioDaPeticao;
  hoje: string;
  /** Quem está na sessão, para o link de completar os dados (Sua conta ou Equipe). */
  eu?: string;
  /** Quem revisa, se a pessoa da sessão gerar: null quando sai aprovada (decisão 17). */
  revisor: PessoaRef | null;
  /** Por que não passa pela revisão: "RESPONSAVEL" ou "SOCIO_DONO". */
  semRevisao: "RESPONSAVEL" | "SOCIO_DONO" | null;
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2026-11-18" → "18 de novembro de 2026". */
export function dataPorExtenso(dia: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  return `${d} de ${MESES[(m ?? 1) - 1]} de ${a}`;
}

/** "São Paulo, 18 de novembro de 2026" (decisão 7: do endereço do escritório e de hoje). */
export function cidadeDataPadrao(escritorio: EscritorioDaPeticao, hoje: string): string {
  return `${escritorio.cidade?.trim() || "[CIDADE: falta]"}, ${dataPorExtenso(hoje)}`;
}

/** O endereçamento montado da vara do caso (decisão 7), para a pessoa conferir. */
export function enderecamentoSugerido(caso: Pick<CasoDaPeticao, "area" | "vara" | "tribunal">, uf?: string | null): string {
  const juiz = caso.area === "TRABALHISTA" ? "Juiz(íza)" : caso.area === "PREVIDENCIARIO" ? "Juiz(íza) Federal" : "Juiz(íza) de Direito";
  const fim = uf ? ` – ${uf}` : "";
  if (caso.vara?.trim()) return `Excelentíssimo(a) Senhor(a) ${juiz} da ${caso.vara.trim()}${fim}`;
  if (caso.tribunal?.trim()) return `Excelentíssimo(a) Senhor(a) ${juiz} do ${caso.tribunal.trim()}${fim}`;
  return `Excelentíssimo(a) Senhor(a) ${juiz}${fim}`;
}

const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze",
  "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes: string[] = [];
  if (c) partes.push(CENTENAS[c]!);
  if (r < 20) {
    if (r) partes.push(UNIDADES[r]!);
  } else {
    const d = Math.floor(r / 10);
    const u = r % 10;
    partes.push(u ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]!);
  }
  return partes.join(" e ");
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return "zero";
  const grupos: number[] = [];
  for (let x = n; x > 0; x = Math.floor(x / 1000)) grupos.push(x % 1000);
  const nomes: [string, string][] = [["", ""], ["mil", "mil"], ["milhão", "milhões"], ["bilhão", "bilhões"], ["trilhão", "trilhões"]];
  const partes: { texto: string; valor: number; nivel: number }[] = [];
  grupos.forEach((g, i) => {
    if (!g) return;
    const [um, varios] = nomes[i]!;
    let t: string;
    if (i === 1) t = g === 1 ? "mil" : `${ate999(g)} mil`;
    else if (i > 1) t = `${ate999(g)} ${g === 1 ? um : varios}`;
    else t = ate999(g);
    partes.unshift({ texto: t, valor: g, nivel: i });
  });
  // "e" antes do último grupo quando ele é menor que 100 ou é centena redonda (mil e cem, mil e
  // duzentos); "mil duzentos e trinta" sem vírgula; entre milhões e milhares, vírgula.
  return partes.map((p, i) => {
    if (i === 0) return p.texto;
    const ultimo = i === partes.length - 1;
    const junta = ultimo && (p.valor < 100 || p.valor % 100 === 0) ? " e " : p.nivel === 0 ? " " : ", ";
    return `${junta}${p.texto}`;
  }).join("");
}

/** 8640000 → "oitenta e seis mil e quatrocentos reais"; 150 → "um real e cinquenta centavos". */
export function valorPorExtenso(centavos: number): string {
  const reais = Math.floor(centavos / 100);
  const cents = centavos % 100;
  const partes: string[] = [];
  if (reais) {
    const t = inteiroPorExtenso(reais);
    const de = /(milhão|milhões|bilhão|bilhões|trilhão|trilhões)$/.test(t) ? " de" : "";
    partes.push(`${t}${de} ${reais === 1 ? "real" : "reais"}`);
  }
  if (cents) partes.push(`${inteiroPorExtenso(cents)} ${cents === 1 ? "centavo" : "centavos"}`);
  return partes.length ? partes.join(" e ") : "zero real";
}

function falta(o_que: string): string {
  return `[${o_que}: falta]`;
}

function cepFormatado(cep: string): string {
  return cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep;
}

/** "Rua X, 10, Bairro, Cidade, UF, CEP 00000-000", ou o marcador quando falta. */
export function enderecoDoCliente(c: Pick<ClienteDaPeticao, "endereco" | "bairro" | "cidade" | "uf" | "cep">): string {
  if (!c.endereco?.trim()) return falta("ENDEREÇO");
  const partes = [c.endereco.trim(), c.bairro?.trim(), c.cidade?.trim(), c.uf?.trim()].filter(Boolean);
  return `${partes.join(", ")}${c.cep ? `, CEP ${cepFormatado(c.cep)}` : ""}`;
}

export function rgDoCliente(c: Pick<ClienteDaPeticao, "rg" | "rgOrgao">): string {
  return c.rg?.trim() ? `${c.rg.trim()}${c.rgOrgao?.trim() ? ` ${c.rgOrgao.trim()}` : ""}` : falta("RG");
}

/** A qualificação do cadastro (AP-01), com o que falta marcado (decisão 8). */
export function qualificacaoDoCliente(c: ClienteDaPeticao): string {
  if (c.tipo === "PJ") {
    const cnpj = c.documento ? formatarDocumento(c.documento) : falta("CNPJ");
    const rep = c.repNome?.trim() ? `, neste ato representada por ${c.repNome.trim()}${c.repCargo?.trim() ? `, ${c.repCargo.trim()}` : ""}` : "";
    return `pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${cnpj}, com sede na ${enderecoDoCliente(c)}${rep}`;
  }
  const estadoCivil = c.estadoCivil ? ESTADOS_CIVIS[c.estadoCivil].toLowerCase() : falta("ESTADO CIVIL");
  const partes = [
    c.nacionalidade?.trim().toLowerCase() || falta("NACIONALIDADE"),
    estadoCivil,
    c.profissao?.trim().toLowerCase() || falta("PROFISSÃO"),
    `portador(a) do RG nº ${rgDoCliente(c)}`,
    `inscrito(a) no CPF sob o nº ${c.documento ? formatarDocumento(c.documento) : falta("CPF")}`,
    `residente na ${enderecoDoCliente(c)}`,
  ];
  return partes.join(", ");
}

/** O que falta no cadastro do cliente, para o selo "Falta o RG" e o resumo (decisão 7). */
export function faltasDoCliente(c: ClienteDaPeticao): string[] {
  const f: string[] = [];
  if (c.tipo === "PJ") {
    if (!c.documento) f.push("CNPJ");
    if (!c.endereco?.trim()) f.push("endereço");
    return f;
  }
  if (!c.nacionalidade?.trim()) f.push("nacionalidade");
  if (!c.estadoCivil) f.push("estado civil");
  if (!c.profissao?.trim()) f.push("profissão");
  if (!c.rg?.trim()) f.push("RG");
  if (!c.documento) f.push("CPF");
  if (!c.endereco?.trim()) f.push("endereço");
  return f;
}

function juntarComE(itens: string[]): string {
  if (itens.length <= 1) return itens[0] ?? "";
  return `${itens.slice(0, -1).join(", ")} e ${itens.at(-1)}`;
}

export interface AdvogadoEscolhido {
  pessoaId: string;
  inscricoes: string[];
}

/** O que a pessoa escolhe no formulário (decisão 7). */
export interface EscolhasPeticao {
  partes: string[];
  advogados: AdvogadoEscolhido[];
  enderecamento: string;
  numero?: string | null;
  valorCausa?: number | null;
  parteContrariaQualificacao?: string | null;
  cidadeData: string;
}

export type OrigemValor = "cadastro" | "formulario";
export interface ValoresPeticao {
  valores: Record<string, string>;
  origem: Record<string, OrigemValor>;
  /** O que saiu marcado, para o resumo e o resultado: "RG de Carlos Henrique Dias". */
  marcados: string[];
  /** Dos marcados, os dos advogados ("CPF de Rafael Menezes"): só contam se o modelo usa a qualificação. */
  marcadosAdvogados?: string[];
}

/** O nome que vai na petição: o completo de Sua conta (EX-15) ou, sem ele, o da Equipe. */
export function nomeDoAdvogadoNaPeticao(a: Pick<AdvogadoDaPeticao, "nome" | "dados">): string {
  return a.dados?.nomeCompleto?.trim() || a.nome;
}

/** O que falta de cada advogado escolhido (sem a OAB, que quem assina sempre tem). */
export function faltasDoAdvogadoNaPeticao(a: AdvogadoDaPeticao, esc: EscritorioDaPeticao): DadoQueConta[] {
  if (!a.dados) return [];
  return faltasDoAdvogado(a.dados, a.inscricoes, esc).filter((f) => f !== "OAB");
}

/** Os valores de cada campo, com a origem e o que saiu marcado (decisões 7, 8 e 14). */
export function montarValores(d: DadosPeticao, e: EscolhasPeticao): ValoresPeticao {
  const partes = e.partes.map((id) => d.clientes.find((c) => c.id === id)).filter((c): c is ClienteDaPeticao => !!c);
  const advogados = e.advogados
    .map((a) => {
      const adv = d.advogados.find((x) => x.pessoaId === a.pessoaId);
      if (!adv) return null;
      return { ...adv, inscricoes: adv.inscricoes.filter((i) => a.inscricoes.includes(i.id)) };
    })
    .filter((a): a is AdvogadoDaPeticao => !!a && a.inscricoes.length > 0);
  const marcados: string[] = [];
  for (const p of partes) for (const f of faltasDoCliente(p)) marcados.push(`${f === "RG" || f === "CPF" || f === "CNPJ" ? f : f[0]!.toUpperCase() + f.slice(1)} de ${p.nome}`);
  const marcadosAdvogados = advogados.flatMap((a) => faltasDoAdvogadoNaPeticao(a, d.escritorio).map((f) => `${ROTULO_FALTA_ADVOGADO[f]} de ${a.nome}`));
  marcados.push(...marcadosAdvogados);

  const primeiro = partes[0];
  const numero = (e.numero ?? "").replace(/\D/g, "") || d.caso.numero;
  if (!numero) marcados.push("Número do processo");
  const valor = e.valorCausa === undefined ? d.caso.valorCausa : e.valorCausa;
  const qualifContraria = e.parteContrariaQualificacao === undefined ? d.caso.parteContrariaQualificacao : e.parteContrariaQualificacao;

  const qualificada = (c: ClienteDaPeticao) => `${c.nome.toUpperCase()}, ${qualificacaoDoCliente(c)}`;
  const nomeAdv = (a: AdvogadoDaPeticao) => nomeDoAdvogadoNaPeticao(a).toUpperCase();
  const qualificacaoAdv = (a: AdvogadoDaPeticao) => (a.dados ? qualificacaoDoAdvogado(a.dados, a.inscricoes, d.escritorio) : `${nomeAdv(a)}, ${frase(a)}`);
  const frase = (a: AdvogadoDaPeticao) => fraseOab(a.inscricoes);

  const valores: Record<string, string> = {
    PARTES_QUALIFICACAO: partes.length ? juntarComE(partes.map(qualificada)) : falta("PARTES"),
    CLIENTE_NOME: primeiro ? primeiro.nome.toUpperCase() : falta("CLIENTE"),
    CLIENTE_QUALIFICACAO: primeiro ? qualificacaoDoCliente(primeiro) : falta("QUALIFICAÇÃO"),
    CLIENTE_CPF: primeiro?.documento ? formatarDocumento(primeiro.documento) : falta(primeiro?.tipo === "PJ" ? "CNPJ" : "CPF"),
    CLIENTE_RG: primeiro ? rgDoCliente(primeiro) : falta("RG"),
    CLIENTE_ENDERECO: primeiro ? enderecoDoCliente(primeiro) : falta("ENDEREÇO"),
    NUMERO_PROCESSO: numero ? formatarCnj(numero) : falta("NÚMERO DO PROCESSO"),
    VARA: d.caso.vara?.trim() || falta("VARA"),
    TRIBUNAL: d.caso.tribunal?.trim() || falta("TRIBUNAL"),
    SISTEMA: d.caso.sistema?.trim() || falta("SISTEMA"),
    PARTE_CONTRARIA: d.caso.parteContraria?.trim().toUpperCase() || falta("PARTE CONTRÁRIA"),
    PARTE_CONTRARIA_QUALIFICACAO: qualifContraria?.trim() || falta("QUALIFICAÇÃO DA PARTE CONTRÁRIA"),
    VALOR_CAUSA: valor ? formatar(dinheiro(valor)) : falta("VALOR DA CAUSA"),
    VALOR_CAUSA_EXTENSO: valor ? valorPorExtenso(valor) : falta("VALOR POR EXTENSO"),
    ADVOGADOS_OAB: advogados.length
      ? advogados.map((a) => `${nomeAdv(a)}, ${frase(a)}`).reduce((s, x, i, l) => (i === 0 ? x : `${s}${i === l.length - 1 ? ", e " : ", "}${x}`), "")
      : falta("ADVOGADOS"),
    ADVOGADOS_ASSINATURA: advogados.length ? advogados.map((a) => `${nomeAdv(a)}\n${frase(a)}`).join("\n\n") : falta("ASSINATURA"),
    ADVOGADOS_QUALIFICACAO: advogados.length
      ? advogados.map(qualificacaoAdv).reduce((s, x, i, l) => (i === 0 ? x : `${s}${i === l.length - 1 ? ", e " : ", "}${x}`), "")
      : falta("ADVOGADOS"),
    ENDERECAMENTO: e.enderecamento.trim(),
    CIDADE_DATA: e.cidadeData.trim(),
    ESCRITORIO_NOME: d.escritorio.razaoSocial?.trim() || d.escritorio.nome,
    ESCRITORIO_ENDERECO: enderecoDoEscritorioNoDocumento(d.escritorio),
  };
  const origem: Record<string, OrigemValor> = {};
  for (const c of CAMPOS_PETICAO) origem[c.campo] = c.origem === "formulario" ? "formulario" : "cadastro";
  if (e.numero?.replace(/\D/g, "")) origem.NUMERO_PROCESSO = "formulario";
  if (e.parteContrariaQualificacao !== undefined && e.parteContrariaQualificacao !== d.caso.parteContrariaQualificacao) origem.PARTE_CONTRARIA_QUALIFICACAO = "formulario";
  return { valores, origem, marcados, marcadosAdvogados };
}

/** Os marcados que o modelo de fato usa (o que falta, mas o modelo não pede, não conta). */
export function marcadosDoModelo(v: ValoresPeticao, campos: readonly string[]): string[] {
  const usa = (c: string) => campos.includes(c);
  const deCliente = usa("PARTES_QUALIFICACAO") || usa("CLIENTE_QUALIFICACAO") || usa("CLIENTE_RG") || usa("CLIENTE_CPF") || usa("CLIENTE_ENDERECO");
  const deAdvogado = new Set(v.marcadosAdvogados ?? []);
  return v.marcados.filter((m) => {
    if (deAdvogado.has(m)) return usa("ADVOGADOS_QUALIFICACAO");
    return m === "Número do processo" ? usa("NUMERO_PROCESSO") : deCliente;
  });
}

// ------------------------------------------------------------------------------- prévia

export type TipoSegmento = "fixo" | "cadastro" | "formulario" | "falta" | "desconhecido";
export interface Segmento {
  t: TipoSegmento;
  texto: string;
}
export type ParagrafoPrevia = Segmento[];

function dividirFaltas(texto: string, origem: OrigemValor): Segmento[] {
  const out: Segmento[] = [];
  let pos = 0;
  for (const m of texto.matchAll(MARCA_FALTA)) {
    if (m.index! > pos) out.push({ t: origem, texto: texto.slice(pos, m.index) });
    out.push({ t: "falta", texto: m[0] });
    pos = m.index! + m[0].length;
  }
  if (pos < texto.length) out.push({ t: origem, texto: texto.slice(pos) });
  return out;
}

/** A prévia por parágrafo, com as marcas de origem de cada trecho (decisão 10). */
export function montarPrevia(paragrafos: readonly string[], v: ValoresPeticao): ParagrafoPrevia[] {
  return paragrafos.map((p) => {
    const out: Segmento[] = [];
    let pos = 0;
    for (const m of p.matchAll(CAMPO_DOCX)) {
      if (m.index! > pos) out.push({ t: "fixo", texto: p.slice(pos, m.index) });
      const campo = m[1]!;
      if (Object.hasOwn(v.valores, campo)) out.push(...dividirFaltas(v.valores[campo]!, v.origem[campo] ?? "cadastro"));
      else out.push({ t: "desconhecido", texto: m[0] });
      pos = m.index! + m[0].length;
    }
    if (pos < p.length) out.push({ t: "fixo", texto: p.slice(pos) });
    return juntarIguais(out);
  });
}

/** A prévia de um texto já pronto (o .docx editado): só as marcas "falta" aparecem (decisão 24). */
export function previaDeTexto(paragrafos: readonly string[]): ParagrafoPrevia[] {
  return paragrafos.map((p) => juntarIguais(dividirFaltas(p, "cadastro").map((s) => (s.t === "falta" ? s : { t: "fixo" as const, texto: s.texto }))));
}

function juntarIguais(s: Segmento[]): Segmento[] {
  const out: Segmento[] = [];
  for (const x of s) {
    if (!x.texto) continue;
    const u = out.at(-1);
    if (u && u.t === x.t) u.texto += x.texto;
    else out.push({ ...x });
  }
  return out;
}

/** O texto corrido do parágrafo (para citar o trecho no comentário, até 160 caracteres). */
export function textoDoParagrafo(p: ParagrafoPrevia): string {
  return p.map((s) => s.texto).join("");
}

/** Nome do arquivo: "recurso-ordinario-pereira-x-mercado-bom-preco.docx". */
export function nomeArquivoPeticao(modelo: string, caso: string, versao = 1): string {
  const slug = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const base = `${slug(modelo)}-${slug(caso)}`.slice(0, 120).replace(/-$/, "") || "peticao";
  return `${base}${versao > 1 ? `-v${versao}` : ""}.docx`;
}

// ------------------------------------------------------------------------------- pedidos

const uuid = z.string().uuid();
const opcionalTexto = (max: number) => z.string().max(max).nullish();

export const modeloEscolhidoSchema = z.object({
  padrao: z.string().max(40).nullish(),
  modeloId: uuid.nullish(),
});

export const escolhasPeticaoSchema = z.object({
  modelo: modeloEscolhidoSchema,
  partes: z.array(uuid).max(30),
  advogados: z.array(z.object({ pessoaId: uuid, inscricoes: z.array(uuid).max(10) })).max(15),
  enderecamento: z.string().max(400),
  numero: opcionalTexto(40),
  gravarNumero: z.boolean().nullish(),
  valorCausa: z.number().int().min(1).max(100000000000000).nullish(),
  parteContrariaQualificacao: opcionalTexto(400),
  cidadeData: z.string().max(120),
});
export type PedidoPeticao = z.input<typeof escolhasPeticaoSchema>;

export const gerarPeticaoSchema = escolhasPeticaoSchema.extend({
  /** Para quem passa pela revisão: enviar agora ou guardar como rascunho (decisão 18). */
  enviar: z.boolean().nullish(),
  recado: opcionalTexto(1000),
});
export type GerarPeticao = z.input<typeof gerarPeticaoSchema>;

export const enviarRevisaoSchema = z.object({ recado: opcionalTexto(1000) });

export const DECISOES_REVISAO = ["APROVAR", "AJUSTE", "REPROVAR"] as const;
export type DecisaoRevisao = (typeof DECISOES_REVISAO)[number];
export const decisaoRevisaoSchema = z.object({
  decisao: z.enum(DECISOES_REVISAO),
  comentario: opcionalTexto(2000),
  versao: z.number().int().min(1),
});
export type PedidoDecisao = z.input<typeof decisaoRevisaoSchema>;

export const comentarioPeticaoSchema = z.object({
  paragrafo: z.number().int().min(1).max(5000).nullish(),
  texto: opcionalTexto(2000),
});
export const passarRevisaoSchema = z.object({ pessoaId: uuid, motivo: opcionalTexto(300) });

/** Nova versão refeita pelos dados (decisão 23); o .docx editado vai como arquivo. */
export const novaVersaoDadosSchema = escolhasPeticaoSchema.omit({ modelo: true }).extend({
  resolvidos: z.array(uuid).max(200).default([]),
  recado: opcionalTexto(1000),
});

export const enviarModeloSchema = z.object({
  nome: z.string().trim().min(3).max(120),
  tipo: z.enum(Object.keys(TIPOS_PECA) as [TipoPeca, ...TipoPeca[]]),
  area: z.enum([...Object.keys(AREAS_DIREITO), "QUALQUER"] as unknown as [AreaModelo, ...AreaModelo[]]),
  /** O modelo padrão que este substitui (código), quando há. */
  substitui: z.string().max(40).nullish(),
});
export type EnviarModelo = z.input<typeof enviarModeloSchema>;
export const arquivarModeloSchema = z.object({ motivo: z.string().trim().min(3).max(300), versao: z.number().int().min(1) });

export const filtroPeticoesSchema = z.object({
  q: z.string().max(100).nullish(),
  modelo: z.string().max(60).nullish(),
  visao: z.enum(["TODAS", "MINHAS", "REVISAR"]).nullish(),
  caso: uuid.nullish(),
});

// ------------------------------------------------------------------------------- respostas

export const SITUACOES_PETICAO = {
  RASCUNHO: "Rascunho",
  REVISAO: "Em revisão",
  AJUSTE: "Ajuste pedido",
  APROVADA: "Aprovada",
  REPROVADA: "Reprovada",
} as const;
export type SituacaoPeticao = keyof typeof SITUACOES_PETICAO;

export interface ModeloPeticao {
  /** O id do modelo do escritório, ou o código do padrão. */
  id: string;
  padrao: boolean;
  nome: string;
  tipo: TipoPeca;
  area: AreaModelo;
  /** O padrão que este substitui. */
  substitui: string | null;
  versao: number;
  versaoId: string | null;
  campos: string[];
  desconhecidos: string[];
  enviadoPor: PessoaRef | null;
  atualizadoEm: string;
  usos: number;
  linhaVersao: number;
}

export interface ListaModelos {
  modelos: ModeloPeticao[];
  campos: CampoPeticao[];
  podeEnviar: boolean;
}

export interface ConferenciaModelo {
  campos: string[];
  desconhecidos: { campo: string; sugestao: string | null }[];
  semCampos: boolean;
  paragrafos: number;
}

export interface LinhaPeticao {
  id: string;
  modelo: string;
  arquivo: string;
  caso: { id: string; nome: string };
  geradoPor: PessoaRef;
  geradoEm: string;
  marcados: number;
  situacao: SituacaoPeticao;
  revisor: PessoaRef | null;
  versao: number;
  /** A pessoa da sessão é quem revisa agora. */
  paraMim: boolean;
}

export interface ListaPeticoes {
  peticoes: LinhaPeticao[];
  paraRevisar: number;
  modelos: { id: string; nome: string }[];
}

export interface PreviaPeticao {
  paragrafos: ParagrafoPrevia[];
  resto: string;
  campos: { total: number; cadastro: number; formulario: number; preenchidos: number };
  marcados: string[];
  desconhecidos: string[];
  revisor: PessoaRef | null;
  semRevisao: "RESPONSAVEL" | "SOCIO_DONO" | null;
}

export interface VersaoPeticao {
  id: string;
  numero: number;
  origem: "DADOS" | "DOCX_EDITADO";
  arquivo: string;
  marcados: string[];
  enviadaPor: PessoaRef;
  enviadaEm: string;
  recado: string | null;
  decisao: { tipo: "APROVADA" | "AJUSTE" | "REPROVADA" | "PASSADA"; por: PessoaRef; em: string; motivo: string | null } | null;
}

export interface ComentarioPeticao {
  id: string;
  versao: number;
  autor: PessoaRef;
  paragrafo: number | null;
  trecho: string | null;
  texto: string;
  criadoEm: string;
  enviado: boolean;
  resolvidoEm: string | null;
  resolvidoNaVersao: number | null;
}

export interface EventoPeticao {
  tipo: "GERADA" | "ENVIADA" | "APROVADA" | "AJUSTE" | "REPROVADA" | "PASSADA" | "VERSAO";
  por: PessoaRef;
  para: PessoaRef | null;
  texto: string | null;
  versao: number;
  em: string;
}

export interface FichaPeticao {
  id: string;
  modelo: { id: string; nome: string; padrao: boolean; versao: number | null };
  arquivo: string;
  caso: { id: string; nome: string; numero: string | null; prazo: { data: string; descricao: string } | null; responsavel: PessoaRef };
  situacao: SituacaoPeticao;
  versaoAtual: number;
  versao: number;
  geradoPor: PessoaRef;
  geradoEm: string;
  revisor: PessoaRef | null;
  aprovadaEm: string | null;
  aprovadaPor: PessoaRef | null;
  documentoId: string | null;
  dados: {
    partes: { id: string; nome: string }[];
    advogados: { pessoaId: string; nome: string; frase: string }[];
    enderecamento: string;
    cidadeData: string;
    numero: string | null;
    valorCausa: number | null;
  };
  previa: ParagrafoPrevia[];
  /** A prévia de um .docx editado não traz as marcas de origem (decisão 24). */
  previaEditada: boolean;
  resto: string;
  versoes: VersaoPeticao[];
  comentarios: ComentarioPeticao[];
  eventos: EventoPeticao[];
  pode: { revisar: boolean; novaVersao: boolean; enviar: boolean; passar: boolean };
}

export interface ResultadoGerar {
  id: string;
  situacao: SituacaoPeticao;
  arquivo: string;
  marcados: string[];
  revisor: PessoaRef | null;
  versao: number;
}

export interface RevisorPossivel extends PessoaRef {
  frase: string;
}

export type { TipoOab, UfBrasil };
