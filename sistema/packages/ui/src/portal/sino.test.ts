// O aviso no sino de caso pronto para encerrar no financeiro (F3.147; EX-16, EX-17, PT-02): as frases
// exatas do desenho aprovado em docs/design/aprovadas/portal-sino-caso-encerrado (NOTAS.md), o
// "Agora:" de cada estado, o destino e o trecho para o leitor de tela. O título (com "de novo") e o
// nome acessível do link ficam no e2e portal-sino-caso-pronto.
import { describe, expect, it } from "vitest";
import { quandoEncerrouNoFinanceiro, type AvisoSino } from "@t3jus/domain";
import { agoraCasoPronto, descreverAviso, fraseCasoPronto, nomesClientes } from "./Sino.tsx";

const CASO = "c0a5e000-0000-4000-8000-000000000001";
const CT = "c7000000-0000-4000-8000-000000000012";
const CARVALHO = ["Noemi Bastos Carvalho", "Cláudio Carvalho"];
const AGORA = new Date("2026-11-18T16:00:00-03:00");

function aviso(dados: AvisoSino["dados"], agora?: AvisoSino["agora"]): AvisoSino {
  return {
    id: "a1", tipo: "CASO_PRONTO_FECHAR", origem: "casos", origemId: CASO, em: "2026-11-17T11:05:00-03:00", lido: false,
    dados: { caso: "Carvalho x Construtora Lume", contrato: "C-2026-012", contratoId: CT, clientes: CARVALHO, ...dados },
    ...(agora ? { agora } : {}),
  };
}

describe("F3.147: os clientes do aviso", () => {
  it("um, dois e três ou mais clientes", () => {
    expect(nomesClientes({ clientes: ["Helena Freitas"] })).toBe("Helena Freitas");
    expect(nomesClientes({ clientes: CARVALHO })).toBe("Noemi Bastos Carvalho e Cláudio Carvalho");
    expect(nomesClientes({ clientes: ["Lúcia Nogueira", "Paulo Nogueira"], maisClientes: 1 })).toBe("Lúcia Nogueira, Paulo Nogueira e mais 1 cliente");
    expect(nomesClientes({ clientes: ["Lúcia Nogueira", "Paulo Nogueira"], maisClientes: 3 })).toBe("Lúcia Nogueira, Paulo Nogueira e mais 3 clientes");
  });
});

