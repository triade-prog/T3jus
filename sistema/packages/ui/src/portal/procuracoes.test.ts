// As contas das telas de Procurações e modelos (F3.16), sem React.
import { afterEach, describe, expect, it } from "vitest";
import { faltasDoResponsavel, marcadosDoModeloDocumento, montarValoresDocumento, type Anexo, type ClienteDoDocumento, type DadosDocumentos, type DocumentosDoContrato, type PreviaDocumentos } from "@t3jus/domain";
import {
  avisoDoMenor, avisoFaltaQuemAssina, avisoFez18, baixarNoCabecalho, botaoGerar, casoDoMenor, errosDocumentos, FALTA_DE_QUEM_ASSINA, faltasDeQuemAssina, faltasDoProprioCliente,
  formInicialDocumentos, fraseDaFaixaGerar, fraseDoTermoDeTutela, fraseVaoSair, linhaFaltaNoQuadro, pedidoDocumentos, problemaDoAssinado, problemaDosAssinados, quadroQuemAssina,
  quantosDocumentos, seloAssinado, tituloFaltas,
} from "./procuracoes.ts";
import {
  campoDoCursor, chaveEscolhas, completarQuemAssina, escolhasGuardadasValidas, faltasDaParte, guardarEscolhas, lerEscolhasGuardadas, lerRetornoEmGerar, lerVoltaDeGerar,
  limparEscolhasGuardadas, montarEscolhas, rotaFichaDeGerar, textoVeioDeGerar, tituloFichaSalva, VALIDADE_ESCOLHAS_MS, voltaParaGerar,
} from "./voltaGerar.ts";
import { rascunhoVazio, type RascunhoCliente } from "./clientes.ts";
import {
  ajudaDaArea, areaVaiAoContrato, fraseTrocaAplicada, linhaSugestaoDaArea, linhaTambemTem, origemDaArea, sugeridosDaArea, trocarArea,
} from "./procuracoes.ts";
import type { SugestaoDocumentos } from "@t3jus/domain";

const insc = (id: string) => ({ id, uf: "SP", numero: "214538", letra: null, tipo: "PRINCIPAL", versao: 1, texto: "OAB/SP 214.538", documento: "OAB/SP nº 214.538" }) as const;
const base = (extra: Partial<DadosDocumentos> = {}): DadosDocumentos => ({
  contrato: { id: "c", numero: "C-2026-033", objeto: "Aposentadoria", estado: "ELABORACAO", assinadoEm: null, versao: 1 },
  cliente: { id: "cl", nome: "Benedito Souza Lima", tipo: "PF", documento: null, nacionalidade: null, estadoCivil: null, profissao: null, rg: null, rgOrgao: null,
    endereco: null, bairro: null, cidade: null, uf: null, cep: null, repNome: null, repCargo: null, repDocumento: null, repEstadoCivil: null, repProfissao: null, versao: 1 },
  condicoes: [], casos: [],
  advogados: [
    { pessoaId: "m", nome: "Marina Ribeiro", noContrato: true, responsavel: true, inscricoes: [insc("i1")], escolhidas: ["i1"] },
    { pessoaId: "l", nome: "Larissa Costa", noContrato: false, responsavel: false, inscricoes: [insc("i2")], escolhidas: ["i2"] },
  ],
  semOab: [], escritorio: { nome: "Ribeiro & Matos", cnpj: null, endereco: null, cidade: "São Paulo", uf: "SP", oab: null }, marca: null, hoje: "2026-11-21",
  modelos: [
    { tipo: "CONTRATO", modeloId: null, nome: "Contrato de honorários", numero: null, padrao: "CONTRATO", emRevisao: true },
    { tipo: "PROCURACAO", modeloId: null, nome: "Procuração", numero: null, padrao: "PROCURACAO", emRevisao: true },
    { tipo: "HIPOSSUFICIENCIA", modeloId: null, nome: "Declaração de hipossuficiência", numero: null, padrao: "HIPOSSUFICIENCIA_PF", emRevisao: true },
  ],
  atuais: [], ultima: null, mudancas: [], poderesIniciais: ["ACORDO", "RECEBER_QUITAR"],
  ...extra,
});

describe("Procurações e modelos: a página de gerar", () => {
  it("começa com os três documentos, os advogados do contrato e os poderes na ordem da tela", () => {
    const f = formInicialDocumentos(base());
    expect(f.docs).toEqual(["CONTRATO", "PROCURACAO", "HIPOSSUFICIENCIA"]);
    expect(f.outorgados).toEqual({ m: ["i1"] });
    expect(f.poderes).toEqual(["RECEBER_QUITAR", "ACORDO"]);
    expect(f.cidadeData).toBe("São Paulo, 21 de novembro de 2026");
    expect(fraseVaoSair(base(), f)).toBe("Vão sair 3 arquivos .docx: contrato, procuração e declaração.");
    expect(botaoGerar(base(), f)).toBe("Gerar 3 documentos");
    expect(pedidoDocumentos(base(), f).outorgados).toEqual([{ pessoaId: "m", inscricoes: ["i1"] }]);
  });

  it("o contrato já assinado e o documento com assinado vêm desmarcados; gerar de novo vira versão 2", () => {
    const d = base({
      contrato: { id: "c", numero: "C-2026-033", objeto: "x", estado: "ATIVO", assinadoEm: "2026-09-02", versao: 2 },
      atuais: [{ chave: "PROCURACAO", tipo: "PROCURACAO", modeloId: null, numero: 1, geradoEm: "2026-09-01T12:00:00Z", assinado: false }],
      ultima: { geracaoId: "g", em: "2026-09-01T12:00:00Z", por: { id: "m", nome: "Marina Ribeiro" }, documentos: [{ tipo: "CONTRATO", modeloId: null }, { tipo: "PROCURACAO", modeloId: null }],
        outorgados: [{ pessoaId: "l", inscricoes: ["i2"] }], poderes: ["DESISTIR"], outroPoder: "representar perante o INSS", cidadeData: "x" },
    });
    const f = formInicialDocumentos(d);
    expect(f.docs).toEqual(["PROCURACAO"]);
    expect(f.outorgados).toEqual({ l: ["i2"] });
    expect(f.outroPoder).toBe("representar perante o INSS");
    expect(botaoGerar(d, f)).toBe("Gerar a versão 2");
  });

  it("só bloqueia nenhum documento e nenhum outorgado (e o tamanho dos textos)", () => {
    const f = { docs: [], outorgados: {}, poderes: [], outroPoder: "", cidadeData: "SP" };
    expect(errosDocumentos(f)).toEqual({ documentos: "DOCUMENTO_OBRIGATORIO", outorgados: "SEM_OUTORGADO", cidadeData: "CIDADE_DATA_OBRIGATORIA" });
    expect(tituloFaltas(["o RG"], "Benedito Souza Lima")).toBe("Falta 1 dado de Benedito: o RG.");
    expect(tituloFaltas(["o RG", "a profissão"], "Benedito Souza Lima")).toBe("Faltam 2 dados de Benedito: o RG e a profissão.");
  });
});

