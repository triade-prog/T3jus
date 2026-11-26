import { describe, expect, it } from "vitest";
import type { ArquivosParaApagar, ArquivosQueFicam, FichaCliente, HistoricoQueFica } from "@t3jus/domain";
import { despesasDoExcluido, linhaArquivosParaApagar, linhaHistorico, PE_GUARDA, SEM_DATA } from "./exclusao.ts";

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

// F3.156: os textos do desenho aprovado (docs/design/aprovadas/portal-exclusao-despesas, _fonte/f156.py,
// alternativa A), com os estados aprovados.
const q = (despesas: number, comArquivo: number, arquivos: number, pastas: number, ate: string | null): ArquivosQueFicam =>
  ({ despesas, comArquivo, arquivos, pastas, ate });
const DESC_UM = "vira “Despesa adiantada a cliente excluído”. O valor, as datas e o reembolso continuam no Financeiro.";
const DESC_VARIAS = "viram “Despesa adiantada a cliente excluído”. O valor, as datas e o reembolso continuam no Financeiro.";

describe("despesasDoExcluido (F3.156)", () => {
  it("sem despesa ou sem o campo (quem não é a dona): nada muda (o estado despesa-nenhuma)", () => {
    const nada = { descricao: null, guarda: null, faixa: null };
    expect(despesasDoExcluido(q(0, 0, 0, 0, null))).toEqual(nada);
    expect(despesasDoExcluido(undefined)).toEqual(nada);
    expect(despesasDoExcluido(null)).toEqual(nada);
  });

  it("uma despesa paga com a nota: a descrição, o quadro com a data e a faixa no singular (o estado despesa-paga-nota)", () => {
    expect(despesasDoExcluido(q(1, 1, 1, 0, "2033-01-01"))).toEqual({
      descricao: { texto: "A descrição da despesa adiantada", explicacao: DESC_UM },
      guarda: {
        arquivos: { texto: "O arquivo da despesa adiantada",
          explicacao: "a nota, guia, boleto ou comprovante, com o nome trocado pelo tipo, como “Nota fiscal.pdf”. O T3jus apaga sozinho em 01/01/2033." },
        pasta: null,
        historico: null,
      },
      faixa: "Fora esse arquivo, nada aqui precisa ser guardado por lei.",
    });
  });

  it("duas despesas, uma em aberto: sem data, com a regra, no plural (o estado despesa-em-aberto)", () => {
    expect(despesasDoExcluido(q(2, 2, 2, 0, null))).toEqual({
      descricao: { texto: "A descrição das 2 despesas adiantadas", explicacao: DESC_VARIAS },
      guarda: {
        arquivos: { texto: "Os 2 arquivos das 2 despesas adiantadas",
          explicacao: `notas, guias, boletos ou comprovantes, com o nome trocado pelo tipo, como “Nota fiscal.pdf”. ${SEM_DATA}` },
        pasta: null,
        historico: null,
      },
      faixa: "Fora esses arquivos, nada aqui precisa ser guardado por lei.",
    });
    expect(SEM_DATA).toBe("Enquanto houver despesa em aberto, não há data: o T3jus apaga sozinho em 1º de janeiro do 7º ano depois do pagamento.");
  });

  it("dois arquivos de uma despesa e a pasta do contador (o estado despesa-pasta-contador)", () => {
    const d = despesasDoExcluido(q(1, 1, 2, 1, "2033-01-01"));
    expect(d.guarda!.arquivos!.texto).toBe("Os 2 arquivos da despesa adiantada");
    expect(d.guarda!.pasta).toEqual({ texto: "A pasta mandada ao contador",
      explicacao: "fica como foi montada, com a descrição antiga no nome dos arquivos. A cópia do T3jus sai pela regra do mês da pasta; a que o contador recebeu fica fora do T3jus." });
    expect(d.faixa).toBe("Fora esses arquivos, nada aqui precisa ser guardado por lei.");
  });

  it("um arquivo só, mas numa pasta: a faixa vai para o plural", () => {
    expect(despesasDoExcluido(q(1, 1, 1, 1, "2033-01-01")).faixa).toBe("Fora esses arquivos, nada aqui precisa ser guardado por lei.");
  });

  it("várias pastas, no plural", () => {
    expect(despesasDoExcluido(q(3, 2, 4, 2, "2034-01-01")).guarda!.pasta).toEqual({ texto: "As 2 pastas mandadas ao contador",
      explicacao: "ficam como foram montadas, com a descrição antiga no nome dos arquivos. As cópias do T3jus saem pela regra do mês de cada pasta; as que o contador recebeu ficam fora do T3jus." });
  });

  it("despesa sem arquivo: só a linha da descrição, sem quadro e com a faixa aprovada (o estado despesa-sem-arquivo)", () => {
    expect(despesasDoExcluido(q(1, 0, 0, 0, null))).toEqual({ descricao: { texto: "A descrição da despesa adiantada", explicacao: DESC_UM }, guarda: null, faixa: null });
  });

  it("o pé do quadro cita a obrigação fiscal", () => {
    expect(PE_GUARDA).toBe("Ficam pela obrigação fiscal do escritório, que vale mesmo com o pedido do titular (LGPD, art. 16, I).");
  });
});