describe("F3.147: a frase de cada motivo (NOTAS.md)", () => {
  it("PAGAMENTO, com dois, três e um cliente", () => {
    expect(fraseCasoPronto({ motivo: "PAGAMENTO", quem: "Diego Almeida", parcelas: 7, clientes: CARVALHO }))
      .toBe("Diego Almeida registrou a última parcela. As 7 parcelas de Noemi Bastos Carvalho e Cláudio Carvalho foram pagas.");
    expect(fraseCasoPronto({ motivo: "PAGAMENTO", quem: "Marina Ribeiro", parcelas: 9, clientes: ["Lúcia Nogueira", "Paulo Nogueira"], maisClientes: 1 }))
      .toBe("Marina Ribeiro registrou a última parcela. As 9 parcelas de Lúcia Nogueira, Paulo Nogueira e mais 1 cliente foram pagas.");
    expect(fraseCasoPronto({ motivo: "PAGAMENTO", quem: "Bianca Torres", parcelas: 10, clientes: ["Helena Freitas"] }))
      .toBe("Bianca Torres registrou a última parcela. As 10 parcelas de Helena Freitas foram pagas.");
  });
  it("REEMBOLSO, o último e o de novo (com a descrição em minúscula)", () => {
    expect(fraseCasoPronto({ motivo: "REEMBOLSO", quem: "Bianca Torres", clientes: ["Regina Souza"] }))
      .toBe("Bianca Torres marcou o último reembolso, e nada falta receber de Regina Souza.");
    expect(fraseCasoPronto({ motivo: "REEMBOLSO", quem: "Bianca Torres", clientes: ["Regina Souza"], denovo: true, reembolso: "Cópia do processo" }))
      .toBe("Bianca Torres marcou o reembolso da cópia do processo, e a pendência que tinha voltado foi resolvida.");
    expect(fraseCasoPronto({ motivo: "REEMBOLSO", quem: "Bianca Torres", clientes: ["Regina Souza"], denovo: true }))
      .toBe("Bianca Torres marcou o último reembolso, e nada falta receber de Regina Souza.");
  });
  it("EXITO, não cobrado e pago", () => {
    expect(fraseCasoPronto({ motivo: "EXITO", exito: "NAO_COBRADO", quem: "Bianca Torres", parcelas: 4, clientes: ["Sérgio Gomes"] }))
      .toBe("Bianca Torres marcou o êxito de Sérgio Gomes como não cobrado. As 4 parcelas já estavam pagas.");
    expect(fraseCasoPronto({ motivo: "EXITO", exito: "PAGO", quem: "Bianca Torres", parcelas: 5, clientes: ["Sérgio Gomes"] }))
      .toBe("Bianca Torres registrou o pagamento do êxito de Sérgio Gomes.");
  });
  it("CONTRATO_ENCERRADO, CASO_ENCERRADO e OUTRO_CASO", () => {
    expect(fraseCasoPronto({ motivo: "CONTRATO_ENCERRADO", quem: "Felipe Matos", contratoEncerrado: "C-2026-016", contrato: "C-2026-015" }))
      .toBe("Felipe Matos encerrou o C-2026-016, e as parcelas que faltavam foram canceladas.");
    expect(fraseCasoPronto({ motivo: "CASO_ENCERRADO", quem: "Larissa Costa", clientes: ["Rosângela Teixeira"] }))
      .toBe("Larissa Costa encerrou o caso, e nada falta receber de Rosângela Teixeira.");
    expect(fraseCasoPronto({ motivo: "OUTRO_CASO", quem: "Felipe Matos", contratoSegue: "C-2026-007", outroCaso: "Martins x INSS · aposentadoria",
      clientes: ["Ivone Martins"] }))
      .toBe("Felipe Matos ligou o C-2026-007 ao caso Martins x INSS · aposentadoria, em andamento. As parcelas que faltam seguem com ele, e nada falta receber de Ivone Martins.");
  });
  it("um molde só para \"nada falta receber\": a rotina e qualquer motivo sem quem", () => {
    expect(fraseCasoPronto({ motivo: "ROTINA", clientes: ["Paulo Henrique Dias"] })).toBe("Nada falta receber de Paulo Henrique Dias.");
    expect(fraseCasoPronto({ motivo: "ROTINA", quem: "Marina Ribeiro", clientes: ["Paulo Henrique Dias"] })).toBe("Nada falta receber de Paulo Henrique Dias.");
    expect(fraseCasoPronto({ motivo: "PAGAMENTO", parcelas: 3, clientes: ["Paulo Henrique Dias"] })).toBe("Nada falta receber de Paulo Henrique Dias.");
  });
  it("PT-02: nenhuma frase tem valor em reais", () => {
    const motivos = ["PAGAMENTO", "REEMBOLSO", "EXITO", "CONTRATO_ENCERRADO", "CASO_ENCERRADO", "OUTRO_CASO", "ROTINA"];
    for (const motivo of motivos) {
      const x = descreverAviso(aviso({ motivo, quem: "Diego Almeida", parcelas: 7, exito: "PAGO", denovo: true, reembolso: "Cópia do processo" }), AGORA);
      expect(`${String(x.detalhe)} ${x.onde}`).not.toMatch(/R\$|\d+,\d{2}/);
    }
  });
});

