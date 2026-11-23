import { describe, expect, it } from "vitest";
import { avisoDispensado, avisoTrazido, buscaVazia, conflitoDispensa, contagemLembretes, grupoDoEndereco, ROTAS_LEMBRETES, textoCaso, textoLancamentos } from "./lembretes.ts";
import { resumoEncerrados, textoComoEncerrou, textoOrigemCaso } from "./juridico.ts";

const marina = { id: "p1", nome: "Marina Ribeiro" };
const felipe = { id: "p2", nome: "Felipe Matos" };

describe("lembretes de contrato (F3.144, F3.145)", () => {
  it("rotas e o grupo do endereço", () => {
    expect(ROTAS_LEMBRETES.grupo("CONTRATO", "Tavares")).toBe("/contratos/contratos/lembretes?mostrar=viraram&q=Tavares");
    expect([grupoDoEndereco("dispensados"), grupoDoEndereco(null), grupoDoEndereco("x")]).toEqual(["DISPENSADO", "ABERTO", "ABERTO"]);
  });

  it("a linha: o caso com o responsável e os lançamentos com o mais antigo", () => {
    expect(textoCaso({ nome: "Tavares x Metalúrgica Andrade", responsavel: felipe })).toBe("Caso Tavares x Metalúrgica Andrade · com Felipe Matos");
    expect(textoCaso(null)).toBe("Sem caso ligado");
    expect(textoLancamentos({ lancamentos: 3, maisAntigo: "2026-06-10" }, "2026-11-23")).toBe("3 lançamentos · o mais antigo venceu em 10/06/2026");
    expect(textoLancamentos({ lancamentos: 1, maisAntigo: "2026-11-15" }, "2026-11-23")).toBe("1 lançamento · venceu em 15/11/2026");
  });

  it("a contagem e a busca vazia em cada grupo (rodada 2)", () => {
    const c = contagemLembretes("ABERTO", 81, 4525000, "VALOR", null);
    expect(c.forte + c.resto).toBe("81 lembretes abertos · R$ 45.250,00 · do maior valor para o menor");
    const v = contagemLembretes("CONTRATO", 0, 0, null, "Tavares");
    expect(v.forte + v.resto).toBe("Nenhum lembrete encontrado em Viraram contrato para “Tavares”");
    expect(buscaVazia("CONTRATO", "Tavares")).toEqual({
      titulo: "Nenhum lembrete em Viraram contrato para “Tavares”",
      texto: "Confira o nome do cliente ou do caso. Aqui a busca olha só os que viraram contrato. Para procurar nos abertos ou nos dispensados, clique no número acima: a busca vai junto.",
    });
    expect(buscaVazia("ABERTO", "Tavarez").titulo).toBe("Nenhum lembrete para “Tavarez”");
  });

  it("os avisos de dispensar e de trazer de volta", () => {
    expect(avisoDispensado("Osvaldo Pereira Lins").titulo).toBe("Lembrete de Osvaldo dispensado.");
    const r = avisoTrazido({ situacao: "CONTRATO", cliente: { id: "c", nome: "Jorge Batista" }, contrato: { id: "k", numero: "C-2026-039", em: "", por: null } });
    expect([r.resolvido, r.titulo, r.texto]).toEqual([true, "O lembrete de Jorge voltou já resolvido.",
      "O contrato C-2026-039 foi criado enquanto ele estava dispensado. Por isso foi direto para Viraram contrato, e não para Abertos."]);
    expect(avisoTrazido({ situacao: "ABERTO", cliente: { id: "c", nome: "Nair Gonçalves" }, contrato: null }).titulo).toBe("O lembrete de Nair voltou para Abertos.");
  });

  it("o conflito: já dispensado e já virou contrato, com quem e quando", () => {
    const agora = new Date("2026-11-23T15:00:00Z");
    expect(conflitoDispensa({ motivo: "JA_DISPENSADO", por: felipe, em: "2026-11-23T14:57:00Z" }, "Osvaldo Pereira Lins", agora)).toEqual({
      titulo: "Este lembrete já foi dispensado.",
      texto: "Felipe Matos já dispensou este lembrete há 3 minutos. Nada mudou: o motivo que você escolheu não foi gravado. O lembrete está em Dispensados, com o motivo de Felipe.",
    });
    expect(conflitoDispensa({ motivo: "JA_RESOLVIDO", contrato: { numero: "C-2026-038" }, por: felipe, em: "2026-11-23T14:58:00Z" }, "Osvaldo Pereira Lins", agora).texto)
      .toBe("Felipe Matos criou o contrato C-2026-038 para Osvaldo há 2 minutos, e o lembrete saiu sozinho. Nada foi dispensado. Feche a janela para ver a lista atualizada.");
  });
});

