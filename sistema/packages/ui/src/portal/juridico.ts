// Jurídico do Portal, parte 1 (EX-01, EX-03, EX-07, EX-14): rotas, textos e contas da tela,
// sem React, para os testes de unidade. As regras de verdade estão no servidor.

import { AREAS_DIREITO, formatarCnj, PAPEIS_CASO, type AreaDireito, type EnvioEtapa, type Etapa, type LinhaCaso, type PapelCaso } from "@t3jus/domain";

export const ROTAS_JURIDICO = {
  casos: "/juridico/casos",
  novo: "/juridico/casos/novo",
  etapas: "/juridico/casos/etapas",
  caso: (id: string) => `/juridico/casos/${id}`,
  contrato: (id: string) => `/contratos/contratos/${id}`,
  cliente: (id: string) => `/clientes/${id}`,
};

/** "1001234-77.2026.5.02.0011 · Trabalhista", ou "Sem número ainda · Família". */
export function linhaProcesso(c: Pick<LinhaCaso, "numero" | "area">): string {
  return `${c.numero ? formatarCnj(c.numero) : "Sem número ainda"} · ${AREAS_DIREITO[c.area as AreaDireito] ?? c.area}`;
}

/** As etapas do andamento (sem a final, que encerra) e a posição do caso: "5 de 8". */
export function posicaoEtapa(ordem: number, etapas: Pick<Etapa, "ordem">[]): string {
  return `${ordem} de ${etapas.length}`;
}

/** "Desde 07/11. Próxima: Recurso." */
export function proximaEtapa(ordem: number, etapas: Pick<Etapa, "ordem" | "nome">[]): string | null {
  return etapas.find((e) => e.ordem === ordem + 1)?.nome ?? null;
}

/** O papel em palavras, com o gênero neutro do desenho. */
export const nomePapel = (p: PapelCaso) => PAPEIS_CASO[p];

/** "Joana Pereira e Carlos Henrique Dias"; com 3 ou mais, vírgulas e "e" no fim. */
export function juntarNomes(l: string[]): string {
  return l.length <= 1 ? (l[0] ?? "") : `${l.slice(0, -1).join(", ")} e ${l[l.length - 1]}`;
}

/** Texto do botão de mudar etapa (decisão 5). */
export function botaoMudar(para: string | null, final: boolean, avisar: boolean): string {
  if (!para) return "Mudar etapa";
  if (final) return avisar ? "Encerrar e avisar" : "Encerrar o caso";
  return avisar ? `Mudar para ${para} e avisar` : `Mudar para ${para}`;
}

/** "(11) 98552-1034" a partir de "+5511985521034". */
export function telefoneBr(t: string | null | undefined): string {
  const d = (t ?? "").replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t ?? "";
}

// ------------------------------------------------------------------------- Parte 2: prazos e tarefas

export const ROTAS_PRAZOS_TAREFAS = { prazos: "/juridico/prazos", tarefas: "/juridico/tarefas" };