describe("Procurações e modelos: os assinados", () => {
  it("o .docx gerado não serve como assinado; PDF e foto até 10 MB, sim", () => {
    expect(problemaDoAssinado("contrato.docx", 100)).toMatch(/é o .docx gerado/);
    expect(problemaDoAssinado("contrato.pdf", 11 * 1024 * 1024)).toMatch(/10 MB/);
    expect(problemaDoAssinado("foto.JPG", 900)).toBeNull();
    // Várias páginas (F3.99): um PDF só ou até 10 fotos, sem misturar.
    const foto = (n: number) => ({ name: `IMG_${n}.jpg`, size: 2_000_000 });
    expect(problemaDosAssinados([])).toBeNull();
    expect(problemaDosAssinados([foto(1), foto(2), { name: "p3.png", size: 900 }])).toBeNull();
    expect(problemaDosAssinados(Array.from({ length: 10 }, (_, i) => foto(i)))).toBeNull();
    expect(problemaDosAssinados(Array.from({ length: 11 }, (_, i) => foto(i)))).toMatch(/São 11 fotos, e o limite é 10/);
    expect(problemaDosAssinados([foto(1), { name: "resto.pdf", size: 900 }])).toMatch(/sem misturar PDF e foto/);
    expect(problemaDosAssinados([foto(1), { name: "contrato.docx", size: 900 }])).toMatch(/é o .docx gerado/);
    expect(problemaDosAssinados([foto(1), { name: "grande.jpg", size: 11 * 1024 * 1024 }])).toMatch(/^grande\.jpg: o arquivo passou de 10 MB/);
    expect(seloAssinado("PROCURACAO", "2026-10-30")).toBe("Assinada em 30/10");
    expect(seloAssinado("CONTRATO", null)).toBe("Assinado");
  });
});

describe("Baixar o contrato no cabeçalho da ficha (D29)", () => {
  const pessoa = { id: "m", nome: "Marina Ribeiro" };
  const versao = (n: number, assinados: { anexoId: string; nome: string }[] = []) => ({
    id: `v${n}`, numero: n, arquivo: `contrato-v${n}.docx`, geracaoId: "g", modelo: { nome: "Contrato", padrao: true, numero: null }, geradoPor: pessoa,
    geradoEm: "2026-09-01T15:00:00Z", marcados: [], assinados: assinados.map((a) => ({ ...a, assinadoEm: null, enviadoPor: pessoa, enviadoEm: "2026-09-02T15:00:00Z" })),
  });
  const docs = (documentos: DocumentosDoContrato["documentos"], podeGerar = true): DocumentosDoContrato => ({
    contrato: { id: "c", numero: "C-2026-019", estado: "ATIVO", assinadoEm: null, versao: 1, cliente: { id: "cl", nome: "Farmácia Bom Jesus Ltda." } },
    documentos, faltam: 0, ultima: null, podeGerar,
  });
  const contrato = (v: ReturnType<typeof versao>) => ({ chave: "CONTRATO", tipo: "CONTRATO" as const, nome: "Contrato de honorários", situacao: "FALTA" as const, atual: v, anteriores: [] });
  const procuracao = { chave: "PROCURACAO", tipo: "PROCURACAO" as const, nome: "Procuração", situacao: "FALTA" as const, atual: versao(1), anteriores: [] };
  const anexo = { id: "a1", categoria: "CONTRATO_ASSINADO", nome: "assinado.jpg", tipo: "IMAGEM", tamanho: 10, donoId: "c", enviadoPor: pessoa, enviadoEm: "2026-09-03T15:00:00Z" } as unknown as Anexo;

  it("nada enquanto carrega ou com erro", () => {
    expect(baixarNoCabecalho(null, null, "ATIVO")).toBeNull();
    expect(baixarNoCabecalho("erro", [], "ATIVO")).toBeNull();
  });
  it("o contrato gerado mais recente, com a versão e o dia em Brasília", () => {
    expect(baixarNoCabecalho(docs([procuracao, contrato(versao(2))]), [], "ATIVO")).toEqual({ tipo: "gerado", documentoId: "v2", qual: "v2 · gerado em 01/09/2026" });
  });
  it("com o assinado do contrato, só o assinado (pergunta 4)", () => {
    expect(baixarNoCabecalho(docs([contrato(versao(1, [{ anexoId: "x", nome: "contrato-assinado.pdf" }]))]), [], "ATIVO"))
      .toEqual({ tipo: "assinado", anexoId: "x", nome: "contrato-assinado.pdf", formato: "PDF", qual: "contrato-assinado.pdf · anexado em 02/09/2026" });
  });
  it("sem contrato gerado, o assinado da folha Assinatura (pergunta 3)", () => {
    expect(baixarNoCabecalho(docs([procuracao]), [anexo], "ATIVO")).toMatchObject({ tipo: "assinado", anexoId: "a1", formato: "foto" });
  });
  it("sem nada: Gerar o contrato para quem pode, fora de encerrado (pergunta 2)", () => {
    expect(baixarNoCabecalho(docs([]), [], "ATIVO")).toEqual({ tipo: "gerar" });
    expect(baixarNoCabecalho(docs([]), [], "ENCERRADO")).toBeNull();
    expect(baixarNoCabecalho(docs([], false), [], "ATIVO")).toBeNull();
  });
});

// ------------------------------------------------------------- Gerar documentos do menor (F3.142)

