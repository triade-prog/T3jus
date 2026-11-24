// O aviso no sino de caso pronto para encerrar no financeiro (F3.147; EX-16, EX-17, PT-02): as frases
// exatas do desenho aprovado em docs/design/aprovadas/portal-sino-caso-encerrado (NOTAS.md), o
// "Agora:" de cada estado, o destino e o trecho para o leitor de tela. O título (com "de novo") e o
// nome acessível do link ficam no e2e portal-sino-caso-pronto.
import { describe, expect, it } from "vitest";
import { quandoDia, quandoEncerrouNoFinanceiro, type AvisoSino, type ContratoNoAviso } from "@t3jus/domain";
import {
  agoraCasoFechou, agoraCasoPronto, comNumeros, contratoCom, descreverAviso, destinoCasoFechou, fraseCasoFechou, fraseCasoPronto,
  leitorCasoFechou, listaContratos, nomesClientes, numeros, seloCasoFechou,
} from "./Sino.tsx";

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

// ------------------------------------------------------------------ F3.150
// O aviso de caso encerrado no financeiro (EX-16, EX-17, PT-02): as frases exatas do desenho aprovado
// em docs/design/aprovadas/portal-sino-caso-fechou (NOTAS.md), os selos, o "Agora:", o trecho para o
// leitor de tela e o destino pelas áreas da sessão. O nome acessível do link e o .si-nr ficam no e2e
// portal-sino-caso-encerrado-financeiro.

const FELIPE = { id: "f", nome: "Felipe Matos" };
const BIANCA = { id: "b", nome: "Bianca Torres" };
const N012: ContratoNoAviso = { id: "ct12", numero: "C-2026-012", cliente: "Noemi Bastos Carvalho", clienteId: "cl-noemi" };
const N025: ContratoNoAviso = { id: "ct25", numero: "C-2026-025", cliente: "Lúcia Nogueira", clienteId: "cl-lucia" };
const N026: ContratoNoAviso = { id: "ct26", numero: "C-2026-026", cliente: "Paulo Nogueira", clienteId: "cl-paulo" };
const VIANA: ContratoNoAviso[] = [
  { id: "ct28", numero: "C-2026-028", cliente: "Clara Viana", clienteId: "cl-clara" },
  { id: "ct29", numero: "C-2026-029", cliente: "Rafael Viana", clienteId: "cl-rafael" },
  { id: "ct30", numero: "C-2026-030", cliente: "Sônia Viana", clienteId: "cl-sonia" },
];
const N032: ContratoNoAviso = { id: "ct32", numero: "C-2026-032", cliente: "Márcia Fontes", clienteId: "cl-marcia" };
const QUEM_CTR = ["Bianca Torres", "Felipe Matos", "Marina Ribeiro"];
const HOJE = "2026-11-18T11:20:00-03:00";

function fechou(dados: AvisoSino["dados"], agoraFechou?: AvisoSino["agoraFechou"]): AvisoSino {
  return {
    id: "a2", tipo: "CASO_ENCERRADO_FINANCEIRO", origem: "casos", origemId: CASO, em: "2026-11-18T10:05:00-03:00", lido: false,
    dados: { caso: "Carvalho x Construtora Lume", quem: "Diego Almeida", cliente: "Noemi Bastos Carvalho", clienteId: "cl-noemi", ...dados },
    ...(agoraFechou ? { agoraFechou } : {}),
  };
}
const contratos = (abertos: ContratoNoAviso[]) => fechou({ papel: "CONTRATOS", abertos });
const responsavel = (dados: AvisoSino["dados"], agoraFechou?: AvisoSino["agoraFechou"]) =>
  fechou({ papel: "RESPONSAVEL", caso: "Fontes x Hospital São Lucas", cliente: "Márcia Fontes", clienteId: "cl-marcia", ...dados }, agoraFechou);

