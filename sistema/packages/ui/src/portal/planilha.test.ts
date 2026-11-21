import { describe, expect, it } from "vitest";
import { alertaDeQueda, quemEspera, receitaPorGrupo, type DadosExportacao } from "@t3jus/domain";
import { abasContador, arquivoContador, crc32, csvContador, nomeMesAno, zipar } from "./planilha.ts";

const dados: DadosExportacao = {
  id: "x", mes: "2026-10-01", formato: "XLSX", escritorio: "Ribeiro & Matos",
  recebimentos: [
    { dia: "2026-10-26", cliente: "Farmácia Bom Jesus", contrato: "C-2026-001", parcela: "Mensalidade 2/6", tipo: "MENSAL", referencia: "2026-10",
      forma: "BOLETO", valor: 180000, multaJuros: 1700, recibo: "3/2026" },
    { dia: "2026-10-27", cliente: "Benedito", contrato: null, parcela: "Honorários de êxito · 30%", tipo: "EXITO", referencia: "2026-10",
      forma: "TRANSFERENCIA", valor: 30000, multaJuros: 0, recibo: null },
  ],
  despesas: [{ dia: "2026-10-05", vencimento: "2026-10-05", descricao: "Aluguel; sala 2", fornecedor: null, categoria: "ALUGUEL", forma: "PIX",
    valor: 150000, recorrente: true, cliente: null }],
  terceiros: [
    { entrouEm: "2026-10-16", tipo: "ALVARA", cliente: "Benedito", caso: "Lima x INSS", levantado: 100000, para: "CLIENTE", nome: "Benedito",
      valor: 70000, feitoEm: null, situacao: "PENDENTE" },
    { entrouEm: "2026-10-16", tipo: "ALVARA", cliente: "Benedito", caso: "Lima x INSS", levantado: 100000, para: "HONORARIOS", nome: "Honorários",
      valor: 30000, feitoEm: "2026-10-27", situacao: "FEITO" },
  ],
};

describe("Arquivo do contador (FI-21)", () => {
  it("o CRC-32 é o do padrão", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("o .zip abre com os arquivos e o diretório central no fim", () => {
    const z = zipar([{ nome: "a.txt", dados: new TextEncoder().encode("oi") }, { nome: "pasta/b.xml", dados: new Uint8Array([1, 2, 3]) }]);
    const v = new DataView(z.buffer);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    const fim = z.length - 22;
    expect(v.getUint32(fim, true)).toBe(0x06054b50);
    expect(v.getUint16(fim + 10, true)).toBe(2);
    expect(v.getUint32(v.getUint32(fim + 16, true), true)).toBe(0x02014b50);
  });

  it("terceiros vão numa aba à parte, sem os honorários (que já são receita)", () => {
    const abas = abasContador(dados);
    expect(abas.map((a) => a.nome)).toEqual(["Resumo", "Recebimentos", "Despesas", "Terceiros"]);
    expect(abas[0]!.linhas[1]).toEqual(["Recebimentos do escritório", { reais: 211700 }]);
    expect(abas[0]!.linhas[3]).toEqual(["Resultado do mês", { reais: 61700 }]);
    expect(abas[3]!.linhas).toHaveLength(2);
    expect(abas[1]!.linhas[2]![4]).toBe("Êxito");
  });

  it("o .csv usa ponto e vírgula, vírgula decimal e aspas quando precisa", () => {
    const csv = csvContador(dados);
    expect(csv.startsWith("﻿Seção;Data;")).toBe(true);
    expect(csv).toContain("Recebimento;26/10/2026;Mensalidade 2/6 · contrato C-2026-001;Farmácia Bom Jesus;Mensal;Boleto;1817,00;Recibo 3/2026");
    expect(csv).toContain('Despesa;05/10/2026;"Aluguel; sala 2";;Aluguel e condomínio;Pix;1500,00;');
    expect(csv).toContain("Terceiros (não é receita);16/10/2026;Alvará · Lima x INSS;Benedito;Cliente;;700,00;Pendente");
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(5);
  });

  it("o nome do arquivo leva o escritório sem acento e o mês", () => {
    expect(arquivoContador(dados, "CSV").nome).toBe("contador-ribeiro-matos-2026-10.csv");
    expect(arquivoContador(dados, "XLSX").nome).toBe("contador-ribeiro-matos-2026-10.xlsx");
    expect(nomeMesAno("2026-03-01")).toBe("março de 2026");
  });
});

describe("Resumo (IN-09, IN-10, FI-06)", () => {
  it("agrupa os tipos de honorário e aponta a queda", () => {
    const g = receitaPorGrupo([
      { tipo: "PARCELADO", valor: 500000, anteriores: 900000, restante: 0 },
      { tipo: "FIXO", valor: 100000, anteriores: 0, restante: 0 },
      { tipo: "ATO", valor: 0, anteriores: 0, restante: 0 },
    ]);
    expect(g).toEqual([{ grupo: "CONTRATUAL", nome: "Contratual", valor: 600000, anteriores: 900000, restante: 0 }]);
    expect(alertaDeQueda(g)).toBeNull();
    expect(alertaDeQueda([{ ...g[0]!, valor: 100000 }])).toEqual({ grupo: "CONTRATUAL", nome: "Contratual", valor: 100000, media: 300000, pct: 67 });
  });

  it("diz quem espera o dinheiro de terceiros", () => {
    expect(quemEspera({ saldo: 1, honorarios: 0, clientes: 2, peritos: 1, parceiros: 1, outros: 0 })).toBe("2 clientes, 1 perito e 1 parceiro");
    expect(quemEspera({ saldo: 1, honorarios: 1, clientes: 1, peritos: 0, parceiros: 0, outros: 0 })).toBe("1 cliente");
    expect(quemEspera({ saldo: 1, honorarios: 1, clientes: 0, peritos: 0, parceiros: 0, outros: 0 })).toBe("");
  });
});

describe("Despesas sem nota na exportação (FI-18, FI-21)", () => {
  const semNota = [{ dia: "2026-10-05", descricao: "Aluguel; sala 2", valor: 150000 }];
  it("a aba Despesas ganha a coluna Nota ou guia e marca a falta", () => {
    const desp = abasContador(dados, semNota).find((a) => a.nome === "Despesas")!;
    expect(desp.linhas[0]).toContain("Nota ou guia");
    expect(desp.linhas[1]?.at(-1)).toBe("Falta a nota");
    expect(abasContador(dados, []).find((a) => a.nome === "Despesas")!.linhas[1]?.at(-1)).toBe("Anexada");
  });
  it("o .csv diz a falta na situação", () => {
    expect(csvContador(dados, semNota)).toContain("1500,00;Falta a nota");
  });
  it("sem a lista, a planilha fica como antes", () => {
    expect(abasContador(dados).find((a) => a.nome === "Despesas")!.linhas[0]).not.toContain("Nota ou guia");
  });
});
