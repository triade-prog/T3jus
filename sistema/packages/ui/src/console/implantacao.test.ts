// A aba Implantação (CO-08, F1.47): as contas e os textos da tela, fora do componente.
import { describe, expect, it } from "vitest";
import type { SituacaoImplantacao, TreinoImplantacao } from "@t3jus/domain";
import { etiquetaItem, implantacaoDaFatura, rotuloItem, temImplantacao } from "./cobranca.ts";
import {
  conclusaoNoPrazo, conferirTreino, dicaDoCabecalho, discoDoDia, duracao, juntarNomes, lerDia, linhasDaImplantacao, oQueJaAconteceu,
  papelDaPessoa, prazoNaTela, tempoDeTreino, treinoDaPessoa,
} from "./implantacao.ts";
import { resumoDaRegra, somarDias } from "./RegraImplantacao.tsx";

const HOJE = "2026-11-24";
const DESF = { em: "2026-11-21T10:00:00-03:00", por: { id: "c1", nome: "Carla" }, motivo: "Registrado no cliente errado." };

function treino(o: Partial<TreinoImplantacao> = {}): TreinoImplantacao {
  return {
    id: "t1", implantacaoId: "i1", implantacaoNumero: 1, dia: "2026-11-20", duracaoMin: 90, forma: "VIDEO", temas: ["AGENDA"],
    dadoPor: { id: "c1", nome: "Carla" }, criadoEm: "2026-11-20T15:00:00-03:00", pessoas: [{ id: "p1", nome: "Juliana Prado" }], desfeito: null,
    ...o,
  };
}

function pessoa(o: Record<string, unknown> = {}): SituacaoImplantacao["pessoas"][number] {
  return {
    id: "p1", nome: "Juliana Prado", funcao: "SOCIO", areas: [], convite: { aceitou: true, aceitouEm: "2026-11-10", convidadaEm: "2026-11-09" },
    treino: { treinada: false }, ...o,
  } as SituacaoImplantacao["pessoas"][number];
}

describe("CO-08: textos curtos da aba Implantação", () => {
  it("junta nomes, duração e o disco do dia", () => {
    expect(juntarNomes([])).toBe("");
    expect(juntarNomes(["A"])).toBe("A");
    expect(juntarNomes(["A", "B", "C"])).toBe("A, B e C");
    expect(duracao(45)).toBe("45 min");
    expect(duracao(60)).toBe("1h");
    expect(duracao(90)).toBe("1h30");
    expect(discoDoDia("2026-11-24")).toEqual({ dia: "24", mes: "nov" });
  });
  it("o prazo: aberta, perto, vence hoje e passou", () => {
    const abre = { abertaEm: "2026-11-10" };
    expect(prazoNaTela({ ...abre, prazoAte: "2026-12-10" }, HOJE)).toMatchObject({ tom: "ok", disco: "16", selo: null, titulo: "até 10/12/2026" });
    expect(prazoNaTela({ ...abre, prazoAte: "2026-11-29" }, HOJE)).toMatchObject({ tom: "atencao", selo: "Faltam 5 dias" });
    expect(prazoNaTela({ ...abre, prazoAte: HOJE }, HOJE)).toMatchObject({ tom: "urgente", disco: "0", selo: "Vence hoje", detalhe: "prazo de 14 dias" });
    expect(prazoNaTela({ ...abre, prazoAte: "2026-11-21" }, HOJE)).toMatchObject({ tom: "urgente", disco: "+3", selo: "Passou do prazo" });
  });
  it("a dica do cabeçalho da ficha", () => {
    expect(dicaDoCabecalho("2026-12-10", HOJE)).toBe("Prazo da implantação: 10/12/2026, faltam 16 dias.");
    expect(dicaDoCabecalho("2026-12-10", HOJE, { treinadas: 3, total: 3 })).toBe("Prazo da implantação: 10/12/2026, faltam 16 dias. As 3 pessoas foram treinadas.");
    expect(dicaDoCabecalho(HOJE, HOJE)).toBe("O prazo da implantação vence hoje, 24/11/2026.");
    expect(dicaDoCabecalho("2026-11-23", HOJE)).toBe("O prazo da implantação passou em 23/11/2026, há 1 dia.");
  });
  it("a conclusão conta o dia de Brasília", () => {
    expect(conclusaoNoPrazo("2026-12-08T01:30:00+00:00", "2026-12-16")).toBe("9 dias antes do prazo (16/12/2026)");
    expect(conclusaoNoPrazo("2026-12-16T12:00:00-03:00", "2026-12-16")).toBe("no dia do prazo (16/12/2026)");
    expect(conclusaoNoPrazo("2026-12-18T12:00:00-03:00", "2026-12-16")).toBe("2 dias depois do prazo (16/12/2026)");
  });
  it("o tempo de treino não conta o desfeito", () => {
    expect(tempoDeTreino([])).toBe("0 min em 0 treinos");
    expect(tempoDeTreino([treino(), treino({ id: "t2", duracaoMin: 120 }), treino({ id: "t3", desfeito: DESF })])).toBe("3h30 em 2 treinos, sem contar o desfeito");
  });
  it("o papel da pessoa e o treino dela", () => {
    expect(papelDaPessoa({ funcao: "SOCIO", areas: [] })).toBe("Sócio · partes comuns");
    expect(papelDaPessoa({ funcao: "EQUIPE", areas: [] })).toMatch(/^Equipe · /);
    expect(treinoDaPessoa(pessoa({ convite: { aceitou: false, aceitouEm: null, convidadaEm: "2026-11-09" } }), []).texto).toBe("o treino fica para depois do primeiro acesso");
    expect(treinoDaPessoa(pessoa(), [treino({ desfeito: DESF })]).texto).toBe("o registro de 20/11 foi desfeito");
    expect(treinoDaPessoa(pessoa({ treino: { treinada: true, dia: "2026-11-20", forma: "VIDEO", duracaoMin: 90 } }), [])).toMatchObject({ treinada: true });
  });
  it("o que já aconteceu: X de Y pessoas treinadas e quem falta", () => {
    const s = {
      hoje: HOJE, socioEntrou: { entrou: true, pessoa: { id: "p1", nome: "Juliana Prado" }, dia: "2026-11-10" },
      importacao: { concluida: false, em: null, origem: null, oQue: null }, whatsapp: { ligado: false, desde: null },
      pessoas: [pessoa({ treino: { treinada: true, dia: "2026-11-20", forma: "VIDEO", duracaoMin: 90 } }), pessoa({ id: "p2", nome: "Joana Freitas" })],
      treinadas: 1, total: 2, diasAtePrazo: 16,
    } as unknown as SituacaoImplantacao;
    const l = oQueJaAconteceu(s, "2026-11-10");
    expect(l[0]!.texto).toBe("Juliana Prado, em 10/11/2026. A implantação começou aqui.");
    expect(l[3]).toMatchObject({ marca: "meio", titulo: "1 de 2 pessoas treinadas", texto: "Falta 1: Joana Freitas. Veja abaixo." });
  });
  it("registrar treino: data no futuro, duração fora de 15 a 480 e ninguém marcado", () => {
    expect(lerDia("31/02/2026")).toBeNull();
    expect(lerDia("4/11/2026")).toBe("2026-11-04");
    expect(conferirTreino({ dia: "24/11/2026", duracao: "90", pessoas: ["p1"] }, HOJE).campos.size).toBe(0);
    const r = conferirTreino({ dia: "25/11/2026", duracao: "10", pessoas: [] }, HOJE);
    expect(r.noFuturo).toBe(true);
    expect([...r.campos].sort()).toEqual(["dia", "duracaoMin", "pessoas"]);
  });
});