describe("Gerar documentos do menor (F3.142)", () => {
  const HOJE = "2026-11-22";
  const pedro = (extra: Partial<ClienteDoDocumento> = {}): ClienteDoDocumento => ({
    id: "cl", nome: "Pedro Henrique Alves Souza", tipo: "PF", documento: "48821390730", nacionalidade: "brasileiro", estadoCivil: null, profissao: null,
    rg: null, rgOrgao: null, endereco: "Rua das Acácias, 418", bairro: "Vila Mariana", cidade: "São Paulo", uf: "SP", cep: "04117030",
    repNome: null, repCargo: null, repDocumento: null, repEstadoCivil: null, repProfissao: null, versao: 1,
    capacidade: "MENOR", nascimento: "2014-03-14", rlPapel: "MAE", rlNome: "Joana Alves Souza", rlDocumento: "37764021563", rlRg: "28.441.903-7", rlRgOrgao: "SSP/SP",
    rlNacionalidade: "brasileira", rlEstadoCivil: "DIVORCIADO", rlProfissao: "auxiliar administrativa", rlMoraJunto: true,
    ...extra,
  });
  const lucas = (extra: Partial<ClienteDoDocumento> = {}) => pedro({ nome: "Lucas Ferreira Moura", nascimento: "2010-02-03", rlPapel: "PAI", rlNome: "Marcos Ferreira Moura", ...extra });
  const rafaela = (extra: Partial<ClienteDoDocumento> = {}) => pedro({ nome: "Rafaela Nunes Torres", nascimento: "2008-11-19", rlPapel: "TUTORA", rlNome: "Cleusa Nunes", rg: "41.207.338-0", ...extra });
  // A prévia como o servidor monta: os marcados vêm do domínio, não escritos à mão.
  const escritorio = { nome: "Ribeiro & Matos", cnpj: "41207338000105", endereco: "Rua Tabapuã, 1.123", cidade: "São Paulo", uf: "SP", oab: null } as DadosDocumentos["escritorio"];
  const previa = (c: ClienteDoDocumento, campos: readonly (readonly string[])[], extra: Partial<DadosDocumentos> = {}): PreviaDocumentos => {
    const d = base({ cliente: c, hoje: HOJE, escritorio, ...extra });
    const v = montarValoresDocumento(d, pedidoDocumentos(d, formInicialDocumentos(d)));
    const docs = campos.map((cs) => ({ tipo: "PROCURACAO" as const, modeloId: null, nome: "Procuração", paragrafos: [], marcados: marcadosDoModeloDocumento(v, cs), desconhecidos: [] }));
    const n = docs.map((x) => x.marcados.length);
    const max = Math.max(0, ...n);
    const dado = (k: number) => `${k} ${k === 1 ? "dado sai marcado" : "dados saem marcados"}`;
    const frase = max === 0 ? "Nenhum dado sai marcado." : n.every((x) => x === max) && n.length > 1 ? `${dado(max)} em cada um.` : `${dado(n.reduce((a, b) => a + b, 0))}.`;
    return { documentos: docs, frase };
  };
  const CLIENTE = ["CLIENTE_QUALIFICACAO", "CLIENTE_ASSINATURA"];

  it("representado e assistido: o aviso do dia, como no desenho, com o “(a)” e o primeiro nome", () => {
    expect(avisoDoMenor(pedro(), HOJE, 3)).toEqual({
      titulo: "Pedro tem 12 anos hoje: é representado(a).",
      texto: "Só Joana assina, em nome de Pedro, os três documentos. Em 14/03/2030, aos 16 anos, Pedro passa a ser assistido(a), e os dois assinam. O T3jus faz a conta pela data de nascimento, no dia de gerar.",
    });
    expect(avisoDoMenor(lucas(), HOJE, 3)).toEqual({
      titulo: "Lucas tem 16 anos hoje: é assistido(a).",
      texto: "Os dois assinam os três documentos: Lucas e o pai, Marcos, que o(a) assiste. Em 03/02/2028, aos 18 anos, Lucas passa a assinar sozinho(a).",
    });
    expect(avisoDoMenor(rafaela(), HOJE, 3)).toBeNull();
  });

  it("F3.162: o bebê tem menos de 1 ano, e com 1 ano fica no singular", () => {
    expect(avisoDoMenor(pedro({ nascimento: "2026-05-10" }), HOJE, 3)!.titulo).toBe("Pedro tem menos de 1 ano hoje: é representado(a).");
    expect(avisoDoMenor(pedro({ nascimento: "2025-08-01" }), HOJE, 3)!.titulo).toBe("Pedro tem 1 ano hoje: é representado(a).");
    expect(avisoDoMenor(pedro({ nascimento: "2024-08-01" }), HOJE, 3)!.titulo).toBe("Pedro tem 2 anos hoje: é representado(a).");
  });

  it("quantos documentos: o documento, os dois, os três, e nenhum marcado", () => {
    expect(quantosDocumentos(1)).toBe("o documento");
    expect(quantosDocumentos(2)).toBe("os dois documentos");
    expect(quantosDocumentos(3)).toBe("os três documentos");
    expect(quantosDocumentos(0)).toBe("os documentos");
    expect(quantosDocumentos(4)).toBe("os 4 documentos");
    expect(avisoDoMenor(pedro(), HOJE, 1)!.texto).toContain("Só Joana assina, em nome de Pedro, o documento.");
    expect(avisoDoMenor(lucas(), HOJE, 0)!.texto).toContain("Os dois assinam os documentos: Lucas");
  });

  it("as bordas da idade: na véspera dos 16, no dia dos 16, no dia dos 18, e quem nasceu em 29/02", () => {
    expect(casoDoMenor(pedro({ nascimento: "2010-11-23" }), HOJE)).toBe("REPRESENTADO");
    expect(casoDoMenor(pedro({ nascimento: "2010-11-22" }), HOJE)).toBe("ASSISTIDO");
    expect(casoDoMenor(pedro({ nascimento: "2008-11-22" }), HOJE)).toBe("FEZ_18");
    expect(casoDoMenor(pedro({ nascimento: "2008-11-23" }), HOJE)).toBe("ASSISTIDO");
    // 16 anos depois de um ano bissexto é outro ano bissexto: a data dos 16 é 29/02; a dos 18, 28/02.
    expect(avisoDoMenor(pedro({ nascimento: "2012-02-29" }), "2026-11-22", 3)!.texto).toContain("Em 29/02/2028, aos 16 anos");
    expect(avisoDoMenor(pedro({ nascimento: "2012-02-29" }), "2028-02-29", 3)!.texto).toContain("Em 28/02/2030, aos 18 anos");
  });

  it("o gênero de quem assina vem do papel", () => {
    expect(avisoDoMenor(lucas({ rlPapel: "TUTOR", rlNome: "Paulo Moura" }), HOJE, 3)!.texto).toContain("Lucas e o tutor, Paulo, que o(a) assiste.");
    expect(avisoDoMenor(lucas({ rlPapel: "MAE", rlNome: "Joana Souza" }), HOJE, 3)!.texto).toContain("Lucas e a mãe, Joana, que o(a) assiste.");
    expect(avisoFez18(rafaela(), HOJE)!.texto).toMatch(/^A tutora, Cleusa, que assinava com Rafaela, não entra mais\./);
    expect(avisoFez18(rafaela({ rlPapel: "PAI", rlNome: "Marcos Torres" }), HOJE)!.texto).toMatch(/^O pai, Marcos, que assinava com Rafaela/);
    expect(linhaFaltaNoQuadro(pedro({ rlDocumento: null, rlRg: null }))).toBe("Faltam o CPF e o RG dela");
    expect(linhaFaltaNoQuadro(lucas({ rlRg: null }))).toBe("Falta o RG dele");
    expect(linhaFaltaNoQuadro(pedro())).toBeNull();
  });

  it("as faltas de quem assina saem do domínio, com a marca do .docx", () => {
    const c = pedro({ rlDocumento: null, rlRg: null });
    expect(faltasDeQuemAssina(c)).toEqual([
      { curta: "o CPF", marca: "[CPF DE QUEM ASSINA: falta]" },
      { curta: "o RG", marca: "[RG DE QUEM ASSINA: falta]" },
    ]);
    const tudo = pedro({ rlDocumento: null, rlRg: null, rlProfissao: null, rlMoraJunto: false, rlEndereco: null });
    expect(faltasDeQuemAssina(tudo).map((x) => x.curta)).toEqual(["o CPF", "o RG", "a qualificação", "o endereço"]);
    expect(faltasDeQuemAssina(tudo)).toHaveLength(faltasDoResponsavel(tudo).length);
    // Todo texto possível do domínio está no mapa, menos o "quem assina pelo cliente", que o banco não deixa existir.
    const todos = faltasDoResponsavel({ rlNome: "", rlMoraJunto: false });
    expect(todos.filter((f) => !FALTA_DE_QUEM_ASSINA[f])).toEqual(["quem assina pelo cliente"]);
    expect(Object.values(FALTA_DE_QUEM_ASSINA).map((x) => x.marca)).toEqual(["[CPF DE QUEM ASSINA: falta]", "[RG DE QUEM ASSINA: falta]", null, "[ENDEREÇO DE QUEM ASSINA: falta]"]);
  });

  it("falta dado de quem assina: o aviso em atenção, no plural, no singular e sem marca", () => {
    expect(avisoFaltaQuemAssina(pedro({ rlDocumento: null, rlRg: null }), 3)).toEqual({
      titulo: "Faltam 2 dados de quem assina por Pedro: o CPF e o RG de Joana.",
      texto: "Dá para gerar assim: os três documentos saem com [CPF DE QUEM ASSINA: falta] e [RG DE QUEM ASSINA: falta], para preencher à mão ou no Word. Ou complete a ficha antes: ao salvar, você volta para cá.",
    });
    expect(avisoFaltaQuemAssina(pedro({ rlRg: null }), 1)).toEqual({
      titulo: "Falta 1 dado de quem assina por Pedro: o RG de Joana.",
      texto: "Dá para gerar assim: o documento sai com [RG DE QUEM ASSINA: falta], para preencher à mão ou no Word. Ou complete a ficha antes: ao salvar, você volta para cá.",
    });
    expect(avisoFaltaQuemAssina(pedro({ rlMoraJunto: false, rlEndereco: null }), 2)!.texto).toContain("os dois documentos saem com [ENDEREÇO DE QUEM ASSINA: falta]");
    expect(avisoFaltaQuemAssina(pedro({ rlProfissao: null }), 3)).toEqual({
      titulo: "Falta 1 dado de quem assina por Pedro: a qualificação de Joana.",
      texto: "Dá para gerar assim, para preencher à mão ou no Word. Ou complete a ficha antes: ao salvar, você volta para cá.",
    });
    expect(avisoFaltaQuemAssina(pedro(), 3)).toBeNull();
  });

  it("as faltas do próprio cliente ficam sem as de quem assina", () => {
    expect(faltasDoProprioCliente(pedro({ nacionalidade: null, rlRg: null }), HOJE)).toEqual(["a nacionalidade"]);
    expect(faltasDoProprioCliente(pedro(), HOJE)).toEqual([]);
  });

  it("fez 18: o título da ficha, quem não entra mais e o que antes não ia no documento", () => {
    expect(avisoFez18(rafaela({ estadoCivil: null, profissao: null }), HOJE)).toEqual({
      titulo: "Rafaela fez 18 anos em 19/11/2026: agora assina por si.",
      texto: "A tutora, Cleusa, que assinava com Rafaela, não entra mais. Faltam 2 dados de Rafaela, que antes não iam no documento: o estado civil e a profissão. Dá para gerar assim: saem marcados, para completar no Word. Ou complete a ficha antes: ao salvar, você volta para cá.",
      temFalta: true,
    });
    expect(avisoFez18(rafaela({ estadoCivil: "SOLTEIRO", profissao: null }), HOJE)!.texto)
      .toContain("Falta 1 dado de Rafaela, que antes não ia no documento: a profissão. Dá para gerar assim: sai marcado, para completar no Word.");
    expect(avisoFez18(rafaela({ estadoCivil: "SOLTEIRO", profissao: null, documento: null }), HOJE)!.texto)
      .toContain("não entra mais. Faltam 2 dados de Rafaela: a profissão e o CPF. Dá para gerar assim");
    expect(avisoFez18(rafaela({ estadoCivil: "SOLTEIRO", profissao: "estudante" }), HOJE))
      .toEqual({ titulo: "Rafaela fez 18 anos em 19/11/2026: agora assina por si.", texto: "A tutora, Cleusa, que assinava com Rafaela, não entra mais.", temFalta: false });
    expect(avisoFez18(pedro(), HOJE)).toBeNull();
  });

  it("a faixa: “Em todos”, a lista do que sai marcado e a frase do servidor quando não bate", () => {
    expect(fraseDaFaixaGerar(pedro(), HOJE, previa(pedro(), [CLIENTE, CLIENTE, CLIENTE]))).toBe("Nenhum dado sai marcado. Em todos, Joana assina por Pedro.");
    expect(fraseDaFaixaGerar(lucas(), HOJE, previa(lucas(), [CLIENTE]))).toBe("Nenhum dado sai marcado. Em todos, Lucas e Marcos assinam.");
    const falta = pedro({ rlDocumento: null, rlRg: null });
    expect(fraseDaFaixaGerar(falta, HOJE, previa(falta, [CLIENTE, CLIENTE, CLIENTE]))).toBe("2 dados saem marcados em cada um: o CPF e o RG de Joana.");
    // Um documento sem campo do cliente não atrapalha a lista.
    expect(fraseDaFaixaGerar(falta, HOJE, previa(falta, [CLIENTE, ["ADVOGADOS_QUALIFICACAO"]]))).toBe("2 dados saem marcados: o CPF e o RG de Joana.");
    // Com a qualificação de quem assina, que não deixa marca, fica só a frase do servidor.
    const qual = pedro({ rlRg: null, rlProfissao: null });
    expect(fraseDaFaixaGerar(qual, HOJE, previa(qual, [CLIENTE]))).toBe("2 dados saem marcados.");
    // Falta misturada (do cliente e de quem assina): só a frase do servidor.
    const mist = pedro({ nacionalidade: null, rlRg: null });
    expect(fraseDaFaixaGerar(mist, HOJE, previa(mist, [CLIENTE]))).toBe("2 dados saem marcados.");
    // Marcado de advogado junto: só a frase do servidor.
    const adv = { advogados: [{ pessoaId: "m", nome: "Marina Ribeiro", noContrato: true, responsavel: true, inscricoes: [insc("i1")], escolhidas: ["i1"],
      dados: { tratamento: "ADVOGADA", nacionalidade: null, estadoCivil: null, profissao: null, documento: null, endereco: null, versao: 1 } }] } as unknown as Partial<DadosDocumentos>;
    const comAdv = previa(falta, [[...CLIENTE, "ADVOGADOS_QUALIFICACAO"]], adv);
    expect(comAdv.documentos[0]!.marcados.length).toBeGreaterThan(2);
    expect(fraseDaFaixaGerar(falta, HOJE, comAdv)).toBe(comAdv.frase);
    // Fez 18: a lista com o nome de quem agora assina, sem "Em todos".
    const rafa = rafaela({ estadoCivil: null, profissao: null });
    expect(fraseDaFaixaGerar(rafa, HOJE, previa(rafa, [CLIENTE]))).toBe("2 dados saem marcados: o estado civil e a profissão de Rafaela.");
    // Sem prévia: a frase de reserva e o "Em todos".
    expect(fraseDaFaixaGerar(pedro(), HOJE, null)).toBe("Nenhum dado sai marcado. Em todos, Joana assina por Pedro.");
    expect(fraseDaFaixaGerar(falta, HOJE, null)).toBe("Algum dado sai marcado, para completar.");
    // Fora do menor, como antes.
    expect(fraseDaFaixaGerar(pedro({ capacidade: "PLENA" }), HOJE, null)).toBe("Algum dado sai marcado, para completar.");
  });

  // F3.140: com tutora ou tutor, a frase do termo de tutela no fim do aviso e da faixa (gerar-tutela, gerar-tutela-falta).
  const davi = (extra: Partial<ClienteDoDocumento> = {}) => pedro({ nome: "Davi Torres Lima", nascimento: "2015-05-02", rlPapel: "TUTORA", rlNome: "Sônia Torres Lima", ...extra });
  const COM = "Junte uma cópia do termo de tutela à procuração: ele está na ficha, para baixar.";
  const SEM = "Junte uma cópia do termo de tutela à procuração.";

  it("F3.140 gerar-tutela: o aviso do representado termina com o termo, com e sem termo na ficha", () => {
    expect(avisoDoMenor(davi(), HOJE, 3, true)).toEqual({
      titulo: "Davi tem 11 anos hoje: é representado(a).",
      texto: `Só Sônia assina, em nome de Davi, os três documentos. Em 02/05/2031, aos 16 anos, Davi passa a ser assistido(a), e os dois assinam. O T3jus faz a conta pela data de nascimento, no dia de gerar. ${COM}`,
    });
    expect(avisoDoMenor(davi(), HOJE, 3, false)!.texto).toMatch(new RegExp(`no dia de gerar\\. ${SEM.replace(".", "\\.")}$`));
    // O assistido com tutor (NOTAS, item 5).
    expect(avisoDoMenor(davi({ nascimento: "2010-01-10", rlPapel: "TUTOR", rlNome: "Dario Lima" }), HOJE, 3, true)!.texto)
      .toBe(`Os dois assinam os três documentos: Davi e o tutor, Dario, que o(a) assiste. Em 10/01/2028, aos 18 anos, Davi passa a assinar sozinho(a). ${COM}`);
    // Com mãe ou pai, nada muda, mesmo que viesse um termo.
    expect(avisoDoMenor(pedro(), HOJE, 3, true)!.texto).not.toMatch(/tutela/);
    expect(fraseDoTermoDeTutela(pedro(), true)).toBe("");
  });

  it("F3.140 gerar-tutela-falta: o aviso de atenção termina com o termo", () => {
    const falta = davi({ rlDocumento: null, rlRg: null });
    expect(avisoFaltaQuemAssina(falta, 3, true)).toEqual({
      titulo: "Faltam 2 dados de quem assina por Davi: o CPF e o RG de Sônia.",
      texto: `Dá para gerar assim: os três documentos saem com [CPF DE QUEM ASSINA: falta] e [RG DE QUEM ASSINA: falta], para preencher à mão ou no Word. Ou complete a ficha antes: ao salvar, você volta para cá. ${COM}`,
    });
    expect(avisoFaltaQuemAssina(falta, 3, false)!.texto).toMatch(/Ou complete a ficha antes: ao salvar, você volta para cá\. Junte uma cópia do termo de tutela à procuração\.$/);
    expect(avisoFaltaQuemAssina(pedro({ rlDocumento: null }), 3, true)!.texto).not.toMatch(/tutela/);
  });

  it("F3.140: a faixa leva sempre o termo de tutela, com ou sem “Em todos”", () => {
    expect(fraseDaFaixaGerar(davi(), HOJE, previa(davi(), [CLIENTE, CLIENTE, CLIENTE])))
      .toBe("Nenhum dado sai marcado. Em todos, Sônia assina por Davi. Junte o termo de tutela à procuração.");
    const falta = davi({ rlDocumento: null, rlRg: null });
    expect(fraseDaFaixaGerar(falta, HOJE, previa(falta, [CLIENTE, CLIENTE, CLIENTE])))
      .toBe("2 dados saem marcados em cada um: o CPF e o RG de Sônia. Junte o termo de tutela à procuração.");
    const assist = davi({ nascimento: "2010-01-10", rlPapel: "TUTOR", rlNome: "Dario Lima" });
    expect(fraseDaFaixaGerar(assist, HOJE, null)).toBe("Nenhum dado sai marcado. Em todos, Davi e Dario assinam. Junte o termo de tutela à procuração.");
    // Aos 18, nada de termo (gerar-fez-18 não muda).
    expect(fraseDaFaixaGerar(rafaela({ estadoCivil: "SOLTEIRO", profissao: "atendente" }), HOJE, null)).not.toMatch(/tutela/);
  });

  it("sem data de nascimento ou sem quem assina: nenhum caso do menor, sem erro", () => {
    expect(casoDoMenor(pedro({ nascimento: null }), HOJE)).toBeNull();
    expect(casoDoMenor(pedro({ rlNome: null }), HOJE)).toBeNull();
    expect(casoDoMenor(pedro({ rlNome: "  " }), HOJE)).toBeNull();
    expect(casoDoMenor(pedro({ tipo: "PJ" }), HOJE)).toBeNull();
    expect(casoDoMenor(pedro({ capacidade: "CURATELA" }), HOJE)).toBeNull();
    expect(avisoDoMenor(pedro({ nascimento: null }), HOJE, 3)).toBeNull();
    expect(avisoFez18(pedro({ nascimento: null }), HOJE)).toBeNull();
    expect(fraseDaFaixaGerar(pedro({ nascimento: null, rlRg: "1" }), HOJE, null)).toBe("Algum dado sai marcado, para completar.");
  });
});

