// Conversas › Automações (PA-03). Os mesmos nomes estão no banco (0320_portal_automacoes.sql):
// o catálogo de gatilhos e de passos, o formato do fluxo, os erros presos ao passo e a
// simulação sem enviar (que o serviço roda com os dados que o banco entrega).

import { z } from "zod";
import type { PessoaRef } from "./clientes.ts";
import { reais } from "./honorarios.ts";

export type Gatilho = "PAGAMENTO_RECEBIDO" | "PARCELA_VAI_VENCER" | "PARCELA_ATRASO" | "ETAPA_CASO" | "LEMBRETE_AUDIENCIA" | "PRESTACAO_CONTAS";
export type AreaAutomacao = "FINANCEIRO" | "JURIDICO" | "CONVERSAS";
export type Quando = "PAGOU" | "RESPONDEU" | "NADA";
export type TipoPasso = "GATILHO" | "CONDICOES" | "MENSAGEM" | "ESPERA" | "RAMOS" | "IA" | "PESSOA" | "FIM";
export type RegraPessoa = "QUEM_CUIDA" | "AREA" | "SOCIA_DONA";
export type SituacaoAutomacao = "RASCUNHO" | "EM_APROVACAO" | "LIGADA" | "DESLIGADA";

interface InfoGatilho {
  nome: string;
  area: AreaAutomacao;
  icone: string;
  /** Faixa de dias do gatilho, quando ele tem. */
  dias: { min: number; max: number; padrao: number } | null;
  campos: string[];
  ramos: Quando[];
  /** O título do bloco do gatilho e o começo da frase de "quando sai". */
  titulo: (dias: number | null) => string;
  quando: (dias: number | null) => string;
  de: string;
  /** Como começa a frase de Ligar: "Toda parcela que chegar a 3 dias de atraso". */
  toda: (dias: number | null) => string;
}

const d = (n: number | null) => `${n ?? 0} ${n === 1 ? "dia" : "dias"}`;

export const GATILHOS: Record<Gatilho, InfoGatilho> = {
  PAGAMENTO_RECEBIDO: {
    nome: "Pagamento recebido", area: "FINANCEIRO", icone: "moeda", dias: null,
    campos: ["nome", "parcela", "valor", "nome do escritório"], ramos: ["RESPONDEU", "NADA"],
    titulo: () => "Pagamento registrado no Financeiro", quando: () => "Quando o Financeiro registra o recebimento",
    de: "Vem do Financeiro: o recebimento de uma parcela foi registrado.", toda: () => "Todo pagamento registrado no Financeiro",
  },
  PARCELA_VAI_VENCER: {
    nome: "Parcela vai vencer", area: "FINANCEIRO", icone: "moeda", dias: { min: 1, max: 30, padrao: 3 },
    campos: ["nome", "parcela", "valor", "vencimento", "link de pagamento", "nome do escritório"], ramos: ["PAGOU", "RESPONDEU", "NADA"],
    titulo: (n) => `Faltam ${d(n)} para a parcela vencer`, quando: (n) => `${d(n)} antes do vencimento`,
    de: "Vem do Financeiro: parcela em aberto perto do vencimento.", toda: (n) => `Toda parcela a ${d(n)} do vencimento`,
  },
  PARCELA_ATRASO: {
    nome: "Parcela em atraso", area: "FINANCEIRO", icone: "alerta", dias: { min: 1, max: 60, padrao: 3 },
    campos: ["nome", "parcela", "valor", "vencimento", "link de pagamento", "nome do escritório"], ramos: ["PAGOU", "RESPONDEU", "NADA"],
    titulo: (n) => `Parcela chega a ${d(n)} de atraso`, quando: (n) => `Quando a parcela chega a ${d(n)} de atraso`,
    de: "Vem do Financeiro: parcela sem pagamento registrado depois do vencimento. Paga, a parcela sai da automação.",
    toda: (n) => `Toda parcela que chegar a ${d(n)} de atraso`,
  },
  ETAPA_CASO: {
    nome: "Etapa do caso", area: "JURIDICO", icone: "balanca", dias: null,
    campos: ["nome", "caso", "etapa", "texto da etapa", "nome do escritório"], ramos: ["RESPONDEU", "NADA"],
    titulo: () => "A etapa do caso muda", quando: () => "Quando a etapa muda no Jurídico, se a etapa tiver texto para o cliente",
    de: "Vem do Jurídico: a etapa do caso mudou e tem texto para o cliente.", toda: () => "Toda mudança de etapa com texto para o cliente",
  },
  LEMBRETE_AUDIENCIA: {
    nome: "Lembrete de audiência", area: "JURIDICO", icone: "relogio", dias: null,
    campos: ["nome", "compromisso", "data", "hora", "local", "nome do escritório"], ramos: ["RESPONDEU", "NADA"],
    titulo: () => "Falta 1 dia para o compromisso", quando: () => "1 dia antes de audiência, reunião ou perícia com o cliente",
    de: "Vem da Agenda: audiência, reunião ou perícia com o cliente, 1 dia antes.", toda: () => "Todo compromisso do cliente na Agenda, 1 dia antes,",
  },
  PRESTACAO_CONTAS: {
    nome: "Prestação de contas", area: "FINANCEIRO", icone: "carteira", dias: null,
    campos: ["nome", "caso", "resumo", "valor", "nome do escritório"], ramos: ["RESPONDEU", "NADA"],
    titulo: () => "Repasse ao cliente registrado", quando: () => "Quando o repasse ao cliente é registrado",
    de: "Vem do Financeiro: o repasse ao cliente foi registrado.", toda: () => "Todo repasse ao cliente registrado",
  },
};

