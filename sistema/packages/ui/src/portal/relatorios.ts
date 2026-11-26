// Regras de texto e de período dos Relatórios do sócio (F3.70). Os números vêm prontos do
// servidor; aqui só se escreve o período, a comparação, a ordem da lista e a planilha.

import {
  AREAS_DIREITO, MOTIVOS_BAIXA, reais, TIPOS_LEVANTAMENTO,
  type AreaRelatorio, type ClienteRelatorio, type CompararCom, type DadosRelatorioExportado, type PeriodoRelatorio,
} from "@t3jus/domain";
import type { Aba, Celula } from "./planilha.ts";

export const ROTAS_RELATORIOS = {
  visao: "/financeiro/relatorios",
  clientes: "/financeiro/relatorios/clientes",
  cliente: (id: string) => `/financeiro/relatorios/clientes/${id}`,
  areas: "/financeiro/relatorios/areas",
  responsaveis: "/financeiro/relatorios/responsaveis",
};

export const nomeArea = (a: AreaRelatorio) => (a === "SEM_CASO" ? "Sem caso ligado" : AREAS_DIREITO[a]);

const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MES_LONGO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const mesDe = (d: string) => Number(d.slice(5, 7)) - 1;
export const diaBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const diaMes = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (a: number, m: number, d: number) => `${a}-${pad(m)}-${pad(d)}`;
const diasNoMes = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).getUTCDate();
export const fimDoMes = (d: string) => iso(Number(d.slice(0, 4)), Number(d.slice(5, 7)), diasNoMes(Number(d.slice(0, 4)), Number(d.slice(5, 7))));
const somarMeses = (d: string, n: number) => {
  const t = Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7)) - 1 + n;
  const a = Math.floor(t / 12);
  const m = (t % 12) + 1;
  return iso(a, m, Math.min(Number(d.slice(8, 10)), diasNoMes(a, m)));
};
const somarDias = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const diasEntre = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/** "01/09 a 18/11/2026", ou com o ano nas duas pontas quando os anos são diferentes. */
export function periodoTexto(de: string, ate: string): string {
  return de.slice(0, 4) === ate.slice(0, 4) ? `${diaMes(de)} a ${diaBr(ate)}` : `${diaBr(de)} a ${diaBr(ate)}`;
}

/** "set–nov", "nov", ou "set/2025–nov/2026". */
export function periodoCurto(de: string, ate: string): string {
  if (de.slice(0, 7) === ate.slice(0, 7)) return MES_CURTO[mesDe(de)]!;
  if (de.slice(0, 4) === ate.slice(0, 4)) return `${MES_CURTO[mesDe(de)]}–${MES_CURTO[mesDe(ate)]}`;
  return `${MES_CURTO[mesDe(de)]}/${de.slice(0, 4)}–${MES_CURTO[mesDe(ate)]}/${ate.slice(0, 4)}`;
}

/**
 * F3.173: o período como o "Baixado sem receber" escreve: "set. a nov.", "nov." ou
 * "set./2025 a jan./2026" quando são meses inteiros (o mês de hoje conta como inteiro); senão,
 * "05/09 a 14/09/2026".
 */
export function periodoMeses(de: string, ate: string, hoje: string): string {
  const inteiro = de.slice(8, 10) === "01" && (ate === fimDoMes(ate) || ate === hoje);
  if (!inteiro) return periodoTexto(de, ate);
  const m = (d: string) => `${MES_CURTO[mesDe(d)]}.`;
  if (de.slice(0, 7) === ate.slice(0, 7)) return m(de);
  if (de.slice(0, 4) === ate.slice(0, 4)) return `${m(de)} a ${m(ate)}`;
  return `${m(de)}/${de.slice(0, 4)} a ${m(ate)}/${ate.slice(0, 4)}`;
}

/** "desfeita em 12/11": o selo da baixa que foi desfeita depois (nunca muda o número do período). */
export const desfeitaEm = (d: string) => `desfeita em ${diaMes(d)}`;

