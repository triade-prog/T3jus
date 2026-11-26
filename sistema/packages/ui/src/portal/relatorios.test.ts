import { describe, expect, it } from "vitest";
import type { ClienteRelatorio, DadosRelatorioExportado, ResumoRelatorio } from "@t3jus/domain";
import {
  abasRelatorio, atalho, atalhoAtual, comparacao, comparaTexto, conferirPeriodo, consultaPeriodo, desfeitaEm, filtrarClientes, lerData, oQueBaixa,
  periodoCurto, periodoMeses, periodoTexto, totaisClientes,
} from "./relatorios.ts";

const HOJE = "2026-11-18";

describe("período dos relatórios", () => {
  it("abre nos últimos 3 meses, com o mês de hoje", () => {
    expect(atalho("tres", HOJE)).toEqual({ de: "2026-09-01", ate: HOJE });
    expect(atalho("mesPassado", HOJE)).toEqual({ de: "2026-10-01", ate: "2026-10-31" });
    expect(atalho("anoPassado", HOJE)).toEqual({ de: "2025-01-01", ate: "2025-12-31" });
    expect(atalhoAtual({ de: "2026-01-01", ate: HOJE }, HOJE)).toBe("ano");
    expect(atalhoAtual({ de: "2026-07-01", ate: "2026-09-30" }, HOJE)).toBeNull();
  });
  it("escreve o período como na tela aprovada", () => {
    expect(periodoTexto("2026-09-01", HOJE)).toBe("01/09 a 18/11/2026");
    expect(periodoTexto("2025-12-01", "2026-01-31")).toBe("01/12/2025 a 31/01/2026");
    expect(periodoCurto("2026-06-01", "2026-08-31")).toBe("jun–ago");
    expect(periodoCurto("2026-11-01", HOJE)).toBe("nov");
  });
  it("compara com a mesma regra do servidor", () => {
    expect(comparacao("2026-09-01", HOJE, "anterior", HOJE)).toEqual({ de: "2026-06-01", ate: "2026-08-31" });
    expect(comparacao("2026-07-01", "2026-09-30", "anterior", HOJE)).toEqual({ de: "2026-04-01", ate: "2026-06-30" });
    expect(comparacao("2026-09-05", "2026-09-14", "anterior", HOJE)).toEqual({ de: "2026-08-26", ate: "2026-09-04" });
    expect(comparacao("2026-07-01", "2026-09-30", "ano_passado", HOJE)).toEqual({ de: "2025-07-01", ate: "2025-09-30" });
    expect(comparacao("2026-07-01", "2026-09-30", "nao", HOJE)).toBeNull();
  });
  it("diz a diferença em reais, sem seta", () => {
    expect(comparaTexto(11_620_000, 12_203_000, "jun–ago")).toBe("R$ 5.830,00 a menos que jun–ago");
    expect(comparaTexto(100, 100, "jun–ago")).toBe("igual a jun–ago");
  });
  it("confere as datas da janela com o erro de cada campo", () => {
    expect(lerData("31/09/2026")).toEqual({ erro: "Setembro tem 30 dias. Confira o dia." });
    expect(conferirPeriodo("31/09/2026", "15/08/2026", HOJE)).toEqual({ ok: false, erros: { de: "Setembro tem 30 dias. Confira o dia." } });
    expect(conferirPeriodo("01/09/2026", "15/08/2026", HOJE)).toEqual({ ok: false, erros: { ate: "A data final é antes da inicial. Escolha uma data depois de \"De\"." } });
    expect(conferirPeriodo("01/09/2026", "19/11/2026", HOJE)).toMatchObject({ ok: false, erros: { ate: "A data final pode ser hoje, 18/11/2026, ou antes." } });
    expect(conferirPeriodo("01/01/2024", "18/11/2026", HOJE)).toMatchObject({ ok: false });
    expect(conferirPeriodo("01/07/2026", "30/09/2026", HOJE)).toEqual({ ok: true, de: "2026-07-01", ate: "2026-09-30" });
  });
  it("guarda no endereço só o que não é o padrão", () => {
    expect(consultaPeriodo({ de: "2026-09-01", ate: HOJE, comparar: "anterior" }, HOJE)).toBe("");
    expect(consultaPeriodo({ de: "2026-07-01", ate: "2026-09-30", comparar: "nao" }, HOJE)).toBe("?de=2026-07-01&ate=2026-09-30&comparar=nao");
  });
});

