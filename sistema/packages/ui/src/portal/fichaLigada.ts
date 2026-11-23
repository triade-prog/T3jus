// Ficha do cliente ligada (F3.110, F3.111; AP-01, AP-05, IN-01, CH-10, EX-01): os textos do
// próximo passo, sem React, para os testes de unidade. Tela aprovada em
// docs/design/aprovadas/portal-ficha-cliente-ligada. O passo vem pronto do servidor.

import { reais, type AreaPassoCliente, type PassoCliente, type PassoFechamento, type TipoPassoCliente } from "@t3jus/domain";
import { diaCurto } from "./agenda.ts";
import { primeiroNome } from "./equipe.ts";
import { juntarComE } from "./clientes.ts";

export type AbaLigada = "propostas" | "contratos" | "casos";

export const ROTAS_PASSO = {
  novaProposta: (cliente: string) => `/comercial/propostas/nova?cliente=${cliente}`,
  proposta: (id: string) => `/comercial/propostas/${id}`,
  responder: (id: string) => `/comercial/propostas/${id}?responder=1`,
  gerarContrato: (proposta: string) => `/contratos/contratos/novo?proposta=${proposta}`,
  contrato: (id: string) => `/contratos/contratos/${id}`,
  recebimentos: (id: string) => `/contratos/contratos/${id}?aba=recebimentos`,
  novoContrato: (cliente: string) => `/contratos/contratos/novo?cliente=${cliente}`,
  caso: (id: string) => `/juridico/casos/${id}`,
  /** O fechamento (EX-16): A receber com o êxito para conferir, a ficha do repasse e encerrar o contrato. */
  receber: "/financeiro/a-receber",
  repasse: (levantamento: string) => `/financeiro/repasses/${levantamento}`,
  encerrarContrato: (id: string) => `/contratos/contratos/${id}?encerrar=1`,
  aba: (cliente: string, aba: AbaLigada) => `/clientes/${cliente}?aba=${aba}`,
};

const fuso = { timeZone: "America/Sao_Paulo" } as const;
/** "18/11" de uma data (aaaa-mm-dd) ou de um instante. */
export function dia(x: string | null | undefined): string {
  if (!x) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return diaCurto(x);
  return new Intl.DateTimeFormat("pt-BR", { ...fuso, day: "2-digit", month: "2-digit" }).format(new Date(x));
}

export const NOMES_AREA: Record<AreaPassoCliente, string> = { COMERCIAL: "Comercial", CONTRATOS: "Contratos", JURIDICO: "Jurídico", FINANCEIRO: "Financeiro" };

/** Quantos dos quatro passos (Proposta, Contrato, Assinatura, Caso) já foram feitos. */
export const PASSOS_FEITOS: Record<TipoPassoCliente, number> = {
  SEM_PROPOSTA: 0, PROPOSTA_RASCUNHO: 0, PROPOSTA_ANDAMENTO: 0, PROPOSTA_ACEITA: 1, CONTRATO_ELABORACAO: 2, CONTRATO_SEM_CASO: 3, CASO: 4,
  FECHAMENTO: 4, CONTRATO_ATIVO: 3, ATENDIDO: 4,
};
export const TRILHA = ["Proposta", "Contrato", "Assinatura", "Caso"] as const;

const TITULOS: Record<TipoPassoCliente, string> = {
  SEM_PROPOSTA: "Fazer a proposta",
  PROPOSTA_RASCUNHO: "Enviar a proposta",
  PROPOSTA_ANDAMENTO: "Resposta da proposta",
  PROPOSTA_ACEITA: "Gerar o contrato",
  CONTRATO_ELABORACAO: "Colher a assinatura",
  CONTRATO_SEM_CASO: "Abrir o caso",
  CASO: "Caso em andamento",
  FECHAMENTO: "Fechar o caso",
  CONTRATO_ATIVO: "Contrato ativo",
  ATENDIDO: "Cliente atendido",
};

