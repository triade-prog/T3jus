// Procurações e modelos (CH-08, F3.16), tela aprovada em docs/design/aprovadas/portal-procuracoes
// (Carol, 21/11/2026). Não há IA: é preenchimento de modelo, como as petições (peticoes.ts). O
// texto é o do escritório (ou o padrão do T3jus); o T3jus só troca os campos entre colchetes pelos
// dados do cliente, do contrato e dos advogados outorgados. Aqui ficam:
// - os campos aceitos, com os mesmos nomes das petições quando o dado é o mesmo;
// - os modelos padrão (contrato, procuração e a declaração de hipossuficiência em duas versões,
//   pessoa física e pessoa jurídica), em código, com o selo "em revisão" (pergunta 3 da Carol);
// - a montagem dos valores, com o que falta marcado ("[RG: falta]", decisão 13);
// - a conferência do modelo enviado (campos desconhecidos com sugestão e os esperados que faltam);
// - os esquemas dos pedidos e os tipos das respostas da API.
// As regras de quem pode, do que bloqueia e das versões ficam no banco (0680_documentos_contrato.sql).

import { z } from "zod";
import type { PessoaRef } from "./clientes.ts";
import { ESTADOS_CIVIS, formatarDocumento, type EstadoCivil } from "./clientes.ts";
import { CAMPO_DOCX, type ParagrafoDocx } from "./docx.ts";
import { dataBr, dividirParcelas, percentual, reais, resumoParcelas, somarMeses, type Condicao } from "./honorarios.ts";
import { formatarCnj } from "./juridico.ts";
import { cidadeDataPadrao, enderecoDoCliente, NOMES_CAMPOS, rgDoCliente, valorPorExtenso, type ParagrafoPrevia, montarPrevia } from "./peticoes.ts";
import { fraseOab, type InscricaoOab } from "./portal.ts";
import type { MarcaNoDocumento } from "./logo.ts";

// ------------------------------------------------------------------------------- tipos

export const DOCUMENTOS_CONTRATO = {
  CONTRATO: "Contrato de honorários",
  PROCURACAO: "Procuração",
  HIPOSSUFICIENCIA: "Declaração de hipossuficiência",
  OUTRO: "Outro documento",
} as const;
export type TipoDocumentoContrato = keyof typeof DOCUMENTOS_CONTRATO;
export const TIPOS_DOCUMENTO_CONTRATO = Object.keys(DOCUMENTOS_CONTRATO) as TipoDocumentoContrato[];

/** O que cada documento leva (decisão 9, caixa de cada documento). */
export const O_QUE_LEVA: Record<TipoDocumentoContrato, string> = {
  CONTRATO: "As condições de honorário, o objeto e os casos do contrato.",
  PROCURACAO: "Os advogados outorgados, com as inscrições, e os poderes especiais.",
  HIPOSSUFICIENCIA: "A qualificação do cliente, para o pedido de gratuidade da justiça.",
  OUTRO: "Os mesmos campos, no texto do modelo do escritório.",
};

/** Os modelos padrão do T3jus: a declaração tem a versão de pessoa física e a de pessoa jurídica. */
export const PADROES_DOCUMENTO = ["CONTRATO", "PROCURACAO", "HIPOSSUFICIENCIA_PF", "HIPOSSUFICIENCIA_PJ"] as const;
export type PadraoDocumento = (typeof PADROES_DOCUMENTO)[number];

/** O padrão que vale para o tipo e o cliente (o T3jus escolhe pelo tipo do cliente, decisão 5). */
export function padraoDoTipo(tipo: Exclude<TipoDocumentoContrato, "OUTRO">, cliente: "PF" | "PJ"): PadraoDocumento {
  return tipo === "HIPOSSUFICIENCIA" ? (cliente === "PJ" ? "HIPOSSUFICIENCIA_PJ" : "HIPOSSUFICIENCIA_PF") : tipo;
}

// ------------------------------------------------------------------------------- campos

export type GrupoCampoDocumento = "Cliente" | "Contrato e honorários" | "Advogados e poderes" | "Escritório e data";

export interface CampoDocumento {
  campo: string;
  grupo: GrupoCampoDocumento;
  descricao: string;
  origem: "cadastro" | "formulario";
}