export const ORDEM_GATILHOS: Gatilho[] = ["PARCELA_ATRASO", "PARCELA_VAI_VENCER", "PAGAMENTO_RECEBIDO", "PRESTACAO_CONTAS", "ETAPA_CASO", "LEMBRETE_AUDIENCIA"];

export const TIPOS_PASSO: Record<TipoPasso, { nome: string; icone: string; ajuda: string }> = {
  GATILHO: { nome: "Gatilho", icone: "raio", ajuda: "Quando a automação começa." },
  CONDICOES: { nome: "Condições", icone: "filtro", ajuda: "Quem pode receber." },
  MENSAGEM: { nome: "Mensagem", icone: "whats", ajuda: "O texto aprovado que sai pelo WhatsApp." },
  ESPERA: { nome: "Espera", icone: "espera", ajuda: "Quanto tempo esperar antes do próximo passo." },
  RAMOS: { nome: "Ramos", icone: "ramo", ajuda: "Caminhos diferentes, conforme o que o cliente fez." },
  IA: { nome: "IA responde", icone: "ia", ajuda: "A IA conversa com o cliente, só com o que está no T3jus." },
  PESSOA: { nome: "Passar para pessoa", icone: "mao", ajuda: "A conversa passa para alguém da equipe, com o motivo." },
  FIM: { nome: "Fim", icone: "encerrar", ajuda: "A automação termina aqui para este cliente." },
};

/** Os passos que se adicionam no desenho (o gatilho é sempre o primeiro e não se adiciona). */
export const PASSOS_ADICIONAVEIS: TipoPasso[] = ["CONDICOES", "MENSAGEM", "ESPERA", "RAMOS", "IA", "PESSOA", "FIM"];

export const RAMOS_QUANDO: Record<Quando, { nome: string; icone: string }> = {
  PAGOU: { nome: "Se pagou", icone: "moeda" },
  RESPONDEU: { nome: "Se respondeu", icone: "conversas" },
  NADA: { nome: "Nem pagou, nem respondeu", icone: "relogio" },
};
export const nomeDoRamo = (q: Quando, g: Gatilho) => (q === "NADA" && !GATILHOS[g].ramos.includes("PAGOU") ? "Não respondeu" : RAMOS_QUANDO[q].nome);

export const REGRAS_PESSOA: Record<RegraPessoa, string> = {
  QUEM_CUIDA: "Quem cuida do caso ou do contrato",
  AREA: "Quem tem a área",
  SOCIA_DONA: "A sócia dona",
};

export const SITUACOES_AUTOMACAO: Record<SituacaoAutomacao, string> = {
  RASCUNHO: "Rascunho",
  EM_APROVACAO: "Em aprovação no WhatsApp",
  LIGADA: "Ligada",
  DESLIGADA: "Desligada",
};

// ------------------------------------------------------------------------------- o fluxo

export interface PassoBase { id: string }
export interface PassoGatilho extends PassoBase { tipo: "GATILHO"; dias?: number | null }
export interface PassoCondicoes extends PassoBase { tipo: "CONDICOES"; semCombinado: boolean }
export interface PassoMensagem extends PassoBase { tipo: "MENSAGEM"; nome: string; texto?: string | null; modeloId?: string | null; aviso?: Gatilho | null }
export interface PassoEspera extends PassoBase { tipo: "ESPERA"; dias?: number | null; horasAntes?: number | null }
export interface Ramo { quando: Quando; passos: Passo[] }
export interface PassoRamos extends PassoBase { tipo: "RAMOS"; ramos: Ramo[] }
export interface PassoIa extends PassoBase { tipo: "IA" }
export interface PassoPessoa extends PassoBase { tipo: "PESSOA"; pessoaId?: string | null; regra?: RegraPessoa | null; motivo?: string | null }
export interface PassoFim extends PassoBase { tipo: "FIM"; texto?: string | null }
export type Passo = PassoGatilho | PassoCondicoes | PassoMensagem | PassoEspera | PassoRamos | PassoIa | PassoPessoa | PassoFim;
export interface Fluxo { passos: Passo[] }

export type CodigoErroFluxo =
  | "PASSO_SEM_SAIDA" | "RESPONSAVEL_OBRIGATORIO" | "RESPONSAVEL_INVALIDO" | "CAMPO_INEXISTENTE"
  | "TEXTO_VAZIO" | "TEXTO_CAMPO_NA_PONTA" | "TEXTO_RECUSADO" | "LIMITE_SEMANAL";

