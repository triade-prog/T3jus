import { describe, expect, it } from "vitest";
import type { AvisoConsole } from "@t3jus/domain";
import { descreverAvisoConsole } from "./Sino.tsx";

// Os avisos da implantação assistida no sino do Console (F1.46; CO-08, migration 1184).
const ESC = "0b5a3c1e-6f1d-4d6b-9a52-1d1a2f3e4b5c";
const aviso = (tipo: AvisoConsole["tipo"], dados: AvisoConsole["dados"]): AvisoConsole =>
  ({ id: "a", tipo, dados, interessadoId: null, faturaId: null, em: "2026-12-09T11:00:00Z", lido: false, agora: null });

describe("sino do Console: implantação", () => {
  it("prazo a 7 dias: quem falta, quem acompanha e a aba Implantação", () => {
    const x = descreverAvisoConsole(aviso("IMPLANTACAO_PRAZO", {
      escritorio: "Cedro & Lima", escritorioId: ESC, prazo: "2026-12-16", dias: 7, treinadas: 4, total: 6,
      faltam: ["Tiago Ramos", "Diego Alves"], responsavel: "Rafael Teles",
    }));
    expect(x.detalhe).toBe("Prazo: 16/12/2026. Faltam Tiago Ramos e Diego Alves. Quem acompanha: Rafael Teles.");
    expect(x.href).toBe(`/clientes/${ESC}/implantacao`);
    expect(x.onde).toBe("Abrir a implantação");
    expect(x.selo).toEqual({ tom: "atencao", texto: "7 dias" });
  });

  it("vence hoje, com todos treinados e sem quem acompanhe", () => {
    const x = descreverAvisoConsole(aviso("IMPLANTACAO_PRAZO", { escritorio: "Jatobá", escritorioId: ESC, prazo: "2026-12-09", dias: 0, treinadas: 5, total: 5 }));
    expect(x.detalhe).toBe("Todas as pessoas foram treinadas: dá para concluir. Ninguém acompanha ainda.");
    expect(x.selo).toEqual({ tom: "urgente", texto: "Vence hoje" });
  });

  it("fim da isenção: a data de corte, o primeiro dia cobrado e a regra", () => {
    const x = descreverAvisoConsole(aviso("IMPLANTACAO_ISENCAO_FIM", { isencaoAte: "2027-05-31", dias: 30, cobradaDesde: "2027-06-01", valorCentavos: 149000 }));
    expect(x.detalhe).toMatch(/^Quem abrir a implantação a partir de 01\/06\/2027 paga R\$\s1\.490,00 à vista na 1ª fatura\./);
    expect(x.href).toBe("/cobranca/planos");
    expect(x.selo?.texto).toBe("Fim da isenção");
  });

  it("carnê recusado: leva à assinatura", () => {
    const x = descreverAvisoConsole(aviso("IMPLANTACAO_CARNE_RECUSADO", { escritorio: "Angico", escritorioId: ESC, competencia: "2027-06-01", dia: "2027-05-01" }));
    expect(x.detalhe).toBe("A rotina da cobrança pulou o escritório em 01/05/2027. Passe a assinatura para Pix ou boleto e a 1ª fatura sai com a implantação à vista.");
    expect(x.href).toBe(`/clientes/${ESC}/assinatura`);
  });
});
