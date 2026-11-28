import { describe, expect, it } from "vitest";
import {
  CONDICOES_IMPLANTACAO, FORMAS_TREINO, TEMAS_TREINO, TIPOS_ITEM_FATURA, implantacaoConcluirSchema, implantacaoPrazoSchema, implantacaoRegraSchema,
  implantacaoResponsavelSchema, implantacaoTreinoDesfazerSchema, implantacaoTreinoSchema,
} from "./implantacao.ts";
import { TEXTOS_MOTIVO } from "./textos.ts";

const REGRA = {
  versao: 1, nome: "Implantação assistida", descricao: "treino de toda a equipe e acompanhamento por 30 dias",
  valorCentavos: 149000, condicaoPadrao: "ISENTA", isencaoAte: null, isencaoTexto: "Oferta de lançamento", prazoDias: 30,
};

describe("implantação assistida (CO-08)", () => {
  it("CO-08: a regra inteira passa, com ou sem data de corte", () => {
    expect(implantacaoRegraSchema.safeParse(REGRA).success).toBe(true);
    expect(implantacaoRegraSchema.safeParse({ ...REGRA, isencaoAte: "2027-05-31" }).success).toBe(true);
  });
  it("CO-08: o esquema só confere o formato; os limites ficam com o banco", () => {
    expect(implantacaoRegraSchema.safeParse({ ...REGRA, valorCentavos: -1, prazoDias: 0, condicaoPadrao: "X" }).success).toBe(true);
    expect(implantacaoRegraSchema.safeParse({ ...REGRA, valorCentavos: 1490.5 }).success).toBe(false);
    expect(implantacaoRegraSchema.safeParse({ ...REGRA, isencaoAte: "31/05/2027" }).success).toBe(false);
    const { versao: _v, ...semVersao } = REGRA;
    expect(implantacaoRegraSchema.safeParse(semVersao).success).toBe(false);
  });
  it("CO-08: as condições têm nome para a tela", () => {
    expect(CONDICOES_IMPLANTACAO).toEqual({ ISENTA: "Isenta", COBRADA: "Cobrada" });
  });
  it("CO-08: concluir leva as duas versões; o resumo é opcional e o limite fica com o banco", () => {
    expect(implantacaoConcluirSchema.safeParse({ versaoCliente: 3, versaoImplantacao: 1 }).success).toBe(true);
    expect(implantacaoConcluirSchema.safeParse({ versaoCliente: 3, versaoImplantacao: 1, resumo: "a".repeat(2001) }).success).toBe(true);
    expect(implantacaoConcluirSchema.safeParse({ versaoCliente: 3 }).success).toBe(false);
    expect(implantacaoConcluirSchema.safeParse({ versaoCliente: 0, versaoImplantacao: 1 }).success).toBe(false);
  });
  it("CO-08: o prazo vai com a data, o motivo e a versão; os motivos novos têm texto", () => {
    expect(implantacaoPrazoSchema.safeParse({ versao: 2, prazoAte: "2027-01-20", motivo: "Sócia viajou" }).success).toBe(true);
    expect(implantacaoPrazoSchema.safeParse({ versao: 2, prazoAte: "20/01/2027", motivo: "Sócia viajou" }).success).toBe(false);
    expect(implantacaoPrazoSchema.safeParse({ prazoAte: "2027-01-20", motivo: "x" }).success).toBe(false);
    for (const m of ["IMPLANTACAO_NAO_ABERTA", "PRAZO_INVALIDO"]) expect(TEXTOS_MOTIVO[m]).toBeTruthy();
  });
  it("CO-08: a fatura conhece os itens da implantação e a recusa do carnê cobrado tem texto (1182)", () => {
    expect(TIPOS_ITEM_FATURA).toEqual(["MENSALIDADE", "PESSOA_A_MAIS", "DESCONTO", "IMPLANTACAO", "ISENCAO"]);
    expect(TEXTOS_MOTIVO.IMPLANTACAO_COBRADA_NO_CARNE).toBeTruthy();
  });
  it("CO-08: o treino leva o dia, a duração, a forma, quem participou e os temas; os limites ficam com o banco (1183)", () => {
    const treino = { dia: "2026-11-30", duracaoMin: 60, forma: "VIDEO", pessoas: ["0b7c3f0e-5d1a-4c2b-9e8f-1a2b3c4d5e6f"], temas: ["JURIDICO"] };
    expect(implantacaoTreinoSchema.safeParse(treino).success).toBe(true);
    expect(implantacaoTreinoSchema.parse({ ...treino, temas: undefined }).temas).toEqual([]);
    expect(implantacaoTreinoSchema.safeParse({ ...treino, duracaoMin: 5, pessoas: [] }).success).toBe(true);
    expect(implantacaoTreinoSchema.safeParse({ ...treino, dia: "30/11/2026" }).success).toBe(false);
    expect(implantacaoTreinoSchema.safeParse({ ...treino, duracaoMin: 60.5 }).success).toBe(false);
    expect(implantacaoTreinoSchema.safeParse({ ...treino, pessoas: ["nao-e-id"] }).success).toBe(false);
  });
  it("CO-08: desfazer pede o motivo; trocar quem acompanha leva o id e a versão (1183)", () => {
    expect(implantacaoTreinoDesfazerSchema.safeParse({ motivo: "Registrei por engano" }).success).toBe(true);
    expect(implantacaoTreinoDesfazerSchema.safeParse({}).success).toBe(false);
    expect(implantacaoResponsavelSchema.safeParse({ responsavelId: "0b7c3f0e-5d1a-4c2b-9e8f-1a2b3c4d5e6f", versao: 2 }).success).toBe(true);
    expect(implantacaoResponsavelSchema.safeParse({ responsavelId: "0b7c3f0e-5d1a-4c2b-9e8f-1a2b3c4d5e6f" }).success).toBe(false);
    expect(implantacaoResponsavelSchema.safeParse({ responsavelId: null, versao: 2 }).success).toBe(false);
  });
  it("CO-08: as formas e os temas do treino têm nome para a tela, e os motivos novos têm texto (1183)", () => {
    expect(Object.keys(FORMAS_TREINO)).toEqual(["VIDEO", "PRESENCIAL", "TELEFONE"]);
    expect(Object.keys(TEMAS_TREINO)).toEqual(["INICIO", "CLIENTES", "CONVERSAS", "AGENDA", "COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO", "DOCUMENTOS", "ESCRITORIO"]);
    for (const m of ["TREINO_NO_FUTURO", "PESSOA_SEM_VINCULO", "TREINO_JA_DESFEITO", "RESPONSAVEL_SEM_ATRIBUICAO"]) expect(TEXTOS_MOTIVO[m]).toBeTruthy();
  });
});