/** O que faz quem dá o passo, para "Quem … tem a área …". */
const ACAO: Record<TipoPassoCliente, string> = {
  SEM_PROPOSTA: "faz a proposta",
  PROPOSTA_RASCUNHO: "envia a proposta",
  PROPOSTA_ANDAMENTO: "registra a resposta",
  PROPOSTA_ACEITA: "gera o contrato",
  CONTRATO_ELABORACAO: "registra a assinatura",
  CONTRATO_SEM_CASO: "abre o caso",
  CASO: "vê o caso",
  FECHAMENTO: "faz este passo",
  CONTRATO_ATIVO: "vê o contrato",
  ATENDIDO: "faz a proposta",
};

export interface TextoPasso {
  sobre: string;
  titulo: string;
  oque: string;
  /** Quem pode, quando a pessoa não pode dar o passo. */
  semAcao: string | null;
  /** A coluna "Próximo passo" da lista: a linha e o detalhe. */
  curto: string;
  detalhe: string;
}

function quemPode(p: PassoCliente): string | null {
  if (p.pode) return null;
  const nomes = (p.quemPode ?? []).map(primeiroNome);
  const area = NOMES_AREA[p.area];
  return nomes.length
    ? `Quem ${ACAO[p.tipo]} tem a área ${area}: ${juntarComE(nomes)}.`
    : `Quem ${ACAO[p.tipo]} tem a área ${area}, e ninguém da equipe tem essa área ainda.`;
}

