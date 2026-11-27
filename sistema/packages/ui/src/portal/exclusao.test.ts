import { describe, expect, it } from "vitest";
import type { ArquivosParaApagar, ArquivosQueFicam, FichaCliente, HistoricoQueFica } from "@t3jus/domain";
import type { AssinaPorOutro, ConversasParaApagar } from "@t3jus/domain";
import {
  avisoLembrete, despesasDoExcluido, dicaAssinaPorOutro, dicaConversasQueFicam, linhaArquivosParaApagar, linhaBaixas, linhaConversas, linhaHistorico,
  linhaPedidosContrato, linhaSobre, PE_GUARDA, SEM_DATA, type Pedaco,
} from "./exclusao.ts";

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

// F3.181, F3.186, F3.190, C9, F3.179 e F3.193: os textos do desenho aprovado
// (docs/design/aprovadas/portal-exclusao-contratos-conversas, NOTAS.md e _fonte/f181.py).
const conv = (o: Partial<ConversasParaApagar> = {}): ConversasParaApagar => ({ conversas: 0, naFila: 0, automacoes: 0, ficam: 0, ficamCom: [], ficamComMais: 0, ...o });
const texto = (p: Pedaco[] | null) => p?.map((x) => (x.negrito ? `**${x.texto}**` : x.texto)).join("") ?? null;
const FICAM_SO = " Ficam só as datas, quem da equipe atendeu e os momentos (passou, assumiu, devolveu).";

describe("linhaConversas (F3.190)", () => {
  it("uma conversa, sem fila nem automação", () => {
    expect(linhaConversas(conv({ conversas: 1 }))).toEqual({
      texto: "A conversa do WhatsApp",
      explicacao: `o número, os nomes de quem escreveu e todas as mensagens e arquivos saem, e ela some de Conversas.${FICAM_SO}`,
    });
  });
  it("várias, com a fila e as automações no plural", () => {
    expect(linhaConversas(conv({ conversas: 3, naFila: 2, automacoes: 2 }))).toEqual({
      texto: "As 3 conversas do WhatsApp",
      explicacao: `os números, os nomes de quem escreveu e todas as mensagens e arquivos saem, e elas somem de Conversas.${FICAM_SO} As 2 mensagens que ainda iam sair não saem mais. As 2 automações em andamento param.`,
    });
  });
  it("uma mensagem na fila e uma automação, no singular", () => {
    expect(linhaConversas(conv({ conversas: 2, naFila: 1, automacoes: 1 }))?.explicacao).toMatch(/ A mensagem que ainda ia sair não sai mais\. A automação em andamento para\.$/);
  });
  it("sem conversa que sai, ou sem o campo, não há linha", () => {
    expect(linhaConversas(conv({ ficam: 1 }))).toBeNull();
    expect(linhaConversas(undefined)).toBeNull();
  });
});

describe("dicaConversasQueFicam (C6)", () => {
  it("uma conversa com um outro cliente", () => {
    expect(texto(dicaConversasQueFicam(conv({ ficam: 1, ficamCom: [{ id: "r", nome: "Rosa Alves Coelho" }] }), "Marina"))).toBe(
      "1 conversa fica como está, com as mensagens, porque guarda o registro de **Rosa Alves Coelho**, outro cliente. As mensagens de Marina nessa conversa também ficam.");
  });
  it("várias, com dois clientes", () => {
    expect(texto(dicaConversasQueFicam(conv({ ficam: 2, ficamCom: [{ id: "p", nome: "Pedro Lima" }, { id: "r", nome: "Rosa Alves Coelho" }] }), "Marina"))).toBe(
      "2 conversas ficam como estão, com as mensagens, porque guardam o registro de **Pedro Lima e Rosa Alves Coelho**, outros clientes. As mensagens de Marina nessas conversas também ficam.");
  });
  it("com mais de 3 clientes, termina em “e mais”", () => {
    const c = conv({ ficam: 4, ficamCom: [{ id: "a", nome: "Ana" }, { id: "b", nome: "Bia" }, { id: "c", nome: "Caio" }], ficamComMais: 1 });
    expect(texto(dicaConversasQueFicam(c, "Marina"))).toContain("**Ana, Bia, Caio e mais 1 cliente**, outros clientes.");
    expect(texto(dicaConversasQueFicam({ ...c, ficamComMais: 2 }, "Marina"))).toContain("e mais 2 clientes**");
  });
  it("sem conversa que fica, não há dica", () => {
    expect(dicaConversasQueFicam(conv({ conversas: 2 }), "Marina")).toBeNull();
  });
});

describe("dicaAssinaPorOutro (C9)", () => {
  const joao: AssinaPorOutro = { id: "j", nome: "João Coelho", tipo: "PF", papel: "como mãe e responsável legal", feminino: true };
  const pedro: AssinaPorOutro = { id: "p", nome: "Pedro Coelho", tipo: "PF", papel: "assinava até os 18", feminino: true };
  const padaria: AssinaPorOutro = { id: "e", nome: "Padaria Estrela Ltda", tipo: "PJ", papel: "pela empresa", feminino: null };
  it("um só, como no desenho", () => {
    expect(texto(dicaAssinaPorOutro([joao], "Marina"))).toBe(
      "Marina também assina por **João Coelho**, como mãe e responsável legal. O nome e o CPF dela continuam na ficha dele, porque servem ao contrato e à procuração dele.");
  });
  it("dois, com o papel entre parênteses", () => {
    expect(texto(dicaAssinaPorOutro([joao, pedro], "Marina"))).toBe(
      "Marina também assina por **João Coelho** (como mãe e responsável legal) e **Pedro Coelho** (assinava até os 18). O nome e o CPF dela continuam nessas fichas, porque servem aos contratos e às procurações delas.");
  });
  it("pela empresa: a ficha é dela, e sem gênero vai o nome", () => {
    expect(texto(dicaAssinaPorOutro([padaria], "Marina"))).toBe(
      "Marina também assina por **Padaria Estrela Ltda**, pela empresa. O nome e o CPF de Marina continuam na ficha dela, porque servem ao contrato e à procuração dela.");
  });
  it("o pai: dele", () => {
    expect(texto(dicaAssinaPorOutro([{ ...joao, papel: "como pai e responsável legal", feminino: false }], "Carlos"))).toContain("O nome e o CPF dele continuam na ficha dele");
  });
  it("sem ninguém, não há dica", () => {
    expect(dicaAssinaPorOutro([], "Marina")).toBeNull();
    expect(dicaAssinaPorOutro(undefined, "Marina")).toBeNull();
  });
});