/** O rótulo curto do período de comparação ("jun–ago"), ou nulo quando não compara. */
export const rotuloComparacao = (p: PeriodoRelatorio) => (p.cde && p.cate ? periodoCurto(p.cde, p.cate) : null);

/** "R$ 5.830,00 a menos que jun–ago", "igual a jun–ago". */
export function comparaTexto(atual: number, anterior: number, rotulo: string): string {
  const d = atual - anterior;
  if (d === 0) return `igual a ${rotulo}`;
  return `${reais(Math.abs(d))} ${d > 0 ? "a mais" : "a menos"} que ${rotulo}`;
}

/** Valor com o sinal de menos tipográfico quando negativo. */
export const reaisComSinal = (v: number) => (v < 0 ? `−${reais(-v)}` : reais(v));

export const nomeDoMesLongo = (d: string) => MES_LONGO[mesDe(d)]!;

// ---------------------------------------------------------------------------- período

export type Atalho = "mes" | "tres" | "ano" | "mesPassado" | "seis" | "anoPassado";
export function atalho(a: Atalho, hoje: string): { de: string; ate: string } {
  const ano = Number(hoje.slice(0, 4));
  const mes1 = `${hoje.slice(0, 7)}-01`;
  switch (a) {
    case "mes": return { de: mes1, ate: hoje };
    case "tres": return { de: somarMeses(mes1, -2), ate: hoje };
    case "seis": return { de: somarMeses(mes1, -5), ate: hoje };
    case "ano": return { de: `${ano}-01-01`, ate: hoje };
    case "mesPassado": { const de = somarMeses(mes1, -1); return { de, ate: fimDoMes(de) }; }
    case "anoPassado": return { de: `${ano - 1}-01-01`, ate: `${ano - 1}-12-31` };
  }
}

/** Qual botão do período está marcado; nulo quando as datas foram escolhidas. */
export function atalhoAtual(p: { de: string; ate: string }, hoje: string): "mes" | "tres" | "ano" | null {
  for (const a of ["mes", "tres", "ano"] as const) {
    const x = atalho(a, hoje);
    if (x.de === p.de && x.ate === p.ate) return a;
  }
  return null;
}

/** A comparação que o servidor vai usar (a mesma regra do banco), para a janela mostrar antes. */
export function comparacao(de: string, ate: string, comparar: CompararCom, hoje: string): { de: string; ate: string } | null {
  if (comparar === "nao") return null;
  if (comparar === "ano_passado") return { de: somarMeses(de, -12), ate: somarMeses(ate, -12) };
  const inteiro = de.slice(8, 10) === "01" && (ate === fimDoMes(ate) || ate === hoje);
  if (inteiro) {
    const meses = (Number(ate.slice(0, 4)) * 12 + Number(ate.slice(5, 7))) - (Number(de.slice(0, 4)) * 12 + Number(de.slice(5, 7))) + 1;
    return { de: somarMeses(de, -meses), ate: somarDias(de, -1) };
  }
  return { de: somarDias(de, -(diasEntre(de, ate) + 1)), ate: somarDias(de, -1) };
}

/** Lê dd/mm/aaaa. Devolve a data, ou o erro escrito para o campo. */
export function lerData(txt: string): { data: string } | { erro: string } {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(txt);
  if (!m) return { erro: "Escreva a data como dd/mm/aaaa." };
  const [d, mm, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mm < 1 || mm > 12) return { erro: "O mês vai de 01 a 12. Confira o mês." };
  const max = diasNoMes(a, mm);
  if (d < 1 || d > max) return { erro: `${MES_LONGO[mm - 1]!.charAt(0).toUpperCase()}${MES_LONGO[mm - 1]!.slice(1)} tem ${max} dias. Confira o dia.` };
  return { data: iso(a, mm, d) };
}

