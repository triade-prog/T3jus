// Fechamento do caso no financeiro (F3.45, F3.128, F3.132; EX-16, EX-17, FI-08): os textos e as
// escolhas da janela de encerrar e do quadro, sem React, para os testes de unidade. A janela é
// comum à ficha do repasse e à ficha do contrato. Desenho aprovado em
// docs/design/aprovadas/portal-fechamento-sem-levantamento (decisões 8 a 10).

import {
  dataBr, FORMAS_PAGAMENTO, MOTIVOS_BAIXA, PARA_DESTINACAO, reais, type AcertoCaso, type EventoDeOrigem, type ParcelasContrato, type PendenciaCaso,
} from "@t3jus/domain";
import { diaCurto } from "./agenda.ts";
import { juntarComE } from "./clientes.ts";
import { diasEntre } from "./comercial.ts";
import { ROTAS_CONTRATOS } from "./contratos.ts";
import { primeiroNome } from "./equipe.ts";
import { ROTAS_FINANCEIRO } from "./financeiro.ts";
import { origemExitoCobrado } from "./exito_nao_cobrado.ts";

/** O que o atalho da janela de pendência faz (decisão 8). */
export type Atalho =
  | { tipo: "registrar"; parcelaId: string; rotulo: string }
  | { tipo: "link"; href: string; rotulo: string }
  | { tipo: "repasse"; destinacaoId: string; rotulo: string }
  /** F3.139: "Dar baixa sem receber", o atalho secundário da parcela vencida deste contrato. */
  | { tipo: "baixar"; parcelaId: string; rotulo: string };

/** F3.139 (decisão 2): ao lado de "Registrar recebimento", o atalho secundário "Dar baixa sem
 *  receber", só na parcela vencida da ficha aberta e para quem pode dar baixa. */
export function atalhoBaixar(a: Atalho | null, lista: PendenciaCaso[], hoje: string, pode: boolean): Atalho | null {
  if (!pode || a?.tipo !== "registrar") return null;
  const p = lista.find((x) => x.tipo === "PARCELA" && x.parcelaId === a.parcelaId);
  if (!p || !p.vencimento || p.vencimento >= hoje) return null;
  return { tipo: "baixar", parcelaId: a.parcelaId, rotulo: "Dar baixa sem receber" };
}

/** As custas que vão junto com a parcela, entre as pendências (para a ajuda da janela). */
export function custasDaParcela(lista: PendenciaCaso[], parcelaId: string | undefined): number {
  if (!parcelaId) return 0;
  return lista.filter((x) => x.tipo === "REEMBOLSO" && x.parcela?.id === parcelaId).reduce((t, x) => t + (x.valor ?? 0), 0);
}

/** Se o caso teve levantamento. Sem o campo (API de antes), vale o que entrou. */
export function comLevantamento(a: Pick<AcertoCaso, "comLevantamento" | "entrou">): boolean {
  return a.comLevantamento ?? a.entrou > 0;
}

/** Decisão 9: "este contrato" com um, "os contratos ligados" com mais de um. */
export function rotuloEncerrarJunto(n: number): string {
  return n === 1 ? "Encerrar também este contrato" : "Encerrar também os contratos ligados";
}

/** O botão da janela pronta. */
export function botaoEncerrar(n: number, junto: boolean): string {
  if (!junto || n === 0) return "Encerrar o caso";
  return n === 1 ? "Encerrar o caso e o contrato" : "Encerrar o caso e os contratos";
}

/** FI-08 (F3.139): houve baixa sem receber no caso, de parcela ou de reembolso. */
export function temBaixa(a: Pick<AcertoCaso, "baixado">): boolean {
  return !!a.baixado && (a.baixado.parcelas.length > 0 || a.baixado.reembolsos.length > 0);
}

/** "tudo recebido e repassado" só com levantamento; sem ele, "tudo recebido". Com baixa sem receber
 *  no caso (FI-08, F3.139), "tudo recebido ou baixado com motivo". */
export function textoEncerrado(a: Pick<AcertoCaso, "comLevantamento" | "entrou" | "baixado">): string {
  const recebido = temBaixa(a) ? "tudo recebido ou baixado com motivo" : "tudo recebido";
  return comLevantamento(a) ? `${recebido} e repassado` : recebido;
}

/** A regra da janela de pendência (FI-08): "só encerra com tudo recebido ou baixado com motivo". */
export function textoRegraEncerrar(lev: boolean): string {
  return lev
    ? "O financeiro do caso só encerra com tudo recebido ou baixado com motivo, e tudo repassado."
    : "O financeiro do caso só encerra com tudo recebido ou baixado com motivo.";
}

/** Nota 1 da segunda leitura, refeita no F3.139: o texto de ajuda da parcela, igual para quem vê.
 *  Com custas que vão junto com a parcela, diz que elas só saem se marcadas na mesma janela. */
