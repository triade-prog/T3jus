// Regras da carteira de escritórios (CO-01), separadas da tela para os testes: pendências de
// cada cliente, o que pede a pessoa agora, contagens, busca e ordem.

import { etapasImplantacao, type DatasContrato, type SocioCliente } from "@t3jus/domain";
import { esperando, haQuanto } from "./tempo.ts";

/** Uma linha de GET /v1/clientes. */
export interface ClienteCarteira {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  estagio: "IMPLANTACAO" | "ATIVO" | "ENCERRADO";
  funcoes: string[];
  situacoes: string[];
  criadoEm: string;
  socios: SocioCliente[];
  equipe: { pessoaId: string; nome: string; funcoes: string[] }[];
  ultimaAtividade: string;
  /** Fim do contrato registrado (marcado ou já encerrado); null enquanto não houver. */
  encerramento?: DatasContrato | null;
  /** Fatura do T3jus em atraso (CO-06): dias do atraso mais antigo; null sem atraso. */
  cobranca?: { atrasoDias: number | null; soConsultaDesde: string | null } | null;
}

/** Dias da fatura em atraso mais antiga (0 sem atraso). Não entra em "Com pendência". */
export const atrasoDe = (c: Pick<ClienteCarteira, "cobranca">) => c.cobranca?.atrasoDias ?? 0;

/** Só os escritórios com fatura em atraso, do atraso maior para o menor (desenho, decisão 23). */
export function comAtraso<T extends Pick<ClienteCarteira, "cobranca" | "nome" | "estagio">>(lista: T[]): T[] {
  return lista.filter((c) => atrasoDe(c) > 0).sort((a, b) => atrasoDe(b) - atrasoDe(a) || a.nome.localeCompare(b.nome, "pt-BR"));
}

/** O convite vale 1 hora (decisão da Carol, 18/11/2026). */
export const VALIDADE_CONVITE_MS = 60 * 60 * 1000;

export type Filtro = "TODOS" | "IMPLANTACAO" | "ATIVO" | "PENDENCIA" | "ENCERRADOS";
export type Ordem = "PENDENCIAS" | "RECENTES" | "ATIVIDADE" | "NOME" | "FIM" | "PROXIMO";

export const ORDENS: Record<Ordem, string> = {
  PENDENCIAS: "Pendências primeiro",
  RECENTES: "Cadastro mais recente",
  ATIVIDADE: "Atividade mais recente",
  NOME: "Nome",
  FIM: "Fim mais recente",
  PROXIMO: "Próximo passo",
};

/** As ordens de cada lista: a dos encerrados tem as suas (tela aprovada do F0.14). */
export const ORDENS_DA_LISTA: Record<"ABERTOS" | "ENCERRADOS", Ordem[]> = {
  ABERTOS: ["PENDENCIAS", "RECENTES", "ATIVIDADE", "NOME"],
  ENCERRADOS: ["FIM", "PROXIMO", "NOME"],
};

export const encerrado = (c: Pick<ClienteCarteira, "estagio">) => c.estagio === "ENCERRADO";

/** A próxima data de um encerrado: o fecho do acesso, durante a consulta; depois, o fim da guarda. */
export function proximoPasso(c: Pick<ClienteCarteira, "encerramento">): string {
  const e = c.encerramento;
  if (!e) return "9999-12-31";
  return e.situacao === "CONSULTA" ? e.acessoFechaEm : e.guardaAte;
}

export type Pendencia = "SEM_SOCIO" | "CONVITE_PENDENTE" | "SEM_CONTATO" | "SEM_CONTRATO";

export const TEXTOS_PENDENCIA: Record<Pendencia, string> = {
  SEM_SOCIO: "Sem sócio",
  CONVITE_PENDENTE: "Convite pendente",
  SEM_CONTATO: "Sem contato",
  SEM_CONTRATO: "Sem contrato",
};

/** Sócio que ainda não criou a senha (o mais recente, se houver mais de um). */
export function socioPendente(c: Pick<ClienteCarteira, "socios">): SocioCliente | null {
  if (c.socios.some((s) => s.senhaCriadaEm)) return null;
  return c.socios[c.socios.length - 1] ?? null;
}

export function conviteVencido(s: Pick<SocioCliente, "conviteEnviadoEm">, agora: Date = new Date()): boolean {
  return agora.getTime() - new Date(s.conviteEnviadoEm).getTime() > VALIDADE_CONVITE_MS;
}

export function pendencias(c: Pick<ClienteCarteira, "situacoes" | "socios"> & { estagio?: ClienteCarteira["estagio"] }): Pendencia[] {
  const lista: Pendencia[] = [];
  if (c.estagio === "ENCERRADO") return lista;
  if (c.situacoes.includes("SEM_SOCIO")) lista.push("SEM_SOCIO");
  else if (socioPendente(c)) lista.push("CONVITE_PENDENTE");
  if (c.situacoes.includes("SEM_CONTATO")) lista.push("SEM_CONTATO");
  if (c.situacoes.includes("SEM_CONTRATO")) lista.push("SEM_CONTRATO");
  return lista;
}

export function etapasDoCliente(c: Pick<ClienteCarteira, "situacoes" | "socios" | "equipe">) {
  return etapasImplantacao(c);
}