describe("CO-08: a implantação na fatura e na regra", () => {
  it("as linhas: isenta soma zero; cobrada só a implantação; nunca 'Desconto'", () => {
    const isenta = linhasDaImplantacao({ descricao: "treino da equipe", valorCentavos: 149000, isenta: true, texto: "para os primeiros escritórios" });
    expect(isenta.map((l) => l.texto)).toEqual(["Implantação assistida · treino da equipe", "Isenção da implantação · para os primeiros escritórios"]);
    expect(isenta.reduce((s, l) => s + l.valorCentavos, 0)).toBe(0);
    expect(linhasDaImplantacao({ descricao: "x", valorCentavos: 149000, isenta: false, texto: null })).toHaveLength(1);
    expect(rotuloItem("IMPLANTACAO")).toBe("Implantação");
    expect(rotuloItem("ISENCAO")).toBe("Isenção");
    expect(etiquetaItem("DESCONTO")).toBe("Desconto");
  });
  it("lê a implantação das linhas da fatura", () => {
    const itens = [
      { tipo: "MENSALIDADE", descricao: "Plano", quantidade: 1, valorCentavos: 39900 },
      { tipo: "IMPLANTACAO", descricao: "Implantação assistida · treino", quantidade: 1, valorCentavos: 149000 },
      { tipo: "ISENCAO", descricao: "Isenção da implantação · para os primeiros", quantidade: 1, valorCentavos: -149000 },
    ] as Parameters<typeof implantacaoDaFatura>[0];
    expect(temImplantacao(itens)).toBe(true);
    expect(temImplantacao([itens[0]!])).toBe(false);
    expect(implantacaoDaFatura(itens)).toEqual({ valorCentavos: 149000, isenta: true, texto: "para os primeiros" });
    expect(implantacaoDaFatura([itens[0]!])).toBeNull();
  });
  it("o resumo das mudanças da regra e a conta dos dias", () => {
    expect(resumoDaRegra({ valorCentavos: 149000, condicaoPadrao: "ISENTA", isencaoAte: "2027-05-31", prazoDias: 30 })).toBe("R$ 1.490,00, isenta até 31/05/2027, 30 dias");
    expect(resumoDaRegra({ valorCentavos: 149000, condicaoPadrao: "COBRADA", prazoDias: 30 })).toBe("R$ 1.490,00, cobrada à vista, 30 dias");
    expect(resumoDaRegra(null)).toBe("");
    expect(somarDias("2027-05-31", 1)).toBe("2027-06-01");
    expect(somarDias("2027-05-31", -30)).toBe("2027-05-01");
  });
});
