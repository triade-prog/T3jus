import { describe, expect, it } from "vitest";
import {
  chaveDeNome, comprimirJson, descomprimirJson, destinoDaAba, ligarPeloModelo, montarBackup, prepararAbas, sugerirTipoContato,
} from "./modelos_sistemas.ts";

describe("modelos dos outros sistemas (F3.56)", () => {
  it("decisão 7: reconhece as abas do backup do Astrea pelo nome, com ou sem acento", () => {
    expect(["Contatos", "PROCESSOS", "Lançamentos", "Tarefas", "Agenda", "Publicações", "Honorários"].map((n) => destinoDaAba("ASTREA", n)))
      .toEqual(["CLIENTES", "CASOS", "FINANCEIRO", "TAREFAS", "AGENDA", "PUBLICACOES", null]);
    expect(chaveDeNome("  E-mail ")).toBe("e mail");
  });

  it("decisão 8: liga as colunas pelo modelo, sem repetir campo; observações e etiquetas ficam de fora", () => {
    expect(ligarPeloModelo("ASTREA", "CLIENTES", ["Nome", "Tipo", "CPF/CNPJ", "E-mail", "Celular", "Telefone", "Observações", "Etiquetas", "UF"]))
      .toEqual({ 0: "nome", 1: "tipo_contato", 2: "documento", 3: "email", 4: "telefone", 8: "uf" });
    expect(ligarPeloModelo("ADVBOX_PLANILHA", "CLIENTES", ["Nome do cliente", "CPF", "Origem", "Tipo"]))
      .toEqual({ 0: "nome", 1: "documento", 2: "origem" });
  });

  it("decisão 9: o tipo de contato separa cliente, parte contrária e terceiros", () => {
    expect(["Cliente", "clientes", "Parte contrária", "Réu", "Adverso", "Testemunha", "Perito", "Correspondente"].map(sugerirTipoContato))
      .toEqual(["CLIENTE", "CLIENTE", "PARTE_CONTRARIA", "PARTE_CONTRARIA", "PARTE_CONTRARIA", "FORA", "FORA", "FORA"]);
  });

  it("decisão 7: no navegador, as abas de fora vão só com o nome e o tamanho", () => {
    const b = montarBackup([
      { nome: "Contatos", colunas: ["Nome"], linhas: [["Ana"], ["Bia"]] },
      { nome: "Processos", colunas: ["Número"], linhas: [["1"]] },
      { nome: "Publicações", colunas: ["Texto"], linhas: [["x"], ["y"], ["z"]] },
      { nome: "Planilha1", colunas: ["Cliente"], linhas: [["Caio"]] },
    ]);
    expect(b.abas.map((a) => [a.nome, a.linhas, a.celulas !== null])).toEqual([
      ["Contatos", 2, true], ["Processos", 1, false], ["Publicações", 3, false], ["Planilha1", 1, true],
    ]);
    const p = prepararAbas("ASTREA", b.abas);
    expect(p.map((a) => [a.destino, a.reconhecida, a.lida])).toEqual([
      ["CLIENTES", true, true], ["CASOS", true, false], ["PUBLICACOES", true, false], ["FORA", false, true],
    ]);
  });

  it("o JSON vai comprimido e volta igual; acima do limite, ou sem gzip, volta nulo", async () => {
    const v = { abas: [{ nome: "Contatos", linhas: 1, colunas: ["Nome"], celulas: [["Ana Lúcia"]] }] };
    const z = await comprimirJson(v);
    expect(await descomprimirJson(z, 1000)).toEqual(v);
    expect(await descomprimirJson(z, 10)).toBeNull();
    expect(await descomprimirJson(new TextEncoder().encode("{}"), 1000)).toBeNull();
  });
});
