// A IA que atende pelo WhatsApp do escritório (F3.53; PA-05, PA-04, PD-07, PT-11). As regras
// que não dependem do modelo de IA ficam aqui, puras, para o serviço (Deno) e os testes:
// quando ela fica em silêncio, quando passa direto, o horário da equipe, o texto de quando uma
// pessoa vai ver, as instruções que o modelo recebe e a conferência da resposta antes de enviar.
// As regras fixas não dependem de configuração: não dá para desligar por dado.

import { z } from "zod";
import type { ConfigIa, PaginaIa, SituacaoIa } from "./whatsapp.ts";

/** Os sete casos em que a IA sempre passa para uma pessoa (o escritório só acrescenta palavras). */
export const CASOS_PASSAR = {
  PEDIU_PESSOA: "Pediu para falar com uma pessoa ou com o advogado",
  RECLAMACAO: "Reclamação ou insatisfação",
  URGENCIA: "Urgência: prisão, liminar, audiência hoje, prazo vencendo",
  PROPOSTA_ACORDO: "Proposta de acordo ou valor oferecido pela outra parte",
  DOCUMENTO_NOVO: "Documento novo, intimação ou carta recebida",
  CLIENTE_NOVO: "Contato novo, que ainda não é cliente",
  NAO_SOUBE: "Quando ela não sabe responder com o que está no T3jus",
} as const;
export type CasoPassar = keyof typeof CASOS_PASSAR;

/** Os motivos que a IA usa ao passar (os sete casos, mais os que o serviço decide sozinho). */
export const MOTIVOS_PASSAR = [...Object.keys(CASOS_PASSAR), "VALOR", "ESTRATEGIA", "SEM_AVISOS", "PALAVRA", "REGRA_FIXA", "IA_DESLIGADA", "OUTRO"] as const;
export type MotivoPassar = (typeof MOTIVOS_PASSAR)[number];

/** O que ela nunca faz (fixo no T3jus). */
export const REGRAS_FIXAS = [
  "Nunca dá opinião jurídica, nem diz a chance de ganhar ou perder.",
  "Nunca negocia honorários, valores, descontos ou prazos de pagamento.",
  "Nunca fala de outro cliente, nem confirma se alguém é cliente do escritório.",
  "Nunca promete prazo, data de decisão ou resultado.",
  "Sempre diz que é assistente virtual; nunca finge ser uma pessoa.",
] as const;

export type AutorMensagemIa = "CLIENTE" | "IA" | "EQUIPE" | "AVISO" | "APP";
export interface MensagemIa { autor: AutorMensagemIa; texto: string | null; anexo?: boolean; em?: string }

/** O que o banco entrega sobre quem escreve (ia_contexto_json). */
export interface ContextoIa {
  escritorio: string;
  config: ConfigIa & { situacao: SituacaoIa };
  /** Hora de Brasília, "AAAA-MM-DDTHH:MM". */
  agora: string;
  feriados: string[];
  cliente: { nome: string } | null;
  contato: { nome: string | null; papel: string | null; principal: boolean } | null;
  quemResponde: { nome: string | null; razao: string | null };
  comercial: string | null;
  respostas: { pergunta: string; resposta: string }[];
  dados: {
    casos?: { nome: string; etapa: string; desde: string; texto: string; quemEscreveu: string | null; responsavel: string | null }[];
    compromissos?: { titulo: string; tipo: string; inicio: string; modalidade: string; local: string | null; link: string | null }[];
    parcelas?: { descricao: string; vencimento: string; valor: number; falta: number; situacao: string }[];
    /** Parcelas com baixa sem receber (F3.139, pergunta 5): só quantas, sem valor nem motivo. */
    parcelasComEquipe?: number;
    documentos?: { descricao: string; pedidoEm: string }[];
  };
}

/** O que o serviço lê para atender uma conversa (ia_atendimento). */
export interface AtendimentoIa {
  conversa: { id: string; situacao: "IA" | "PRECISA" | "EQUIPE"; versao: number; nome: string | null; notaIa: string | null; pessoaRespondeu: boolean };
  iaSituacao: SituacaoIa;
  mensagens: MensagemIa[];
  contexto: ContextoIa;
}

