import { describe, expect, it } from "vitest";
import type { ArquivosParaApagar, FichaCliente } from "@t3jus/domain";
import { linhaArquivosParaApagar } from "./exclusao.ts";

// F3.155: os textos do desenho aprovado (docs/design/aprovadas/portal-exclusao-arquivos, _fonte/f155.py).
const UM = "o arquivo é apagado do T3jus. Fica só que existiu: tipo, tamanho e datas, sem o nome do arquivo.";
const VARIOS = "os arquivos são apagados do T3jus. Fica só que existiram: tipo, tamanho e datas, sem o nome dos arquivos.";
const a = (documentos: number, curatela: boolean, tutela: boolean, propostas: number): ArquivosParaApagar => ({ documentos, curatela, tutela, propostas });

describe("linhaArquivosParaApagar (F3.155)", () => {
  it("documentos, termo de curatela e uma proposta, no plural (o estado excluir-arquivos)", () => {
    expect(linhaArquivosParaApagar(a(3, true, false, 1))).toEqual({
      texto: "Os 3 documentos pessoais, o termo de curatela e o arquivo Word da proposta",
      explicacao: VARIOS,
    });
  });

  it("um documento só, no singular (o estado excluir-um-documento)", () => {
    expect(linhaArquivosParaApagar(a(1, false, false, 0))).toEqual({ texto: "O documento pessoal", explicacao: UM });
  });

  it("a empresa com 2 propostas e sem documentos (o estado excluir-pj-propostas)", () => {
    expect(linhaArquivosParaApagar(a(0, false, false, 2))).toEqual({ texto: "Os arquivos Word das 2 propostas", explicacao: VARIOS });
  });

  it("o menor com tutora: documentos e o termo de tutela", () => {
    expect(linhaArquivosParaApagar(a(2, false, true, 0))).toEqual({ texto: "Os 2 documentos pessoais e o termo de tutela", explicacao: VARIOS });
  });

  it("sem arquivo ou sem o campo (quem não é a dona), não há linha", () => {
    expect(linhaArquivosParaApagar(a(0, false, false, 0))).toBeNull();
    expect(linhaArquivosParaApagar(undefined)).toBeNull();
    expect(linhaArquivosParaApagar(null)).toBeNull();
  });

  it("só um termo ou só uma proposta: singular", () => {
    expect(linhaArquivosParaApagar(a(0, true, false, 0))).toEqual({ texto: "O termo de curatela", explicacao: UM });
    expect(linhaArquivosParaApagar(a(0, false, false, 1))).toEqual({ texto: "O arquivo Word da proposta", explicacao: UM });
  });

  it("os dois termos juntos contam 2", () => {
    expect(linhaArquivosParaApagar(a(0, true, true, 0))).toEqual({ texto: "Os termos de curatela e de tutela", explicacao: VARIOS });
    expect(linhaArquivosParaApagar(a(1, true, true, 1))).toEqual({
      texto: "O documento pessoal, os termos de curatela e de tutela e o arquivo Word da proposta",
      explicacao: VARIOS,
    });
  });

  it("o campo é opcional na ficha", () => {
    const semCampo: FichaCliente["arquivosParaApagar"] = undefined;
    expect(linhaArquivosParaApagar(semCampo)).toBeNull();
  });
});