describe("F3.150: as peças das frases", () => {
  it("contratoCom, listaContratos e numeros", () => {
    expect(contratoCom(N012)).toBe("o C-2026-012, de Noemi Bastos Carvalho");
    expect(contratoCom({ numero: "C-2026-012" })).toBe("o C-2026-012");
    expect(listaContratos([N012])).toBe("o C-2026-012, de Noemi Bastos Carvalho");
    expect(listaContratos([N025, N026])).toBe("o C-2026-025, de Lúcia Nogueira, e o C-2026-026, de Paulo Nogueira");
    expect(listaContratos(VIANA)).toBe("o C-2026-028, de Clara Viana, o C-2026-029, de Rafael Viana, e mais 1 contrato");
    expect(listaContratos([...VIANA, { numero: "C-2026-031" }])).toBe("o C-2026-028, de Clara Viana, o C-2026-029, de Rafael Viana, e mais 2 contratos");
    expect(numeros([N012])).toBe("o C-2026-012");
    expect(numeros([N025, N026])).toBe("os contratos C-2026-025 e C-2026-026");
  });
  it("comNumeros embrulha cada número de contrato", () => {
    const r = comNumeros("o C-2026-025 e o C-2026-026.") as unknown[];
    expect(r).toHaveLength(5);
    expect(comNumeros("sem número")).toBe("sem número");
  });
  it("quandoDia: hoje, ontem e em dd/mm, no fuso de Brasília perto da meia-noite", () => {
    expect(quandoDia("2026-11-18T00:10:00-03:00", AGORA)).toBe("hoje");
    expect(quandoDia("2026-11-17T23:50:00-03:00", AGORA)).toBe("ontem");
    expect(quandoDia("2026-11-18T02:50:00Z", AGORA)).toBe("ontem");
    expect(quandoDia("2026-11-18T03:10:00Z", AGORA)).toBe("hoje");
    expect(quandoDia("2026-11-16T14:00:00-03:00", AGORA)).toBe("em 16/11");
  });
});

describe("F3.150: as frases do grupo A (quem encerra contratos)", () => {
  it("1, 2 e 3 contratos, com e sem o pedido", () => {
    expect(fraseCasoFechou(contratos([N012]).dados))
      .toBe("Diego Almeida encerrou o caso no financeiro, e o C-2026-012, de Noemi Bastos Carvalho, continua aberto. Encerre o contrato.");
    expect(fraseCasoFechou(contratos([N012]).dados, true))
      .toBe("Diego Almeida encerrou o caso no financeiro, e o C-2026-012, de Noemi Bastos Carvalho, continua aberto.");
    expect(fraseCasoFechou(contratos([N025, N026]).dados))
      .toBe("Diego Almeida encerrou o caso no financeiro, e continuam abertos o C-2026-025, de Lúcia Nogueira, e o C-2026-026, de Paulo Nogueira. Encerre os contratos.");
    expect(fraseCasoFechou(contratos([N025, N026]).dados, true))
      .toBe("Diego Almeida encerrou o caso no financeiro, e continuam abertos o C-2026-025, de Lúcia Nogueira, e o C-2026-026, de Paulo Nogueira.");
    expect(fraseCasoFechou(contratos(VIANA).dados))
      .toBe("Diego Almeida encerrou o caso no financeiro, e continuam abertos o C-2026-028, de Clara Viana, o C-2026-029, de Rafael Viana, e mais 1 contrato. Encerre os contratos.");
  });
  it("sem quem: \"Alguém da equipe\"", () => {
    expect(fraseCasoFechou({ papel: "CONTRATOS", abertos: [N012] }))
      .toBe("Alguém da equipe encerrou o caso no financeiro, e o C-2026-012, de Noemi Bastos Carvalho, continua aberto. Encerre o contrato.");
  });
});

