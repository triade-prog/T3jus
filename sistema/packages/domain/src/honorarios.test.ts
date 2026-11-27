import { describe, expect, it } from "vitest";
import { conferirCondicao, conferirCondicoes, dividirParcelas, leituraCondicao, percentual, programacao, resumoParcelas, somarMeses, textoGera, valorCerto, type Condicao } from "./honorarios.ts";

describe("condições de honorário (CH-06)", () => {
  it("divide as parcelas em centavos exatos, o resto nas primeiras", () => {
    expect(dividirParcelas(200000, 3)).toEqual([66667, 66667, 66666]);
    expect(resumoParcelas(200000, 3)).toBe("2 de R$ 666,67 e 1 de R$ 666,66");
    expect(resumoParcelas(400000, 4)).toBe("4 parcelas de R$ 1.000,00");
  });

  it("soma meses sem passar do último dia", () => {
    expect(somarMeses("2027-01-31", 1)).toBe("2027-02-28");
    expect(somarMeses("2026-12-10", 2)).toBe("2027-02-10");
  });

  it("percentual em pontos-base", () => {
    expect(percentual(3000)).toBe("30%");
    expect(percentual(1250)).toBe("12,5%");
  });

  it("confere cada tipo e acusa o campo", () => {
    expect(conferirCondicao({ tipo: "FIXO", valor: 50000, vencimento: "2026-12-10" })).toEqual([]);
    expect(conferirCondicao({ tipo: "FIXO", valor: 50000, vencimento: "2026-11-10" }, "2026-11-19")).toEqual(["vencimento"]);
    expect(conferirCondicao({ tipo: "EXITO", percentual: 0, sobre: "Valor do acordo", dias: 5 } as never)).toEqual(["percentual", "etapa"]);
    expect(conferirCondicao({ tipo: "ATO", atos: [{ nome: "Audiência", valor: 0 }] })).toEqual(["atos.0.valor"]);
    expect(conferirCondicao({ tipo: "RECORRENTE", percentual: 3000, sobre: "Benefício mensal", etapa: null, primeiro: null, dia: 10, meses: 12, diaLembrete: 5, quemLembrete: null, pedirWhats: false }))
      .toEqual(["primeiro"]);
    expect(conferirCondicoes([{ tipo: "FIXO", valor: 1, vencimento: "2026-12-10" }, { tipo: "FIXO", valor: 1, vencimento: "2026-12-10" }]).condicoes).toEqual(["repetida"]);
    expect(conferirCondicoes([]).condicoes).toEqual(["vazia"]);
  });

  it("programação e valor certo (estado novo-tipos do desenho)", () => {
    const lista: Condicao[] = [
      { tipo: "FIXO", valor: 150000, vencimento: "2026-11-25" },
      { tipo: "PARCELADO", total: 600000, parcelas: 6, primeiro: "2026-12-10" },
      { tipo: "EXITO", percentual: 3000, sobre: "Atrasados que o cliente receber", etapa: "Pagamento da RPV ou precatório", dias: 15 },
    ];
    expect(valorCerto(lista)).toBe(750000);
    const p = programacao(lista);
    expect(p.map((x) => x.quando)).toEqual(["25/11/2026", "10/12/2026", "10/01/2027", "10/02/2027", "10/03/2027", "10/04/2027", "10/05/2027", "na etapa"]);
    expect(p.at(-1)!.valor).toBeNull();
  });

  it("textos do Gera e da leitura", () => {
    expect(textoGera({ tipo: "PARCELADO", total: 200000, parcelas: 3, primeiro: "2026-12-10" }))
      .toBe("3 parcelas: 2 de R$ 666,67 e 1 de R$ 666,66, todo dia 10, de 10/12/2026 a 10/02/2027. A soma dá R$ 2.000,00 exatos.");
    expect(textoGera({ tipo: "EXITO", sobre: "Valor do acordo", dias: 5 })).toBe("Falta o percentual e a etapa para ver o que esta condição gera.");
    expect(leituraCondicao({ tipo: "EXITO", percentual: 3000, sobre: "Atrasados que o cliente receber", etapa: "Sentença", dias: 15 }).complemento)
      .toBe("dos atrasados que o cliente receber");
    expect(leituraCondicao({ tipo: "RECORRENTE", percentual: 3000, sobre: "Benefício mensal do cliente", etapa: "Benefício implantado", primeiro: null, dia: 10, meses: 12, diaLembrete: 5, quemLembrete: null, pedirWhats: false }).complemento)
      .toBe("do benefício mensal do cliente, por 12 meses");
  });

  it("lê o sobre apagado a pedido do titular (F3.179, PT-11)", () => {
    expect(leituraCondicao({ tipo: "EXITO", percentual: 3000, sobre: "Base apagada a pedido do titular", etapa: "Sentença", dias: 15 }).complemento)
      .toBe("da base apagada a pedido do titular");
    expect(textoGera({ tipo: "EXITO", percentual: 3000, sobre: "Base apagada a pedido do titular", etapa: "Sentença", dias: 15 }))
      .toMatch(/^30% da base apagada a pedido do titular, /);
  });
});