// ------------------------------------------------------------------------------- F3.160

describe("Editar a ficha vindo de Gerar documentos (F3.160)", () => {
  const CT = "f1000000-0000-4000-8000-000000000233";
  const CL = "c1000000-0000-4000-8000-000000000201";
  const AGORA = Date.parse("2026-11-24T15:00:00Z");

  it("a ida leva só o tipo fixo, o contrato e a parte da lista", () => {
    expect(rotaFichaDeGerar(CL, CT, "editar", "rl")).toBe(`/clientes/${CL}?editar=1&de=gerar&contrato=${CT}&campo=rl`);
    expect(rotaFichaDeGerar(CL, CT, "editar")).toBe(`/clientes/${CL}?editar=1&de=gerar&contrato=${CT}`);
    expect(rotaFichaDeGerar(CL, CT, "por-si", "rl")).toBe(`/clientes/${CL}?janela=por-si&de=gerar&contrato=${CT}`);
    expect(rotaFichaDeGerar(CL, CT, "editar", "outra" as "rl")).not.toContain("campo=");
  });

  it("a volta é sempre para Gerar, com o marcador das escolhas, e nunca leva nada de fora", () => {
    expect(voltaParaGerar(CT, "salva")).toBe(`/contratos/modelos/gerar?contrato=${CT}&escolhas=1&ficha=salva`);
    expect(voltaParaGerar(CT, "ficou")).toBe(`/contratos/modelos/gerar?contrato=${CT}&escolhas=1&ficha=ficou`);
    expect(voltaParaGerar(CT.toUpperCase(), null)).toBe(`/contratos/modelos/gerar?contrato=${CT}&escolhas=1`);
    for (const x of ["https://evil.com", "//evil.com", "/\\evil", "javascript:alert(1)", `${CT}&x=//evil.com`]) {
      expect(voltaParaGerar(x, "salva")).toBe("/contratos/modelos/gerar");
    }
  });

  it("a ficha só aceita de=gerar com o UUID do contrato; o resto abre a ficha normal", () => {
    expect(lerVoltaDeGerar({ de: "gerar", contrato: CT, campo: "rl" })).toEqual({ contrato: CT, campo: "rl", janela: false });
    expect(lerVoltaDeGerar({ de: "gerar", contrato: CT.toUpperCase() })).toEqual({ contrato: CT, campo: null, janela: false });
    expect(lerVoltaDeGerar({ de: "gerar", contrato: CT, janela: "por-si" })).toEqual({ contrato: CT, campo: null, janela: true });
    expect(lerVoltaDeGerar({ de: "gerar", contrato: CT, campo: "x", janela: "outra" })).toEqual({ contrato: CT, campo: null, janela: false });
    // Com outro parâmetro hostil, a volta continua sendo só o contrato.
    expect(lerVoltaDeGerar({ de: "gerar", contrato: CT, volta: "//evil.com", destino: "https://evil.com" })).toEqual({ contrato: CT, campo: null, janela: false });
    for (const q of [
      { de: "gerar" }, { de: "outra-coisa", contrato: CT }, { contrato: CT }, { de: "gerar", contrato: [CT, CT] }, { de: ["gerar"], contrato: CT },
      { de: "gerar", contrato: "https://evil.com" }, { de: "gerar", contrato: "//evil.com" }, { de: "gerar", contrato: "/\\evil" },
      { de: "gerar", contrato: "javascript:alert(1)" }, { de: "gerar", contrato: "123" },
    ]) expect(lerVoltaDeGerar(q)).toBeNull();
  });

  it("Gerar só aceita os marcadores fixos", () => {
    expect(lerRetornoEmGerar({ escolhas: "1", ficha: "salva" })).toEqual({ escolhas: true, ficha: "salva" });
    expect(lerRetornoEmGerar({ escolhas: "1", ficha: "ficou" })).toEqual({ escolhas: true, ficha: "ficou" });
    expect(lerRetornoEmGerar({ escolhas: "sim", ficha: "https://evil.com" })).toEqual({ escolhas: false, ficha: null });
    expect(lerRetornoEmGerar({ escolhas: ["1"], ficha: ["salva"] })).toEqual({ escolhas: false, ficha: null });
  });

  const dados = (extra: Partial<DadosDocumentos> = {}) => base({ cliente: { ...base().cliente, id: CL }, ...extra });
  const guardado = (extra: Record<string, unknown> = {}) => ({
    ...montarEscolhas(dados(), { docs: ["CONTRATO", "PROCURACAO"], outorgados: { m: ["i1"], l: ["i2"] }, poderes: ["DESISTIR", "ACORDO"], outroPoder: "requerer alvará", cidadeData: "São Paulo, 24 de novembro de 2026" }, 1, "volta-falta-rl", AGORA - 60_000),
    ...extra,
  });

  it("as escolhas guardadas voltam conferidas com os dados de agora", () => {
    expect(escolhasGuardadasValidas(guardado(), dados(), AGORA)).toEqual({
      form: { docs: ["CONTRATO", "PROCURACAO"], outorgados: { m: ["i1"], l: ["i2"] }, poderes: ["ACORDO", "DESISTIR"], outroPoder: "requerer alvará", cidadeData: "São Paulo, 24 de novembro de 2026", area: null, mexeu: false },
      aba: 1, foco: "volta-falta-rl",
    });
    // Advogado ou inscrição que sumiu, modelo que saiu e poder fora da lista não voltam.
    const g = guardado({ form: { docs: ["CONTRATO", "OUTRO:x"], outorgados: { m: ["i1", "i9"], z: ["i1"] }, poderes: ["ACORDO", "NADA"], outroPoder: "", cidadeData: "São Paulo, hoje" } });
    expect(escolhasGuardadasValidas(g, dados(), AGORA)!.form).toEqual({ docs: ["CONTRATO"], outorgados: { m: ["i1"] }, poderes: ["ACORDO"], outroPoder: "", cidadeData: "São Paulo, hoje", area: null, mexeu: false });
  });

  it("o que ficou assinado depois sai; o assinado antes que a pessoa marcou de novo fica", () => {
    const assinadoAgora = dados({ contrato: { ...base().contrato, assinadoEm: "2026-11-24" } });
    expect(escolhasGuardadasValidas(guardado(), assinadoAgora, AGORA)!.form.docs).toEqual(["PROCURACAO"]);
    expect(escolhasGuardadasValidas(guardado({ assinadas: ["CONTRATO"] }), assinadoAgora, AGORA)!.form.docs).toEqual(["CONTRATO", "PROCURACAO"]);
  });

  it("formato errado, vencido, do futuro ou de outro cliente: nada volta", () => {
    for (const x of [
      null, "texto", 42, [], guardado({ v: 2 }), guardado({ em: "ontem" }), guardado({ em: AGORA + 10 * 60_000 }), guardado({ em: AGORA - VALIDADE_ESCOLHAS_MS - 1 }),
      guardado({ clienteId: "outro" }), guardado({ assinadas: "CONTRATO" }), guardado({ form: null }), guardado({ form: { docs: "x" } }),
      guardado({ form: { ...guardado().form, outroPoder: "x".repeat(301) } }), guardado({ form: { ...guardado().form, cidadeData: 5 } }),
      guardado({ form: { ...guardado().form, outorgados: { m: "i1" } } }),
    ]) expect(escolhasGuardadasValidas(x, dados(), AGORA)).toBeNull();
    // A aba fora da conta e o foco fora da lista fixa caem no começo e em nada.
    expect(escolhasGuardadasValidas(guardado({ aba: -1, foco: "javascript:alert(1)" }), dados(), AGORA)).toMatchObject({ aba: 0, foco: null });
    expect(escolhasGuardadasValidas(guardado({ aba: 7 }), dados(), AGORA)!.aba).toBe(0);
    expect(escolhasGuardadasValidas(guardado({ aba: 1.5 }), dados(), AGORA)!.aba).toBe(0);
  });

  it("nenhum dado do cliente vai para o armazenamento", () => {
    const d = dados({ cliente: { ...base().cliente, id: CL, nome: "Pedro Henrique Alves Souza", documento: "48821390730" } });
    const json = JSON.stringify(montarEscolhas(d, formInicialDocumentos(d), 0, "volta-quadro"));
    expect(json).not.toContain("Pedro");
    expect(json).not.toContain("48821390730");
    expect(Object.keys(JSON.parse(json) as object).sort()).toEqual(["aba", "assinadas", "clienteId", "em", "foco", "form", "v"]);
  });

  describe("o sessionStorage", () => {
    const mapa = new Map<string, string>();
    const falso = {
      get length() { return mapa.size; },
      key: (i: number) => [...mapa.keys()][i] ?? null,
      getItem: (k: string) => mapa.get(k) ?? null,
      setItem: (k: string, v: string) => { mapa.set(k, v); },
      removeItem: (k: string) => { mapa.delete(k); },
    };
    const g = globalThis as unknown as { window?: unknown };
    afterEach(() => { mapa.clear(); delete g.window; });

    it("lê uma vez e apaga; JSON quebrado ou armazenamento bloqueado não quebram", () => {
      g.window = { sessionStorage: falso };
      guardarEscolhas(CT, guardado() as never);
      expect(mapa.has(chaveEscolhas(CT))).toBe(true);
      expect(lerEscolhasGuardadas(CT)).toMatchObject({ v: 1, foco: "volta-falta-rl" });
      expect(lerEscolhasGuardadas(CT)).toBeNull();
      mapa.set(chaveEscolhas(CT), "{quebrado");
      expect(lerEscolhasGuardadas(CT)).toBeNull();
      expect(mapa.has(chaveEscolhas(CT))).toBe(false);
      g.window = { get sessionStorage() { throw new Error("SecurityError"); } };
      expect(() => guardarEscolhas(CT, guardado() as never)).not.toThrow();
      expect(lerEscolhasGuardadas(CT)).toBeNull();
      expect(() => limparEscolhasGuardadas()).not.toThrow();
    });

    it("limpar apaga só as chaves t3jus.gerar.*", () => {
      g.window = { sessionStorage: falso };
      mapa.set(chaveEscolhas(CT), "1");
      mapa.set(chaveEscolhas(CL), "2");
      mapa.set("outra", "3");
      limparEscolhasGuardadas(CT);
      expect([...mapa.keys()].sort()).toEqual(["outra", chaveEscolhas(CL)]);
      limparEscolhasGuardadas();
      expect([...mapa.keys()]).toEqual(["outra"]);
    });
  });

  const rasc = (extra: Partial<RascunhoCliente> = {}): RascunhoCliente => ({
    ...rascunhoVazio("PF"), nome: "Pedro Henrique Alves Souza", documento: "488.213.907-30", nacionalidade: "brasileiro", endereco: "Rua das Acácias, 418",
    capacidade: "MENOR", nascimento: "14/03/2014", rlPapel: "MAE", rlNome: "Joana Alves Souza", rlDocumento: "", rlRg: "", rlNacionalidade: "brasileira",
    rlEstadoCivil: "DIVORCIADO", rlProfissao: "auxiliar administrativa", rlMoraJunto: true, ...extra,
  });

  it("D9: o cursor no primeiro campo que falta da parte e o aviso diz o que falta", () => {
    expect(faltasDaParte(rasc(), "rl", "2026-11-22").map((x) => x.campo)).toEqual(["rlDocumento", "rlRg"]);
    expect(campoDoCursor(rasc(), "rl", "2026-11-22")).toBe("rlDocumento");
    expect(textoVeioDeGerar(rasc(), "rl", "2026-11-22"))
      .toBe("Faltam o CPF e o RG de Joana: o cursor já está no CPF. Ao salvar, você volta para lá, com a prévia já com os dados novos.");
    expect(textoVeioDeGerar(rasc({ rlDocumento: "377.640.215-63" }), "rl", "2026-11-22"))
      .toBe("Falta o RG de Joana: o cursor já está no RG. Ao salvar, você volta para lá, com a prévia já com os dados novos.");
    // Sem falta: o primeiro campo da parte e o texto do D25.
    const completo = rasc({ rlDocumento: "377.640.215-63", rlRg: "28.441.903-7" });
    expect(campoDoCursor(completo, "rl", "2026-11-22")).toBe("rlNome");
    expect(textoVeioDeGerar(completo, "rl", "2026-11-22")).toBe("Ao salvar, volta para lá, com a prévia já com os dados novos.");
    // O próprio cliente menor: sem estado civil, profissão e RG.
    expect(faltasDaParte(rasc({ nacionalidade: "" }), "cliente", "2026-11-22").map((x) => x.curta)).toEqual(["a nacionalidade"]);
    expect(textoVeioDeGerar(rasc({ nacionalidade: "" }), "cliente", "2026-11-22")).toMatch(/^Falta a nacionalidade de Pedro: o cursor já está na nacionalidade\./);
    expect(campoDoCursor(rasc(), null, "2026-11-22")).toBe("nome");
  });

  it("D9 na empresa: o cursor em quem assina e o nome inteiro", () => {
    const far = { ...rascunhoVazio("PJ"), nome: "Farmácia Bom Jesus Ltda.", repNome: "Rita de Cássia Moura", repCargo: "", repDocumento: "" };
    expect(campoDoCursor(far, "pj", "2026-11-22")).toBe("repCargo");
    expect(campoDoCursor({ ...far, repCargo: "Sócia", repDocumento: "1" }, "pj", "2026-11-22")).toBe("repNome");
    expect(textoVeioDeGerar(far, "pj", "2026-11-22")).toBe("O cursor já está em “Quem assina pela empresa”. Ao salvar, você volta para lá, com a prévia já com os dados novos.");
    expect(textoVeioDeGerar({ ...far, documento: "" }, "cliente", "2026-11-22")).toMatch(/^Faltam o CNPJ, o endereço, o cargo e o CPF de quem assina de Farmácia Bom Jesus Ltda\.: o cursor já está no CNPJ\./);
  });

  it("D8: a ficha salva com o primeiro nome, e a empresa com o nome inteiro", () => {
    expect(tituloFichaSalva({ nome: "Pedro Henrique Alves Souza", tipo: "PF" })).toBe("Ficha de Pedro salva.");
    expect(tituloFichaSalva({ nome: "Farmácia Bom Jesus Ltda.", tipo: "PJ" })).toBe("Ficha de Farmácia Bom Jesus Ltda. salva.");
  });
});