export interface ErroFluxo { passo: string; ramo?: Quando; codigo: CodigoErroFluxo; campos?: string[]; motivo?: string; dias?: number }

const lista = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} e ${xs[xs.length - 1]}`);

/** A frase do erro, presa ao passo. */
export function textoDoErroFluxo(e: ErroFluxo, g: Gatilho): string {
  const campos = GATILHOS[g].campos.map((c) => `{${c}}`);
  switch (e.codigo) {
    case "PASSO_SEM_SAIDA":
      return e.ramo ? "Este caminho não leva a nenhum passo. Quem cair aqui ficaria sem ninguém." : "O fluxo precisa terminar em Fim, em Passar para pessoa ou em Ramos.";
    case "RESPONSAVEL_OBRIGATORIO":
      return "Escolha uma pessoa ativa ou uma regra (quem cuida, quem tem a área, a sócia dona). A conversa não pode ficar sem responsável.";
    case "RESPONSAVEL_INVALIDO":
      return "Esta pessoa não está mais na equipe. Escolha outra pessoa ou uma regra.";
    case "CAMPO_INEXISTENTE":
      return `${lista((e.campos ?? []).map((c) => `O campo {${c}}`))} não existe para este gatilho. Os campos são: ${lista(campos)}.`;
    case "TEXTO_VAZIO":
      return "Escreva o texto da mensagem (pelo menos 10 letras).";
    case "TEXTO_CAMPO_NA_PONTA":
      return "A Meta pede que o texto não comece nem termine com um campo entre chaves.";
    case "TEXTO_RECUSADO":
      return `A Meta recusou este texto${e.motivo ? `: ${e.motivo}` : ""}. Escreva um texto novo para aprovar.`;
    case "LIMITE_SEMANAL":
      return `Esta cobrança sairia ${d(e.dias ?? 0)} depois da anterior. O limite é 1 cobrança por semana por parcela.`;
  }
}

/** Título curto do erro, para o resumo do alto e o assistente. */
export const TITULOS_ERRO_FLUXO: Record<CodigoErroFluxo, string> = {
  PASSO_SEM_SAIDA: "Caminho sem saída",
  RESPONSAVEL_OBRIGATORIO: "Passar para ninguém",
  RESPONSAVEL_INVALIDO: "Pessoa fora da equipe",
  CAMPO_INEXISTENTE: "Campo que o gatilho não tem",
  TEXTO_VAZIO: "Mensagem sem texto",
  TEXTO_CAMPO_NA_PONTA: "Campo no começo ou no fim",
  TEXTO_RECUSADO: "Texto recusado pela Meta",
  LIMITE_SEMANAL: "Mais de 1 cobrança na semana",
};

// ------------------------------------------------------------------------------- mexer no fluxo

/** Percorre o fluxo inteiro, com a posição de cada passo (para o número do desenho). */
export function passosEmOrdem(f: Fluxo): Passo[] {
  const out: Passo[] = [];
  const ir = (seq: Passo[]) => seq.forEach((p) => { out.push(p); if (p.tipo === "RAMOS") p.ramos.forEach((r) => ir(r.passos)); });
  ir(f.passos);
  return out;
}

export function acharPasso(f: Fluxo, id: string): Passo | null {
  return passosEmOrdem(f).find((p) => p.id === id) ?? null;
}

const mapearSeq = (seq: Passo[], fn: (seq: Passo[]) => Passo[]): Passo[] =>
  fn(seq).map((p) => (p.tipo === "RAMOS" ? { ...p, ramos: p.ramos.map((r) => ({ ...r, passos: mapearSeq(r.passos, fn) })) } : p));

export function trocarPasso(f: Fluxo, id: string, novo: Passo): Fluxo {
  return { passos: mapearSeq(f.passos, (seq) => seq.map((p) => (p.id === id ? novo : p))) };
}

export function apagarPasso(f: Fluxo, id: string): Fluxo {
  return { passos: mapearSeq(f.passos, (seq) => seq.filter((p) => p.id !== id || p.tipo === "GATILHO")) };
}

/** Sobe ou desce um passo dentro da sua sequência, sem passar do gatilho nem de quem termina. */
export function moverPasso(f: Fluxo, id: string, dir: -1 | 1): Fluxo {
  return {
    passos: mapearSeq(f.passos, (seq) => {
      const i = seq.findIndex((p) => p.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= seq.length) return seq;
      const a = seq[i]!, b = seq[j]!;
      if (b.tipo === "GATILHO" || a.tipo === "GATILHO" || terminal(a) || terminal(b)) return seq;
      const n = [...seq];
      [n[i], n[j]] = [b, a];
      return n;
    }),
  };
}

const terminal = (p: Passo) => p.tipo === "FIM" || p.tipo === "PESSOA" || p.tipo === "RAMOS";
export const podeMover = (seq: Passo[], i: number, dir: -1 | 1) => {
  const j = i + dir;
  const a = seq[i], b = seq[j];
  return !!a && !!b && a.tipo !== "GATILHO" && b.tipo !== "GATILHO" && !terminal(a) && !terminal(b);
};

/** Um id novo, que não existe no fluxo. */
export function idNovo(f: Fluxo, tipo: TipoPasso): string {
  const ids = new Set(passosEmOrdem(f).map((p) => p.id));
  const base = tipo.toLowerCase().replace(/_/g, "-");
  for (let n = 1; ; n++) if (!ids.has(`${base}-${n}`)) return `${base}-${n}`;
}

/** O passo novo, com o que ele precisa para começar. */
export function passoNovo(f: Fluxo, tipo: TipoPasso, g: Gatilho): Passo {
  const id = idNovo(f, tipo);
  switch (tipo) {
    case "CONDICOES": return { id, tipo, semCombinado: true };
    case "MENSAGEM": return { id, tipo, nome: "Mensagem nova", texto: "" };
    case "ESPERA": return { id, tipo, dias: 1 };
    case "RAMOS": {
      const ramos = GATILHOS[g].ramos.map((q) => ({ quando: q, passos: [] as Passo[] }));
      return { id, tipo, ramos };
    }
    case "IA": return { id, tipo };
    case "PESSOA": return { id, tipo, regra: "AREA", motivo: "" };
    case "FIM": return { id, tipo };
    case "GATILHO": return { id, tipo };
  }
}

/** Põe um passo no fim de uma sequência (a principal ou a de um ramo), antes de quem termina. */
export function adicionarPasso(f: Fluxo, onde: { ramos?: string; quando?: Quando }, novo: Passo): Fluxo {
  const pôr = (seq: Passo[]) => {
    const fim = seq.length && terminal(seq[seq.length - 1]!) ? seq.length - 1 : seq.length;
    if (terminal(novo)) {
      // Quem termina substitui o fim que já houver (não fica nada depois dele).
      return [...seq.slice(0, fim), novo];
    }
    return [...seq.slice(0, fim), novo, ...seq.slice(fim)];
  };
  if (!onde.ramos) return { passos: pôr(f.passos) };
  return trocarPasso(f, onde.ramos, (() => {
    const r = acharPasso(f, onde.ramos!) as PassoRamos;
    return { ...r, ramos: r.ramos.map((x) => (x.quando === onde.quando ? { ...x, passos: pôr(x.passos) } : x)) };
  })());
}

/** Quem receberia a conversa num passo "Passar para pessoa". */
export function quemRecebe(p: PassoPessoa, pessoas: { id: string; nome: string }[], g: Gatilho): string {
  if (p.pessoaId) return pessoas.find((x) => x.id === p.pessoaId)?.nome ?? "pessoa fora da equipe";
  if (p.regra === "AREA") return `quem tem o ${GATILHOS[g].area === "JURIDICO" ? "Jurídico" : "Financeiro"}`;
  if (p.regra === "SOCIA_DONA") return "a sócia dona";
  if (p.regra === "QUEM_CUIDA") return GATILHOS[g].area === "JURIDICO" ? "quem cuida do caso" : "quem cuida do contrato";
  return "ninguém escolhido";
}

/** "Quando a parcela chega a 3 dias de atraso. Se não pagar em 5 dias, passa para Gustavo." */
export function quandoSai(g: Gatilho, f: Fluxo, pessoas: { id: string; nome: string }[]): string {
  const gat = f.passos[0]?.tipo === "GATILHO" ? f.passos[0] : null;
  const frases = [GATILHOS[g].quando(gat?.dias ?? null) + "."];
  let espera = 0;
  let msgs = 0;
  for (const p of f.passos) {
    if (p.tipo === "MENSAGEM") msgs++;
    if (p.tipo === "ESPERA" && p.dias) espera += p.dias;
    if (p.tipo === "RAMOS") {
      const nada = p.ramos.find((r) => r.quando === "NADA")?.passos.find((x) => x.tipo === "PESSOA") as PassoPessoa | undefined;
      if (nada) {
        const quem = quemRecebe(nada, pessoas, g);
        const nome = nada.pessoaId ? quem.split(" ")[0] : quem;
        frases.push(GATILHOS[g].ramos.includes("PAGOU")
          ? `Se não pagar${espera ? ` em ${d(espera)}` : ""}, passa para ${nome}.`
          : `Se não responder, passa para ${nome}.`);
      }
    }
    if (p.tipo === "PESSOA") frases.push(`Passa para ${quemRecebe(p, pessoas, g)}.`);
  }
  if (msgs > 1 && g === "PARCELA_ATRASO" && gat?.dias) {
    let dia = gat.dias;
    const dias = [dia];
    for (const p of f.passos.slice(1)) {
      if (p.tipo === "ESPERA" && p.dias) dia += p.dias;
      if (p.tipo === "MENSAGEM" && p !== f.passos.find((x) => x.tipo === "MENSAGEM")) dias.push(dia);
    }
    frases[0] = `${lista(dias.map(String))} dias depois do vencimento. Para quando é paga.`;
  }
  return frases.join(" ");
}

// ------------------------------------------------------------------------------- páginas

export interface ModeloMensagem {
  id: string;
  nome: string;
  texto: string;
  aprovadoPor: PessoaRef | null;
  aprovadoEm: string;
  metaSituacao: "NAO_ENVIADO" | "EM_ANALISE" | "APROVADO" | "RECUSADO";
  metaEm: string | null;
  metaMotivo: string | null;
}

export interface LinhaAutomacao {
  id: string;
  versao: number;
  nome: string;
  origem: "PRONTA" | "ESCRITORIO";
  prontaChave: Gatilho | null;
  gatilho: Gatilho;
  area: AreaAutomacao;
  situacao: SituacaoAutomacao;
  fluxo: Fluxo;
  versaoLigada: number | null;
  aguardando: { numero: number; desde: string } | null;
  desligada: { em: string; motivo: string; por: PessoaRef | null } | null;
  erros: number;
  textosPorAprovar: number;
  rascunhoMudou: boolean;
  seteDias: { enviadas: number; falhas: number };
  atualizadaPor: PessoaRef | null;
  atualizadaEm: string;
  criadaPor: PessoaRef | null;
  criadaEm: string;
}

export interface ListaAutomacoes {
  dono: boolean;
  areas: string[];
  quemCuida: PessoaRef | null;
  whatsapp: { situacao: "NAO_LIGADO" | "EM_ANALISE" | "LIGADO" | "DESLIGADO" };
  semAvisos: number;
  pessoas: PessoaRef[];
  automacoes: LinhaAutomacao[];
}

export interface PessoaAutomacao { id: string; nome: string; areas: string[]; dono: boolean }

export interface EventoAutomacao {
  tipo: "CRIADA" | "TEXTO_APROVADO" | "LIGADA" | "EM_APROVACAO" | "META_APROVOU" | "META_RECUSOU" | "DESLIGADA" | "DESLIGADA_POR_CONFLITO" | "SUGESTAO";
  detalhe: Record<string, unknown>;
  pessoa: PessoaRef | null;
  em: string;
}

export interface PaginaAutomacao extends LinhaAutomacao {
  eu: string;
  dono: boolean;
  quemCuida: PessoaRef | null;
  whatsapp: ListaAutomacoes["whatsapp"];
  rascunho: Fluxo;
  listaErros: ErroFluxo[];
  textosPorAprovarIds: string[];
  conflitos: { id: string; nome: string; dias: number[] }[];
  entramJaAtrasados: boolean;
  ligada: { numero: number; em: string; por: PessoaRef | null } | null;
  modelos: Record<string, ModeloMensagem>;
  aviso: { texto: string; situacao: string } | null;
  pessoas: PessoaAutomacao[];
  campos: string[];
  execucoes: { total: number; concluidas: number; andamento: number; falhas: number };
  eventos: EventoAutomacao[];
}

export interface ItemQuemEntraria {
  /** O que faz entrar: a parcela, o compromisso ou a mudança de etapa (quando: vencimento, início ou dia da mudança). */
  origem: { id: string; descricao: string; quando: string };
  parcela?: { id: string; descricao: string; valor: number; vencimento: string };
  cliente: { id: string; nome: string };
  contato: { nome: string | null; papel: string | null };
  diasAtraso?: number;
  jaEmAtraso?: boolean;
  entra: boolean;
  motivo: "SEM_AVISOS" | "SEM_WHATSAPP" | "COMBINADO" | null;
  detalhe: { quemPediu?: string | null; em?: string; tipo?: string; oQue?: string; data?: string } | null;
}

export interface QuemEntraria { disponivel: boolean; dias?: number; itens: ItemQuemEntraria[] }

export interface ExecucaoAutomacao {
  id: string;
  cliente: { id: string; nome: string };
  rotulo: string;
  versao: number;
  caminho: { passo: string; rotulo?: string; situacao?: "OK" | "FALHOU" | "ESPERA"; em?: string }[];
  situacao: "AGENDADA" | "EM_ANDAMENTO" | "CONCLUIDA" | "FALHOU" | "FICOU_DE_FORA";
  motivo: string | null;
  responsavel: PessoaRef | null;
  conversaId: string | null;
  iniciadaEm: string;
  terminadaEm: string | null;
}

// ------------------------------------------------------------------------------- simulação

export type EscolhaSimulacao = Quando;

/** O que o banco entrega para simular (portal_automacao_simulacao). */
export interface DadosSimulacao {
  gatilho: Gatilho;
  nome: string;
  fluxo: Fluxo;
  escritorio: string;
  hoje: string;
  exemplo: { cliente: string; contato: string | null; papel: string | null; parcela: string; valor: number; vencimento: string; quemCuida: PessoaRef | null } | null;
  textos: Record<string, string>;
  aviso: string | null;
  pessoas: Record<string, string>;
  socioDono: PessoaRef | null;
  quemTemArea: PessoaRef | null;
}

export type LinhaSimulada =
  | { tipo: "SISTEMA"; icone: string; texto: string; em: string }
  | { tipo: "AVISO"; nome: string; texto: string; em: string }
  | { tipo: "CLIENTE"; texto: string; em: string };

export interface Simulacao {
  cliente: string;
  contato: string;
  exemplo: boolean;
  caminho: { passo: string; tipo: TipoPasso; rotulo: string }[];
  conversa: LinhaSimulada[];
}

// Horário de Brasília (sem horário de verão desde 2019): a hora local guardada em UTC.
const H = 3600_000;
const local = (iso: string) => new Date(new Date(iso).getTime() - 3 * H);
const iso = (l: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${l.getUTCFullYear()}-${p(l.getUTCMonth() + 1)}-${p(l.getUTCDate())}T${p(l.getUTCHours())}:${p(l.getUTCMinutes())}:00-03:00`;
};
const diaIso = (l: Date) => iso(l).slice(0, 10);