export const CAMPOS_DOCUMENTO: readonly CampoDocumento[] = [
  { campo: "CLIENTE_NOME", grupo: "Cliente", descricao: "Nome do cliente do contrato, em maiúsculas", origem: "cadastro" },
  { campo: "CLIENTE_QUALIFICACAO", grupo: "Cliente", descricao: "Nacionalidade, estado civil, profissão, RG, CPF e endereço; na empresa, CNPJ, sede e quem a representa", origem: "cadastro" },
  { campo: "CLIENTE_CPF", grupo: "Cliente", descricao: "CPF (ou CNPJ) do cliente", origem: "cadastro" },
  { campo: "CLIENTE_RG", grupo: "Cliente", descricao: "RG do cliente, com o órgão", origem: "cadastro" },
  { campo: "CLIENTE_ENDERECO", grupo: "Cliente", descricao: "Endereço completo do cliente", origem: "cadastro" },
  { campo: "REPRESENTANTE_NOME", grupo: "Cliente", descricao: "Quem assina pela empresa, em maiúsculas", origem: "cadastro" },
  { campo: "REPRESENTANTE_QUALIFICACAO", grupo: "Cliente", descricao: "Cargo, estado civil, profissão e CPF de quem assina pela empresa", origem: "cadastro" },
  { campo: "CLIENTE_ASSINATURA", grupo: "Cliente", descricao: "O bloco de assinatura do cliente, com quem o representa quando houver", origem: "cadastro" },
  { campo: "CONTRATO_NUMERO", grupo: "Contrato e honorários", descricao: "Número do contrato: “C-2026-033”", origem: "cadastro" },
  { campo: "CONTRATO_OBJETO", grupo: "Contrato e honorários", descricao: "O objeto do contrato, como está na ficha", origem: "cadastro" },
  { campo: "CONTRATO_CASOS", grupo: "Contrato e honorários", descricao: "Os casos ligados ao contrato, com o número do processo quando houver", origem: "cadastro" },
  { campo: "HONORARIOS_CONDICOES", grupo: "Contrato e honorários", descricao: "Cada condição de honorário numa alínea, com o valor em reais e por extenso", origem: "cadastro" },
  { campo: "ADVOGADOS_OAB", grupo: "Advogados e poderes", descricao: "Nome e inscrições dos outorgados: “MARINA RIBEIRO, OAB/SP nº 214.538, e …”", origem: "cadastro" },
  { campo: "ADVOGADOS_ASSINATURA", grupo: "Advogados e poderes", descricao: "O bloco de assinatura, uma linha por advogado outorgado", origem: "cadastro" },
  { campo: "PODERES_ESPECIAIS", grupo: "Advogados e poderes", descricao: "“, com os poderes especiais para …”; sem poder marcado, sai vazio", origem: "formulario" },
  { campo: "ESCRITORIO_NOME", grupo: "Escritório e data", descricao: "Nome do escritório, de Escritório no Portal", origem: "cadastro" },
  { campo: "ESCRITORIO_CNPJ", grupo: "Escritório e data", descricao: "CNPJ do escritório", origem: "cadastro" },
  { campo: "ESCRITORIO_OAB", grupo: "Escritório e data", descricao: "Registro da sociedade na OAB: “OAB/SP 31.874”", origem: "cadastro" },
  { campo: "ESCRITORIO_ENDERECO", grupo: "Escritório e data", descricao: "Endereço do escritório, de Escritório no Portal", origem: "cadastro" },
  { campo: "CIDADE_DATA", grupo: "Escritório e data", descricao: "“São Paulo, 21 de novembro de 2026”", origem: "formulario" },
];
export const NOMES_CAMPOS_DOCUMENTO = CAMPOS_DOCUMENTO.map((c) => c.campo);

export function campoConhecidoDocumento(campo: string): boolean {
  return NOMES_CAMPOS_DOCUMENTO.includes(campo);
}

/** O campo é das petições e não se usa nestes modelos (a dica da conferência). */
export function campoDePeticao(campo: string): boolean {
  return !campoConhecidoDocumento(campo) && NOMES_CAMPOS.includes(campo);
}

/** Para o campo que o T3jus não conhece, o mais parecido da lista (decisão 6). */
export function sugestaoCampoDocumento(campo: string): string | null {
  if (campoDePeticao(campo)) return null;
  const c = campo.toUpperCase();
  const regras: [RegExp, string][] = [
    [/REPRESENTANTE.*QUALIF|QUALIF.*REPRESENTANTE/, "REPRESENTANTE_QUALIFICACAO"],
    [/REPRESENTANTE|SOCIO_ADMIN|ADMINISTRADOR/, "REPRESENTANTE_NOME"],
    [/QUALIFICA/, "CLIENTE_QUALIFICACAO"],
    [/PODER/, "PODERES_ESPECIAIS"],
    [/HONORARIO|CONDICO|PAGAMENTO|VALOR|PARCELA/, "HONORARIOS_CONDICOES"],
    [/OBJETO|SERVICO/, "CONTRATO_OBJETO"],
    [/CASO|PROCESSO|AUTOS/, "CONTRATO_CASOS"],
    [/CONTRATO|NUMERO/, "CONTRATO_NUMERO"],
    [/ESCRITORIO.*CNPJ|CNPJ.*ESCRITORIO|SOCIEDADE.*CNPJ/, "ESCRITORIO_CNPJ"],
    [/ESCRITORIO.*OAB|SOCIEDADE/, "ESCRITORIO_OAB"],
    [/ESCRITORIO.*ENDERECO|SEDE/, "ESCRITORIO_ENDERECO"],
    [/ESCRITORIO|CONTRATAD/, "ESCRITORIO_NOME"],
    [/ASSINATURA.*CLIENTE|CLIENTE.*ASSINA|OUTORGANTE.*ASSINA|CONTRATANTE.*ASSINA/, "CLIENTE_ASSINATURA"],
    [/ASSINA/, "ADVOGADOS_ASSINATURA"],
    [/OAB|ADVOGAD|PROCURADOR|OUTORGADO/, "ADVOGADOS_OAB"],
    [/CPF|DOCUMENTO/, "CLIENTE_CPF"],
    [/RG|IDENTIDADE/, "CLIENTE_RG"],
    [/ENDERECO|RESIDENCIA/, "CLIENTE_ENDERECO"],
    [/DATA|LOCAL|CIDADE/, "CIDADE_DATA"],
    [/CLIENTE|OUTORGANTE|CONTRATANTE|DECLARANTE|NOME/, "CLIENTE_NOME"],
  ];
  for (const [r, s] of regras) if (r.test(c)) return s;
  return null;
}

/** O campo que aquele documento costuma ter, para o aviso da conferência (decisão 6). */
export const CAMPO_ESPERADO: Partial<Record<TipoDocumentoContrato, { campo: string; sem: string }>> = {
  PROCURACAO: { campo: "PODERES_ESPECIAIS", sem: "os poderes especiais marcados na hora de gerar não entram" },
  CONTRATO: { campo: "HONORARIOS_CONDICOES", sem: "as condições de honorário do contrato não entram" },
};

export interface ConferenciaModeloDocumento {
  campos: string[];
  desconhecidos: { campo: string; sugestao: string | null; peticao: boolean }[];
  /** O campo que o documento costuma ter e o modelo não tem (não bloqueia). */
  faltaEsperado: { campo: string; sem: string } | null;
  semCampos: boolean;
  paragrafos: number;
}

