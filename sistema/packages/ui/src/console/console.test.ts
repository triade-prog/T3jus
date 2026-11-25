import { describe, expect, it } from "vitest";
import type { SocioCliente } from "@t3jus/domain";
import { contarCarteira, filtrarCarteira, pendencias, situacaoSocio, tarefasDaCarteira, type ClienteCarteira } from "./carteira.ts";
import { esperando, haQuanto, iniciais } from "./tempo.ts";
import { dataBr as dataBrCobranca } from "./cobranca.ts";
import { dataBr as dataBrFim } from "./FimContrato.tsx";

const AGORA = new Date("2026-11-18T15:00:00Z"); // 12h em Brasília

function socio(o: Partial<SocioCliente> = {}): SocioCliente {
  return { vinculoId: "v", pessoaId: "p", nome: "Renata Lima", desde: "2026-11-18T13:00:00Z", conviteEnviadoEm: "2026-11-18T13:00:00Z",
    convidadoPor: "Carol", senhaCriadaEm: null, ...o };
}

function cliente(o: Partial<ClienteCarteira>): ClienteCarteira {
  return { id: o.nome ?? "x", nome: "X", cidade: "Recife", uf: "PE", estagio: "IMPLANTACAO", funcoes: ["ADMINISTRACAO"], situacoes: [],
    criadoEm: "2026-11-10T12:00:00Z", socios: [], equipe: [{ pessoaId: "c", nome: "Carol Andrade", funcoes: ["ADMINISTRACAO"] }],
    ultimaAtividade: "2026-11-18T12:00:00Z", ...o };
}

describe("tempo do Console (horário de Brasília)", () => {
  it("diz quanto tempo passou do jeito da carteira", () => {
    expect(haQuanto("2026-11-18T14:58:30Z", AGORA)).toBe("há 1 min");
    expect(haQuanto("2026-11-18T13:00:00Z", AGORA)).toBe("há 2 h");
    expect(haQuanto("2026-11-18T03:30:00Z", AGORA)).toBe("hoje, 0h30");
    expect(haQuanto("2026-11-17T20:00:00Z", AGORA)).toBe("ontem");
    expect(haQuanto("2026-11-15T12:00:00Z", AGORA)).toBe("há 3 dias");
    expect(haQuanto("2026-11-04T12:00:00Z", AGORA)).toBe("há 2 semanas");
    expect(haQuanto("2026-09-02T12:00:00Z", AGORA)).toBe("02/09");
  });
  it("espera e iniciais", () => {
    expect(esperando("2026-11-12T15:00:00Z", AGORA)).toBe("há 6 dias");
    expect(iniciais("Ana Lúcia da Silva Prado")).toBe("AP");
    expect(iniciais("Carol")).toBe("C");
  });
});

