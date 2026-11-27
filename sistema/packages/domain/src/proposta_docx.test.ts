import { describe, expect, it } from "vitest";
import type { FichaProposta } from "./comercial.ts";
import { linhasDoReciboAntigo, nomeArquivoProposta, paragrafosProposta } from "./proposta_docx.ts";

describe("AP-05: o timbrado e o nome do arquivo da proposta", () => {
  it("o timbrado do recibo antigo (linhasDoReciboAntigo) leva só o que existe e não mudou (PT-03)", () => {
    expect(linhasDoReciboAntigo({ nome: "Ribeiro & Matos", cnpj: "12345678000195", endereco: "Rua Augusta, 100", cidade: "São Paulo", uf: "SP",
      contatos: [{ telefone: "+5511996027736", email: "contato@rm.adv.br" }] }))
      .toEqual(["Ribeiro & Matos", "CNPJ 12.345.678/0001-95 · Rua Augusta, 100 · São Paulo/SP", "(11) 99602-7736 · contato@rm.adv.br"]);
    expect(linhasDoReciboAntigo({ nome: "Ribeiro & Matos", cnpj: null, endereco: null, cidade: null, uf: null })).toEqual(["Ribeiro & Matos"]);
  });
  it("o nome do arquivo sem acento", () => {
    expect(nomeArquivoProposta({ numero: "P-2026-014", cliente: { id: "x", nome: "Gabriela Teixeira Conceição", tipo: "PF" } }))
      .toBe("proposta-p-2026-014-gabriela-teixeira-conceicao.docx");
  });
});

describe("PT-11 F3.159: o Word da proposta do cliente excluído", () => {
  // A ficha como portal_proposta a devolve depois da exclusão (1090): o nome neutro, o serviço fixo e sem escopo.
  const ficha: FichaProposta = {
    id: "p1", numero: "P-2026-014", cliente: { id: "c1", nome: "Cliente excluído", tipo: "PF" },
    servico: "Serviço apagado a pedido do titular", responsavel: { id: "r1", nome: "Marina Ribeiro" }, situacao: "ACEITA",
    vencida: false, condicoes: [], retorno: null, criadaEm: "2026-11-20T10:00:00-03:00", escopo: null, validaAte: null,
    enviadaEm: null, respondidaEm: null, motivoRecusa: null, origem: null, versao: 5, retornoCompleto: null,
    podeContrato: true, quemTemContratos: [], contratoPedidoEm: null, clienteSituacao: "ATIVO", clienteSaiuEm: null, historico: [],
  };
  const escritorio = { nome: "Ribeiro & Matos", cnpj: null, endereco: null, cidade: "São Paulo", uf: "SP" };

  it("sai com o nome neutro e o texto fixo, sem o que estava incluído", () => {
    const textos = paragrafosProposta(ficha, escritorio, "2026-11-24").map((x) => x.texto);
    expect(textos).toContain("A Cliente excluído,");
    expect(textos).toContain("Serviço apagado a pedido do titular");
    expect(textos).not.toContain("O que está incluído");
    expect(textos.join("\n")).not.toMatch(/Helena|Divórcio/);
  });
  it("o nome do arquivo também não leva o nome do cliente", () => {
    expect(nomeArquivoProposta(ficha)).toBe("proposta-p-2026-014-cliente-excluido.docx");
  });
});