export function conferenciaModeloDocumento(tipo: TipoDocumentoContrato, campos: string[], paragrafos: number): ConferenciaModeloDocumento {
  const esperado = CAMPO_ESPERADO[tipo];
  return {
    campos,
    desconhecidos: campos.filter((x) => !campoConhecidoDocumento(x)).map((campo) => ({ campo, sugestao: sugestaoCampoDocumento(campo), peticao: campoDePeticao(campo) })),
    faltaEsperado: esperado && !campos.includes(esperado.campo) ? esperado : null,
    semCampos: !campos.some(campoConhecidoDocumento),
    paragrafos,
  };
}

// ------------------------------------------------------------------------------- poderes

/** Os poderes especiais do art. 105 do CPC (decisão 11), na ordem da tela. */
export const PODERES_ESPECIAIS = {
  RECEBER_QUITAR: "receber e dar quitação",
  ACORDO: "firmar acordo",
  SUBSTABELECER: "substabelecer, com ou sem reserva de poderes",
  DESISTIR: "desistir",
  RENUNCIAR: "renunciar ao direito sobre o qual se funda a ação",
  RECONHECER: "reconhecer a procedência do pedido",
  CITACAO: "receber citação",
  CONFESSAR: "confessar",
  COMPROMISSO: "firmar compromisso",
  HIPOSSUFICIENCIA: "assinar declaração de hipossuficiência econômica",
} as const;
export type PoderEspecial = keyof typeof PODERES_ESPECIAIS;
export const CODIGOS_PODERES = Object.keys(PODERES_ESPECIAIS) as PoderEspecial[];

function juntarComE(itens: readonly string[]): string {
  if (itens.length <= 1) return itens[0] ?? "";
  return `${itens.slice(0, -1).join(", ")} e ${itens.at(-1)}`;
}

/** ", com os poderes especiais para receber e dar quitação e firmar acordo"; sem poder, vazio. */
export function trechoPoderes(poderes: readonly PoderEspecial[], outro?: string | null): string {
  const lista = CODIGOS_PODERES.filter((p) => poderes.includes(p)).map((p) => PODERES_ESPECIAIS[p] as string);
  const o = outro?.trim().replace(/[.;]+$/, "");
  if (o) lista.push(o);
  return lista.length ? `, com os poderes especiais para ${juntarComE(lista)}` : "";
}

// ------------------------------------------------------------------------------- modelos padrão

export interface ModeloPadraoDocumento {
  codigo: PadraoDocumento;
  tipo: Exclude<TipoDocumentoContrato, "OUTRO">;
  nome: string;
  atualizadoEm: string;
  /** Pergunta 3 da Carol: o texto padrão passa pela advogada parceira antes de valer como pronto. */
  emRevisao: boolean;
  paragrafos: readonly ParagrafoDocx[];
}

const ASSINA_CLIENTE: ParagrafoDocx = { texto: "[CLIENTE_ASSINATURA]", estilo: "assinatura" };