describe("carteira (CO-01)", () => {
  it("pendências: convite pendente no lugar de sem sócio quando o convite já saiu", () => {
    expect(pendencias(cliente({ situacoes: ["SEM_SOCIO", "SEM_CONTRATO"] }))).toEqual(["SEM_SOCIO", "SEM_CONTRATO"]);
    expect(pendencias(cliente({ socios: [socio()] }))).toEqual(["CONVITE_PENDENTE"]);
    expect(pendencias(cliente({ socios: [socio({ senhaCriadaEm: "2026-11-18T14:00:00Z" })] }))).toEqual([]);
  });
  it("sócio: convite com 1 hora de validade, depois entrou ou desde", () => {
    expect(situacaoSocio(cliente({}), AGORA)).toEqual({ nome: null, detalhe: "Ainda não convidado" });
    expect(situacaoSocio(cliente({ socios: [socio()] }), AGORA).detalhe).toBe("Link do convite venceu");
    expect(situacaoSocio(cliente({ socios: [socio({ conviteEnviadoEm: "2026-11-18T14:30:00Z" })] }), AGORA).detalhe).toBe("Convite enviado, vale 1 hora");
    expect(situacaoSocio(cliente({ socios: [socio({ senhaCriadaEm: "2026-11-18T14:00:00Z" })] }), AGORA).detalhe).toBe("Entrou no Portal");
    expect(situacaoSocio(cliente({ estagio: "ATIVO", socios: [socio({ senhaCriadaEm: "2026-09-02T14:00:00Z" })] }), AGORA).detalhe).toBe("Desde 02/09/2026");
  });
  it("pedem você agora: uma por cliente, do mais antigo, no máximo três", () => {
    const lista = [
      cliente({ id: "a", nome: "Jatobá", situacoes: ["SEM_SOCIO"], criadoEm: "2026-11-15T12:00:00Z" }),
      cliente({ id: "b", nome: "Ipê", situacoes: ["SEM_CONTRATO"], socios: [socio({ senhaCriadaEm: "2026-11-17T12:00:00Z" })], criadoEm: "2026-11-01T12:00:00Z" }),
      cliente({ id: "c", nome: "Cedro", socios: [socio()], criadoEm: "2026-11-05T12:00:00Z" }),
      cliente({ id: "d", nome: "Aroeira", estagio: "ATIVO", situacoes: ["SEM_CONTRATO"], criadoEm: "2026-10-01T12:00:00Z" }),
      cliente({ id: "e", nome: "Sucupira", socios: [socio({ senhaCriadaEm: "2026-11-17T12:00:00Z" })], criadoEm: "2026-11-16T12:00:00Z" }),
    ];
    expect(tarefasDaCarteira(lista, AGORA).map((t) => [t.clienteId, t.titulo])).toEqual([
      ["b", "Registrar o contrato"],
      ["c", "Reenviar o convite"],
      ["a", "Convidar o sócio"],
    ]);
    expect(tarefasDaCarteira(lista, AGORA, 5).at(-1)).toMatchObject({ clienteId: "e", titulo: "Passar para ativo" });
  });
  it("contagem, busca sem acento e ordem", () => {
    const lista = [
      cliente({ id: "a", nome: "Jatobá", situacoes: ["SEM_SOCIO"] }),
      cliente({ id: "b", nome: "Ipê", cidade: "Brasília", estagio: "ATIVO" }),
    ];
    expect(contarCarteira(lista)).toEqual({ TODOS: 2, IMPLANTACAO: 1, ATIVO: 1, PENDENCIA: 1, ENCERRADOS: 0 });
    expect(filtrarCarteira(lista, { filtro: "TODOS", termo: "brasilia", ordem: "NOME" }).map((c) => c.id)).toEqual(["b"]);
    expect(filtrarCarteira(lista, { filtro: "TODOS", termo: "", ordem: "NOME" }).map((c) => c.id)).toEqual(["b", "a"]);
    expect(filtrarCarteira(lista, { filtro: "TODOS", termo: "", ordem: "PENDENCIAS" }).map((c) => c.id)).toEqual(["a", "b"]);
    expect(filtrarCarteira(lista, { filtro: "PENDENCIA", termo: "", ordem: "NOME" }).map((c) => c.id)).toEqual(["a"]);
  });
  it("encerrados ficam fora de Todos e dos outros números, com ordem própria (F0.14)", () => {
    const datas = (fimEm: string, situacao: "CONSULTA" | "FECHADO", acessoFechaEm: string, guardaAte: string) => ({
      fimEm, situacao, consultaAte: fimEm, acessoFechaEm, acessoFechadoEm: null, entradasAte: guardaAte, guardaAte });
    const lista = [
      cliente({ id: "a", nome: "Jatobá", situacoes: ["SEM_SOCIO"] }),
      cliente({ id: "c", nome: "Cedro", estagio: "ENCERRADO", situacoes: ["SEM_CONTRATO"], encerramento: datas("2026-11-19", "CONSULTA", "2026-12-19", "2031-11-19") }),
      cliente({ id: "m", nome: "Mangaba", estagio: "ENCERRADO", encerramento: datas("2026-08-02", "FECHADO", "2026-09-01", "2031-08-02") }),
    ];
    expect(contarCarteira(lista)).toEqual({ TODOS: 1, IMPLANTACAO: 1, ATIVO: 0, PENDENCIA: 1, ENCERRADOS: 2 });
    expect(pendencias(lista[1]!)).toEqual([]);
    expect(filtrarCarteira(lista, { filtro: "TODOS", termo: "", ordem: "NOME" }).map((c) => c.id)).toEqual(["a"]);
    expect(filtrarCarteira(lista, { filtro: "ENCERRADOS", termo: "", ordem: "FIM" }).map((c) => c.id)).toEqual(["c", "m"]);
    expect(filtrarCarteira(lista, { filtro: "ENCERRADOS", termo: "", ordem: "PROXIMO" }).map((c) => c.id)).toEqual(["c", "m"]);
    expect(tarefasDaCarteira(lista, AGORA).map((t) => t.clienteId)).toEqual(["a"]);
  });
});

describe("F3.175: datas do Console no dia de Brasília", () => {
  it("o dataBr da cobrança: instante às 22h30 de Brasília e data pura", () => {
    expect(dataBrCobranca("2026-11-25T01:30:00+00:00")).toBe("24/11/2026");
    expect(dataBrCobranca("2026-11-24")).toBe("24/11/2026");
  });
  it("o dataBr do fim do contrato (Carteira: acesso fechado às 22h30)", () => {
    expect(dataBrFim("2026-11-25T01:30:00+00:00")).toBe("24/11/2026");
    expect(dataBrFim("2026-11-25T01:30:00+00:00", true)).toBe("24/11");
    expect(dataBrFim("2026-12-19")).toBe("19/12/2026");
  });
});