/** O que a coluna "Sócio dono" diz abaixo do nome. */
export function situacaoSocio(c: Pick<ClienteCarteira, "socios" | "estagio">, agora: Date = new Date()): { nome: string | null; detalhe: string } {
  const entrou = c.socios.find((s) => s.senhaCriadaEm);
  if (entrou) {
    return { nome: entrou.nome, detalhe: c.estagio === "ATIVO" ? `Desde ${dataSo(entrou.senhaCriadaEm!)}` : "Entrou no Portal" };
  }
  const pendente = socioPendente(c);
  if (pendente) {
    return { nome: pendente.nome, detalhe: conviteVencido(pendente, agora) ? "Link do convite venceu" : "Convite enviado, vale 1 hora" };
  }
  return { nome: null, detalhe: "Ainda não convidado" };
}

function dataSo(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

export interface Tarefa {
  clienteId: string;
  titulo: string;
  detalhe: string;
  /** Aba da ficha onde se resolve. */
  aba: "socio" | "ficha" | "contrato";
}

/**
 * "Pedem você agora": uma tarefa por cliente em implantação (a mais importante), do cliente
 * cadastrado há mais tempo para o mais novo, no máximo três.
 */
export function tarefasDaCarteira(lista: ClienteCarteira[], agora: Date = new Date(), maximo = 3): Tarefa[] {
  const tarefas: (Tarefa & { desde: number })[] = [];
  for (const c of lista) {
    if (c.estagio !== "IMPLANTACAO") continue;
    const p = pendencias(c);
    const base = { clienteId: c.id, desde: new Date(c.criadoEm).getTime() };
    const pendente = socioPendente(c);
    if (p.includes("SEM_SOCIO")) {
      tarefas.push({ ...base, aba: "socio", titulo: "Convidar o sócio", detalhe: `${c.nome} · cadastrado ${haQuanto(c.criadoEm, agora)}` });
    } else if (pendente && conviteVencido(pendente, agora)) {
      tarefas.push({ ...base, aba: "socio", titulo: "Reenviar o convite", detalhe: `${c.nome} · o link venceu sem a senha criada` });
    } else if (p.includes("SEM_CONTRATO")) {
      tarefas.push({ ...base, aba: "contrato", titulo: "Registrar o contrato", detalhe: c.nome });
    } else if (p.includes("SEM_CONTATO")) {
      tarefas.push({ ...base, aba: "ficha", titulo: "Completar o contato da ficha", detalhe: c.nome });
    } else if (pendente) {
      tarefas.push({ ...base, aba: "socio", titulo: "Acompanhar o convite", detalhe: `${c.nome} · enviado ${esperando(pendente.conviteEnviadoEm, agora)}` });
    } else if (etapasDoCliente(c).proxima === null) {
      tarefas.push({ ...base, aba: "socio", titulo: "Passar para ativo", detalhe: `${c.nome} · implantação pronta` });
    }
  }
  return tarefas
    .sort((a, b) => a.desde - b.desde)
    .slice(0, maximo)
    .map(({ desde: _, ...t }) => t);
}

export function contarCarteira(lista: ClienteCarteira[]): Record<Filtro, number> {
  // Encerrados não entram em "Todos" nem nos outros números.
  const abertos = lista.filter((c) => !encerrado(c));
  return {
    TODOS: abertos.length,
    IMPLANTACAO: abertos.filter((c) => c.estagio === "IMPLANTACAO").length,
    ATIVO: abertos.filter((c) => c.estagio === "ATIVO").length,
    PENDENCIA: abertos.filter((c) => pendencias(c).length > 0).length,
    ENCERRADOS: lista.length - abertos.length,
  };
}

const semAcento = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

/** Filtro do resumo, busca por nome, cidade ou sócio (sem acento nem maiúscula) e ordem. */
export function filtrarCarteira(lista: ClienteCarteira[], o: { filtro: Filtro; termo: string; ordem: Ordem }): ClienteCarteira[] {
  const t = semAcento(o.termo);
  const filtrados = lista.filter((c) => {
    if ((o.filtro === "ENCERRADOS") !== encerrado(c)) return false;
    if (o.filtro === "IMPLANTACAO" && c.estagio !== "IMPLANTACAO") return false;
    if (o.filtro === "ATIVO" && c.estagio !== "ATIVO") return false;
    if (o.filtro === "PENDENCIA" && pendencias(c).length === 0) return false;
    return !t || semAcento(`${c.nome} ${c.cidade ?? ""} ${c.uf ?? ""} ${c.socios.map((s) => s.nome).join(" ")}`).includes(t);
  });
  const porNome = (a: ClienteCarteira, b: ClienteCarteira) => a.nome.localeCompare(b.nome, "pt-BR");
  const ordens: Record<Ordem, (a: ClienteCarteira, b: ClienteCarteira) => number> = {
    PENDENCIAS: (a, b) => pendencias(b).length - pendencias(a).length || porNome(a, b),
    RECENTES: (a, b) => b.criadoEm.localeCompare(a.criadoEm) || porNome(a, b),
    ATIVIDADE: (a, b) => b.ultimaAtividade.localeCompare(a.ultimaAtividade) || porNome(a, b),
    NOME: porNome,
    FIM: (a, b) => (b.encerramento?.fimEm ?? "").localeCompare(a.encerramento?.fimEm ?? "") || porNome(a, b),
    PROXIMO: (a, b) => proximoPasso(a).localeCompare(proximoPasso(b)) || porNome(a, b),
  };
  return [...filtrados].sort(ordens[o.ordem]);
}
