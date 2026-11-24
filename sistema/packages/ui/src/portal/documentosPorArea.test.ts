// As regras da folha "Documentos por área" (CH-14, F3.170), sem React.
import { describe, expect, it } from "vitest";
import type { LinhaDocumentosPorArea, ModeloDaArea } from "@t3jus/domain";
import {
  areasComOModelo, avisoArquivar, avisoSalvo, botaoSalvar, cabecalhoDaArea, conflitoDaArea, ehSugestao, generoDoNome, legendaDaArea, origemDoModelo,
  quemMudou, textoDaLista, tituloArquivar,
} from "./documentosPorArea.ts";

const R = "OUTRO:11111111-1111-4111-8111-111111111111";
const I = "OUTRO:22222222-2222-4222-8222-222222222222";
const MODELOS: ModeloDaArea[] = [
  { chave: "CONTRATO", tipo: "CONTRATO", nome: "Contrato de honorários", doEscritorio: true, numero: 2, enviadoEm: "2026-10-01T12:00:00Z" },
  { chave: "PROCURACAO", tipo: "PROCURACAO", nome: "Procuração", doEscritorio: false, numero: null, enviadoEm: null },
  { chave: "HIPOSSUFICIENCIA", tipo: "HIPOSSUFICIENCIA", nome: "Declaração de hipossuficiência", doEscritorio: false, numero: null, enviadoEm: null },
  { chave: R, tipo: "OUTRO", nome: "Declaração de residência", doEscritorio: true, numero: 1, enviadoEm: "2026-11-10T12:00:00Z" },
  { chave: I, tipo: "OUTRO", nome: "Requerimento ao INSS", doEscritorio: true, numero: 1, enviadoEm: "2026-11-24T18:05:00Z" },
];
const HOJE = "2026-11-24";
const linha = (extra: Partial<LinhaDocumentosPorArea> = {}): LinhaDocumentosPorArea => ({
  area: "PREVIDENCIARIO", documentos: ["CONTRATO", "PROCURACAO", "HIPOSSUFICIENCIA", R], sugestao: ["CONTRATO", "PROCURACAO", "HIPOSSUFICIENCIA"], igualSugestao: false,
  salva: true, versao: 2, atualizadoPor: { id: "m", nome: "Marina Ribeiro" }, atualizadoEm: "2026-11-10T13:00:00Z", ...extra,
});

