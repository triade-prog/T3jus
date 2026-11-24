"use client";
// O sino de avisos do Portal (F3.57; PD-07, PA-01, PT-03). Tela aprovada em
// docs/design/aprovadas/portal-sem-avisos-sino (sino.html). O botão fica na moldura (no topo do
// computador e na barra vinho do celular), com o ponto quando há aviso novo e o número no rótulo.
// No computador o painel desce do sino sem cobrir a página; no celular ocupa a tela. Cada aviso
// leva ao lugar certo e, ao abrir, fica lido. Decisões da Carol (20/11/2026): só o ponto no sino,
// só no sino (sem e-mail), 30 dias, sem desligar tipos, abrir marca lido.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  MOTIVOS_NAO_COBRAR, quandoDia, quandoEncerrouNoFinanceiro, reais,
  type AreaPortal, type AvisoSino, type ContratoNoAviso, type ListaAvisosSino, type MotivoNaoCobrar,
} from "@t3jus/domain";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { Aviso, Estado } from "../console/pecas.tsx";
import { hora } from "../console/tempo.ts";
import { chamarPortal, ROTAS_PORTAL } from "./Moldura.tsx";
import { valorDaProposta } from "./comercial.ts";
import { juntarComE } from "./clientes.ts";
import { ROTAS_CONTRATOS } from "./contratos.ts";
import { nomeDaParcela } from "./baixa.ts";
import { linkFechamentoContrato } from "./fechamento.ts";
import { ROTAS_PASSO } from "./fichaLigada.ts";
import { ROTAS_JURIDICO } from "./juridico.ts";

const FUSO = "America/Sao_Paulo";
const diaDe = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const MOTIVOS_IA: Record<string, string> = {
  PROPOSTA_ACORDO: "Proposta de acordo.", DOCUMENTO_NOVO: "Chegou um documento.", CLIENTE_NOVO: "Pode ser um cliente novo.", VALOR: "Pergunta de valor.",
  ESTRATEGIA: "Pergunta sobre a estratégia do caso.", RECLAMACAO: "Reclamação.", PEDIU_PESSOA: "Pediu para falar com uma pessoa.", OUTRO: "A IA não soube responder.",
};