describe("F3.150: as frases do grupo B (quem é responsável)", () => {
  it("\"e, junto\" com um e com vários; termina", () => {
    expect(fraseCasoFechou(responsavel({ quem: "Marina Ribeiro", juntos: [{ numero: "C-2026-032", cliente: "Márcia Fontes" }] }).dados))
      .toBe("Marina Ribeiro encerrou o caso no financeiro e, junto, o C-2026-032, de Márcia Fontes. O fechamento do caso terminou.");
    expect(fraseCasoFechou(responsavel({ quem: "Marina Ribeiro",
      juntos: [{ numero: "C-2026-032", cliente: "Márcia Fontes" }, { numero: "C-2026-034", cliente: "Pedro Fontes" }] }).dados))
      .toBe("Marina Ribeiro encerrou o caso no financeiro e, junto, os contratos C-2026-032 e C-2026-034. O fechamento do caso terminou.");
  });
  it("\"já estava encerrado\" com um e com vários", () => {
    expect(fraseCasoFechou(responsavel({ quem: "Marina Ribeiro", jaEncerrados: [{ numero: "C-2026-033", cliente: "Otávio Fontes" }] }).dados))
      .toBe("Marina Ribeiro encerrou o caso no financeiro. O C-2026-033, de Otávio Fontes, já estava encerrado. O fechamento do caso terminou.");
    expect(fraseCasoFechou(responsavel({ quem: "Marina Ribeiro",
      jaEncerrados: [{ numero: "C-2026-033", cliente: "Otávio Fontes" }, { numero: "C-2026-035", cliente: "Lia Fontes" }] }).dados))
      .toBe("Marina Ribeiro encerrou o caso no financeiro. Os contratos já estavam encerrados. O fechamento do caso terminou.");
  });
  it("com abertos: quem encerra é a área Contratos, com e sem nomes", () => {
    expect(fraseCasoFechou(responsavel({ abertos: [N032], quemContratos: QUEM_CTR }).dados))
      .toBe("Diego Almeida encerrou o caso no financeiro. Quem encerra o C-2026-032, de Márcia Fontes, é a área Contratos (Bianca Torres, Felipe Matos e Marina Ribeiro).");
    expect(fraseCasoFechou(responsavel({ abertos: [N032] }).dados))
      .toBe("Diego Almeida encerrou o caso no financeiro. Quem encerra o C-2026-032, de Márcia Fontes, é a área Contratos.");
  });
  it("o contrato que segue com outro caso (sf-segue), sem \"terminou\"", () => {
    expect(fraseCasoFechou(responsavel({ caso: "Martins x INSS · auxílio-doença",
      seguem: [{ id: "ct7", numero: "C-2026-007", cliente: "Ivone Martins", outroCaso: "Martins x INSS · aposentadoria" }] }).dados))
      .toBe("Diego Almeida encerrou o caso no financeiro. O C-2026-007, de Ivone Martins, fica aberto, porque as parcelas seguem com o caso Martins x INSS · aposentadoria.");
  });
  it("\"terminou\" só sem abertos e sem seguem", () => {
    expect(fraseCasoFechou(responsavel({}).dados)).toBe("Diego Almeida encerrou o caso no financeiro. O fechamento do caso terminou.");
    expect(fraseCasoFechou(responsavel({ abertos: [N032] }).dados)).not.toContain("terminou");
  });
});

describe("F3.150: selo e leitor de tela sem agoraFechou", () => {
  it("grupo A, um e vários", () => {
    expect(seloCasoFechou(contratos([N012]).dados)).toEqual({ tom: "andamento", texto: "Falta o contrato" });
    expect(leitorCasoFechou(contratos([N012]).dados)).toBe(". Falta encerrar o C-2026-012.");
    expect(seloCasoFechou(contratos([N025, N026]).dados)).toEqual({ tom: "andamento", texto: "Faltam os contratos" });
    expect(leitorCasoFechou(contratos([N025, N026]).dados)).toBe(". Falta encerrar 2 contratos.");
    expect(leitorCasoFechou(contratos(VIANA).dados)).toBe(". Falta encerrar 3 contratos.");
  });
  it("grupo B: abertos, só seguem e terminou", () => {
    expect(seloCasoFechou(responsavel({ abertos: [N032] }).dados)).toEqual({ tom: "andamento", texto: "Falta o contrato" });
    expect(leitorCasoFechou(responsavel({ abertos: [N032] }).dados)).toBe(". Falta encerrar o C-2026-032, com a área Contratos.");
    expect(seloCasoFechou(responsavel({ abertos: [N025, N026] }).dados)).toEqual({ tom: "andamento", texto: "Faltam os contratos" });
    expect(leitorCasoFechou(responsavel({ abertos: [N025, N026] }).dados)).toBe(". Falta encerrar 2 contratos, com a área Contratos.");
    const segue = { numero: "C-2026-007", outroCaso: "Martins x INSS · aposentadoria" };
    expect(seloCasoFechou(responsavel({ seguem: [segue] }).dados)).toEqual({ tom: "neutro", texto: "Segue com outro caso" });
    expect(leitorCasoFechou(responsavel({ seguem: [segue] }).dados)).toBe(". O contrato segue com outro caso.");
    expect(leitorCasoFechou(responsavel({ seguem: [segue, { ...segue, numero: "C-2026-008" }] }).dados)).toBe(". Os contratos seguem com outros casos.");
    expect(seloCasoFechou(responsavel({}).dados)).toEqual({ tom: "ok", texto: "Fechamento feito" });
    expect(leitorCasoFechou(responsavel({}).dados)).toBe(". O fechamento terminou.");
  });
  it("descreverAviso (sf-contrato): título, detalhe, selo, leitor, destino e ícone", () => {
    const x = descreverAviso(contratos([N012]), AGORA);
    expect(x.icone).toBe("cadeado");
    expect(x.detalhe).toBe("Diego Almeida encerrou o caso no financeiro, e o C-2026-012, de Noemi Bastos Carvalho, continua aberto. Encerre o contrato.");
    expect(x.selo).toEqual({ tom: "andamento", texto: "Falta o contrato" });
    expect(x.paraLeitor).toBe(". Falta encerrar o C-2026-012.");
    expect(x.onde).toBe("Encerrar o C-2026-012");
    expect(x.href).toBe("/contratos/contratos/ct12?encerrar=1");
    expect(x.agora).toBeUndefined();
    expect(x.numeros).toBe(true);
  });
});