export function textoAjudaPendencia(cliente: string, custas?: number | null): string {
  const nome = primeiroNome(cliente);
  return `Se ${nome} não vai pagar, você pode dar baixa na parcela sem receber, com o motivo. Ela sai de Em atraso, fica no contrato, e o caso deixa de esperar por ela.${
    custas ? ` As custas de ${reais(custas)} saem junto só se você marcar isso na mesma janela.` : ""}`;
}

/** O texto aprovado da ficha do repasse, quando há repasse pendente. */
export const AJUDA_REPASSE =
  "Se algum repasse não vai acontecer (por exemplo, o perito abriu mão), registre isso no repasse, com o motivo. Assim nada some sem explicação.";

/**
 * Decisão 10: quem não encerra contratos vê a seção sem caixa, com quem encerra e onde. Sem os
 * nomes (API de antes), diz só a área. F3.150 (pergunta 5): com os nomes, a promessa do aviso no
 * sino ("Eles recebem…"; com um nome só, "Felipe recebe…"). Sem nomes, ninguém seria avisado.
 */
export function textoQuemEncerraContratos(ligados: { numero: string; cliente: { nome: string } }[], quem: string[] | undefined): string {
  const numeros = juntarComE(ligados.map((c) => c.numero));
  const nomes = [...new Set(ligados.map((c) => primeiroNome(c.cliente.nome)))];
  const area = quem?.length ? `a área Contratos (${juntarComE(quem.map(primeiroNome))})` : "a área Contratos";
  const fica = ligados.length === 1 ? `O ${numeros} fica aberto` : `Os ${numeros} ficam abertos`;
  const ficha = `${nomes.length === 1 ? "da ficha" : "das fichas"} de ${juntarComE(nomes)}`;
  const aviso = !quem?.length ? "" : quem.length === 1 ? ` ${primeiroNome(quem[0]!)} recebe um aviso no sino.` : " Eles recebem um aviso no sino.";
  return `${fica}. Quem encerra é ${area}, no passo “Encerrar o contrato” ${ficha}.${aviso}`;
}

/** O contrato já encerrado na janela (decisão 9): "Já encerrado em 12/11, por Felipe, em Contratos · fica como está". */
export function textoJaEncerrado(c: { encerradoEm: string; encerradoPor: { nome: string } | null }, dia: (x: string) => string): string {
  return `Já encerrado em ${dia(c.encerradoEm)}${c.encerradoPor ? `, por ${primeiroNome(c.encerradoPor.nome)}, em Contratos` : ""} · fica como está`;
}

/** O que falta, em palavras, para cada pendência do fechamento (a linha de baixo, na ficha do repasse). */
export function detalheDaPendencia(x: PendenciaCaso): string {
  if (x.tipo === "REPASSE") return `${PARA_DESTINACAO[x.para!].toLowerCase()} · combinado para até ${diaCurto(x.prazo!)}`;
  if (x.tipo === "PARCELA") return `parcela do contrato · vence em ${diaCurto(x.vencimento!)}`;
  if (x.tipo === "EXITO") return "êxito calculado no encerramento, esperando a conferência em A receber";
  if (x.tipo === "PARCELA_SEM_VALOR") return "parcela do contrato ainda sem valor (base do mês ou etapa do caso)";
  return "o escritório adiantou e o cliente ainda não reembolsou";
}

/** O título do aviso da janela de pendência. */
export function tituloPendencias(lista: PendenciaCaso[], contar: (n: number, um: string, varios: string) => string): string {
  const repasses = lista.filter((x) => x.tipo === "REPASSE").length;
  if (repasses && repasses === lista.length) return `Ainda há ${contar(repasses, "repasse pendente", "repasses pendentes")} neste caso.`;
  if (!repasses) return "Ainda falta receber neste caso.";
  return `Ainda há ${contar(lista.length, "pendência", "pendências")} neste caso.`;
}

/** O primeiro atalho que existe, na ordem das pendências (decisão 8: o da primeira). */
export function primeiroAtalho(lista: PendenciaCaso[], atalho: (p: PendenciaCaso) => Atalho | null): Atalho | null {
  for (const p of lista) {
    const a = atalho(p);
    if (a) return a;
  }
  return null;
}

/** O rótulo do registrar repasse da ficha do repasse (o de hoje). */
export function rotuloRepasse(d: { para: keyof typeof PARA_DESTINACAO; nome: string }): string {
  return `Registrar repasse ${d.para === "CLIENTE" ? `a ${primeiroNome(d.nome)}` : `ao ${PARA_DESTINACAO[d.para].toLowerCase()}`}`;
}

// ------------------------------------------------------------------ A folha da ficha do contrato