/** Confere o período da janela "Escolher datas". */
export function conferirPeriodo(deTxt: string, ateTxt: string, hoje: string):
  { ok: true; de: string; ate: string } | { ok: false; erros: { de?: string; ate?: string } } {
  const de = lerData(deTxt);
  const ate = lerData(ateTxt);
  const erros: { de?: string; ate?: string } = {};
  if ("erro" in de) erros.de = de.erro;
  if ("erro" in ate) erros.ate = ate.erro;
  if ("data" in ate && ate.data > hoje) erros.ate = `A data final pode ser hoje, ${diaBr(hoje)}, ou antes.`;
  if ("data" in de && "data" in ate && !erros.ate && ate.data < de.data) erros.ate = "A data final é antes da inicial. Escolha uma data depois de \"De\".";
  if ("data" in de && "data" in ate && !erros.de && !erros.ate && ate.data >= somarMeses(de.data, 24)) erros.ate = "O relatório mostra até 2 anos por vez. Escolha uma data mais perto.";
  if (erros.de || erros.ate || !("data" in de) || !("data" in ate)) return { ok: false, erros };
  return { ok: true, de: de.data, ate: ate.data };
}

/** O período no endereço: vazio quando é o padrão (últimos 3 meses, contra o anterior). */
export function consultaPeriodo(p: { de: string; ate: string; comparar: CompararCom }, hoje: string): string {
  const padrao = atalho("tres", hoje);
  const q = new URLSearchParams();
  if (p.de !== padrao.de || p.ate !== padrao.ate) {
    q.set("de", p.de);
    q.set("ate", p.ate);
  }
  if (p.comparar !== "anterior") q.set("comparar", p.comparar);
  const s = q.toString();
  return s ? `?${s}` : "";
}

// ---------------------------------------------------------------------------- por cliente

export type OrdemClientes = "entrou" | "falta" | "vencido" | "baixado" | "rendeu" | "nome";
export const ORDENS_CLIENTES: { v: OrdemClientes; t: string }[] = [
  { v: "entrou", t: "Entrou, do maior para o menor" },
  { v: "falta", t: "Falta receber, do maior" },
  { v: "vencido", t: "Vencido, do maior" },
  { v: "baixado", t: "Baixado sem receber, do maior" },
  { v: "rendeu", t: "Rendeu, do menor para o maior" },
  { v: "nome", t: "Nome, de A a Z" },
];
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function filtrarClientes(lista: ClienteRelatorio[], f: { q: string; area: AreaRelatorio | ""; ordem: OrdemClientes }): ClienteRelatorio[] {
  const q = semAcento(f.q.trim());
  const nome = (a: ClienteRelatorio, b: ClienteRelatorio) => a.nome.localeCompare(b.nome, "pt-BR");
  const por: Record<OrdemClientes, (a: ClienteRelatorio, b: ClienteRelatorio) => number> = {
    entrou: (a, b) => b.entrou - a.entrou || nome(a, b),
    falta: (a, b) => b.falta - a.falta || nome(a, b),
    vencido: (a, b) => b.vencido - a.vencido || nome(a, b),
    baixado: (a, b) => (b.baixado ?? 0) - (a.baixado ?? 0) || b.entrou - a.entrou || nome(a, b),
    rendeu: (a, b) => a.rendeu - b.rendeu || nome(a, b),
    nome,
  };
  return lista.filter((c) => (!q || semAcento(c.nome).includes(q)) && (!f.area || c.areas.includes(f.area))).sort(por[f.ordem]);
}

export function totaisClientes(lista: ClienteRelatorio[]) {
  const soma = (k: "contratado" | "entrou" | "falta" | "vencido" | "adiantado" | "rendeu") => lista.reduce((s, c) => s + c[k], 0);
  return {
    contratado: soma("contratado"), entrou: soma("entrou"), falta: soma("falta"), vencido: soma("vencido"),
    adiantado: soma("adiantado"), rendeu: soma("rendeu"), baixado: lista.reduce((s, c) => s + (c.baixado ?? 0), 0), aparte: lista.reduce((s, c) => s + c.aparte.reduce((x, a) => x + a.valor, 0), 0),
  };
}