describe("O quadro de quem assina em Gerar (F3.160, D1 e D2)", () => {
  const HOJE = "2026-11-22";
  const c = (extra: Partial<ClienteDoDocumento> = {}): ClienteDoDocumento => ({
    id: "cl", nome: "Pedro Henrique Alves Souza", tipo: "PF", documento: "48821390730", nacionalidade: "brasileiro", estadoCivil: null, profissao: null,
    rg: null, rgOrgao: null, endereco: "Rua das Acácias, 418", bairro: null, cidade: null, uf: null, cep: null,
    repNome: null, repCargo: null, repDocumento: null, repEstadoCivil: null, repProfissao: null, versao: 1,
    capacidade: "MENOR", nascimento: "2014-03-14", rlPapel: "MAE", rlNome: "Joana Alves Souza", rlDocumento: "37764021563", rlRg: null, rlMoraJunto: true,
    rlNacionalidade: "brasileira", rlEstadoCivil: "DIVORCIADO", rlProfissao: "auxiliar administrativa",
    ...extra,
  });

  it("D2: a linha termina com “· da ficha do cliente”, com e sem CPF", () => {
    expect(quadroQuemAssina(c(), HOJE, "377.640.215-63")).toEqual({ nome: "Joana Alves Souza", linha: "Mãe · CPF 377.640.215-63 · da ficha do cliente", selo: true });
    expect(quadroQuemAssina(c({ rlDocumento: null }), HOJE, null).linha).toBe("Mãe · da ficha do cliente");
  });

  it("D1: no assistido, os dois nomes e a frase de quem assina, sem o selo", () => {
    const lucas = c({ nome: "Lucas Ferreira Moura", nascimento: "2010-02-03", rlPapel: "PAI", rlNome: "Marcos Ferreira Moura" });
    expect(quadroQuemAssina(lucas, HOJE, "123.456.789-09")).toEqual({
      nome: "Lucas e Marcos Ferreira Moura", linha: "Lucas assina, assistido(a) pelo pai, Marcos · CPF 123.456.789-09 · da ficha do cliente", selo: false,
    });
    expect(quadroQuemAssina({ ...lucas, rlPapel: "TUTORA", rlNome: "Sônia Lima" }, HOJE, null).linha).toBe("Lucas assina, assistido(a) pela tutora, Sônia · da ficha do cliente");
  });

  it("o nome acessível de “Completar na ficha” diz o que falta e de quem", () => {
    expect(completarQuemAssina(c())).toBe(": RG de Joana");
    expect(completarQuemAssina(c({ rlDocumento: null }))).toBe(": CPF e RG de Joana");
  });
});