export function textoPasso(p: PassoCliente, nomeCliente: string): TextoPasso {
  const i = p.item;
  const primeiro = primeiroNome(nomeCliente);
  const semAcao = quemPode(p);
  const base = { sobre: "Próximo passo", titulo: TITULOS[p.tipo], semAcao };
  switch (p.tipo) {
    case "SEM_PROPOSTA":
      return { ...base, oque: `Nenhuma proposta aberta para ${primeiro}. A proposta já sai com o nome e a qualificação.`, curto: "Sem proposta", detalhe: "" };
    case "PROPOSTA_RASCUNHO":
      return {
        ...base,
        oque: i ? `${i.numero} em rascunho desde ${dia(i.criadaEm)}. Revise e marque como enviada.` : "Há uma proposta em rascunho.",
        curto: "Enviar a proposta", detalhe: i?.numero ? `${i.numero} em rascunho` : "",
      };
    case "PROPOSTA_ANDAMENTO": {
      const ret = i?.retorno;
      const oque = i
        ? `${i.numero}${i.enviadaEm ? ` enviada em ${dia(i.enviadaEm)}` : ""}${ret ? ` · retorno ${dia(ret.em)}${ret.responsavel ? `, com ${primeiroNome(ret.responsavel.nome)}` : ""}` : ""}.`
        : "Há uma proposta esperando a resposta.";
      return { ...base, oque, curto: "Resposta da proposta", detalhe: i?.numero ? `${i.numero}${ret ? ` · retorno ${dia(ret.em)}` : ""}` : "" };
    }
    case "PROPOSTA_ACEITA":
      return {
        ...base,
        oque: i ? `${i.numero} aceita${i.aceitaEm ? ` em ${dia(i.aceitaEm)}` : ""}. O contrato sai dela, com as condições já preenchidas.` : "A proposta foi aceita e falta o contrato.",
        curto: "Gerar o contrato", detalhe: i?.numero ? `${i.numero} aceita${i.aceitaEm ? ` em ${dia(i.aceitaEm)}` : ""}` : "",
      };
    case "CONTRATO_ELABORACAO":
      return {
        ...base,
        oque: i ? `${i.numero} em elaboração desde ${dia(i.criadoEm)}. ${i.juntarA ? `Ao registrar, o contrato entra no caso ${i.juntarA}, que já existe.` : "Ao registrar a assinatura, o caso abre em Jurídico."}` : "Há um contrato em elaboração, esperando a assinatura.",
        curto: "Colher a assinatura", detalhe: i?.numero ? `${i.numero} em elaboração` : "",
      };
    case "CONTRATO_SEM_CASO":
      return {
        ...base,
        oque: i ? `${i.numero} assinado${i.assinadoEm ? ` em ${dia(i.assinadoEm)}` : ""}, ainda sem caso. Nome, área e responsável vêm do contrato.` : "Há um contrato assinado sem caso.",
        curto: "Abrir o caso", detalhe: i?.numero ? `${i.numero} assinado, sem caso` : "",
      };
    case "CASO": {
      if (!i) {
        const resp = p.casoResponsavel?.nome;
        return {
          ...base, sobre: "Caso em andamento", titulo: "Caso aberto em Jurídico", semAcao: null,
          oque: resp ? `Caso aberto em Jurídico, com ${resp}.` : "Caso aberto em Jurídico.",
          curto: "Caso em andamento", detalhe: resp ? `com ${primeiroNome(resp)}` : "",
        };
      }
      const et = i.etapa ? `${i.etapa.nome}, ${i.etapa.ordem} de ${i.etapas ?? "?"}` : "Em andamento";
      return {
        ...base, sobre: "Caso em andamento", titulo: i.nome ?? "Caso",
        oque: `${et}${i.responsavel ? ` · com ${i.responsavel.nome}` : ""}.`,
        curto: "Caso em andamento", detalhe: i.etapa ? `${i.etapa.nome} · ${i.etapa.ordem} de ${i.etapas ?? "?"}` : "",
      };
    }
    case "CONTRATO_ATIVO": {
      const px = i?.proximo;
      return {
        ...base,
        oque: i ? `${i.numero} · ${i.objeto}. Sem caso, marcado na assinatura.${px ? ` Próximo recebimento em ${dia(px.vencimento)}${px.valor ? `, ${reais(px.valor)}` : ""}.` : ""}` : "Contrato ativo, sem caso.",
        curto: "Contrato ativo", detalhe: i?.numero ? `${i.numero} · sem caso` : "",
      };
    }
    case "FECHAMENTO": {
      const x = proximoDoFechamento(p);
      const faz = (p.quemPode ?? []).map(primeiroNome);
      return {
        ...base, sobre: "Próximo passo · fechamento",
        oque: oqueDoFechamento(p, primeiro),
        // Decisão 16: quem não tem a área do passo lê quem faz.
        semAcao: p.pode ? null : `Quem faz: a área ${NOMES_AREA[p.area]}, que não está liberada para você.${faz.length ? ` ${juntarComE(faz)}.` : ""}`,
        curto: "Fechar o caso", detalhe: x ? nomeDoPassoFechamento(x, primeiro).toLowerCase() : "",
      };
    }
    case "ATENDIDO": {
      const ca = i?.caso;
      return {
        ...base,
        oque: `Tudo acertado${i?.fim ? ` em ${dia(i.fim)}` : ""}.${ca?.nome ? ` ${ca.nome}: ${RESULTADO[ca.resultado ?? ""] ?? "encerrado"}, encerrado no escritório.` : ""}`,
        semAcao: null,
        curto: "Cliente atendido", detalhe: i?.fim ? `${ca ? "caso encerrado e acertado" : "contrato encerrado"} em ${dia(i.fim)}` : "",
      };
    }
  }
}

const RESULTADO: Record<string, string> = { GANHO: "ganho", PERDA: "perda", ACORDO: "acordo" };

// ------------------------------------------------------------------ o fechamento (EX-16)

/** O primeiro passo do fechamento que falta. */
export function proximoDoFechamento(p: PassoCliente): PassoFechamento | null {
  return p.item?.passos?.find((x) => !x.feito) ?? null;
}

export function nomeDoPassoFechamento(x: PassoFechamento, primeiro: string): string {
  return { EXITO: "Conferir o êxito", REPASSE: `Repassar a ${primeiro}`, FINANCEIRO: "Encerrar no financeiro", CONTRATO: "Encerrar o contrato" }[x.tipo];
}