describe("F3.150: o \"Agora:\" (agoraFechou)", () => {
  const nog = (agoraFechou: AvisoSino["agoraFechou"]) => fechou({ papel: "CONTRATOS", caso: "Nogueira x Transportes Serra", abertos: [N025, N026] }, agoraFechou);
  it("A, parte encerrada: com \"você\" e com o nome (sf-agora-parcial)", () => {
    const voce = nog({ abertos: [{ id: "ct26", numero: "C-2026-026" }], saiu: [{ numero: "C-2026-025", em: HOJE, por: FELIPE, voce: true }] });
    const x = descreverAviso(voce, AGORA);
    expect(x.agora).toBe("você encerrou o C-2026-025 hoje; falta o C-2026-026.");
    expect(x.selo).toEqual({ tom: "andamento", texto: "Falta o contrato" });
    expect(x.paraLeitor).toBe(". Agora: falta o C-2026-026.");
    expect(x.onde).toBe("Encerrar o C-2026-026");
    expect(x.href).toBe("/contratos/contratos/ct26?encerrar=1");
    expect(x.detalhe).toContain("Encerre os contratos.");
    const outro = nog({ abertos: [{ id: "ct26", numero: "C-2026-026" }], saiu: [{ numero: "C-2026-025", em: HOJE, por: FELIPE, voce: false }] });
    expect(agoraCasoFechou(outro, AGORA)?.linha).toBe("Felipe Matos encerrou o C-2026-025 hoje; falta o C-2026-026.");
  });
  it("A, parte encerrada com 2 restantes", () => {
    const v = fechou({ papel: "CONTRATOS", abertos: VIANA.concat({ id: "ct31", numero: "C-2026-031" }) },
      { abertos: [VIANA[1]!, VIANA[2]!].map(({ id, numero }) => ({ id: id!, numero })), saiu: [{ numero: "C-2026-028", em: HOJE, por: FELIPE }] });
    const x = agoraCasoFechou(v, AGORA)!;
    expect(x.linha).toBe("Felipe Matos encerrou o C-2026-028 hoje; faltam o C-2026-029 e o C-2026-030.");
    expect(x.selo).toEqual({ tom: "andamento", texto: "Faltam os contratos" });
    expect(x.paraLeitor).toBe(". Agora: faltam 2 contratos.");
    expect(x.semPedido).toBe(false);
  });
  it("vários saiu: você, a mesma pessoa e pessoas diferentes (a data é a do mais novo)", () => {
    const resta = [{ id: "ct30", numero: "C-2026-030" }];
    const s = (n: string, por: typeof FELIPE, voce: boolean, em = HOJE) => ({ numero: n, em, por, voce });
    const v = (saiu: NonNullable<AvisoSino["agoraFechou"]>["saiu"]) => agoraCasoFechou(fechou({ papel: "CONTRATOS", abertos: VIANA }, { abertos: resta, saiu }), AGORA)!.linha;
    expect(v([s("C-2026-028", FELIPE, true), s("C-2026-029", FELIPE, true)])).toBe("você encerrou os contratos C-2026-028 e C-2026-029 hoje; falta o C-2026-030.");
    expect(v([s("C-2026-028", FELIPE, false), s("C-2026-029", FELIPE, false)])).toBe("Felipe Matos encerrou os contratos C-2026-028 e C-2026-029 hoje; falta o C-2026-030.");
    expect(v([s("C-2026-028", FELIPE, true), s("C-2026-029", BIANCA, false, "2026-11-17T15:00:00-03:00")]))
      .toBe("2 contratos foram encerrados hoje; falta o C-2026-030.");
    expect(v([s("C-2026-028", FELIPE, false, "2026-11-16T15:00:00-03:00"), s("C-2026-029", BIANCA, false, "2026-11-17T15:00:00-03:00")]))
      .toBe("2 contratos foram encerrados ontem; falta o C-2026-030.");
  });
  it("A, todos encerrados, um contrato (sf-agora-encerrado, Carvalho): o pedido sai, destino Ver o", () => {
    const a = fechou({ papel: "CONTRATOS", abertos: [N012] }, { saiu: [{ numero: "C-2026-012", em: HOJE, por: FELIPE, voce: true }],
      encerrados: { em: HOJE, por: FELIPE, voce: true } });
    const x = descreverAviso(a, AGORA);
    expect(x.agora).toBe("você encerrou o C-2026-012 hoje.");
    expect(x.detalhe).toBe("Diego Almeida encerrou o caso no financeiro, e o C-2026-012, de Noemi Bastos Carvalho, continua aberto.");
    expect(x.selo).toEqual({ tom: "neutro", texto: "Contrato encerrado" });
    expect(x.paraLeitor).toBe(". Agora: contrato encerrado.");
    expect(x.onde).toBe("Ver o C-2026-012");
    expect(x.href).toBe("/contratos/contratos/ct12");
    const b = fechou({ papel: "CONTRATOS", abertos: [N012] }, { encerrados: { em: HOJE, por: FELIPE, voce: false } });
    expect(agoraCasoFechou(b, AGORA)?.linha).toBe("Felipe Matos encerrou o C-2026-012 hoje.");
  });
  it("A, todos encerrados, vários: você, o nome e pessoas diferentes (sf-agora-encerrado, Nogueira)", () => {
    const x = descreverAviso(nog({ encerrados: { em: HOJE, por: FELIPE, voce: true } }), AGORA);
    expect(x.agora).toBe("você encerrou os contratos hoje.");
    expect(x.selo).toEqual({ tom: "neutro", texto: "Contratos encerrados" });
    expect(x.paraLeitor).toBe(". Agora: contratos encerrados.");
    expect(x.onde).toBe("Ver o C-2026-025");
    expect(x.detalhe).not.toContain("Encerre");
    expect(agoraCasoFechou(nog({ encerrados: { em: HOJE, por: FELIPE } }), AGORA)?.linha).toBe("Felipe Matos encerrou os contratos hoje.");
    expect(agoraCasoFechou(nog({ encerrados: { em: HOJE, por: null } }), AGORA)?.linha).toBe("os contratos foram encerrados hoje.");
  });
  it("A, passou a seguir com outro caso, sem restantes", () => {
    const a = fechou({ papel: "CONTRATOS", abertos: [N012] }, { seguem: [{ id: "ct12", numero: "C-2026-012", outroCaso: "Martins x INSS · aposentadoria" }] });
    const x = descreverAviso(a, AGORA);
    expect(x.agora).toBe("o C-2026-012 passou a seguir com o caso Martins x INSS · aposentadoria; não precisa encerrar.");
    expect(x.selo).toEqual({ tom: "neutro", texto: "Segue com outro caso" });
    expect(x.paraLeitor).toBe(". Agora: contrato segue com outro caso.");
    expect(x.onde).toBe("Ver o C-2026-012");
    expect(x.detalhe).not.toContain("Encerre");
  });
  it("misto: encerrou um, outro passou a seguir, falta um (ordem encerrou, segue, falta; selo pelos restantes)", () => {
    const a = fechou({ papel: "CONTRATOS", abertos: VIANA }, {
      abertos: [{ id: "ct30", numero: "C-2026-030" }], saiu: [{ numero: "C-2026-028", em: HOJE, por: FELIPE, voce: true }],
      seguem: [{ id: "ct29", numero: "C-2026-029", outroCaso: "Viana x Banco Faro" }] });
    const x = descreverAviso(a, AGORA);
    expect(x.agora).toBe("você encerrou o C-2026-028 hoje; o C-2026-029 passou a seguir com o caso Viana x Banco Faro; falta o C-2026-030.");
    expect(x.selo).toEqual({ tom: "andamento", texto: "Falta o contrato" });
    expect(x.paraLeitor).toBe(". Agora: falta o C-2026-030.");
    expect(x.onde).toBe("Encerrar o C-2026-030");
    const sem = fechou({ papel: "CONTRATOS", abertos: [N025, N026] }, {
      saiu: [{ numero: "C-2026-025", em: HOJE, por: FELIPE, voce: true }], seguem: [{ id: "ct26", numero: "C-2026-026", outroCaso: "Nogueira x Banco Faro" }] });
    const y = descreverAviso(sem, AGORA);
    expect(y.agora).toBe("você encerrou o C-2026-025 hoje; o C-2026-026 passou a seguir com o caso Nogueira x Banco Faro; não precisa encerrar.");
    expect(y.selo).toEqual({ tom: "neutro", texto: "Segue com outro caso" });
    expect(y.onde).toBe("Ver o C-2026-025");
  });
  it("três contratos, um passa a seguir e os outros dois não mudam (Viana)", () => {
    const a = fechou({ papel: "CONTRATOS", abertos: VIANA }, {
      abertos: [{ id: "ct28", numero: "C-2026-028" }, { id: "ct29", numero: "C-2026-029" }],
      seguem: [{ id: "ct30", numero: "C-2026-030", outroCaso: "Viana x Banco Faro" }] });
    const x = descreverAviso(a, AGORA);
    expect(x.agora).toBe("o C-2026-030 passou a seguir com o caso Viana x Banco Faro; faltam o C-2026-028 e o C-2026-029.");
    expect(x.selo).toEqual({ tom: "andamento", texto: "Faltam os contratos" });
    expect(x.onde).toBe("Encerrar o C-2026-028");
    expect(x.detalhe).toContain("Encerre os contratos.");
  });
  it("B que termina (sf-agora-terminou) e B com seguem", () => {
    const a = responsavel({ abertos: [N032], quemContratos: QUEM_CTR },
      { saiu: [{ numero: "C-2026-032", em: HOJE, por: FELIPE, voce: false }], encerrados: { em: HOJE, por: FELIPE, voce: false } });
    const x = descreverAviso(a, AGORA);
    expect(x.agora).toBe("Felipe Matos encerrou o C-2026-032 hoje, e o fechamento do caso terminou.");
    expect(x.detalhe).toBe("Diego Almeida encerrou o caso no financeiro. Quem encerra o C-2026-032, de Márcia Fontes, é a área Contratos (Bianca Torres, Felipe Matos e Marina Ribeiro).");
    expect(x.selo).toEqual({ tom: "ok", texto: "Fechamento feito" });
    expect(x.paraLeitor).toBe(". Agora: fechamento terminou.");
    expect(x.onde).toBe("Ver o caso");
    expect(x.href).toBe(`/juridico/casos/${CASO}`);
    const b = responsavel({ abertos: [N032], seguem: [{ numero: "C-2026-007", cliente: "Ivone Martins", outroCaso: "Martins x INSS · aposentadoria" }] },
      { encerrados: { em: HOJE, por: FELIPE } });
    const y = descreverAviso(b, AGORA);
    expect(y.agora).toBe("Felipe Matos encerrou o C-2026-032 hoje.");
    expect(y.selo).toEqual({ tom: "neutro", texto: "Segue com outro caso" });
    expect(y.paraLeitor).toBe(". Agora: contrato segue com outro caso.");
  });
  it("B, parte encerrada: igual ao A", () => {
    const a = responsavel({ abertos: [N025, N026] }, { abertos: [{ id: "ct26", numero: "C-2026-026" }], saiu: [{ numero: "C-2026-025", em: HOJE, por: FELIPE }] });
    const x = descreverAviso(a, AGORA);
    expect(x.agora).toBe("Felipe Matos encerrou o C-2026-025 hoje; falta o C-2026-026.");
    expect(x.selo).toEqual({ tom: "andamento", texto: "Falta o contrato" });
    expect(x.paraLeitor).toBe(". Agora: falta o C-2026-026.");
    expect(x.onde).toBe("Ver o caso");
  });
  it("sem mudança: null", () => {
    expect(agoraCasoFechou(contratos([N012]), AGORA)).toBeNull();
    expect(agoraCasoFechou(fechou({ papel: "CONTRATOS", abertos: [N012] }, { abertos: [{ id: "ct12", numero: "C-2026-012" }] }), AGORA)).toBeNull();
  });
});