/** Feriados nacionais (os fixos e a Sexta-feira Santa). */
export function feriadosNacionais(ano: number): string[] {
  // Páscoa pelo algoritmo de Meeus.
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d2 = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d2 - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  const sexta = new Date(Date.UTC(ano, mes - 1, dia - 2));
  return [
    `${ano}-01-01`, `${ano}-04-21`, `${ano}-05-01`, `${ano}-09-07`, `${ano}-10-12`, `${ano}-11-02`, `${ano}-11-15`, `${ano}-11-20`, `${ano}-12-25`,
    sexta.toISOString().slice(0, 10),
  ];
}

export function diaUtil(dia: string): boolean {
  const s = new Date(`${dia}T12:00:00Z`).getUTCDay();
  return s !== 0 && s !== 6 && !feriadosNacionais(Number(dia.slice(0, 4))).includes(dia);
}

/** O primeiro momento dentro dos limites (8h às 20h, em dia útil) a partir de um momento local. */
export function proximoHorario(l: Date): Date {
  const t = new Date(l.getTime());
  for (let n = 0; n < 30; n++) {
    const hora = t.getUTCHours() + t.getUTCMinutes() / 60;
    if (diaUtil(diaIso(t)) && hora >= 8 && hora < 20) return t;
    if (diaUtil(diaIso(t)) && hora < 8) { t.setUTCHours(8, 0, 0, 0); return t; }
    t.setUTCDate(t.getUTCDate() + 1);
    t.setUTCHours(8, 0, 0, 0);
  }
  return t;
}

