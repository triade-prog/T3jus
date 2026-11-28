import { describe, expect, it } from "vitest";
import {
  COMO_CONFIRMOU, confirmarAssinaturaSchema, contarFiltrosTeste, filtrarPorTeste, filtroTesteSchema, FILTROS_TESTE, motivoTesteSchema,
  noFiltroTeste, prorrogarTesteSchema, queroAssinarSchema, querAssinar, SITUACOES_TESTE, type TesteCarteira,
} from "./teste_gratis.ts";
import { TEXTOS_MOTIVO } from "./textos.ts";

const t = (x: Partial<TesteCarteira>): TesteCarteira => ({
  situacao: "EM_TESTE", inicio: "2026-11-27", fim: "2026-12-03", totalDias: 7, diaAtual: 6, prorrogado: false, soConsultaDesde: null, querAssinarEm: null, ...x,
});
const CARTEIRA = [
  { nome: "Ribeiro", teste: t({ querAssinarEm: "2026-12-01T19:20:00Z" }) },
  { nome: "Sucupira", teste: t({ inicio: "2026-11-24", fim: "2026-12-04", totalDias: 11, diaAtual: 9, prorrogado: true }) },
  { nome: "Ipê", teste: t({ situacao: "ACABOU", inicio: "2026-11-23", fim: "2026-11-29", diaAtual: null, soConsultaDesde: "2026-11-30", querAssinarEm: "2026-11-30T12:00:00Z" }) },
  { nome: "Assinado", teste: t({ situacao: "ASSINADO", querAssinarEm: "2026-11-28T12:00:00Z" }) },
  { nome: "Cedro", teste: t({ situacao: "PREVISTO", inicio: null, fim: null, totalDias: null, diaAtual: null }) },
  { nome: "Antigo", teste: null },
];

describe("teste grátis (CO-09)", () => {
  it("CO-09: os filtros da carteira: Em teste inclui o prorrogado; Quer assinar não inclui o já assinado", () => {
    expect(filtrarPorTeste(CARTEIRA, "EM_TESTE").map((x) => x.nome)).toEqual(["Ribeiro", "Sucupira"]);
    expect(filtrarPorTeste(CARTEIRA, "ACABOU").map((x) => x.nome)).toEqual(["Ipê"]);
    expect(filtrarPorTeste(CARTEIRA, "QUER_ASSINAR").map((x) => x.nome)).toEqual(["Ipê", "Ribeiro"]);
    expect(contarFiltrosTeste(CARTEIRA)).toEqual({ EM_TESTE: 2, ACABOU: 1, QUER_ASSINAR: 2 });
    expect(noFiltroTeste(null, "EM_TESTE")).toBe(false);
    expect(querAssinar(CARTEIRA[3]!.teste)).toBe(false);
  });
  it("CO-09: Em teste ordena pelo fim mais próximo", () => {
    const l = [{ teste: t({ fim: "2026-12-09" }) }, { teste: t({ fim: "2026-12-03" }) }];
    expect(filtrarPorTeste(l, "EM_TESTE").map((x) => x.teste.fim)).toEqual(["2026-12-03", "2026-12-09"]);
  });
  it("CO-09: o filtro da rota só aceita os três", () => {
    expect(Object.keys(FILTROS_TESTE)).toEqual(filtroTesteSchema.options);
    expect(filtroTesteSchema.safeParse("ASSINADO").success).toBe(false);
  });
  it("CO-09: prorrogar leva a versão, a data em ISO e o motivo", () => {
    expect(prorrogarTesteSchema.safeParse({ versao: 3, fim: "2026-12-08", motivo: "Sem internet na primeira semana" }).success).toBe(true);
    expect(prorrogarTesteSchema.safeParse({ versao: 3, fim: "08/12/2026", motivo: "x" }).success).toBe(false);
    expect(prorrogarTesteSchema.safeParse({ fim: "2026-12-08", motivo: "x" }).success).toBe(false);
    expect(motivoTesteSchema.safeParse({ versao: 1, motivo: "" }).success).toBe(true);
    expect(motivoTesteSchema.safeParse({ versao: 1, motivo: "x".repeat(301) }).success).toBe(false);
  });
  it("CO-09: confirmar e Quero assinar só conferem o formato; o tamanho do detalhe e do recado é do banco", () => {
    expect(confirmarAssinaturaSchema.safeParse({ versao: 2, como: "PORTAL", detalhe: "x".repeat(301) }).success).toBe(true);
    expect(confirmarAssinaturaSchema.safeParse({ como: "PORTAL", detalhe: "Ligação" }).success).toBe(false);
    expect(queroAssinarSchema.safeParse({}).success).toBe(true);
    expect(queroAssinarSchema.safeParse({ recado: null }).success).toBe(true);
    expect(queroAssinarSchema.safeParse({ recado: 12 }).success).toBe(false);
  });
  it("CO-09: os nomes da tela e os motivos novos têm texto", () => {
    expect(Object.keys(COMO_CONFIRMOU)).toEqual(["PORTAL", "EMAIL", "WHATSAPP", "REUNIAO_OU_LIGACAO", "OUTRO"]);
    expect(SITUACOES_TESTE.AGUARDANDO_LIBERACAO).not.toMatch(/repetid/i);
    expect(TEXTOS_MOTIVO.QUERO_ASSINAR_FORA_DO_TESTE).toBeTruthy();
  });
});