/** "Quem faz" do fechamento, para quem pode (decisão 15). */
export function quemFazFechamento(p: PassoCliente): string {
  const faz = p.quemFaz ?? [];
  const area = NOMES_AREA[p.area];
  return faz.length ? `Quem faz: a área ${area} (${juntarComE(faz.map(primeiroNome))}).` : `Quem faz: a área ${area}.`;
}

/** O que foi feito ou o que falta, na linha de cada passo (decisão 14). */
export function detalheDoPassoFechamento(x: PassoFechamento, todos: PassoFechamento[]): string {
  const quem = x.por ? `${x.feito && x.tipo === "EXITO" && x.naoCobrado ? "Não cobrado, por" : x.tipo === "EXITO" ? "Conferido por" : "Por"} ${primeiroNome(x.por.nome)}` : "";
  const fin = todos.find((t) => t.tipo === "FINANCEIRO");
  const numeros = juntarComE((x.contratos ?? []).map((c) => c.numero));
  if (x.feito) {
    switch (x.tipo) {
      case "EXITO": return quem ? `${quem}${x.em ? ` em ${dia(x.em)}` : ""}` : x.naoCobrado ? "Não cobrado" : "Conferido";
      case "REPASSE": return x.em ? `Repassado em ${dia(x.em)}` : "Repassado";
      case "FINANCEIRO": return quem ? `${quem}${x.em ? ` em ${dia(x.em)}` : ""}` : "Encerrado";
      case "CONTRATO": return x.em ? `Encerrado em ${dia(x.em)}${x.comFinanceiro ? ", junto com o financeiro" : ""}` : "Encerrado";
    }
  }
  switch (x.tipo) {
    case "EXITO":
      return x.valor ? `Êxito de ${reais(x.valor)}${x.percentual ? ` (${(x.percentual / 100).toLocaleString("pt-BR")}%)` : ""}, calculado pelo contrato` : "Esperando a conferência";
    case "REPASSE":
      return x.valor ? `${reais(x.valor)}${x.prazo ? `, até ${dia(x.prazo)}` : ""}` : "Falta repassar";
    case "FINANCEIRO":
      if (x.valor === undefined || x.valor === null) return "Falta pagar terceiros";
      return x.valor > 0 ? `Faltam ${reais(x.valor)}${x.pendentes?.length ? `: ${juntarComE(x.pendentes)}` : ""}` : "Tudo recebido e repassado";
    case "CONTRATO":
      return fin?.feito ? "Não foi encerrado junto com o financeiro" : fin ? `${numeros}, junto com o financeiro` : numeros;
  }
}

function oqueDoFechamento(p: PassoCliente, primeiro: string): string {
  const i = p.item;
  const x = proximoDoFechamento(p);
  const ca = i?.caso;
  const res = RESULTADO[ca?.resultado ?? ""];
  const todos = i?.passos ?? [];
  const faltam = todos.filter((t) => !t.feito).length;
  const rep = todos.find((t) => t.tipo === "REPASSE");
  const fin = todos.find((t) => t.tipo === "FINANCEIRO");
  const numeros = juntarComE(todos.find((t) => t.tipo === "CONTRATO")?.contratos?.map((c) => c.numero) ?? []);
  switch (x?.tipo) {
    case "EXITO":
      return `${ca?.nome ?? "O caso"} terminou${res ? ` com ${res}` : ""}${ca?.encerradoEm ? ` em ${dia(ca.encerradoEm)}` : ""}. ${faltam === 1 ? "Falta 1 coisa" : `Faltam ${faltam} coisas`} para ${primeiro} sair do escritório com tudo acertado.`;
    case "REPASSE":
      return `${rep?.entrou ? `${NOMES_LEVANTAMENTO[rep.entrou.tipo] ?? "O dinheiro"} de ${reais(rep.entrou.valor)} entrou em ${dia(rep.entrou.em)}. ` : ""}A parte de ${primeiro} espera o repasse.`;
    case "FINANCEIRO":
      return `${rep?.feito && rep.em ? `${primeiro} recebeu em ${dia(rep.em)}. ` : ""}${fin?.pendentes?.length ? `No financeiro do caso ainda ${fin.pendentes.length === 1 ? "falta" : "faltam"} ${juntarComE(fin.pendentes)}.` : "O acerto do caso está com o Financeiro."}`;
    case "CONTRATO":
      return fin?.feito
        ? `O caso foi encerrado no financeiro${fin.em ? ` em ${dia(fin.em)}` : ""}. ${numeros ? `O contrato ${numeros} ficou ativo` : "O contrato ficou ativo"}, sem nada a cobrar.`
        : `${ca?.nome ?? "O caso"} terminou${res ? ` com ${res}` : ""}. ${numeros ? `O contrato ${numeros} ainda está ativo.` : "O contrato ainda está ativo."}`;
    default:
      return "O fechamento do caso está em andamento.";
  }
}