const primeiroNome = (n: string | null | undefined) => (n ?? "").trim().split(/\s+/)[0] ?? "";

/** Roda o fluxo para um cliente, sem enviar nada, e devolve o caminho e a conversa. */
export function simularFluxo(s: DadosSimulacao, escolha: EscolhaSimulacao): Simulacao {
  const g = s.gatilho;
  const info = GATILHOS[g];
  const gat = s.fluxo.passos[0]?.tipo === "GATILHO" ? (s.fluxo.passos[0] as PassoGatilho) : null;
  const agora = local(s.hoje);
  const hojeDia = diaIso(agora);
  const ex = s.exemplo;
  const contato = ex?.contato ?? "Maria";
  const cliente = ex?.cliente ?? "Cliente de exemplo";
  // O dia em que o gatilho dispara.
  let inicio: Date;
  if (ex && g === "PARCELA_ATRASO") {
    const v = new Date(`${ex.vencimento}T08:00:00Z`);
    v.setUTCDate(v.getUTCDate() + (gat?.dias ?? 0));
    inicio = v.getTime() < agora.getTime() ? agora : v;
  } else if (ex && g === "PARCELA_VAI_VENCER") {
    const v = new Date(`${ex.vencimento}T08:00:00Z`);
    v.setUTCDate(v.getUTCDate() - (gat?.dias ?? 0));
    inicio = v.getTime() < agora.getTime() ? agora : v;
  } else inicio = agora;
  inicio = proximoHorario(new Date(Math.ceil(inicio.getTime() / (10 * 60_000)) * 10 * 60_000));
  // O compromisso do lembrete: o dia útil seguinte ao do aviso, às 14h.
  const compromisso = (() => { const c = new Date(inicio.getTime()); c.setUTCDate(c.getUTCDate() + 1); c.setUTCHours(14, 0, 0, 0); return proximoHorario(c); })();
  const vencimento = ex?.vencimento ?? (() => {
    const v = new Date(`${hojeDia}T12:00:00Z`);
    v.setUTCDate(v.getUTCDate() + (g === "PARCELA_ATRASO" ? -(gat?.dias ?? 0) : g === "PARCELA_VAI_VENCER" ? gat?.dias ?? 0 : 0));
    return v.toISOString().slice(0, 10);
  })();
  const dm = (x: string) => `${x.slice(8, 10)}/${x.slice(5, 7)}`;
  const campos: Record<string, string> = {
    nome: primeiroNome(contato),
    parcela: ex?.parcela ?? "Parcela 2 de 6",
    valor: reais(ex?.valor ?? 50000),
    vencimento: dm(vencimento),
    "link de pagamento": "(link de pagamento)",
    "nome do escritório": s.escritorio,
    caso: "Ação revisional",
    etapa: "Instrução",
    "texto da etapa": "a audiência de instrução foi marcada e nós vamos avisar a data.",
    compromisso: "Audiência de conciliação",
    data: dm(diaIso(compromisso)),
    hora: "14:00",
    local: "Fórum Central, sala 4",
    resumo: "o valor de R$ 3.200,00 foi depositado na sua conta",
  };
  const preencher = (t: string) => t.replace(/\{([^{}]{1,40})\}/g, (m, c: string) => campos[c] ?? m);
  const pessoa = (p: PassoPessoa) => {
    if (p.pessoaId) return s.pessoas[p.pessoaId] ?? "pessoa fora da equipe";
    if (p.regra === "QUEM_CUIDA") return ex?.quemCuida?.nome ?? s.socioDono?.nome ?? "a sócia dona";
    if (p.regra === "AREA") return s.quemTemArea?.nome ?? s.socioDono?.nome ?? "a sócia dona";
    return s.socioDono?.nome ?? "a sócia dona";
  };

  const caminho: Simulacao["caminho"] = [];
  const conversa: LinhaSimulada[] = [];
  let t = inicio;
  let numero = 0;
  let agiu = false;
  const passou = (p: Passo, rotulo?: string) => caminho.push({ passo: p.id, tipo: p.tipo, rotulo: rotulo ?? `${++numero} ${TIPOS_PASSO[p.tipo].nome}` });
  const sis = (icone: string, texto: string, em = t) => conversa.push({ tipo: "SISTEMA", icone, texto, em: iso(em) });
  const respostaDoCliente = (em: Date) => {
    agiu = true;
    if (escolha === "PAGOU") sis("moeda", "O pagamento foi registrado no Financeiro.", em);
    else conversa.push({ tipo: "CLIENTE", texto: g.startsWith("PARCELA") ? "Oi! Vi a mensagem. Posso pagar na sexta?" : "Recebi, obrigado. Confirmo.", em: iso(em) });
  };

  const rodar = (seq: Passo[]): boolean => {
    for (let i = 0; i < seq.length; i++) {
      const p = seq[i]!;
      switch (p.tipo) {
        case "GATILHO": {
          passou(p);
          const cond = s.fluxo.passos.find((x) => x.tipo === "CONDICOES") as PassoCondicoes | undefined;
          const conferido = cond ? ` Condições conferidas: ${cond.semCombinado ? "sem combinado, " : ""}${primeiroNome(contato)} tem WhatsApp.` : "";
          sis("raio", `Gatilho: ${info.titulo(gat?.dias ?? null).replace(/^./, (c) => c.toLowerCase())}.${conferido}`);
          break;
        }
        case "CONDICOES":
          passou(p);
          break;
        case "MENSAGEM": {
          passou(p);
          t = proximoHorario(t);
          const texto = p.texto ?? (p.modeloId ? s.textos[p.modeloId] : null) ?? (p.aviso ? s.aviso : null) ?? "";
          conversa.push({ tipo: "AVISO", nome: p.nome, texto: preencher(texto), em: iso(t) });
          // Sem ramo depois, pagar encerra a cobrança e responder cai em Mensagens.
          if (!agiu && escolha !== "NADA" && !seq.slice(i + 1).some((x) => x.tipo === "RAMOS")) {
            const em = new Date(t.getTime() + 2 * H);
            respostaDoCliente(em);
            t = em;
            if (escolha === "PAGOU" && g.startsWith("PARCELA")) {
              sis("fim", "Paga, a parcela sai da automação. Nada mais sai para este cliente.");
              caminho.push({ passo: "pagou", tipo: "FIM", rotulo: "Pagou" });
              return true;
            }
            sis("conversas", "A resposta entra em Mensagens. Uma pessoa ou a IA responde por lá.");
          }
          break;
        }
        case "ESPERA": {
          passou(p);
          if (p.horasAntes) {
            t = new Date(compromisso.getTime() - p.horasAntes * H);
            sis("espera", `Espera até ${p.horasAntes} ${p.horasAntes === 1 ? "hora" : "horas"} antes do compromisso.`);
            break;
          }
          const dias = p.dias ?? 0;
          if (!agiu && escolha !== "NADA" && seq.slice(i + 1).some((x) => x.tipo === "RAMOS")) {
            const em = new Date(t.getTime() + 24 * H);
            respostaDoCliente(em);
            t = em;
            sis("espera", `A espera de ${d(dias)} termina antes: o cliente ${escolha === "PAGOU" ? "pagou" : "respondeu"}.`);
          } else {
            t = new Date(t.getTime() + dias * 24 * H);
            sis("espera", `${d(dias)} ${g.startsWith("PARCELA") ? "sem pagamento nem resposta" : "sem resposta"}.`);
          }
          break;
        }
        case "RAMOS": {
          passou(p);
          const q: Quando = agiu ? escolha : "NADA";
          const r = p.ramos.find((x) => x.quando === q) ?? p.ramos.find((x) => x.quando === "NADA");
          if (!r) return true;
          caminho.push({ passo: `${p.id}:${r.quando}`, tipo: "RAMOS", rotulo: nomeDoRamo(r.quando, g) });
          return rodar(r.passos);
        }
        case "IA":
          passou(p);
          sis("ia", "A IA conversaria com o cliente, só com o que está no T3jus. Acordo, desconto ou reclamação vão para uma pessoa.");
          break;
        case "PESSOA": {
          passou(p, `${++numero} Passar para ${primeiroNome(pessoa(p))}`);
          sis("mao", `A conversa passaria para ${pessoa(p)}.${p.motivo ? ` Motivo: ${p.motivo}.` : ""} A pessoa recebe a conversa em “Precisa de alguém”.`);
          return true;
        }
        case "FIM":
          passou(p, "Fim");
          return true;
      }
    }
    return true;
  };
  rodar(s.fluxo.passos);
  return { cliente, contato, exemplo: !ex, caminho, conversa };
}