export const MODELOS_PADRAO_DOCUMENTO: readonly ModeloPadraoDocumento[] = [
  {
    codigo: "CONTRATO", tipo: "CONTRATO", nome: "Contrato de honorários", atualizadoEm: "2026-11-21", emRevisao: true,
    paragrafos: [
      { texto: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS E DE HONORÁRIOS", estilo: "titulo" },
      { texto: "Contrato nº [CONTRATO_NUMERO]", estilo: "direita" },
      { texto: "CONTRATANTE: [CLIENTE_NOME], [CLIENTE_QUALIFICACAO]." },
      { texto: "CONTRATADA: [ESCRITORIO_NOME], inscrita no CNPJ sob o nº [ESCRITORIO_CNPJ] e registrada na [ESCRITORIO_OAB], com sede em [ESCRITORIO_ENDERECO], por seus advogados, [ADVOGADOS_OAB]." },
      { texto: "As partes acima têm entre si justo e contratado o seguinte." },
      { texto: "CLÁUSULA 1ª · DO OBJETO", estilo: "titulo" },
      { texto: "A CONTRATADA prestará ao CONTRATANTE os serviços de advocacia para: [CONTRATO_OBJETO]. Casos ligados a este contrato: [CONTRATO_CASOS]." },
      { texto: "CLÁUSULA 2ª · DAS OBRIGAÇÕES", estilo: "titulo" },
      { texto: "A CONTRATADA empregará zelo e diligência na defesa dos interesses do CONTRATANTE e o manterá informado do andamento. O CONTRATANTE fornecerá, com veracidade, os documentos e as informações necessários e pagará os honorários combinados." },
      { texto: "CLÁUSULA 3ª · DOS HONORÁRIOS", estilo: "titulo" },
      { texto: "Pelos serviços, o CONTRATANTE pagará à CONTRATADA:" },
      { texto: "[HONORARIOS_CONDICOES]" },
      { texto: "Parágrafo único. Custas, despesas do processo, perícias e deslocamentos não estão incluídos nos honorários e correm por conta do CONTRATANTE. Os honorários de sucumbência pertencem aos advogados, salvo se escrito acima (Lei nº 8.906/1994, art. 23)." },
      { texto: "CLÁUSULA 4ª · DO ATRASO", estilo: "titulo" },
      { texto: "O atraso no pagamento sujeita o valor devido a multa de 2% (dois por cento) e juros de 1% (um por cento) ao mês, com correção monetária." },
      { texto: "CLÁUSULA 5ª · DO FIM DO CONTRATO", estilo: "titulo" },
      { texto: "Qualquer das partes pode encerrar este contrato por escrito. Os honorários dos serviços já prestados continuam devidos, na proporção do trabalho feito." },
      { texto: "CLÁUSULA 6ª · DO FORO", estilo: "titulo" },
      { texto: "Fica eleito o foro do domicílio do CONTRATANTE para resolver qualquer questão deste contrato." },
      { texto: "E, por estarem de acordo, as partes assinam este contrato em duas vias de igual teor." },
      { texto: "[CIDADE_DATA].", estilo: "direita" },
      ASSINA_CLIENTE,
      { texto: "[ADVOGADOS_ASSINATURA]", estilo: "assinatura" },
    ],
  },
  {
    codigo: "PROCURACAO", tipo: "PROCURACAO", nome: "Procuração", atualizadoEm: "2026-11-21", emRevisao: true,
    paragrafos: [
      { texto: "PROCURAÇÃO AD JUDICIA ET EXTRA", estilo: "titulo" },
      { texto: "OUTORGANTE: [CLIENTE_NOME], [CLIENTE_QUALIFICACAO]." },
      { texto: "OUTORGADOS: [ADVOGADOS_OAB], com escritório em [ESCRITORIO_ENDERECO], onde recebem intimações." },
      { texto: "PODERES: pelo presente instrumento, o(a) outorgante nomeia e constitui seus procuradores os outorgados, a quem confere os poderes da cláusula ad judicia et extra para o foro em geral, para propor as ações cabíveis e defendê-lo(a) nas contrárias, em qualquer juízo, instância ou tribunal, até a decisão final, usando os recursos legais e acompanhando-os[PODERES_ESPECIAIS]. Os outorgados podem agir em conjunto ou separadamente." },
      { texto: "FINALIDADE: [CONTRATO_OBJETO]." },
      { texto: "[CIDADE_DATA].", estilo: "direita" },
      ASSINA_CLIENTE,
    ],
  },
  {
    codigo: "HIPOSSUFICIENCIA_PF", tipo: "HIPOSSUFICIENCIA", nome: "Declaração de hipossuficiência (pessoa física)", atualizadoEm: "2026-11-21", emRevisao: true,
    paragrafos: [
      { texto: "DECLARAÇÃO DE HIPOSSUFICIÊNCIA ECONÔMICA", estilo: "titulo" },
      { texto: "[CLIENTE_NOME], [CLIENTE_QUALIFICACAO], declara, para os fins dos arts. 98 e 99 do Código de Processo Civil, que não tem condições de pagar as custas do processo e os honorários de advogado sem prejuízo do próprio sustento e do de sua família, e requer o benefício da gratuidade da justiça." },
      { texto: "Declara, ainda, estar ciente de que a falsidade desta declaração pode sujeitá-lo(a) às sanções civis e penais previstas em lei." },
      { texto: "[CIDADE_DATA].", estilo: "direita" },
      ASSINA_CLIENTE,
    ],
  },
  {
    codigo: "HIPOSSUFICIENCIA_PJ", tipo: "HIPOSSUFICIENCIA", nome: "Declaração de hipossuficiência (pessoa jurídica)", atualizadoEm: "2026-11-21", emRevisao: true,
    paragrafos: [
      { texto: "DECLARAÇÃO DE INSUFICIÊNCIA DE RECURSOS", estilo: "titulo" },
      { texto: "[CLIENTE_NOME], [CLIENTE_QUALIFICACAO], declara, para os fins dos arts. 98 e 99 do Código de Processo Civil, que não tem condições de pagar as custas do processo sem comprometer a continuidade das suas atividades, e requer o benefício da gratuidade da justiça." },
      { texto: "A prova da insuficiência de recursos segue junto a esta declaração (balanços, extratos e declarações fiscais), como pede a Súmula 481 do Superior Tribunal de Justiça." },
      { texto: "[CIDADE_DATA].", estilo: "direita" },
      ASSINA_CLIENTE,
    ],
  },
];

export function modeloPadraoDocumento(codigo: string): ModeloPadraoDocumento | null {
  return MODELOS_PADRAO_DOCUMENTO.find((m) => m.codigo === codigo) ?? null;
}

export function camposDoPadraoDocumento(m: ModeloPadraoDocumento): string[] {
  const achados: string[] = [];
  for (const p of m.paragrafos) for (const x of p.texto.matchAll(CAMPO_DOCX)) if (!achados.includes(x[1]!)) achados.push(x[1]!);
  return achados;
}

// ------------------------------------------------------------------------------- dados

/** O cliente do contrato, com a qualificação do cadastro (AP-01) e quem assina pela empresa. */
export interface ClienteDoDocumento {
  id: string;
  nome: string;
  tipo: "PF" | "PJ";
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
  repDocumento: string | null;
  repEstadoCivil: EstadoCivil | null;
  repProfissao: string | null;
  versao: number;
}

export interface AdvogadoDoDocumento {
  pessoaId: string;
  nome: string;
  /** Está entre os advogados do contrato (vem marcado). */
  noContrato: boolean;
  responsavel: boolean;
  /** Todas as inscrições ativas, a principal primeiro. */
  inscricoes: InscricaoOab[];
  /** As que o contrato guarda (contrato_advogado_oab); para quem não está no contrato, todas. */
  escolhidas: string[];
}

export interface EscritorioDoDocumento {
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  /** "OAB/SP 31.874", o registro da sociedade. */
  oab: string | null;
  /** Para a linha de contato do timbrado. */
  contatos?: { telefone?: string | null; email?: string | null }[];
}

/** O modelo que vale hoje para cada documento: o do escritório (com a versão) ou o padrão. */
export interface ModeloEmUso {
  tipo: TipoDocumentoContrato;
  /** O modelo do escritório; nulo no padrão. */
  modeloId: string | null;
  nome: string;
  /** A versão do modelo do escritório; nulo no padrão. */
  numero: number | null;
  /** O código do padrão; nulo no do escritório. */
  padrao: PadraoDocumento | null;
  emRevisao: boolean;
}

/** O documento mais novo de cada tipo neste contrato, para a caixa vir desmarcada (decisões 9 e 19). */
export interface DocumentoAtual {
  chave: string;
  tipo: TipoDocumentoContrato;
  modeloId: string | null;
  numero: number;
  geradoEm: string;
  assinado: boolean;
}

export interface UltimaGeracao {
  geracaoId: string;
  em: string;
  por: PessoaRef;
  documentos: { tipo: TipoDocumentoContrato; modeloId: string | null }[];
  outorgados: { pessoaId: string; inscricoes: string[] }[];
  poderes: PoderEspecial[];
  outroPoder: string | null;
  cidadeData: string;
}

/** O que mudou no cadastro do cliente desde a última geração (decisão 19). */
export interface MudancaDesde {
  campos: string[];
  por: PessoaRef | null;
  em: string;
}

/** O que a página de gerar mostra (GET …/contratos/:id/documentos-dados). */
export interface DadosDocumentos {
  contrato: { id: string; numero: string; objeto: string; estado: "ELABORACAO" | "ATIVO" | "ENCERRADO"; assinadoEm: string | null; versao: number };
  cliente: ClienteDoDocumento;
  condicoes: Condicao[];
  casos: { id: string; nome: string; numero: string | null }[];
  advogados: AdvogadoDoDocumento[];
  /** Quem está na equipe e fica de fora por não ter OAB (decisão 10). */
  semOab: PessoaRef[];
  escritorio: EscritorioDoDocumento;
  /** O logo do timbrado dos modelos padrão; nulo quando é o nome em letra. */
  marca: MarcaNoDocumento | null;
  hoje: string;
  modelos: ModeloEmUso[];
  atuais: DocumentoAtual[];
  ultima: UltimaGeracao | null;
  mudancas: MudancaDesde[];
  /** A marcação inicial dos poderes: a da última geração do escritório (decisão 11). */
  poderesIniciais: PoderEspecial[];
}

// ------------------------------------------------------------------------------- valores

function falta(o_que: string): string {
  return `[${o_que}: falta]`;
}

function estadoCivil(e: EstadoCivil | null): string | null {
  return e ? ESTADOS_CIVIS[e].toLowerCase() : null;
}

/** A qualificação de quem assina pela empresa: cargo, estado civil, profissão e CPF. */
export function qualificacaoDoRepresentante(c: ClienteDoDocumento): string {
  if (c.tipo !== "PJ") return "";
  const partes = [
    c.repCargo?.trim().toLowerCase() || falta("CARGO"),
    estadoCivil(c.repEstadoCivil),
    c.repProfissao?.trim().toLowerCase(),
    `inscrito(a) no CPF sob o nº ${c.repDocumento ? formatarDocumento(c.repDocumento) : falta("CPF DO REPRESENTANTE")}`,
  ].filter((x): x is string => !!x);
  return partes.join(", ");
}

/** A qualificação do cliente no documento (AP-01), com quem representa a empresa (decisão 14). */
export function qualificacaoNoDocumento(c: ClienteDoDocumento): string {
  if (c.tipo === "PJ") {
    const cnpj = c.documento ? formatarDocumento(c.documento) : falta("CNPJ");
    const rep = c.repNome?.trim()
      ? `, neste ato representada por ${c.repNome.trim().toUpperCase()}, ${qualificacaoDoRepresentante(c)}`
      : `, neste ato representada por ${falta("REPRESENTANTE")}`;
    return `pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${cnpj}, com sede na ${enderecoDoCliente(c)}${rep}`;
  }
  return [
    c.nacionalidade?.trim().toLowerCase() || falta("NACIONALIDADE"),
    estadoCivil(c.estadoCivil) ?? falta("ESTADO CIVIL"),
    c.profissao?.trim().toLowerCase() || falta("PROFISSÃO"),
    `portador(a) do RG nº ${rgDoCliente(c)}`,
    `inscrito(a) no CPF sob o nº ${c.documento ? formatarDocumento(c.documento) : falta("CPF")}`,
    `residente na ${enderecoDoCliente(c)}`,
  ].join(", ");
}

/** O que falta no cadastro, para o aviso no alto ("Falta 1 dado de Benedito: o RG"). */
export function faltasNoDocumento(c: ClienteDoDocumento): string[] {
  const f: string[] = [];
  if (c.tipo === "PJ") {
    if (!c.documento) f.push("o CNPJ");
    if (!c.endereco?.trim()) f.push("o endereço");
    if (!c.repNome?.trim()) f.push("quem assina pela empresa");
    else {
      if (!c.repCargo?.trim()) f.push("o cargo de quem assina");
      if (!c.repDocumento) f.push("o CPF de quem assina");
    }
    return f;
  }
  if (!c.nacionalidade?.trim()) f.push("a nacionalidade");
  if (!c.estadoCivil) f.push("o estado civil");
  if (!c.profissao?.trim()) f.push("a profissão");
  if (!c.rg?.trim()) f.push("o RG");
  if (!c.documento) f.push("o CPF");
  if (!c.endereco?.trim()) f.push("o endereço");
  return f;
}

/** Uma condição de honorário numa alínea, com o valor por extenso (decisão 12). */
export function condicaoNoDocumento(c: Condicao): string {
  const v = (x: number) => `${reais(x)} (${valorPorExtenso(x)})`;
  switch (c.tipo) {
    case "FIXO":
      return `honorários fixos de ${v(c.valor)}, com vencimento em ${dataBr(c.vencimento)}`;
    case "PARCELADO": {
      if (c.parcelas === 1) return `honorários de ${v(c.total)}, em parcela única, com vencimento em ${dataBr(c.primeiro)}`;
      const ps = dividirParcelas(c.total, c.parcelas);
      const iguais = new Set(ps).size === 1;
      const como = iguais ? `em ${c.parcelas} parcelas mensais de ${v(ps[0]!)}` : `em ${c.parcelas} parcelas mensais (${resumoParcelas(c.total, c.parcelas)})`;
      return `honorários de ${v(c.total)}, ${como}, a primeira em ${dataBr(c.primeiro)} e a última em ${dataBr(somarMeses(c.primeiro, c.parcelas - 1))}`;
    }
    case "MENSAL":
      return `honorários mensais de ${v(c.valor)}, todo dia ${Number(c.primeiro.slice(8, 10))}, a partir de ${dataBr(c.primeiro)}, ${c.meses ? `por ${c.meses} ${c.meses === 1 ? "mês" : "meses"}` : "enquanto durar o contrato"}${c.reajuste ? `, com reajuste ${c.reajuste}` : ""}`;
    case "EXITO":
      return `honorários de êxito de ${percentual(c.percentual)} sobre ${c.sobre.trim()}, devidos quando o caso chegar à etapa “${c.etapa}”, com vencimento ${c.dias} ${c.dias === 1 ? "dia" : "dias"} depois`;
    case "SUCUMBENCIA":
      return c.quem === "ESCRITORIO"
        ? "os honorários de sucumbência pertencem inteiramente à CONTRATADA"
        : `os honorários de sucumbência se dividem: ${percentual(c.percentualEscritorio ?? 0)} para a CONTRATADA e o restante para o CONTRATANTE`;
    case "ATO":
      return `honorários por ato: ${juntarComE(c.atos.map((a) => `${v(a.valor)} por ${a.nome.trim().toLowerCase()}`))}, devidos quando o ato for feito`;
    case "RECORRENTE":
      return `honorários de ${percentual(c.percentual)} sobre ${c.sobre.trim()}, todo dia ${c.dia}, por ${c.meses} ${c.meses === 1 ? "mês" : "meses"}${c.etapa ? `, a partir da etapa “${c.etapa}”` : c.primeiro ? `, a partir de ${dataBr(c.primeiro)}` : ""}`;
  }
}

/** As condições em alíneas: "a) …;\nb) …." */
export function condicoesNoDocumento(cs: readonly Condicao[]): string {
  if (!cs.length) return falta("HONORÁRIOS");
  const letras = "abcdefghijklmnopqrstuvwxyz";
  return cs.map((c, i) => `${letras[i] ?? String(i + 1)}) ${condicaoNoDocumento(c)}${i === cs.length - 1 ? "." : ";"}`).join("\n");
}

/** "Benedito x INSS (processo nº 5001234-…)"; sem caso, "nenhum ainda". */
export function casosNoDocumento(casos: DadosDocumentos["casos"]): string {
  if (!casos.length) return "nenhum ainda";
  return juntarComE(casos.map((c) => (c.numero ? `${c.nome} (processo nº ${formatarCnj(c.numero)})` : c.nome)));
}

export interface OutorgadoEscolhido {
  pessoaId: string;
  inscricoes: string[];
}

/** O que a pessoa escolhe na página de gerar (decisão 7). */
export interface EscolhasDocumentos {
  documentos: { tipo: TipoDocumentoContrato; modeloId?: string | null }[];
  outorgados: OutorgadoEscolhido[];
  poderes: PoderEspecial[];
  outroPoder?: string | null;
  cidadeData: string;
}

export interface ValoresDocumento {
  valores: Record<string, string>;
  origem: Record<string, "cadastro" | "formulario">;
  /** O que saiu marcado: "RG de Benedito Souza Lima". */
  marcados: string[];
}

function inicialMaiuscula(s: string): string {
  const t = s.replace(/^(o|a|os|as) /, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Os outorgados com as inscrições marcadas, na ordem escolhida (só quem tem OAB). */
export function outorgadosEscolhidos(d: DadosDocumentos, e: Pick<EscolhasDocumentos, "outorgados">): (AdvogadoDoDocumento & { marcadas: InscricaoOab[] })[] {
  return e.outorgados
    .map((o) => {
      const a = d.advogados.find((x) => x.pessoaId === o.pessoaId);
      if (!a) return null;
      return { ...a, marcadas: a.inscricoes.filter((i) => o.inscricoes.includes(i.id)) };
    })
    .filter((a): a is AdvogadoDoDocumento & { marcadas: InscricaoOab[] } => !!a && a.marcadas.length > 0);
}

/** A frase dos outorgados como vai sair (a faixa "No documento:", decisão 10). */
export function fraseOutorgados(lista: ReturnType<typeof outorgadosEscolhidos>): string {
  if (!lista.length) return "";
  return lista.map((a) => `${a.nome.toUpperCase()}, ${fraseOab(a.marcadas)}`)
    .reduce((s, x, i, l) => (i === 0 ? x : `${s}${i === l.length - 1 ? ", e " : ", "}${x}`), "");
}

/** Os valores de cada campo, com a origem e o que saiu marcado (decisões 12 a 14). */
export function montarValoresDocumento(d: DadosDocumentos, e: EscolhasDocumentos): ValoresDocumento {
  const c = d.cliente;
  const outorgados = outorgadosEscolhidos(d, e);
  const marcados = faltasNoDocumento(c).map((f) => `${inicialMaiuscula(f)} de ${c.nome}`);
  if (!d.escritorio.cnpj) marcados.push("CNPJ do escritório");
  if (!d.escritorio.endereco?.trim()) marcados.push("Endereço do escritório");
  if (!d.escritorio.oab?.trim()) marcados.push("Registro do escritório na OAB");

  const nomeCliente = c.nome.toUpperCase();
  const repNome = c.tipo === "PJ" ? (c.repNome?.trim() ? c.repNome.trim().toUpperCase() : falta("REPRESENTANTE")) : "";
  const assinaCliente = c.tipo === "PJ"
    ? `_______________________________________\n${nomeCliente}\nCNPJ ${c.documento ? formatarDocumento(c.documento) : falta("CNPJ")}\npor ${repNome}${c.repCargo?.trim() ? `, ${c.repCargo.trim().toLowerCase()}` : ""}`
    : `_______________________________________\n${nomeCliente}\nCPF ${c.documento ? formatarDocumento(c.documento) : falta("CPF")}`;
  const esc = d.escritorio;

  const valores: Record<string, string> = {
    CLIENTE_NOME: nomeCliente,
    CLIENTE_QUALIFICACAO: qualificacaoNoDocumento(c),
    CLIENTE_CPF: c.documento ? formatarDocumento(c.documento) : falta(c.tipo === "PJ" ? "CNPJ" : "CPF"),
    CLIENTE_RG: c.tipo === "PJ" ? "" : rgDoCliente(c),
    CLIENTE_ENDERECO: enderecoDoCliente(c),
    REPRESENTANTE_NOME: repNome,
    REPRESENTANTE_QUALIFICACAO: qualificacaoDoRepresentante(c),
    CLIENTE_ASSINATURA: assinaCliente,
    CONTRATO_NUMERO: d.contrato.numero,
    CONTRATO_OBJETO: d.contrato.objeto.trim().replace(/[.;]+$/, ""),
    CONTRATO_CASOS: casosNoDocumento(d.casos),
    HONORARIOS_CONDICOES: condicoesNoDocumento(d.condicoes),
    ADVOGADOS_OAB: outorgados.length ? fraseOutorgados(outorgados) : falta("ADVOGADOS"),
    ADVOGADOS_ASSINATURA: outorgados.length
      ? outorgados.map((a) => `_______________________________________\n${a.nome.toUpperCase()}\n${fraseOab(a.marcadas)}`).join("\n\n")
      : falta("ASSINATURA"),
    PODERES_ESPECIAIS: trechoPoderes(e.poderes, e.outroPoder),
    ESCRITORIO_NOME: esc.nome.toUpperCase(),
    ESCRITORIO_CNPJ: esc.cnpj ? formatarDocumento(esc.cnpj) : falta("CNPJ DO ESCRITÓRIO"),
    ESCRITORIO_OAB: esc.oab?.trim() || falta("REGISTRO NA OAB"),
    ESCRITORIO_ENDERECO: esc.endereco?.trim()
      ? `${esc.endereco.trim()}${esc.cidade ? `, ${esc.cidade}` : ""}${esc.uf ? `, ${esc.uf}` : ""}`
      : falta("ENDEREÇO DO ESCRITÓRIO"),
    CIDADE_DATA: e.cidadeData.trim(),
  };
  const origem: Record<string, "cadastro" | "formulario"> = {};
  for (const x of CAMPOS_DOCUMENTO) origem[x.campo] = x.origem;
  return { valores, origem, marcados };
}

/** Os marcados que o modelo de fato usa (o que falta, mas o modelo não pede, não conta). */
export function marcadosDoModeloDocumento(v: ValoresDocumento, campos: readonly string[]): string[] {
  const usa = (x: string) => campos.includes(x);
  const deCliente = ["CLIENTE_QUALIFICACAO", "CLIENTE_CPF", "CLIENTE_RG", "CLIENTE_ENDERECO", "CLIENTE_ASSINATURA", "REPRESENTANTE_NOME", "REPRESENTANTE_QUALIFICACAO"].some(usa);
  return v.marcados.filter((m) => {
    if (m === "CNPJ do escritório") return usa("ESCRITORIO_CNPJ");
    if (m === "Endereço do escritório") return usa("ESCRITORIO_ENDERECO");
    if (m === "Registro do escritório na OAB") return usa("ESCRITORIO_OAB");
    return deCliente;
  });
}

/** A prévia de um documento, com as três marcas (decisão 12). Usa a mesma montagem das petições. */
export function previaDocumento(paragrafos: readonly string[], v: ValoresDocumento): ParagrafoPrevia[] {
  return montarPrevia(paragrafos, v);
}

/** "Benedito Souza Lima" + "Procuração" → "procuracao-c-2026-033-benedito-souza-lima.docx". */
export function nomeArquivoDocumento(tipo: TipoDocumentoContrato, nomeModelo: string, numeroContrato: string, cliente: string, versao = 1): string {
  const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const base = tipo === "CONTRATO" ? "contrato" : tipo === "PROCURACAO" ? "procuracao" : tipo === "HIPOSSUFICIENCIA" ? "declaracao-hipossuficiencia" : slug(nomeModelo) || "documento";
  const s = `${base}-${slug(numeroContrato)}-${slug(cliente)}`.slice(0, 110).replace(/-$/, "");
  return `${s}${versao > 1 ? `-v${versao}` : ""}.docx`;
}

/** "Contrato, procuração e declaração de Benedito" → o .zip de "Baixar todos". */
export function nomeZipDocumentos(numeroContrato: string, cliente: string, versao?: number): string {
  const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `documentos-${slug(numeroContrato)}-${slug(cliente)}`.slice(0, 110).replace(/-$/, "") + (versao && versao > 1 ? `-v${versao}` : "") + ".zip";
}

/** A data e a cidade de hoje, do endereço do escritório. */
export function cidadeDataDocumento(e: EscritorioDoDocumento, hoje: string): string {
  return cidadeDataPadrao(e, hoje);
}

const NOMES_CAMPO_CLIENTE: Record<string, string> = {
  nome: "o nome", documento: "o CPF ou CNPJ", nacionalidade: "a nacionalidade", estado_civil: "o estado civil", profissao: "a profissão",
  rg: "o RG", rg_orgao: "o órgão do RG", cep: "o CEP", endereco: "o endereço", bairro: "o bairro", cidade: "a cidade", uf: "a UF",
  rep_nome: "quem assina pela empresa", rep_cargo: "o cargo de quem assina", rep_documento: "o CPF de quem assina",
  rep_estado_civil: "o estado civil de quem assina", rep_profissao: "a profissão de quem assina",
};
/** Só os campos que entram nos documentos contam como mudança (decisão 19). */
export const CAMPOS_CLIENTE_DOCUMENTO = Object.keys(NOMES_CAMPO_CLIENTE);

/** "o RG, completado por Diego Almeida às 15h52" (decisão 19). */
export function fraseMudancas(ms: readonly MudancaDesde[]): string | null {
  const itens = ms.map((m) => {
    const campos = m.campos.filter((c) => c in NOMES_CAMPO_CLIENTE).map((c) => NOMES_CAMPO_CLIENTE[c]!);
    if (!campos.length) return null;
    const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(m.em)).replace(":", "h");
    const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(new Date(m.em));
    return `${juntarComE(campos)}, mudado${m.por ? ` por ${m.por.nome}` : ""} em ${dia}, às ${hora}`;
  }).filter((x): x is string => !!x);
  return itens.length ? itens.join("; ") : null;
}

// ------------------------------------------------------------------------------- pedidos

const uuid = z.string().uuid();

export const escolhasDocumentosSchema = z.object({
  documentos: z.array(z.object({
    tipo: z.enum(TIPOS_DOCUMENTO_CONTRATO as [TipoDocumentoContrato, ...TipoDocumentoContrato[]]),
    modeloId: uuid.nullish(),
  })).max(12),
  outorgados: z.array(z.object({ pessoaId: uuid, inscricoes: z.array(uuid).max(10) })).max(15),
  poderes: z.array(z.enum(CODIGOS_PODERES as [PoderEspecial, ...PoderEspecial[]])).max(CODIGOS_PODERES.length),
  outroPoder: z.string().max(300).nullish(),
  cidadeData: z.string().max(120),
});
export type PedidoDocumentos = z.input<typeof escolhasDocumentosSchema>;

export const enviarModeloDocumentoSchema = z.object({
  nome: z.string().trim().min(3).max(120),
  tipo: z.enum(TIPOS_DOCUMENTO_CONTRATO as [TipoDocumentoContrato, ...TipoDocumentoContrato[]]),
});
export const arquivarModeloDocumentoSchema = z.object({ motivo: z.string().trim().min(3).max(300), versao: z.number().int().min(1) });

export const filtroDocumentosSchema = z.object({
  situacao: z.enum(["TODOS", "FALTA", "ASSINADOS"]).nullish(),
  q: z.string().max(100).nullish(),
});

// ------------------------------------------------------------------------------- respostas

export type SituacaoAssinatura = "FALTA" | "ASSINADO";

export interface AssinadoDoDocumento {
  anexoId: string;
  nome: string;
  assinadoEm: string | null;
  enviadoPor: PessoaRef;
  enviadoEm: string;
}

/** Uma versão de um documento gerado. */
export interface VersaoDocumento {
  id: string;
  numero: number;
  arquivo: string;
  geracaoId: string;
  modelo: { nome: string; padrao: boolean; numero: number | null };
  geradoPor: PessoaRef;
  geradoEm: string;
  marcados: string[];
  assinados: AssinadoDoDocumento[];
}

/** Um documento do contrato (o tipo, ou o "outro" de um modelo), com as versões. */
export interface DocumentoDoContrato {
  chave: string;
  tipo: TipoDocumentoContrato;
  nome: string;
  situacao: SituacaoAssinatura;
  atual: VersaoDocumento;
  anteriores: VersaoDocumento[];
}

/** O que foi usado numa geração, guardado como estava no dia (decisão 16). */
export interface UsadoNaGeracao {
  geracaoId: string;
  em: string;
  por: PessoaRef;
  contrato: { id: string; numero: string };
  documentos: { id: string; tipo: TipoDocumentoContrato; nome: string; arquivo: string; numero: number; modelo: string; marcados: string[] }[];
  outorgados: { pessoaId: string; nome: string; frase: string }[];
  poderes: PoderEspecial[];
  outroPoder: string | null;
  cidadeData: string;
  representante: { nome: string; cargo: string | null } | null;
}

export interface DocumentosDoContrato {
  contrato: { id: string; numero: string; estado: "ELABORACAO" | "ATIVO" | "ENCERRADO"; assinadoEm: string | null; versao: number; cliente: { id: string; nome: string } };
  documentos: DocumentoDoContrato[];
  /** Quantos esperam o assinado. */
  faltam: number;
  ultima: UsadoNaGeracao | null;
  podeGerar: boolean;
}

export interface LinhaDocumento {
  id: string;
  chave: string;
  tipo: TipoDocumentoContrato;
  nome: string;
  numero: number;
  arquivo: string;
  geradoPor: PessoaRef;
  geradoEm: string;
  marcados: number;
  cliente: { id: string; nome: string };
  contrato: { id: string; numero: string; estado: "ELABORACAO" | "ATIVO" | "ENCERRADO" };
  situacao: SituacaoAssinatura;
  assinado: AssinadoDoDocumento | null;
}

export interface ListaDocumentos {
  documentos: LinhaDocumento[];
  contagem: { todos: number; falta: number; assinados: number };
  /** Os contratos em elaboração cujo contrato gerado espera o assinado (o aviso no alto). */
  esperandoContrato: { id: string; numero: string; cliente: string }[];
  podeGerar: boolean;
}

export interface ModeloDocumentoLinha {
  /** O id do modelo do escritório, ou o código do padrão. */
  id: string;
  /** No padrão: os textos que ele tem (a declaração tem o de pessoa física e o de pessoa jurídica). */
  codigos?: { codigo: PadraoDocumento; nome: string }[];
  padrao: boolean;
  tipo: TipoDocumentoContrato;
  nome: string;
  versao: number;
  versaoId: string | null;
  campos: string[];
  desconhecidos: string[];
  enviadoPor: PessoaRef | null;
  atualizadoEm: string;
  usos: number;
  linhaVersao: number;
  emRevisao: boolean;
  anteriores: { numero: number; versaoId: string; nomeArquivo: string; enviadoPor: PessoaRef; enviadoEm: string; usos: number }[];
}

export interface ListaModelosDocumento {
  modelos: ModeloDocumentoLinha[];
  campos: CampoDocumento[];
  podeEnviar: boolean;
}

export interface PreviaDocumento {
  tipo: TipoDocumentoContrato;
  modeloId: string | null;
  nome: string;
  paragrafos: ParagrafoPrevia[];
  marcados: string[];
  desconhecidos: string[];
}

export interface PreviaDocumentos {
  documentos: PreviaDocumento[];
  frase: string;
}

export interface ResultadoDocumentos {
  geracaoId: string;
  documentos: { id: string; tipo: TipoDocumentoContrato; nome: string; arquivo: string; numero: number; marcados: string[] }[];
  usado: UsadoNaGeracao;
}
