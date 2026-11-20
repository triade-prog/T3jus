import { describe, expect, it } from "vitest";
import type { ContatoDoDia } from "@t3jus/domain";
import { diaDaSemana, discoData, hojeLongo, nomesDeHoje, peDoLimite, rotuloAtraso, saudacao, subtituloContatos } from "./inicio.ts";

const item = (nome: string): ContatoDoDia => ({
  clienteId: nome, tipo: "PF", nome, contatoPrincipal: null, em: "2026-11-18", oque: "Ligar", vencido: false, diasAtraso: 0,
  responsavel: { id: "d", nome: "Diego Almeida" },
});

describe("Início do Portal (F1.14)", () => {
  it("cumprimenta pela hora de Brasília", () => {
    expect(saudacao(new Date("2026-11-18T12:00:00Z"))).toBe("Bom dia");
    expect(saudacao(new Date("2026-11-18T18:00:00Z"))).toBe("Boa tarde");
    expect(saudacao(new Date("2026-11-19T00:30:00Z"))).toBe("Boa noite");
    expect(hojeLongo(new Date("2026-11-18T12:00:00Z"))).toBe("Quarta-feira, 18 de novembro");
  });

  it("diz o atraso e a data como no desenho", () => {
    expect(rotuloAtraso(1)).toBe("vencido ontem");
    expect(rotuloAtraso(8)).toBe("vencido há 8 dias");
    expect(discoData("2026-11-10")).toEqual({ dia: "10", mes: "nov" });
    expect(diaDaSemana("2026-11-20")).toBe("sexta, 20/11");
  });

  it("resume os contatos no subtítulo e no hero", () => {
    expect(subtituloContatos({ de: "MEUS", totalVencidos: 3, totalHoje: 2 })).toBe("Os seus: 3 vencidos e 2 para hoje");
    expect(subtituloContatos({ de: "MEUS", totalVencidos: 0, totalHoje: 1 })).toBe("Os seus: 1 para hoje");
    expect(subtituloContatos({ de: "MEUS", totalVencidos: 0, totalHoje: 0 })).toBe("Os seus: nada vencido, nada para hoje");
    expect(subtituloContatos({ de: "EQUIPE", totalVencidos: 4, totalHoje: 3 })).toBe("Da equipe: 4 vencidos e 3 para hoje, com o responsável de cada um");
    expect(nomesDeHoje([item("Rafael Moura"), item("Lúcia Barros")], 2)).toBe("Rafael e Lúcia");
    expect(nomesDeHoje([item("Rafael Moura"), item("Lúcia Barros")], 4)).toBe("Rafael, Lúcia e mais 2");
  });

  it("o pé diz quantos ficaram de fora e de que tipo", () => {
    const cinco = [1, 2, 3, 4, 5].map((n) => item(String(n)));
    expect(peDoLimite({ vencidos: cinco, hoje: [], totalVencidos: 7, totalHoje: 2 })).toBe("Mostrando 5 de 9. Os outros 4: 2 vencidos e 2 de hoje.");
    expect(peDoLimite({ vencidos: cinco.slice(0, 3), hoje: cinco.slice(0, 2), totalVencidos: 3, totalHoje: 2 })).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------
// Início por áreas (F3.26)
import { cartaoFinanceiro, cartaoJuridico, diaDoInicio, peDoBloco, relDia, subtituloBloco, textoItem } from "./inicio.ts";
import type { InicioFinanceiro, InicioJuridico, ItemInicio } from "@t3jus/domain";

const H = "2026-11-18"; // quarta
const MARINA = { id: "m", nome: "Marina Ribeiro" };

describe("Início por áreas: datas e itens (PD-01, PD-07)", () => {
  it("relDia diz hoje, amanhã, o dia da semana até 6 dias e o dia depois disso", () => {
    expect([relDia(H, H), relDia("2026-11-19", H), relDia("2026-11-17", H), relDia("2026-11-20", H), relDia("2026-11-30", H)])
      .toEqual(["Hoje", "Amanhã", "Ontem", "Sexta", "30/11"]);
  });
  it("PD-03: a parcela vencida diz a próxima ação, o motivo, o valor e há quantos dias", () => {
    const i: ItemInicio = {
      tipo: "PARCELA", id: "p", em: "2026-09-05", responsavel: MARINA, descricao: "entrada 2/5", valor: 120000, forma: "PIX",
      contrato: { id: "c", numero: "C-2026-001" }, cliente: { id: "k", nome: "Daniela Rocha Mendes" },
      cobranca: { motivo: "está desempregada", proxData: "2026-11-26", proxOque: "propor descontar do valor do acordo" },
    };
    const t = textoItem(i, H);
    expect(t.titulo).toBe("Daniela Rocha Mendes · entrada 2/5");
    expect(t.verbo).toBe("Cobrar");
    expect(t.oque).toBe("Próxima ação em 26/11: propor descontar do valor do acordo");
    expect(t.detalhe).toBe("Motivo: está desempregada");
    expect(t.selo).toEqual({ tom: "urgente", texto: "74 dias" });
    expect(t.href).toBe("/financeiro/a-receber/contratos/c");
  });
  it("PD-03: a parcela de amanhã se acompanha, com a forma", () => {
    const i: ItemInicio = {
      tipo: "PARCELA", id: "p", em: "2026-11-19", responsavel: MARINA, descricao: "parcela 2/4", valor: 145000, forma: "PIX",
      contrato: { id: "c", numero: "C-2026-001" }, cliente: { id: "k", nome: "Benedito" }, cobranca: null,
    };
    expect([textoItem(i, H).verbo, textoItem(i, H).oque, textoItem(i, H).selo?.texto]).toEqual(["Acompanhar", "Entra amanhã por Pix", "Amanhã"]);
  });
  it("EX-04: o prazo com fazer até hoje diz quando é o prazo final", () => {
    const i: ItemInicio = {
      tipo: "PRAZO", id: "z", em: H, responsavel: MARINA, descricao: "Recurso ordinário", fazerAte: H, dataFinal: "2026-11-19",
      caso: { id: "s", nome: "Pereira x Mercado", numero: "1001022-33.2026.5.02.0045", tribunal: "TRT-2" },
    };
    const t = textoItem(i, H);
    expect([t.oque, t.detalhe, t.selo?.texto]).toEqual(["Fazer até hoje: o prazo final é amanhã", "Prazo · 1001022-33.2026.5.02.0045 · TRT-2", "Amanhã"]);
  });
  it("PD-05: a tarefa esperando alguém diz quem e desde quando, sem selo", () => {
    const i: ItemInicio = {
      tipo: "TAREFA", id: "t", em: "2026-11-25", responsavel: MARINA, titulo: "Assinar e protocolar", esperando: "o cliente: procuração assinada",
      esperandoDesde: "2026-11-11", caso: { id: "s", nome: "Vale Alto" },
    };
    expect([textoItem(i, H).esperando, textoItem(i, H).selo]).toEqual(["Esperando o cliente: procuração assinada, desde 11/11", null]);
  });
  it("FI-06: o repasse do cliente atrasado diz até quando era", () => {
    const i: ItemInicio = {
      tipo: "REPASSE", id: "d", em: "2026-11-17", responsavel: MARINA, para: "CLIENTE", nome: "Gabriela Teixeira", valor: 490000,
      levantamento: { id: "l", tipo: "ACORDO", entrouEm: "2026-11-12" }, caso: { id: "s", nome: "Teixeira x Construtora" }, cliente: null,
    };
    const t = textoItem(i, H);
    expect([t.titulo, t.oque, t.detalhe, t.selo?.texto]).toEqual(["Gabriela Teixeira · cliente", "Repassar o acordo de Teixeira x Construtora", "Depósito do acordo, já na conta", "era 17/11"]);
  });
});

describe("Início por áreas: blocos, cartões e hero", () => {
  const g = (chave: "VENCIDOS" | "HOJE" | "ESPERANDO", total: number, n: number) => ({ chave, total, itens: Array.from({ length: n }, () => ({}) as ItemInicio) });
  it("o rodapé diz quantos faltam e de que tipo quando o limite corta", () => {
    expect(peDoBloco({ total: 9, mostrando: 5, grupos: [g("VENCIDOS", 1, 1), g("HOJE", 6, 4), g("ESPERANDO", 2, 0)] }))
      .toBe("Mostrando 5 de 9. Os outros 4: 2 para hoje e 2 esperando alguém.");
    expect(peDoBloco({ total: 3, mostrando: 3, grupos: [] })).toBeNull();
  });
  it("o subtítulo conta cada grupo", () => {
    expect(subtituloBloco("MEUS", { grupos: [g("VENCIDOS", 1, 1), g("HOJE", 3, 3)] }, { VENCIDOS: ["atrasado", "atrasados"] })).toBe("Os seus: 1 atrasado e 3 para hoje");
  });
  it("FI-06: o cartão do Financeiro nunca soma terceiros ao escritório", () => {
    const f = {
      de: "MEUS", pedem: 2,
      escritorio: { total: 1, mostrando: 1, grupos: [], vencidas: 1, valorVencido: 120000, escritorioVencidas: 4, proximo: null },
      terceiros: { total: 2, mostrando: 2, grupos: [], atrasados: 1, prazoMaisLonge: "2026-11-20" },
    } as InicioFinanceiro;
    const c = cartaoFinanceiro(f, H);
    expect([c.n, c.titulo, c.sub, c.segundo]).toEqual([1, "parcela vencida", "R$ 1.200,00 do escritório", "De terceiros: 1 repasse atrasado"]);
  });
  it("cartão em dia mostra o próximo", () => {
    const j = { de: "MEUS", total: 0, mostrando: 0, grupos: [], pedem: 0, atrasadas: 0, prazosHoje: 0, escritorioPrazosHoje: null, proximo: { em: "2026-11-20", texto: "x" } } as InicioJuridico;
    expect([cartaoJuridico(j, H).disco, cartaoJuridico(j, H).sub]).toEqual(["ar-ok", "próximo na sexta"]);
  });
  it("o hero soma as áreas e diz o próximo compromisso", () => {
    expect(diaDoInicio({ areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"], dono: true, pedem: {}, total: 8, compromissos: 4,
      proximoCompromisso: { tipo: "AUDIENCIA", tipoEscrito: null, inicio: "2026-11-18T14:00:00Z" } }))
      .toEqual([{ n: 8, titulo: "pedem você hoje", sub: "nas suas 4 áreas" }, { n: 4, titulo: "compromissos hoje", sub: "audiência às 11h" }]);
  });
});