/** Rótulo do dia: Hoje, Ontem · 17/11 ou 16/11. */
export function rotuloDia(iso: string, agora = new Date()): string {
  const d = diaDe(iso);
  const hoje = diaDe(agora.toISOString());
  const ontem = diaDe(new Date(agora.getTime() - 86_400_000).toISOString());
  const curto = `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  return d === hoje ? "Hoje" : d === ontem ? `Ontem · ${curto}` : curto;
}

/** "a petição “Recurso ordinário”" (sem artigo do modelo, que pode ser masculino ou feminino). */
const minuscula = (m?: string) => (m ? `a petição “${m}”` : "a petição");

// ------------------------------------------------------------------ Caso pronto para encerrar (F3.147)
// Desenho aprovado em docs/design/aprovadas/portal-sino-caso-encerrado (NOTAS.md, os textos exatos).
// Nenhum valor em reais (PT-02): o aviso diz quantas parcelas, quem fez e o que aconteceu.

type DadosAviso = AvisoSino["dados"];
type Selo = { tom: string; texto: string };

/** Os clientes do caso: "A", "A e B" ou "A, B e mais N clientes". */
export function nomesClientes(d: DadosAviso): string {
  const nomes = d.clientes?.length ? d.clientes : [d.cliente ?? "o cliente"];
  const mais = d.maisClientes ?? 0;
  if (mais > 0) return `${nomes.join(", ")} e mais ${mais} ${mais === 1 ? "cliente" : "clientes"}`;
  return juntarComE(nomes);
}

/** "As 7 parcelas de A e B foram pagas." (uma parcela só: "A parcela de A foi paga."). */
const parcelasPagas = (n: number | undefined, clientes: string) =>
  n === 1 ? `A parcela de ${clientes} foi paga.` : `As ${n ?? 0} parcelas de ${clientes} foram pagas.`;
const parcelasJaPagas = (n: number | undefined) =>
  !n ? "" : n === 1 ? " A parcela já estava paga." : ` As ${n} parcelas já estavam pagas.`;

/** O que deixou o caso pronto, sem o "Confira o acerto e encerre.". */
export function fraseCasoPronto(d: DadosAviso): string {
  const quem = d.quem;
  const cl = nomesClientes(d);
  const nada = `nada falta receber de ${cl}.`;
  if (!quem || d.motivo === "ROTINA") return `Nada falta receber de ${cl}.`;
  switch (d.motivo) {
    case "PAGAMENTO":
      return `${quem} registrou a última parcela. ${parcelasPagas(d.parcelas, cl)}`;
    case "REEMBOLSO":
      return d.denovo && d.reembolso
        ? `${quem} marcou o reembolso da ${d.reembolso.toLowerCase()}, e a pendência que tinha voltado foi resolvida.`
        : `${quem} marcou o último reembolso, e ${nada}`;
    case "EXITO":
      return d.exito === "PAGO"
        ? `${quem} registrou o pagamento do êxito de ${cl}.`
        : `${quem} marcou o êxito de ${cl} como não cobrado.${parcelasJaPagas(d.parcelas)}`;
    case "BAIXA":
      return `${quem} deu baixa sem receber na ${d.parcela ? nomeDaParcela(d.parcela) : "parcela"}, e nada falta receber de ${d.clienteParcela ?? cl}.`;
    case "CONTRATO_ENCERRADO":
      return `${quem} encerrou o ${d.contratoEncerrado ?? d.contrato ?? "contrato"}, e as parcelas que faltavam foram canceladas.`;
    case "CASO_ENCERRADO":
      return `${quem} encerrou o caso, e ${nada}`;
    case "OUTRO_CASO":
      return `${quem} ligou o ${d.contratoSegue ?? "contrato"} ao caso ${d.outroCaso ?? "em andamento"}, em andamento. As parcelas que faltam seguem com ele, e ${nada}`;
    default:
      return `Nada falta receber de ${cl}.`;
  }
}

/** Revisão do código, nota 1 (pergunta 2): sem o Financeiro, o aviso do carnê não diz quem deu ou
 *  desfez a baixa sem receber; o servidor não manda "quem", e a frase fica sem autor. */
export function baixaSemQuem(d: DadosAviso): string | null {
  if (d.quem || (d.motivo !== "BAIXADA" && d.motivo !== "BAIXA_DESFEITA")) return null;
  const p = d.parcela ? nomeDaParcela(d.parcela) : "parcela";
  return d.motivo === "BAIXADA" ? `A ${p} teve baixa sem receber.` : `A ${p} voltou para A receber.`;
}

/** O estado de agora do aviso: o selo, o destino, a linha "Agora:" e o trecho para o leitor de tela.
 *  Sem "agora", o caso continua pronto (null). */
export function agoraCasoPronto(a: AvisoSino, agora: Date = new Date()): { selo: Selo; onde: string; linha: string; paraLeitor: string } | null {
  const x = a.agora;
  const no = a.dados.contrato ? ` no ${a.dados.contrato}` : "";
  if (x?.encerrado) {
    return {
      selo: { tom: "neutro", texto: "Encerrado" }, onde: `Ver o fechamento${no}`, paraLeitor: ". Agora: encerrado.",
      linha: `${x.encerrado.por?.nome ?? "Alguém da equipe"} encerrou no financeiro ${quandoEncerrouNoFinanceiro(x.encerrado.em, agora)}.`,
    };
  }
  if (x?.depois) {
    return { selo: { tom: "neutro", texto: "Aviso antigo" }, onde: `Ver o acerto${no}`, paraLeitor: ". Agora: aviso antigo, há um mais novo.",
      linha: "o caso ficou pronto de novo; veja o aviso mais novo." };
  }
  if (x?.pendente) {
    return { selo: { tom: "atencao", texto: "Voltou a ter pendência" }, onde: `Ver o acerto${no}`, paraLeitor: ". Agora: voltou a ter pendência.",
      linha: "depois deste aviso, o acerto voltou a ter pendência." };
  }
  if (x?.fora) {
    return { selo: { tom: "neutro", texto: "Fecha no repasse" }, onde: `Ver o fechamento${no}`, paraLeitor: ". Agora: fecha no repasse.",
      linha: "entrou RPV ou alvará neste caso, e o fechamento passou para a ficha do repasse." };
  }
  return null;
}

// ------------------------------------------------------------------ Caso encerrado no financeiro (F3.150)
// Desenho aprovado em docs/design/aprovadas/portal-sino-caso-fechou (NOTAS.md, os textos exatos).
// Dois papéis: quem encerra contratos (CONTRATOS), só quando sobrou contrato aberto, e quem é
// responsável pelo caso (RESPONSAVEL). Nenhum valor em reais (PT-02). O "Agora:" vem de
// agoraFechou, que o servidor lê na hora; "você" também vem do servidor (voce).

/** "o C-2026-012, de Noemi Bastos Carvalho" (sem cliente: "o C-2026-012"). */
export function contratoCom(c: ContratoNoAviso): string {
  return `o ${c.numero}${c.cliente ? `, de ${c.cliente}` : ""}`;
}

/** "o C-1, de A", "o C-1, de A, e o C-2, de B" ou "o C-1, de A, o C-2, de B, e mais N contratos". */
export function listaContratos(cs: ContratoNoAviso[]): string {
  const [a, b] = cs;
  if (!a) return "";
  if (!b) return contratoCom(a);
  const sep = (c: ContratoNoAviso) => (c.cliente ? ", e " : " e ");
  if (cs.length === 2) return `${contratoCom(a)}${sep(b)}${contratoCom(b)}`;
  const mais = cs.length - 2;
  return `${contratoCom(a)}, ${contratoCom(b)}, e mais ${mais} ${mais === 1 ? "contrato" : "contratos"}`;
}

/** "o C-1" ou, com mais de um, "os contratos C-1 e C-2". */
export function numeros(cs: { numero: string }[]): string {
  return cs.length === 1 ? `o ${cs[0]!.numero}` : `os contratos ${juntarComE(cs.map((c) => c.numero))}`;
}

/** A lista seguida de verbo: com o cliente no fim, fecha o aposto com vírgula ("…, de Noemi, continua aberto"). */
const listaAntesDoVerbo = (cs: ContratoNoAviso[]) => `${listaContratos(cs)}${cs.length <= 2 && cs.at(-1)?.cliente ? "," : ""}`;
const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const ehResponsavel = (d: DadosAviso) => d.papel === "RESPONSAVEL";

/** O detalhe do aviso. Com semPedido (o "Agora:" já resolveu), sai o "Encerre …". */
export function fraseCasoFechou(d: DadosAviso, semPedido = false): string {
  const quem = d.quem ?? "Alguém da equipe";
  const abertos = d.abertos ?? [];
  const seguem = d.seguem ?? [];
  if (!ehResponsavel(d)) {
    if (!abertos.length) return `${quem} encerrou o caso no financeiro.`;
    const pedido = semPedido ? "" : abertos.length === 1 ? " Encerre o contrato." : " Encerre os contratos.";
    return abertos.length === 1
      ? `${quem} encerrou o caso no financeiro, e ${listaAntesDoVerbo(abertos)} continua aberto.${pedido}`
      : `${quem} encerrou o caso no financeiro, e continuam abertos ${listaContratos(abertos)}.${pedido}`;
  }
  const juntos = d.juntos ?? [];
  const ja = d.jaEncerrados ?? [];
  const partes: string[] = [];
  if (juntos.length === 1) partes.push(`${quem} encerrou o caso no financeiro e, junto, ${contratoCom(juntos[0]!)}.`);
  else if (juntos.length > 1) partes.push(`${quem} encerrou o caso no financeiro e, junto, ${numeros(juntos)}.`);
  else {
    partes.push(`${quem} encerrou o caso no financeiro.`);
    if (ja.length === 1) partes.push(`${maiuscula(listaAntesDoVerbo([ja[0]!]))} já estava encerrado.`);
    else if (ja.length > 1) partes.push("Os contratos já estavam encerrados.");
  }
  if (abertos.length) {
    const nomes = d.quemContratos ?? [];
    partes.push(`Quem encerra ${listaAntesDoVerbo(abertos)} é a área Contratos${nomes.length ? ` (${juntarComE(nomes)})` : ""}.`);
  }
  for (const c of seguem) {
    partes.push(`${maiuscula(listaAntesDoVerbo([c]))} fica aberto, porque as parcelas seguem com o caso ${c.outroCaso ?? "em andamento"}.`);
  }
  if (!abertos.length && !seguem.length) partes.push("O fechamento do caso terminou.");
  return partes.join(" ");
}

const FALTA_UM: Selo = { tom: "andamento", texto: "Falta o contrato" };
const FALTAM: Selo = { tom: "andamento", texto: "Faltam os contratos" };
const SEGUE: Selo = { tom: "neutro", texto: "Segue com outro caso" };
const FEITO: Selo = { tom: "ok", texto: "Fechamento feito" };

/** O selo sem agoraFechou. */
export function seloCasoFechou(d: DadosAviso): Selo {
  const n = d.abertos?.length ?? 0;
  if (n) return n === 1 ? FALTA_UM : FALTAM;
  if (d.seguem?.length) return SEGUE;
  return FEITO;
}

/** O trecho para o leitor de tela sem agoraFechou: o que o selo diz, sempre presente. */
export function leitorCasoFechou(d: DadosAviso): string {
  const ab = d.abertos ?? [];
  const com = ehResponsavel(d) ? ", com a área Contratos" : "";
  if (ab.length) return ab.length === 1 ? `. Falta encerrar o ${ab[0]!.numero}${com}.` : `. Falta encerrar ${ab.length} contratos${com}.`;
  const n = d.seguem?.length ?? 0;
  if (n) return n === 1 ? ". O contrato segue com outro caso." : ". Os contratos seguem com outros casos.";
  return ". O fechamento terminou.";
}

type AgoraFechou = NonNullable<AvisoSino["agoraFechou"]>;
type Saiu = NonNullable<AgoraFechou["saiu"]>[number];

/** A parte "quem encerrou" da linha "Agora:". */
function encerrouAgora(a: AvisoSino, x: AgoraFechou, agora: Date): string | null {
  const dados = a.dados.abertos ?? [];
  if (x.encerrados) {
    const e = x.encerrados;
    const quem = e.voce ? "você" : e.por?.nome;
    const dia = quandoDia(e.em, agora);
    if (dados.length === 1) return quem ? `${quem} encerrou o ${dados[0]!.numero} ${dia}` : `o ${dados[0]!.numero} foi encerrado ${dia}`;
    return quem ? `${quem} encerrou os contratos ${dia}` : `os contratos foram encerrados ${dia}`;
  }
  const saiu = x.saiu ?? [];
  if (!saiu.length) return null;
  const novo = saiu.reduce((m: Saiu, s) => (new Date(s.em) > new Date(m.em) ? s : m), saiu[0]!);
  const dia = quandoDia(novo.em, agora);
  const quem = (s: Saiu) => (s.voce ? "você" : s.por?.nome ?? null);
  if (saiu.length === 1) {
    const q = quem(saiu[0]!);
    return q ? `${q} encerrou o ${saiu[0]!.numero} ${dia}` : `o ${saiu[0]!.numero} foi encerrado ${dia}`;
  }
  const todosVoce = saiu.every((s) => s.voce);
  const um = saiu[0]!.por?.id;
  const mesma = !todosVoce && !!um && saiu.every((s) => !s.voce && s.por?.id === um);
  if (todosVoce || mesma) return `${quem(saiu[0]!)} encerrou ${numeros(saiu)} ${dia}`;
  return `${saiu.length} contratos foram encerrados ${dia}`;
}

/** O estado de agora do aviso: a linha "Agora:", o selo, o trecho para o leitor de tela, se o
 *  pedido "Encerre …" sai do detalhe e os contratos que ainda faltam. Sem mudança, null. */
export function agoraCasoFechou(a: AvisoSino, agora: Date = new Date()): {
  selo: Selo; linha: string; paraLeitor: string; semPedido: boolean; restantes: { id: string; numero: string }[];
} | null {
  const x = a.agoraFechou;
  if (!x) return null;
  const restantes = x.abertos ?? [];
  const seguemAgora = x.seguem ?? [];
  const encerrou = encerrouAgora(a, x, agora);
  if (!encerrou && !seguemAgora.length) return null;
  const resp = ehResponsavel(a.dados);
  const partes: string[] = [];
  if (encerrou) partes.push(encerrou);
  for (const s of seguemAgora) partes.push(`o ${s.numero} passou a seguir com o caso ${s.outroCaso}`);
  if (seguemAgora.length && !restantes.length && !resp) partes.push("não precisa encerrar");
  if (restantes.length) partes.push(`${restantes.length === 1 ? "falta" : "faltam"} ${juntarComE(restantes.map((r) => `o ${r.numero}`))}`);
  const segueAlgum = seguemAgora.length + (resp ? a.dados.seguem?.length ?? 0 : 0);
  const terminou = resp && !restantes.length && !segueAlgum;
  const linha = `${partes.join("; ")}${terminou ? ", e o fechamento do caso terminou." : "."}`;
  if (restantes.length) {
    return {
      selo: restantes.length === 1 ? FALTA_UM : FALTAM, linha, semPedido: false, restantes,
      paraLeitor: restantes.length === 1 ? `. Agora: falta o ${restantes[0]!.numero}.` : `. Agora: faltam ${restantes.length} contratos.`,
    };
  }
  if (terminou) return { selo: FEITO, linha, semPedido: true, restantes, paraLeitor: ". Agora: fechamento terminou." };
  if (segueAlgum) {
    return { selo: SEGUE, linha, semPedido: true, restantes,
      paraLeitor: segueAlgum === 1 ? ". Agora: contrato segue com outro caso." : ". Agora: contratos seguem com outros casos." };
  }
  const um = (a.dados.abertos?.length ?? 0) <= 1;
  return {
    selo: { tom: "neutro", texto: um ? "Contrato encerrado" : "Contratos encerrados" }, linha, semPedido: true, restantes,
    paraLeitor: um ? ". Agora: contrato encerrado." : ". Agora: contratos encerrados.",
  };
}

/** Para onde o clique leva, pelas áreas da sessão (sem áreas, supõe que a pessoa tem a área). */
export function destinoCasoFechou(a: AvisoSino, restantes: { id?: string; numero: string }[], areas?: readonly AreaPortal[]): { onde: string; href: string } {
  const d = a.dados;
  const tem = (x: AreaPortal) => !areas || areas.includes(x);
  const caso = ROTAS_JURIDICO.caso(a.origemId);
  const ficha = (cliente?: string, clienteId?: string) =>
    clienteId ? { onde: `Ver a ficha de ${cliente ?? "o cliente"}`, href: `${ROTAS_PORTAL.clientes}/${clienteId}` } : { onde: "Ver o caso", href: caso };
  if (ehResponsavel(d)) return tem("JURIDICO") ? { onde: "Ver o caso", href: caso } : ficha(d.cliente, d.clienteId);
  const abertos = d.abertos ?? [];
  const r = restantes[0];
  const alvo = r ? { ...abertos.find((c) => c.id === r.id), ...r } : abertos[0];
  if (!alvo?.id) return tem("JURIDICO") ? { onde: "Ver o caso", href: caso } : ficha(d.cliente, d.clienteId);
  if (!tem("CONTRATOS")) return ficha(alvo.cliente ?? d.cliente, alvo.clienteId ?? d.clienteId);
  return r
    ? { onde: `Encerrar o ${alvo.numero}`, href: ROTAS_PASSO.encerrarContrato(alvo.id) }
    : { onde: `Ver o ${alvo.numero}`, href: ROTAS_CONTRATOS.contrato(alvo.id) };
}

/** Cada número de contrato (C-2026-012) num span que não quebra no hífen (.si-nr). */
export function comNumeros(texto: string): ReactNode {
  const partes = texto.split(/(C-\d{4}-\d+)/);
  if (partes.length === 1) return texto;
  return partes.map((p, i) => (i % 2 ? <span key={i} className="si-nr">{p}</span> : p));
}

/** O que cada aviso diz: ícone, título, detalhe, destino e selo; no caso pronto e no caso encerrado,
 *  também a linha "Agora:" e o trecho para o leitor de tela. Com numeros, o item embrulha cada número
 *  de contrato em .si-nr. As áreas da sessão escolhem o destino do caso encerrado (sem elas, supõe
 *  que a pessoa tem a área). */
export function descreverAviso(a: AvisoSino, agora: Date = new Date(), areas?: readonly AreaPortal[]): {
  icone: NomeIcone; titulo: ReactNode; detalhe: ReactNode; onde: string; href: string; selo?: Selo; agora?: string; paraLeitor?: string; numeros?: true;
} {
  const d = a.dados;
  const conversa = `/conversas?c=${a.origemId}`;
  const automacao = `/conversas/automacoes?a=${a.origemId}`;
  const peticao = `/juridico/peticoes/${a.origemId}`;
  const fala = (t?: string) => (t ? <q>{t}</q> : null);
  switch (a.tipo) {
    case "CONVERSA_IA":
      return {
        icone: "ia", titulo: <>A IA passou a conversa de <b>{d.contato ?? d.conversa}</b> para você</>,
        detalhe: <>{d.trecho ? fala(d.trecho) : MOTIVOS_IA[d.motivo ?? "OUTRO"]}{d.contato && d.conversa ? ` ${d.conversa}` : ""}</>,
        onde: "Abrir a conversa", href: conversa,
      };
    case "CONVERSA_ASSUMIDA":
      return {
        icone: "mao", titulo: <><b>{d.quem ?? "Alguém da equipe"}</b> assumiu a conversa de {d.conversa}, que era sua</>,
        detalhe: "A troca ficou registrada na conversa.", onde: "Abrir a conversa", href: conversa,
      };
    case "CONVERSA_PASSADA":
      return {
        icone: "trocar", titulo: <><b>{d.quem ?? "Alguém da equipe"}</b> passou a conversa de {d.conversa} para você</>,
        detalhe: d.recado ? fala(d.recado) : "Sem recado.", onde: "Abrir a conversa", href: conversa,
      };
    case "AUTOMACAO_SUGESTAO":
      return {
        icone: "lapis", titulo: <><b>{d.quem ?? "Alguém da equipe"}</b> sugeriu uma mudança em “{d.automacao}”</>,
        detalhe: fala(d.texto), onde: "Ver a sugestão", href: automacao,
      };
    case "MODELO_RECUSADO":
      return {
        icone: "alerta", titulo: <>A Meta recusou o texto “{d.modelo ?? d.automacao}”</>,
        detalhe: `${d.motivo ? `Motivo informado: ${d.motivo.replace(/\.$/, "")}. ` : ""}A automação “${d.automacao}” não ligou; nada foi enviado.`,
        onde: "Corrigir o texto", href: automacao, selo: { tom: "urgente", texto: "Recusado" },
      };
    case "MODELO_APROVADO":
      return {
        icone: "check", titulo: <>A Meta aprovou os textos de “{d.automacao}”</>,
        detalhe: `A automação ${d.automacao} já está funcionando.`, onde: "Ver a automação", href: automacao, selo: { tom: "ok", texto: "Aprovado" },
      };
    case "PETICAO_REVISAR":
      return {
        icone: "pena",
        titulo: d.passadaPor
          ? <><b>{d.passadaPor}</b> passou para você a revisão de {minuscula(d.modelo)} de {d.caso}</>
          : <><b>{d.quem ?? "Alguém da equipe"}</b> mandou {minuscula(d.modelo)} de {d.caso} para você revisar</>,
        detalhe: d.motivo ? fala(d.motivo) : d.versao && d.versao > 1 ? `Versão ${d.versao}, depois do ajuste.` : "Só fica pronta depois que você aprovar.",
        onde: "Revisar a petição", href: peticao, selo: { tom: "andamento", texto: "Revisar" },
      };
    case "PETICAO_DECIDIDA":
      return {
        icone: d.decisao === "APROVADA" ? "check" : d.decisao === "AJUSTE" ? "lapis" : "xis",
        titulo: <><b>{d.quem ?? "Quem revisou"}</b> {d.decisao === "APROVADA" ? "aprovou" : d.decisao === "AJUSTE" ? "pediu ajuste em" : "reprovou"} {minuscula(d.modelo)} de {d.caso}</>,
        detalhe: d.decisao === "APROVADA" ? "Ficou pronta e entrou nos documentos do caso." : d.decisao === "AJUSTE" ? "Veja os comentários e mande a versão nova." : "Ficou guardada com o motivo.",
        onde: d.decisao === "AJUSTE" ? "Ver o que ajustar" : "Abrir a petição", href: peticao,
        selo: d.decisao === "APROVADA" ? { tom: "ok", texto: "Aprovada" } : d.decisao === "AJUSTE" ? { tom: "atencao", texto: "Ajuste pedido" } : { tom: "neutro", texto: "Reprovada" },
      };
    case "PETICAO_PASSADA":
      return {
        icone: "trocar", titulo: <><b>{d.quem ?? "Quem revisava"}</b> passou a revisão de {minuscula(d.modelo)} de {d.caso} para {d.para ?? "outro advogado"}</>,
        detalhe: "Ela continua em revisão.", onde: "Abrir a petição", href: peticao,
      };
    case "BASE_DO_MES":
      // CH-06: no dia de pedir a base do percentual recorrente; informar fica em Honorários.
      return {
        icone: "relogio", titulo: <>Pedir a base do mês: <b>{d.cliente}</b>{d.contrato ? ` · ${d.contrato}` : ""}</>,
        detalhe: [d.sobre ? `${d.sobre}${d.mes && d.de ? `, mês ${d.mes} de ${d.de}` : ""}.` : null,
          d.vencimento ? `Sem a base, a cobrança de ${d.vencimento.split("-").reverse().join("/")} não sai.` : null].filter(Boolean).join(" "),
        onde: "Informar a base", href: "/contratos/honorarios", selo: { tom: "atencao", texto: "Base do mês" },
      };
    case "PEDIDO_CONTRATO": {
      // IN-01: o Comercial pediu o contrato da proposta aceita; gerar abre o Novo contrato preenchido.
      const valor = d.condicoes?.length ? valorDaProposta(d.condicoes) : null;
      return {
        icone: "pena", titulo: <><b>{d.quem}</b> pediu o contrato de <b>{d.cliente}</b></>,
        detalhe: `Proposta ${d.proposta}${d.servico ? `, ${d.servico.toLowerCase()}` : ""}${d.aceita ? `, aceita em ${d.aceita.slice(8, 10)}/${d.aceita.slice(5, 7)}` : ""}${valor ? `: ${valor}` : ""}. O contrato nasce com as condições da proposta.`,
        onde: "Gerar o contrato", href: ROTAS_CONTRATOS.daProposta(a.origemId), selo: { tom: "andamento", texto: "Pedido" },
      };
    }
    case "CONTRATO_GERADO":
      return {
        icone: "check", titulo: <><b>{d.quem}</b> gerou o contrato de <b>{d.cliente}</b></>,
        detalhe: `O contrato ${d.contrato} nasceu da proposta ${d.proposta}, que você pediu.`,
        onde: "Ver a proposta", href: ROTAS_CONTRATOS.proposta(a.origemId), selo: { tom: "ok", texto: "Contrato gerado" },
      };
    case "REPASSE_PASSADO":
      // F3.71: quem entra recebe o aviso novo; quem sai, o aviso já lido.
      return d.entrou
        ? {
            icone: "trocar", titulo: <><b>{d.quem ?? "Alguém da equipe"}</b> passou para você o repasse de <b>{d.cliente}</b></>,
            detalhe: [d.motivo ? `“${d.motivo}”` : null, d.partes ? `${d.partes === 1 ? "Falta 1 parte" : `Faltam ${d.partes} partes`}.` : null].filter(Boolean).join(" ") || "Agora os prazos e atrasos deste repasse chegam para você.",
            onde: "Abrir o repasse", href: `/financeiro/repasses/${a.origemId}`,
          }
        : {
            icone: "trocar", titulo: <><b>{d.quem ?? "Alguém da equipe"}</b> passou o repasse de {d.cliente} para {d.para ?? "outra pessoa"}</>,
            detalhe: "Você deixa de receber os avisos deste repasse.", onde: "Abrir o repasse", href: `/financeiro/repasses/${a.origemId}`,
          };
    case "REPASSE_ATRASADO":
      // F3.46: a parte passou do prazo; quem cuida anota o motivo e a próxima ação.
      return {
        icone: "alerta", titulo: <>O repasse de <b>{d.parte}</b>{d.cliente && d.cliente !== d.parte ? ` (${d.cliente})` : ""} passou do prazo</>,
        detalhe: `${d.prazo ? `Era ${d.prazo.split("-").reverse().slice(0, 2).join("/")}. ` : ""}Anote o motivo e a próxima ação na ficha do repasse.`,
        onde: "Anotar o atraso", href: `/financeiro/repasses/${a.origemId}`, selo: { tom: "urgente", texto: "Atrasado" },
      };
    case "REPASSE_PROXIMA_ACAO":
      return {
        icone: "relogio", titulo: <>Hoje: {d.oQue ? d.oQue.replace(/^./, (c) => c.toLowerCase()) : "a próxima ação"} · <b>{d.parte}</b></>,
        detalhe: `Repasse atrasado${d.cliente ? ` de ${d.cliente}` : ""}. Se mudou, atualize a anotação.`,
        onde: "Abrir o repasse", href: `/financeiro/repasses/${a.origemId}`, selo: { tom: "atencao", texto: "Próxima ação" },
      };
    case "EXPORTAR_CONTADOR": {
      const ref = d.referencia ? `${["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"][Number(d.referencia.slice(5, 7)) - 1]} de ${d.referencia.slice(0, 4)}` : "o mês anterior";
      return {
        icone: "envelope", titulo: <>Exportar <b>{ref}</b> para o contador</>,
        detalhe: `${d.contador ? `${d.contador} espera` : "O contador espera"} a exportação do mês. Confira e mande pelo Caixa.`,
        onde: "Abrir o Caixa", href: "/financeiro/caixa", selo: { tom: "atencao", texto: "Dia 5" },
      };
    }
    case "DOCUMENTO_CHEGOU":
      // F3.86: o cliente mandou um arquivo e há documento pedido; quem pediu confere e marca "Já chegou".
      return {
        icone: "doc", titulo: <><b>{d.contato ?? d.conversa}</b> mandou um arquivo na conversa</>,
        detalhe: [d.arquivo ? `“${d.arquivo}”.` : null,
          `Você pediu ${d.quantos && d.quantos > 1 ? "estes documentos" : "este documento"}${d.caso ? ` no caso ${d.caso}` : ""}: ${d.texto}.`,
          "Confira o arquivo e, se for o certo, marque “Já chegou” no caso."].filter(Boolean).join(" "),
        onde: "Abrir a conversa", href: conversa, selo: { tom: "andamento", texto: "Conferir" },
      };
    case "CARNE_DESATUALIZADO": {
      // F3.80: a parcela ou a chave Pix mudou depois do carnê; gera-se de novo na folha "Carnê".
      const oQue = d.motivo === "CHAVE_PIX" ? "trocou a chave Pix do escritório"
        : d.motivo === "CANCELADA" ? `cancelou ${d.parcela ? `a ${d.parcela.toLowerCase()}` : "uma parcela"}`
        : d.motivo === "BAIXADA" ? `deu baixa sem receber ${d.parcela ? `na ${nomeDaParcela(d.parcela)}` : "numa parcela"}`
        : d.motivo === "BAIXA_DESFEITA" ? `desfez a baixa sem receber ${d.parcela ? `da ${nomeDaParcela(d.parcela)}` : "de uma parcela"}, que voltou para A receber`
        : d.motivo === "VENCIMENTO" ? `mudou o vencimento ${d.parcela ? `da ${d.parcela.toLowerCase()}` : "de uma parcela"}`
        : `mudou o valor ${d.parcela ? `da ${d.parcela.toLowerCase()}` : "de uma parcela"}`;
      return {
        icone: "carne", titulo: <>O carnê de <b>{d.cliente}</b>{d.contrato ? ` · ${d.contrato}` : ""} ficou desatualizado</>,
        detalhe: `${baixaSemQuem(d) ?? `${d.quem ?? "Alguém da equipe"} ${oQue}.`} ${d.gerou ? "O carnê que você gerou" : "O carnê"}${d.gerado ? ` em ${diaDe(d.gerado).split("-").reverse().slice(0, 2).join("/")}` : ""} ainda mostra o que era. Gere de novo e entregue o novo ao cliente.`,
        onde: "Abrir o carnê", href: ROTAS_CONTRATOS.recebimentos(a.origemId), selo: { tom: "atencao", texto: "Desatualizado" },
      };
    }
    case "PEDIDO_CHAVE_PIX":
      // F3.80: quem não é dono pediu a chave Pix para os carnês.
      return {
        icone: "moeda", titulo: <><b>{d.quem ?? "Alguém da equipe"}</b> pediu a chave Pix do escritório</>,
        detalhe: `${d.cliente ? `Para o carnê de ${d.cliente}. ` : ""}Sem a chave, os carnês saem com as instruções de pagamento em texto, sem o QR.`,
        onde: "Cadastrar a chave Pix", href: `${ROTAS_PORTAL.escritorio}/recebimento`, selo: { tom: "andamento", texto: "Pedido" },
      };
    case "EXITO_VALOR_MUDOU":
      return {
        icone: "balanca", titulo: <><b>{d.quem ?? "O Financeiro"}</b> mudou o êxito de {d.cliente ?? "um cliente"}{typeof d.valor === "number" ? ` para ${reais(d.valor)}` : ""}</>,
        detalhe: <>{typeof d.calculado === "number" ? `Era ${reais(d.calculado)}, pelo contrato. ` : ""}{d.motivo ? fala(d.motivo) : null}{d.caso ? ` ${d.caso}.` : ""}</>,
        onde: "Abrir o caso", href: ROTAS_JURIDICO.caso(a.origemId), selo: { tom: "atencao", texto: "Valor mudou" },
      };
    case "EXITO_NAO_COBRADO":
      return {
        icone: "balanca", titulo: <><b>{d.quem ?? "O Financeiro"}</b> não vai cobrar o êxito de {d.cliente ?? "um cliente"}</>,
        detalhe: <>{d.motivo && d.motivo in MOTIVOS_NAO_COBRAR ? `${MOTIVOS_NAO_COBRAR[d.motivo as MotivoNaoCobrar]}. ` : ""}{d.explicacao ? fala(d.explicacao) : null}{d.caso ? ` ${d.caso}.` : ""}</>,
        onde: "Abrir o caso", href: ROTAS_JURIDICO.caso(a.origemId), selo: { tom: "neutro", texto: "Não cobrado" },
      };
    case "CASO_ABERTO_NA_ASSINATURA":
      return {
        icone: "balanca", titulo: <><b>{d.quem ?? "Alguém da equipe"}</b> registrou a assinatura de {d.cliente ?? "um cliente"}, e o caso abriu com você</>,
        detalhe: <>{d.caso ? `${d.caso}. ` : ""}{d.contrato ? `Contrato ${d.contrato}. ` : ""}Confira o nome, a área e a etapa.</>,
        onde: "Abrir o caso", href: ROTAS_JURIDICO.caso(a.origemId), selo: { tom: "andamento", texto: "Caso novo" },
      };
    case "DOCUMENTOS_INICIO_CHEGARAM":
      // EX-18, decisão 48: o último documento para começar chegou.
      return {
        icone: "doc", titulo: <>Chegaram os documentos para começar {d.caso ?? "o caso"}</>,
        detalhe: <>{d.total ? `Os ${d.total} da lista. ` : ""}{d.quem ? `O último foi marcado por ${d.quem}. ` : ""}O caso pode seguir.</>,
        onde: "Abrir o caso", href: ROTAS_JURIDICO.caso(a.origemId), selo: { tom: "ok", texto: "Documentos" },
      };
    case "CLIENTE_FEZ_18":
      // F3.98, pergunta 3: o aviso vai para quem responde pelo contrato ativo ou pelo caso aberto.
      return {
        icone: "pessoas", titulo: <><b>{d.cliente ?? "Um cliente"}</b> fez 18 anos{d.em ? ` em ${d.em.slice(0, 5)}` : ""} e agora assina por si</>,
        detalhe: `${d.quem ? `${d.quem} assinava pelo cliente. ` : ""}Atualize a ficha e, no caso em andamento, colha uma procuração nova, assinada só pelo cliente.`,
        onde: "Abrir a ficha", href: `${ROTAS_PORTAL.clientes}/${a.origemId}`, selo: { tom: "atencao", texto: "Fez 18" },
      };
    case "CASO_PRONTO_FECHAR": {
      // EX-16, EX-17: o aviso não muda; o "Agora:" conta o que aconteceu depois. Abrir não marca
      // os avisos dos outros (resposta 4).
      const frase = fraseCasoPronto(d);
      const x = agoraCasoPronto(a, agora);
      return {
        icone: "cadeado", titulo: <>O caso <b>{d.caso}</b> ficou pronto{d.denovo ? " de novo" : ""} para encerrar no financeiro</>,
        detalhe: x ? frase : `${frase} Confira o acerto e encerre.`,
        onde: x?.onde ?? `Ver o acerto${d.contrato ? ` no ${d.contrato}` : ""}`,
        href: d.contratoId ? linkFechamentoContrato(d.contratoId, a.origemId) : ROTAS_JURIDICO.caso(a.origemId),
        selo: x?.selo ?? { tom: "ok", texto: "Pronto" },
        ...(x ? { agora: x.linha, paraLeitor: x.paraLeitor } : {}),
      };
    }
    case "CASO_ENCERRADO_FINANCEIRO": {
      // F3.150 (EX-16, EX-17): o mesmo título para os dois papéis; o "Agora:" conta o que mudou nos
      // contratos que ficaram abertos. Abrir não marca os avisos dos outros (regra do F3.147).
      const x = agoraCasoFechou(a, agora);
      return {
        icone: "cadeado", titulo: <>O caso <b>{d.caso}</b> foi encerrado no financeiro</>,
        detalhe: fraseCasoFechou(d, x?.semPedido ?? false),
        ...destinoCasoFechou(a, x?.restantes ?? d.abertos ?? [], areas),
        selo: x?.selo ?? seloCasoFechou(d),
        paraLeitor: x?.paraLeitor ?? leitorCasoFechou(d),
        ...(x ? { agora: x.linha } : {}),
        numeros: true,
      };
    }
    case "BAIXA_RENEGOCIADA":
      // F3.139 (pergunta 3 da Carol): quem deu a baixa renegociada não tem Contratos. Só o combinado
      // e o número do contrato; nada do atraso nem do motivo, que são do Financeiro.
      return {
        icone: "trocar", titulo: <>Condição nova a registrar no <b>{d.contrato}</b>{d.cliente ? `, de ${d.cliente}` : ""}</>,
        detalhe: `${d.quem ?? "Alguém do Financeiro"} combinou uma condição nova com ${d.cliente ?? "o cliente"}: ${d.combinado ?? ""}${/[.!?]$/.test(d.combinado ?? "") ? "" : "."} Mude as condições do ${d.contrato ?? "contrato"}.`,
        onde: `Abrir o ${d.contrato ?? "contrato"} em Contratos`,
        href: ROTAS_CONTRATOS.contrato(d.contratoId ?? a.origemId),
        selo: { tom: "atencao", texto: "Mudar as condições" },
      };
    case "PRAZO_2_DIAS":
      return {
        icone: "relogio", titulo: <>Prazo em 2 dias: <b>{d.prazo}</b>{d.cliente ? ` de ${d.cliente}` : ""}</>,
        detalhe: [d.vence ? `Vence ${d.vence}.` : null, "Responsável: você.", d.processo ? `Proc. ${d.processo}.` : null].filter(Boolean).join(" "),
        onde: "Abrir o prazo", href: "/juridico/prazos", selo: { tom: "atencao", texto: "em 2 dias" },
      };
    default: {
      // Um tipo que esta versão do Portal não conhece (o banco mais novo que a aba aberta, ou um
      // rollback) não derruba o painel: o aviso aparece genérico. Um tipo do domain sem "case"
      // continua sendo erro de compilação.
      const _novo: never = a.tipo;
      void _novo;
      return { icone: "sino", titulo: <>Aviso</>, detalhe: "", onde: "Abrir o Portal", href: ROTAS_PORTAL.inicio };
    }
  }
}

// A última lista do sino fica na memória da aba entre as telas (sem recarregar a página): a
// tela nova mostra o sino na hora e confere de novo por trás, no máximo a cada 15 s.
const sinoGuardado: { lista: ListaAvisosSino | null; em: number } = { lista: null, em: 0 };

/** O estado do sino, compartilhado pelos dois botões (topo e barra do celular). */
export function useSino() {
  const [lista, setListaAqui] = useState<ListaAvisosSino | "erro" | null>(null);
  const setLista = useCallback((x: ListaAvisosSino | "erro" | null | ((antes: ListaAvisosSino | "erro" | null) => ListaAvisosSino | "erro" | null)) => {
    setListaAqui((antes) => {
      const nova = typeof x === "function" ? x(antes) : x;
      if (nova && nova !== "erro") sinoGuardado.lista = nova;
      return nova;
    });
  }, []);
  const carregar = useCallback(async () => {
    const r = await chamarPortal<ListaAvisosSino>("/v1/escritorio/avisos");
    if (r.ok) {
      sinoGuardado.lista = r.dados;
      sinoGuardado.em = Date.now();
    }
    setListaAqui((antes) => (r.ok ? r.dados : antes && antes !== "erro" ? antes : "erro"));
    return r.ok;
  }, []);
  useEffect(() => {
    // Depois de ligar a tela (o servidor não conhece a lista guardada), mostra a guardada.
    const guardada = sinoGuardado.lista;
    void Promise.resolve().then(() => {
      if (guardada) setListaAqui((antes) => antes ?? guardada);
      if (!guardada || Date.now() - sinoGuardado.em >= 15_000) void carregar();
    });
  }, [carregar]);
  return { lista, setLista, carregar };
}

/** O botão do sino: o ponto quando há novo; o número vai no rótulo. */
export function BotaoSino({ cls, novos, aberto, aoClicar }: { cls: "icone-botao" | "bb"; novos: number; aberto: boolean; aoClicar: (b: HTMLButtonElement) => void }) {
  return (
    <button className={cls} type="button" aria-label={novos ? `Avisos, ${novos} ${novos === 1 ? "novo" : "novos"}` : "Avisos, nenhum novo"}
      aria-haspopup="dialog" aria-controls="painel-avisos" aria-expanded={aberto} onClick={(e) => aoClicar(e.currentTarget)}>
      <Icone nome="sino" className="ico" />
      {novos ? <span className="ponto" /> : null}
    </button>
  );
}

export function PainelSino({ sino, aberto, aoFechar, areas }: {
  sino: ReturnType<typeof useSino>;
  aberto: boolean;
  aoFechar: () => void;
  /** As áreas da sessão: escolhem o destino do aviso de caso encerrado (F3.150). */
  areas?: readonly AreaPortal[];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [filtro, setFiltro] = useState<"todos" | "novos">("todos");
  const [msg, setMsg] = useState<number | null>(null);
  const [marcando, setMarcando] = useState(false);
  const { lista, setLista, carregar } = sino;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) {
      if (window.matchMedia("(max-width:760px)").matches) d.showModal();
      else d.show();
      d.focus();
      void carregar();
    } else if (!aberto && d.open) d.close();
  }, [aberto, carregar]);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") aoFechar(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aberto, aoFechar]);

  async function marcarTodos() {
    if (!lista || lista === "erro" || !lista.itens.length) return;
    setMarcando(true);
    const r = await chamarPortal<ListaAvisosSino>("/v1/escritorio/avisos/lidos", { corpo: { ate: lista.itens[0]!.em } });
    setMarcando(false);
    if (r.ok) { setLista(r.dados); setMsg(r.dados.marcados ?? 0); setFiltro("todos"); }
  }

  // Abrir o aviso marca como lido e leva ao lugar certo (com Ctrl ou numa aba nova, marca e deixa abrir).
  async function abrirAviso(e: React.MouseEvent<HTMLAnchorElement>, a: AvisoSino) {
    if (a.lido) return;
    const novaAba = e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0;
    if (novaAba) { void chamarPortal(`/v1/escritorio/avisos/${a.id}/lido`, { corpo: {} }); return; }
    e.preventDefault();
    const destino = e.currentTarget.href;
    await chamarPortal(`/v1/escritorio/avisos/${a.id}/lido`, { corpo: {} });
    window.location.assign(destino);
  }

  const ok = lista && lista !== "erro" ? lista : null;
  const novos = ok?.novos ?? 0;
  const itens = (ok?.itens ?? []).filter((a) => filtro === "todos" || !a.lido);
  const grupos: { dia: string; itens: AvisoSino[] }[] = [];
  for (const a of itens) {
    const dia = rotuloDia(a.em);
    const g = grupos.at(-1);
    if (g && g.dia === dia) g.itens.push(a);
    else grupos.push({ dia, itens: [a] });
  }

  let conteudo: ReactNode;
  if (lista === "erro") {
    conteudo = (
      <Estado icone="alerta" erro titulo="Não deu para carregar os avisos"
        acoes={<button className="btn btn-pri" type="button" onClick={() => void carregar()}><Icone nome="reenviar" className="ico" />Tentar de novo</button>}>
        O servidor não respondeu. Nenhum aviso se perde: eles continuam guardados. Tente de novo em instantes.
      </Estado>
    );
  } else if (!ok) {
    conteudo = <p className="sr" role="status">Carregando os avisos…</p>;
  } else if (!ok.total) {
    conteudo = (
      <Estado icone="sino" titulo="Nenhum aviso por enquanto.">
        Chega aqui o que pede você: uma conversa passada para você, um prazo seu que vence em 2 dias, uma decisão que só você toma. Cada aviso leva ao lugar certo.
      </Estado>
    );
  } else {
    conteudo = grupos.map((g) => (
      <div key={g.dia}>
        <h3 className="si-dia">{g.dia}</h3>
        <ul className="si-ul">
          {g.itens.map((a) => {
            const x = descreverAviso(a, new Date(), areas);
            const nr = (t: ReactNode) => (x.numeros && typeof t === "string" ? comNumeros(t) : t);
            return (
              <li key={a.id} className={a.lido ? "si-item" : "si-item si-novo"}>
                <span className="si-ico" aria-hidden="true"><Icone nome={x.icone} className="ico" /></span>
                <div>
                  <p className="si-tit">
                    <a className="si-link" href={x.href} onClick={(e) => void abrirAviso(e, a)}>
                      {a.lido ? null : <span className="sr">Novo: </span>}
                      {x.titulo}
                      {x.paraLeitor ? <span className="sr">{x.paraLeitor}</span> : null}
                    </a>
                  </p>
                  <p className="si-det">{nr(x.detalhe)}</p>
                  {x.agora ? <p className="si-det"><b className="si-agora">Agora:</b> {nr(x.agora)}</p> : null}
                  <p className="si-meta">
                    {a.lido ? null : <span className="si-nv">Novo</span>}
                    {x.selo ? <span className={`selo selo-${x.selo.tom}`}>{x.selo.texto}</span> : null}
                    <time dateTime={a.em}>{hora(a.em)}</time>
                    <span className="si-onde">{x.onde}<Icone nome="dir" className="ico ico-s" /></span>
                  </p>
                </div>
                {a.lido ? <span aria-hidden="true" /> : <span className="si-pto" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      </div>
    ));
  }

  const conta = lista === "erro" ? "Não deu para carregar"
    : !ok ? " "
    : !ok.total ? "Nenhum aviso nos últimos 30 dias"
    : <>{novos ? <b>{novos} {novos === 1 ? "novo" : "novos"}</b> : "Nenhum novo"} · {ok.total} nos últimos 30 dias</>;

  return (
    <dialog ref={ref} className="si-painel" id="painel-avisos" aria-labelledby="si-t" tabIndex={-1} onClose={aoFechar}>
      <div className="si-cab">
        <div>
          <p className="sobretitulo">Para você</p>
          <h2 id="si-t">Avisos</h2>
          <p className="si-conta">{conta}</p>
        </div>
        <button className="fechar" type="button" aria-label="Fechar os avisos" onClick={aoFechar}>
          <Icone nome="xis" className="ico" />
        </button>
      </div>
      {ok && ok.total ? (
        <div className="si-ferr">
          <div className="chips" role="group" aria-label="Mostrar avisos">
            <button type="button" aria-pressed={filtro === "todos"} onClick={() => setFiltro("todos")}>Todos</button>
            <button type="button" aria-pressed={filtro === "novos"} onClick={() => setFiltro("novos")}>Não lidos <span className="q">{novos}</span></button>
          </div>
          {novos ? (
            <button className="btn btn-fantasma si-todos" type="button" onClick={() => void marcarTodos()} disabled={marcando}>
              <Icone nome="checks" className="ico" />
              Marcar todos como lidos
            </button>
          ) : (
            <span className="si-tudo-lido"><Icone nome="check" className="ico" />Tudo lido</span>
          )}
        </div>
      ) : null}
      <div className="si-lista">
        {msg !== null ? (
          <div className="si-msg">
            <Aviso tom="sucesso" titulo={msg === 1 ? "1 aviso marcado como lido." : `${msg} avisos marcados como lidos.`}>Eles continuam aqui, sem o destaque.</Aviso>
          </div>
        ) : null}
        {conteudo}
        {ok && ok.total && filtro === "novos" && !itens.length ? <p className="si-det" style={{ padding: "16px 24px" }}>Nenhum aviso sem ler.</p> : null}
      </div>
      {lista === "erro" ? null : (
        <p className="si-pe">
          <Icone nome="historico" className="ico" />
          <span>Os avisos ficam aqui por 30 dias. Marcar como lido não apaga nada, e o que o aviso conta continua no lugar de origem.</span>
        </p>
      )}
    </dialog>
  );
}
