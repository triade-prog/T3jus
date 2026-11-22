// Ficha do cliente ligada (F3.110, F3.111; AP-01, AP-05, IN-01, CH-10, EX-01): os textos do
// próximo passo, sem React, para os testes de unidade. Tela aprovada em
// docs/design/aprovadas/portal-ficha-cliente-ligada. O passo vem pronto do servidor.

import type { AreaPassoCliente, PassoCliente, TipoPassoCliente } from "@t3jus/domain";
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
  aba: (cliente: string, aba: AbaLigada) => `/clientes/${cliente}?aba=${aba}`,
};

const fuso = { timeZone: "America/Sao_Paulo" } as const;
/** "18/11" de uma data (aaaa-mm-dd) ou de um instante. */
export function dia(x: string | null | undefined): string {
  if (!x) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return diaCurto(x);
  return new Intl.DateTimeFormat("pt-BR", { ...fuso, day: "2-digit", month: "2-digit" }).format(new Date(x));
}

export const NOMES_AREA: Record<AreaPassoCliente, string> = { COMERCIAL: "Comercial", CONTRATOS: "Contratos", JURIDICO: "Jurídico" };

/** Quantos dos quatro passos (Proposta, Contrato, Assinatura, Caso) já foram feitos. */
export const PASSOS_FEITOS: Record<TipoPassoCliente, number> = {
  SEM_PROPOSTA: 0, PROPOSTA_RASCUNHO: 0, PROPOSTA_ANDAMENTO: 0, PROPOSTA_ACEITA: 1, CONTRATO_ELABORACAO: 2, CONTRATO_SEM_CASO: 3, CASO: 4,
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
        oque: i ? `${i.numero} em elaboração desde ${dia(i.criadoEm)}. Ao registrar a assinatura, o caso abre em Jurídico.` : "Há um contrato em elaboração, esperando a assinatura.",
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
    default: return null;
  }
}

/** "1 proposta", "2 contratos". */
export function contar(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}
