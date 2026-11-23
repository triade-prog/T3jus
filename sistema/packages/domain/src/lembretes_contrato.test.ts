import { describe, expect, it } from "vitest";
import {
  camposDispensa, detalheDispensa, dispensarLembreteSchema, filtroLembretesSchema, MOTIVOS_DISPENSA, ORDENS_LEMBRETE, SITUACOES_LEMBRETE,
} from "./lembretes_contrato.ts";
import { COMO_ENCERROU, filtroCasosSchema, registrarResultadoSchema } from "./juridico.ts";

describe("lembretes de contrato (F3.144, F3.145)", () => {
  it("usa os textos aprovados dos motivos, dos grupos e das ordens", () => {
    expect(Object.values(MOTIVOS_DISPENSA)).toEqual([
      "Já negociado ou recebido fora do T3jus", "O escritório perdoou o valor", "Já está em outro contrato", "Outro motivo",
    ]);
    expect(Object.values(SITUACOES_LEMBRETE)).toEqual(["Abertos", "Viraram contrato", "Dispensados"]);
    expect(Object.values(ORDENS_LEMBRETE)).toEqual(["Maior valor primeiro", "Lançamento mais antigo primeiro", "Nome do cliente (A a Z)"]);
  });

  it("o detalhe com menos de 3 caracteres, sem os espaços, conta como vazio (a mesma regra do banco)", () => {
    expect(detalheDispensa("  ab  ")).toBeNull();
    expect(detalheDispensa(null)).toBeNull();
    expect(detalheDispensa("  Pix  ")).toBe("Pix");
    expect(dispensarLembreteSchema.parse({ motivo: "PERDOADO", detalhe: " x " })).toEqual({ motivo: "PERDOADO", detalhe: null });
  });

  it("pede o motivo e, em \"Outro motivo\", o detalhe; marca os campos juntos", () => {
    expect(camposDispensa({})).toEqual(["motivo"]);
    expect(camposDispensa({ motivo: "OUTRO", detalhe: "ok" })).toEqual(["detalhe"]);
    expect(camposDispensa({ motivo: "OUTRO", detalhe: "Cliente faleceu, sem herdeiros" })).toEqual([]);
    expect(camposDispensa({ motivo: "JA_NEGOCIADO", detalhe: "x".repeat(141) })).toEqual(["detalhe"]);
    expect(camposDispensa({ motivo: "JA_NEGOCIADO" })).toEqual([]);
  });

  it("o filtro tem Abertos por padrão e recusa grupo e ordem desconhecidos", () => {
    expect(filtroLembretesSchema.parse({})).toEqual({ situacao: "ABERTO", pular: 0 });
    expect(filtroLembretesSchema.safeParse({ situacao: "TODOS" }).success).toBe(false);
    expect(filtroLembretesSchema.safeParse({ ordem: "DATA" }).success).toBe(false);
    expect(filtroLembretesSchema.parse({ situacao: "DISPENSADO", ordem: "NOME", pular: "25" }).pular).toBe(25);
  });
});

describe("o caso que veio encerrado (F3.143, F3.148)", () => {
  it("\"Como encerrou\" só vale nos Encerrados", () => {
    expect(Object.values(COMO_ENCERROU)).toEqual(["Com resultado", "Veio encerrado da importação", "Importação desfeita"]);
    expect(filtroCasosSchema.safeParse({ situacao: "ENCERRADO", como: "IMPORTADO" }).success).toBe(true);
    expect(filtroCasosSchema.safeParse({ situacao: "ANDAMENTO", como: "IMPORTADO" }).success).toBe(false);
    expect(filtroCasosSchema.safeParse({ situacao: "ENCERRADO", pular: 10001 }).success).toBe(false);
  });

  it("registrar o resultado pede a versão; resultado e motivo o banco confere juntos", () => {
    expect(registrarResultadoSchema.safeParse({ resultado: "GANHO", motivo: "Sentença" }).success).toBe(false);
    expect(registrarResultadoSchema.parse({ versao: 2 })).toEqual({ versao: 2 });
  });
});