describe("F3.147: o aviso pronto e os quatro estados de agora", () => {
  it("pronto: \"Confira o acerto e encerre.\", selo Pronto, destino com o contrato e o link da folha", () => {
    const x = descreverAviso(aviso({ motivo: "PAGAMENTO", quem: "Diego Almeida", parcelas: 7 }), AGORA);
    expect(x.icone).toBe("cadeado");
    expect(x.detalhe).toBe("Diego Almeida registrou a última parcela. As 7 parcelas de Noemi Bastos Carvalho e Cláudio Carvalho foram pagas. Confira o acerto e encerre.");
    expect(x.selo).toEqual({ tom: "ok", texto: "Pronto" });
    expect(x.onde).toBe("Ver o acerto no C-2026-012");
    expect(x.href).toBe(`/financeiro/a-receber/contratos/${CT}#t-fecha-${CASO}`);
    expect(x.agora).toBeUndefined();
    expect(x.paraLeitor).toBeUndefined();
  });
  it("sem contrato no aviso, leva ao caso", () => {
    expect(descreverAviso(aviso({ motivo: "ROTINA", contratoId: undefined, contrato: undefined }), AGORA).href).toBe(`/juridico/casos/${CASO}`);
  });
  it("encerrado: hoje, e o \"Confira\" sai", () => {
    const a = aviso({ motivo: "PAGAMENTO", quem: "Diego Almeida", parcelas: 7 },
      { encerrado: { em: "2026-11-18T10:05:00-03:00", por: { id: "m", nome: "Marina Ribeiro" } } });
    const x = descreverAviso(a, AGORA);
    expect(x.agora).toBe("Marina Ribeiro encerrou no financeiro hoje, às 10h05.");
    expect(x.detalhe).toBe("Diego Almeida registrou a última parcela. As 7 parcelas de Noemi Bastos Carvalho e Cláudio Carvalho foram pagas.");
    expect(x.selo).toEqual({ tom: "neutro", texto: "Encerrado" });
    expect(x.onde).toBe("Ver o fechamento no C-2026-012");
    expect(x.paraLeitor).toBe(". Agora: encerrado.");
    expect(x.href).toBe(`/financeiro/a-receber/contratos/${CT}#t-fecha-${CASO}`);
  });
  it("[C1] encerrado ontem e em outro dia", () => {
    expect(quandoEncerrouNoFinanceiro("2026-11-17T09:30:00-03:00", AGORA)).toBe("ontem, às 9h30");
    expect(quandoEncerrouNoFinanceiro("2026-11-16T14:00:00-03:00", AGORA)).toBe("em 16/11, às 14h00");
    expect(quandoEncerrouNoFinanceiro("2026-11-18T00:10:00-03:00", AGORA)).toBe("hoje, às 0h10");
    expect(agoraCasoPronto(aviso({}, { encerrado: { em: "2026-11-17T09:30:00-03:00", por: { id: "m", nome: "Marina Ribeiro" } } }), AGORA)?.linha)
      .toBe("Marina Ribeiro encerrou no financeiro ontem, às 9h30.");
  });
  it("depois: aviso antigo", () => {
    const x = agoraCasoPronto(aviso({}, { depois: true }), AGORA);
    expect(x).toEqual({ selo: { tom: "neutro", texto: "Aviso antigo" }, onde: "Ver o acerto no C-2026-012",
      linha: "o caso ficou pronto de novo; veja o aviso mais novo.", paraLeitor: ". Agora: aviso antigo, há um mais novo." });
  });
  it("pendente: voltou a ter pendência", () => {
    const x = agoraCasoPronto(aviso({}, { pendente: true }), AGORA);
    expect(x).toEqual({ selo: { tom: "atencao", texto: "Voltou a ter pendência" }, onde: "Ver o acerto no C-2026-012",
      linha: "depois deste aviso, o acerto voltou a ter pendência.", paraLeitor: ". Agora: voltou a ter pendência." });
  });
  it("fora: fecha no repasse, com as palavras da folha aprovada", () => {
    const x = agoraCasoPronto(aviso({ contrato: "C-2026-004" }, { fora: true }), AGORA);
    expect(x).toEqual({ selo: { tom: "neutro", texto: "Fecha no repasse" }, onde: "Ver o fechamento no C-2026-004",
      linha: "entrou RPV ou alvará neste caso, e o fechamento passou para a ficha do repasse.", paraLeitor: ". Agora: fecha no repasse." });
  });
  it("sem agora: null", () => {
    expect(agoraCasoPronto(aviso({}), AGORA)).toBeNull();
  });
});