describe("CH-14: Gerar documentos abre com os documentos da área", () => {
  const RES = "11111111-1111-4111-8111-111111111111";
  const REQ = "22222222-2222-4222-8222-222222222222";
  const R = `OUTRO:${RES}`;
  const I = `OUTRO:${REQ}`;
  const outros = [
    { tipo: "OUTRO" as const, modeloId: RES, nome: "Declaração de residência", numero: 1, padrao: null, emRevisao: false },
    { tipo: "OUTRO" as const, modeloId: REQ, nome: "Requerimento ao INSS", numero: 1, padrao: null, emRevisao: false },
  ];
  const tres = ["CONTRATO", "PROCURACAO", "HIPOSSUFICIENCIA"];
  const porArea = { PREVIDENCIARIO: [...tres, R, I], TRABALHISTA: [...tres, R], CIVEL: tres, CONSUMIDOR: tres, FAMILIA: tres, SAUDE: tres, TRIBUTARIO: tres, OUTRA: [] };
  const sug = (extra: Partial<SugestaoDocumentos> = {}): SugestaoDocumentos => ({
    area: "PREVIDENCIARIO", origem: "CONTRATO", casoNome: null, contratoArea: "PREVIDENCIARIO", areasDosCasos: [], porArea, salvas: ["PREVIDENCIARIO", "TRABALHISTA", "OUTRA"],
    entraramDepois: {}, gravaNoContrato: false, ...extra,
  });
  const com = (s: SugestaoDocumentos, extra: Partial<DadosDocumentos> = {}) => base({ modelos: [...base().modelos, ...outros] as DadosDocumentos["modelos"], sugestao: s, ...extra });

  it("a primeira geração marca a lista da área do contrato, com sugerido nas caixas", () => {
    const d = com(sug());
    const f = formInicialDocumentos(d);
    expect(f.docs).toEqual([...tres, R, I]);
    expect(f.area).toBe("PREVIDENCIARIO");
    expect(f.mexeu).toBe(false);
    expect([...sugeridosDaArea(d, "PREVIDENCIARIO")]).toEqual([...tres, R, I]);
    expect(origemDaArea(d, f, false)).toBe("a área do contrato C-2026-033");
    expect(ajudaDaArea(d, f, false)).toBe("Vêm marcados os documentos que o escritório escolheu para Previdenciário. Mude o que precisar antes de gerar; vale só para estes documentos.");
    // Sem a sugestão (servidor antigo), os três de sempre.
    expect(formInicialDocumentos(base()).docs).toEqual(tres);
  });

  it("a área do caso vem antes; o assinado não vem marcado", () => {
    const d = com(sug({ area: "CIVEL", origem: "CASO", casoNome: "Cobrança de duplicatas" }), {
      contrato: { id: "c", numero: "C-2026-020", objeto: "x", estado: "ATIVO", assinadoEm: "2026-09-02", versao: 2 },
    });
    const f = formInicialDocumentos(d);
    expect(f.docs).toEqual(["PROCURACAO", "HIPOSSUFICIENCIA"]);
    expect(origemDaArea(d, f, false)).toBe("a área do caso Cobrança de duplicatas");
  });

  it("sem área e sem caso: começa em Outra ou sem área, nada marcado, e a área escolhida vai ao contrato", () => {
    const d = com(sug({ area: "OUTRA", origem: null, contratoArea: null, gravaNoContrato: true }));
    const f = formInicialDocumentos(d);
    expect(f.docs).toEqual([]);
    expect(ajudaDaArea(d, f, false)).toBe("Para contrato sem área, o escritório não marca nenhum documento. Escolha a área acima, ou marque os que vão sair.");
    expect(origemDaArea(d, f, false)).toBe("O contrato C-2026-033 ainda não tem área e não tem caso. A área que você escolher fica nele ao gerar.");
    expect(areaVaiAoContrato(d, f)).toBe(false);
    expect("area" in pedidoDocumentos(d, f)).toBe(false);
    const t = trocarArea(d, f, "FAMILIA");
    expect(t.aplicou).toBe(true);
    expect(t.form.docs).toEqual(tres);
    expect(fraseTrocaAplicada(d, "FAMILIA")).toBe("A sugestão mudou para Família: vêm marcados o contrato, a procuração e a declaração de hipossuficiência.");
    expect(pedidoDocumentos(d, t.form).area).toBe("FAMILIA");
    // Contrato com área ou já ativo: a área não vai.
    expect(pedidoDocumentos(com(sug()), { ...t.form }).area).toBeUndefined();
  });

  it("trocar a área tendo mexido numa caixa não muda nada e oferece Usar a sugestão", () => {
    const d = com(sug({ area: "OUTRA", origem: null, contratoArea: null, gravaNoContrato: true }));
    const f = { ...formInicialDocumentos(d), docs: ["PROCURACAO"], mexeu: true };
    const t = trocarArea(d, f, "FAMILIA");
    expect(t.aplicou).toBe(false);
    expect(t.form.docs).toEqual(["PROCURACAO"]);
    expect(t.form.area).toBe("FAMILIA");
    expect(linhaSugestaoDaArea(d, "FAMILIA")).toEqual({
      titulo: "A sugestão de Família é: contrato de honorários, procuração e declaração de hipossuficiência.",
      texto: "Você já tinha marcado à mão, então nada mudou sozinho.",
    });
  });

  it("Gerar de novo: as escolhas da última vez; a linha também tem só com o que entrou depois", () => {
    const ultima = { geracaoId: "g", em: "2026-11-24T18:10:00Z", por: { id: "m", nome: "Marina Ribeiro" }, documentos: [{ tipo: "CONTRATO" as const, modeloId: null }, { tipo: "PROCURACAO" as const, modeloId: null }, { tipo: "HIPOSSUFICIENCIA" as const, modeloId: null }, { tipo: "OUTRO" as const, modeloId: RES }],
      outorgados: [{ pessoaId: "m", inscricoes: ["i1"] }], poderes: [], outroPoder: null, cidadeData: "x" };
    const atuais = [{ chave: "CONTRATO", tipo: "CONTRATO" as const, modeloId: null, numero: 1, geradoEm: "2026-11-24T18:10:00Z", assinado: false }];
    const d = com(sug({ entraramDepois: { PREVIDENCIARIO: [{ chave: I, em: "2026-11-24T18:20:00Z" }] } }), { ultima, atuais, hoje: "2026-11-24" });
    const f = formInicialDocumentos(d);
    expect(f.docs).toEqual([...tres, R]);
    expect(f.mexeu).toBe(true);
    expect(ajudaDaArea(d, f, false)).toBe("Vieram as escolhas da versão 1, e não a lista da área. Mude o que precisar antes de gerar.");
    expect(linhaTambemTem(d, f)).toEqual({
      titulo: "Previdenciário também tem: requerimento ao INSS.",
      texto: "Entrou na lista do escritório hoje, às 15h20, depois da versão 1.",
      chaves: [I], nomes: "requerimento ao INSS",
    });
    expect(linhaTambemTem(d, { ...f, docs: [...f.docs, I] })).toBeNull();
    // Nada entrou depois: a linha não aparece (pergunta 5).
    expect(linhaTambemTem(com(sug(), { ultima, atuais }), f)).toBeNull();
  });

  it("as escolhas guardadas voltam com a área e o mexeu; área fora da lista cai na sugestão", () => {
    const AGORA_CH14 = Date.parse("2026-11-24T15:00:00Z");
    const d = com(sug({ area: "OUTRA", origem: null, contratoArea: null, gravaNoContrato: true }));
    const g = montarEscolhas(d, { ...formInicialDocumentos(d), docs: ["CONTRATO", "PROCURACAO"], area: "FAMILIA", mexeu: true }, 0, "volta-quadro", AGORA_CH14 - 60_000);
    const v = escolhasGuardadasValidas(g, d, AGORA_CH14)!;
    expect(v.form.area).toBe("FAMILIA");
    expect(v.form.mexeu).toBe(true);
    expect(origemDaArea(d, v.form, true)).toBe("Você escolheu. Fica no contrato C-2026-033 ao gerar.");
    const ruim = escolhasGuardadasValidas({ ...g, form: { ...g.form, area: "PENAL", mexeu: "sim" } }, d, AGORA_CH14)!;
    expect(ruim.form.area).toBe("OUTRA");
    expect(ruim.form.mexeu).toBe(false);
    // Escolhas guardadas antes da CH-14 (sem área) continuam valendo, com o v de sempre.
    const antigo = { ...g, form: { docs: ["CONTRATO"], outorgados: { m: ["i1"] }, poderes: [], outroPoder: "", cidadeData: "São Paulo, hoje" } };
    expect(g.v).toBe(1);
    expect(escolhasGuardadasValidas(antigo, d, AGORA_CH14)!.form.area).toBe("OUTRA");
  });
});