const NOMES_LEVANTAMENTO: Record<string, string> = { RPV: "A RPV", ALVARA: "O alvará", PRECATORIO: "O precatório", ACORDO: "O acordo" };

/** O botão da próxima coisa do fechamento (decisão 15). */
export function botaoDoFechamento(x: PassoFechamento): { rotulo: string; href: string | null; icone: "moeda" | "enviar" | "cadeado" | "pasta" } {
  switch (x.tipo) {
    case "EXITO": return { rotulo: "Conferir o êxito", href: ROTAS_PASSO.receber, icone: "moeda" };
    case "REPASSE": return { rotulo: "Registrar o repasse", href: x.levantamentoId ? ROTAS_PASSO.repasse(x.levantamentoId) : null, icone: "enviar" };
    case "FINANCEIRO": return { rotulo: "Ver o acerto", href: x.levantamentoId ? ROTAS_PASSO.repasse(x.levantamentoId) : null, icone: "cadeado" };
    case "CONTRATO": {
      const c = x.contratos?.[0];
      return { rotulo: "Encerrar o contrato", href: c ? ROTAS_PASSO.encerrarContrato(c.id) : null, icone: "pasta" };
    }
  }
}

/** O título do botão principal do passo. */
export const BOTAO_PASSO: Record<TipoPassoCliente, string> = {
  SEM_PROPOSTA: "Gerar proposta",
  PROPOSTA_RASCUNHO: "Ver a proposta",
  PROPOSTA_ANDAMENTO: "Registrar resposta",
  PROPOSTA_ACEITA: "Gerar contrato",
  CONTRATO_ELABORACAO: "Registrar assinatura",
  CONTRATO_SEM_CASO: "Abrir o caso",
  CASO: "Ver o caso",
  FECHAMENTO: "Ver o acerto",
  CONTRATO_ATIVO: "Ver o contrato",
  ATENDIDO: "Gerar proposta",
};

/** Para onde o botão leva; null quando abre uma janela na própria ficha. */
export function destinoPasso(p: PassoCliente, cliente: string): string | null {
  const id = p.item?.id;
  switch (p.tipo) {
    case "SEM_PROPOSTA": return ROTAS_PASSO.novaProposta(cliente);
    case "PROPOSTA_RASCUNHO": return id ? ROTAS_PASSO.proposta(id) : null;
    case "PROPOSTA_ANDAMENTO": return id ? ROTAS_PASSO.responder(id) : null;
    case "PROPOSTA_ACEITA": return id ? ROTAS_PASSO.gerarContrato(id) : null;
    case "CASO": return id ? ROTAS_PASSO.caso(id) : null;
    case "CONTRATO_ATIVO": return id ? ROTAS_PASSO.contrato(id) : null;
    case "ATENDIDO": return ROTAS_PASSO.novaProposta(cliente);
    case "FECHAMENTO": {
      const x = proximoDoFechamento(p);
      return x ? botaoDoFechamento(x).href : null;
    }
    default: return null;
  }
}

/** "1 proposta", "2 contratos". */
export function contar(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}
