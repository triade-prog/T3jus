import { describe, expect, it } from "vitest";
import {
  brCodePix, chavePixParaLer, crc16Pix, documentoParcial, gerarCarneSchema, normalizarChavePix, pixDaParcela, salvarRecebimentoSchema,
  textoPix, txidParcela,
} from "./pix.ts";

/** Lê os campos de um BR Code (id, tamanho, valor), para conferir o que foi montado. */
function campos(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;
  while (i < s.length) {
    const id = s.slice(i, i + 2);
    const n = Number(s.slice(i + 2, i + 4));
    out[id] = s.slice(i + 4, i + 4 + n);
    i += 4 + n;
  }
  return out;
}

describe("FI-23: Pix copia e cola do carnê (BR Code estático)", () => {
  it("FI-23: o CRC16 confere com o exemplo do manual do Banco Central", () => {
    const corpo = "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304";
    expect(crc16Pix(corpo)).toBe("1D3D");
  });

  it("FI-23: monta chave, valor, recebedor, cidade, identificador e informação da parcela", () => {
    const s = brCodePix({ chave: "11222333000181", recebedor: "Ribeiro & Matos Soc. Adv.", cidade: "São Paulo", valor: 85000, txid: "C2026014P04", info: "Parcela 4/6 C-2026-014" });
    const c = campos(s);
    expect(c["00"]).toBe("01");
    expect(campos(c["26"]!)).toEqual({ "00": "br.gov.bcb.pix", "01": "11222333000181", "02": "PARCELA 4/6 C-2026-014" });
    expect(c["53"]).toBe("986");
    expect(c["54"]).toBe("850.00");
    expect(c["58"]).toBe("BR");
    expect(c["59"]).toBe("RIBEIRO & MATOS SOC. ADV.");
    expect(c["60"]).toBe("SAO PAULO");
    expect(campos(c["62"]!)).toEqual({ "05": "C2026014P04" });
    expect(s.slice(-4)).toBe(crc16Pix(s.slice(0, -4)));
  });

  it("FI-23: a parcela vencida sai sem valor, para o app do banco pedir", () => {
    const c = campos(brCodePix({ chave: "a@b.com.br", recebedor: "X", cidade: "Y", valor: null, txid: "C2026014P03" }));
    expect(c["54"]).toBeUndefined();
  });

  it("FI-23: corta o recebedor em 25 e a cidade em 15, sem acento", () => {
    const c = campos(brCodePix({ chave: "a@b.com.br", recebedor: "Advocacia Ribeiro Matos e Associados Ltda", cidade: "São José dos Campos", valor: 100 }));
    expect(c["59"]).toHaveLength(25);
    expect(c["60"]).toBe("SAO JOSE DOS CA");
    expect(campos(c["62"]!)["05"]).toBe("***");
  });

  it("FI-23: deixa a informação de fora quando ela não cabe com uma chave longa", () => {
    const chave = "nome.muito.comprido.do.escritorio.de.advocacia@dominio-longo-exemplo.com.br";
    const c = campos(brCodePix({ chave, recebedor: "X", cidade: "Y", valor: 100, info: "Parcela 12/12 C-2026-0001" }));
    expect(campos(c["26"]!)["02"]).toBeUndefined();
  });

  it("FI-23: recusa valor que não é centavo inteiro positivo", () => {
    expect(() => brCodePix({ chave: "a@b.com.br", recebedor: "X", cidade: "Y", valor: 0 })).toThrow();
    expect(() => brCodePix({ chave: "a@b.com.br", recebedor: "X", cidade: "Y", valor: 1.5 })).toThrow();
  });

  it("FI-23: o identificador junta o número do contrato e a ordem da parcela", () => {
    expect(txidParcela("C-2026-014", 4)).toBe("C2026014P04");
    expect(txidParcela("C-2026-1234", 12)).toBe("C20261234P12");
  });

  it("FI-23: monta o Pix da parcela a partir da cópia guardada no carnê", () => {
    const pix = { tipo: "CNPJ" as const, chave: "11222333000181", recebedor: "RIBEIRO E MATOS", cidade: "SAO PAULO" };
    const s = pixDaParcela(pix, { semValor: false, valor: 85000, txid: "C2026014P04", ordem: 4, total: 6 }, "C-2026-014")!;
    expect(campos(s)["54"]).toBe("850.00");
    expect(pixDaParcela(null, { semValor: false, valor: 1, txid: "X", ordem: 1, total: 1 }, "C-2026-001")).toBeNull();
  });
});

describe("FI-23: chave Pix do escritório", () => {
  it("FI-23: confere CNPJ e CPF pelo dígito", () => {
    expect(normalizarChavePix("CNPJ", "11.222.333/0001-81")).toBe("11222333000181");
    expect(normalizarChavePix("CNPJ", "11.222.333/0001-80")).toBeNull();
    expect(normalizarChavePix("CPF", "529.982.247-25")).toBe("52998224725");
    expect(normalizarChavePix("CPF", "529.982.247-24")).toBeNull();
  });

  it("FI-23: e-mail em minúsculas, celular com +55 e chave aleatória", () => {
    expect(normalizarChavePix("EMAIL", " Financeiro@Escritorio.com.br ")).toBe("financeiro@escritorio.com.br");
    expect(normalizarChavePix("EMAIL", "sem-arroba")).toBeNull();
    expect(normalizarChavePix("CELULAR", "(11) 97405-2210")).toBe("+5511974052210");
    expect(normalizarChavePix("CELULAR", "(11) 3405-2210")).toBeNull();
    expect(normalizarChavePix("ALEATORIA", "123E4567-E12B-12D1-A456-426655440000")).toBe("123e4567-e12b-12d1-a456-426655440000");
    expect(normalizarChavePix("ALEATORIA", "123")).toBeNull();
  });

  it("FI-23: mostra a chave com pontuação para ler", () => {
    expect(chavePixParaLer("CNPJ", "11222333000181")).toBe("11.222.333/0001-81");
    expect(chavePixParaLer("CELULAR", "+5511974052210")).toBe("(11) 97405-2210");
  });

  it("FI-23: o nome do recebedor fica sem acento e em maiúsculas", () => {
    expect(textoPix("Corrêa & Associação, Ltda.")).toBe("CORREA & ASSOCIACAO LTDA.");
  });

  it("FI-23: o CPF do cliente aparece só pela metade no carnê", () => {
    expect(documentoParcial("52998224725")).toBe("***.982.247-**");
    expect(documentoParcial(null)).toBeNull();
  });

  it("FI-23: os pedidos de salvar a chave e de gerar o carnê conferem a forma", () => {
    expect(salvarRecebimentoSchema.safeParse({ versao: 0, pixTipo: "PIX" }).success).toBe(false);
    expect(gerarCarneSchema.parse({ area: "FINANCEIRO", parcelas: ["123e4567-e12b-12d1-a456-426655440000"] })).toMatchObject({ formato: "TRES", capa: true });
    expect(gerarCarneSchema.safeParse({ area: "FINANCEIRO", parcelas: [] }).success).toBe(false);
  });
});