// ---------------------------------------------------------------------------- planilha

const r$ = (v: number): Celula => ({ reais: v / 100 });

/** As abas do arquivo: os números, por cliente, por área, por responsável, os recebimentos e,
 * à parte, os valores de terceiros, que não somam com as outras. */
export function abasRelatorio(d: DadosRelatorioExportado): Aba[] {
  const p = d.periodo;
  const r = d.resumo;
  const cmp = p.cde && p.cate ? `comparado com ${periodoTexto(p.cde, p.cate)}` : "sem comparação";
  const numeros: Aba = {
    nome: "Números", larguras: [44, 18, 18],
    linhas: [
      [`Relatório do sócio · ${periodoTexto(p.de, p.ate)}`, null, null],
      [cmp, null, null],
      [null, "Período", "Comparação"],
      ["Entrou", r$(r.entrou.valor), r.entrou.anterior === null ? null : r$(r.entrou.anterior)],
      ["Falta receber (hoje)", r$(r.falta.valor), r.falta.anterior === null ? null : r$(r.falta.anterior)],
      ["  vencido", r$(r.falta.vencido), r.falta.vencidoAnterior === null ? null : r$(r.falta.vencidoAnterior)],
      ["RPV e precatório à parte (não soma)", r$(r.falta.aparte.valor), null],
      ...(r.baixado?.algum ? linhasBaixado(r.baixado) : []),
      ["Despesas de caso adiantadas que não voltaram", r$(r.rendeu.adiantado), null],
      ["Rendeu", r$(r.rendeu.valor), r.rendeu.anterior === null ? null : r$(r.rendeu.anterior)],
      ["Contratado no período", r$(r.contratado), null],
      [null, null, null],
      ["Como contamos: Entrou pelo dia em que o dinheiro entrou, sem dinheiro de terceiros. Rendeu é Entrou menos as despesas de caso adiantadas que ainda não voltaram, sem aluguel nem salários.", null, null],
    ],
  };
  const comBaixado = d.clientes.some((c) => c.baixado !== undefined);
  const clientes: Aba = {
    nome: "Por cliente", larguras: comBaixado ? [36, 16, 16, 16, 16, 18, 18, 16, 28] : [36, 16, 16, 16, 16, 18, 16, 28],
    linhas: [
      ["Cliente", "Contratado", "Entrou", "Falta receber", "Vencido", ...(comBaixado ? ["Baixado sem receber (não soma)"] : []), "Despesas não reembolsadas", "Rendeu", "Responsáveis"],
      ...d.clientes.map((c): Celula[] => [c.nome, r$(c.contratado), r$(c.entrou), r$(c.falta), r$(c.vencido), ...(comBaixado ? [r$(c.baixado ?? 0)] : []),
        r$(c.adiantado), r$(c.rendeu), c.responsaveis.join(", ")]),
    ],
  };
  const areas: Aba = {
    nome: "Por área", larguras: [22, 12, 16, 16, 16, 16, 16],
    linhas: [
      ["Área", "Casos", "Entrou", "Comparação", "Falta receber", "Despesas não reembolsadas", "Rendeu"],
      ...d.areas.map((a): Celula[] => [nomeArea(a.area), a.casos, r$(a.entrou), a.anterior === null ? null : r$(a.anterior), r$(a.falta), r$(a.adiantado), r$(a.rendeu)]),
    ],
  };
  const resp: Aba = {
    nome: "Por responsável", larguras: [28, 10, 14, 16, 16, 18, 16],
    linhas: [
      ["Responsável", "Casos", "Contratos sem caso", "Entrou", "Falta receber", "Despesas não reembolsadas", "Rendeu"],
      ...d.responsaveis.map((x): Celula[] => [x.pessoa.nome, x.casos, x.contratosSemCaso, r$(x.entrou), r$(x.falta), r$(x.adiantado), r$(x.rendeu)]),
    ],
  };
  const rec: Aba = {
    nome: "Recebimentos", larguras: [12, 32, 16, 36, 18, 16, 24],
    linhas: [
      ["Dia", "Cliente", "Contrato", "O quê", "Área", "Valor", "Responsável"],
      ...d.recebimentos.map((e): Celula[] => [diaBr(e.dia), e.cliente, e.contrato, e.descricao, nomeArea(e.area), r$(e.valor), e.responsavel]),
    ],
  };
  const terc: Aba = {
    nome: "Terceiros (à parte)", larguras: [12, 14, 32, 32, 16, 16, 16],
    linhas: [
      ["De terceiros · não é do escritório e não soma com as outras abas", null, null, null, null, null, null],
      ["Entrou em", "Tipo", "Cliente", "Caso", "Valor", "Repassado ao cliente", "Honorários"],
      ...d.terceiros.map((t): Celula[] => [diaBr(t.entrouEm), TIPOS_LEVANTAMENTO[t.tipo], t.cliente, t.caso, r$(t.valor), r$(t.repassado), r$(t.honorarios)]),
    ],
  };
  // F3.173: as baixas sem receber e os desfazer do período, sem a explicação.
  const baixas: Aba | null = d.baixas ? {
    nome: "Baixas sem receber", larguras: [12, 40, 32, 16, 24, 26, 16, 24],
    linhas: [
      ["Dia", "O quê", "Cliente", "Contrato", "Parcela", "Motivo", "Valor", "Quem"],
      ...d.baixas.map((b): Celula[] => [diaBr(b.dia), oQueBaixa(b), b.cliente, b.contrato, b.parcela,
        b.motivo === "RENEGOCIADA" ? `${MOTIVOS_BAIXA[b.motivo]} (não soma)` : MOTIVOS_BAIXA[b.motivo], r$(b.valor), b.por]),
    ],
  } : null;
  return baixas ? [numeros, clientes, areas, resp, rec, baixas, terc] : [numeros, clientes, areas, resp, rec, terc];
}

