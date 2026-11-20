import { describe, expect, it } from "vitest";
import type { ClienteRelatorio } from "@t3jus/domain";
import {
  atalho, atalhoAtual, comparacao, comparaTexto, conferirPeriodo, consultaPeriodo, filtrarClientes, lerData, periodoCurto, periodoTexto, totaisClientes,
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