// ------------------------------------------------------------------------------- pedidos

const gatilhoSchema = z.enum(["PAGAMENTO_RECEBIDO", "PARCELA_VAI_VENCER", "PARCELA_ATRASO", "ETAPA_CASO", "LEMBRETE_AUDIENCIA", "PRESTACAO_CONTAS"]);

export const criarAutomacaoSchema = z.object({ gatilho: gatilhoSchema, nome: z.string().max(80) });

/** O banco confere o formato do desenho por inteiro; aqui só o tamanho. */
export const salvarAutomacaoSchema = z.object({
  versao: z.number().int().positive(),
  nome: z.string().max(80).optional(),
  fluxo: z.object({ passos: z.array(z.record(z.string(), z.unknown())).min(1).max(40) }).strict().optional(),
});

export const aprovarTextoSchema = z.object({ versao: z.number().int().positive(), passo: z.string().regex(/^[a-z0-9-]{1,40}$/) });
export const ligarAutomacaoSchema = z.object({
  versao: z.number().int().positive(),
  revisou: z.boolean(),
  desligarConflitos: z.boolean().default(false),
  entramJaAtrasados: z.boolean().default(false),
});
export const desligarAutomacaoSchema = z.object({ versao: z.number().int().positive(), motivo: z.string().max(600) });
export const sugerirMudancaSchema = z.object({ texto: z.string().max(600) });
export const simularAutomacaoSchema = z.object({ parcelaId: z.string().uuid().nullish(), escolha: z.enum(["NADA", "RESPONDEU", "PAGOU"]) });
export const semAvisosSchema = z.object({
  tipo: z.enum(["TODOS", "COBRANCA"]).optional(),
  origem: z.enum(["CONVERSA", "FICHA"]).optional(),
  quemPediu: z.string().max(120).optional(),
  retirar: z.boolean().optional(),
});