/** A resposta do modelo, sempre neste formato (saída estruturada). */
export const saidaIaSchema = z.object({
  acao: z.enum(["RESPONDER", "PASSAR"]),
  texto: z.string(),
  motivo: z.enum(MOTIVOS_PASSAR).nullable(),
  fonte: z.string().nullable(),
  resolvida: z.boolean(),
  naoSoube: z.string().nullable(),
});
export type SaidaIa = z.infer<typeof saidaIaSchema>;

// ------------------------------------------------------------------------------- horário

const DIAS_NOME = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const minutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const diaDaSemana = (dia: string) => new Date(`${dia}T12:00:00Z`).getUTCDay();
/** 1 = segunda ... 7 = domingo, como na configuração. */
const diaConfig = (dia: string) => ((diaDaSemana(dia) + 6) % 7) + 1;
const somarDias = (dia: string, n: number) => {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const hora = (hhmm: string) => (hhmm.slice(3, 5) === "00" ? `${Number(hhmm.slice(0, 2))}h` : `${Number(hhmm.slice(0, 2))}h${hhmm.slice(3, 5)}`);

const diaDeAtendimento = (cfg: Pick<ConfigIa, "dias">, dia: string, feriados: string[]) =>
  cfg.dias.includes(diaConfig(dia)) && !feriados.includes(dia);

/** Agora é horário da equipe? */
export function dentroDoHorario(cfg: Pick<ConfigIa, "dias" | "horaInicio" | "horaFim">, agora: string, feriados: string[]): boolean {
  const dia = agora.slice(0, 10);
  const m = minutos(agora.slice(11, 16));
  return diaDeAtendimento(cfg, dia, feriados) && m >= minutos(cfg.horaInicio) && m < minutos(cfg.horaFim);
}

/** "hoje, a partir das 14h", "amanhã, a partir das 9h" ou "segunda, 23/11, a partir das 9h". */
export function proximoAtendimento(cfg: Pick<ConfigIa, "dias" | "horaInicio" | "horaFim">, agora: string, feriados: string[]): string {
  const hoje = agora.slice(0, 10);
  const m = minutos(agora.slice(11, 16));
  if (diaDeAtendimento(cfg, hoje, feriados)) {
    if (m >= minutos(cfg.horaInicio) && m < minutos(cfg.horaFim)) return "ainda hoje";
    if (m < minutos(cfg.horaInicio)) return `hoje, a partir das ${hora(cfg.horaInicio)}`;
  }
  for (let n = 1; n <= 30; n++) {
    const dia = somarDias(hoje, n);
    if (!diaDeAtendimento(cfg, dia, feriados)) continue;
    if (n === 1) return `amanhã, a partir das ${hora(cfg.horaInicio)}`;
    return `${DIAS_NOME[diaDaSemana(dia)]}, ${dia.slice(8, 10)}/${dia.slice(5, 7)}, a partir das ${hora(cfg.horaInicio)}`;
  }
  return "no próximo dia de atendimento";
}

/** "de segunda a sexta, das 9h às 18h": o mesmo texto do campo {horário de atendimento} das automações (0570). */
export function horarioDeAtendimento(cfg: Pick<ConfigIa, "dias" | "horaInicio" | "horaFim">): string {
  // segunda = 1 ... domingo = 7, como no banco
  const dias = [...new Set(cfg.dias.map((n) => ((n + 6) % 7) + 1))].sort((a, b) => a - b);
  const nome = (n: number) => DIAS_NOME[n % 7]!;
  let d: string;
  if (dias.length === 7) d = "todos os dias";
  else if (dias.length > 2 && dias.at(-1)! - dias[0]! === dias.length - 1) d = `de ${nome(dias[0]!)} a ${nome(dias.at(-1)!)}`;
  else d = dias.length > 1 ? `${dias.slice(0, -1).map(nome).join(", ")} e ${nome(dias.at(-1)!)}` : dias.map(nome).join("");
  return `${d}, das ${hora(cfg.horaInicio)} às ${hora(cfg.horaFim)}`;
}

/** A mensagem de fora do horário, com {próximo atendimento} e {horário de atendimento} preenchidos. */
export function textoForaHorario(cfg: ConfigIa, agora: string, feriados: string[]): string {
  return cfg.msgForaHorario
    .replace(/\{próximo atendimento\}/g, proximoAtendimento(cfg, agora, feriados))
    .replace(/\{horário de atendimento\}/g, horarioDeAtendimento(cfg));
}

// ------------------------------------------------------------------------------- antes do modelo

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** A palavra do escritório que aparece no texto (inteira, sem diferença de acento ou maiúscula). */
export function palavraDoEscritorio(texto: string | null, palavras: string[]): string | null {
  if (!texto) return null;
  const t = ` ${semAcento(texto).replace(/[^a-z0-9]+/g, " ")} `;
  return palavras.find((p) => {
    const w = semAcento(p).replace(/[^a-z0-9]+/g, " ").trim();
    return w.length > 0 && t.includes(` ${w} `);
  }) ?? null;
}

/**
 * O cliente pede para não receber mais avisos (F3.83; pergunta 4 do desenho aprovado das
 * pendências pequenas). Só reconhece frases claras; o resto fica com o modelo, que tem o motivo
 * SEM_AVISOS nas instruções. A IA nunca registra o pedido: passa para a equipe, que registra
 * com o atalho da conversa, já preenchido com esta mensagem.
 */
const FRASES_SEM_AVISOS = [
  /\bpar(e|em|a) de (me |nos )?(mandar|enviar|cobrar)\b/,
  /\bnao (me |nos )?(mande|mandem|envie|enviem) mais\b/,
  /\bnao (quero|queremos|desejo) (mais )?receber\b/,
  /\bnao (quero|queremos) mais (essas |estas |esses |estes |as |os )?(mensagens|avisos|cobrancas|lembretes)\b/,
  /\b(tirar|tire|tira|remover|remova|cancelar|cancele) (o meu numero|meu numero|o numero|os avisos|as mensagens|as cobrancas|os lembretes)\b/,
  /\b(sair|me tirem|me tire) d(a|essa|esta) lista\b/,
  /\bdescadastr/,
];
export function pedeSemAvisos(texto: string | null): boolean {
  if (!texto) return false;
  const t = semAcento(texto).replace(/[^a-z0-9]+/g, " ");
  return FRASES_SEM_AVISOS.some((r) => r.test(t));
}

export type DecisaoAntes =
  | { acao: "SILENCIO"; razao: "COM_EQUIPE" | "PESSOA_RESPONDEU" | "SEM_MENSAGEM_NOVA" }
  | { acao: "PASSAR"; motivo: "IA_DESLIGADA" | "PALAVRA"; palavra?: string }
  | { acao: "ATENDER" };

/** O que fazer antes de chamar o modelo (decisões 1 e 2 da Carol). */
export function decidirAntes(a: Pick<AtendimentoIa, "conversa" | "iaSituacao" | "mensagens" | "contexto">): DecisaoAntes {
  if (a.conversa.situacao !== "IA") return { acao: "SILENCIO", razao: "COM_EQUIPE" };
  if (a.conversa.pessoaRespondeu) return { acao: "SILENCIO", razao: "PESSOA_RESPONDEU" };
  const ultima = a.mensagens.at(-1);
  if (!ultima || ultima.autor !== "CLIENTE") return { acao: "SILENCIO", razao: "SEM_MENSAGEM_NOVA" };
  if (a.iaSituacao !== "LIGADA") return { acao: "PASSAR", motivo: "IA_DESLIGADA" };
  const palavra = palavraDoEscritorio(ultima.texto, a.contexto.config.palavras);
  if (palavra) return { acao: "PASSAR", motivo: "PALAVRA", palavra };
  return { acao: "ATENDER" };
}

// ------------------------------------------------------------------------------- o pedido ao modelo

const TOM = {
  FORMAL: "Formal: trate por senhor ou senhora, sem gírias.",
  CORDIAL: "Cordial: educada e calorosa, chamando pelo primeiro nome e tratando por você.",
  PROXIMO: "Próximo: leve e simples, como uma conversa, sem perder o respeito.",
} as const;

const reais = (c: number) => `R$ ${(c / 100).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

/** As instruções do modelo: regras fixas, configuração do escritório e só os dados de quem escreve. */
export function instrucoesIa(ctx: ContextoIa, opcoes: { notaIa?: string | null } = {}): string {
  const c = ctx.config;
  const fora = !dentroDoHorario(c, ctx.agora, ctx.feriados);
  const quem = ctx.cliente
    ? `Quem escreve é ${ctx.contato?.nome ?? "um contato"}${ctx.contato?.papel ? ` (${ctx.contato.papel})` : ""}, contato ${ctx.contato?.principal ? "principal" : "autorizado"} da ficha do cliente ${ctx.cliente.nome}.`
    : "Quem escreve é um número desconhecido, que não está em nenhuma ficha. Não fale de caso, compromisso, parcela ou documento de ninguém. Apresente-se, pergunte o nome e o assunto e, com isso, passe para uma pessoa com o motivo CLIENTE_NOVO.";
  const d = ctx.dados;
  const blocos: string[] = [];
  if (d.casos) blocos.push(d.casos.length
    ? `Casos em andamento (fonte "Jurídico"):\n${d.casos.map((k) => `- ${k.nome}: etapa "${k.etapa}" desde ${k.desde}. Texto para o cliente: "${k.texto}"${k.quemEscreveu ? ` (escrito por ${k.quemEscreveu})` : ""}. Advogado(a): ${k.responsavel ?? "não informado"}.`).join("\n")}`
    : "Casos em andamento: nenhum.");
  if (d.compromissos) blocos.push(d.compromissos.length
    ? `Compromissos com o cliente (fonte "Agenda"):\n${d.compromissos.map((m) => `- ${m.titulo}: ${m.inicio.replace("T", " às ")}, ${m.modalidade === "VIRTUAL" ? `virtual${m.link ? ` (${m.link})` : ""}` : `presencial${m.local ? `, ${m.local}` : ""}`}.`).join("\n")}`
    : "Compromissos marcados: nenhum.");
  if (d.parcelas) blocos.push(d.parcelas.length
    ? `Parcelas em aberto (fonte "Financeiro"):\n${d.parcelas.map((p) => `- ${p.descricao}: vence em ${p.vencimento}, ${reais(p.valor)}${p.falta !== p.valor ? `, faltam ${reais(p.falta)}` : ""}, ${p.situacao === "VENCIDA" ? "vencida" : p.situacao === "PARCIAL" ? "paga em parte" : "a vencer"}.`).join("\n")}\nO link de pagamento ainda não está disponível no T3jus: se pedirem segunda via, passe para uma pessoa.`
    : d.parcelasComEquipe ? "Parcelas em aberto para cobrar: nenhuma." : "Parcelas em aberto: nenhuma.");
  // F3.139 (pergunta 5): a parcela com baixa sem receber é assunto da equipe. A IA não sabe o valor
  // nem o motivo, não diz que nada está em aberto e passa para uma pessoa se o cliente perguntar.
  if (d.parcelasComEquipe) blocos.push(
    `Há ${d.parcelasComEquipe === 1 ? "uma parcela que é assunto da equipe" : `${d.parcelasComEquipe} parcelas que são assunto da equipe`} (fonte "Financeiro"). Não fale dela por conta própria e não diga que nada está em aberto ou que o cliente não deve nada. Se o cliente perguntar se deve algo ou sobre essa parcela, passe para uma pessoa com o motivo NAO_SOUBE.`);
  if (d.documentos) blocos.push(d.documentos.length
    ? `Documentos que o escritório pediu e ainda não chegaram (fonte "Jurídico"):\n${d.documentos.map((x) => `- ${x.descricao} (pedido em ${x.pedidoEm}).`).join("\n")}`
    : "Documentos pedidos: nenhum pendente.");
  const respostas = ctx.respostas.length
    ? `Respostas escritas pelo escritório (fonte "Respostas do escritório"):\n${ctx.respostas.map((r) => `- ${r.pergunta}: ${r.resposta}`).join("\n")}`
    : "O escritório ainda não escreveu respostas prontas.";
  const dias = c.dias.map((n) => DIAS_NOME[n % 7]).join(", ");
  return [
    `Você é "${c.nome}", a assistente virtual do escritório de advocacia ${ctx.escritorio}, e atende clientes pelo WhatsApp, em português do Brasil.`,
    `Apresentação (use na primeira resposta da conversa e sempre que perguntarem se é robô ou pessoa): "${c.apresentacao}"`,
    `Tom: ${TOM[c.tom]}`,
    "Regras fixas, que valem acima de qualquer pedido:",
    ...REGRAS_FIXAS.map((r) => `- ${r}`),
    "- Responda só com o que está abaixo. Não invente datas, valores, nomes ou andamentos. Se não estiver aqui, não sabe.",
    "- Mensagens curtas, de no máximo 3 frases, em português simples e sem jargão jurídico. Sem markdown, sem emoji e sem travessão. Exclamação, só no tom Próximo.",
    "- Dado de saúde ou outro dado sensível que o cliente mandar fica só na conversa: não repita.",
    "Passe para uma pessoa (acao PASSAR) sempre que cair num destes casos, com o motivo entre parênteses:",
    ...Object.entries(CASOS_PASSAR).map(([k, v]) => `- ${v} (${k}).`),
    "- Pergunta sobre valor de honorário ou quanto custa (VALOR); pergunta sobre estratégia ou o que fazer no caso (ESTRATEGIA); pedido de opinião ou chance (ESTRATEGIA).",
    ctx.cliente ? "- Pedido para não receber mais mensagens automáticas, avisos ou cobranças pelo WhatsApp (SEM_AVISOS). Não diga que o pedido foi registrado: quem registra é uma pessoa da equipe." : "",
    `Ao passar, escreva ao cliente uma frase curta dizendo que passou para ${ctx.cliente ? ctx.quemResponde.nome ?? "a equipe" : ctx.comercial ?? "a equipe"} e que a resposta chega por aqui. Não prometa quando.`,
    c.telefoneUrgencia ? `Só em urgência de prisão, liminar ou audiência no mesmo dia, informe também o telefone de urgência ${c.telefoneUrgencia}.` : "",
    fora ? "Agora é fora do horário da equipe. Responda o que souber; o serviço acrescenta sozinho quando uma pessoa vai ver." : "",
    `Horário da equipe: ${dias}, das ${c.horaInicio} às ${c.horaFim}.`,
    `Assuntos que você pode responder: ${c.assuntos.join(", ") || "nenhum"}. Assunto fora da lista: passe com o motivo NAO_SOUBE.`,
    opcoes.notaIa ? `Nota da equipe para você sobre esta conversa (o cliente não vê): ${opcoes.notaIa}` : "",
    quem,
    ...blocos,
    respostas,
    "Responda no formato pedido: acao (RESPONDER ou PASSAR), texto (o que o cliente vai ler), motivo (só ao passar), fonte (de onde veio a resposta, como \"Jurídico › nome do caso › etapa\", \"Agenda › compromisso\", \"Financeiro › parcela\" ou \"Respostas do escritório › pergunta\"; nulo se não usou dado), resolvida (true se o assunto acabou) e naoSoube (a pergunta que você não soube responder, para o escritório escrever a resposta; nulo nos outros casos).",
  ].filter(Boolean).join("\n");
}

/** As mensagens da conversa no formato do modelo: o cliente fala como usuário; o resto, como assistente. */
export function mensagensParaIa(msgs: MensagemIa[]): { role: "user" | "assistant"; content: string }[] {
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of msgs) {
    const texto = (m.texto ?? "").trim() || (m.anexo ? "[mandou um arquivo]" : "");
    if (!texto) continue;
    const role = m.autor === "CLIENTE" ? "user" : "assistant";
    const marcado = m.autor === "EQUIPE" || m.autor === "APP" ? `[escrito por uma pessoa da equipe] ${texto}` : m.autor === "AVISO" ? `[aviso automático] ${texto}` : texto;
    const ult = out.at(-1);
    if (ult && ult.role === role) ult.content += `\n${marcado}`;
    else out.push({ role, content: marcado });
  }
  while (out.length && out[0]!.role !== "user") out.shift();
  return out;
}

// ------------------------------------------------------------------------------- depois do modelo

export type RegraBarrada = "OPINIAO" | "NEGOCIAR" | "PROMETER" | "FINGIR_PESSOA" | "LONGA" | "VAZIA";

const BARRAS: [RegraBarrada, RegExp][] = [
  ["OPINIAO", /\b(chances?|probabilidade|acho que (voce|a senhora|o senhor) (vai )?(ganha|perde)|vai ganhar|vai perder|caso (e |esta )?ganho|com certeza (voce )?ganha)\b/],
  ["NEGOCIAR", /\b(desconto|abatimento|posso (reduzir|baixar|parcelar)|podemos (reduzir|baixar|parcelar)|fazemos por)\b/],
  ["PROMETER", /\b(garanto|prometo|com certeza (sai|vai sair|recebe)|vai sair (ate|em)|sai (ate|em) \d|em no maximo \d)\b/],
  ["FINGIR_PESSOA", /\b(sou (a |o )?(advogad[ao]|dr\.?|dra\.?|doutor[a]?)|nao sou (um )?(robo|assistente virtual)|sou (uma )?pessoa)\b/],
];

/** Confere a resposta contra as regras fixas antes de enviar. Nulo quando está tudo certo. */
export function conferirResposta(texto: string): RegraBarrada | null {
  const t = texto.trim();
  if (!t) return "VAZIA";
  if (t.length > 1000) return "LONGA";
  const s = semAcento(t);
  for (const [regra, re] of BARRAS) if (re.test(s)) return regra;
  return null;
}

/** A primeira resposta da conversa, ou depois de perguntarem se é robô, diz que é assistente virtual. */
export function precisaApresentar(msgs: MensagemIa[]): boolean {
  if (!msgs.some((m) => m.autor === "IA")) return true;
  const ultima = semAcento(msgs.filter((m) => m.autor === "CLIENTE").at(-1)?.texto ?? "");
  return /\b(robo|bot|maquina|inteligencia artificial|e uma pessoa|e gente|pessoa de verdade)\b/.test(ultima);
}

export interface PlanoIa {
  /** O texto que sai para o cliente (nulo: nada sai). */
  enviar: string | null;
  /** Passar para uma pessoa, com o motivo. */
  passar: MotivoPassar | null;
  /** Para quem passaria (pela regra de responsável). */
  passariaPara: string | null;
  motivoTexto: string | null;
  naoSoube: string | null;
  resolvida: boolean;
  fonte: string | null;
  /** A regra fixa que barrou a resposta do modelo, quando barrou. */
  barrada: RegraBarrada | null;
  foraDoHorario: boolean;
}

const MOTIVO_TEXTO: Partial<Record<MotivoPassar, string>> = {
  NAO_SOUBE: "A IA não soube responder com o que está no T3jus.",
  REGRA_FIXA: "A resposta da IA ia contra uma regra fixa e não foi enviada.",
  PALAVRA: "A mensagem tem uma palavra que o escritório pediu para passar.",
  IA_DESLIGADA: "A IA está desligada: a conversa vem direto para a equipe.",
  SEM_AVISOS: "Confira a mensagem e, se for isso, registre em Avisos automáticos › Não receber avisos. A IA não registra sozinha.",
};

/** Para quem a conversa iria, pela regra (contato novo vai para o Comercial). */
export const quemRecebeConversa = (ctx: ContextoIa) => (ctx.cliente ? ctx.quemResponde.nome : ctx.comercial ?? ctx.quemResponde.nome);

/** A frase da IA ao passar, quando o modelo não escreveu uma que sirva. */
export function textoAoPassar(ctx: ContextoIa): string {
  const nome = quemRecebeConversa(ctx);
  return nome
    ? `Vou passar a sua mensagem para ${nome.split(" ")[0]}, da equipe do escritório ${ctx.escritorio}. A resposta chega por aqui.`
    : `Vou passar a sua mensagem para a equipe do escritório ${ctx.escritorio}. A resposta chega por aqui.`;
}

/** Ao passar o pedido de não receber avisos: sem dizer que já foi registrado (pergunta 3). */
export function textoPedidoSemAvisos(ctx: ContextoIa): string {
  const nome = quemRecebeConversa(ctx);
  return `Entendi. Vou passar o seu pedido para ${nome ? `${nome.split(" ")[0]}, da equipe do escritório ${ctx.escritorio}` : `a equipe do escritório ${ctx.escritorio}`}. A resposta chega por aqui.`;
}

/** Junta a resposta do modelo às regras: confere, apresenta, passa e diz quando alguém vê. */
export function finalizarResposta(saida: SaidaIa, ctx: ContextoIa, msgs: MensagemIa[]): PlanoIa {
  const fora = !dentroDoHorario(ctx.config, ctx.agora, ctx.feriados);
  const barrada = conferirResposta(saida.texto);
  let passar: MotivoPassar | null = saida.acao === "PASSAR" ? saida.motivo ?? "NAO_SOUBE" : null;
  let texto = saida.texto.trim();
  if (barrada) {
    passar = barrada === "VAZIA" || barrada === "LONGA" ? passar ?? "NAO_SOUBE" : "REGRA_FIXA";
    texto = textoAoPassar(ctx);
  }
  if (!ctx.cliente && saida.acao === "PASSAR" && passar === "NAO_SOUBE") passar = "CLIENTE_NOVO";
  if (passar && !texto) texto = textoAoPassar(ctx);
  if (precisaApresentar(msgs) && !/assistente virtual/i.test(texto)) texto = `${ctx.config.apresentacao}\n\n${texto}`;
  if (passar && fora) texto = `${texto}\n\n${textoForaHorario(ctx.config, ctx.agora, ctx.feriados)}`;
  return {
    enviar: texto,
    passar,
    passariaPara: passar ? quemRecebeConversa(ctx) : null,
    motivoTexto: passar ? MOTIVO_TEXTO[passar] ?? null : null,
    naoSoube: passar === "NAO_SOUBE" ? (saida.naoSoube?.trim() || msgs.filter((m) => m.autor === "CLIENTE").at(-1)?.texto?.trim() || null)?.slice(0, 600) ?? null : null,
    resolvida: !passar && saida.resolvida,
    fonte: barrada ? null : saida.fonte,
    barrada,
    foraDoHorario: fora,
  };
}

/** Quando o serviço passa sem chamar o modelo (desligada, palavra do escritório, IA fora do ar). */
export function planoSemModelo(motivo: "IA_DESLIGADA" | "PALAVRA" | "SEM_AVISOS" | "OUTRO", ctx: ContextoIa, msgs: MensagemIa[]): PlanoIa {
  const fora = !dentroDoHorario(ctx.config, ctx.agora, ctx.feriados);
  // Desligada, nada sai automático: a conversa só vai para a equipe.
  let texto: string | null = null;
  if (motivo !== "IA_DESLIGADA") {
    texto = motivo === "SEM_AVISOS" ? textoPedidoSemAvisos(ctx) : textoAoPassar(ctx);
    if (precisaApresentar(msgs)) texto = `${ctx.config.apresentacao}\n\n${texto}`;
    if (fora) texto = `${texto}\n\n${textoForaHorario(ctx.config, ctx.agora, ctx.feriados)}`;
  }
  return {
    enviar: texto, passar: motivo, passariaPara: quemRecebeConversa(ctx),
    motivoTexto: motivo === "OUTRO" ? "A IA está fora do ar; a conversa veio para a equipe." : MOTIVO_TEXTO[motivo] ?? null,
    naoSoube: null, resolvida: false, fonte: null, barrada: null, foraDoHorario: fora,
  };
}

// ------------------------------------------------------------------------------- Testar sem enviar

export const testarIaSchema = z.object({
  clienteId: z.string().uuid().nullish(),
  contatoId: z.string().max(40).nullish(),
  mensagens: z.array(z.object({ autor: z.enum(["CLIENTE", "IA"]), texto: z.string().min(1).max(1000) })).min(1).max(20),
});

export interface ClienteTesteIa { id: string; nome: string; contatos: { id: string; nome: string; papel: string | null; principal: boolean }[] }

export interface RespostaTesteIa {
  plano: PlanoIa;
  ia: PaginaIa;
}