const SEMANA = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
const diasAte = (de: string, ate: string) => Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);
const semanaDe = (d: string) => (new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7;
const somar = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

/** A urgência escrita do prazo (decisão 9): a cor só reforça. */
export function urgenciaPrazo(data: string, hoje: string): { texto: string; tom: "urgente" | "atencao" | "neutro" } {
  const n = diasAte(hoje, data);
  if (n < 0) return { texto: n === -1 ? "Venceu ontem" : `Venceu ${ddmm(data)}`, tom: "urgente" };
  if (n === 0) return { texto: "Vence hoje", tom: "urgente" };
  if (n === 1) return { texto: "Amanhã", tom: "atencao" };
  return { texto: `Em ${n} dias`, tom: "neutro" };
}

/** O vencimento da tarefa (decisão 10). */
export function urgenciaTarefa(data: string, hoje: string): { texto: string; tom: "urgente" | "atencao" | "neutro" } {
  const n = diasAte(hoje, data);
  if (n < 0) return { texto: n === -1 ? "Venceu ontem" : `Venceu ${ddmm(data)}`, tom: "urgente" };
  if (n === 0) return { texto: "Hoje", tom: "urgente" };
  if (n === 1) return { texto: "Amanhã", tom: "atencao" };
  return { texto: `${ddmm(data)} · ${SEMANA[semanaDe(data)]!.slice(0, 3)}`, tom: "neutro" };
}

/** "fazer até hoje", "fazer até amanhã", "fazer até 01/12". */
export function textoFazerAte(data: string, hoje: string): string {
  const n = diasAte(hoje, data);
  return `fazer até ${n === 0 ? "hoje" : n === 1 ? "amanhã" : n < 0 ? `${ddmm(data)} (passou)` : ddmm(data)}`;
}

/** Os grupos de Prazos: Vencidos, Hoje, Amanhã, Até sexta (o resto da semana útil) e Depois. */
export function gruposPrazos<T extends { dataFinal: string }>(lista: T[], hoje: string): { chave: string; titulo: string; itens: T[] }[] {
  const fimSemana = somar(hoje, 4 - semanaDe(hoje));
  const nome = (d: string) => `${SEMANA[semanaDe(d)]}, ${ddmm(d)}`;
  const g = [
    { chave: "vencidos", titulo: "Vencidos", itens: [] as T[] },
    { chave: "hoje", titulo: `Hoje · ${nome(hoje)}`, itens: [] as T[] },
    { chave: "amanha", titulo: `Amanhã · ${nome(somar(hoje, 1))}`, itens: [] as T[] },
    { chave: "semana", titulo: "Até sexta", itens: [] as T[] },
    { chave: "depois", titulo: "Depois", itens: [] as T[] },
  ];
  for (const p of lista) {
    const n = diasAte(hoje, p.dataFinal);
    const i = n < 0 ? 0 : n === 0 ? 1 : n === 1 ? 2 : p.dataFinal <= fimSemana ? 3 : 4;
    g[i]!.itens.push(p);
  }
  return g.filter((x) => x.itens.length);
}

/** Os grupos de Tarefas: Atrasadas, Hoje, Esta semana, Depois e Esperando alguém. */
export function gruposTarefas<T extends { venceEm: string; esperando: string | null }>(lista: T[], hoje: string): { chave: string; titulo: string; itens: T[] }[] {
  const fimSemana = somar(hoje, 6 - semanaDe(hoje));
  const g = [
    { chave: "atrasadas", titulo: "Atrasadas", itens: [] as T[] },
    { chave: "hoje", titulo: "Hoje", itens: [] as T[] },
    { chave: "semana", titulo: "Esta semana", itens: [] as T[] },
    { chave: "depois", titulo: "Depois", itens: [] as T[] },
    { chave: "esperando", titulo: "Esperando alguém", itens: [] as T[] },
  ];
  for (const t of lista) {
    const i = t.esperando ? 4 : t.venceEm < hoje ? 0 : t.venceEm === hoje ? 1 : t.venceEm <= fimSemana ? 2 : 3;
    g[i]!.itens.push(t);
  }
  return g.filter((x) => x.itens.length);
}

/** "Esperando o cliente: CTPS digital, pedida há 8 dias". */
export function textoEsperando(oque: string, desde: string | null, hoje: string): string {
  const n = desde ? diasAte(desde, hoje) : 0;
  const quando = !desde ? "" : n <= 0 ? ", desde hoje" : n === 1 ? ", desde ontem" : `, há ${n} dias`;
  return `Esperando ${oque}${quando}`;
}

/** "26/11 · qui". */
export function diaDaSemanaCurto(data: string): string {
  return `${ddmm(data)} · ${SEMANA[semanaDe(data)]!.slice(0, 3)}`;
}

// ------------------------------------------------------------------------- Aviso de etapa (F3.37)

/** Se o aviso de etapa sai agora: o WhatsApp do escritório e a automação "Etapa do caso". */
export function fraseAvisoEtapa(a: { whatsappLigado: boolean; automacaoLigada: boolean } | undefined): { sai: boolean; texto: string } {
  if (!a?.whatsappLigado) {
    return { sai: false, texto: "O WhatsApp do escritório ainda não está ligado ao T3jus: o aviso fica guardado nas mudanças de etapa, pronto para copiar e mandar." };
  }
  if (!a.automacaoLigada) {
    return { sai: false, texto: "A automação “Etapa do caso” está desligada em Conversas: o aviso fica guardado nas mudanças de etapa e não sai." };
  }
  return { sai: true, texto: "Sai pela automação “Etapa do caso”, pelo WhatsApp do escritório, para cada cliente no próprio número." };
}

const ENVIO_ETAPA: Record<string, string> = { NA_FILA: "na fila", ENVIADA: "enviado", ENTREGUE: "entregue", LIDA: "lido", FALHOU: "não entregue" };

/** Onde está o aviso de etapa de um cliente: na fila, entregue, lido, ou por que não saiu. */
export function situacaoEnvioEtapa(e: EnvioEtapa): string {
  if (e.mensagem) return ENVIO_ETAPA[e.mensagem.envio] ?? "na fila";
  if (e.situacao === "FICOU_DE_FORA" || e.situacao === "FALHOU") {
    const m = e.motivo ?? "não saiu.";
    return `não saiu: ${m.charAt(0).toLowerCase()}${m.slice(1)}`;
  }
  return "ainda não saiu";
}