describe("o caso que veio de outro sistema (F3.143, F3.148)", () => {
  const origem = { sistema: "ASTREA" as const, arquivadoEm: null, importadoEm: "2026-11-21T19:52:00Z", desfeitaEm: null };
  it("\"Como encerrou\": veio encerrado, importação desfeita e o resultado com o acerto", () => {
    expect(textoComoEncerrou({ resultado: null, encerradoPor: "IMPORTADO_ENCERRADO", etapaDesde: "2026-11-21", origem: { ...origem, arquivadoEm: "2025-03-14" }, acerto: null }))
      .toEqual({ tipo: "IMPORTADO", selo: "Veio encerrado", sub: "sem resultado · arquivado no Astrea em 14/03/2025" });
    expect(textoComoEncerrou({ resultado: null, encerradoPor: "IMPORTACAO_DESFEITA", etapaDesde: "2026-11-21", origem: { ...origem, importadoEm: "2026-11-20T15:00:00Z", desfeitaEm: "2026-11-21T15:00:00Z" }, acerto: null }))
      .toEqual({ tipo: "DESFEITA", selo: "Importação desfeita", sub: "sem resultado · importação do Astrea de 20/11 desfeita em 21/11/2026" });
    expect(textoComoEncerrou({ resultado: "GANHO", encerradoPor: "RESULTADO", etapaDesde: "2026-10-30", origem: null, acerto: "FEITO" }))
      .toEqual({ tipo: "RESULTADO", selo: "Ganho", sub: "encerrado em 30/10/2026 · acerto feito" });
  });

  it("a contagem dos Encerrados (rodada 2)", () => {
    const r = resumoEncerrados({ total: 88, como: { resultado: 14, importados: 71, desfeitos: 3 }, origensImportados: ["ASTREA"] }, 25);
    expect(r.forte + r.resto).toBe("88 casos encerrados · 14 com resultado, 71 que vieram encerrados do Astrea e 3 com a importação desfeita · do mais recente para o mais antigo");
    const s = resumoEncerrados({ total: 85, como: { resultado: 14, importados: 71, desfeitos: 0 }, origensImportados: ["ASTREA"] }, 25);
    expect(s.resto).toBe(" · 14 com resultado e 71 que vieram encerrados do Astrea · do mais recente para o mais antigo");
  });

  it("a linha \"Veio da importação\"", () => {
    const t = textoOrigemCaso({ importacaoId: "i", sistema: "ASTREA", em: "2026-11-21T19:52:00Z", por: marina, desfeitaEm: null, etapaOrigem: "Audiência marcada",
      linhaOrigem: 14, abaOrigem: "Processos", registroOrigem: null, arquivadoEm: null, veioEncerrado: false, etapaLigada: { ordem: 4, nome: "Instrução" } });
    expect(t).toEqual({ titulo: "Veio da importação do Astrea", importadoEm: "21/11/2026, 16h52", rotuloEtapa: "Etapa no Astrea",
      etapa: "“Audiência marcada”, ligada a 4. Instrução", rotuloOnde: "No Astrea", onde: "Linha P14 da aba Processos" });
  });
});
