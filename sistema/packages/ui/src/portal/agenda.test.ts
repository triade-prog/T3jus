// Regras da Agenda (EX-06, EX-11): datas em Brasília, períodos, grade e horários livres.
import { describe, expect, it } from "vitest";
import { diaDe, gradeDoMes, horaDe, horariosDoLembrete, horariosLivres, inicioDaSemana, lerDia, lerHorario, nomeDoTipo, periodo, posicaoNaGrade, rotaAgenda } from "./agenda.ts";
import { conferirRascunho, corpoDoRascunho, rascunhoNovo } from "./JanelaCompromisso.tsx";
import { fraseDoEvento, textoDoLembrete } from "./FichaCompromisso.tsx";

describe("EX-06: períodos da agenda", () => {
  it("a semana vai de segunda a domingo", () => {
    expect(inicioDaSemana("2026-11-18")).toBe("2026-11-16");
    expect(inicioDaSemana("2026-11-22")).toBe("2026-11-16");
    expect(periodo("semana", "2026-11-18")).toMatchObject({ de: "2026-11-16", ate: "2026-11-22", titulo: "16 a 22 de novembro de 2026", ant: "2026-11-09" });
    expect(periodo("semana", "2026-12-01").titulo).toBe("30 de novembro a 6 de dezembro de 2026");
    expect(periodo("semana", "2026-12-30").titulo).toBe("28 de dezembro de 2026 a 3 de janeiro de 2027");
  });
  it("o mês ocupa semanas inteiras e o dia tem o nome", () => {
    const g = gradeDoMes("2026-11-18");
    expect([g[0], g.at(-1), g.length]).toEqual(["2026-10-26", "2026-12-06", 42]);
    expect(periodo("mes", "2026-11-18")).toMatchObject({ titulo: "Novembro de 2026", ant: "2026-10-01", prox: "2026-12-01" });
    expect(periodo("dia", "2026-11-18").titulo).toBe("Quarta, 18 de novembro de 2026");
  });
  it("datas e horas em Brasília", () => {
    expect([diaDe("2026-11-19T02:30:00Z"), horaDe("2026-11-19T02:30:00Z")]).toEqual(["2026-11-18", "23:30"]);
    expect(lerDia("19/11/2026")).toBe("2026-11-19");
    expect(lerDia("31/02/2026")).toBeNull();
    expect([lerHorario("9:30"), lerHorario("16h00"), lerHorario("25:00")]).toEqual(["09:30", "16:00", null]);
  });
  it("posição na grade: 60 px por hora desde as 8h, no mínimo 44 px", () => {
    expect(posicaoNaGrade({ inicio: "2026-11-18T11:00:00-03:00", fim: "2026-11-18T12:00:00-03:00" }, "2026-11-18")).toEqual({ topo: 180, altura: 58 });
    expect(posicaoNaGrade({ inicio: "2026-11-18T09:00:00-03:00", fim: "2026-11-18T09:15:00-03:00" }, "2026-11-18").altura).toBe(44);
  });
  it("horários livres de 90 minutos ou mais, depois de agora", () => {
    const l = [
      { inicio: "2026-11-18T09:00:00-03:00", fim: "2026-11-18T09:45:00-03:00", situacao: "MARCADO" as const },
      { inicio: "2026-11-18T11:00:00-03:00", fim: "2026-11-18T12:00:00-03:00", situacao: "MARCADO" as const },
      { inicio: "2026-11-18T14:30:00-03:00", fim: "2026-11-18T15:30:00-03:00", situacao: "MARCADO" as const },
      { inicio: "2026-11-18T16:00:00-03:00", fim: "2026-11-18T17:00:00-03:00", situacao: "CANCELADO" as const },
    ];
    expect(horariosLivres(l, "2026-11-18", 10 * 60 + 12)).toEqual([{ de: "12:00", ate: "14:30" }, { de: "15:30", ate: null }]);
  });
  it("o tipo escrito aparece com o próprio nome", () => {
    expect(nomeDoTipo({ tipo: "OUTRO", tipoEscrito: "Perícia" })).toBe("Perícia");
    expect(nomeDoTipo({ tipo: "CLIENTE", tipoEscrito: null })).toBe("Cliente");
  });
  it("o endereço guarda a visão, o dia e a pessoa", () => {
    expect(rotaAgenda({ ver: "semana" })).toBe("/agenda");
    expect(rotaAgenda({ ver: "dia", dia: "2026-11-18", pessoa: "x" })).toBe("/agenda?ver=dia&dia=2026-11-18&pessoa=x");
  });
});

describe("EX-06: janela do compromisso", () => {
  const base = { ...rascunhoNovo("2026-11-19", "16:00", "p1"), titulo: "Conciliação" };
  it("os três erros do desenho: o que é vazio, término antes do início, virtual sem link", () => {
    const e = conferirRascunho({ ...base, titulo: " ", fim: "15:00", modalidade: "VIRTUAL" });
    expect(Object.keys(e).sort()).toEqual(["fim", "linkSala", "titulo"]);
    expect(Object.keys(conferirRascunho({ ...base, tipo: "OUTRO" }))).toEqual(["tipoEscrito"]);
  });
  it("PT-03: remarcar pede motivo", () => {
    const original = { dia: "19/11/2026", ini: "16:00", fim: "17:00" };
    expect(conferirRascunho(base, original)).toEqual({});
    expect(Object.keys(conferirRascunho({ ...base, ini: "14:00" }, original))).toEqual(["motivo"]);
  });
  it("o pedido vai em Brasília, sem lembrete quando não há cliente", () => {
    expect(corpoDoRascunho(base)).toMatchObject({ inicio: "2026-11-19T16:00:00-03:00", fim: "2026-11-19T17:00:00-03:00", lembrete: false, linkSala: null, tambemVai: [] });
  });
});

describe("EX-11: lembrete ao cliente", () => {
  it("1 dia antes, no mesmo horário, e 2 horas antes", () => {
    const l = horariosDoLembrete("2026-11-18T11:00:00-03:00");
    expect([diaDe(l.umDia), horaDe(l.umDia), horaDe(l.duasHoras)]).toEqual(["2026-11-17", "11:00", "09:00"]);
  });
  it("o texto segue o modelo aprovado", () => {
    const t = textoDoLembrete({ tipo: "AUDIENCIA", tipoEscrito: null, inicio: "2026-11-18T11:00:00-03:00", modalidade: "VIRTUAL", local: null }, "Ribeiro & Matos", "Gabriela Teixeira");
    expect(t).toBe("Olá, Gabriela. Aqui é do escritório Ribeiro & Matos. Sua audiência é amanhã, quarta, 18/11, às 11h, por vídeo. O link chega aqui 2 horas antes. Entre 10 minutos antes, com um documento com foto. Faltar sem justificativa pode gerar multa. Responda CONFIRMO, ou escreva se tiver dúvida.");
  });
  it("PT-03: o histórico diz quem remarcou e o motivo", () => {
    expect(fraseDoEvento({ em: "", acao: "compromisso.remarcado", autor: "Larissa Costa", dados: { de: "2026-11-18T14:00:00-03:00", para: "2026-11-18T11:00:00-03:00", motivo: "redesignação" } }, {}))
      .toEqual({ quem: "Larissa Costa", oque: "remarcou", detalhe: "De 18/11, às 14:00 para 18/11, às 11:00. Motivo: redesignação" });
  });
});