describe("linhaSobre (F3.179) e linhaBaixas (F3.193)", () => {
  it("uma proposta e várias", () => {
    expect(linhaSobre(["P-2026-014"])?.texto).toBe("Sobre o que se cobra o êxito, na proposta P-2026-014");
    expect(linhaSobre(["P-2026-014", "P-2026-019"])).toEqual({
      texto: "Sobre o que se cobra o êxito, nas propostas P-2026-014 e P-2026-019",
      explicacao: "o texto livre, como “dos atrasados que a cliente receber”, vira “Base apagada a pedido do titular”. O percentual e as outras condições ficam como estão.",
    });
    expect(linhaSobre([])).toBeNull();
  });
  it("uma baixa e várias", () => {
    expect(linhaBaixas(1)).toEqual({ texto: "A explicação da baixa sem receber",
      explicacao: "vira “Explicação apagada a pedido do titular”. A parcela, o valor e a data da baixa continuam no Financeiro." });
    expect(linhaBaixas(2)?.texto).toBe("As explicações das 2 baixas sem receber");
    expect(linhaBaixas(2)?.explicacao).toMatch(/^viram /);
    expect(linhaBaixas(0)).toBeNull();
    expect(linhaBaixas(undefined)).toBeNull();
  });
});

describe("linhaPedidosContrato (F3.181)", () => {
  it("na janela de excluir, em “O que fica”", () => {
    expect(linhaPedidosContrato(["P-2026-014"], "fica")).toEqual({
      texto: "A proposta P-2026-014, sem o pedido de contrato",
      explicacao: "fica no Comercial como registro, com “Cliente excluído” e “Serviço apagado a pedido do titular”. O pedido sai de Contratos, porque cliente excluído não ganha contrato.",
    });
    expect(linhaPedidosContrato(["P-2026-014", "P-2026-019"], "fica")).toEqual({
      texto: "As propostas P-2026-014 e P-2026-019, sem os pedidos de contrato",
      explicacao: "ficam no Comercial como registro, com “Cliente excluído” e “Serviço apagado a pedido do titular”. Os pedidos saem de Contratos, porque cliente excluído não ganha contrato.",
    });
  });
  it("na janela de arquivar, em “O que acontece” (C2)", () => {
    expect(linhaPedidosContrato(["P-2026-014"], "arquivar")).toEqual({
      texto: "O pedido de contrato da proposta P-2026-014 sai de Contratos",
      explicacao: "a proposta fica no Comercial, aceita, como registro. Cliente arquivado não ganha contrato novo, e ninguém consegue pedir de novo.",
    });
    expect(linhaPedidosContrato(["P-2026-014", "P-2026-019"], "arquivar")?.texto).toBe("Os 2 pedidos de contrato (P-2026-014 e P-2026-019) saem de Contratos");
  });
  it("sem pedido, não há linha", () => {
    expect(linhaPedidosContrato([], "fica")).toBeNull();
    expect(linhaPedidosContrato(undefined, "arquivar")).toBeNull();
  });
});

describe("avisoLembrete (F3.186, C10 a)", () => {
  const FIM = "Depois da exclusão, não dá mais para saber de quem é esse valor, e o lembrete sai de Contratos › Lembretes. Se o escritório vai cobrar, crie o contrato antes: aí o pedido se atende arquivando, sem apagar.";
  it("um lembrete do Astrea, como no desenho", () => {
    expect(avisoLembrete({ n: 1, valor: 184000, lancamentos: 3, origem: "ASTREA" }, "Marina")).toEqual({
      titulo: "Há R$ 1.840,00 em aberto no Astrea.",
      texto: `É o lembrete de contrato de Marina, com 3 lançamentos. ${FIM}`,
    });
  });
  it("dois lembretes, sem a primeira frase; sistemas diferentes leem “no sistema antigo”", () => {
    expect(avisoLembrete({ n: 2, valor: 230000, lancamentos: 5, origem: null }, "Marina")).toEqual({
      titulo: "Há R$ 2.300,00 em aberto no sistema antigo, em 2 lembretes de contrato.", texto: FIM,
    });
  });
  it("sem valor", () => {
    expect(avisoLembrete({ n: 1, valor: 0, lancamentos: 1, origem: "ASTREA" }, "Marina")).toEqual({
      titulo: "Há um lembrete de contrato do Astrea, sem valor.", texto: `É o lembrete de contrato de Marina, com 1 lançamento. ${FIM}`,
    });
  });
  it("sem lembrete, não há aviso", () => {
    expect(avisoLembrete(null, "Marina")).toBeNull();
  });
});