/** As linhas do "Baixado sem receber" na aba Números. Só a primeira soma no período. */
function linhasBaixado(b: NonNullable<DadosRelatorioExportado["resumo"]["baixado"]>): Celula[][] {
  return [
    ["Baixado sem receber no período", r$(b.valor), b.anterior === null ? null : r$(b.anterior)],
    ["  baixas desfeitas no período (voltaram para A receber)", r$(b.desfeitas.valor), null],
    ["  renegociado (não soma)", r$(b.renegociado.valor), null],
    ...(b.renegociado.desfeitas.n ? [["    renegociado desfeito no período", r$(b.renegociado.desfeitas.valor), null] as Celula[]] : []),
    ["  custas baixadas junto (não soma)", r$(b.custas.valor), null],
    ...(b.custas.desfeitas.n ? [["    custas desfeitas no período", r$(b.custas.desfeitas.valor), null] as Celula[]] : []),
  ];
}

/** "Baixa sem receber · desfeita em 12/11", "Baixa desfeita · custas (não soma)". */
export function oQueBaixa(b: { tipo: "BAIXA" | "DESFEITA"; custas: boolean; desfeitaEm: string | null }): string {
  return [b.tipo === "BAIXA" ? "Baixa sem receber" : "Baixa desfeita", b.custas ? "custas (não soma)" : null,
    b.tipo === "BAIXA" && b.desfeitaEm ? desfeitaEm(b.desfeitaEm) : null].filter(Boolean).join(" · ");
}

export const nomeArquivoRelatorio = (p: PeriodoRelatorio) => `relatorio-${p.de}-a-${p.ate}.xlsx`;