describe("F3.150: o destino pelas áreas da sessão", () => {
  it("grupo A: com e sem Contratos; sem áreas supõe que tem", () => {
    const a = contratos([N012]);
    expect(destinoCasoFechou(a, [N012], ["COMERCIAL", "CONTRATOS", "JURIDICO"])).toEqual({ onde: "Encerrar o C-2026-012", href: "/contratos/contratos/ct12?encerrar=1" });
    expect(destinoCasoFechou(a, [N012], ["COMERCIAL"])).toEqual({ onde: "Ver a ficha de Noemi Bastos Carvalho", href: "/clientes/cl-noemi" });
    expect(destinoCasoFechou(a, [N012])).toEqual({ onde: "Encerrar o C-2026-012", href: "/contratos/contratos/ct12?encerrar=1" });
    expect(destinoCasoFechou(a, [], ["CONTRATOS"])).toEqual({ onde: "Ver o C-2026-012", href: "/contratos/contratos/ct12" });
    expect(descreverAviso(a, AGORA, ["COMERCIAL"]).onde).toBe("Ver a ficha de Noemi Bastos Carvalho");
  });
  it("grupo A sem a área: a ficha do cliente do contrato de destino", () => {
    const a = contratos([N025, N026]);
    expect(destinoCasoFechou(a, [{ id: "ct26", numero: "C-2026-026" }], [])).toEqual({ onde: "Ver a ficha de Paulo Nogueira", href: "/clientes/cl-paulo" });
  });
  it("grupo B: com e sem Jurídico; sem clienteId, o caso", () => {
    const b = responsavel({ abertos: [N032] });
    expect(destinoCasoFechou(b, [N032], ["JURIDICO"])).toEqual({ onde: "Ver o caso", href: `/juridico/casos/${CASO}` });
    expect(destinoCasoFechou(b, [N032], [])).toEqual({ onde: "Ver a ficha de Márcia Fontes", href: "/clientes/cl-marcia" });
    expect(destinoCasoFechou(b, [N032])).toEqual({ onde: "Ver o caso", href: `/juridico/casos/${CASO}` });
    const semId = responsavel({ clienteId: undefined });
    expect(destinoCasoFechou(semId, [], [])).toEqual({ onde: "Ver o caso", href: `/juridico/casos/${CASO}` });
  });
});