describe("por cliente", () => {
  const c = (nome: string, entrou: number, rendeu: number, area: ClienteRelatorio["areas"][number]): ClienteRelatorio => ({
    id: nome, nome, inativo: false, contratos: 1, responsaveis: [], areas: [area], contratado: 0, aparte: [{ tipo: "RPV", valor: 10 }],
    entrou, adiantado: entrou - rendeu, rendeu, falta: 5, vencido: 0,
  });
  const lista = [c("Hélio", 100, -50, "CIVEL"), c("Farmácia", 300, 300, "SEM_CASO"), c("Benedito", 30, 30, "PREVIDENCIARIO")];
  it("busca sem acento, filtra pela área e ordena", () => {
    expect(filtrarClientes(lista, { q: "helio", area: "", ordem: "entrou" }).map((x) => x.nome)).toEqual(["Hélio"]);
    expect(filtrarClientes(lista, { q: "", area: "", ordem: "rendeu" }).map((x) => x.nome)).toEqual(["Hélio", "Benedito", "Farmácia"]);
    expect(filtrarClientes(lista, { q: "", area: "SEM_CASO", ordem: "nome" }).map((x) => x.nome)).toEqual(["Farmácia"]);
  });
  it("soma o pé da tabela", () => {
    expect(totaisClientes(lista)).toMatchObject({ entrou: 430, rendeu: 280, falta: 15, aparte: 30 });
  });
});

