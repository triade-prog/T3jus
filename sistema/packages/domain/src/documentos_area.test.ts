import { describe, expect, it } from "vitest";
import {
  AREAS_DOCUMENTOS, faltaNaSugestao, marcadosDaArea, mesmaLista, rotuloAreaDocumentos, salvarDocumentosAreaSchema, SUGESTAO_T3JUS_DOCUMENTOS,
} from "./documentos_area.ts";
import { escolhasDocumentosSchema } from "./documentos.ts";

const R = "OUTRO:11111111-1111-4111-8111-111111111111";
const I = "OUTRO:22222222-2222-4222-8222-222222222222";

describe("CH-14: documentos por área, as regras puras", () => {
  it("as 8 áreas na ordem da folha, com Outra ou sem área no fim, e a sugestão de hoje", () => {
    expect(AREAS_DOCUMENTOS).toHaveLength(8);
    expect(AREAS_DOCUMENTOS.at(-1)).toBe("OUTRA");
    expect(rotuloAreaDocumentos("OUTRA")).toBe("Outra ou sem área");
    expect(rotuloAreaDocumentos("PREVIDENCIARIO")).toBe("Previdenciário");
    expect(SUGESTAO_T3JUS_DOCUMENTOS).toEqual(["CONTRATO", "PROCURACAO", "HIPOSSUFICIENCIA"]);
  });

  it("o pedido de salvar aceita só as chaves conhecidas, até 12", () => {
    expect(salvarDocumentosAreaSchema.safeParse({ versao: null, documentos: ["CONTRATO", R] }).success).toBe(true);
    expect(salvarDocumentosAreaSchema.safeParse({ versao: 2, documentos: [] }).success).toBe(true);
    expect(salvarDocumentosAreaSchema.safeParse({ versao: 0, documentos: [] }).success).toBe(false);
    expect(salvarDocumentosAreaSchema.safeParse({ versao: 1, documentos: ["OUTRO:x"] }).success).toBe(false);
    expect(salvarDocumentosAreaSchema.safeParse({ versao: 1, documentos: ["TERMO"] }).success).toBe(false);
    expect(salvarDocumentosAreaSchema.safeParse({ versao: 1, documentos: Array(13).fill("CONTRATO") }).success).toBe(false);
  });

  it("a área vai opcional no pedido de gerar e só aceita as 8", () => {
    const base = { documentos: [{ tipo: "CONTRATO", modeloId: null }], outorgados: [{ pessoaId: "11111111-1111-4111-8111-111111111111", inscricoes: ["11111111-1111-4111-8111-111111111112"] }], poderes: [], outroPoder: null, cidadeData: "São Paulo, hoje" };
    expect(escolhasDocumentosSchema.safeParse(base).success).toBe(true);
    expect(escolhasDocumentosSchema.safeParse({ ...base, area: "FAMILIA" }).success).toBe(true);
    expect(escolhasDocumentosSchema.safeParse({ ...base, area: null }).success).toBe(true);
    expect(escolhasDocumentosSchema.safeParse({ ...base, area: "PENAL" }).success).toBe(false);
  });

  it("mesmaLista compara conjuntos, sem ordem", () => {
    expect(mesmaLista(["CONTRATO", "PROCURACAO"], ["PROCURACAO", "CONTRATO"])).toBe(true);
    expect(mesmaLista(["CONTRATO"], ["CONTRATO", "PROCURACAO"])).toBe(false);
  });

  it("a primeira geração marca a lista da área, sem o que já tem assinado e sem modelo que saiu", () => {
    const s = { porArea: { PREVIDENCIARIO: ["CONTRATO", "PROCURACAO", R, I] } as never };
    expect(marcadosDaArea("PREVIDENCIARIO", s, ["CONTRATO", "PROCURACAO", "HIPOSSUFICIENCIA", R], new Set(["CONTRATO"]))).toEqual(["PROCURACAO", R]);
    expect(marcadosDaArea("FAMILIA", s, ["CONTRATO"], new Set())).toEqual([]);
  });

  it("também tem: só o que entrou depois da última geração, ainda está na lista e não está marcado", () => {
    const s = {
      porArea: { PREVIDENCIARIO: ["CONTRATO", R, I] } as never,
      entraramDepois: { PREVIDENCIARIO: [{ chave: I, em: "2026-11-24T18:20:00Z" }, { chave: "HIPOSSUFICIENCIA", em: "2026-11-24T18:20:00Z" }] },
    };
    const disp = ["CONTRATO", "PROCURACAO", "HIPOSSUFICIENCIA", R, I];
    expect(faltaNaSugestao("PREVIDENCIARIO", s, ["CONTRATO"], disp, new Set())).toEqual([{ chave: I, em: "2026-11-24T18:20:00Z" }]);
    expect(faltaNaSugestao("PREVIDENCIARIO", s, ["CONTRATO", I], disp, new Set())).toEqual([]);
    expect(faltaNaSugestao("PREVIDENCIARIO", s, ["CONTRATO"], disp, new Set([I]))).toEqual([]);
    expect(faltaNaSugestao("PREVIDENCIARIO", s, ["CONTRATO"], ["CONTRATO"], new Set())).toEqual([]);
    expect(faltaNaSugestao("TRABALHISTA", s, [], disp, new Set())).toEqual([]);
  });
});