describe("F3.150: PT-02 e o tipo desconhecido", () => {
  it("nenhum detalhe, Agora ou destino tem valor em reais", () => {
    const avisos = [
      contratos([N012]), contratos(VIANA), responsavel({ abertos: [N032], quemContratos: QUEM_CTR }), responsavel({ juntos: [N032] }),
      responsavel({ seguem: [{ numero: "C-2026-007", outroCaso: "Martins x INSS · aposentadoria" }] }),
      fechou({ papel: "CONTRATOS", abertos: [N025, N026] }, { abertos: [{ id: "ct26", numero: "C-2026-026" }], saiu: [{ numero: "C-2026-025", em: HOJE, por: FELIPE }] }),
    ];
    for (const a of avisos) {
      const x = descreverAviso(a, AGORA);
      expect(`${String(x.detalhe)} ${x.agora ?? ""} ${x.onde} ${x.paraLeitor ?? ""}`).not.toMatch(/R\$|\d+,\d{2}/);
    }
  });
  it("um tipo que o Portal não conhece não lança erro e leva ao Portal", () => {
    const a = { ...aviso({}), tipo: "TIPO_DO_FUTURO" } as unknown as AvisoSino;
    const x = descreverAviso(a, AGORA);
    expect(x.onde).toBe("Abrir o Portal");
    expect(x.href).toBe("/");
    expect(x.icone).toBe("sino");
  });
});
