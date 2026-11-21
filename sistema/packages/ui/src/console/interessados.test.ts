// Regras da tela de Interessados (F2.3, SC-05): filtros, prazo do próximo passo, números do
// alto, frases do histórico e a leitura de data e hora digitadas.
import { describe, expect, it } from "vitest";
import type { Interessado } from "@t3jus/domain";
import { contarChips, filtrar, fraseEvento, lerDataBr, lerHora, numeros, prazo, quandoPasso } from "./interessados.ts";

const HOJE = "2026-11-21";
const base: Interessado = {
  id: "1", estagio: "EM_CONTATO", origem: "SITE", nome: "Henrique Moura", escritorio: "Ipê & Moura Advogados", email: "henrique@ipe.com.br",
  whats: "+5586997340921", tamanho: "DE_6_A_10", area: null, cidade: "Teresina", uf: "PI", chegouEm: "2026-11-20T19:42:00Z", prazoResposta: "2026-11-23",
  responsavel: { id: "rt", nome: "Rafael Teles" }, proximo: { passo: "Marcar a demonstração", data: HOJE, hora: null, quem: null },
  fim: null, clienteEscritorio: null, ultimoContatoEm: "2026-11-20T19:42:00Z", versao: 3,
};
const lista: Interessado[] = [
  base,
  { ...base, id: "2", estagio: "NOVO", escritorio: "Jatobá Advocacia", nome: "Lívia Prado", email: "livia@jatoba.com.br", cidade: null, responsavel: null, proximo: null },
  { ...base, id: "3", escritorio: "Angico Advocacia", proximo: { passo: "Mandar o vídeo", data: "2026-11-18", hora: null, quem: null } },
  { ...base, id: "4", estagio: "CLIENTE", escritorio: "Baru Advocacia", proximo: null },
  { ...base, id: "5", estagio: "PERDIDO", escritorio: "Carnaúba", proximo: { passo: "Procurar de novo", data: "2026-10-01", hora: null, quem: null } },
];

describe("Interessados", () => {
  it("o prazo do próximo passo: vencido, hoje ou no prazo; encerrado não vence", () => {
    expect(prazo(lista[0]!, HOJE)).toBe("hoje");
    expect(prazo(lista[2]!, HOJE)).toBe("venc");
    expect(prazo(lista[4]!, HOJE)).toBe("");
    expect(quandoPasso(lista[2]!, HOJE)).toBe("venceu em 18/11");
    expect(quandoPasso({ ...base, proximo: { passo: "Demo", data: "2026-11-25", hora: "15:00", quem: null } }, HOJE)).toBe("25/11, 15h00");
  });

  it("chips contam e filtram; a busca ignora acento e maiúsculas", () => {
    expect(contarChips(lista, HOJE)).toEqual({ ANDAMENTO: 3, NOVOS: 1, VENCIDOS: 1, CLIENTES: 1, FECHADOS: 1, TODOS: 5 });
    const f = { chip: "TODOS" as const, busca: "jatoba", responsavel: "", origem: "" as const };
    expect(filtrar(lista, f, HOJE, "rt").map((i) => i.id)).toEqual(["2"]);
    expect(filtrar(lista, { ...f, busca: "", responsavel: "SEM" }, HOJE, "rt").map((i) => i.id)).toEqual(["2"]);
    expect(filtrar(lista, { ...f, chip: "ANDAMENTO", busca: "", responsavel: "MEUS" }, HOJE, "rt").map((i) => i.id)).toEqual(["1", "3"]);
  });

  it("os números do alto: sem responsável, vencidos com os dias e o funil", () => {
    const n = numeros(lista, HOJE);
    expect(n.sem.map((i) => i.id)).toEqual(["2"]);
    expect(n.vencidos).toEqual([{ nome: "Angico", dias: 3 }]);
    expect(n.funil.find((x) => x.estagio === "EM_CONTATO")!.quantos).toBe(2);
  });

  it("a frase do histórico traz quem e o motivo", () => {
    const x = fraseEvento({ id: 1, ocorridoEm: "2026-11-20T20:18:00Z", acao: "estagio.mudou", dados: { de: "NOVO", para: "EM_CONTATO", motivo: "Respondi." }, autor: { id: "rt", nome: "Rafael Teles" } });
    expect(x).toEqual({ quem: "Rafael Teles", texto: "passou de Novo para Em contato", detalhe: "Motivo: “Respondi.”", forte: true });
    expect(fraseEvento({ id: 2, ocorridoEm: "", acao: "pedido.recebido", dados: {}, autor: null }).quem).toBe("O site");
  });

  it("lê a data e a hora como a pessoa digita", () => {
    expect(lerDataBr("26/11/2026")).toBe("2026-11-26");
    expect(lerDataBr("1/3/27")).toBe("2027-03-01");
    expect(lerDataBr("31/02/2026")).toBeNull();
    expect(lerHora("18h00")).toBe("18:00");
    expect(lerHora("9h")).toBe("09:00");
    expect(lerHora("25h")).toBeNull();
  });
});