describe("CH-14: a folha Documentos por área", () => {
  it("a linha de cada área: a lista, quem mudou e o vazio", () => {
    expect(textoDaLista(linha().documentos, MODELOS)).toBe("Contrato de honorários, procuração, declaração de hipossuficiência e declaração de residência");
    expect(textoDaLista([], MODELOS)).toBe("");
    expect(quemMudou(linha(), HOJE)).toBe("Mudada por Marina Ribeiro em 10/11/2026");
    expect(quemMudou(linha({ atualizadoEm: "2026-11-24T18:20:00Z" }), HOJE)).toBe("Mudada por Marina Ribeiro hoje, às 15h20");
    expect(quemMudou(linha({ salva: false }), HOJE)).toBe("O escritório ainda não mudou.");
    expect(cabecalhoDaArea(linha(), HOJE)).toBe("Mudada por Marina Ribeiro em 10/11/2026 · a sugestão do T3jus é contrato de honorários, procuração e declaração de hipossuficiência");
  });

  it("a área aberta: legenda, de onde é cada modelo e o botão de salvar", () => {
    expect(legendaDaArea("PREVIDENCIARIO")).toBe("O que vem marcado em Gerar documentos, nos contratos de previdenciário");
    expect(legendaDaArea("OUTRA")).toBe("O que vem marcado em Gerar documentos, nos contratos sem área");
    expect(MODELOS.map((m) => origemDoModelo(m, HOJE))).toEqual([
      "Do escritório, v2", "Padrão do T3jus", "Padrão do T3jus · para empresa, sai a versão de pessoa jurídica", "Outro documento do escritório",
      "Outro documento do escritório · enviado hoje",
    ]);
    expect(botaoSalvar("PREVIDENCIARIO")).toBe("Salvar Previdenciário");
    expect(ehSugestao(["HIPOSSUFICIENCIA", "CONTRATO", "PROCURACAO"])).toBe(true);
    expect(ehSugestao(["CONTRATO", "PROCURACAO"])).toBe(false);
  });

  it("o aviso de salvo diz o que vem marcado da próxima vez", () => {
    expect(avisoSalvo("PREVIDENCIARIO", [I, "CONTRATO", "PROCURACAO", "HIPOSSUFICIENCIA", R], MODELOS)).toEqual({
      titulo: "Previdenciário salvo.",
      texto: "Da próxima vez que alguém abrir Gerar documentos num contrato de previdenciário, vêm marcados o contrato de honorários, a procuração, a declaração de hipossuficiência, a declaração de residência e o requerimento ao INSS.",
    });
    expect(avisoSalvo("OUTRA", [], MODELOS).texto).toBe("Da próxima vez que alguém abrir Gerar documentos num contrato sem área, nada vem marcado; quem gera escolhe.");
  });

  it("o conflito: quem mudou, o que tirou e a comparação só do que ficou diferente", () => {
    const salvo = linha({ documentos: ["CONTRATO", "PROCURACAO", "HIPOSSUFICIENCIA"], versao: 3, atualizadoPor: { id: "d", nome: "Diego Almeida" }, atualizadoEm: "2026-11-24T18:18:00Z" });
    const c = conflitoDaArea("PREVIDENCIARIO", linha().documentos, salvo, [...linha().documentos, I], MODELOS);
    expect(c.titulo).toBe("Diego Almeida mudou Previdenciário às 15h18, enquanto você editava.");
    expect(c.texto).toBe("Nada do que você marcou se perdeu. Diego tirou a declaração de residência. Compare e escolha qual versão fica.");
    expect(c.linhas).toEqual([
      { chave: R, documento: "Declaração de residência", salvo: "desmarcada", meu: "marcada" },
      { chave: I, documento: "Requerimento ao INSS", salvo: "desmarcado", meu: "marcado" },
    ]);
    const igual = conflitoDaArea("PREVIDENCIARIO", linha().documentos, salvo, salvo.documentos, MODELOS);
    expect(igual.linhas).toEqual([]);
    expect(igual.texto).toContain("A versão salva é igual à sua");
  });

  it("arquivar: as áreas salvas em que o modelo vem marcado e o texto da janela", () => {
    const areas = [linha(), linha({ area: "TRABALHISTA" }), linha({ area: "CIVEL", salva: false, documentos: ["CONTRATO"] })];
    expect(areasComOModelo(R, areas)).toEqual(["PREVIDENCIARIO", "TRABALHISTA"]);
    expect(areasComOModelo(I, areas)).toEqual([]);
    expect(avisoArquivar("Declaração de residência", ["PREVIDENCIARIO", "TRABALHISTA"])).toEqual({
      titulo: "Ela também deixa de vir marcada em Previdenciário e Trabalhista.",
      texto: "As outras escolhas dessas duas áreas continuam como estão. Nas outras áreas, ela já não vinha marcada.",
    });
    expect(avisoArquivar("Requerimento ao INSS", [])).toBeNull();
    expect(tituloArquivar("Declaração de residência")).toEqual({
      titulo: "Arquivar a declaração de residência?",
      descricao: "Ela sai de Gerar documentos. Os documentos já gerados com ela continuam como estavam, para baixar.",
    });
    expect(tituloArquivar("Requerimento ao INSS").titulo).toBe("Arquivar o requerimento ao INSS?");
    expect([generoDoNome("Certidão"), generoDoNome("Termo de acordo"), generoDoNome("Substabelecimento")]).toEqual(["a", "o", "o"]);
  });
});