describe("F3.173: baixado sem receber (IN-04, IN-07)", () => {
  it("escreve o período como a folha do desenho", () => {
    expect(periodoMeses("2026-09-01", HOJE, HOJE)).toBe("set. a nov.");
    expect(periodoMeses("2026-06-01", "2026-08-31", HOJE)).toBe("jun. a ago.");
    expect(periodoMeses("2026-10-01", "2026-10-31", HOJE)).toBe("out.");
    expect(periodoMeses("2025-12-01", "2026-01-31", HOJE)).toBe("dez./2025 a jan./2026");
    expect(periodoMeses("2026-09-05", "2026-09-14", HOJE)).toBe("05/09 a 14/09/2026");
    expect(desfeitaEm("2026-11-12")).toBe("desfeita em 12/11");
  });

  const c = (nome: string, entrou: number, baixado?: number): ClienteRelatorio => ({
    id: nome, nome, inativo: false, contratos: 1, responsaveis: ["Felipe Matos"], areas: ["CIVEL"], contratado: 0, aparte: [],
    entrou, adiantado: 0, rendeu: entrou, falta: 0, vencido: 0, ...(baixado === undefined ? {} : { baixado, baixadoMotivos: baixado ? ["INADIMPLENCIA" as const] : [] }),
  });
  it("ordena por baixado sem receber e soma o pé", () => {
    const lista = [c("Ana", 900, 0), c("Rita Fonseca", 0, 480000), c("Noemi Bastos Carvalho", 10, 100000)];
    expect(filtrarClientes(lista, { q: "", area: "", ordem: "baixado" }).map((x) => x.nome)).toEqual(["Rita Fonseca", "Noemi Bastos Carvalho", "Ana"]);
    expect(totaisClientes(lista).baixado).toBe(580000);
    expect(totaisClientes([c("Sem a 1101", 10)]).baixado).toBe(0);
  });

  const periodo = { de: "2026-09-01", ate: HOJE, comparar: "anterior" as const, cde: "2026-06-01", cate: "2026-08-31", hoje: HOJE, aberto: true };
  const faixa = { valor: 0, n: 0 };
  const resumo = {
    periodo, entrou: { valor: 0, n: 0, anterior: 0, previstoMes: 0 },
    falta: { valor: 0, vencido: 0, vencidas: 0, anterior: 0, vencidoAnterior: 0, faixas: [faixa, faixa, faixa, faixa], aVencerMes: faixa, aVencerDepois: faixa, aparte: { valor: 0, lista: [] } },
    rendeu: { valor: 0, adiantado: 0, anterior: 0, despesas: [] }, contratado: 0,
    baixado: { valor: 580000, n: 2, porMotivo: { PERDOADA: 0, INADIMPLENCIA: 580000 }, desfeitas: { valor: 100000, n: 1 },
      renegociado: { valor: 50000, n: 1, desfeitas: faixa }, custas: { valor: 41230, n: 1, desfeitas: { valor: 41230, n: 1 } }, anterior: 0, algum: true },
  } as unknown as ResumoRelatorio;
  const dados = {
    periodo, formato: "XLSX", resumo, areas: [], responsaveis: [], recebimentos: [], terceiros: [],
    clientes: [c("Rita Fonseca", 0, 480000)],
    baixas: [
      { dia: "2026-10-15", tipo: "BAIXA", motivo: "INADIMPLENCIA", custas: false, soma: true, valor: 100000, desfeitaEm: "2026-11-12",
        cliente: "Noemi Bastos Carvalho", contrato: "C-2026-012", parcela: "Parcela 6 de 6", por: "Marina Ribeiro" },
      { dia: "2026-11-10", tipo: "BAIXA", motivo: "RENEGOCIADA", custas: false, soma: false, valor: 50000, desfeitaEm: null,
        cliente: "Sebastião Lopes", contrato: "C-2026-014", parcela: "Fixo", por: "Marina Ribeiro" },
      { dia: "2026-11-12", tipo: "DESFEITA", motivo: "INADIMPLENCIA", custas: true, soma: false, valor: 41230, desfeitaEm: null,
        cliente: "Noemi Bastos Carvalho", contrato: "C-2026-012", parcela: "Parcela 6 de 6", por: "Marina Ribeiro" },
    ],
  } as unknown as DadosRelatorioExportado;

  it("a planilha ganha as linhas, a coluna e a aba nova, sem a explicação", () => {
    const abas = abasRelatorio(dados);
    expect(abas.map((a) => a.nome)).toEqual(["Números", "Por cliente", "Por área", "Por responsável", "Recebimentos", "Baixas sem receber", "Terceiros (à parte)"]);
    const num = abas[0]!.linhas;
    expect(num).toContainEqual(["Baixado sem receber no período", { reais: 5800 }, { reais: 0 }]);
    expect(num).toContainEqual(["  baixas desfeitas no período (voltaram para A receber)", { reais: 1000 }, null]);
    expect(num).toContainEqual(["  renegociado (não soma)", { reais: 500 }, null]);
    expect(num).toContainEqual(["  custas baixadas junto (não soma)", { reais: 412.3 }, null]);
    expect(abas[1]!.linhas[0]).toContain("Baixado sem receber (não soma)");
    expect(abas[1]!.linhas[1]![5]).toEqual({ reais: 4800 });
    const bx = abas[5]!.linhas;
    expect(bx[0]).toEqual(["Dia", "O quê", "Cliente", "Contrato", "Parcela", "Motivo", "Valor", "Quem"]);
    expect(bx[1]).toEqual(["15/10/2026", "Baixa sem receber · desfeita em 12/11", "Noemi Bastos Carvalho", "C-2026-012", "Parcela 6 de 6", "Inadimplência", { reais: 1000 }, "Marina Ribeiro"]);
    expect(bx[2]![5]).toBe("Renegociada (não soma)");
    expect(bx[3]![1]).toBe("Baixa desfeita · custas (não soma)");
    expect(JSON.stringify(abas)).not.toContain("explica");
  });

  it("sem a 1101 no banco, a planilha fica como antes", () => {
    const antes = { ...dados, resumo: { ...resumo, baixado: undefined }, clientes: [c("Rita Fonseca", 0)], baixas: undefined } as unknown as DadosRelatorioExportado;
    const abas = abasRelatorio(antes);
    expect(abas.map((a) => a.nome)).not.toContain("Baixas sem receber");
    expect(abas[1]!.linhas[0]).not.toContain("Baixado sem receber (não soma)");
    expect(JSON.stringify(abas[0])).not.toContain("Baixado");
    expect(oQueBaixa({ tipo: "BAIXA", custas: false, desfeitaEm: null })).toBe("Baixa sem receber");
  });
});