const fuso = { timeZone: "America/Sao_Paulo" } as const;
const diaDoInstante = (em: string) => new Intl.DateTimeFormat("en-CA", { ...fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
/** "12/11" de uma data ou de um instante (no fuso de Brasília). */
export const dia = (x: string) => diaCurto(/^\d{4}-\d{2}-\d{2}$/.test(x) ? x : diaDoInstante(x));
const R = (v: number) => reais(v).replace(" ", " ");
const RESULTADO: Record<string, string> = { GANHO: "ganho", PERDA: "perda", ACORDO: "acordo" };
const MOTIVO_NAO_COBRAR: Record<string, string> = { PERDOADO: "perdoado", INDEVIDO: "indevido", OUTRO: "outro motivo" };
const pct = (p: number) => `${(p / 100).toLocaleString("pt-BR")}%`;

/** "Parcela 6 de 6" vira "Parcela 6/6", como no desenho; "Fixo" e o resto ficam como estão. */
export function parcelaCurta(descricao: string): string {
  return descricao.replace(/(\d+) de (\d+)/, "$1/$2");
}

/** "Parcela 6 de 6" vira "parcela 6/6"; "Fixo" vira "parcela fixo" (F3.139). */
export function nomeDaParcela(descricao: string): string {
  const c = parcelaCurta(descricao);
  const m = c.charAt(0).toLowerCase() + c.slice(1);
  return /\d+\/\d+/.test(c) ? m : `parcela ${m}`;
}

/** Uma linha do quadro: feito (check), falta (alerta) ou espera (relógio), cada uma dita também em texto. */
export type ItemQuadro = { tom: "ok" | "falta" | "espera"; forte?: string; texto?: string; sub?: string; ir?: { rotulo: string; href: string } };
export type GrupoQuadro = { titulo: string; itens: ItemQuadro[] };

/** O que o quadro precisa saber além do acerto. */
export type ContextoQuadro = { contratoId: string; casoId: string; hoje: string };

const atraso = (venc: string, hoje: string) => {
  const d = diasEntre(venc, hoje);
  return d > 0 ? `venceu em ${diaCurto(venc)} · ${d} ${d === 1 ? "dia" : "dias"} de atraso` : `vence em ${diaCurto(venc)}`;
};
const espera = (p: PendenciaCaso, hoje: string) => p.tipo === "PARCELA" && !!p.vencimento && p.vencimento >= hoje;
/** A folha "Fechamento do caso" na ficha do contrato (o título dela recebe o foco pelo hash). O sino usa
 *  o mesmo link no aviso de caso pronto para encerrar (F3.147). */
export const linkFechamentoContrato = (id: string, casoId: string) => `${ROTAS_FINANCEIRO.contrato(id)}#t-fecha-${casoId}`;
const linkContrato = linkFechamentoContrato;
const contratoDe = (a: AcertoCaso, id: string | undefined) => (id ? a.contratos?.find((c) => c.id === id) : undefined);
const nomeDaPendencia = (p: PendenciaCaso) => (p.exito ? `Êxito de ${primeiroNome(p.cliente ?? "")}` : parcelaCurta(p.descricao ?? p.nome));

/** A frase "Sem êxito a cobrar" e os clientes com êxito no contrato, este primeiro. */
function semExito(a: AcertoCaso, contratoId: string): ItemQuadro {
  const ca = a.caso;
  const cs = [...(a.contratos ?? [])].sort((x, y) => Number(y.id === contratoId) - Number(x.id === contratoId)).filter((c) => c.exitoPercentual !== null);
  const pcts = [...new Set(cs.map((c) => c.exitoPercentual!))];
  const nomes = juntarComE([...new Set(cs.map((c) => primeiroNome(c.cliente.nome)))]);
  const sub = cs.length ? `${cs.length > 1 ? `${nomes} · ` : ""}${pcts.length === 1 ? pct(pcts[0]!) : "o percentual"} do êxito sobre base zero` : undefined;
  const texto = ca?.resultado === "PERDA"
    ? `Sem êxito a cobrar: o caso terminou com perda${ca.encerradoEm ? ` em ${dia(ca.encerradoEm)}` : ""}`
    : "Sem êxito a cobrar neste caso";
  return { tom: "ok", texto, sub: ca?.resultado === "PERDA" ? sub : undefined };
}

/** Os grupos do quadro "Fechamento do caso" (decisão 6), na ordem do desenho. */
export function gruposDoQuadro(a: AcertoCaso, ctx: ContextoQuadro): GrupoQuadro[] {
  const { contratoId, casoId, hoje } = ctx;
  const pend = a.pendencias;
  const exitos = a.exitos ?? [];
  const grupos: GrupoQuadro[] = [];
  // 1. Resultado e êxito.
  const res: ItemQuadro[] = exitos.length ? exitos.map((x): ItemQuadro => {
    const p = primeiroNome(x.cliente.nome);
    const quem = x.conferidoPor ? `por ${primeiroNome(x.conferidoPor.nome)}${x.conferidoEm ? ` em ${dia(x.conferidoEm)}` : ""}` : "";
    if (x.situacao === "LANCADO") {
      return { tom: "ok", texto: `Êxito de ${p} lançado · ${R(x.valorLancado ?? x.calculado)}`,
        sub: [x.vencimento ? `vence em ${diaCurto(x.vencimento)}` : null, quem ? `conferido ${quem}` : null].filter(Boolean).join(" · ") || undefined };
    }
    if (x.situacao === "NAO_COBRADO") {
      return { tom: "ok", texto: `Êxito de ${p} não cobrado · ${[MOTIVO_NAO_COBRAR[x.motivoNaoCobrar ?? ""], quem].filter(Boolean).join(", ")}`,
        sub: x.explicacao ? `“${x.explicacao}”` : undefined };
    }
    return { tom: "falta", forte: `Êxito de ${p}:`, texto: `falta conferir · ${R(x.calculado)}`, sub: "calculado no encerramento, esperando a conferência em A receber" };
  }) : [semExito(a, contratoId)];
  grupos.push({ titulo: "Resultado e êxito", itens: res });
  // 2. Deste contrato.
  const c = contratoDe(a, contratoId);
  if (c) {
    const itens: ItemQuadro[] = [];
    const encerrado = c.encerradoEm ? ` · contrato encerrado em ${dia(c.encerradoEm)}` : "";
    if (!c.parcelas.total) {
      itens.push({ tom: "ok", texto: c.exitoPercentual !== null ? "Nenhuma parcela: o contrato era só de êxito" : "Nenhuma parcela neste contrato" });
    } else if (c.parcelas.pagas === c.parcelas.total && c.parcelas.total === 1) {
      itens.push({ tom: "ok", texto: `Tudo recebido · ${R(c.recebido)}`, sub: c.ultimaRecebidaEm ? `recebido em ${diaCurto(c.ultimaRecebidaEm)}${encerrado}` : undefined });
    } else if (c.parcelas.pagas) {
      itens.push({ tom: "ok", texto: `${c.parcelas.pagas} de ${c.parcelas.total} parcelas recebidas · ${R(c.recebido)}`,
        sub: c.parcelas.pagas === c.parcelas.total && c.ultimaRecebidaEm ? `a última em ${diaCurto(c.ultimaRecebidaEm)}${encerrado}` : undefined });
    }
    // F3.139 (FI-08): a parcela com baixa sem receber fecha como as outras, com o motivo e quem.
    for (const b of (a.baixado?.parcelas ?? []).filter((x) => x.contratoId === c.id)) {
      const txt = `${parcelaCurta(b.descricao).toLowerCase()} baixada sem receber (${MOTIVOS_BAIXA[b.motivo].toLowerCase()}), por ${primeiroNome(b.por.nome)} em ${dia(b.em)}`;
      const ult = itens[itens.length - 1];
      if (ult && !ult.sub && ult.tom === "ok") ult.sub = txt;
      else itens.push({ tom: "ok", texto: txt.charAt(0).toUpperCase() + txt.slice(1) });
    }
    const atrasado = pend.some((p) => !espera(p, hoje));
    for (const p of pend.filter((x) => x.contratoId === c.id)) {
      if (p.tipo === "PARCELA_SEM_VALOR") {
        itens.push({ tom: "falta", forte: `${parcelaCurta(p.descricao ?? p.nome)}:`, texto: "ainda sem valor", sub: "falta a base do mês ou a etapa do caso, em Contratos" });
      } else if (p.tipo === "PARCELA" && espera(p, hoje)) {
        itens.push({ tom: "espera", texto: `${nomeDaPendencia(p)} · ${R(p.valor ?? 0)} a vencer em ${diaCurto(p.vencimento!)}`, sub: atrasado ? undefined : "nada em atraso" });
      } else if (p.tipo === "PARCELA") {
        itens.push({ tom: "falta", forte: `${nomeDaPendencia(p)}:`, texto: `falta ${R(p.valor ?? 0)}`, sub: atraso(p.vencimento!, hoje) });
      }
    }
    grupos.push({ titulo: `Deste contrato · ${c.numero}, ${primeiroNome(c.cliente.nome)}`, itens });
  }
  // 3. Dos outros contratos do caso.
  const outros = (a.contratos ?? []).filter((o) => o.id !== contratoId);
  if (outros.length) {
    const itens: ItemQuadro[] = [];
    for (const o of outros) {
      const quem = primeiroNome(o.cliente.nome);
      const ir = { rotulo: `Abrir o contrato de ${quem}`, href: linkContrato(o.id, casoId) };
      const ps = pend.filter((p) => p.contratoId === o.id && (p.tipo === "PARCELA" || p.tipo === "PARCELA_SEM_VALOR"));
      if (o.seguePor.length) {
        itens.push({ tom: "ok", texto: `Contrato ${o.numero} segue no caso ${juntarComE(o.seguePor.map((s) => s.nome))}: as parcelas ficam com ele`, ir });
      } else if (ps.length) {
        ps.forEach((p, i) => {
          const esp = espera(p, hoje);
          itens.push({ tom: esp ? "espera" : "falta", forte: `${quem} · ${nomeDaPendencia(p).replace(/^P/, "p")}${p.valor !== null ? ` · ${R(p.valor)}` : ""}`,
            sub: `${o.numero} · ${p.vencimento ? atraso(p.vencimento, hoje) : "ainda sem valor"}`, ir: i === 0 ? ir : undefined });
        });
      } else {
        const naoCobrado = exitos.some((x) => x.contratoId === o.id && x.situacao === "NAO_COBRADO");
        itens.push(o.recebido
          ? { tom: "ok", texto: `${o.numero} · ${quem}: tudo recebido`,
              sub: `${R(o.recebido)}${o.ultimaRecebidaEm ? ` em ${diaCurto(o.ultimaRecebidaEm)}` : ""}${o.encerradoEm ? ` · contrato já encerrado em ${dia(o.encerradoEm)}` : ""}`, ir }
          : { tom: "ok", texto: `${o.numero} · ${quem}: nada a receber`, sub: naoCobrado ? "o êxito não será cobrado" : undefined, ir });
      }
    }
    grupos.push({ titulo: "Dos outros contratos do caso", itens });
  }
  // 4. Adiantado pelo escritório no caso (sem conta cancelada: o servidor já tira).
  const reemb = pend.filter((p) => p.tipo === "REEMBOLSO");
  const r = a.reembolsos ?? { adiantado: 0, reembolsado: 0 };
  const adi: ItemQuadro[] = reemb.map((p) => {
    const junto = p.parcela
      ? `vai junto com a ${parcelaCurta(p.parcela.descricao).toLowerCase()}${p.parcela.contrato.id !== contratoId ? ` do contrato ${p.parcela.contrato.numero}` : ""}`
      : "a reembolsar, em A pagar";
    return { tom: p.parcela && p.parcela.vencimento >= hoje ? "espera" : "falta", forte: `${p.nome}:`, texto: `falta o reembolso de ${R(p.valor ?? 0)}`, sub: junto };
  });
  // F3.139 (FI-25): o reembolso que teve baixa sem receber junto com a parcela.
  const reembBaixados = a.baixado?.reembolsos ?? [];
  for (const b of reembBaixados) adi.push({ tom: "ok", texto: `${b.descricao}: reembolso baixado sem receber · ${R(b.valor)}` });
  if (!reemb.length && !reembBaixados.length) adi.push(r.adiantado ? { tom: "ok", texto: `Adiantado reembolsado · ${R(r.reembolsado)}` } : { tom: "ok", texto: "Nada adiantado neste caso" });
  else if (!reemb.length && r.reembolsado) adi.push({ tom: "ok", texto: `Adiantado reembolsado · ${R(r.reembolsado)}` });
  grupos.push({ titulo: "Adiantado pelo escritório no caso", itens: adi });
  // 5. Terceiros.
  if (!comLevantamento(a)) {
    grupos.push({ titulo: "Terceiros", itens: [{ tom: "ok", texto: "Nenhum valor de terceiros entrou neste caso", sub: "não há repasse nem prestação de contas" }] });
  }
  return grupos;
}

/** O nome curto de cada pendência, para "Falta · parcela 6/6 e custas". */
export function nomesCurtos(lista: PendenciaCaso[]): string[] {
  return [...new Set(lista.map((p) => {
    if (p.tipo === "REEMBOLSO") return p.categoria === "CUSTAS" ? "custas" : "reembolso";
    if (p.tipo === "EXITO") return "êxito a conferir";
    if (p.tipo === "REPASSE") return `repasse a ${primeiroNome(p.nome)}`;
    return p.exito ? `êxito de ${primeiroNome(p.cliente ?? "")}` : parcelaCurta(p.descricao ?? p.nome).toLowerCase();
  }))];
}

/** Os três números (estado 5), cada um também em texto. */
export type NumerosFechamento = {
  recebido: number; contratos: number; reembolsado: number; reembolsoTxt: string;
  falta: number; faltaTxt: string; tom: "falta" | "espera" | "nada";
};
export function numerosDoFechamento(a: AcertoCaso): NumerosFechamento {
  const r = a.reembolsos ?? { adiantado: 0, reembolsado: 0 };
  const recebido = a.recebidoNoCaso ?? 0;
  const custasBaixadas = (a.baixado?.reembolsos ?? []).reduce((t, x) => t + x.valor, 0);
  const reembolsoTxt = !r.adiantado ? "nada adiantado"
    : custasBaixadas && !a.pendencias.some((p) => p.tipo === "REEMBOLSO") ? `as custas de ${R(custasBaixadas)} tiveram baixa sem receber`
    : r.reembolsado < r.adiantado ? `de ${R(r.adiantado)} adiantados` : "tudo reembolsado";
  const base = { recebido, contratos: a.contratosNoRecebido ?? a.contratos?.length ?? 0, reembolsado: r.reembolsado, reembolsoTxt, falta: a.falta };
  if (!a.pendencias.length) {
    const txt = temBaixa(a) ? textoEncerrado(a) : comLevantamento(a) ? "tudo recebido e repassado" : r.adiantado ? "tudo recebido e reembolsado" : recebido ? "tudo recebido" : "nada a receber";
    return { ...base, falta: 0, faltaTxt: txt, tom: "nada" };
  }
  if (a.aVencer) return { ...base, faltaTxt: `a vencer em ${diaCurto(a.aVencer.vencimento)} · nada em atraso`, tom: "espera" };
  return { ...base, faltaTxt: juntarComE(nomesCurtos(a.pendencias)), tom: "falta" };
}

/** "Pronto para encerrar depois do êxito de Joana, em 15/12." (pergunta 1), ou nada a receber. */
export function linhaPronto(a: AcertoCaso): { forte: string; texto?: string } | null {
  const x = a.aVencer;
  if (x) {
    const de = x.exito ? `do êxito de ${primeiroNome(x.cliente ?? "")}` : `da ${parcelaCurta(x.descricao).toLowerCase()}`;
    return { forte: `Pronto para encerrar depois ${de}, em ${diaCurto(x.vencimento)}.` };
  }
  const r = a.reembolsos;
  if (!a.pendencias.length && !a.recebidoNoCaso && !r?.adiantado && !comLevantamento(a)) {
    return { forte: "Nada a receber neste caso.", texto: "Ele já pode ser encerrado no financeiro." };
  }
  return null;
}

/** A linha do Jurídico, enquanto o caso não fecha. */
export function linhaJuridico(): { antes: string; forte: string; depois: string } {
  return { antes: "No Jurídico, o caso fica", forte: "Encerrado · acerto pendente", depois: "até este fechamento." };
}

/** O que a linha da janela de pendência diz e o atalho dela (decisão 8, tabela da seção 4.1). */
export type ContextoPendencia = {
  contratoId: string; casoId: string; hoje: string;
  /** As parcelas da ficha aberta: só elas se registram daqui (ajuste 7). */
  parcelasDaFicha: Set<string>;
  /** As áreas de quem vê: "Informar a base" só com Contratos. */
  areas: readonly string[];
};
export function linhaEAtalhoDaPendencia(a: AcertoCaso, p: PendenciaCaso, ctx: ContextoPendencia): {
  forte: string; sub: string; espera: boolean; atalho: Atalho | null;
} {
  const { contratoId, casoId, hoje } = ctx;
  const c = contratoDe(a, p.contratoId);
  const quem = primeiroNome(p.cliente ?? c?.cliente.nome ?? "");
  if (p.tipo === "PARCELA") {
    const deste = p.contratoId === contratoId;
    const esp = espera(p, hoje);
    const nome = nomeDaPendencia(p);
    const d = p.vencimento ? diasEntre(p.vencimento, hoje) : 0;
    const quando = p.vencimento ? (esp ? `vence ${diaCurto(p.vencimento)}` : `venceu ${diaCurto(p.vencimento)}`) : "";
    const forte = deste ? [nome, R(p.valor ?? 0), quando].filter(Boolean).join(" · ") : `${quem} · ${nome.replace(/^P/, "p")} · ${R(p.valor ?? 0)}`;
    const sub = deste
      ? [p.exito ? null : quem, c?.numero, esp ? "nada em atraso" : d > 0 ? `${d} ${d === 1 ? "dia" : "dias"} de atraso` : null].filter(Boolean).join(" · ")
      : [c?.numero, p.vencimento ? (esp ? `vence em ${diaCurto(p.vencimento)}` : `venceu em ${diaCurto(p.vencimento)}`) : null].filter(Boolean).join(" · ");
    const atalho: Atalho | null = deste
      ? (p.parcelaId && ctx.parcelasDaFicha.has(p.parcelaId)
        ? { tipo: "registrar", parcelaId: p.parcelaId, rotulo: p.exito ? "Registrar recebimento do êxito" : `Registrar recebimento da ${nome.toLowerCase()}` }
        : null)
      : p.contratoId ? { tipo: "link", href: linkContrato(p.contratoId, casoId), rotulo: `Abrir o contrato de ${quem}` } : null;
    return { forte, sub, espera: esp, atalho };
  }
  if (p.tipo === "PARCELA_SEM_VALOR") {
    const pode = ctx.areas.includes("CONTRATOS");
    const quemInforma = a.quemContratos?.length ? `quem informa é a área Contratos (${juntarComE(a.quemContratos.map(primeiroNome))})` : "quem informa é a área Contratos";
    return {
      forte: `${parcelaCurta(p.descricao ?? p.nome)} · ainda sem valor`, sub: `${c?.numero ? `${c.numero} · ` : ""}${pode ? "falta a base do mês ou a etapa do caso" : quemInforma}`,
      espera: false, atalho: pode ? { tipo: "link", href: ROTAS_CONTRATOS.honorarios, rotulo: "Informar a base" } : null,
    };
  }
  if (p.tipo === "EXITO") {
    return { forte: `Êxito de ${quem} · ${p.valor !== null ? R(p.valor) : "a conferir"}`, sub: "calculado no encerramento, esperando a conferência em A receber",
      espera: false, atalho: { tipo: "link", href: ROTAS_FINANCEIRO.receber, rotulo: "Conferir o êxito" } };
  }
  if (p.tipo === "REEMBOLSO") {
    const cat = p.categoria === "CUSTAS" ? "Custas" : "Reembolso";
    const x = p.parcela;
    if (x) {
      const daqui = x.contrato.id === contratoId && ctx.parcelasDaFicha.has(x.id);
      const forte = `${cat} · ${R(p.valor ?? 0)} · vai junto com a ${parcelaCurta(x.descricao).toLowerCase()}${x.contrato.id !== contratoId ? ` do ${x.contrato.numero}` : ""}`;
      return {
        forte, sub: "adiantadas pelo escritório", espera: x.vencimento >= hoje,
        atalho: daqui
          ? { tipo: "registrar", parcelaId: x.id, rotulo: `Registrar recebimento da ${parcelaCurta(x.descricao).toLowerCase()}` }
          : { tipo: "link", href: linkContrato(x.contrato.id, casoId), rotulo: `Abrir o contrato ${x.contrato.numero}` },
      };
    }
    return { forte: `${cat} · ${R(p.valor ?? 0)}`, sub: `${p.nome} · adiantadas pelo escritório, a reembolsar`, espera: false,
      atalho: { tipo: "link", href: ROTAS_FINANCEIRO.pagar, rotulo: "Ver em A pagar" } };
  }
  return { forte: `${p.nome}${p.valor !== null ? ` · ${R(p.valor)}` : ""}`, sub: detalheDaPendencia(p), espera: false, atalho: null };
}

/** O âmbar da ficha sobe "Encerrar o caso no financeiro" só sem pendência e sem atraso no contrato (ajuste 4). */
export function ambarEncerra(f: Pick<ParcelasContrato, "totais">, fp: { acerto: AcertoCaso } | null | undefined): boolean {
  return !!fp && !fp.acerto.fechado && fp.acerto.pendencias.length === 0 && f.totais.atraso === 0;
}

/** Decisão 4, do lado do cliente: o contrato do "Ver o acerto" (o do cliente, senão o primeiro ligado). */
export function contratoDoAcerto(contratos: { id: string; cliente: { id: string } }[], clienteId: string | null): string | null {
  return (clienteId ? contratos.find((c) => c.cliente.id === clienteId)?.id : undefined) ?? contratos[0]?.id ?? null;
}

/** O texto curto de cada evento de "De onde veio" (decisão 1). */
export function textoOrigem(e: EventoDeOrigem, caso: string): { fez: string; detalhe: string } {
  const d = e.dados as Record<string, string | number | boolean | undefined>;
  const s = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");
  const valor = typeof d.valor === "number" ? R(d.valor) : "";
  switch (e.acao) {
    case "juridico.etapa": {
      const res = RESULTADO[s("resultado")];
      return { fez: res ? `encerrou o caso com ${res}` : "encerrou o caso", detalhe: caso };
    }
    case "financeiro.exito_lancado":
      return { fez: `conferiu e lançou o êxito${s("cliente") ? ` de ${primeiroNome(s("cliente"))}` : ""}`,
        detalhe: [valor, s("vencimento") ? `vence ${dataBr(s("vencimento"))}` : ""].filter(Boolean).join(", ") };
    case "financeiro.exito_nao_cobrado":
      return { fez: `marcou o êxito${s("cliente") ? ` de ${primeiroNome(s("cliente"))}` : ""} como não cobrado`,
        detalhe: [MOTIVO_NAO_COBRAR[s("motivo")] ? MOTIVO_NAO_COBRAR[s("motivo")]!.replace(/^./, (x) => x.toUpperCase()) : "", s("explicacao") ? `“${s("explicacao")}”` : ""].filter(Boolean).join(" · ") };
    case "financeiro.caso_encerrado":
      return { fez: "encerrou o caso no financeiro", detalhe: caso };
    // F3.191 (enc-caso-historico): o êxito não cobrado cobrado na divisão do alvará.
    case "financeiro.exito_cobrado_no_alvara":
      return origemExitoCobrado(d);
    case "contrato.encerrado":
    case "contrato.encerrado_com_caso":
      return { fez: d.deste ? "encerrou este contrato" : `encerrou o contrato ${s("contrato")}${s("cliente_contrato") ? `, de ${primeiroNome(s("cliente_contrato"))}` : ""}`,
        detalhe: e.acao === "contrato.encerrado_com_caso" ? "Junto com o fechamento do caso" : s("motivo") ? `Em Contratos · motivo: “${s("motivo")}”` : "Em Contratos" };
    case "financeiro.recebimento": {
      const forma = s("forma") in FORMAS_PAGAMENTO ? FORMAS_PAGAMENTO[s("forma") as keyof typeof FORMAS_PAGAMENTO] : "";
      return { fez: "registrou o recebimento", detalhe: [parcelaCurta(s("parcela")), [valor, forma ? `por ${forma}` : ""].filter(Boolean).join(" ")].filter(Boolean).join(" · ") };
    }
    // F3.139, revisão nota 5: a baixa sem receber e o desfazer, como no desenho.
    case "financeiro.parcela_baixada": {
      const motivo = MOTIVOS_BAIXA[s("motivo") as keyof typeof MOTIVOS_BAIXA] ?? "";
      const reemb = typeof d.reembolsos === "number" ? d.reembolsos : 0;
      const abertas = typeof d.custasAReembolsar === "number" ? d.custasAReembolsar : 0;
      const custas = reemb > 0 ? "o reembolso das custas teve baixa junto" : abertas > 0 ? "as custas ficaram a reembolsar, em A pagar" : "";
      return { fez: `deu baixa sem receber na ${s("parcela") ? nomeDaParcela(s("parcela")) : "parcela"}`,
        detalhe: [motivo, valor].filter(Boolean).join(" · ") + (custas ? `; ${custas}` : "") };
    }
    case "financeiro.parcela_baixa_desfeita":
      return { fez: `desfez a baixa sem receber da ${s("parcela") ? nomeDaParcela(s("parcela")) : "parcela"}`,
        detalhe: [s("explicacao") ? `“${s("explicacao")}”` : "", s("com") ? `próxima ação com ${s("com")}` : ""].filter(Boolean).join(" · ") };
    default:
      return { fez: "registrou uma mudança", detalhe: caso };
  }
}

/** O resumo do caso já encerrado (estado 11), na lateral. */
export function resumoFechado(a: AcertoCaso): string[] {
  const itens: string[] = [];
  const ca = a.caso;
  const exitos = a.exitos ?? [];
  if (!exitos.length) itens.push(ca?.resultado === "PERDA" ? `Sem êxito a cobrar: perda${ca.encerradoEm ? ` em ${dia(ca.encerradoEm)}` : ""}` : "Sem êxito a cobrar");
  for (const x of exitos) itens.push(`Êxito de ${primeiroNome(x.cliente.nome)} ${x.situacao === "NAO_COBRADO" ? "não cobrado" : "recebido"}`);
  const n = a.contratos?.length ?? 0;
  if (n) itens.push(n === 1 ? "Parcelas do contrato recebidas" : `Parcelas dos ${n} contratos recebidas`);
  if (a.reembolsos?.adiantado) itens.push("Adiantado reembolsado");
  if (!comLevantamento(a)) itens.push("Nenhum valor de terceiros entrou neste caso");
  return itens;
}

/** "Carvalho x Construtora Lume · encerrado com perda em 06/11, por Felipe Matos". */
export function subDoCaso(caso: { nome: string; resultado: string | null; encerradoEm: string | null; encerradoPor?: { nome: string } | null }): string {
  const res = caso.resultado ? ` com ${RESULTADO[caso.resultado] ?? caso.resultado.toLowerCase()}` : "";
  return `${caso.nome} · encerrado${res}${caso.encerradoEm ? ` em ${dia(caso.encerradoEm)}` : ""}${caso.encerradoPor ? `, por ${caso.encerradoPor.nome}` : ""}`;
}

/** Os ids de cada folha (seção 4.3): a primeira com t-fecha e t-orig; da segunda em diante, com o caso. */
export const idDaFolha = (base: "t-fecha" | "t-orig", casoId: string, primeira: boolean) => (primeira ? base : `${base}-${casoId}`);

/** Decisão 12: a folha que o hash pede (#t-fecha ou #t-fecha-<caso>); sem a do caso, a primeira. */
export function casoDoHash(hash: string): string | null | undefined {
  if (hash === "#t-fecha") return null;
  const m = /^#t-fecha-(.+)$/.exec(hash);
  return m ? decodeURIComponent(m[1]!) : undefined;
}