// F3.177 (F3.184): os textos do desenho aprovado (docs/design/aprovadas/portal-exclusao-historico,
// _fonte/f177.py, alternativa A), com os estados aprovados.
const h = (lancamentos: number, detalhes: number, semData: number, origem: HistoricoQueFica["origem"], ate: string): HistoricoQueFica =>
  ({ lancamentos, detalhes, semData, origem, ate });
const comH = (base: ArquivosQueFicam, hist: HistoricoQueFica | null): ArquivosQueFicam => ({ ...base, historico: hist });
const FIM = "A data, o valor e se foi pago não mudam.";

describe("despesasDoExcluido com o histórico do sistema antigo (F3.177)", () => {
  it("sem lançamento do sistema antigo: a janela da F3.156, letra por letra (o estado historico-nenhum)", () => {
    for (const base of [q(0, 0, 0, 0, null), q(1, 1, 1, 0, "2033-01-01"), q(2, 2, 2, 0, null), q(1, 0, 0, 0, null)]) {
      expect(despesasDoExcluido(comH(base, null))).toEqual(despesasDoExcluido(base));
      expect(despesasDoExcluido(comH(base, h(0, 0, 0, "ASTREA", "2033-01-01")))).toEqual(despesasDoExcluido(base));
    }
    expect(despesasDoExcluido(q(0, 0, 0, 0, null))).toEqual({ descricao: null, guarda: null, faixa: null });
  });

  it("só o histórico, com um detalhe: o quadro aparece só com a linha dele (o estado historico-so)", () => {
    expect(despesasDoExcluido(comH(q(0, 0, 0, 0, null), h(12, 1, 0, "ASTREA", "2033-01-01")))).toEqual({
      descricao: null,
      guarda: {
        arquivos: null,
        pasta: null,
        historico: { texto: "A descrição dos 12 lançamentos do Astrea",
          explicacao: `fica como veio na importação, com o detalhe escrito ao dispensar o lembrete de contrato. O T3jus troca sozinho por um texto fixo em 01/01/2033. ${FIM}` },
      },
      faixa: "Fora essas descrições, nada aqui precisa ser guardado por lei.",
    });
  });

  it("o histórico e o arquivo da despesa: a linha no fim do quadro e a faixa com os dois (o estado historico-e-despesas)", () => {
    const d = despesasDoExcluido(comH(q(1, 1, 1, 0, "2033-01-01"), h(1, 0, 0, "ASTREA", "2031-01-01")));
    expect(d.descricao!.texto).toBe("A descrição da despesa adiantada");
    expect(d.guarda!.arquivos!.texto).toBe("O arquivo da despesa adiantada");
    expect(d.guarda!.historico).toEqual({ texto: "A descrição do lançamento do Astrea",
      explicacao: `fica como veio na importação. O T3jus troca sozinho por um texto fixo em 01/01/2031. ${FIM}` });
    expect(d.faixa).toBe("Fora esse arquivo e essa descrição, nada aqui precisa ser guardado por lei.");
  });

  it("despesas em aberto e quatro lançamentos com um detalhe (o estado historico-em-aberto)", () => {
    const d = despesasDoExcluido(comH(q(2, 2, 2, 0, null), h(4, 1, 0, "ASTREA", "2032-01-01")));
    expect(d.guarda!.arquivos!.explicacao).toContain(SEM_DATA);
    expect(d.guarda!.historico!.texto).toBe("A descrição dos 4 lançamentos do Astrea");
    expect(d.guarda!.historico!.explicacao).toBe(
      `fica como veio na importação, com o detalhe escrito ao dispensar o lembrete de contrato. O T3jus troca sozinho por um texto fixo em 01/01/2032. ${FIM}`);
    expect(d.faixa).toBe("Fora esses arquivos e essas descrições, nada aqui precisa ser guardado por lei.");
  });

  it("um lançamento sem data entre três (o estado historico-sem-data)", () => {
    expect(despesasDoExcluido(comH(q(0, 0, 0, 0, null), h(3, 0, 1, "ASTREA", "2033-01-01")))).toEqual({
      descricao: null,
      guarda: {
        arquivos: null,
        pasta: null,
        historico: { texto: "A descrição dos 3 lançamentos do Astrea",
          explicacao: `fica como veio na importação. Um deles veio sem data e conta pela data da importação. O T3jus troca sozinho por um texto fixo em 01/01/2033. ${FIM}` },
      },
      faixa: "Fora essas descrições, nada aqui precisa ser guardado por lei.",
    });
  });

  it("o sistema: Astrea, ADVBOX ou o sistema antigo (de mais de um)", () => {
    expect(linhaHistorico(h(1, 0, 0, "ADVBOX_PLANILHA", "2033-01-01"))!.texto).toBe("A descrição do lançamento do ADVBOX");
    expect(linhaHistorico(h(2, 0, 0, null, "2033-01-01"))!.texto).toBe("A descrição dos 2 lançamentos do sistema antigo");
  });

  it("sem data: ele, um deles ou vários", () => {
    expect(linhaHistorico(h(1, 0, 1, "ASTREA", "2033-01-01"))!.explicacao).toBe(
      `fica como veio na importação. Ele veio sem data e conta pela data da importação. O T3jus troca sozinho por um texto fixo em 01/01/2033. ${FIM}`);
    expect(linhaHistorico(h(5, 2, 3, "ASTREA", "2033-01-01"))!.explicacao).toBe(
      "fica como veio na importação, com os detalhes escritos ao dispensar os lembretes de contrato. 3 deles vieram sem data e contam pela data da importação. " +
      `O T3jus troca sozinho por um texto fixo em 01/01/2033. ${FIM}`);
  });

  it("um lançamento com detalhe: a faixa vai para o plural (essas descrições)", () => {
    expect(despesasDoExcluido(comH(q(0, 0, 0, 0, null), h(1, 1, 0, "ASTREA", "2033-01-01"))).faixa)
      .toBe("Fora essas descrições, nada aqui precisa ser guardado por lei.");
    expect(despesasDoExcluido(comH(q(1, 1, 1, 1, "2033-01-01"), h(1, 0, 0, "ASTREA", "2033-01-01"))).faixa)
      .toBe("Fora esses arquivos e essa descrição, nada aqui precisa ser guardado por lei.");
  });

  it("despesa sem arquivo e o histórico: a linha da descrição da despesa e o quadro só com o histórico", () => {
    const d = despesasDoExcluido(comH(q(1, 0, 0, 0, null), h(2, 0, 0, "ASTREA", "2033-01-01")));
    expect(d.descricao!.texto).toBe("A descrição da despesa adiantada");
    expect(d.guarda!.arquivos).toBeNull();
    expect(d.faixa).toBe("Fora essas descrições, nada aqui precisa ser guardado por lei.");
  });
});