// ------------------------------------------------------------------ Avisos automáticos (F3.64)
// O que saiu sozinho pelo WhatsApp nos últimos 7 dias (portal_avisos_automaticos).

export type SituacaoAvisoAutomatico = "NA_FILA" | "ENVIADA" | "ENTREGUE" | "LIDA" | "RESPONDEU" | "NAO_ENTREGUE";

export const SITUACAO_AVISO: Record<SituacaoAvisoAutomatico, string> = {
  NA_FILA: "Na fila", ENVIADA: "Enviado", ENTREGUE: "Entregue", LIDA: "Lido", RESPONDEU: "Respondeu", NAO_ENTREGUE: "Não entregue",
};

/** Os nomes curtos dos filtros da tela, na ordem aprovada. */
export const FILTROS_AVISO: { gatilho: Gatilho | null; nome: string }[] = [
  { gatilho: null, nome: "Todos" },
  { gatilho: "PAGAMENTO_RECEBIDO", nome: "Pagamento" },
  { gatilho: "PARCELA_VAI_VENCER", nome: "Vai vencer" },
  { gatilho: "PARCELA_ATRASO", nome: "Atraso" },
  { gatilho: "ETAPA_CASO", nome: "Etapa do caso" },
  { gatilho: "LEMBRETE_AUDIENCIA", nome: "Audiência" },
  { gatilho: "PRESTACAO_CONTAS", nome: "Prestação de contas" },
];

export interface AvisoAutomatico {
  id: string;
  mensagemId: string | null;
  execucaoId: string;
  gatilho: Gatilho;
  automacao: { id: string; nome: string };
  nome: string;
  detalhe: string | null;
  cliente: { id: string; nome: string };
  para: { nome: string; papel: string | null } | null;
  conversaId: string | null;
  em: string;
  texto: string | null;
  situacao: SituacaoAvisoAutomatico;
  motivo: string | null;
  resposta: string | null;
}

export interface ListaAvisosAutomaticos {
  itens: AvisoAutomatico[];
  total: number;
  naoEntregues: number;
  porTipo: Partial<Record<Gatilho, number>>;
  socioDono: PessoaRef | null;
  dono: boolean;
}
